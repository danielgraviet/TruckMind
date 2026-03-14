"""
TruckMind Pipeline Orchestrator
================================
This is the main entry point. Runs the full pipeline:

    concept → strategy → personas → simulation → (optional: refine) → shop

Usage:
    python -m engine.pipeline "Taco truck near BYU campus" --location "Provo, UT"
    
Or programmatically:
    from engine.pipeline import run_pipeline
    result = run_pipeline("Taco truck near BYU campus", "Provo, UT")
"""

import json
import sys
import time
from datetime import datetime
from typing import Optional
from models.schema import BusinessConcept, PipelineState
from agents.strategist import create_strategy, refine_strategy
from agents.crowd import generate_seed_personas, expand_personas, get_demographics
from agents.simulator import run_simulation
from agents.shop import initialize_shop, process_order, periodic_review
from utils.llm_client import LLMClient, MockLLMClient


def run_pipeline(
    concept_description: str,
    location: str,
    client: Optional[LLMClient] = None,
    num_personas: int = 100,
    num_seed_personas: int = 20,
    max_refinement_rounds: int = 2,
    convergence_threshold: float = 0.6,  # interest rate above this = good enough
    budget: Optional[float] = None,
    verbose: bool = True,
) -> PipelineState:
    """
    Run the complete TruckMind pipeline.
    
    Args:
        concept_description: One-line business idea
        location: Where the truck will operate
        client: LLM client (creates one if not provided)
        num_personas: Total personas to generate
        num_seed_personas: LLM-generated seed personas (rest are expanded programmatically)
        max_refinement_rounds: Max strategy refinement iterations
        convergence_threshold: Interest rate to consider "good enough"
        budget: Starting budget in dollars
        verbose: Print progress to stdout
    
    Returns:
        PipelineState with all results
    """
    if client is None:
        client = LLMClient()

    def log(msg: str):
        if verbose:
            print(msg)

    # Initialize pipeline state
    concept = BusinessConcept(
        description=concept_description,
        location=location,
        budget=budget,
    )
    state = PipelineState(concept=concept)

    # ─── Phase 1: Strategy Generation ────────────────────────────────────
    log("\n" + "=" * 60)
    log("🧠 PHASE 1: THE STRATEGIST")
    log("=" * 60)
    log(f"Concept: {concept_description}")
    log(f"Location: {location}")

    t0 = time.time()
    state.strategy = create_strategy(concept, client)
    state.advance_to("strategy")

    log(f"\n✅ Strategy generated in {time.time() - t0:.1f}s")
    log(f"   Business: {state.strategy.business_name} — \"{state.strategy.tagline}\"")
    log(f"   Menu items: {len(state.strategy.menu)}")
    for item in state.strategy.menu:
        log(f"     • {item.name}: ${item.base_price:.2f} (margin: {item.margin:.0%})")

    # ─── Phase 2: Persona Generation ─────────────────────────────────────
    log("\n" + "=" * 60)
    log("👥 PHASE 2: THE CROWD")
    log("=" * 60)
    log(f"Generating {num_seed_personas} seed personas via LLM...")

    t0 = time.time()
    seeds = generate_seed_personas(location, state.strategy, client, num_seeds=num_seed_personas)
    log(f"   Generated {len(seeds)} seeds in {time.time() - t0:.1f}s")

    log(f"Expanding to {num_personas} total personas programmatically...")
    t0 = time.time()
    demographics = get_demographics(location)
    state.personas = expand_personas(seeds, num_personas, location, demographics)
    state.advance_to("personas")

    log(f"   Expanded to {len(state.personas)} personas in {time.time() - t0:.1f}s")

    # Quick demographic summary
    ages = [p.age for p in state.personas]
    incomes = [p.annual_income for p in state.personas]
    log(f"   Age range: {min(ages)}-{max(ages)} (avg: {sum(ages)/len(ages):.0f})")
    log(f"   Income range: ${min(incomes):,}-${max(incomes):,} (avg: ${sum(incomes)/len(incomes):,.0f})")

    # ─── Phase 3: Simulation ─────────────────────────────────────────────
    log("\n" + "=" * 60)
    log("🧪 PHASE 3: THE LAB")
    log("=" * 60)

    for round_num in range(1, max_refinement_rounds + 1):
        log(f"\n--- Simulation Round {round_num} (Strategy v{state.strategy.version}) ---")

        t0 = time.time()
        sim_result = run_simulation(
            state.strategy,
            state.personas,
            client,
            round_number=round_num,
        )
        state.simulation_results.append(sim_result)
        elapsed = time.time() - t0

        log(f"\n   Completed in {elapsed:.1f}s")
        log(sim_result.summary())

        # Check convergence
        if sim_result.overall_interest_rate >= convergence_threshold:
            log(f"\n   ✅ Interest rate {sim_result.overall_interest_rate:.0%} meets threshold {convergence_threshold:.0%}")
            log(f"   Strategy v{state.strategy.version} is locked.")
            break

        # Refine if not converged and not last round
        if round_num < max_refinement_rounds:
            log(f"\n   Interest rate {sim_result.overall_interest_rate:.0%} below threshold. Refining strategy...")
            t0 = time.time()
            state.strategy = refine_strategy(state.strategy, sim_result, client)
            log(f"   Refined to v{state.strategy.version} in {time.time() - t0:.1f}s")
            for item in state.strategy.menu:
                log(f"     • {item.name}: ${item.base_price:.2f}")

    state.advance_to("simulation")

    # ─── Phase 4: Shop Initialization ────────────────────────────────────
    log("\n" + "=" * 60)
    log("🏪 PHASE 4: THE SHOP IS OPEN")
    log("=" * 60)

    state.shop_state = initialize_shop(state.strategy, starting_cash=budget or 500.0)
    state.advance_to("shop")

    log(f"\n   {state.strategy.business_name} is open for business!")
    log(f"   Menu:")
    log(state.shop_state.active_menu_display())

    # Cost report
    log(f"\n💰 {client.cost_report()}")

    return state


