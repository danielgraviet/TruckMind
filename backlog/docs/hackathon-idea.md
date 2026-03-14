# Read Me

# 🚚 TruckMind — An AI That Doesn't Just Advise. It Operates.

> **"AI Runs the Shop"** — Podium Hackathon 2026

TruckMind is a fully autonomous AI agent that launches and operates a pop-up food truck business from zero. Give it a concept — it researches the market, builds a menu, sets prices, serves customers, and adapts in real time. No human in the loop. The AI _is_ the operator.

---

## The Problem

Early-stage founders burn weeks guessing at product-market fit. They pick menus based on vibes, price based on competitors they Googled for 10 minutes, and have no idea if their target customer actually wants what they're selling.

Meanwhile, real market research costs $10K+ and takes months.

**TruckMind compresses that entire cycle — research, strategy, launch, operation, adaptation — into minutes.**

---

## How It Works

TruckMind runs as a **multi-agent system** with four autonomous layers:

### Layer 1 → Market Intelligence

- Pulls real demographic data (U.S. Census API) for the truck's target location
- Analyzes income distributions, age brackets, household composition, and density
- Grounds every downstream decision in actual population data, not LLM hallucinations

![census_to_personas_pipeline.svg](attachment:49f8cf81-b1ec-44fa-8bb4-e8e3ec0905c7:census_to_personas_pipeline.svg)

### Layer 2 → Synthetic Customer Engine (Our Secret Weapon)

- Generates **200–400 realistic customer personas** using a technique called **Silicon Sampling**
- Each persona has a name, age, income, dietary preferences, price sensitivity, flavor profile, visit frequency, and backstory — all derived from real demographic distributions
- Personas aren't random — they're **programmatically expanded** from census clusters so the synthetic population mirrors the real one
- This is our simulated "target market" — a living test audience the AI can query at any time

### Layer 3 → Strategy & Simulation

- The AI CEO agent designs multiple competing strategies: menu options, pricing tiers, truck positioning, operating hours
- Each strategy is **stress-tested against the persona population** — the synthetic customers "react" to menus, prices, and offerings
- Feedback is aggregated: Which items get the most interest? Where does price sensitivity spike? What combos drive repeat visits?
- The agent selects the highest-signal strategy and refines it based on simulation results

### Layer 4 → Live Operations

