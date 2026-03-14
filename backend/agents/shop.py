"""
Agent: The Shop (Autonomous Operations Engine)
===============================================
Input:  (ShopState, Order) or (ShopState, trigger_event)
Output: list[ShopAction] + mutated ShopState

The shop agent is an autonomous operations manager connected to the truck's
POS, inventory, and accounting systems. It monitors incoming orders, tracks
inventory and financials, and makes real-time operational decisions (pricing,
restocking, menu changes) within hard constraints it cannot override.

Trigger model: Periodic (every N orders) + event-driven (after each order, on stock-outs).
Authority: Fully autonomous with hardcoded rules it cannot break.
No cashier mode — real food trucks have human cashiers.
"""

import json
import re
from datetime import datetime
from typing import Optional
from models.schema import (
    Strategy, ShopState, ShopAction, ShopActionType,
    Order, InventoryItem, MenuItem,
)
from utils.llm_client import LLMClient
import uuid


# ─── Hard Rules (non-negotiable) ─────────────────────────────────────────────
MAX_MARKUP_PCT = 0.25          # Max 25% above base price
MIN_MARGIN_MULTIPLIER = 1.10   # Never price below cost_to_make × 1.10
MAX_RESTOCK_SPEND_PCT = 0.50   # Can't spend more than 50% of cash on one restock
MIN_CASH_RESERVE = 50.0        # Must keep $50 minimum cash on hand
MAX_ACTIONS_PER_CYCLE = 2      # Max autonomous actions per evaluation (sold-out exempt)
COOLDOWN_ORDERS = 8            # Min orders between same trigger firing per item
PERIODIC_REVIEW_INTERVAL = 5   # Full strategic review every N orders
MIN_ORDERS_FOR_TRENDS = 8      # Don't make trend-based decisions until N orders exist

# ─── Inventory defaults by category ─────────────────────────────────────────
_CATEGORY_INVENTORY = {
    "entree":  {"qty": 10, "threshold": 4, "max": 50},
    "side":    {"qty": 8,  "threshold": 3, "max": 30},
    "drink":   {"qty": 15, "threshold": 4, "max": 50},
    "dessert": {"qty": 6,  "threshold": 3, "max": 25},
}
_DEFAULT_INVENTORY = {"qty": 10, "threshold": 4, "max": 50}


# ─── Autonomous operations prompts ──────────────────────────────────────────

AUTONOMOUS_SYSTEM_PROMPT = """You are the autonomous operations manager for {business_name}.
You monitor sales, inventory, and finances in real-time.
You make decisive operational decisions: pricing adjustments, restocking, menu changes.

Every recommendation must include specific numbers: order counts, percentages, dollar amounts, margins.
Format: [Decision] — [Evidence with numbers] ([Projected impact])

Be concise. One decision per issue. No hedging."""

AUTONOMOUS_PROMPT_TEMPLATE = """Current shop status:

INVENTORY:
{inventory_status}

PER-ITEM SALES BREAKDOWN:
{sales_breakdown}

FINANCIAL SUMMARY:
- Total revenue: ${total_revenue:.2f}
- Cash on hand: ${cash_on_hand:.2f}
- Total orders: {total_orders}
- Average order value: ${avg_order_value:.2f}

CURRENT PRICE ADJUSTMENTS:
{price_adjustments}

ISSUE TO ADDRESS:
{trigger}

What action should we take? Respond in JSON:
{{
    "action_type": "adjust_price|remove_item|restock|add_special",
    "description": "Human-readable explanation with specific numbers",
    "details": {{
        "item_name": "affected item",
        "new_price": 0.00,
        "quantity": 0,
        "reason": "why this decision"
    }}
}}"""


# ─── Public Interface ───────────────────────────────────────────────────────

