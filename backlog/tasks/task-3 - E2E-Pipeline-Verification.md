---
id: TASK-3
title: E2E Pipeline Verification
status: To Do
assignee: []
created_date: '2026-03-14 17:29'
labels:
  - backend
  - agent
  - p0-blocker
  - agent-architect
dependencies: []
references:
  - tasks/TICKET-2-e2e-verification.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the full pipeline end-to-end with real Anthropic API calls and verify every agent produces valid, usable output. Fix any prompt issues, JSON parsing failures, or data flow bugs before the frontend team needs real data.

## Context for Agent

**Key files:**
- `backend/engine/pipeline.py` — Pipeline orchestrator and CLI entry point
- `backend/agents/strategist.py` — Strategy generation prompts
- `backend/agents/crowd.py` — Persona generation and expansion
- `backend/agents/simulator.py` — Two-tier simulation
- `backend/agents/shop.py` — Shop initialization
- `backend/utils/llm_client.py` — LLM wrapper (needs complete_json/complete_json_list)
- `backend/models/schema.py` — All data contracts

**Test commands:**
- Small run: python -m engine.pipeline "Taco truck near BYU campus" --location "Provo, UT" --personas 30 --seeds 10 --rounds 1
- Full run: python -m engine.pipeline "Taco truck near BYU campus" --location "Provo, UT" --personas 200 --seeds 20 --rounds 2
- Interactive: add --interactive flag for shop REPL

**Common prompt issues:** Menu item name mismatches, all-positive personas, JSON parsing with markdown fences, unrealistic prices for college town

**Source ticket:** tasks/TICKET-2-e2e-verification.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Full 200-persona pipeline runs end-to-end without crashes
- [ ] #2 Strategy output has valid JSON with 5-8 menu items at realistic Provo prices
- [ ] #3 Persona seeds parse into valid Persona objects with realistic demographics
- [ ] #4 Programmatic expansion to target count works without errors
- [ ] #5 Tier 1 simulation returns varied reactions with correct menu item names
- [ ] #6 Tier 2 scoring builds and produces reasonable sentiment distribution
- [ ] #7 Strategy refinement actually changes based on simulation feedback
- [ ] #8 Shop REPL works for ordering via --interactive flag
- [ ] #9 Total API cost per run documented
- [ ] #10 Total wall time documented
- [ ] #11 One successful pipeline output saved as JSON fixture for frontend
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Prompt fixes committed
- [ ] #3 Cost and timing documented
<!-- DOD:END -->
