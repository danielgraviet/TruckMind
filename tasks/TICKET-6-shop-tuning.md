# TICKET-6: Tune shop agent — make autonomous decisions impressive

**Assignee:** Operations Engine
**Priority:** P1 — Important
**Estimate:** 2-3 hours
**Dependencies:** TICKET-0, TICKET-2
**Blocks:** TICKET-7 (demo polish)

---

## Goal

The shop agent already works mechanically — it processes orders, decrements inventory, and triggers autonomous decisions. But the decisions need to feel *smart* during the demo. This ticket is about tuning the triggers, improving the LLM prompts for autonomous decisions, and making sure impressive things happen during a 20-order simulated lunch rush.

## Problem

Right now the autonomous triggers are basic:
- Low stock → ask LLM what to do
- Out of stock → remove from menu
- High demand → ask LLM about surge pricing

For the demo, we need these decisions to happen at the right moments and produce clear, explainable reasoning that judges can read in the action feed.

## Tasks

### Tune inventory levels for demo pacing

- [ ] Adjust starting quantities so interesting things happen within 15-20 orders:
  ```python
  # Current: every item starts at 30
  # Better: vary by item so some run out faster
  def initialize_shop_for_demo(strategy, starting_cash=500.0):
      inventory = []
      for i, item in enumerate(strategy.menu):
          # Stagger quantities so events happen at different times
          if item.category == "entree":
              qty = 15  # Entrees run out faster (ordered more)
          elif item.category == "drink":
              qty = 25  # Drinks last longer
          else:
              qty = 12  # Sides/desserts in the middle
          
          inventory.append(InventoryItem(
              menu_item_name=item.name,
              quantity_remaining=qty,
              restock_threshold=4,   # Trigger earlier for more demo moments
              max_capacity=30,
              unit_cost=item.cost_to_make,
          ))
      return ShopState(strategy=strategy, inventory=inventory, cash_on_hand=starting_cash)
  ```

### Improve autonomous decision prompts

- [ ] Make the LLM explain its reasoning in a way that sounds like a business operator:
  ```
  BAD:  "Restocked tacos"
  GOOD: "Restocked 20 street tacos ($30) — they're our bestseller at 
        40% of orders, and we have enough cash to cover it while 
        maintaining margins."
  ```
- [ ] Update `AUTONOMOUS_SYSTEM_PROMPT` to emphasize reasoning:
  ```
  "Always explain your reasoning in 1-2 sentences. Reference specific 
  numbers: how many sold, what percentage of orders, profit margin impact.
  Think out loud like a smart food truck operator."
  ```

### Add new autonomous trigger: combo/upsell creation

- [ ] When a specific pair of items is frequently ordered together, the AI should notice and create a combo deal:
  ```python
  # In check_autonomous_triggers():
  # Track co-occurrences in recent orders
  pair_counts = {}
  for order in shop_state.orders[-20:]:
      if len(order.items) >= 2:
          for i, item1 in enumerate(order.items):
              for item2 in order.items[i+1:]:
                  pair = tuple(sorted([item1, item2]))
                  pair_counts[pair] = pair_counts.get(pair, 0) + 1
  
  # If a pair appears 4+ times, suggest a combo
  for pair, count in pair_counts.items():
      if count >= 4:
          # trigger autonomous decision about creating a combo
  ```

### Add new autonomous trigger: time-based decisions

- [ ] If the simulation represents a time window (e.g., lunch rush 11am-2pm), add logic for:
  - "It's past peak hours, discount remaining perishables"
  - "Running low on cash, skip restock and let items sell out naturally"

### Tune the cashier personality

- [ ] Update `CASHIER_SYSTEM_PROMPT` to be more engaging:
  - Should mention specials or popular items naturally ("The street tacos are flying today!")
  - Should handle "what's good?" with a real recommendation
  - Should upsell drinks/sides once per conversation, not every message
  - Should handle edge cases: "I'm vegetarian", "What's cheapest?", "I'll take one of everything"
- [ ] Test these specific interactions and verify good responses:
  ```
  "What do you have?"
  "What's popular?"
  "I'm vegetarian, what can I get?"
  "That's too expensive, anything cheaper?"
  "I'll take 3 street tacos and a horchata"
  "Actually, can I change that to 2 tacos?"
  ```

### Surge pricing tuning

- [ ] Current trigger: 8+ orders of the same item in last 20. Adjust to 5+ for demo pacing.
- [ ] Limit price increases to 20% max so it doesn't feel predatory
- [ ] Add a corresponding trigger: if an item hasn't been ordered in the last 10 orders, suggest a discount

### Test the full rush scenario

- [ ] Run the shop REPL with 25+ sequential orders and verify:
  - [ ] At least 2 restocking decisions happen
  - [ ] At least 1 price adjustment happens
  - [ ] At least 1 item gets removed from the menu
  - [ ] The cashier handles sold-out items gracefully
  - [ ] Cash on hand stays positive (the AI doesn't overspend on restocking)
  - [ ] Action descriptions are clear and include reasoning

## Definition of done

1. A 20-order rush produces at least 3 visually distinct autonomous actions
2. Each action has a 1-2 sentence explanation with specific numbers
3. Cashier handles common edge cases gracefully
4. Inventory levels are tuned so events happen at demo-appropriate times
5. No crashes or state corruption during rapid ordering

## Notes

- The action feed is what proves autonomy to judges. Every action description should be quotable — something a judge can point to and say "the AI decided this on its own."
- Don't over-trigger. If the AI makes a decision every single order, it feels scripted. 3-4 decisions in 20 orders is the sweet spot.
- Test with the actual personas from the simulation, not just manual orders. The persona-based rush is what the demo will use.