def process_order(shop_state: ShopState, order: Order, client: LLMClient) -> list[ShopAction]:
    """
    Process an incoming order from the POS system.
    Updates state and evaluates triggers.

    Args:
        shop_state: Current shop state
        order: Order from POS (items already selected by human cashier)
        client: LLM client for autonomous decisions

    Returns:
        List of autonomous actions taken in response to this order
    """
    actions = []

    # 1. Validate: filter to only items on active menu
    active_names = {i.name for i in shop_state.get_active_menu()}
    valid_items = [item for item in order.items if item in active_names]
    if not valid_items:
        return actions
    order.items = valid_items

    # 2. Recalculate total from current prices (don't trust external total)
    order.total_price = sum(
        shop_state.get_current_price(item) or 0 for item in valid_items
    )

    # 3. Update state
    shop_state.orders.append(order)
    shop_state.total_orders += 1
    shop_state.total_revenue += order.total_price
    shop_state.cash_on_hand += order.total_price

    # Decrement inventory
    for item_name in valid_items:
        _decrement_inventory(shop_state, item_name)

    # 4. Log order action (non-autonomous)
    actions.append(ShopAction(
        action_type=ShopActionType.TAKE_ORDER,
        description=f"Order {order.id}: {', '.join(valid_items)} — ${order.total_price:.2f}",
        details=order.to_dict(),
        autonomous=False,
    ))

    # 5. Evaluate fast triggers (sold-out, low stock)
    fast_actions = _evaluate_fast_triggers(shop_state, client)
    actions.extend(fast_actions)

    # 6. Periodic review every N orders
    if shop_state.total_orders % PERIODIC_REVIEW_INTERVAL == 0:
        review_actions = periodic_review(shop_state, client)
        actions.extend(review_actions)

    return actions


def periodic_review(shop_state: ShopState, client: LLMClient) -> list[ShopAction]:
    """
    Full strategic evaluation. Called on timer or every N orders.

    Evaluates all triggers (pricing, inventory, financial) and makes
    strategic decisions via LLM.

    Returns:
        List of actions taken
    """
    return _periodic_review(shop_state, client)


def initialize_shop(strategy: Strategy, starting_cash: float = 500.0) -> ShopState:
    """Create initial shop state from a finalized strategy with staggered inventory."""
    inventory = []
    for item in strategy.menu:
        cat = item.category.lower()
        defaults = _CATEGORY_INVENTORY.get(cat, _DEFAULT_INVENTORY)
        inventory.append(InventoryItem(
            menu_item_name=item.name,
            quantity_remaining=defaults["qty"],
            restock_threshold=defaults["threshold"],
            max_capacity=defaults["max"],
            unit_cost=item.cost_to_make,
        ))

    return ShopState(
        strategy=strategy,
        inventory=inventory,
        cash_on_hand=starting_cash,
    )


# ─── Trigger Engine ─────────────────────────────────────────────────────────

def _evaluate_fast_triggers(shop_state: ShopState, client: LLMClient) -> list[ShopAction]:
    """
    Called after every order. Only checks urgent triggers:
    1. Sold Out — auto-remove (exempt from action cap)
    2. Low Stock — LLM decides restock or ride it out
    """
    actions = []

    # Trigger 1: Sold Out — immediate auto-removal, exempt from cap
    for inv in shop_state.inventory:
        if inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            action = ShopAction(
                action_type=ShopActionType.REMOVE_ITEM,
                description=f"SOLD OUT: '{inv.menu_item_name}' removed from menu — 0 units remaining.",
                details={"item_name": inv.menu_item_name, "reason": "out of stock"},
                autonomous=True,
            )
            shop_state.removed_items.append(inv.menu_item_name)
            shop_state.action_log.append(action)
            actions.append(action)

    # Trigger 2: Low Stock — cooldown per item
    for inv in shop_state.inventory:
        if inv.is_low and not inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            key = f"low_stock:{inv.menu_item_name}"
            if not _can_trigger(shop_state, key, COOLDOWN_ORDERS):
                continue

            restock_cost = inv.unit_cost * (inv.max_capacity - inv.quantity_remaining)
            action = _make_autonomous_decision(
                shop_state, client,
                trigger=f"'{inv.menu_item_name}' is running low ({inv.quantity_remaining} remaining, "
                        f"threshold is {inv.restock_threshold}). "
                        f"Full restock would cost ${restock_cost:.2f}. "
                        f"We have ${shop_state.cash_on_hand:.2f} cash on hand."
            )
            if action:
                _apply_action(shop_state, action)
                actions.append(action)
                _mark_triggered(shop_state, key)

    return actions


