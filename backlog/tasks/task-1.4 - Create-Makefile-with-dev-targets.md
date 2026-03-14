---
id: TASK-1.4
title: Create Makefile with dev targets
status: To Do
assignee: []
created_date: '2026-03-14 17:33'
labels:
  - infrastructure
dependencies: []
parent_task_id: TASK-1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create Makefile with dev-backend (uvicorn), dev-frontend (npm run dev), and dev (both parallel) targets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 make dev-backend starts uvicorn on :8000
- [ ] #2 make dev-frontend starts Vite on :5173
- [ ] #3 make dev runs both in parallel
<!-- AC:END -->