- Once the strategy is locked after simulation, the shop opens automatically. Inventory is initialized directly from the strategy — each menu item starts with 30 units, restock thresholds set at 5, and unit costs pulled from the Strategist's COGS estimates.
- The shop runs through a single REST endpoint (`POST /api/order`). Every order triggers a chain: the LLM cashier responds conversationally, inventory decrements via pure Python, and `check_autonomous_triggers()` fires automatically to evaluate whether the AI needs to act. If a threshold is hit (low stock, surge demand, sold out), the AI gets one focused LLM call with the current state and makes a decision — restock, raise price, remove item, or do nothing. The decision is applied to state and returned to the frontend in the same response payload as the order.
- The frontend is a two-panel layout. The left panel is a customer-facing chat where judges (or simulated persona customers via a "simulate rush" button) place orders. The right panel is an operator dashboard — inventory bars, live price table with dynamic overrides highlighted, a revenue/order counter, and an action feed where autonomous decisions stream in with timestamps and reasoning. Every panel reads from the same response object — no separate polling or state sync.
- The "simulate rush" mode pulls from Phase 3 results: personas who expressed positive sentiment and stated a likely order are sent through the chat in character, 1-2 seconds apart, so judges can watch inventory deplete, prices shift, and menu items get pulled in real time without needing to type anything themselves.
- The reaction board from Phase 3 does not appear here. Personas served their purpose during market research — they validated the strategy. Phase 4 proves a different thing: that the AI can operate under real constraints with mutable state, making autonomous decisions that a human operator would normally handle.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    TruckMind Core                    │
├─────────────┬─────────────┬─────────────────────────┤
│  Census API │  Persona    │  Strategy Engine         │
│  Ingestion  │  Generator  │  (Multi-agent)           │
│             │  (Silicon   │                          │
│             │  Sampling)  │  ┌─────────────────────┐ │
│             │             │  │ Menu Designer        │ │
│             │  200-400    │  │ Pricing Optimizer    │ │
│             │  synthetic  │  │ Hours/Location Agent │ │
│             │  customers  │  └─────────────────────┘ │
├─────────────┴─────────────┴─────────────────────────┤
│              Simulation Sandbox                       │
│  Strategies tested against persona population         │
│  Feedback aggregated → best strategy selected         │
├──────────────────────────────────────────────────────┤
│              Live Operations Layer                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Order Chat │  │ Dynamic  │  │ Inventory &      │ │
│  │ Interface  │  │ Pricing  │  │ Restock Engine   │ │
│  └────────────┘  └──────────┘  └──────────────────┘ │
├──────────────────────────────────────────────────────┤
│              Dashboard / Demo UI                     │
│  Live reaction board · Persona sentiment · P&L       │
└──────────────────────────────────────────────────────┘
```

---

## Demo Flow (Suggested)

| Time | What the judges see                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | User types a one-line food truck concept: _"Gourmet grilled cheese in Provo, UT"_                                            |
| 0:30 | Census data pulls in. Demographic profile of Provo appears on screen.                                                        |
| 1:00 | Persona engine generates ~300 synthetic customers. Live reaction board populates — faces, names, preferences scrolling in.   |
| 1:30 | Strategy engine proposes 3 competing menu/pricing strategies. Simulation runs visibly — persona reactions animate on screen. |
| 2:30 | Winning strategy selected. Food truck "opens." Menu and prices displayed.                                                    |
| 3:00 | Judge interacts with the ordering chat, or we simulate a rush. AI takes their order, upsells a side, processes it.           |
| 3:30 | Demand surge simulated — dynamic pricing kicks in, inventory alerts fire, AI makes restocking decision autonomously.         |
| 4:00 | Dashboard shows: revenue, customer satisfaction score, inventory status, pricing changes over time.                          |
| 4:30 | Wrap: "TruckMind made 47 autonomous decisions in the last 4 minutes with zero human input."                                  |

![corrected_demo_phases.svg](attachment:27f89e0d-243e-4d9c-8aa9-d6262ac7d146:corrected_demo_phases.svg)

---

## Scoring Alignment

| Criteria                 | Weight | How TruckMind scores                                                                                                                                                                              |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autonomy**             | 40%    | The AI makes every decision: menu, pricing, inventory, customer service, restocking. Zero human-in-the-loop after initial concept input. Multi-agent architecture with distinct autonomous roles. |
| **Value**                | 30%    | Solves a real problem for early-stage founders: instant, data-grounded market validation + autonomous operations. Utah's startup scene is the perfect context.                                    |
| **Technical Complexity** | 20%    | Multi-agent orchestration, Silicon Sampling with demographic grounding, real-time simulation engine, dynamic pricing algorithm, conversational order management.                                  |
| **Demo + Presentation**  | 10%    | Live reaction board is visually compelling. Judge interaction with the ordering chat makes it tangible. Clear narrative arc from "idea" to "operating business" in under 5 minutes.               |

---

## Tech Stack (Suggested)

| Component            | Tech                                                  |
| -------------------- | ----------------------------------------------------- |
| Agent orchestration  | Claude API (tool use / multi-turn)                    |
| Persona generation   | Claude + programmatic expansion scripts               |
| Demographic data     | U.S. Census Bureau API                                |
| Frontend / dashboard | React + Tailwind (or Next.js)                         |
| Live reaction board  | WebSocket or polling + animated UI                    |
| Customer chat        | Claude API with system prompt as the "truck operator" |
| Dynamic pricing      | Custom logic layer fed by demand signals              |
| State management     | In-memory or lightweight DB (SQLite / Supabase)       |

---

## Key Risks & Mitigations

| Risk                                | Mitigation                                                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona generation is slow at scale | Pre-generate persona templates, expand programmatically with demographic variation. Batch Claude calls.                                                              |
| Census API is clunky                | Cache common geographies. Have fallback demographic profiles for demo locations (Provo, SLC).                                                                        |
| "Simulation" feels like a black box | Make it visual. The live reaction board IS the simulation — judges see personas reacting in real time.                                                               |
| Demo runs long                      | Rehearse ruthlessly. Pre-seed the census data for the demo location. The 5-minute flow above should be tight.                                                        |
| Judges think it's "just a chatbot"  | Emphasize the decision chain: the AI didn't just chat — it researched, strategized, tested, launched, priced, restocked, and adapted. Count the decisions on screen. |

---

## Team Task Breakdown (Suggested)

| Role                 | Focus                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| **Agent Architect**  | Multi-agent orchestration, strategy engine, simulation loop                 |
| **Persona Engineer** | Census API integration, Silicon Sampling pipeline, persona data model       |
| **Frontend / Demo**  | Dashboard, live reaction board, ordering chat UI, presentation polish       |
| **Operations Logic** | Dynamic pricing algorithm, inventory system, order processing, P&L tracking |

---

## What Makes This Different

Most hackathon projects build a chatbot that answers questions about a business. TruckMind **is** the business. It doesn't advise a human founder — it replaces the need for one in the early operational phase.

The Silicon Sampling layer isn't a gimmick. It's a genuine competitive advantage: instead of guessing what customers want, the AI builds a statistically grounded synthetic market and tests against it before making a single real decision. That's how the best companies operate — TruckMind just does it in seconds.

---

_Built at Podium Hackathon 2026 · Provo, UT_

```python
US_CENSUS_API=7601db6c778973903ed65aeb84ba546b4055b743
```

# Census Reporter Code

```python
import requests

