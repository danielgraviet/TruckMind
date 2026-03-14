# TICKET-5: Shop dashboard — ordering chat + operator dashboard

**Assignee:** Frontend / Demo Lead
**Priority:** P0 — Blocker
**Estimate:** 2-3 hours
**Dependencies:** TICKET-0, TICKET-1 (need POST /api/order working)
**Blocks:** TICKET-7 (demo polish)

---

## Goal

Build the Phase 4 shop page — a two-panel layout with a customer chat on the left and an operator dashboard on the right. This is where judges see the AI actually running a business.

## Components to build

### ChatPanel.jsx
- Standard chat UI: messages scroll up, input at bottom
- Messages have two roles: `customer` (right-aligned, blue) and `cashier` (left-aligned, gray)
- Input field with send button
- After sending, show a brief "typing..." indicator while waiting for the API response
- Display the cashier's message when it arrives

### InventoryBars.jsx
- Vertical or horizontal bar for each menu item
- Bar fill = quantity_remaining / max_capacity
- Color coding:
  - Green: > 50% stock
  - Yellow: 20-50% stock (approaching low)
  - Red: < 20% stock or below restock_threshold
  - Striped/gray: sold out (0 remaining)
- Show item name + count (e.g., "Street Taco — 23/50")
- Bars should animate when values change (CSS transition on width)

### PriceTable.jsx
- Shows current menu with prices
- If a price has been dynamically adjusted, highlight it:
  - Green arrow down + new price if decreased
  - Red arrow up + new price if increased
  - Show original price struck through next to new price
- Items that have been removed from the menu are grayed out with a "Sold out" badge

### RevenueCounter.jsx
- Three metric cards in a row:
  - Total orders (integer, ticking up)
  - Total revenue (dollar amount, ticking up)
  - Cash on hand (dollar amount, changes with orders and restocks)
- Numbers should animate when they change (count-up effect)

### ActionFeed.jsx
- Scrolling log of autonomous decisions
- Each entry shows:
  - Timestamp
  - Robot icon (to indicate autonomous)
  - Action description (from ShopAction.description)
  - Action type as a colored badge (restock=blue, price_change=amber, remove_item=red)
- Most recent at top
- This is the component that proves autonomy to judges — make it visually prominent

### SimulateRushButton.jsx
- Button labeled "Simulate lunch rush" or similar
- When clicked, sends 15-20 orders in sequence with 1.5s delay between each
- Shows a progress indicator (e.g., "Order 7/20...")
- Uses persona data from the pipeline phase to generate realistic orders
- Disable during rush so it can't be double-clicked

## Page layout

```
┌─────────────────────────────────────────────────────┐
│ [Phase Indicator: ✓ Strategy ✓ Sim ● Shop]          │
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│  CUSTOMER CHAT      │  OPERATOR DASHBOARD           │
│                     │                               │
│  ┌───────────────┐  │  ┌─ Revenue ──────────────┐   │
│  │ Cashier: Hi!  │  │  │ Orders: 18  Rev: $142  │   │
│  │ What can I    │  │  │ Cash: $440             │   │
│  │ get for you?  │  │  └────────────────────────┘   │
│  │               │  │                               │
│  │ You: I'll     │  │  ┌─ Inventory ────────────┐   │
│  │ take 2 tacos  │  │  │ ████████░░ Taco 23/50  │   │
│  │               │  │  │ ██████████ Bowl 30/50  │   │
│  │ Cashier:      │  │  │ ██░░░░░░░░ Chur  4/50 │   │
│  │ That'll be    │  │  └────────────────────────┘   │
│  │ $9.00!        │  │                               │
│  │               │  │  ┌─ Prices ───────────────┐   │
│  └───────────────┘  │  │ Taco    $4.50          │   │
│  ┌───────────────┐  │  │ Bowl    $9.00 → $10.50↑│   │
│  │ Type order... │  │  │ Churros $4.00          │   │
│  └───────────────┘  │  └────────────────────────┘   │
│                     │                               │
│ [Simulate Rush]     │  ┌─ AI Decisions ─────────┐   │
│                     │  │ 🤖 12:03 Restocked     │   │
│                     │  │   tacos (5→25, -$30)   │   │
│                     │  │ 🤖 12:08 Raised bowl   │   │
│                     │  │   price to $10.50      │   │
│                     │  └────────────────────────┘   │
└─────────────────────┴───────────────────────────────┘
```

## Wiring up the API

Create `hooks/useShop.js`:

```javascript
import { useState, useCallback } from 'react';

export function useShop(initialState) {
  const [shopState, setShopState] = useState(initialState);
  const [chatMessages, setChatMessages] = useState([
    { role: 'cashier', text: `Welcome to ${initialState?.strategy?.business_name}! What can I get you?` }
  ]);
  const [actionFeed, setActionFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendOrder = useCallback(async (message, customerName = 'Customer') => {
    setIsLoading(true);
    setChatMessages(prev => [...prev, { role: 'customer', text: message }]);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, customer_name: customerName })
      });
      const data = await res.json();

      setChatMessages(prev => [...prev, { role: 'cashier', text: data.cashier_message }]);
      setShopState(data.shop_state);
      
      for (const action of data.autonomous_actions) {
        if (action.autonomous) {
          setActionFeed(prev => [
            { ...action, timestamp: new Date().toLocaleTimeString() },
            ...prev
          ]);
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'cashier', text: "Sorry, give me a moment..." }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { shopState, chatMessages, actionFeed, isLoading, sendOrder };
}
```

## Definition of done

1. Chat sends messages and receives cashier responses
2. Inventory bars update after each order
3. Price table shows dynamic adjustments with visual indicators
4. Revenue counter ticks up with each order
5. Action feed shows autonomous decisions with robot icon
6. "Simulate rush" sends multiple orders and the dashboard updates live
7. When an item sells out, it disappears from the chat menu and shows as grayed out in the dashboard

## Notes

- The chat panel should auto-scroll to the latest message
- The action feed should auto-scroll to the top (newest first)
- Keep a max of ~50 chat messages visible to avoid performance issues during rush simulation
- The "simulate rush" button is the fallback demo path — make sure it works flawlessly even if the chat itself has minor issues
