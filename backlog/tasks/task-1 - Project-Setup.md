---
id: TASK-1
title: Project Setup
status: To Do
assignee: []
created_date: '2026-03-14 17:28'
labels:
  - infrastructure
  - p0-blocker
  - everyone
dependencies: []
milestone: podium-hackathon-2026
references:
  - tasks/TICKET-0-project-setup.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Get the repo created, dependencies installed, environment configured, and the existing backend code dropped in so the whole team can start working.

## Context for Agent

**Key files:**
- `backend/requirements.txt` — Python dependencies
- `frontend/package.json` — Node dependencies
- `Makefile` — dev commands
- `.env.example` — environment template
- `.gitignore`

**Current state:** Directory structure and backend code already exist. Need to verify setup works end-to-end.

**Source ticket:** tasks/TICKET-0-project-setup.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GitHub repo created with correct directory structure
- [ ] #2 All Python packages have __init__.py files
- [ ] #3 Backend dependencies installed (anthropic, httpx, fastapi, uvicorn, python-dotenv)
- [ ] #4 .env configured with ANTHROPIC_API_KEY and CENSUS_API_KEY
- [ ] #5 Frontend scaffolded with Vite + React + Tailwind CSS
- [ ] #6 Makefile with dev-backend, dev-frontend, and dev targets
- [ ] #7 Backend pipeline runs in mock mode without errors
- [ ] #8 Every team member can clone, run make dev, see backend on :8000 and frontend on :5173
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Changes committed and pushed
<!-- DOD:END -->