# Census Reporter API — no API key required
# Docs: https://censusreporter.org/api/

GEO_ID = "16000US4962470"  # Provo city, UT

TABLES = ",".join([
    "B01001",   # Sex by Age
    "B01002",   # Median Age
    "B02001",   # Race
    "B03003",   # Hispanic or Latino Origin
    "B15003",   # Educational Attainment (25+)
    "B19013",   # Median Household Income
    "B19301",   # Per Capita Income
    "B17001",   # Poverty Status
    "B23025",   # Employment Status
    "B25077",   # Median Home Value
    "B25064",   # Median Gross Rent
    "B11001",   # Household Type (family vs non-family)
])

response = requests.get(
    "https://api.censusreporter.org/1.0/data/show/latest",
    params={"table_ids": TABLES, "geo_ids": GEO_ID},
)

if response.status_code != 200:
    raise SystemExit(f"Error {response.status_code}: {response.text}")

d = response.json()["data"][GEO_ID]

def pct(num, denom):
    return f"{num / denom * 100:.1f}%" if denom else "N/A"

def dollar(val):
    return f"${val:,.0f}" if val else "N/A"

# --- Population & Age ---
total_pop = d["B01001"]["estimate"]["B01001001"]
male       = d["B01001"]["estimate"]["B01001002"]
female     = d["B01001"]["estimate"]["B01001026"]
median_age = d["B01002"]["estimate"]["B01002001"]

print("=== Population & Age ===")
print(f"  Total Population : {total_pop:,.0f}")
print(f"  Male             : {male:,.0f} ({pct(male, total_pop)})")
print(f"  Female           : {female:,.0f} ({pct(female, total_pop)})")
print(f"  Median Age       : {median_age}")

# --- Race & Ethnicity ---
white    = d["B02001"]["estimate"]["B02001002"]
black    = d["B02001"]["estimate"]["B02001003"]
asian    = d["B02001"]["estimate"]["B02001005"]
other    = total_pop - white - black - asian
hispanic = d["B03003"]["estimate"]["B03003003"]

print("\n=== Race & Ethnicity ===")
print(f"  White              : {white:,.0f} ({pct(white, total_pop)})")
print(f"  Black              : {black:,.0f} ({pct(black, total_pop)})")
print(f"  Asian              : {asian:,.0f} ({pct(asian, total_pop)})")
print(f"  Other/Multi        : {other:,.0f} ({pct(other, total_pop)})")
print(f"  Hispanic or Latino : {hispanic:,.0f} ({pct(hispanic, total_pop)})")

# --- Income & Poverty ---
median_income  = d["B19013"]["estimate"]["B19013001"]
per_cap_income = d["B19301"]["estimate"]["B19301001"]
in_poverty     = d["B17001"]["estimate"]["B17001002"]
poverty_denom  = d["B17001"]["estimate"]["B17001001"]

