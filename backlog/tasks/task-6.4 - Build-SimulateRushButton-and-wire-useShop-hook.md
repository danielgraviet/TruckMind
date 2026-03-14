---
id: TASK-6.4
title: Build SimulateRushButton and wire useShop hook
status: To Do
assignee: []
created_date: '2026-03-14 17:34'
labels:
  - frontend
dependencies: []
parent_task_id: TASK-6
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SimulateRushButton: sends 15-20 orders with 1.5s delays, shows progress (Order 7/20...), disabled during rush.

useShop hook: manages shop state, chat messages, action feed. Calls POST /api/order, updates all state from response.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Simulate Rush sends sequential orders with progress indicator
- [ ] #2 Button disabled during rush to prevent double-click
- [ ] #3 useShop hook manages full shop state lifecycle
<!-- AC:END -->
