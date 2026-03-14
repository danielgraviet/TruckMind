---
id: doc-4
title: Build Plan - Prioritized Execution
type: other
created_date: '2026-03-14 18:07'
---
# Build Plan — Prioritized Execution

## Current State (as of start)

| Component | Status | Notes |
|-----------|--------|-------|
| schema.py (data contracts) | **Done** | 442 lines, production-ready |
| Strategist agent | **85%** | Awaiting LLM client |
| CrowdGen agent | **90%** | Awaiting LLM client, Census not wired |
| Simulator agent | **95%** | Awaiting LLM client |
| Shop agent | **80%** | Awaiting LLM client + server |
| Pipeline orchestrator | **90%** | Awaiting LLM client |
| Census utility | **85%** | Implemented, not wired into crowd.py |
| **LLM client** | **0%** | **EMPTY FILE — BLOCKS EVERYTHING** |
| **FastAPI server** | **0%** | **EMPTY FILE** |
| **Frontend (all components)** | **0%** | **ALL EMPTY STUBS** |
| Makefile / .env | **0%** | Empty |

---

## MVP Scope

### Must-Have (no demo without these)
1. LLM client (`complete_json`, `complete_json_list`, `MockLLMClient`)
2. Pipeline runs end-to-end in mock and real mode
3. FastAPI server: SSE streaming + shop REST endpoints
4. Pipeline page: ConceptInput → StrategyCard → ReactionBoard → SimStats
5. Shop page: ChatPanel + InventoryBars + PriceTable + RevenueCounter + ActionFeed
6. Demo mode with pre-cached pipeline output
7. Simulate Rush button (15-20 automated orders)

### Should-Have (win differentiators)
- Live Census API pulls during demo
- Reaction board flip animations (slow Tier 1, flood Tier 2)
- Autonomous decision reasoning visible in ActionFeed
- Strategy refinement visible in UI

### Cut List (do not build)
- Multiple competing strategies (one + refinement is enough)
- Mobile responsiveness
- Auth, persistence, database
- Complex error retry logic
- Census sub-variable precision improvements

---

## Execution Steps (in order)

### Step 1: LLM Client — CRITICAL BLOCKER
- Implement `backend/utils/llm_client.py`
- `LLMClient`: wraps Anthropic Claude API, exposes `complete_json()`, `complete_json_list()`, `cost_report()`
- `MockLLMClient`: returns plausible hardcoded JSON for each agent
- **Start with MockLLMClient first** — unblocks pipeline testing immediately
- ~30-60 min

### Step 2: Pipeline Verification
- Run `python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock`
- Fix integration bugs, schema mismatches, import errors
- Run with real LLM, verify output quality
- Save one good run as `backend/fixtures/demo_output.json`
- ~1-2 hours

### Step 3: FastAPI Server
- Implement `backend/server.py`:
  - `POST /api/pipeline` → returns pipeline_id
  - `GET /api/stream/{pipeline_id}` → SSE event stream
  - `POST /api/order` → shop order + full state response
  - `GET /api/shop/state` → current state
  - `POST /api/shop/simulate-rush` → 15-20 persona orders
- CORS middleware, in-memory state store
- `asyncio.to_thread()` for blocking agent calls
- ~2-3 hours

### Step 4: Frontend Foundation
- Set up React + Vite + Tailwind (package.json, configs, index.html)
- App.jsx with routing (PipelinePage ↔ ShopPage)
- `useSSE` hook (wraps EventSource)
- `useShop` hook (wraps POST /order, manages state)
- Makefile: `make dev` runs both servers
- ~1-2 hours

### Step 5: Pipeline Page
- ConceptInput (text + location fields, submit button)
- PhaseIndicator (4-phase progress bar)
- StrategyCard (business name, tagline, menu table)
- ReactionBoard (200 persona cards with sentiment colors)
- SimulationStats (interest rate, revenue projection, sentiment breakdown)
- ~3-4 hours

### Step 6: Shop Dashboard
- ChatPanel (customer/cashier messages, typing indicator)
- InventoryBars (color-coded stock levels)
- PriceTable (current prices, change indicators)
- RevenueCounter (orders, revenue, cash counters)
- ActionFeed (autonomous decisions with timestamps + reasoning)
- SimulateRushButton (triggers rush, shows progress)
- ~3-4 hours

### Step 7: Demo Mode
- `?demo=true` loads pre-cached pipeline output instantly
- Shop chat still uses real LLM (single call per order — reliable)
- ~1 hour

### Step 8: Shop Agent Tuning
- Stagger inventory (entrees=15, drinks=25, sides=12)
- Lower restock threshold to 4
- Surge pricing at 5+ orders of same item (cap 20%)
- Ensure 3-4 autonomous actions fire during 20-order rush
- ~1-2 hours

### Step 9: Visual Polish
- TruckMind header/branding
- Consistent color palette
- Reaction board animations
- Inventory bar transitions
- ~1-2 hours

### Step 10: Rehearsal
- Write demo script (see Demo Script doc)
- Rehearse 2+ times with timer
- Prepare 3-4 backup slides
- ~1-2 hours

---

## If Running Behind — Cut In Order
1. Census live API (cached data works)
2. Strategy refinement (1 round, not 2)
3. Simulate Rush button (judges type manually)
4. Tier 2 persona expansion (50 LLM personas only)
5. **NEVER CUT:** Reaction board, shop chat, autonomous decisions
