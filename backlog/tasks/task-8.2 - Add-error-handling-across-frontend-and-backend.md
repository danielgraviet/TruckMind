---
id: TASK-8.2
title: Add error handling across frontend and backend
status: To Do
assignee: []
created_date: '2026-03-14 17:35'
labels:
  - demo
  - frontend
  - backend
dependencies: []
parent_task_id: TASK-8
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Frontend: SSE reconnection indicator, API failure graceful handling, no blank screens.
Backend: LLM retry once before raising, handle fewer-than-expected personas, skip failed autonomous decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SSE drops show reconnecting indicator
- [ ] #2 API failures show graceful messages in chat
- [ ] #3 Backend retries failed LLM calls once
<!-- AC:END -->
