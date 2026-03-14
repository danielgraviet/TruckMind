---
id: TASK-4.2
title: Wire Census API into crowd.py with fallback chain
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
Update get_demographics() in crowd.py: try live API first, fall back to cached data, fall back to generic profile.
Add Logan UT and Orem UT to CACHED_DEMOGRAPHICS.
Test with 3 cities: Provo UT, Austin TX, Miami FL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Live Census API tried first, cached data as fallback, generic as last resort
- [ ] #2 Logan UT and Orem UT added to cached data
- [ ] #3 Pipeline runs successfully with live Census data
<!-- AC:END -->
