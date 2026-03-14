# TruckMind — Hackathon Task Board

## Team roles

| Role | Tickets | Focus |
|------|---------|-------|
| **Agent Architect** | TICKET-1, TICKET-2 | FastAPI server, pipeline verification, prompt tuning |
| **Persona Engineer** | TICKET-3 | Census API integration, persona quality |
| **Frontend / Demo Lead** | TICKET-4, TICKET-5 | Both UI pages, reaction board, shop dashboard |
| **Operations Engine** | TICKET-6 | Shop agent tuning, autonomous decisions, cashier personality |
| **Everyone** | TICKET-0, TICKET-7 | Setup (first) and polish (last) |

## Execution order

```
HOUR 0          Everyone together
─────────────────────────────────────
TICKET-0        Project setup (30 min)
                ↓
                ↓ everyone pulls, splits up
                ↓
HOURS 1-3       Parallel work begins
─────────────────────────────────────

  Agent Architect        Persona Engineer       Frontend Lead         Operations Engine
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │  TICKET-2    │      │  TICKET-3    │      │  TICKET-4    │      │  TICKET-6    │
  │  E2E verify  │      │  Census API  │      │  Pipeline    │      │  Shop agent  │
  │  + prompt    │      │  integration │      │  page + board│      │  tuning      │
  │  tuning      │      │              │      │  (mock data) │      │              │
  │  (2 hrs)     │      │  (1.5 hrs)   │      │  (3-4 hrs)   │      │  (2-3 hrs)   │
  └──────┬───────┘      └──────────────┘      └──────┬───────┘      └──────────────┘
         │                                           │
         ▼                                           │
  ┌──────────────┐                                   │
  │  TICKET-1    │                                   │
  │  FastAPI     │◄──────────────────────────────────┘
  │  server      │    Frontend wires SSE once
  │  (2-3 hrs)   │    server is ready
  └──────┬───────┘
         │
         ▼
  Frontend wires          Frontend continues
  real SSE ──────────────► TICKET-5
                           Shop dashboard
                           (2-3 hrs)

FINAL HOURS     Everyone together
─────────────────────────────────────
TICKET-7        Demo polish + rehearsal (2 hrs)
```

## Dependency map

```
TICKET-0 (setup)
  ├──→ TICKET-2 (e2e verify)  ──→ TICKET-1 (server)
  ├──→ TICKET-3 (census)
  ├──→ TICKET-4 (pipeline UI) ──→ TICKET-5 (shop UI)
  └──→ TICKET-6 (shop tuning)

TICKET-1 + TICKET-4 + TICKET-5 + TICKET-6 ──→ TICKET-7 (polish)
```

## Critical path

The longest chain that determines your finish time:

**TICKET-0 → TICKET-2 → TICKET-1 → TICKET-5 → TICKET-7**

This is ~10 hours of serial work. Everything else runs in parallel.

## If you're running behind

Cut in this order (least damage first):

1. **Cut TICKET-3** (Census live API) — cached data works fine
2. **Cut strategy refinement** — run 1 simulation round instead of 2
3. **Cut the "simulate rush" button** — judges can type orders manually
4. **Cut Tier 2 expansion** — run with 50 LLM-simulated personas instead of 200
5. **Never cut:** the reaction board, the shop chat, or autonomous decisions — those are your scoring pillars

## Communication protocol

- When you finish a ticket, post in the team chat: "TICKET-X done, pushed to main"
- When you're blocked, post immediately: "BLOCKED on TICKET-X, need Y"
- Every 2 hours, 5-minute standup: what's done, what's next, any blockers
