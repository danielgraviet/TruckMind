# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TruckMind is an AI-powered food truck business simulator. Users describe a food truck concept, and a multi-agent pipeline generates a strategy, creates synthetic customer personas grounded in census data, simulates market reactions, and runs a live shop with autonomous operations.

## Commands

### Run the pipeline (backend)
```bash
# With real LLM (requires API key)
cd backend && python -m engine.pipeline "Taco truck near BYU campus" --location "Provo, UT"

# With mock LLM (no API calls)
cd backend && python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock

# With interactive shop REPL
cd backend && python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock --interactive

# Pipeline options
#   --personas N       Total personas to generate (default: 100)
#   --seeds N          Seed personas via LLM (default: 20)
#   --rounds N         Max refinement rounds (default: 2)
#   --budget N         Starting cash (default: 500)
```

### Frontend (not yet implemented)
```bash
cd frontend && npm install && npm run dev
```

## Architecture

### Agent Pipeline

The system is a linear pipeline of four agents, each a pure function that transforms input to output via LLM prompts:

```
BusinessConcept → [Strategist] → Strategy → [CrowdGen] → Personas → [Simulator] → SimulationResult → [Shop]
                                    ↑                                      |
                                    └──────── refinement loop ─────────────┘
```

- **Strategist** (`agents/strategist.py`): Concept → Strategy (menu, pricing, positioning). Supports refinement loop using simulation feedback.
- **CrowdGen** (`agents/crowd.py`): Two-phase persona generation. Phase 1: LLM generates 15-25 seed personas grounded in census demographics. Phase 2: Programmatic expansion to 200-400 personas using statistical distributions.
- **Simulator** (`agents/simulator.py`): Two-tier market simulation. Tier 1: 50 representative personas get full LLM simulation (~$0.15/round). Tier 2: 150+ scored via rule-based interpolation learned from Tier 1 (zero API calls, <100ms).
- **Shop** (`agents/shop.py`): Two modes — customer-facing chat (order taking) and autonomous operations (pricing, inventory, restocking decisions).

### Key Files

- `backend/models/schema.py` — **The most important file.** All inter-agent data contracts as dataclasses. Changing a model changes the API between agents.
- `backend/engine/pipeline.py` — Orchestrator and CLI entry point. Coordinates all agents and manages pipeline state.
- `backend/utils/llm_client.py` — LLM integration wrapper (stub, needs implementation). Must expose `complete_json()` and `complete_json_list()` methods, plus `MockLLMClient` for testing.
- `backend/utils/census.py` — Census API integration (async httpx). Currently not wired in; `crowd.py` uses `CACHED_DEMOGRAPHICS` for Provo and Salt Lake City.

### Frontend (scaffolded, all files empty)

React + Vite + Tailwind CSS. Two pages:
- `PipelinePage` — strategy design flow with components: `ConceptInput`, `StrategyCard`, `PersonaCard`, `ReactionBoard`, `SimulationStats`
- `ShopPage` — live operations with components: `ChatPanel`, `InventoryBars`, `PriceTable`, `RevenueCounter`, `ActionFeed`
- Hooks: `useSSE` (server-sent events for streaming), `useShop` (shop state management)

### Design Principles from the Code

1. **Agents are functions** — each transforms typed input to typed output. See docstring at top of `schema.py`.
2. **Data contracts are the API** — all agents communicate through `schema.py` dataclasses. Changes there cascade.
3. **Two-tier simulation** — cost optimization: 50 personas via LLM, rest via learned patterns.
4. **Demographic grounding** — personas match real census distributions (age, income, education). Dietary restrictions use real-world prevalence rates (~6% vegetarian, ~2% vegan, ~6% gluten-free).
5. **Deterministic expansion** — `random.Random(42)` seed for reproducible persona generation.

## Tech Stack

- **Backend**: Python 3.13+, dataclasses, no framework yet (`server.py` is empty)
- **Frontend**: React, Vite, Tailwind CSS (all component files are empty stubs)
- **LLM**: Wrapper interface in `utils/llm_client.py` (not yet implemented)
- **Demographics**: US Census ACS 5-Year API (async httpx in `utils/census.py`, not yet wired in)

## Environment Variables

- `CENSUS_API_KEY` — for Census API (get from api.census.gov/data/key_signup.html)
- LLM API key — depends on which provider is wired into `llm_client.py`