print("\n=== Income & Poverty ===")
print(f"  Median Household Income : {dollar(median_income)}")
print(f"  Per Capita Income       : {dollar(per_cap_income)}")
print(f"  Below Poverty Line      : {in_poverty:,.0f} ({pct(in_poverty, poverty_denom)})")

# --- Education (population 25+) ---
edu = d["B15003"]["estimate"]
edu_total     = edu["B15003001"]
hs_diploma    = edu["B15003017"]
some_college  = edu["B15003019"] + edu["B15003020"]
bachelors     = edu["B15003022"]
graduate      = edu["B15003023"] + edu["B15003024"] + edu["B15003025"]

print("\n=== Education (age 25+) ===")
print(f"  HS Diploma or equiv : {hs_diploma:,.0f} ({pct(hs_diploma, edu_total)})")
print(f"  Some College        : {some_college:,.0f} ({pct(some_college, edu_total)})")
print(f"  Bachelor's Degree   : {bachelors:,.0f} ({pct(bachelors, edu_total)})")
print(f"  Graduate Degree     : {graduate:,.0f} ({pct(graduate, edu_total)})")

# --- Employment ---
emp = d["B23025"]["estimate"]
labor_force  = emp["B23025002"]
employed     = emp["B23025004"]
unemployed   = emp["B23025005"]

print("\n=== Employment ===")
print(f"  Labor Force      : {labor_force:,.0f}")
print(f"  Employed         : {employed:,.0f} ({pct(employed, labor_force)})")
print(f"  Unemployed       : {unemployed:,.0f} ({pct(unemployed, labor_force)})")

# --- Housing ---
median_home_value = d["B25077"]["estimate"]["B25077001"]
median_rent       = d["B25064"]["estimate"]["B25064001"]

print("\n=== Housing ===")
print(f"  Median Home Value : {dollar(median_home_value)}")
print(f"  Median Gross Rent : {dollar(median_rent)}/mo")

# --- Households ---
hh = d["B11001"]["estimate"]
total_hh  = hh["B11001001"]
family_hh = hh["B11001002"]

print("\n=== Households ===")
print(f"  Total Households  : {total_hh:,.0f}")
print(f"  Family Households : {family_hh:,.0f} ({pct(family_hh, total_hh)})")

```

![sse_architecture_flow.svg](attachment:b1c2510b-6163-40a2-8341-2d273814ee4e:sse_architecture_flow.svg)

# Front End Notes

Great question — this is where a lot of hackathon projects fall apart. They build a great backend, then wire it to the frontend with duct tape. Let me explain the architecture options honestly, then recommend what to build.

**The core problem:** Your pipeline takes 30-60 seconds to run end-to-end (strategy generation → persona creation → simulation → shop setup). You can't just make one REST call and wait — the user stares at a blank screen. You need to stream progress to the frontend as it happens.

There are three common approaches:

**Option A: Polling.** Frontend calls `POST /run-pipeline`, gets back a job ID, then polls `GET /status/{job_id}` every second. Simple but janky — you get stale data, wasted requests, and the UI updates in choppy increments. Fine for a prototype but looks bad in a demo.

**Option B: WebSockets.** Frontend opens a persistent connection to the backend. As each phase completes (strategy done, persona generated, reaction scored), the backend pushes an event through the socket. The frontend updates in real time. This is the right answer for production, but WebSocket setup adds complexity — connection management, reconnection logic, CORS headaches.

**Option C: Server-Sent Events (SSE).** The sweet spot for a hackathon. Frontend makes a single `GET /stream` request. The backend holds the connection open and pushes newline-delimited JSON events as things happen. It's one-directional (server → client), which is all you need — the user kicks off the pipeline once, then watches. No WebSocket library needed, the browser's built-in `EventSource` API handles it, and FastAPI/Flask both support it trivially.

I'd go with SSE. Here's what the architecture looks like:Here's how the flow works in practice.

**The user submits their concept.** The React frontend sends a `POST /pipeline` with the concept text and location. The backend returns immediately with a `pipeline_id` — it doesn't wait for the pipeline to finish.

**The frontend opens an SSE connection.** Immediately after the POST returns, the frontend creates an `EventSource` pointed at `GET /stream/{pipeline_id}`. This is a single HTTP connection that stays open. The browser handles reconnection automatically if it drops — you don't write any retry logic.

**The backend pushes events as they happen.** Each phase of the pipeline emits a typed event through the SSE stream. The frontend listens for each event type and updates the UI accordingly. Here's what the event sequence looks like in practice:

```
event: phase
data: {"phase": "strategy", "status": "running"}

