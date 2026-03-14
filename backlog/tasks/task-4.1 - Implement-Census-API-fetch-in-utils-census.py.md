---
id: TASK-4.1
title: Implement Census API fetch in utils/census.py
status: To Do
assignee: []
created_date: '2026-03-14 17:35'
labels:
  - backend
  - census
dependencies: []
parent_task_id: TASK-4
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement fetch_demographics_sync() returning data in CACHED_DEMOGRAPHICS shape.
Handle city name fuzzy matching (Census returns "Provo city, Utah").
Handle -666666666 for missing data. Sum male+female age brackets. Add 1s delay between calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 fetch_demographics_sync() returns correct data shape
- [ ] #2 City name fuzzy matching works
- [ ] #3 Missing data values handled gracefully
<!-- AC:END -->
