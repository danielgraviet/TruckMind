"""
TruckMind FastAPI Server
========================
Exposes the pipeline and shop as HTTP endpoints.

Endpoints:
  POST /api/pipeline          — start pipeline, returns { pipeline_id }
  GET  /api/stream/{id}       — SSE stream of pipeline events
  POST /api/order             — handle a customer order
  GET  /api/shop/state        — current shop state (for page load)
  POST /api/shop/simulate-rush — send 15-20 synthetic orders with delays
"""

import asyncio
import json
import uuid
import random
from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load .env before importing agents so API keys are available
from dotenv import load_dotenv
load_dotenv()

from models.schema import BusinessConcept
from agents.strategist import create_strategy, create_strategy_options
from agents.crowd import generate_personas, get_demographics
from agents.simulator import run_simulation
from agents.shop import initialize_shop, handle_customer, process_order
from engine.customer_gen import generate_customer, get_trickle_interval
from models.schema import ShopRules, Order
from utils.llm_client import LLMClient, MockLLMClient


app = FastAPI(title="TruckMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory state ──────────────────────────────────────────────────────────

# Keyed by pipeline_id — stores concept/location/budget/client and final results
pipelines: dict[str, dict] = {}

# Single active shop (last completed pipeline)
active_shop: dict = {"state": None, "client": None}


# ─── Request / response models ────────────────────────────────────────────────

class PipelineRequest(BaseModel):
    concept: str
    location: str
    budget: Optional[float] = None
    mock: bool = False  # set True to use MockLLMClient (no API calls)


class OrderRequest(BaseModel):
    message: str
    customer_name: Optional[str] = "Customer"
    channel: Optional[str] = "walk_up"


class ScenarioRequest(BaseModel):
    scenario: str  # "rush", "angry_customer", "stock_out"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fmt(event: str, data: dict) -> str:
    """Format a single SSE message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ─── Pipeline SSE generator ───────────────────────────────────────────────────

async def _pipeline_generator(pipeline_id: str):
    """
    Async generator that runs the pipeline phase-by-phase and yields SSE events.
    Blocking LLM calls run in a thread executor so they don't block the event loop.
    Simulation reactions are streamed via an asyncio.Queue.
    """
    entry = pipelines.get(pipeline_id)
    if entry is None:
        yield _fmt("error", {"message": f"Unknown pipeline_id: {pipeline_id}"})
        return

    concept_desc: str = entry["concept"]
    location: str = entry["location"]
    budget: Optional[float] = entry["budget"]
    client = entry["client"]

    loop = asyncio.get_event_loop()

    try:
        # ── Phase 1: Strategy ────────────────────────────────────────────────
        yield _fmt("phase", {"phase": "strategy", "status": "running"})

        concept = BusinessConcept(description=concept_desc, location=location, budget=budget)
        strategy = await asyncio.to_thread(create_strategy, concept, client)

        entry["strategy"] = strategy
        yield _fmt("strategy", strategy.to_dict())

        # ── Phase 2: Personas ────────────────────────────────────────────────
        yield _fmt("phase", {"phase": "personas", "status": "running"})

        personas = await asyncio.to_thread(
            generate_personas, location, strategy, client, 100, 20
        )

        entry["personas"] = personas
        yield _fmt("personas", {
            "count": len(personas),
            "sample": [p.to_dict() for p in personas[:10]],
        })

        # ── Phase 3: Simulation ──────────────────────────────────────────────
        yield _fmt("phase", {"phase": "simulation", "status": "running"})

        reaction_queue: asyncio.Queue = asyncio.Queue()

        def on_reaction(reaction):
            # Called from the simulation thread — use call_soon_threadsafe
            loop.call_soon_threadsafe(reaction_queue.put_nowait, reaction.to_dict())

        DONE = object()

        async def _run_sim():
            result = await asyncio.to_thread(
                run_simulation,
                strategy,
                personas,
                client,
                1,  # round_number
                on_reaction=on_reaction,
            )
            loop.call_soon_threadsafe(reaction_queue.put_nowait, DONE)
            return result

        sim_task = asyncio.create_task(_run_sim())

        # Drain reactions while simulation runs
        while True:
            item = await reaction_queue.get()
            if item is DONE:
                break
            yield _fmt("reaction", item)

        sim_result = await sim_task
        entry["sim_result"] = sim_result
        yield _fmt("simulation_complete", sim_result.to_dict())

        # ── Phase 4: Shop ────────────────────────────────────────────────────
        yield _fmt("phase", {"phase": "shop", "status": "ready"})

        shop_state = initialize_shop(strategy, starting_cash=budget or 500.0)
        entry["shop_state"] = shop_state

        # Make this the active shop
        active_shop["state"] = shop_state
        active_shop["client"] = client

        yield _fmt("shop_ready", shop_state.to_dict())

    except Exception as exc:  # noqa: BLE001
        yield _fmt("error", {"message": str(exc)})


# ─── /api/simulate — snapshot-style SSE (what the frontend consumes) ─────────

def _evaluate_strategies(results: list) -> tuple[int, str]:
    """Score all strategies, return (winner_index, rationale)."""
    scores = []
    for i, (strategy, sim_result) in enumerate(results):
        interest  = sim_result.overall_interest_rate                                   # 0–1
        revenue   = min(sim_result.projected_daily_revenue / 800, 1.0)                 # norm ~$800/day
        sentiment = (sim_result.avg_sentiment_score + 2) / 4                          # -2..+2 → 0..1
        avg_margin = (
            sum(item.margin for item in strategy.menu) / max(len(strategy.menu), 1)
        )
        score = interest * 35 + revenue * 35 + sentiment * 20 + avg_margin * 10
        scores.append((score, i))

    scores.sort(reverse=True)
    winner_idx = scores[0][1]
    winner_strategy, winner_result = results[winner_idx]
    rationale = (
        f"{winner_strategy.business_name} wins: "
        f"{winner_result.overall_interest_rate:.0%} customer interest, "
        f"${winner_result.projected_daily_revenue:,.0f}/day projected revenue."
    )
    return winner_idx, rationale


def _snapshot(phase: str, strategy, personas_base: list, reactions: dict, stats=None, **extra) -> str:
    """
    Build an unnamed SSE event (data: only, no event: line) containing a full
    snapshot of pipeline state. The frontend's normalizeSnapshot() reads this shape.
    """
    merged = []
    for p in personas_base:
        d = p.to_dict() if hasattr(p, "to_dict") else dict(p)
        r = reactions.get(d["id"])
        if r:
            d = {**d, **r}
        merged.append(d)

    payload = {
        "phase": phase,
        "strategy": strategy.to_dict() if strategy else None,
        "personas": merged,
        "stats": stats,
        **extra,
    }
    return f"data: {json.dumps(payload)}\n\n"


async def _simulate_generator(concept: str, location: str, mock: bool, budget: Optional[float]):
    """
    Full pipeline:
      1. Generate 3 strategy options (value / premium / niche)
      2. Generate one shared persona pool (100 people)
      3. Run each strategy against the same personas
      4. Evaluator scores all 3 → picks winner
      5. Stream winner as final state
    """
    client = MockLLMClient() if mock else LLMClient()
    loop = asyncio.get_event_loop()

    try:
        bc = BusinessConcept(description=concept, location=location, budget=budget)

        # ── Phase 1: Generate 3 strategy options ────────────────────────────
        yield _snapshot("strategy", None, [], {}, strategy_options=[], testing_index=None)
        strategy_options = await asyncio.to_thread(create_strategy_options, bc, client)
        opts_dict = [s.to_dict() for s in strategy_options]
        yield _snapshot("strategy", strategy_options[0], [], {}, strategy_options=opts_dict)

        # ── Phase 2: Generate personas (shared pool for all 3 tests) ────────
        yield _snapshot("personas", strategy_options[0], [], {}, strategy_options=opts_dict)

        persona_queue: asyncio.Queue = asyncio.Queue()
        DONE_PERSONAS = object()

        def on_persona(persona):
            loop.call_soon_threadsafe(persona_queue.put_nowait, persona)

        async def _gen_personas():
            result = await asyncio.to_thread(
                generate_personas, location, strategy_options[0], client, 100, 20,
                on_persona=on_persona,
            )
            loop.call_soon_threadsafe(persona_queue.put_nowait, DONE_PERSONAS)
            return result

        persona_task = asyncio.create_task(_gen_personas())
        personas_base: list = []

        while True:
            item = await persona_queue.get()
            if item is DONE_PERSONAS:
                break
            personas_base.append(item)
            yield _snapshot("personas", strategy_options[0], personas_base, {},
                            strategy_options=opts_dict)

        personas_base = await persona_task

        # ── Phase 3: Test each strategy against the same personas ───────────
        strategy_results: list = []  # list of (Strategy, SimulationResult)

        for i, strategy in enumerate(strategy_options):
            reactions: dict = {}
            yield _snapshot("testing", strategy, personas_base, {},
                            strategy_options=opts_dict,
                            testing_index=i,
                            total_strategies=len(strategy_options))

            reaction_queue: asyncio.Queue = asyncio.Queue()
            DONE = object()

            def on_reaction(reaction, _q=reaction_queue):
                loop.call_soon_threadsafe(_q.put_nowait, reaction.to_dict())

            async def _run_sim(_strat=strategy, _rnd=i + 1, _q=reaction_queue):
                result = await asyncio.to_thread(
                    run_simulation, _strat, personas_base, client, _rnd,
                    on_reaction=lambda r, q=_q: loop.call_soon_threadsafe(q.put_nowait, r.to_dict()),
                )
                loop.call_soon_threadsafe(_q.put_nowait, DONE)
                return result

            sim_task = asyncio.create_task(_run_sim())

            while True:
                item = await reaction_queue.get()
                if item is DONE:
                    break
                reactions[item["persona_id"]] = {
                    "sentiment":   item["sentiment"],
                    "feedback":    item["feedback"],
                    "would_visit": item["would_visit"],
                    "likely_order": item["likely_order"],
                }
                yield _snapshot("testing", strategy, personas_base, reactions,
                                strategy_options=opts_dict,
                                testing_index=i,
                                total_strategies=len(strategy_options))

            sim_result = await sim_task
            strategy_results.append((strategy, sim_result))

        # ── Phase 4: Evaluate ────────────────────────────────────────────────
        yield _snapshot("evaluating", None, personas_base, {},
                        strategy_options=opts_dict,
                        total_strategies=len(strategy_options))

        winner_idx, rationale = _evaluate_strategies(strategy_results)
        winner_strategy, winner_result = strategy_results[winner_idx]

        # Build compact per-strategy result summaries
        all_results = []
        for j, (s, r) in enumerate(strategy_results):
            sdist = dict(Counter(rx.sentiment.value for rx in r.reactions))
            all_results.append({
                "strategy": s.to_dict(),
                "stats": {**r.to_dict(), "sentiment_distribution": sdist},
                "is_winner": j == winner_idx,
            })

        # Winner reaction states for the dot board
        winner_reactions = {
            r.persona_id: {
                "sentiment":   r.sentiment.value,
                "feedback":    r.feedback,
                "would_visit": r.would_visit,
                "likely_order": r.likely_order,
            }
            for r in winner_result.reactions
        }
        winner_sdist = dict(Counter(r.sentiment.value for r in winner_result.reactions))
        winner_stats = {**winner_result.to_dict(), "sentiment_distribution": winner_sdist}

        # Persist winner shop
        shop_state = initialize_shop(winner_strategy, starting_cash=budget or 500.0)
        active_shop["state"] = shop_state
        active_shop["client"] = client

        yield _snapshot("complete", winner_strategy, personas_base, winner_reactions,
                        winner_stats,
                        strategy_options=opts_dict,
                        testing_index=winner_idx,
                        total_strategies=len(strategy_options),
                        strategy_results=all_results,
                        winner_index=winner_idx,
                        winner_rationale=rationale)

    except Exception as exc:
        yield f"data: {json.dumps({'phase': 'error', 'message': str(exc)})}\n\n"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/simulate")
async def simulate(concept: str, location: str, mock: bool = False, budget: Optional[float] = None):
    """
    SSE stream: generates 3 strategies, tests all against shared personas, evaluates winner.
    """
    return StreamingResponse(
        _simulate_generator(concept, location, mock, budget),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/strategies")
async def get_strategies(concept: str, location: str, mock: bool = False, budget: Optional[float] = None):
    """
    Generate 3 strategy options (value/premium/niche) and return them as JSON.
    The frontend shows these as selectable cards before running the full simulation.
    """
    client = MockLLMClient() if mock else LLMClient()
    bc = BusinessConcept(description=concept, location=location, budget=budget)
    strategies = await asyncio.to_thread(create_strategy_options, bc, client)
    return {"strategies": [s.to_dict() for s in strategies]}


@app.post("/api/pipeline")
async def start_pipeline(req: PipelineRequest):
    """
    Start a new pipeline run.  Returns { pipeline_id } immediately.
    Connect to GET /api/stream/{pipeline_id} to receive SSE events.
    """
    pipeline_id = uuid.uuid4().hex
    client = MockLLMClient() if req.mock else LLMClient()
    pipelines[pipeline_id] = {
        "concept": req.concept,
        "location": req.location,
        "budget": req.budget,
        "client": client,
    }
    return {"pipeline_id": pipeline_id}


@app.get("/api/stream/{pipeline_id}")
async def stream_pipeline(pipeline_id: str):
    """
    SSE stream for a running pipeline.
    Events: phase, strategy, personas, reaction (×N), simulation_complete,
            shop_ready, error.
    """
    if pipeline_id not in pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    return StreamingResponse(
        _pipeline_generator(pipeline_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


@app.post("/api/order")
async def place_order(req: OrderRequest):
    """
    Send a customer message to the live shop.
    Returns { cashier_message, order, autonomous_actions, shop_state }.
    Requires a completed pipeline (GET /api/shop/state must return data first).
    """
    shop = active_shop.get("state")
    client = active_shop.get("client")

    if shop is None or client is None:
        raise HTTPException(
            status_code=409,
            detail="No active shop. Run a pipeline first.",
        )

    cashier_msg, actions = await asyncio.to_thread(
        handle_customer, shop, req.message, client, req.customer_name or "Customer",
        req.channel or "walk_up"
    )

    _broadcast_interaction(
        shop=shop,
        customer_name=req.customer_name or "Customer",
        channel=req.channel or "walk_up",
        customer_message=req.message,
        cashier_message=cashier_msg,
        actions=actions,
    )

    # Find the order object from the last action (if an order was placed)
    order_dict = None
    for action in actions:
        if action.action_type.value == "take_order" and action.details:
            order_dict = action.details
            break

    return {
        "cashier_message": cashier_msg,
        "order": order_dict,
        "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
        "shop_state": shop.to_dict(),
    }


@app.get("/api/shop/state")
async def get_shop_state():
    """Return the current shop state (for initial page load)."""
    shop = active_shop.get("state")
    if shop is None:
        raise HTTPException(status_code=404, detail="No active shop yet.")
    return shop.to_dict()


@app.post("/api/shop/simulate-rush")
async def simulate_rush():
    """
    Send 15-20 synthetic persona-based orders with short delays.
    Useful for demoing autonomous shop actions (surge pricing, restocking).
    """
    shop = active_shop.get("state")
    client = active_shop.get("client")

    if shop is None or client is None:
        raise HTTPException(
            status_code=409,
            detail="No active shop. Run a pipeline first.",
        )

    # Build realistic order messages from the active menu
    active_items = [item.name for item in shop.get_active_menu()]
    if not active_items:
        raise HTTPException(status_code=409, detail="Menu is empty.")

    templates = [
        "I'd like {item}, please.",
        "Can I get a {item}?",
        "Give me {item}.",
        "One {item} please!",
        "I'll take the {item}.",
        "What's {item} like? Actually, I'll take one.",
        "Two {item} please!",
        "{item} — that sounds great, I'll have it.",
    ]

    num_orders = random.randint(15, 20)
    results = []

    for i in range(num_orders):
        item = random.choice(active_items)
        msg = random.choice(templates).format(item=item)
        customer_name = f"RushCustomer{i + 1}"

        cashier_msg, actions = await asyncio.to_thread(
            handle_customer, shop, msg, client, customer_name
        )

        _broadcast_interaction(
            shop=shop,
            customer_name=customer_name,
            channel="walk_up",
            customer_message=msg,
            cashier_message=cashier_msg,
            actions=actions,
        )

        results.append({
            "customer": customer_name,
            "message": msg,
            "cashier_message": cashier_msg,
            "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
        })

        # Small delay to space out orders and let autonomous triggers fire
        await asyncio.sleep(0.1)

    return {
        "orders_processed": len(results),
        "results": results,
        "shop_state": shop.to_dict(),
    }


# ─── Shop Rules Endpoints ───────────────────────────────────────────────────

@app.get("/api/shop/rules")
async def get_shop_rules():
    """Return current shop rules as JSON."""
    shop = active_shop.get("state")
    if shop is None:
        # Return default rules even if no shop is active
        return ShopRules().to_dict()
    return shop.rules.to_dict()


@app.put("/api/shop/rules")
async def update_shop_rules(rules_data: dict):
    """Update shop rules from JSON body."""
    shop = active_shop.get("state")
    if shop is None:
        raise HTTPException(status_code=409, detail="No active shop. Run a pipeline first.")

    try:
        new_rules = ShopRules.from_dict(rules_data)
        shop.rules = new_rules
        return {"status": "ok", "rules": new_rules.to_dict()}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid rules data: {exc}")


# ─── Shop Event SSE Stream ──────────────────────────────────────────────────

# Shared queue for shop events — subscribers get events pushed here
_shop_event_queues: list[asyncio.Queue] = []


def _broadcast_shop_event(event: str, data: dict):
    """Push an event to all connected SSE subscribers."""
    msg = _fmt(event, data)
    for q in list(_shop_event_queues):
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass  # Drop events for slow consumers


def _broadcast_shop_state(shop) -> None:
    if shop is not None:
        _broadcast_shop_event("shop_state", shop.to_dict())


def _broadcast_interaction(
    *,
    shop,
    customer_name: str,
    channel: str,
    customer_message: str,
    cashier_message: str,
    actions: list,
) -> None:
    customer_timestamp = datetime.utcnow().isoformat()
    _broadcast_shop_event("customer_message", {
        "customer_name": customer_name,
        "channel": channel,
        "text": customer_message,
        "timestamp": customer_timestamp,
    })
    _broadcast_shop_event("cashier_message", {
        "customer_name": customer_name,
        "channel": channel,
        "text": cashier_message,
        "timestamp": datetime.utcnow().isoformat(),
    })

    order_payload = next(
        (
            action.details
            for action in actions
            if action.action_type.value == "take_order" and action.details
        ),
        None,
    )
    if order_payload:
        _broadcast_shop_event("order", {
            "order": order_payload,
            "channel": channel,
            "customer_name": customer_name,
            "timestamp": order_payload.get("timestamp", customer_timestamp),
        })

    for index, action in enumerate(actions):
        _broadcast_shop_event("shop_action", {
            "action": action.to_dict(),
            "timestamp": datetime.utcnow().isoformat(),
            "sequence": index,
        })

    _broadcast_shop_state(shop)


async def _shop_stream_generator():
    """Async generator that yields SSE events for the shop stream."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _shop_event_queues.append(queue)
    try:
        # Send initial state
        shop = active_shop.get("state")
        if shop:
            yield _fmt("shop_state", shop.to_dict())

        while True:
            msg = await queue.get()
            yield msg
    finally:
        _shop_event_queues.remove(queue)


@app.get("/api/shop/stream")
async def shop_stream():
    """SSE stream of all shop events (state changes, orders, autonomous actions)."""
    return StreamingResponse(
        _shop_stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Scenario Trigger Endpoint ──────────────────────────────────────────────

@app.post("/api/shop/trigger-scenario")
async def trigger_scenario(req: ScenarioRequest):
    """
    Trigger predefined scenarios for demo purposes.
    Scenarios: "rush", "angry_customer", "stock_out", "next_customer"
    """
    shop = active_shop.get("state")
    client = active_shop.get("client")

    if shop is None or client is None:
        raise HTTPException(status_code=409, detail="No active shop. Run a pipeline first.")

    if req.scenario == "rush":
        # Generate 15-20 rapid customers using customer_gen
        active_items = [item.name for item in shop.get_active_menu()]
        if not active_items:
            raise HTTPException(status_code=409, detail="Menu is empty.")

        rng = random.Random()
        num_orders = random.randint(15, 20)
        results = []

        for i in range(num_orders):
            customer = generate_customer(
                strategy=shop.strategy,
                shop_state=shop,
                channel="walk_up",
                rng=rng,
            )
            cashier_msg, actions = await asyncio.to_thread(
                handle_customer, shop, customer.opening_message, client,
                customer.name, customer.channel
            )

            result = {
                "customer": customer.to_dict(),
                "cashier_message": cashier_msg,
                "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
            }
            results.append(result)
            _broadcast_interaction(
                shop=shop,
                customer_name=customer.name,
                channel=customer.channel,
                customer_message=customer.opening_message,
                cashier_message=cashier_msg,
                actions=actions,
            )
            await asyncio.sleep(0.05)

        return {
            "scenario": "rush",
            "orders_processed": len(results),
            "results": results,
            "shop_state": shop.to_dict(),
        }

    elif req.scenario == "angry_customer":
        # Generate an escalation customer
        customer = generate_customer(
            strategy=shop.strategy,
            shop_state=shop,
            channel="escalation",
        )
        cashier_msg, actions = await asyncio.to_thread(
            handle_customer, shop, customer.opening_message, client,
            customer.name, customer.channel
        )

        result = {
            "customer": customer.to_dict(),
            "cashier_message": cashier_msg,
            "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
        }
        _broadcast_interaction(
            shop=shop,
            customer_name=customer.name,
            channel=customer.channel,
            customer_message=customer.opening_message,
            cashier_message=cashier_msg,
            actions=actions,
        )

        return {
            "scenario": "angry_customer",
            "result": result,
            "shop_state": shop.to_dict(),
        }

    elif req.scenario == "next_customer":
        customer = generate_customer(
            strategy=shop.strategy,
            shop_state=shop,
        )
        cashier_msg, actions = await asyncio.to_thread(
            handle_customer, shop, customer.opening_message, client,
            customer.name, customer.channel
        )

        result = {
            "customer": customer.to_dict(),
            "cashier_message": cashier_msg,
            "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
        }
        _broadcast_interaction(
            shop=shop,
            customer_name=customer.name,
            channel=customer.channel,
            customer_message=customer.opening_message,
            cashier_message=cashier_msg,
            actions=actions,
        )

        return {
            "scenario": "next_customer",
            "result": result,
            "shop_state": shop.to_dict(),
        }

    elif req.scenario == "stock_out":
        # Drain inventory of a random item to trigger sold-out logic
        active_items = [inv for inv in shop.inventory if not inv.is_out]
        if not active_items:
            raise HTTPException(status_code=409, detail="All items already out of stock.")

        target = random.choice(active_items)
        target.quantity_remaining = 0

        # Trigger a single order to activate the sold-out trigger
        customer = generate_customer(
            strategy=shop.strategy,
            shop_state=shop,
            channel="walk_up",
        )
        cashier_msg, actions = await asyncio.to_thread(
            handle_customer, shop, customer.opening_message, client,
            customer.name, customer.channel
        )

        result = {
            "drained_item": target.menu_item_name,
            "customer": customer.to_dict(),
            "cashier_message": cashier_msg,
            "autonomous_actions": [a.to_dict() for a in actions if a.autonomous],
        }
        _broadcast_interaction(
            shop=shop,
            customer_name=customer.name,
            channel=customer.channel,
            customer_message=customer.opening_message,
            cashier_message=cashier_msg,
            actions=actions,
        )

        return {
            "scenario": "stock_out",
            "result": result,
            "shop_state": shop.to_dict(),
        }

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario: '{req.scenario}'. Must be 'rush', 'angry_customer', 'stock_out', or 'next_customer'.",
        )
