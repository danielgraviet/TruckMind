---
id: doc-2
title: Team Roles & Responsibilities
type: reference
created_date: '2026-03-14 17:35'
---

# Team Roles & Responsibilities

| Role | Label | Tasks | Focus |
|------|-------|-------|-------|
| **Agent Architect** | `agent-architect` | TASK-2, TASK-3 | FastAPI server, pipeline verification, prompt tuning |
| **Persona Engineer** | `persona-engineer` | TASK-4 | Census API integration, persona quality |
| **Frontend / Demo Lead** | `frontend-lead` | TASK-5, TASK-6 | Both UI pages, reaction board, shop dashboard |
| **Operations Engine** | `operations-engine` | TASK-7 | Shop agent tuning, autonomous decisions, cashier personality |
| **Everyone** | `everyone` | TASK-1, TASK-8 | Setup (first) and polish (last) |

## Execution Order

1. **Hour 0** — Everyone together on TASK-1 (Project Setup, 30 min)
2. **Hours 1-3** — Parallel work: Agent Architect (TASK-3), Persona Engineer (TASK-4), Frontend Lead (TASK-5), Operations Engine (TASK-7)
3. **Hours 3-5** — Agent Architect moves to TASK-2 (server), Frontend Lead continues TASK-5
4. **Hours 5-7** — Frontend Lead wires SSE and builds TASK-6 (shop dashboard)
5. **Final hours** — Everyone on TASK-8 (demo polish)

## Communication Protocol

- Finish a ticket: post "TASK-X done, pushed to main"
- Blocked: post immediately "BLOCKED on TASK-X, need Y"
- Every 2 hours: 5-minute standup
