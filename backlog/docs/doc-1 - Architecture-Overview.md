---
id: doc-1
title: Architecture Overview
type: reference
created_date: '2026-03-14 17:35'
---

# Architecture Overview

## Agent Pipeline

Linear pipeline of four agents, each a pure function transforming input to output via LLM prompts:

```
BusinessConcept -> [Strategist] -> Strategy -> [CrowdGen] -> Personas -> [Simulator] -> SimulationResult -> [Shop]
                                      ^                                      |
                                      +-------- refinement loop ------------+
```

### Agents

- **Strategist** (`agents/strategist.py`): Concept -> Strategy (menu, pricing, positioning). Supports refinement loop.
- **CrowdGen** (`agents/crowd.py`): Two-phase persona generation. Phase 1: LLM seeds (15-25). Phase 2: Programmatic expansion (200-400).
- **Simulator** (`agents/simulator.py`): Two-tier simulation. Tier 1: 50 personas via LLM (~$0.15/round). Tier 2: 150+ via rule-based interpolation (zero API calls).
- **Shop** (`agents/shop.py`): Customer chat + autonomous operations (pricing, inventory, restocking).

### Key Files

- `backend/models/schema.py` — All inter-agent data contracts (the most important file)
- `backend/engine/pipeline.py` — Orchestrator and CLI entry point
- `backend/server.py` — FastAPI server (SSE streaming + shop REST)
- `backend/utils/llm_client.py` — LLM integration wrapper
- `backend/utils/census.py` — Census API integration

### Frontend

React + Vite + Tailwind CSS. Two pages:
- **PipelinePage** — strategy design flow (ConceptInput, StrategyCard, ReactionBoard, SimulationStats)
- **ShopPage** — live operations (ChatPanel, InventoryBars, PriceTable, RevenueCounter, ActionFeed)

### Design Principles

1. Agents are functions (typed input -> typed output)
2. Data contracts are the API (schema.py dataclasses)
3. Two-tier simulation for cost optimization
4. Demographic grounding via Census data
5. Deterministic expansion with seeded randomness
