---
id: TASK-1.2
title: Install backend dependencies and verify pipeline
status: To Do
assignee: []
created_date: '2026-03-14 17:33'
labels:
  - infrastructure
  - backend
dependencies: []
parent_task_id: TASK-1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Install Python packages, add __init__.py files, create .env from template, verify mock pipeline runs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All Python packages have __init__.py files
- [ ] #2 anthropic, httpx, fastapi, uvicorn, python-dotenv installed
- [ ] #3 requirements.txt generated via pip freeze
- [ ] #4 .env created with ANTHROPIC_API_KEY and CENSUS_API_KEY
- [ ] #5 python -m engine.pipeline runs in mock mode
<!-- AC:END -->
