---
id: TASK-5
title: Pipeline Page (Frontend)
status: To Do
assignee: []
created_date: '2026-03-14 17:30'
labels:
  - frontend
  - p0-blocker
  - frontend-lead
dependencies: []
references:
  - tasks/TICKET-4-pipeline-page.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the Pipeline page — the first screen judges see. Walks through phases 1-3: user inputs a concept, the AI generates a strategy, personas appear on a board, and simulation runs with cards flipping to show reactions in real time. This page contains the "wow" moment of the demo.

## Context for Agent

**Key files:**
- `frontend/src/pages/PipelinePage.jsx` — Main page component (empty stub)
- `frontend/src/components/ConceptInput.jsx` — Concept form (empty stub)
- `frontend/src/components/StrategyCard.jsx` — Strategy display (empty stub)
- `frontend/src/components/ReactionBoard.jsx` — THE KEY COMPONENT (empty stub)
- `frontend/src/components/PersonaCard.jsx` — Individual reaction card (empty stub)
- `frontend/src/components/SimulationStats.jsx` — Live stats (empty stub)
- `frontend/src/hooks/useSSE.js` — SSE hook for streaming (empty stub)
- `backend/models/schema.py` — Data shapes to match

**Components:** ConceptInput, PhaseIndicator, StrategyCard, ReactionBoard (200-card grid), PersonaCard (flip animation), SimulationStats

**Start with mock data** — build against static JSON fixtures, wire SSE when backend is ready.

**Visual priorities:** Card flip animation (the demo moment), sentiment color coding, streaming feel (cards flip one at a time), stats counter animation.

**Source ticket:** tasks/TICKET-4-pipeline-page.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Concept input submits and triggers the pipeline
- [ ] #2 Strategy card appears with business name, tagline, menu and pricing
- [ ] #3 200 cards appear gray on the reaction board
- [ ] #4 Cards flip to sentiment-colored as reactions stream in (green/red spectrum)
- [ ] #5 Hovering a card shows persona detail + feedback quote
- [ ] #6 SimulationStats update live as reactions arrive (interest rate, revenue, sentiment)
- [ ] #7 After simulation completes, an Open Shop button appears
- [ ] #8 Works with both mock data and real SSE
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Components render correctly with mock data
- [ ] #3 Changes committed
<!-- DOD:END -->