def _periodic_review(shop_state: ShopState, client: LLMClient) -> list[ShopAction]:
    """
    Called every N orders. Evaluates strategic triggers.
    Action cap: Max 1 inventory action + 1 pricing action per review. Sold-out exempt.
    """
    actions = []
    inventory_actions = 0
    pricing_actions = 0

    # Trigger 3: Surge Pricing
    # Item ordered 5+ times in last 15 orders, no existing override above base
    if shop_state.total_orders >= MIN_ORDERS_FOR_TRENDS:
        for item in shop_state.strategy.menu:
            if item.name in shop_state.removed_items:
                continue
            if pricing_actions >= 1:
                break

            recent_count = _count_item_in_recent_orders(shop_state, item.name, 15)
            if recent_count < 5:
                continue

            # Skip if already has price override above base
            current = shop_state.get_current_price(item.name)
            if current and current > item.base_price:
                continue

            key = f"surge:{item.name}"
            if not _can_trigger(shop_state, key, COOLDOWN_ORDERS):
                continue

            # Rule-based surge: 15% increase, capped at MAX_MARKUP_PCT
            new_price = round(item.base_price * 1.15, 2)
            price_ceiling = round(item.base_price * (1 + MAX_MARKUP_PCT), 2)
            new_price = min(new_price, price_ceiling)

            action = ShopAction(
                action_type=ShopActionType.ADJUST_PRICE,
                description=(
                    f"SURGE: '{item.name}' ordered {recent_count}x in last 15 orders — "
                    f"price ${item.base_price:.2f} → ${new_price:.2f} (+{((new_price/item.base_price)-1)*100:.0f}%)"
                ),
                details={
                    "item_name": item.name,
                    "new_price": new_price,
                    "reason": f"High demand ({recent_count} in last 15 orders)",
                },
                autonomous=True,
            )
            _apply_action(shop_state, action)
            actions.append(action)
            _mark_triggered(shop_state, key)
            pricing_actions += 1

    # Trigger 4: Slow Mover Discount
    # 0 orders in last 10, only if enough data
    if shop_state.total_orders >= MIN_ORDERS_FOR_TRENDS:
        slow_movers = _get_items_not_ordered_recently(shop_state, 10)
        for item_name in slow_movers:
            if pricing_actions >= 1:
                break

            key = f"slow_mover:{item_name}"
            if not _can_trigger(shop_state, key, COOLDOWN_ORDERS):
                continue

            menu_item = _get_menu_item(shop_state, item_name)
            if not menu_item:
                continue

            # Rule-based discount: 20%, floor at cost * MIN_MARGIN_MULTIPLIER
            base = menu_item.base_price
            floor_price = round(menu_item.cost_to_make * MIN_MARGIN_MULTIPLIER, 2)
            new_price = round(base * 0.80, 2)
            new_price = max(new_price, floor_price)

            if new_price >= base:
                continue  # Can't discount further

            action = ShopAction(
                action_type=ShopActionType.ADJUST_PRICE,
                description=(
                    f"DISCOUNT: '{item_name}' has 0 orders in last 10 — "
                    f"price ${base:.2f} → ${new_price:.2f} (-{((1 - new_price/base))*100:.0f}%)"
                ),
                details={
                    "item_name": item_name,
                    "new_price": new_price,
                    "reason": "No orders in last 10 — discounting to stimulate demand",
                },
                autonomous=True,
            )
            _apply_action(shop_state, action)
            actions.append(action)
            _mark_triggered(shop_state, key)
            pricing_actions += 1

    # Trigger 5: Bestseller Milestone
    # Item total orders >= 5, once per item (permanent cooldown)
    for item in shop_state.strategy.menu:
        if item.name in shop_state.removed_items:
            continue

        total = _get_total_item_orders(shop_state, item.name)
        if total < 5:
            continue

        key = f"bestseller:{item.name}"
        # Permanent cooldown: check if ever triggered
        if key in shop_state.trigger_cooldowns:
            continue

        # Small 5-10% price nudge
        base = item.base_price
        current = shop_state.get_current_price(item.name) or base
        nudge_price = round(current * 1.07, 2)
        price_ceiling = round(base * (1 + MAX_MARKUP_PCT), 2)
        nudge_price = min(nudge_price, price_ceiling)

        action = ShopAction(
            action_type=ShopActionType.ADD_SPECIAL,
            description=(
                f"BESTSELLER: '{item.name}' hit {total} total orders! "
                f"Price nudge ${current:.2f} → ${nudge_price:.2f} (+7%)"
            ),
            details={
                "item_name": item.name,
                "new_price": nudge_price,
                "total_orders": total,
                "reason": f"Bestseller milestone — {total} orders",
            },
            autonomous=True,
        )
        # Apply the price nudge via current_prices
        shop_state.current_prices[item.name] = nudge_price
        shop_state.action_log.append(action)
        actions.append(action)
        _mark_triggered(shop_state, key)

    # Trigger 6: Cash Crisis
    if shop_state.cash_on_hand < MIN_CASH_RESERVE:
        key = "cash_crisis"
        if _can_trigger(shop_state, key, 15):
            action = _make_autonomous_decision(
                shop_state, client,
                trigger=f"CASH CRISIS: Only ${shop_state.cash_on_hand:.2f} on hand "
                        f"(minimum reserve is ${MIN_CASH_RESERVE:.2f}). "
                        f"Total revenue: ${shop_state.total_revenue:.2f}, "
                        f"total orders: {shop_state.total_orders}. "
                        f"Consider cutting an underperformer or raising prices."
            )
            if action:
                _apply_action(shop_state, action)
                actions.append(action)
                _mark_triggered(shop_state, key)

    return actions


