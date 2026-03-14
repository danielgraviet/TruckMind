# Shop Operations Center — Design Document

**Date:** 2026-03-14
**Status:** Approved
**Audience:** Demo/showcase — the UI prioritizes making AI decision-making visible and impressive

---

## Overview

Redesign the ShopPage into a full operations center with split-screen layout, configurable rules, multi-channel customer handling, auto-generated customer trickle, and visible AI reasoning chains including failure/recovery paths.

## Layout: Split-Screen with Sidebar Nav

Three-zone layout that fills the viewport (no vertical page growth):

```
┌──────┬─────────────────────────────────────┬──────────────┐
│ SIDE │          MAIN CONTENT               │  LIVE FEED   │
│ BAR  │    (scrollable card grid)           │  (always     │
│      │                                     │   visible)   │
│ ⚡ Ops│  ┌─────────┐ ┌─────────┐          │              │
│ 💬 CS │  │ Card    │ │ Card    │          │  12:01 Surge │
│ 📦 Inv│  │         │ │         │          │  12:00 Order │
│ 💰 $  │  └─────────┘ └─────────┘          │  11:59 Restk │
│ ⚙ Rule│  ┌─────────┐ ┌─────────┐          │  11:58 Order │
│      │  │ Card    │ │ Card    │          │              │
│      │  └─────────┘ └─────────┘          │              │
├──────┴─────────────────────────────────────┴──────────────┤
│  HEADER: Business Name | LIVE | Demo | Metrics | Rush     │
└───────────────────────────────────────────────────────────┘
```

- **Left sidebar** (~64px): Icon navigation for sections. Active section highlighted.
- **Main content** (flex): Section-specific scrollable card grid.
- **Right sidebar** (~280px): Always-visible live activity feed — all AI actions, orders, and events stream in real time with expandable detail on click.
- **Header** (top, fixed): Business name, LIVE/Demo badges, animated metrics ticker (revenue, orders, cash on hand), Rush button, scenario triggers.

## Sidebar Sections

### 1. Operations (default view)

Card grid containing:

- **Order Queue** — Live list of current/recent orders with status progression (pending → preparing → ready → completed). Shows customer name, items, total, timestamp, channel badge.

- **AI Decision Engine** — The showcase card. Each decision shows:
  - Summary line (e.g., "SURGE: Birria Tacos $8.50 → $9.78")
  - Expandable detail revealing full reasoning chain:
    - Context gathered (what data the AI looked at)
    - Options considered (alternatives weighed)
    - Decision and rationale (what it chose and why)
    - Outcome (what happened after)
  - Color-coded by type: pricing = blue, inventory = amber, escalation = red
  - Confidence level indicator

- **Financial Summary** — Revenue, cash on hand, avg order value, margin %. Animated counters.

- **Monitoring Panels** (visual/simulated, not full backend logic):
  - Scheduling: Operating hours, peak times, current hour status
  - Staffing: Crew capacity vs demand curve visualization
  - Routing/Prioritization: Order priority queue with reasoning

### 2. Customer Service

Three independent scrollable channels displayed side by side:

- **Walk-up Orders** — Standard POS-style chat. Customer orders, cashier AI responds. Quick, friendly tone.
- **Text Orders** — SMS-style interface. Async ordering with delivery ETA. Different system prompt.
- **Escalations** — Angry/difficult customers. Shows AI escalation reasoning: what it tried, when it decided to escalate, what policy triggered it, confidence level.

### 3. Inventory

- Per-item inventory bars with enhanced detail (existing InventoryBars, upgraded)
- Restock history timeline showing when and why restocks happened
- AI restock decision log with expandable reasoning

### 4. Pricing

- Current prices vs base prices table with margin display
- Price change history timeline (visual sparkline per item)
- Active pricing rules (surge thresholds, discount floors from rules config)
- AI pricing decision log with expandable reasoning

### 5. Rules (Owner Configuration)

Form cards for all operational rules (replacing hardcoded Python constants):

| Rule | Type | Default | Description |
|------|------|---------|-------------|
| max_markup_pct | slider 0-100% | 25% | Max price above base |
| min_margin_multiplier | numeric | 1.10 | Price floor as multiple of COGS |
| max_restock_spend_pct | slider 0-100% | 50% | Max % of cash per restock |
| min_cash_reserve | dollar input | $50 | Minimum cash on hand |
| cooldown_orders | numeric | 8 | Orders between same trigger |
| periodic_review_interval | numeric | 5 | Orders between strategic reviews |
| min_orders_for_trends | numeric | 8 | Min orders before trend decisions |
| max_actions_per_cycle | numeric | 2 | Max autonomous actions per review |

Plus per-category inventory defaults (qty, threshold, max) for: entree, side, drink, dessert.

All rules saved to ShopState and used at runtime. Changes take effect immediately.

## Auto-Trickle Customer Generation

### Demo mode

Timer generates synthetic customers at intervals based on simulated time-of-day:
- Slow hours: 1 customer every 15-20 seconds
- Normal hours: 1 every 8-12 seconds
- Peak hours: 1 every 3-5 seconds

Each customer gets:
- Random name
- Channel assignment: 70% walk-up, 20% text, 10% escalation-worthy
- Order preferences driven by actual menu items and tags
- Occasional scenarios: wrong order complaint, price complaint, dietary question, "where's my food" follow-up

### Live mode (non-demo)

LLM generates customer arrival patterns based on:
- Actual menu and pricing
- Time of day and operating hours from strategy
- Location context (e.g., college campus = lunch rush)

### Rush simulation

