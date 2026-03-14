---
id: TASK-7
title: Shop Agent Tuning
status: To Do
assignee: []
created_date: '2026-03-14 17:30'
labels:
  - backend
  - agent
  - p1-important
  - operations-engine
dependencies: []
references:
  - tasks/TICKET-6-shop-tuning.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The shop agent already works mechanically — it processes orders, decrements inventory, and triggers autonomous decisions. But the decisions need to feel smart during the demo. This ticket is about tuning triggers, improving LLM prompts for autonomous decisions, and making impressive things happen during a 20-order simulated lunch rush.

## Context for Agent

**Key files:**
- `backend/agents/shop.py` — Shop agent with CASHIER_SYSTEM_PROMPT, AUTONOMOUS_SYSTEM_PROMPT, handle_customer(), check_autonomous_triggers()
- `backend/models/schema.py` — ShopState, ShopAction, InventoryItem, Order dataclasses
- `backend/engine/pipeline.py` — Pipeline orchestrator (shop initialization)

**Current triggers (too basic):**
- Low stock -> ask LLM what to do
- Out of stock -> remove from menu
- High demand -> ask LLM about surge pricing

**Tuning targets:**
- Stagger starting inventory quantities by category (entrees=15, drinks=25, sides=12)
- Lower restock_threshold to 4 for earlier triggers
- Improve autonomous decision prompts to include reasoning with specific numbers
- Add combo/upsell creation trigger (when items frequently co-ordered)
- Tune surge pricing trigger to 5+ orders (from 8+), cap at 20% increase
- Add discount trigger for unpopular items
- Improve cashier personality for edge cases

**Sweet spot:** 3-4 autonomous decisions in 20 orders. More feels scripted.

**Source ticket:** tasks/TICKET-6-shop-tuning.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A 20-order rush produces at least 3 visually distinct autonomous actions
- [ ] #2 Each autonomous action has a 1-2 sentence explanation with specific numbers
- [ ] #3 Cashier handles edge cases gracefully (vegetarian, cheapest, what is good, order changes)
- [ ] #4 Inventory levels staggered by category for demo-appropriate event pacing
- [ ] #5 Surge pricing triggers at 5+ orders of same item, capped at 20% increase
- [ ] #6 No crashes or state corruption during rapid ordering
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Tested with 25+ sequential orders via REPL
- [ ] #3 Prompt changes committed
<!-- DOD:END -->
