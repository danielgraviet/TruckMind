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
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load .env before importing agents so API keys are available
from dotenv import load_dotenv
load_dotenv()

from models.schema import BusinessConcept
from agents.strategist import create_strategy
from agents.crowd import generate_personas, get_demographics
from agents.simulator import run_simulation
from agents.shop import initialize_shop, handle_customer
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

def _snapshot(phase: str, strategy, personas_base: list, reactions: dict, stats=None) -> str:
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
    }
    return f"data: {json.dumps(payload)}\n\n"


async def _simulate_generator(concept: str, location: str, mock: bool, budget: Optional[float]):
    client = MockLLMClient() if mock else LLMClient()
    personas_base: list = []
    reactions: dict = {}   # persona_id → reaction fields
    strategy = None
    loop = asyncio.get_event_loop()

    try:
        # Phase 1 — strategy
        yield _snapshot("strategy", None, [], {})
        bc = BusinessConcept(description=concept, location=location, budget=budget)
        strategy = await asyncio.to_thread(create_strategy, bc, client)
        yield _snapshot("strategy", strategy, [], {})

        # Phase 2 — personas
        yield _snapshot("personas", strategy, [], {})
        personas_base = await asyncio.to_thread(
            generate_personas, location, strategy, client, 100, 20
        )
        yield _snapshot("personas", strategy, personas_base, {})

        # Phase 3 — simulation
        yield _snapshot("simulation", strategy, personas_base, {})

        reaction_queue: asyncio.Queue = asyncio.Queue()
        DONE = object()

        def on_reaction(reaction):
            loop.call_soon_threadsafe(reaction_queue.put_nowait, reaction.to_dict())

        async def _run_sim():
            result = await asyncio.to_thread(
                run_simulation, strategy, personas_base, client, 1,
                on_reaction=on_reaction,
            )
            loop.call_soon_threadsafe(reaction_queue.put_nowait, DONE)
            return result

        sim_task = asyncio.create_task(_run_sim())

        while True:
            item = await reaction_queue.get()
            if item is DONE:
                break
            reactions[item["persona_id"]] = {
                "sentiment":  item["sentiment"],
                "feedback":   item["feedback"],
                "would_visit": item["would_visit"],
                "likely_order": item["likely_order"],
            }
            yield _snapshot("simulation", strategy, personas_base, reactions)

        sim_result = await sim_task

        # Build stats dict with sentiment_distribution added
        sentiment_dist = dict(Counter(r.sentiment.value for r in sim_result.reactions))
        stats = {**sim_result.to_dict(), "sentiment_distribution": sentiment_dist}

        # Persist shop for the shop page
        shop_state = initialize_shop(strategy, starting_cash=budget or 500.0)
        active_shop["state"] = shop_state
        active_shop["client"] = client

        yield _snapshot("complete", strategy, personas_base, reactions, stats)

    except Exception as exc:
        yield f"data: {json.dumps({'phase': 'error', 'message': str(exc)})}\n\n"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/simulate")
async def simulate(concept: str, location: str, mock: bool = False, budget: Optional[float] = None):
    """
    SSE stream in snapshot format — this is what the frontend connects to.
    Each event is an unnamed `data: {...}` message containing the full current state.
    """
    return StreamingResponse(
        _simulate_generator(concept, location, mock, budget),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
        handle_customer, shop, req.message, client, req.customer_name or "Customer"
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
