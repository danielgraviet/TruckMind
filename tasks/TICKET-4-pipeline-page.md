# TICKET-4: Pipeline page — concept input, strategy display, and reaction board

**Assignee:** Frontend / Demo Lead
**Priority:** P0 — Blocker
**Estimate:** 3-4 hours
**Dependencies:** TICKET-0 (start with mock data), TICKET-1 (wire up real SSE when ready)
**Blocks:** TICKET-7 (demo polish)

---

## Goal

Build the Pipeline page — the first screen judges see. It walks through phases 1-3: user inputs a concept, the AI generates a strategy, personas appear on a board, and the simulation runs with cards flipping to show reactions in real time. This page contains the "wow" moment of the demo.

## Important: Start with mock data

Don't wait for the backend SSE endpoint (TICKET-1). Build all components against static JSON fixtures first, then swap in EventSource when the backend is ready. Ask the backend person to save one successful pipeline run as JSON for you.

## Components to build

### ConceptInput.jsx
- Text input: "Describe your food truck in one sentence"
- Location input: "Where will it operate?" (default: "Provo, UT")
- Submit button → triggers pipeline
- Keep it simple. One card, two fields, one button.

### PhaseIndicator.jsx
- Horizontal progress bar showing: Strategy → Personas → Simulation → Shop
- Active phase is highlighted, completed phases get a checkmark
- Used on both Pipeline and Shop pages

### StrategyCard.jsx
- Displays after Phase 1 completes
- Shows: business name, tagline, menu with prices, target demographic summary
- Menu items in a clean list: name, price, description, tags as small pills
- Should feel like a restaurant menu, not a data dump

### ReactionBoard.jsx — THE KEY COMPONENT
- Grid of 200 small cards (responsive: maybe 10-15 per row)
- **Initial state:** All cards are gray/neutral (personas generated but not yet simulated)
- **During simulation:** Cards flip one at a time to reveal sentiment color
  - Excited: bright green
  - Positive: light green
  - Neutral: gray
  - Negative: light red
  - Hostile: bright red
- **After simulation:** All cards showing, hoverable to see persona detail
- Cards should be small (maybe 48x48px or 56x56px) — the visual impact comes from the mass of color, not individual detail
- On hover, show a tooltip or modal with: persona name, age, occupation, feedback quote, likely order

### PersonaCard.jsx
- The individual card within the reaction board
- Two states: face-down (gray) and face-up (colored by sentiment)
- Flip animation on transition (CSS transform: rotateY)
- Shows first initial or small avatar on the face-up side
- Hover state shows expanded info

### SimulationStats.jsx
- Aggregate numbers that update as reactions stream in
- Interest rate: "62% would visit" (with a circular progress indicator)
- Projected daily revenue: "$847"
- Projected daily customers: "94"
- Average sentiment score: "+0.42"
- Top concerns and strengths as small tag pills

## Page layout

```
┌─────────────────────────────────────────┐
│ [Phase Indicator: ● Strategy ○ ○ ○]     │
├─────────────────────────────────────────┤
│                                         │
│  [Concept Input]     or    [Strategy]   │
│                             [Card]      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  [Reaction Board — 200 cards grid]      │
│  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■      │
│  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■      │
│  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■      │
│  (... 200 total)                        │
│                                         │
├─────────────────────────────────────────┤
│  [Simulation Stats — updates live]      │
│  Interest: 62%  Revenue: $847  Sent: +0.4│
└─────────────────────────────────────────┘
```

## Wiring up SSE (after TICKET-1 is done)

Create `hooks/useSSE.js`:

```javascript
import { useState, useEffect } from 'react';

export function useSSE(pipelineId) {
  const [phase, setPhase] = useState('input');
  const [strategy, setStrategy] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [simResult, setSimResult] = useState(null);
  const [shopState, setShopState] = useState(null);

  useEffect(() => {
    if (!pipelineId) return;

    const source = new EventSource(`/api/stream/${pipelineId}`);

    source.addEventListener('phase', (e) => {
      const data = JSON.parse(e.data);
      setPhase(data.phase);
    });

    source.addEventListener('strategy', (e) => {
      setStrategy(JSON.parse(e.data));
    });

    source.addEventListener('personas', (e) => {
      setPersonas(JSON.parse(e.data));
    });

    source.addEventListener('reaction', (e) => {
      const reaction = JSON.parse(e.data);
      setReactions(prev => [...prev, reaction]);
    });

    source.addEventListener('simulation_complete', (e) => {
      setSimResult(JSON.parse(e.data));
    });

    source.addEventListener('shop_ready', (e) => {
      setShopState(JSON.parse(e.data));
      source.close();
    });

    return () => source.close();
  }, [pipelineId]);

  return { phase, strategy, personas, reactions, simResult, shopState };
}
```

## Visual polish priorities

1. **Reaction board card flip animation** — this is the demo moment. Make it smooth. CSS `transition: transform 0.4s` with `rotateY(180deg)`.
2. **Color coding** — use distinct, accessible colors for the 5 sentiment levels
3. **Streaming feel** — cards should flip one at a time, not all at once. Tier 1 cards flip slowly (waiting on LLM), Tier 2 cards flood in fast. This cadence is built into the backend — just render each reaction as it arrives.
4. **Stats counter animation** — numbers should tick up smoothly as reactions arrive, not jump

## Mock data for development

Create `frontend/src/mocks/pipelineData.js` with:
- A sample strategy object (from schema.py Strategy.to_dict())
- 200 sample personas (generate with the backend mock mode)
- 200 sample reactions with varied sentiments

## Definition of done

1. Concept input submits and triggers the pipeline
2. Strategy card appears with menu and pricing
3. 200 cards appear gray on the board
4. Cards flip to colored as reactions stream in
5. Hovering a card shows persona detail + feedback quote
6. Stats update live as reactions arrive
7. After simulation completes, a "Open shop" button appears
8. Works with both mock data and real SSE

## Notes

- Don't overcomplicate the card design. A 48px colored square with a letter initial is enough. The visual impact is the grid, not individual cards.
- Mobile responsiveness is NOT a priority — this will be demoed on a laptop screen
- If the flip animation is too complex, a simple color fade-in is fine. Ship working > ship pretty.