event: strategy
data: {"business_name": "Fuego Wheels", "menu": [...], ...}

event: phase
data: {"phase": "personas", "status": "running"}

event: personas
data: {"count": 200, "personas": [{id, name, age, ...}, ...]}

event: phase
data: {"phase": "simulation", "status": "running"}

event: reaction
data: {"persona_id": "seed-001", "sentiment": "excited", "feedback": "..."}

event: reaction
data: {"persona_id": "seed-002", "sentiment": "neutral", "feedback": "..."}

... (200 of these, one per persona)

event: simulation_complete
data: {"interest_rate": 0.58, "projected_revenue": 847.50, ...}

event: shop_ready
data: {"active_menu": [...], "inventory": [...]}
```

**The `on_reaction` callback is the bridge.** Remember that parameter in the simulator? On the backend, you wire it to push each reaction into the SSE stream as it's generated. Tier 1 reactions trickle in over 20 seconds (waiting on Claude). Then Tier 2 reactions fire in a burst — 150 reactions in under a second. On the reaction board, this creates a visual cadence: cards flip slowly at first (the LLM is thinking), then suddenly the board floods with color. That's a demo moment.

**The frontend code is simple.** Here's the core pattern:

```jsx
const source = new EventSource(`/stream/${pipelineId}`);

source.addEventListener("strategy", (e) => {
  const strategy = JSON.parse(e.data);
  setStrategy(strategy); // React state update
});

source.addEventListener("reaction", (e) => {
  const reaction = JSON.parse(e.data);
  // This fires 200 times — each one flips a card on the board
  setReactions((prev) => [...prev, reaction]);
});

source.addEventListener("shop_ready", (e) => {
  setPhase("shop"); // Switch UI to ordering mode
  source.close(); // Pipeline done, close the connection
});
```

**The shop ordering phase switches to regular REST.** Once the pipeline is done and the shop is open, you don't need SSE anymore. Customer orders are simple request/response: `POST /order` with the message, get back the cashier's response plus any autonomous actions. This is where the chat interface lives.

**For the hackathon, I'd recommend FastAPI** for the backend because it has built-in SSE support via `StreamingResponse` and async generators. The backend endpoint looks roughly like:

```python
@app.get("/stream/{pipeline_id}")
async def stream_pipeline(pipeline_id: str):
    async def event_generator():
        # Each yield sends an SSE event to the frontend
        yield f"event: phase\ndata: {json.dumps({'phase': 'strategy'})}\n\n"

        strategy = create_strategy(concept, client)
        yield f"event: strategy\ndata: {json.dumps(strategy.to_dict())}\n\n"

        # ... personas, simulation with on_reaction callback, etc.

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

The key insight: every `.to_dict()` method we built into the schema models is what makes this work cleanly — the backend just serializes dataclasses to JSON and pushes them through the stream. The frontend consumes the exact same shape.

Want me to build out the actual FastAPI server and the React frontend, or do you have enough to split this across your team?

## More Context

You're right to push on this. Let me trace the full data flow from strategy → inventory → autonomous decision → frontend update, step by step. No hand-waving.

**How inventory gets created:**

It's automatic. When the strategy is locked after simulation, `initialize_shop()` creates inventory from the menu. We already built this — here's what actually happens:

```python
# From agents/shop.py — this already exists in your codebase
def initialize_shop(strategy: Strategy, starting_cash: float = 500.0) -> ShopState:
    inventory = []
    for item in strategy.menu:
        inventory.append(InventoryItem(
            menu_item_name=item.name,
            quantity_remaining=30,      # start with 30 of each
            restock_threshold=5,        # flag as "low" at 5
            max_capacity=50,
            unit_cost=item.cost_to_make, # from the strategy
        ))
    return ShopState(strategy=strategy, inventory=inventory, cash_on_hand=starting_cash)
```

