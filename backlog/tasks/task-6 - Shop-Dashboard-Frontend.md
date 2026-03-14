---
id: TASK-6
title: Shop Dashboard (Frontend)
status: To Do
assignee: []
created_date: '2026-03-14 17:30'
updated_date: '2026-03-14 17:32'
labels:
  - frontend
  - p0-blocker
  - frontend-lead
dependencies:
  - TASK-2
  - TASK-5
references:
  - tasks/TICKET-5-shop-dashboard.md
priority: high
milestone: podium-hackathon-2026
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the Phase 4 shop page — a two-panel layout with a customer chat on the left and an operator dashboard on the right. This is where judges see the AI actually running a business.

## Context for Agent

**Key files:**
- `frontend/src/pages/ShopPage.jsx` — Main page component (empty stub)
- `frontend/src/components/ChatPanel.jsx` — Customer chat UI (empty stub)
- `frontend/src/components/InventoryBars.jsx` — Stock level bars (empty stub)
- `frontend/src/components/PriceTable.jsx` — Dynamic pricing display (empty stub)
- `frontend/src/components/RevenueCounter.jsx` — Financial metrics (empty stub)
- `frontend/src/components/ActionFeed.jsx` — Autonomous decision log (empty stub)
- `frontend/src/hooks/useShop.js` — Shop state management hook (empty stub)
- `backend/models/schema.py` — ShopState, ShopAction data contracts

**Layout:** Two-panel — chat panel (left) + operator dashboard (right: revenue, inventory bars, price table, action feed)

**Components:** ChatPanel, InventoryBars, PriceTable, RevenueCounter, ActionFeed, SimulateRushButton

**API:** POST /api/order returns {cashier_message, order, autonomous_actions, shop_state}

**ActionFeed is critical** — this proves autonomy to judges. Make it visually prominent with robot icons and colored action type badges.

**Source ticket:** tasks/TICKET-5-shop-dashboard.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Chat sends messages and receives cashier responses
- [ ] #2 Inventory bars update after each order with color-coded stock levels
- [ ] #3 Price table shows dynamic adjustments with visual indicators (arrows, strikethrough)
- [ ] #4 Revenue counter ticks up with each order (total orders, revenue, cash on hand)
- [ ] #5 Action feed shows autonomous decisions with robot icon and colored badges
- [ ] #6 Simulate Rush button sends 15-20 orders with delays and dashboard updates live
- [ ] #7 Sold-out items show as grayed out in dashboard
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Two-panel layout renders correctly
- [ ] #3 Changes committed
<!-- DOD:END -->
