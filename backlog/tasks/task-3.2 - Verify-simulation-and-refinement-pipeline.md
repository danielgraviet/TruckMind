---
id: TASK-3.2
title: Verify simulation and refinement pipeline
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
Verify simulation tiers and strategy refinement:
- Tier 1: batched LLM calls return varied reactions with correct menu item names
- Tier 2: scoring model builds, reasonable sentiment distribution
- Refinement: strategy actually changes with --rounds 2
- Shop REPL: works via --interactive flag
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tier 1 returns varied reactions with correct menu names
- [ ] #2 Tier 2 scoring produces reasonable sentiment distribution
- [ ] #3 Refinement changes strategy based on feedback
- [ ] #4 Shop REPL works for ordering
<!-- AC:END -->
