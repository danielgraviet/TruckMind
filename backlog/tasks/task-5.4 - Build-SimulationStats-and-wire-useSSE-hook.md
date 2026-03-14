---
id: TASK-5.4
title: Build SimulationStats and wire useSSE hook
status: To Do
assignee: []
created_date: '2026-03-14 17:34'
labels:
  - frontend
dependencies: []
parent_task_id: TASK-5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SimulationStats: live-updating interest rate, projected revenue, daily customers, average sentiment, top concerns/strengths.
Numbers tick up smoothly as reactions arrive.
useSSE hook: connects EventSource to /api/stream/{id}, parses all event types, manages pipeline state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Stats update live as reactions stream in
- [ ] #2 Numbers animate smoothly (count-up effect)
- [ ] #3 useSSE hook handles all SSE event types
- [ ] #4 Works with both mock data and real SSE
<!-- AC:END -->
