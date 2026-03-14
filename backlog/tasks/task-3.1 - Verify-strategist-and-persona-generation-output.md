---
id: TASK-3.1
title: Verify strategist and persona generation output
status: To Do
assignee: []
created_date: '2026-03-14 17:33'
labels:
  - backend
  - agent
dependencies: []
parent_task_id: TASK-3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run small pipeline (30 personas, 10 seeds, 1 round) and verify:
- Strategy: valid JSON, 5-8 menu items, Provo-realistic prices, reasonable cost_to_make
- Persona seeds: valid Persona objects, Provo demographics, realistic backstories
- Expansion: completes without errors, age/income match census targets
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Strategy has 5-8 menu items with realistic Provo pricing
- [ ] #2 10 persona seeds parse into valid Persona objects
- [ ] #3 Expansion to 30 personas works without errors
<!-- AC:END -->