# ─── Cooldown Helpers ────────────────────────────────────────────────────────

def _can_trigger(shop_state: ShopState, key: str, cooldown: int) -> bool:
    """Check if enough orders have passed since this trigger last fired."""
    last_fired = shop_state.trigger_cooldowns.get(key)
    if last_fired is None:
        return True
    return (shop_state.total_orders - last_fired) >= cooldown


def _mark_triggered(shop_state: ShopState, key: str):
    """Record that this trigger fired at the current order count."""
    shop_state.trigger_cooldowns[key] = shop_state.total_orders


# ─── Data Helpers ────────────────────────────────────────────────────────────

def _count_item_in_recent_orders(shop_state: ShopState, item_name: str, last_n: int) -> int:
    """Count how many times an item appears in the last N orders."""
    count = 0
    for order in shop_state.orders[-last_n:]:
        count += order.items.count(item_name)
    return count


def _get_items_not_ordered_recently(shop_state: ShopState, last_n: int) -> list[str]:
    """Get menu items with 0 orders in the last N orders."""
    recent_items = set()
    for order in shop_state.orders[-last_n:]:
        recent_items.update(order.items)

    slow = []
    for item in shop_state.strategy.menu:
        if item.name not in recent_items and item.name not in shop_state.removed_items:
            slow.append(item.name)
    return slow


def _get_total_item_orders(shop_state: ShopState, item_name: str) -> int:
    """Get lifetime order count for an item."""
    count = 0
    for order in shop_state.orders:
        count += order.items.count(item_name)
    return count


def _get_menu_item(shop_state: ShopState, item_name: str) -> Optional[MenuItem]:
    """Look up a MenuItem by name."""
    for item in shop_state.strategy.menu:
        if item.name == item_name:
            return item
    return None


# ─── LLM Decision Making ────────────────────────────────────────────────────

