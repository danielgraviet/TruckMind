---
id: doc-3
title: Dependency Map & Critical Path
type: reference
created_date: '2026-03-14 17:35'
---

# Dependency Map & Critical Path

## Dependency Graph

```
TASK-1 (Project Setup)
  |---> TASK-3 (E2E Pipeline Verify) ---> TASK-2 (FastAPI Server)
  |---> TASK-4 (Census API) [independent]
  |---> TASK-5 (Pipeline Page UI) ---> TASK-6 (Shop Dashboard UI)
  +---> TASK-7 (Shop Agent Tuning) [independent]

TASK-2 + TASK-5 + TASK-6 + TASK-7 ---> TASK-8 (Demo Polish)
```

## Critical Path

The longest chain that determines finish time:

**TASK-1 -> TASK-3 -> TASK-2 -> TASK-6 -> TASK-8**

This is ~10 hours of serial work. Everything else runs in parallel.

## Execution Sequences (from `backlog sequence list`)

1. **Sequence 1:** TASK-1 (no dependencies)
2. **Sequence 2:** TASK-3, TASK-4, TASK-5, TASK-7 (all depend on TASK-1, run in parallel)
3. **Sequence 3:** TASK-2 (depends on TASK-3)
4. **Sequence 4:** TASK-6 (depends on TASK-2 + TASK-5)
5. **Sequence 5:** TASK-8 (depends on TASK-2 + TASK-5 + TASK-6 + TASK-7)

## If Running Behind

Cut in this order (least damage first):
1. Cut TASK-4 (Census live API) — cached data works fine
2. Cut strategy refinement — 1 round instead of 2
3. Cut "simulate rush" button — judges type orders manually
4. Cut Tier 2 expansion — run with 50 LLM-simulated personas
5. **Never cut:** reaction board, shop chat, or autonomous decisions (scoring pillars)
