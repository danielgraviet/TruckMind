---
id: TASK-2.2
title: Implement shop REST endpoints
status: To Do
assignee: []
created_date: '2026-03-14 17:33'
labels:
  - backend
  - agent-architect
dependencies: []
parent_task_id: TASK-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build shop interaction endpoints:
- POST /api/order — accepts {message, customer_name?}, calls handle_customer(), returns {cashier_message, order, autonomous_actions, shop_state}
- GET /api/shop/state — returns current shop state
- POST /api/shop/simulate-rush — sends 15-20 persona orders with delays
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/order processes customer messages and returns full response
- [ ] #2 GET /api/shop/state returns current shop state
- [ ] #3 POST /api/shop/simulate-rush sends 15-20 orders with delays
<!-- AC:END -->