The Strategist said "Street Taco costs $1.50 to make" — that becomes the restock cost. Every item starts at 30 units. The thresholds are defaults. No separate inventory-creation step needed.

**How an autonomous decision happens:**

This is the part that sounds magical but is actually just an if-then chain with an LLM call at the decision point. Let me trace one exact scenario end to end:The important thing to notice: the autonomous decision is _not_ a separate system. It's a function that runs automatically after every order. The code already exists in `agents/shop.py` — `check_autonomous_triggers()` gets called at the end of `handle_customer()`. The trigger detection is pure Python (if/then checks on inventory levels and order frequency). Only the _decision_ about what to do requires an LLM call, and that's a single fast call with a small prompt.

**Now here's how the frontend actually receives and displays all this.** The Phase 4 API is simple — it's just REST, not SSE. One endpoint handles everything:

```
POST /api/order
Body: { "message": "I'll take 2 street tacos", "customer_name": "Judge" }

Response: {
  "cashier_message": "Two street tacos coming right up! That'll be $9.00.",
  "order": { "id": "ORD-A3F2", "items": ["Street Taco", "Street Taco"], "total": 9.00 },
  "autonomous_actions": [
    {
      "action_type": "restock",
      "description": "Restocked tacos: 5 → 25 units ($30 spent)",
      "autonomous": true
    }
  ],
  "shop_state": {
    "inventory": [
      {"menu_item_name": "Street Taco", "quantity_remaining": 25, "is_low": false},
      {"menu_item_name": "Burrito Bowl", "quantity_remaining": 28, "is_low": false},
      ...
    ],
    "current_prices": {"Street Taco": 4.50, ...},
    "removed_items": [],
    "total_revenue": 142.50,
    "total_orders": 18,
    "cash_on_hand": 440.00
  }
}
```

Every order response includes the _full updated shop state_. The React frontend doesn't track state independently — it just renders whatever the backend tells it. This means every panel on the dashboard updates from a single response: inventory bars, price labels, revenue counter, action feed. No separate polling, no state sync bugs.

Here's what the React component structure looks like:

```jsx
function ShopDashboard() {
  const [chatMessages, setChatMessages] = useState([]);
  const [shopState, setShopState] = useState(null);
  const [actionFeed, setActionFeed] = useState([]);

  async function sendOrder(message) {
    const res = await fetch("/api/order", {
      method: "POST",
      body: JSON.stringify({ message, customer_name: "Customer" }),
    });
    const data = await res.json();

    // Update chat
    setChatMessages((prev) => [
      ...prev,
      { role: "customer", text: message },
      { role: "cashier", text: data.cashier_message },
    ]);

    // Update dashboard — one setState, everything re-renders
    setShopState(data.shop_state);

    // Append autonomous actions to feed
    for (const action of data.autonomous_actions) {
      setActionFeed((prev) => [...prev, action]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* LEFT: Chat */}
      <ChatPanel messages={chatMessages} onSend={sendOrder} />

      {/* RIGHT: Dashboard */}
      <div>
        <InventoryBars inventory={shopState?.inventory} />
        <PriceTable
          prices={shopState?.current_prices}
          menu={shopState?.active_menu}
        />
        <RevenueCounter
          revenue={shopState?.total_revenue}
          orders={shopState?.total_orders}
        />
        <ActionFeed actions={actionFeed} />
      </div>
    </div>
  );
}
```

Each sub-component is simple. `InventoryBars` is just a list of colored progress bars. `ActionFeed` is a scrolling list with a robot icon for autonomous decisions. `PriceTable` shows the menu with any dynamic price overrides highlighted. None of these are complicated individually — they're just divs rendering JSON.

**The "simulate rush" button** sends 15-20 orders in rapid sequence with 1-2 second delays between them, using the personas who said they'd visit:

```jsx
async function simulateRush(personas, shopState) {
  const visitors = personas
    .filter((p) => p.visit_likelihood !== "unlikely" && p.likely_order)
    .slice(0, 20);

  for (const persona of visitors) {
    await sendOrder(`Hi, I'll have the ${persona.likely_order} please`);
    await sleep(1500); // Pause so judges can watch
  }
}
```

**To summarize the technical complexity honestly:** Phase 4 is one REST endpoint that calls `handle_customer()` (which internally calls the LLM for the cashier response, then runs trigger checks, then optionally calls the LLM once more for an autonomous decision). The frontend is one fetch call per order, and every UI panel reads from the same response object. The most complex frontend component is the chat window, and that's just a message list with an input box.

The backend code for all of this already exists in `agents/shop.py`. You need to wrap it in a FastAPI route and build the React components. That's an afternoon of work for one person.

Want me to build out the FastAPI server that ties the pipeline and shop together, or the React dashboard?

# Repo Architecture

A few things to call out about why it's structured this way.

```bash
#!/bin/bash

# --- Backend Structure ---
mkdir -p backend/agents
touch backend/agents/__init__.py
touch backend/agents/strategist.py
touch backend/agents/crowd.py
touch backend/agents/simulator.py
touch backend/agents/shop.py

mkdir -p backend/models
touch backend/models/__init__.py
touch backend/models/schema.py

mkdir -p backend/utils
touch backend/utils/__init__.py
touch backend/utils/llm_client.py
touch backend/utils/census.py

mkdir -p backend/engine
touch backend/engine/__init__.py
touch backend/engine/pipeline.py

touch backend/server.py
touch backend/requirements.txt

# --- Frontend Structure ---
mkdir -p frontend/src/components/pipeline
touch frontend/src/components/pipeline/ConceptInput.jsx
touch frontend/src/components/pipeline/StrategyCard.jsx
touch frontend/src/components/pipeline/ReactionBoard.jsx
touch frontend/src/components/pipeline/PersonaCard.jsx
touch frontend/src/components/pipeline/SimulationStats.jsx

mkdir -p frontend/src/components/shop
touch frontend/src/components/shop/ChatPanel.jsx
touch frontend/src/components/shop/InventoryBars.jsx
touch frontend/src/components/shop/PriceTable.jsx
touch frontend/src/components/shop/RevenueCounter.jsx
touch frontend/src/components/shop/ActionFeed.jsx

mkdir -p frontend/src/components/shared
touch frontend/src/components/shared/PhaseIndicator.jsx
touch frontend/src/components/shared/LoadingState.jsx

mkdir -p frontend/src/hooks
touch frontend/src/hooks/useSSE.js
touch frontend/src/hooks/useShop.js

mkdir -p frontend/src/pages
touch frontend/src/pages/PipelinePage.jsx
touch frontend/src/pages/ShopPage.jsx

touch frontend/src/App.jsx
touch frontend/src/main.jsx
touch frontend/index.html
touch frontend/tailwind.config.js
touch frontend/vite.config.js
touch frontend/package.json

# --- Root Files ---
touch .env.example
touch .gitignore
touch README.md
touch Makefile

echo "✅ Repository structure created successfully."
```

**Backend and frontend are siblings, not nested.** This matters for deployment and for your team splitting work. The backend person never touches `frontend/`, the frontend person never touches `backend/`. They agree on the API contract (the SSE events and the `/api/order` response shape) and work in parallel.

**The `models/schema.py` file is the single source of truth.** Every `.to_dict()` method in that file defines the exact JSON shape the frontend will receive. If your frontend person wants to know what a reaction looks like, they read `PersonaReaction.to_dict()`. No separate API docs needed during a hackathon.

**Two pages, not one.** `PipelinePage` handles phases 1-3 (the SSE flow where the reaction board lives). `ShopPage` handles phase 4 (the REST-based ordering dashboard). A simple router switches between them when the pipeline completes. Don't try to make this one giant page — the state models are different and it'll get messy fast.

**The `hooks/` directory is where the API logic lives.** `useSSE.js` wraps EventSource and exposes pipeline state to components. `useShop.js` wraps the `POST /api/order` call and returns the shop state. Components never call `fetch` directly — they use hooks. This keeps the components pure rendering logic.

For the Makefile, something like this gets everyone running quickly:

```makefile
dev-backend:
	cd backend && uvicorn server:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	make -j2 dev-backend dev-frontend
```

One last thing — put the code I already built into `backend/`. The files map directly: `agents/`, `models/`, `utils/`, `engine/` all drop in as-is. You just need to add `server.py` as the FastAPI wrapper.

Want me to build `server.py` next?
