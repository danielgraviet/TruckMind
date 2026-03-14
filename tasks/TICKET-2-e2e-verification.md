# TICKET-2: End-to-end pipeline verification with real Claude calls

**Assignee:** Backend / Agent Architect
**Priority:** P0 — Blocker
**Estimate:** 2 hours
**Dependencies:** TICKET-0
**Blocks:** TICKET-1 (soft — server can be built against mock, but needs real verification)

---

## Goal

Run the full pipeline end-to-end with real Anthropic API calls and verify that every agent produces valid, usable output. Fix any prompt issues, JSON parsing failures, or data flow bugs before the frontend team needs real data.

## Tasks

- [ ] Run with a small persona count first:
  ```bash
  cd backend
  python -m engine.pipeline "Taco truck near BYU campus" \
    --location "Provo, UT" \
    --personas 30 \
    --seeds 10 \
    --rounds 1
  ```
- [ ] Verify **Strategist** output:
  - Does it return valid JSON?
  - Does the menu have 5-8 items?
  - Are prices realistic for Provo (not NYC prices)?
  - Are `cost_to_make` values reasonable (30-40% of price)?
  - Does every item have tags?
- [ ] Verify **Persona seed generation**:
  - Do all 10 seeds parse into valid Persona objects?
  - Do ages roughly match Provo demographics (heavy 18-24)?
  - Do backstories feel like real people, not archetypes?
  - Are dietary restrictions at realistic rates (~5-8% vegetarian)?
- [ ] Verify **Programmatic expansion**:
  - Does expansion to 30 total work without errors?
  - Check age distribution against census targets
  - Check income distribution
  - Verify no crashes on edge cases (age=18, very low income)
- [ ] Verify **Tier 1 simulation**:
  - Do batched LLM calls return one reaction per persona?
  - Are sentiments varied (not all positive)?
  - Do `likely_order` values match actual menu item names exactly?
  - Are `max_willing_to_pay` values reasonable?
- [ ] Verify **Tier 2 scoring**:
  - Does the scoring model build without errors?
  - Do Tier 2 reactions have reasonable sentiment distribution?
  - Are feedback strings grammatical and varied?
- [ ] Verify **Strategy refinement** (run with `--rounds 2`):
  - Does the refined strategy actually change based on feedback?
  - Do prices adjust in the right direction?
  - Does the version number increment?
- [ ] Verify **Shop initialization**:
  - Does inventory populate from the menu?
  - Can you run the REPL and place orders?
  ```bash
  python -m engine.pipeline "Taco truck near BYU" \
    --location "Provo, UT" \
    --personas 30 \
    --rounds 1 \
    --interactive
  ```
- [ ] Run a full-scale test:
  ```bash
  python -m engine.pipeline "Taco truck near BYU campus" \
    --location "Provo, UT" \
    --personas 200 \
    --seeds 20 \
    --rounds 2
  ```
- [ ] Record the total cost from `client.cost_report()` — we need to know our per-run burn rate
- [ ] Record total wall time for the full pipeline

## Prompt tuning

If any agent produces bad output, fix the prompts in the agent file. Common issues:

| Problem | Fix |
|---------|-----|
| Menu item names don't match between strategy and simulation | Add explicit instruction: "Use EXACT menu item names from the list above" |
| All personas are positive | Strengthen: "At least 30% of reactions must be neutral or negative" |
| JSON parsing fails | Check for markdown code fences in response; the client strips them but edge cases exist |
| Prices are too high for Provo | Add to strategist prompt: "This is a college town. Most students spend $5-8 on lunch." |
| Personas feel generic | Add more specific Provo context: "BYU campus, LDS community, outdoor culture, tech startups" |

## Definition of done

1. Full 200-persona pipeline runs end-to-end without crashes
2. Strategy is realistic and locally grounded
3. Simulation produces varied, believable reactions
4. Refinement actually improves the strategy
5. Shop REPL works for ordering
6. Total cost per run is documented
7. Total wall time is documented
8. Any prompt fixes are committed

## Notes

- Budget API spend carefully — each full run might cost $0.50-1.00
- If a specific agent is flaky, add retry logic in `llm_client.py`
- Save one successful pipeline output as a JSON fixture for the frontend team to develop against
