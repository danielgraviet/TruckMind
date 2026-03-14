# 🚚 TruckMind — An AI That Doesn't Just Advise. It Operates.

> **"AI Runs the Shop"** — Podium Hackathon 2026

TruckMind is a fully autonomous AI agent that launches and operates a pop-up food truck business from zero. Give it a concept — it researches the market, builds a menu, sets prices, serves customers, and adapts in real time. No human in the loop. The AI *is* the operator.

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
- The food truck **opens for business** via a customer-facing chat interface
- The AI handles orders conversationally — upsells, answers questions, manages substitutions
- **Dynamic pricing** adjusts in real time based on demand signals and inventory levels
- **Inventory management** tracks stock, flags low items, and makes autonomous restocking decisions
- A **live reaction board** shows synthetic customer sentiment shifting as the AI makes operational changes

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

| Time | What the judges see |
|------|---------------------|
| 0:00 | User types a one-line food truck concept: *"Gourmet grilled cheese in Provo, UT"* |
| 0:30 | Census data pulls in. Demographic profile of Provo appears on screen. |
| 1:00 | Persona engine generates ~300 synthetic customers. Live reaction board populates — faces, names, preferences scrolling in. |
| 1:30 | Strategy engine proposes 3 competing menu/pricing strategies. Simulation runs visibly — persona reactions animate on screen. |
| 2:30 | Winning strategy selected. Food truck "opens." Menu and prices displayed. |
| 3:00 | Judge interacts with the ordering chat. AI takes their order, upsells a side, processes it. |
| 3:30 | Demand surge simulated — dynamic pricing kicks in, inventory alerts fire, AI makes restocking decision autonomously. |
| 4:00 | Dashboard shows: revenue, customer satisfaction score, inventory status, pricing changes over time. |
| 4:30 | Wrap: "TruckMind made 47 autonomous decisions in the last 4 minutes with zero human input." |

---

## Scoring Alignment

| Criteria | Weight | How TruckMind scores |
|----------|--------|----------------------|
| **Autonomy** | 40% | The AI makes every decision: menu, pricing, inventory, customer service, restocking. Zero human-in-the-loop after initial concept input. Multi-agent architecture with distinct autonomous roles. |
| **Value** | 30% | Solves a real problem for early-stage founders: instant, data-grounded market validation + autonomous operations. Utah's startup scene is the perfect context. |
| **Technical Complexity** | 20% | Multi-agent orchestration, Silicon Sampling with demographic grounding, real-time simulation engine, dynamic pricing algorithm, conversational order management. |
| **Demo + Presentation** | 10% | Live reaction board is visually compelling. Judge interaction with the ordering chat makes it tangible. Clear narrative arc from "idea" to "operating business" in under 5 minutes. |

---

## Tech Stack (Suggested)

| Component | Tech |
|-----------|------|
| Agent orchestration | Claude API (tool use / multi-turn) |
| Persona generation | Claude + programmatic expansion scripts |
| Demographic data | U.S. Census Bureau API |
| Frontend / dashboard | React + Tailwind (or Next.js) |
| Live reaction board | WebSocket or polling + animated UI |
| Customer chat | Claude API with system prompt as the "truck operator" |
| Dynamic pricing | Custom logic layer fed by demand signals |
| State management | In-memory or lightweight DB (SQLite / Supabase) |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Persona generation is slow at scale | Pre-generate persona templates, expand programmatically with demographic variation. Batch Claude calls. |
| Census API is clunky | Cache common geographies. Have fallback demographic profiles for demo locations (Provo, SLC). |
| "Simulation" feels like a black box | Make it visual. The live reaction board IS the simulation — judges see personas reacting in real time. |
| Demo runs long | Rehearse ruthlessly. Pre-seed the census data for the demo location. The 5-minute flow above should be tight. |
| Judges think it's "just a chatbot" | Emphasize the decision chain: the AI didn't just chat — it researched, strategized, tested, launched, priced, restocked, and adapted. Count the decisions on screen. |

---

## Team Task Breakdown (Suggested)

| Role | Focus |
|------|-------|
| **Agent Architect** | Multi-agent orchestration, strategy engine, simulation loop |
| **Persona Engineer** | Census API integration, Silicon Sampling pipeline, persona data model |
| **Frontend / Demo** | Dashboard, live reaction board, ordering chat UI, presentation polish |
| **Operations Logic** | Dynamic pricing algorithm, inventory system, order processing, P&L tracking |

---

## What Makes This Different

Most hackathon projects build a chatbot that answers questions about a business. TruckMind **is** the business. It doesn't advise a human founder — it replaces the need for one in the early operational phase.

The Silicon Sampling layer isn't a gimmick. It's a genuine competitive advantage: instead of guessing what customers want, the AI builds a statistically grounded synthetic market and tests against it before making a single real decision. That's how the best companies operate — TruckMind just does it in seconds.

---

*Built at Podium Hackathon 2026 · Provo, UT*

## Development

### Backend with `uv`

The Python project lives in `backend/`, not at repo root.
Use `uv` against that project explicitly:

```bash
uv sync --project backend
cd backend && uv run uvicorn server:app --reload --port 8000
```

Run the CLI pipeline the same way:

```bash
cd backend && uv run python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock
cd backend && uv run python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock --interactive
```

Or use the Make targets from repo root:

```bash
make sync-backend
make dev-backend
```
