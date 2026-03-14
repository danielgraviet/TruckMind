---
id: TASK-7.1
title: Tune inventory levels and autonomous triggers
status: To Do
assignee: []
created_date: '2026-03-14 17:35'
labels:
  - backend
  - agent
dependencies: []
parent_task_id: TASK-7
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stagger starting inventory: entrees=15, drinks=25, sides/desserts=12. Lower restock_threshold to 4.
Tune surge pricing: trigger at 5+ orders (from 8+), cap at 20% increase.
Add discount trigger for unpopular items (not ordered in last 10).
Sweet spot: 3-4 decisions in 20 orders.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory quantities staggered by category
- [ ] #2 Surge pricing triggers at 5+ and caps at 20%
- [ ] #3 Discount trigger added for unpopular items
- [ ] #4 3-4 autonomous actions in a 20-order rush
<!-- AC:END -->