def _make_autonomous_decision(
    shop_state: ShopState,
    client: LLMClient,
    trigger: str,
) -> Optional[ShopAction]:
    """Ask the LLM to make an autonomous operational decision."""
    # Format inventory
    inv_lines = []
    for inv in shop_state.inventory:
        status = "OUT" if inv.is_out else ("LOW" if inv.is_low else "OK")
        inv_lines.append(
            f"  {inv.menu_item_name}: {inv.quantity_remaining}/{inv.max_capacity} "
            f"[{status}] (cost: ${inv.unit_cost:.2f}/unit, threshold: {inv.restock_threshold})"
        )

    # Per-item sales breakdown
    sales_lines = []
    for item in shop_state.strategy.menu:
        total = _get_total_item_orders(shop_state, item.name)
        recent = _count_item_in_recent_orders(shop_state, item.name, 15)
        pct = (total / shop_state.total_orders * 100) if shop_state.total_orders > 0 else 0
        current_price = shop_state.get_current_price(item.name) or item.base_price
        margin = ((current_price - item.cost_to_make) / current_price * 100) if current_price > 0 else 0
        sales_lines.append(
            f"  {item.name}: {total} total, {recent} in last 15 "
            f"({pct:.0f}% of orders), margin {margin:.0f}%"
        )

    # Price adjustments
    price_lines = []
    for item_name, price in shop_state.current_prices.items():
        base = next((i.base_price for i in shop_state.strategy.menu if i.name == item_name), 0)
        diff = price - base
        price_lines.append(f"  {item_name}: ${price:.2f} ({'+' if diff >= 0 else ''}{diff:.2f} from base)")

    avg_order = (shop_state.total_revenue / shop_state.total_orders) if shop_state.total_orders > 0 else 0

    system = AUTONOMOUS_SYSTEM_PROMPT.format(
        business_name=shop_state.strategy.business_name,
    )

    prompt = AUTONOMOUS_PROMPT_TEMPLATE.format(
        inventory_status="\n".join(inv_lines) if inv_lines else "  No inventory data",
        sales_breakdown="\n".join(sales_lines) if sales_lines else "  No sales data yet",
        total_revenue=shop_state.total_revenue,
        cash_on_hand=shop_state.cash_on_hand,
        total_orders=shop_state.total_orders,
        avg_order_value=avg_order,
        price_adjustments="\n".join(price_lines) if price_lines else "  No adjustments (all base prices)",
        trigger=trigger,
    )

    response = client.complete_json(
        prompt=prompt,
        system=system,
        max_tokens=512,
        temperature=0.4,
    )

    if not response.parsed_json:
        return None

    data = response.parsed_json
    try:
        action_type = ShopActionType(data.get("action_type", "adjust_price"))
        return ShopAction(
            action_type=action_type,
            description=data.get("description", "Autonomous decision"),
            details=data.get("details", {}),
            autonomous=True,
        )
    except (ValueError, KeyError):
        return None


# ─── Action Application with Guardrails ──────────────────────────────────────

def _apply_action(shop_state: ShopState, action: ShopAction):
    """Apply an autonomous action to the shop state. All guardrails enforced here."""
    details = action.details

    if action.action_type == ShopActionType.ADJUST_PRICE:
        item_name = details.get("item_name", "")
        new_price = float(details.get("new_price", 0))
        menu_item = _get_menu_item(shop_state, item_name)

        if item_name and new_price > 0 and menu_item:
            # Price guardrails
            price_floor = round(menu_item.cost_to_make * MIN_MARGIN_MULTIPLIER, 2)
            price_ceiling = round(menu_item.base_price * (1 + MAX_MARKUP_PCT), 2)
            new_price = max(new_price, price_floor)
            new_price = min(new_price, price_ceiling)
            new_price = round(new_price, 2)
            shop_state.current_prices[item_name] = new_price

    elif action.action_type == ShopActionType.REMOVE_ITEM:
        item_name = details.get("item_name", "")
        if item_name and item_name not in shop_state.removed_items:
            shop_state.removed_items.append(item_name)

    elif action.action_type == ShopActionType.RESTOCK:
        item_name = details.get("item_name", "")
        quantity = int(details.get("quantity", 0))
        for inv in shop_state.inventory:
            if inv.menu_item_name == item_name:
                # Clamp quantity to not exceed max_capacity
                space = inv.max_capacity - inv.quantity_remaining
                quantity = min(quantity, space)
                if quantity <= 0:
                    break

                cost = inv.unit_cost * quantity

                # Restock guardrails
                if cost > shop_state.cash_on_hand - MIN_CASH_RESERVE:
                    break  # Maintain reserve
                if cost > shop_state.cash_on_hand * MAX_RESTOCK_SPEND_PCT:
                    break  # Don't blow budget

                inv.quantity_remaining += quantity
                shop_state.cash_on_hand -= cost

                # If it was removed due to stock, put it back
                if item_name in shop_state.removed_items:
                    shop_state.removed_items.remove(item_name)
                break

    shop_state.action_log.append(action)


def _decrement_inventory(shop_state: ShopState, item_name: str):
    """Remove one unit from inventory for an ordered item."""
    for inv in shop_state.inventory:
        if inv.menu_item_name == item_name:
            inv.quantity_remaining = max(0, inv.quantity_remaining - 1)
            break
