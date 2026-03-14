---
id: TASK-8
title: Demo Polish & Presentation
status: To Do
assignee: []
created_date: '2026-03-14 17:31'
labels:
  - demo
  - frontend
  - p0-blocker
  - everyone
dependencies: []
references:
  - tasks/TICKET-7-demo-polish.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the working app into a demo that wins. Fix rough edges, add error handling so nothing crashes live, rehearse the presentation, and pre-cache everything so you are not dependent on network during the demo.

## Context for Agent

**Key files:**
- `backend/server.py` — Add demo mode endpoint, error handling
- `frontend/src/` — All components for visual polish
- `backend/engine/pipeline.py` — Pre-cache pipeline output
- `backend/agents/shop.py` — Error handling for LLM failures

**Key areas:**
1. Pre-cache everything: save full pipeline output, cache Census data, add demo-mode flag
2. Error handling: SSE reconnection, API failure graceful degradation, LLM retry logic
3. Visual polish: logo/header, reaction board fits one screen, smooth transitions, animations
4. Demo script: 5-minute presentation script with speaking roles
5. Judging criteria: Autonomy (40%), Value (30%), Technical Complexity (20%), Demo (10%)

**Critical:** The reaction board filling in is the single most memorable visual. Murphy law applies — pre-cache everything.

**Source ticket:** tasks/TICKET-7-demo-polish.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Full demo runs end-to-end without errors (tested 3 times)
- [ ] #2 Fallback demo mode works if network/API is down
- [ ] #3 Frontend handles SSE drops and API failures gracefully (no blank screens or JS errors)
- [ ] #4 Backend retries failed LLM calls once before raising
- [ ] #5 Logo/header with TruckMind branding added
- [ ] #6 Reaction board fits on single screen without scrolling
- [ ] #7 5-minute demo script written with speaking roles assigned
- [ ] #8 Demo rehearsed at least twice and timed under 5 minutes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Demo script saved to repo
- [ ] #3 Pre-cached data committed
<!-- DOD:END -->
