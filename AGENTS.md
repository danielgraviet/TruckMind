# AGENTS.md — TruckMind Codebase Navigation Guide

Quick-reference for AI agents. Read this before touching any file.
Skip straight to the section that matches your task.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [File Map](#2-file-map)
3. [Implementation Status](#3-implementation-status)
4. [Data Flow](#4-data-flow)
5. [Data Models (schema.py)](#5-data-models-schempy)
6. [Agent Functions — Signatures & Contracts](#6-agent-functions--signatures--contracts)
7. [Server API](#7-server-api)
8. [SSE Event Catalog](#8-sse-event-catalog)
9. [Frontend Map](#9-frontend-map)
10. [How to Run](#10-how-to-run)
11. [Where to Go for Common Tasks](#11-where-to-go-for-common-tasks)

---

## 1. What This Project Does

User submits a food truck concept → 4-agent pipeline runs:

1. **Strategist** — generates menu, pricing, positioning
2. **CrowdGen** — builds 100+ synthetic customer personas from census data
3. **Simulator** — runs two-tier market simulation (50 via LLM + rest rules-based)
4. **Shop** — opens a live shop; LLM cashier takes orders, autonomous ops fire on triggers

Frontend watches the pipeline via SSE, then lets users interact with the live shop.

---

## 2. File Map

```
TruckMind/
├── backend/
│   ├── agents/
│   │   ├── strategist.py     # Agent 1: concept → Strategy
│   │   ├── crowd.py          # Agent 2: location + strategy → list[Persona]
│   │   ├── simulator.py      # Agent 3: strategy + personas → SimulationResult
│   │   └── shop.py           # Agent 4: customer chat + autonomous ops
│   ├── engine/
│   │   └── pipeline.py       # Orchestrator + CLI entry point
│   ├── models/
│   │   └── schema.py         # *** ALL data contracts. Read this first. ***
│   ├── utils/
│   │   ├── llm_client.py     # EMPTY — LLMClient + MockLLMClient stubs needed
│   │   └── census.py         # Census ACS API wrapper (implemented, not wired in)
│   ├── server.py             # FastAPI app — all HTTP + SSE endpoints
│   └── requirements.txt      # fastapi, uvicorn[standard], python-dotenv
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PipelinePage.jsx   # EMPTY stub
│   │   │   └── ShopPage.jsx       # EMPTY stub
│   │   ├── components/
│   │   │   ├── pipeline/
│   │   │   │   ├── ConceptInput.jsx    # EMPTY stub
│   │   │   │   ├── StrategyCard.jsx    # EMPTY stub
│   │   │   │   ├── PersonaCard.jsx     # EMPTY stub
│   │   │   │   ├── ReactionBoard.jsx   # EMPTY stub
│   │   │   │   └── SimulationStats.jsx # EMPTY stub
│   │   │   ├── shop/
│   │   │   │   ├── ChatPanel.jsx       # EMPTY stub
│   │   │   │   ├── InventoryBars.jsx   # EMPTY stub
│   │   │   │   ├── PriceTable.jsx      # EMPTY stub
│   │   │   │   ├── RevenueCounter.jsx  # EMPTY stub
│   │   │   │   └── ActionFeed.jsx      # EMPTY stub
│   │   │   └── shared/
│   │   │       ├── LoadingState.jsx    # EMPTY stub
│   │   │       └── PhaseIndicator.jsx  # EMPTY stub
│   │   ├── hooks/
│   │   │   ├── useSSE.js      # EMPTY stub — EventSource hook for pipeline stream
│   │   │   └── useShop.js     # EMPTY stub — shop state management hook
│   │   ├── App.jsx            # EMPTY stub
│   │   └── main.jsx           # EMPTY stub
│   ├── package.json           # EMPTY — needs React + Vite + Tailwind deps
│   ├── vite.config.js         # EMPTY stub
│   └── tailwind.config.js     # EMPTY stub
├── tasks/                     # Ticket specs (read-only reference)
│   ├── TASKBOARD.md
│   ├── TICKET-0-project-setup.md
│   ├── TICKET-1-fastapi-server.md
│   └── ... (TICKET-2 through TICKET-7)
├── backlog/                   # Backlog tasks (read-only reference)
├── media/                     # SVG diagrams (read-only reference)
├── CLAUDE.md                  # Project instructions for Claude Code
├── AGENTS.md                  # This file
├── pyproject.toml             # Python project config (deps section empty)
├── main.py                    # Root-level entry (likely empty)
└── Makefile                   # Empty
```

---

## 3. Implementation Status

| File | Status |
|---|---|
| `backend/models/schema.py` | **Complete** — all data contracts |
| `backend/agents/strategist.py` | **Complete** |
| `backend/agents/crowd.py` | **Complete** |
| `backend/agents/simulator.py` | **Complete** |
| `backend/agents/shop.py` | **Complete** |
| `backend/engine/pipeline.py` | **Complete** |
| `backend/server.py` | **Complete** — FastAPI + SSE |
| `backend/utils/census.py` | **Complete** but not wired in (crowd.py uses `CACHED_DEMOGRAPHICS`) |
| `backend/utils/llm_client.py` | **EMPTY** — must implement `LLMClient` + `MockLLMClient` |
| `backend/requirements.txt` | **Complete** — fastapi, uvicorn[standard], python-dotenv |
| All `frontend/` files | **EMPTY stubs** |

---

## 4. Data Flow

```
User Input
    │
    ▼
BusinessConcept(description, location, budget?)
    │
    ▼  agents/strategist.py: create_strategy()
Strategy(business_name, tagline, menu[], pricing_rationale, ...)
    │
    ▼  agents/crowd.py: generate_seed_personas() + expand_personas()
list[Persona]  (~100 total: ~20 LLM seeds + ~80 programmatic)
    │
    ▼  agents/simulator.py: run_simulation()
SimulationResult(reactions[], menu_analysis[], overall_interest_rate, ...)
    │  ├─ if interest_rate < 0.6 → agents/strategist.py: refine_strategy() → loop
    │  └─ else → converged
    ▼  agents/shop.py: initialize_shop()
ShopState(strategy, inventory[], orders[], current_prices{}, ...)
    │
    ▼  agents/shop.py: handle_customer() [per message]
(response_text, list[ShopAction])  ← also fires check_autonomous_triggers()
```

**Refinement loop:** up to `max_refinement_rounds` (default 2). If `overall_interest_rate >= 0.6`, stops early.

**Two-tier simulation:**
- Tier 1: top 50 personas → LLM (batches of 12, ~4-5 API calls)
- Tier 2: remaining personas → `ScoringModel` learned from Tier 1 (zero API calls)
- `on_reaction(PersonaReaction)` callback fires for every persona in both tiers

---

## 5. Data Models (schema.py)

`backend/models/schema.py` — **read this before touching any agent or server code.**
Every model has a `.to_dict()` method returning a JSON-serializable dict.

### BusinessConcept
```python
@dataclass
class BusinessConcept:
    description: str      # "Taco truck near BYU campus"
    location: str         # "Provo, UT"
    budget: Optional[float] = None

    def to_prompt(self) -> str   # formats for LLM
```

### MenuItem
```python
@dataclass
class MenuItem:
    name: str
    description: str
    category: str             # "entree" | "side" | "drink" | "dessert"
    base_price: float
    cost_to_make: float
    prep_time_minutes: int
    tags: list[str]           # "vegetarian" | "spicy" | "gluten-free" etc.

    @property margin: float   # (price - cost) / price
    def to_dict() -> dict
```

### Strategy
```python
@dataclass
class Strategy:
    business_name: str
    tagline: str
    menu: list[MenuItem]
    target_demographic_summary: str
    pricing_rationale: str
    operating_hours: str
    location_rationale: str
    competitive_advantage: str
    version: int = 1          # incremented on each refine_strategy() call

    def to_dict() -> dict
    def menu_summary() -> str  # human-readable menu for LLM prompts
```

### Persona
```python
class PriceSensitivity(str, Enum):  LOW | MEDIUM | HIGH
class MealPreference(str, Enum):    QUICK | SOCIAL | HEALTH | INDULGENT

@dataclass
class Persona:
    id: str
    name: str
    age: int
    occupation: str
    annual_income: int
    household_size: int
    neighborhood: str
    price_sensitivity: PriceSensitivity
    meal_preference: MealPreference
    dietary_restrictions: list[str]
    flavor_preferences: list[str]
    lunch_budget: float
    visit_likelihood: str      # "daily" | "weekly" | "occasional" | "unlikely"
    backstory: str
    census_tract: Optional[str] = None
    education_level: Optional[str] = None

    def to_dict() -> dict
    def to_prompt() -> str     # renders persona for LLM prompt
```

### PersonaReaction
```python
class Sentiment(str, Enum):  EXCITED | POSITIVE | NEUTRAL | NEGATIVE | HOSTILE

@dataclass
class PersonaReaction:
    persona_id: str
    persona_name: str
    sentiment: Sentiment
    would_visit: bool
    likely_order: Optional[str]
    max_willing_to_pay: Optional[float]
    feedback: str
    visit_frequency: str       # "daily" | "weekly" | "monthly" | "never"

    def to_dict() -> dict
```

### SimulationResult
```python
@dataclass
class SimulationResult:
    round_number: int
    strategy_version: int
    total_personas: int
    reactions: list[PersonaReaction]
    menu_analysis: list[MenuItemAnalysis]
    overall_interest_rate: float    # 0-1, % who would visit
    avg_sentiment_score: float      # -2 (hostile) to +2 (excited)
    projected_daily_customers: int
    projected_daily_revenue: float
    top_concerns: list[str]
    top_strengths: list[str]

    def to_dict() -> dict
    def summary() -> str
```

### MenuItemAnalysis
```python
@dataclass
class MenuItemAnalysis:
    item_name: str
    demand_score: float             # 0-1
    avg_willingness_to_pay: float
    price_too_high_pct: float
    price_too_low_pct: float
    suggested_price: float
    top_feedback_themes: list[str]

    def to_dict() -> dict
```

### ShopState (mutable)
```python
@dataclass
class ShopState:
    strategy: Strategy
    inventory: list[InventoryItem]
    orders: list[Order] = []
    action_log: list[ShopAction] = []
    current_prices: dict[str, float] = {}  # dynamic price overrides
    removed_items: list[str] = []
    total_revenue: float = 0.0
    total_orders: int = 0
    cash_on_hand: float = 500.0

    def get_active_menu() -> list[MenuItem]   # in-stock, not removed
    def get_current_price(item_name) -> Optional[float]
    def active_menu_display() -> str          # formatted for cashier prompt
    def to_dict() -> dict                     # returns last 10 orders/actions
```

### InventoryItem
```python
@dataclass
class InventoryItem:
    menu_item_name: str
    quantity_remaining: int
    restock_threshold: int     # default 5
    max_capacity: int          # default 50
    unit_cost: float

    @property is_low: bool     # quantity_remaining <= restock_threshold
    @property is_out: bool     # quantity_remaining <= 0
    def to_dict() -> dict
```

### Order
```python
@dataclass
class Order:
    id: str                    # "ORD-XXXXXX"
    timestamp: str             # ISO 8601
    customer_name: str
    items: list[str]           # menu item names
    total_price: float
    status: str = "pending"    # "pending" | "preparing" | "ready" | "completed"

    def to_dict() -> dict
```

### ShopAction
```python
class ShopActionType(str, Enum):
    TAKE_ORDER | REJECT_ORDER | ADJUST_PRICE | REMOVE_ITEM | RESTOCK | ADD_SPECIAL | UPDATE_STATUS

@dataclass
class ShopAction:
    action_type: ShopActionType
    description: str
    details: dict = {}         # action-specific payload
    autonomous: bool = True    # False = customer-initiated

    def to_dict() -> dict
```

### PipelineState
```python
@dataclass
class PipelineState:
    concept: BusinessConcept
    strategy: Optional[Strategy] = None
    personas: list[Persona] = []
    simulation_results: list[SimulationResult] = []
    shop_state: Optional[ShopState] = None
    current_phase: str = "concept"
    # valid phases: concept → strategy → personas → simulation → refinement → shop

    def advance_to(phase: str)
```

---

## 6. Agent Functions — Signatures & Contracts

All agents are **synchronous** (blocking LLM calls). Run via `asyncio.to_thread()` from server.

### LLMClient interface (needs implementation in `utils/llm_client.py`)
```python
class LLMClient:
    def complete_json(prompt, system, max_tokens, temperature) -> Response
        # Response.parsed_json: dict | None
        # Response.raw_text: str

    def complete_json_list(prompt, system, max_tokens, temperature) -> Response
        # Response.parsed_json: list[dict] | None

    def cost_report() -> str

class MockLLMClient:
    # Same interface, returns realistic hardcoded data — no API calls
```

### Strategist (`agents/strategist.py`)
```python
def create_strategy(concept: BusinessConcept, client: LLMClient) -> Strategy

def refine_strategy(strategy: Strategy, sim_result: SimulationResult, client: LLMClient) -> Strategy
# Returns new Strategy with version incremented
```

### CrowdGen (`agents/crowd.py`)
```python
def generate_seed_personas(
    location: str,
    strategy: Strategy,
    client: LLMClient,
    num_seeds: int = 20,
) -> list[Persona]

def expand_personas(
    seeds: list[Persona],
    target_count: int,
    location: str,
    demographics: dict,
) -> list[Persona]
# Deterministic: uses random.Random(42)

def get_demographics(location: str) -> dict
# Returns CACHED_DEMOGRAPHICS for "Provo, UT" and "Salt Lake City, UT"
# Falls back to generic dict for other locations
```

### Simulator (`agents/simulator.py`)
```python
def run_simulation(
    strategy: Strategy,
    personas: list[Persona],
    client: LLMClient,
    round_number: int,
    tier1_count: int = 50,
    batch_size: int = 12,
    on_reaction: Optional[callable] = None,  # called with PersonaReaction for each persona
) -> SimulationResult
# on_reaction fires 200 times total (once per persona, both tiers)
# Must use call_soon_threadsafe when bridging to asyncio from this thread
```

### Shop (`agents/shop.py`)
```python
def initialize_shop(strategy: Strategy, starting_cash: float = 500.0) -> ShopState
# Creates 30 units per item, restock_threshold=5, max_capacity=50

def handle_customer(
    shop_state: ShopState,
    customer_message: str,
    client: LLMClient,
    customer_name: str = "Customer",
) -> tuple[str, list[ShopAction]]
# Mutates shop_state in place (orders, inventory, revenue, cash)
# Calls check_autonomous_triggers() internally after each order

def check_autonomous_triggers(shop_state: ShopState, client: LLMClient) -> list[ShopAction]
# Triggers: low inventory, out-of-stock removal, surge pricing (≥8 orders in last 20)
# Mutates shop_state.action_log and shop_state.current_prices in place
```

### Pipeline Orchestrator (`engine/pipeline.py`)
```python
def run_pipeline(
    concept_description: str,
    location: str,
    client: Optional[LLMClient] = None,
    num_personas: int = 100,
    num_seed_personas: int = 20,
    max_refinement_rounds: int = 2,
    convergence_threshold: float = 0.6,
    budget: Optional[float] = None,
    verbose: bool = True,
) -> PipelineState
# Note: server.py does NOT call run_pipeline() — it re-implements
# phases inline so it can yield SSE events between steps.

def run_shop_repl(state: PipelineState, client: Optional[LLMClient] = None)
# Interactive REPL for testing. CLI only.
```

---

## 7. Server API

All endpoints live in `backend/server.py`. In-memory state — no database.

```
POST /api/pipeline
  Body:    { "concept": str, "location": str, "budget": float?, "mock": bool }
  Returns: { "pipeline_id": str }
  Action:  Stores entry in pipelines{} dict. Does NOT start pipeline yet.
           Pipeline runs lazily when SSE stream is connected.

GET /api/stream/{pipeline_id}
  Returns: text/event-stream (SSE)
  Action:  Runs all pipeline phases inline, yields events as they complete.
           See SSE Event Catalog below.

POST /api/order
  Body:    { "message": str, "customer_name": str? }
  Returns: {
    "cashier_message": str,
    "order": dict | null,
    "autonomous_actions": list[dict],
    "shop_state": dict
  }
  Requires active shop (pipeline must have completed first).

GET /api/shop/state
  Returns: ShopState.to_dict()
  Requires active shop.

POST /api/shop/simulate-rush
  Returns: {
    "orders_processed": int,
    "results": list[{ customer, message, cashier_message, autonomous_actions }],
    "shop_state": dict
  }
  Action: Fires 15-20 synthetic orders with 100ms delays.
```

**In-memory stores (module-level in server.py):**
```python
pipelines: dict[str, dict]   # pipeline_id → { concept, location, budget, client, strategy?, personas?, sim_result?, shop_state? }
active_shop: dict            # { "state": ShopState | None, "client": LLMClient | None }
```

---

## 8. SSE Event Catalog

Events emitted by `GET /api/stream/{pipeline_id}` in order:

```
event: phase
data: {"phase": "strategy", "status": "running"}

event: strategy
data: Strategy.to_dict()

event: phase
data: {"phase": "personas", "status": "running"}

event: personas
data: {"count": int, "sample": [first 10 Persona.to_dict()]}

event: phase
data: {"phase": "simulation", "status": "running"}

event: reaction          ← fires ~100 times (one per persona)
data: PersonaReaction.to_dict()

event: simulation_complete
data: SimulationResult.to_dict()

event: phase
data: {"phase": "shop", "status": "ready"}

event: shop_ready
data: ShopState.to_dict()

event: error             ← only on failure
data: {"message": str}
```

**Frontend usage:**
```js
const es = new EventSource(`/api/stream/${pipelineId}`)
es.addEventListener("strategy", e => { const strategy = JSON.parse(e.data) })
es.addEventListener("reaction", e => { const reaction = JSON.parse(e.data) })
// etc.
```

---

## 9. Frontend Map

All frontend files are **empty stubs**. Tech stack: React + Vite + Tailwind CSS.

```
Pages:
  PipelinePage  — runs phases 1-3, shows strategy → personas → reaction board
  ShopPage      — live shop: chat + inventory + pricing + revenue + action feed

Components (pipeline):
  ConceptInput    — form: concept text, location, budget → POST /api/pipeline
  StrategyCard    — renders Strategy (menu, pricing, positioning)
  PersonaCard     — renders a single Persona
  ReactionBoard   — grid of PersonaReaction cards, fills as SSE reactions arrive
  SimulationStats — renders SimulationResult aggregate stats

Components (shop):
  ChatPanel       — customer chat input → POST /api/order, shows cashier response
  InventoryBars   — progress bars for each InventoryItem
  PriceTable      — current prices with surge indicators
  RevenueCounter  — animating total_revenue + total_orders
  ActionFeed      — scrolling log of ShopAction events (autonomous=true highlighted)

Shared:
  LoadingState    — spinner/skeleton for async phases
  PhaseIndicator  — pipeline phase progress (concept → strategy → personas → sim → shop)

Hooks:
  useSSE(pipelineId)   — wraps EventSource, dispatches typed events to state
  useShop()            — manages shop state, wraps POST /api/order + GET /api/shop/state
```

---

## 10. How to Run

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# Run pipeline via CLI (bypasses server)
python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock
python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock --interactive

# Frontend (once package.json is filled in)
cd frontend
npm install
npm run dev    # default: http://localhost:5173

# Test SSE stream end-to-end
curl -X POST http://localhost:8000/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{"concept": "Taco truck near BYU", "location": "Provo, UT", "mock": true}'
# → { "pipeline_id": "abc123" }

curl -N http://localhost:8000/api/stream/abc123
```

**Environment variables** (create `.env` in `backend/`):
```
ANTHROPIC_API_KEY=sk-ant-...   # or whichever provider LLMClient wraps
CENSUS_API_KEY=...             # from api.census.gov/data/key_signup.html (optional)
```

---

## 11. Where to Go for Common Tasks

| Task | File(s) |
|---|---|
| Change a data model | `backend/models/schema.py` — changes cascade to all agents |
| Change menu generation logic | `backend/agents/strategist.py` |
| Change persona demographics | `backend/agents/crowd.py` — `CACHED_DEMOGRAPHICS`, `expand_personas()` |
| Change simulation scoring | `backend/agents/simulator.py` — `ScoringModel`, `_run_tier2()` |
| Change cashier behavior | `backend/agents/shop.py` — `CASHIER_SYSTEM_PROMPT` |
| Change autonomous shop logic | `backend/agents/shop.py` — `check_autonomous_triggers()`, `AUTONOMOUS_SYSTEM_PROMPT` |
| Add/change an API endpoint | `backend/server.py` |
| Change SSE events | `backend/server.py` — `_pipeline_generator()` |
| Implement the LLM client | `backend/utils/llm_client.py` — needs `LLMClient` + `MockLLMClient` |
| Wire in real Census data | `backend/utils/census.py` already implemented; swap `CACHED_DEMOGRAPHICS` in `crowd.py:get_demographics()` |
| Build the pipeline UI | `frontend/src/pages/PipelinePage.jsx` + `frontend/src/hooks/useSSE.js` |
| Build the shop UI | `frontend/src/pages/ShopPage.jsx` + `frontend/src/hooks/useShop.js` |
| Add a new pipeline phase | `backend/models/schema.py` (new model) → new agent file → wire into `backend/server.py:_pipeline_generator()` and `backend/engine/pipeline.py` |
| Understand the full pipeline order | `backend/engine/pipeline.py` — `run_pipeline()` is the canonical sequence |