- Rush button multiplies trickle rate ~4x for 60 seconds
- AI Decision Engine card lights up with rapid-fire decisions
- Inventory depletes, surge pricing triggers, items get 86'd
- Visual indicators: pulsing header, "RUSH MODE" badge, countdown timer

## Failure/Recovery Path

One guaranteed failure scenario per rush:

1. Customer orders an item that just sold out mid-rush
2. AI gathers context: checks inventory, sees 0 remaining
3. AI attempts recovery: suggests alternative item, offers discount on substitute
4. Customer "rejects" alternative (simulated)
5. AI recognizes low confidence / policy restriction (e.g., "Cannot offer >25% discount per MAX_MARKUP_PCT")
6. AI escalates to Escalations channel
7. Escalation card shows full chain: what failed → what AI tried → confidence level → policy restriction → escalation

This demonstrates: **context gathering → decision → tool use → failure → retry → escalation**.

## Backend Changes

### 1. ShopRules dataclass (schema.py)

New dataclass replacing all module-level constants in shop.py:

```python
@dataclass
class ShopRules:
    max_markup_pct: float = 0.25
    min_margin_multiplier: float = 1.10
    max_restock_spend_pct: float = 0.50
    min_cash_reserve: float = 50.0
    max_actions_per_cycle: int = 2
    cooldown_orders: int = 8
    periodic_review_interval: int = 5
    min_orders_for_trends: int = 8
    category_inventory: dict = field(default_factory=lambda: {
        "entree": {"qty": 10, "threshold": 4, "max": 50},
        "side":   {"qty": 8,  "threshold": 3, "max": 30},
        "drink":  {"qty": 15, "threshold": 4, "max": 50},
        "dessert":{"qty": 6,  "threshold": 3, "max": 25},
    })
```

ShopState gains `rules: ShopRules` field. All shop.py functions read from `shop_state.rules.*`.

### 2. Enhanced ShopAction (schema.py)

Extended with reasoning fields:

```python
@dataclass
class ShopAction:
    action_type: ShopActionType
    description: str
    details: dict = field(default_factory=dict)
    autonomous: bool = True
    context_gathered: list[str] = field(default_factory=list)
    options_considered: list[dict] = field(default_factory=list)
    reasoning: str = ""
    confidence: float = 1.0
    escalated: bool = False
    channel: str = "operations"  # operations, walk_up, text_order, escalation
```

### 3. Customer Generation Engine (new module)

`backend/engine/customer_gen.py`:
- `generate_customer(strategy, shop_state, channel) → SyntheticCustomer`
- LLM-based in live mode, template-based in demo mode
- Channels: walk_up, text_order, escalation
- Each customer: name, channel, order items, mood, optional complaint scenario

### 4. Channel-Separated Customer Handling

`handle_customer()` in shop.py gains a `channel` parameter. Each channel uses different system prompts:
- Walk-up: friendly, quick
- Text: async-aware, includes ETA
- Escalation: empathetic, policy-aware, can offer compensation within rules

### 5. New API Endpoints

- `GET /api/shop/rules` — current rules config
- `PUT /api/shop/rules` — update rules (immediate effect)
- `GET /api/shop/stream` — SSE stream of all events
- `POST /api/shop/trigger-scenario` — trigger specific scenarios (rush, angry customer, stock-out)

### 6. shop.py Refactor

- Remove all 8 module-level constants
- All functions read rules from `shop_state.rules`
- `_make_autonomous_decision()` populates new reasoning fields on ShopAction
- Add failure/recovery logic: when a decision fails constraints, create an escalation action with the full reasoning chain

## Frontend Component Plan

### New Components
- `OpsSidebar` — Icon nav, section switching
- `LiveFeed` — Right sidebar, always-visible event stream with expandable items
- `OpsHeader` — Business name, badges, metrics ticker, rush/scenario buttons
- `OrderQueue` — Order list with status progression
- `AIDecisionCard` — Expandable reasoning card
- `MonitoringPanel` — Generic card for scheduling/staffing/routing (simulated)
- `CustomerChannel` — Reusable chat component with channel-specific styling
- `EscalationCard` — Shows full failure/recovery chain
- `RulesForm` — Form cards for all configurable rules
- `PricingTimeline` — Price change history visualization
- `InventoryTimeline` — Restock history visualization

### Modified Components
- `ShopPage` — Complete rewrite to three-zone layout
- `useShop` — Extended with rules state, multi-channel messages, customer trickle timer
- `shopApi` — New endpoints, SSE stream support
- `ActionFeed` → replaced by `LiveFeed` (similar but always-visible in right sidebar)
- `InventoryBars` — Enhanced with timeline
- `ChatPanel` → replaced by `CustomerChannel` (three instances)

## AI Capability Visibility

The design makes visible:

| Capability | Where shown | Implementation |
|-----------|-------------|----------------|
| Gather context | AI Decision Card (expandable) | Real — populated from LLM prompts |
| Decide what to do | AI Decision Card | Real — LLM decisions |
| Use tools | Action outcomes in Live Feed | Real — restock, price change, etc. |
| Retry/recover | Failure path in Escalations | Real — built into decision flow |
| Escalate | Escalation channel | Real — policy-triggered |
| Scheduling | Monitoring Panel | Visual/simulated |
| Pricing | Pricing section + decisions | Real — full backend logic |
| Prioritization | Order Queue + Monitoring | Partial — queue ordering real, panel simulated |
| Routing | Monitoring Panel | Visual/simulated |
| Staffing | Monitoring Panel | Visual/simulated |
| Inventory | Inventory section + decisions | Real — full backend logic |
| Urgency | Rush mode + Live Feed velocity | Real — trickle rate + decision frequency |
| Follow-up timing | Customer channels | Partial — text order ETAs real, timing panel simulated |
