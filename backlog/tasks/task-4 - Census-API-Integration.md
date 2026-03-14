---
id: TASK-4
title: Census API Integration
status: To Do
assignee: []
created_date: '2026-03-14 17:29'
updated_date: '2026-03-14 17:32'
labels:
  - backend
  - census
  - p1-important
  - persona-engineer
dependencies:
  - TASK-1
references:
  - tasks/TICKET-3-census-api.md
priority: medium
milestone: podium-hackathon-2026
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the hardcoded demographic data in agents/crowd.py with live Census API calls so any US city works, not just Provo and SLC. The cached data remains as a fallback if the API is slow or unavailable.

## Context for Agent

**Key files:**
- `backend/utils/census.py` — Census API integration skeleton (async httpx, needs wiring)
- `backend/agents/crowd.py` — Persona generation, uses CACHED_DEMOGRAPHICS dict
- `backend/models/schema.py` — Persona dataclass

**Current state:** census.py has a skeleton but is not wired into crowd.py. crowd.py uses CACHED_DEMOGRAPHICS for Provo and Salt Lake City only.

**API details:**
- Census ACS 5-Year API
- Key signup: api.census.gov/data/key_signup.html
- Age variables B01001_003E-B01001_049E (split by sex, need summing)
- Returns -666666666 for missing data
- Rate limit: 500/day

**Implementation:** Try live API first, fall back to cached data, fall back to generic profile.

**Note:** This is a nice-to-have differentiator, not a blocker. Cached data works fine for demo.

**Source ticket:** tasks/TICKET-3-census-api.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 get_demographics('Provo, UT') returns real Census data
- [ ] #2 get_demographics('Austin, TX') works for a non-cached city
- [ ] #3 get_demographics('Fake City, XX') falls back gracefully
- [ ] #4 Pipeline runs successfully with live Census data
- [ ] #5 Persona age/income distributions match Census reality
- [ ] #6 Logan UT and Orem UT added to CACHED_DEMOGRAPHICS as backup
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All acceptance criteria verified
- [ ] #2 Census API key documented in .env.example
- [ ] #3 Changes committed
<!-- DOD:END -->