def run_shop_repl(state: PipelineState, client: Optional[LLMClient] = None):
    """
    Interactive REPL for the shop. Order-based interface (no cashier).

    Commands:
        (any text)         — generate a random order from active menu
        /order item1,item2 — create order with specific items
        /rush N            — simulate N random orders
        /review            — manually trigger periodic review
        /status            — show shop state
        /inventory         — show inventory
        /actions           — show autonomous action log
        /menu              — show current menu
        /quit              — exit
    """
    import random as _rand
    from models.schema import Order

    if client is None:
        client = LLMClient()

    if not state.shop_state:
        print("Error: Shop not initialized. Run the pipeline first.")
        return

    shop = state.shop_state
    rng = _rand.Random(42)
    order_counter = 0

    print(f"\n🚚 {shop.strategy.business_name} — OPERATIONS REPL")
    print("=" * 50)
    print("Press Enter or type anything to generate a random order.")
    print("Commands: /order items, /rush N, /review, /status, /inventory, /actions, /menu, /quit\n")

    def _make_random_order() -> Order:
        nonlocal order_counter
        order_counter += 1
        active = shop.get_active_menu()
        if not active:
            return None

        # Pick 1-3 items with bias toward entrees
        entrees = [i for i in active if i.category.lower() == "entree"]
        others = [i for i in active if i.category.lower() != "entree"]

        items = []
        num_items = rng.choices([1, 2, 3], weights=[3, 5, 2])[0]
        for _ in range(num_items):
            if entrees and rng.random() < 0.6:
                items.append(rng.choice(entrees).name)
            elif others:
                items.append(rng.choice(others).name)
            elif entrees:
                items.append(rng.choice(entrees).name)

        if not items:
            return None

        return Order(
            id=f"ORD-{order_counter:04d}",
            timestamp=datetime.now().isoformat(),
            customer_name=f"Customer #{order_counter}",
            items=items,
            total_price=0,  # recalculated by process_order
            status="preparing",
        )

    def _process_and_display(order: Order):
        if order is None:
            print("  No active menu items available!")
            return
        actions = process_order(shop, order, client)
        # Display order
        for action in actions:
            if not action.autonomous:
                print(f"  📋 {action.description}")
            else:
                print(f"  🤖 [AUTO] {action.description}")

    while True:
        try:
            user_input = input("Shop > ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if user_input.startswith("/"):
            parts = user_input.split(None, 1)
            cmd = parts[0].lower()

            if cmd == "/quit":
                print("\nClosing shop. Final stats:")
                print(f"  Total orders: {shop.total_orders}")
                print(f"  Total revenue: ${shop.total_revenue:.2f}")
                print(f"  Cash on hand: ${shop.cash_on_hand:.2f}")
                auto_count = sum(1 for a in shop.action_log if a.autonomous)
                print(f"  Autonomous decisions: {auto_count}")
                break

            elif cmd == "/order":
                if len(parts) < 2:
                    print("  Usage: /order item1, item2")
                    continue
                item_names = [i.strip() for i in parts[1].split(",")]
                order_counter += 1
                order = Order(
                    id=f"ORD-{order_counter:04d}",
                    timestamp=datetime.now().isoformat(),
                    customer_name=f"Customer #{order_counter}",
                    items=item_names,
                    total_price=0,
                    status="preparing",
                )
                _process_and_display(order)

            elif cmd == "/rush":
                n = int(parts[1]) if len(parts) > 1 else 10
                print(f"  Simulating {n} random orders...")
                for i in range(n):
                    order = _make_random_order()
                    _process_and_display(order)
                print(f"  Done — {n} orders processed.")

            elif cmd == "/review":
                print("  Running periodic review...")
                actions = periodic_review(shop, client)
                if not actions:
                    print("  No actions taken.")
                for action in actions:
                    print(f"  🤖 [REVIEW] {action.description}")

            elif cmd == "/status":
                print(json.dumps(shop.to_dict(), indent=2))

            elif cmd == "/inventory":
                for inv in shop.inventory:
                    status = "❌ OUT" if inv.is_out else ("⚠️ LOW" if inv.is_low else "✅ OK")
                    cat = ""
                    for mi in shop.strategy.menu:
                        if mi.name == inv.menu_item_name:
                            cat = f" [{mi.category}]"
                            break
                    print(f"  {status} {inv.menu_item_name}{cat}: {inv.quantity_remaining}/{inv.max_capacity}")

            elif cmd == "/actions":
                if not shop.action_log:
                    print("  No actions yet.")
                for action in shop.action_log:
                    prefix = "🤖" if action.autonomous else "📋"
                    print(f"  {prefix} [{action.action_type.value}] {action.description}")

            elif cmd == "/menu":
                print(shop.active_menu_display())

            else:
                print("  Unknown command. Try /order, /rush, /review, /status, /inventory, /actions, /menu, /quit")
            continue

        # Default: generate a random order
        order = _make_random_order()
        _process_and_display(order)
        print()


# ─── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TruckMind — AI-powered food truck")
    parser.add_argument("concept", help="Business concept (e.g., 'Taco truck near BYU')")
    parser.add_argument("--location", default="Provo, UT", help="Location")
    parser.add_argument("--personas", type=int, default=100, help="Number of personas")
    parser.add_argument("--seeds", type=int, default=20, help="Number of seed personas")
    parser.add_argument("--rounds", type=int, default=2, help="Max refinement rounds")
    parser.add_argument("--budget", type=float, default=500.0, help="Starting budget")
    parser.add_argument("--mock", action="store_true", help="Use mock LLM (no API calls)")
    parser.add_argument("--interactive", action="store_true", help="Launch shop REPL after pipeline")

    args = parser.parse_args()

    client = MockLLMClient() if args.mock else LLMClient()

    state = run_pipeline(
        concept_description=args.concept,
        location=args.location,
        client=client,
        num_personas=args.personas,
        num_seed_personas=args.seeds,
        max_refinement_rounds=args.rounds,
        budget=args.budget,
    )

    if args.interactive:
        run_shop_repl(state, client)
    else:
        # Dump final state summary
        print("\n" + "=" * 60)
        print("📊 PIPELINE COMPLETE — SUMMARY")
        print("=" * 60)

        final_sim = state.simulation_results[-1] if state.simulation_results else None
        if final_sim:
            print(f"\nFinal simulation results:")
            print(final_sim.summary())

            # Sentiment distribution
            from collections import Counter
            sentiment_dist = Counter(r.sentiment.value for r in final_sim.reactions)
            print(f"\nSentiment distribution:")
            for sentiment, count in sentiment_dist.most_common():
                bar = "█" * (count * 40 // final_sim.total_personas)
                print(f"  {sentiment:10s} {bar} {count} ({count/final_sim.total_personas:.0%})")

        print(f"\n✅ Shop is ready. Run with --interactive to open the REPL.")
