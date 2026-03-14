---
id: doc-5
title: Demo Script - 5 Minute Timed Flow
type: other
created_date: '2026-03-14 18:07'
---
# Demo Script — 5 Minutes

## Setup Checklist (before presenting)
- [ ] Backend running on :8000
- [ ] Frontend running on :5173
- [ ] API key configured and verified
- [ ] Demo mode tested as fallback (`?demo=true`)
- [ ] Browser window sized, dev tools closed
- [ ] "Gourmet grilled cheese near BYU campus, Provo UT" ready to paste

---

## The Script

### 0:00–0:30 — Hook
> "What if an AI didn't just help you plan a business — it actually ran one?"
>
> "TruckMind takes a food truck concept and autonomously operates it. It researches the local market, designs the strategy, stress-tests it against hundreds of synthetic customers, opens the shop, and makes every operational decision — pricing, inventory, restocking — with zero human intervention."

**Action:** Show the landing page / ConceptInput.

---

### 0:30–1:00 — Concept Input
> "Let's start a gourmet grilled cheese truck near BYU."

**Action:** Type (or paste) the concept. Hit submit. Pipeline starts.

> "First, the AI pulls real US Census demographics for Provo — income, age, education, household composition. Every decision will be grounded in actual population data, not guesses."

**Action:** PhaseIndicator shows "Strategy" phase.

---

### 1:00–1:30 — Strategy
> "The AI just designed an entire business — name, tagline, menu, pricing, competitive positioning. Watch."

**Action:** StrategyCard renders. Point to menu items and prices.

> "Notice the pricing. It's not random — it's calibrated to Provo's median income and the student demographic around BYU."

---

### 1:30–2:30 — Silicon Sampling (The Wow Moment)
> "Now here's what makes TruckMind different. Instead of guessing whether customers want this, the AI builds a synthetic test market. 300 realistic personas — each with a name, income, dietary preferences, price sensitivity — all grounded in Census data."

**Action:** PhaseIndicator shows "Simulation." Persona cards start appearing.

> "Each persona reacts to the menu independently. Watch the cards flip — green means excited, yellow is neutral, red is negative."

**Action:** Reaction board fills. Tier 1 cards flip slowly (LLM calls). Then Tier 2 floods in.

> "The first 50 personas are individually simulated by the AI. Then TruckMind learns the patterns and scores the remaining 250 instantly — zero additional API calls. We call this Silicon Sampling."

**Action:** SimulationStats appear — interest rate, projected revenue, sentiment breakdown.

---

### 2:30–3:00 — Shop Opens
> "The AI has validated its strategy. Now it opens the shop and starts operating."

**Action:** Transition to ShopPage. Menu, inventory, prices all visible.

> "From this point forward, every decision is autonomous. Let me show you."

---

### 3:00–3:30 — Judge Interaction
> "Go ahead — order something."

**Action:** Judge (or presenter) types an order in ChatPanel. Cashier responds.

> "The AI handles the full conversation — suggestions, upsells, pricing. But the real magic is what's happening behind the scenes."

**Action:** Point to InventoryBars (stock decreased) and ActionFeed (any triggered actions).

---

### 3:30–4:15 — The Rush (Autonomy Proof)
> "Let's stress-test it. I'm going to simulate a lunch rush — 20 customers in 30 seconds."

**Action:** Hit Simulate Rush button. Orders stream in rapidly.

> "Watch the dashboard. The AI is making real-time decisions."

**Point out as they happen:**
- "Inventory dropping — it just decided to restock tacos."
- "Demand surging on the classic grilled cheese — price just went up 15%."
- "Jalapeño poppers sold out — removed from the menu automatically."
- "Cash on hand decreased — it spent money to restock without being told."

**Action:** ActionFeed fills with autonomous decisions, each showing reasoning.

---

### 4:15–4:45 — The Number
> "Let me zoom out. In the last 4 minutes, TruckMind made [X] autonomous decisions with zero human input. It researched the market, designed a strategy, validated it against 300 customers, opened a shop, served orders, adjusted prices, managed inventory, and restocked — all from a single sentence."

**Action:** Point to RevenueCounter (total orders, revenue, cash remaining) and ActionFeed count.

---

### 4:45–5:00 — Close
> "Most hackathon projects build an AI that gives advice. TruckMind is the business. Thank you."

---

## Escape Hatches

**If pipeline is slow (>45 sec):**
> "While the AI works, let me explain what's happening..." (fill with Silicon Sampling explanation, then catch up when it finishes)

**If pipeline fails:**
Switch to `?demo=true`. Say:
> "Let me show you a pre-computed run so you can see the full experience."

**If running over 5 min:**
Skip the judge interaction. Go straight from shop opening → Simulate Rush → closing number.

**If judge asks a hard question during Q&A:**
- "How is this different from a chatbot?" → "A chatbot answers questions. TruckMind makes decisions autonomously — pricing, inventory, restocking — without being asked."
- "Is the Census data real?" → "Yes. We pull from the US Census Bureau's American Community Survey. The cached data for Provo matches the 2022 ACS 5-year estimates."
- "What about the cost?" → "Full pipeline costs about $0.50 in API calls. Tier 2 simulation is free — zero API calls for 250 personas."
