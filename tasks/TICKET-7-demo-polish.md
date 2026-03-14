# TICKET-7: Demo polish, error handling, and presentation prep

**Assignee:** Whole team
**Priority:** P0 — Do this last but don't skip it
**Estimate:** 2 hours
**Dependencies:** TICKET-1, TICKET-4, TICKET-5, TICKET-6
**Blocks:** Nothing — this IS the finish line

---

## Goal

Turn the working app into a demo that wins. Fix rough edges, add error handling so nothing crashes live, rehearse the presentation, and pre-cache everything so you're not dependent on network during the demo.

## Tasks

### Pre-cache everything

- [ ] Run the full pipeline once for your demo concept and save the output:
  ```bash
  python -m engine.pipeline "YOUR DEMO CONCEPT" \
    --location "Provo, UT" \
    --personas 200 \
    --rounds 2 > demo_output.json
  ```
- [ ] Cache the Census API response for your demo location so you don't need network
- [ ] Consider having a "demo mode" flag that loads pre-computed results if the live pipeline is too slow or API is down:
  ```python
  # In server.py
  @app.get("/api/demo-mode")
  async def demo_mode():
      # Load pre-saved pipeline state, stream it with artificial delays
      # so it LOOKS real-time but is guaranteed to work
  ```

### Error handling

- [ ] Frontend: if SSE connection drops, show a reconnecting indicator (not a blank screen)
- [ ] Frontend: if `/api/order` fails, show "Give me a moment..." in the chat (not a JS error)
- [ ] Backend: if an LLM call fails, retry once before raising
- [ ] Backend: if persona generation returns fewer personas than expected, log warning and continue
- [ ] Backend: if the autonomous decision LLM call fails, skip the decision (don't block the order)

### Visual polish

- [ ] Add a logo or header: "TruckMind" (or your chosen name) with the tagline
- [ ] Ensure the reaction board fits on a single screen without scrolling (adjust card size if needed)
- [ ] Make the phase transition smooth — don't jank between strategy and reaction board
- [ ] Action feed: add a subtle animation when new entries appear (slide-in from left)
- [ ] Revenue counter: add a smooth count-up animation, not a jump
- [ ] If any component has a loading state, make sure it has a spinner or skeleton, not a blank space

### Demo script

- [ ] Write a 5-minute script:
  ```
  0:00 - "What if an AI could run your food truck?"
  0:30 - Type the concept, show strategy generation
  1:00 - "Now it's going to test this against 200 synthetic customers 
          built from real Census data"
  1:30 - Watch the reaction board fill in (this is the wow moment — 
          pause and let judges absorb it)
  2:00 - Show the stats: "62% would visit, projected $847/day"
  2:15 - "The AI refined the strategy based on feedback — watch the 
          prices adjust" (if doing refinement round)
  2:30 - "Now the shop is open. Want to order something?" 
          (hand keyboard to judge, or hit simulate rush)
  3:00 - Watch the dashboard update live, point out autonomous decisions
  4:00 - "Every decision you just saw was made by the AI. No human 
          in the loop."
  4:30 - Recap: what we built, why it matters, how it extends
  5:00 - Questions
  ```
- [ ] Assign speaking roles: who presents which section?
- [ ] Rehearse at least twice
- [ ] Time it — cut aggressively if over 5 minutes

### Presentation slides (if needed)

- [ ] Title slide with project name and team
- [ ] One-slide architecture diagram (use the pipeline diagram from README)
- [ ] One-slide: "What makes this different" (Silicon Sampling + Census data + live operations)
- [ ] Don't make more than 3-4 slides. The live demo IS the presentation.

### Judging criteria checklist

- [ ] **Autonomy (40%)**: Can you point to 5+ decisions the AI made without human input?
  - Strategy generation
  - Persona creation
  - Strategy refinement based on simulation
  - Dynamic pricing
  - Inventory restocking
  - Menu item removal
- [ ] **Value (30%)**: Can you articulate the problem in one sentence? ("Food trucks fail because of bad market research. This does it in 60 seconds.")
- [ ] **Technical Complexity (20%)**: Can you explain the two-tier simulation, the Census grounding, and the multi-agent architecture in 30 seconds?
- [ ] **Demo (10%)**: Is the reaction board visually compelling? Can judges interact with the shop?

## Definition of done

1. Full demo runs end-to-end without errors (test 3 times)
2. Fallback demo mode works if network/API is down
3. Script is written and rehearsed
4. Every team member knows their speaking part
5. The demo takes under 5 minutes

## Notes

- Murphy's Law applies to hackathon demos. If the API can fail, it will fail during your presentation. Pre-cache everything.
- The reaction board filling in is your single most memorable visual. Make sure it works perfectly. If you have to cut one other feature to polish this, cut it.
- Judges remember the first 30 seconds and the last 30 seconds. Nail the hook and the close.
