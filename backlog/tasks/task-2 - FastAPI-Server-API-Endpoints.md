---
id: TASK-2
title: FastAPI Server & API Endpoints
status: To Do
assignee: []
created_date: '2026-03-14 17:29'
labels:
  - backend
  - p0-blocker
  - agent-architect
dependencies: []
references:
  - tasks/TICKET-1-fastapi-server.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build backend/server.py — the FastAPI app that exposes two interfaces:
1. SSE endpoint (GET /api/stream) — streams pipeline progress (phases 1-3) to the frontend in real time
2. Shop endpoint (POST /api/order) — handles customer orders during phase 4 and returns updated shop state

This is the bridge between all the agent code and the React frontend.

## Context for Agent

**Key files:**
- `backend/server.py` — Main file to implement (currently empty)
- `backend/engine/pipeline.py` — Pipeline orchestrator to wrap with SSE
- `backend/agents/shop.py` — Shop agent with handle_customer()
- `backend/models/schema.py` — All data contracts

**Endpoints to build:**
- POST /api/pipeline — start pipeline, return pipeline_id
- GET /api/stream/{pipeline_id} — SSE event stream
- POST /api/order — handle customer order
- GET /api/shop/state — current shop state
- POST /api/shop/simulate-rush — send 15-20 persona orders

**SSE events:** phase, strategy, personas, reaction (one per persona), simulation_complete, shop_ready, error

**Important:** Pipeline agents use synchronous code. Use asyncio.to_thread() to avoid blocking the SSE generator.

**Source ticket:** tasks/TICKET-1-fastapi-server.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/pipeline accepts {concept, location, budget?} and returns {pipeline_id}
- [ ] #2 GET /api/stream/{id} returns SSE events streaming pipeline progress in real time
- [ ] #3 SSE emits phase, strategy, personas, reaction, simulation_complete, and shop_ready events
- [ ] #4 POST /api/order accepts {message, customer_name?} and returns cashier response + shop state
- [ ] #5 GET /api/shop/state returns current shop state
- [ ] #6 POST /api/shop/simulate-rush sends 15-20 persona-based orders with delays
- [ ] #7 CORS middleware configured for frontend dev server
- [ ] #8 Error events emitted if pipeline fails
- [ ] #9 Frontend can connect EventSource and see events arriving
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Server starts with uvicorn and responds to all endpoints
- [ ] #3 Tested with curl commands from ticket
<!-- DOD:END -->
