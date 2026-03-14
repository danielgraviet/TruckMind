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
Authority: Fully autonomous with configurable rules (ShopRules) it cannot break.
No cashier mode -- real food trucks have human cashiers.
"""

import json
import re
from datetime import datetime
from typing import Optional
from models.schema import (
    Strategy, ShopState, ShopAction, ShopActionType,
    Order, InventoryItem, MenuItem, ShopRules,
)
from utils.llm_client import LLMClient
import uuid


# ─── Inventory defaults (fallback when category not in rules) ────────────────
_DEFAULT_INVENTORY = {"qty": 10, "threshold": 4, "max": 50}


# ─── Autonomous operations prompts ──────────────────────────────────────────

AUTONOMOUS_SYSTEM_PROMPT = """You are the autonomous operations manager for {business_name}.
You monitor sales, inventory, and finances in real-time.
You make decisive operational decisions: pricing adjustments, restocking, menu changes.

Every recommendation must include specific numbers: order counts, percentages, dollar amounts, margins.
Format: [Decision] — [Evidence with numbers] ([Projected impact])

Be concise. One decision per issue. No hedging."""

CASHIER_SYSTEM_PROMPTS = {
    "walk_up": "You are a friendly, quick food truck cashier at {business_name}. Keep responses under 2 sentences.\n\nMENU:\n{menu}",
    "text_order": "You are handling SMS orders for {business_name}. Be concise, include estimated wait time.\n\nMENU:\n{menu}",
    "escalation": "You are handling a difficult customer complaint at {business_name}. Be empathetic, explain policies clearly, offer reasonable compensation within rules.\n\nMENU:\n{menu}",
}

# Legacy default prompt (used when channel not specified or is "operations")
CASHIER_SYSTEM_PROMPT = """You are the friendly cashier at {business_name}. Help customers and take their orders.

MENU:
{menu}"""

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
        description=f"Order {order.id}: {', '.join(valid_items)} -- ${order.total_price:.2f}",
        details=order.to_dict(),
        autonomous=False,
    ))

    # 5. Evaluate fast triggers (sold-out, low stock)
    fast_actions = _evaluate_fast_triggers(shop_state, client)
    actions.extend(fast_actions)

    # 6. Periodic review every N orders (uses rules)
    if shop_state.total_orders % shop_state.rules.periodic_review_interval == 0:
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


def handle_customer(
    shop_state: ShopState,
    message: str,
    client: LLMClient,
    customer_name: str = "Customer",
    channel: str = "walk_up",
) -> tuple[str, list[ShopAction]]:
    """
    Handle a customer message (order or question) through the cashier LLM.

    Builds a cashier prompt with the live menu, sends to the LLM, and if the
    customer is ordering, creates an Order and runs it through process_order().

    Args:
        shop_state: Current shop state
        message: Customer message text
        client: LLM client
        customer_name: Name of the customer
        channel: Communication channel - "walk_up", "text_order", or "escalation"

    Returns:
        (cashier_message, list_of_actions) where actions include the order
        itself plus any autonomous actions triggered by processing it.
    """
    # Select the system prompt based on channel
    if channel in CASHIER_SYSTEM_PROMPTS:
        system = CASHIER_SYSTEM_PROMPTS[channel].format(
            business_name=shop_state.strategy.business_name,
            menu=shop_state.active_menu_display(),
        )
    else:
        system = CASHIER_SYSTEM_PROMPT.format(
            business_name=shop_state.strategy.business_name,
            menu=shop_state.active_menu_display(),
        )

    prompt = f'Customer says: "{message}"'

    response = client.complete_json(
        prompt=prompt,
        system=system,
        max_tokens=512,
        temperature=0.7,
    )

    if not response.parsed_json:
        return ("Sorry, I didn't catch that. What can I get for you?", [])

    data = response.parsed_json
    cashier_msg = data.get("message", "What can I get for you?")
    action = data.get("action", "none")
    actions: list[ShopAction] = []

    if action == ShopActionType.TAKE_ORDER.value:
        order_items = data.get("order_items", [])
        if order_items:
            order = Order(
                id=uuid.uuid4().hex[:8],
                timestamp=datetime.now().isoformat(),
                customer_name=customer_name,
                items=order_items,
                total_price=0.0,
            )
            actions = process_order(shop_state, order, client)
            # Tag all actions with the channel
            for a in actions:
                a.channel = channel

    return (cashier_msg, actions)


def initialize_shop(strategy: Strategy, starting_cash: float = 500.0, rules: Optional[ShopRules] = None) -> ShopState:
    """Create initial shop state from a finalized strategy with staggered inventory."""
    if rules is None:
        rules = ShopRules()

    inventory = []
    for item in strategy.menu:
        cat = item.category.lower()
        defaults = rules.category_inventory.get(cat, _DEFAULT_INVENTORY)
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
        rules=rules,
    )


# ─── Trigger Engine ─────────────────────────────────────────────────────────

def _evaluate_fast_triggers(shop_state: ShopState, client: LLMClient) -> list[ShopAction]:
    """
    Called after every order. Only checks urgent triggers:
    1. Sold Out -- auto-remove (exempt from action cap)
    2. Low Stock -- LLM decides restock or ride it out
    """
    actions = []
    rules = shop_state.rules

    # Trigger 1: Sold Out -- immediate auto-removal, exempt from cap
    for inv in shop_state.inventory:
        if inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            action = ShopAction(
                action_type=ShopActionType.REMOVE_ITEM,
                description=f"SOLD OUT: '{inv.menu_item_name}' removed from menu -- 0 units remaining.",
                details={"item_name": inv.menu_item_name, "reason": "out of stock"},
                autonomous=True,
                context_gathered=[
                    f"Inventory for '{inv.menu_item_name}': 0/{inv.max_capacity}",
                ],
                reasoning=f"Item '{inv.menu_item_name}' has 0 units remaining. Auto-removing from menu.",
                confidence=1.0,
            )
            shop_state.removed_items.append(inv.menu_item_name)
            shop_state.action_log.append(action)
            actions.append(action)

    # Trigger 2: Low Stock -- cooldown per item
    for inv in shop_state.inventory:
        if inv.is_low and not inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            key = f"low_stock:{inv.menu_item_name}"
            if not _can_trigger(shop_state, key, rules.cooldown_orders):
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
    rules = shop_state.rules

    # Trigger 3: Surge Pricing
    # Item ordered 5+ times in last 15 orders, no existing override above base
    if shop_state.total_orders >= rules.min_orders_for_trends:
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
            if not _can_trigger(shop_state, key, rules.cooldown_orders):
                continue

            # Rule-based surge: 15% increase, capped at max_markup_pct
            new_price = round(item.base_price * 1.15, 2)
            price_ceiling = round(item.base_price * (1 + rules.max_markup_pct), 2)
            new_price = min(new_price, price_ceiling)

            context = [
                f"Item '{item.name}' ordered {recent_count}x in last 15 orders",
                f"Current price: ${item.base_price:.2f}",
                f"Max markup allowed: {rules.max_markup_pct*100:.0f}%",
            ]
            options = [
                {"option": f"Raise price 15% to ${round(item.base_price * 1.15, 2):.2f}", "reason": "High demand justifies premium"},
                {"option": "Keep current price", "reason": "Maintain customer goodwill"},
                {"option": f"Raise price to ceiling ${price_ceiling:.2f}", "reason": "Maximize revenue from popular item"},
            ]

            action = ShopAction(
                action_type=ShopActionType.ADJUST_PRICE,
                description=(
                    f"SURGE: '{item.name}' ordered {recent_count}x in last 15 orders -- "
                    f"price ${item.base_price:.2f} -> ${new_price:.2f} (+{((new_price/item.base_price)-1)*100:.0f}%)"
                ),
                details={
                    "item_name": item.name,
                    "new_price": new_price,
                    "reason": f"High demand ({recent_count} in last 15 orders)",
                },
                autonomous=True,
                context_gathered=context,
                options_considered=options,
                reasoning=f"Item '{item.name}' has {recent_count} orders in last 15. Applying 15% surge capped at {rules.max_markup_pct*100:.0f}% markup. New price: ${new_price:.2f}.",
                confidence=0.85,
            )
            _apply_action(shop_state, action)
            actions.append(action)
            _mark_triggered(shop_state, key)
            pricing_actions += 1

    # Trigger 4: Slow Mover Discount
    # 0 orders in last 10, only if enough data
    if shop_state.total_orders >= rules.min_orders_for_trends:
        slow_movers = _get_items_not_ordered_recently(shop_state, 10)
        for item_name in slow_movers:
            if pricing_actions >= 1:
                break

            key = f"slow_mover:{item_name}"
            if not _can_trigger(shop_state, key, rules.cooldown_orders):
                continue

            menu_item = _get_menu_item(shop_state, item_name)
            if not menu_item:
                continue

            # Rule-based discount: 20%, floor at cost * min_margin_multiplier
            base = menu_item.base_price
            floor_price = round(menu_item.cost_to_make * rules.min_margin_multiplier, 2)
            new_price = round(base * 0.80, 2)
            new_price = max(new_price, floor_price)

            if new_price >= base:
                # Can't discount further -- escalate
                action = ShopAction(
                    action_type=ShopActionType.ADJUST_PRICE,
                    description=(
                        f"ESCALATION: Cannot discount '{item_name}' further -- "
                        f"floor price ${floor_price:.2f} >= base ${base:.2f}. "
                        f"Consider removing item from menu."
                    ),
                    details={
                        "item_name": item_name,
                        "attempted_price": new_price,
                        "floor_price": floor_price,
                        "reason": "Discount blocked by minimum margin rule",
                    },
                    autonomous=True,
                    escalated=True,
                    channel="escalation",
                    context_gathered=[
                        f"Item '{item_name}' has 0 orders in last 10",
                        f"Base price: ${base:.2f}, cost: ${menu_item.cost_to_make:.2f}",
                        f"Floor price (cost x {rules.min_margin_multiplier}): ${floor_price:.2f}",
                    ],
                    options_considered=[
                        {"option": f"Discount 20% to ${round(base * 0.80, 2):.2f}", "reason": "Stimulate demand"},
                        {"option": "Remove from menu", "reason": "Free up inventory budget"},
                    ],
                    reasoning=(
                        f"Attempted 20% discount on '{item_name}' but floor price ${floor_price:.2f} "
                        f">= base ${base:.2f}. The minimum margin rule (cost x {rules.min_margin_multiplier}) "
                        f"prevents any discount. Escalating for human review."
                    ),
                    confidence=0.4,
                )
                shop_state.action_log.append(action)
                actions.append(action)
                continue

            context = [
                f"Item '{item_name}' has 0 orders in last 10",
                f"Base price: ${base:.2f}, cost: ${menu_item.cost_to_make:.2f}",
                f"Min margin floor: ${floor_price:.2f}",
            ]
            options = [
                {"option": f"Discount 20% to ${new_price:.2f}", "reason": "Stimulate demand for slow mover"},
                {"option": "Keep current price", "reason": "May recover naturally"},
                {"option": "Remove from menu", "reason": "Free up inventory budget"},
            ]

            action = ShopAction(
                action_type=ShopActionType.ADJUST_PRICE,
                description=(
                    f"DISCOUNT: '{item_name}' has 0 orders in last 10 -- "
                    f"price ${base:.2f} -> ${new_price:.2f} (-{((1 - new_price/base))*100:.0f}%)"
                ),
                details={
                    "item_name": item_name,
                    "new_price": new_price,
                    "reason": "No orders in last 10 -- discounting to stimulate demand",
                },
                autonomous=True,
                context_gathered=context,
                options_considered=options,
                reasoning=f"Item '{item_name}' has zero orders in last 10. Applying 20% discount, floored at ${floor_price:.2f}. New price: ${new_price:.2f}.",
                confidence=0.7,
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
        price_ceiling = round(base * (1 + rules.max_markup_pct), 2)
        nudge_price = min(nudge_price, price_ceiling)

        action = ShopAction(
            action_type=ShopActionType.ADD_SPECIAL,
            description=(
                f"BESTSELLER: '{item.name}' hit {total} total orders! "
                f"Price nudge ${current:.2f} -> ${nudge_price:.2f} (+7%)"
            ),
            details={
                "item_name": item.name,
                "new_price": nudge_price,
                "total_orders": total,
                "reason": f"Bestseller milestone -- {total} orders",
            },
            autonomous=True,
            context_gathered=[
                f"Item '{item.name}' has {total} total orders",
                f"Current price: ${current:.2f}, base: ${base:.2f}",
                f"Price ceiling: ${price_ceiling:.2f}",
            ],
            options_considered=[
                {"option": f"Nudge price 7% to ${nudge_price:.2f}", "reason": "Proven demand supports higher price"},
                {"option": "Keep current price", "reason": "Reward loyal customers"},
            ],
            reasoning=f"Item '{item.name}' reached {total} orders -- bestseller milestone. Nudging price 7% from ${current:.2f} to ${nudge_price:.2f}, capped at ceiling ${price_ceiling:.2f}.",
            confidence=0.9,
        )
        # Apply the price nudge via current_prices
        shop_state.current_prices[item.name] = nudge_price
        shop_state.action_log.append(action)
        actions.append(action)
        _mark_triggered(shop_state, key)

    # Trigger 6: Cash Crisis
    if shop_state.cash_on_hand < rules.min_cash_reserve:
        key = "cash_crisis"
        if _can_trigger(shop_state, key, 15):
            action = _make_autonomous_decision(
                shop_state, client,
                trigger=f"CASH CRISIS: Only ${shop_state.cash_on_hand:.2f} on hand "
                        f"(minimum reserve is ${rules.min_cash_reserve:.2f}). "
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
    rules = shop_state.rules

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

    # Build context_gathered for the action
    context_gathered = [
        f"Total orders: {shop_state.total_orders}",
        f"Cash on hand: ${shop_state.cash_on_hand:.2f}",
        f"Total revenue: ${shop_state.total_revenue:.2f}",
        f"Avg order value: ${avg_order:.2f}",
    ]
    for inv in shop_state.inventory:
        if inv.is_out or inv.is_low:
            context_gathered.append(f"Inventory '{inv.menu_item_name}': {inv.quantity_remaining}/{inv.max_capacity}")

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

        # Build options_considered from LLM response if available
        options_considered = data.get("options_considered", [
            {"option": data.get("description", "LLM recommended action"), "reason": data.get("details", {}).get("reason", "")},
        ])

        return ShopAction(
            action_type=action_type,
            description=data.get("description", "Autonomous decision"),
            details=data.get("details", {}),
            autonomous=True,
            context_gathered=context_gathered,
            options_considered=options_considered,
            reasoning=data.get("description", "LLM-driven autonomous decision"),
            confidence=0.75,
        )
    except (ValueError, KeyError):
        return None


# ─── Action Application with Guardrails ──────────────────────────────────────

def _apply_action(shop_state: ShopState, action: ShopAction):
    """Apply an autonomous action to the shop state. All guardrails enforced here."""
    details = action.details
    rules = shop_state.rules

    if action.action_type == ShopActionType.ADJUST_PRICE:
        item_name = details.get("item_name", "")
        new_price = float(details.get("new_price", 0))
        menu_item = _get_menu_item(shop_state, item_name)

        if item_name and new_price > 0 and menu_item:
            # Price guardrails
            price_floor = round(menu_item.cost_to_make * rules.min_margin_multiplier, 2)
            price_ceiling = round(menu_item.base_price * (1 + rules.max_markup_pct), 2)
            original_requested = new_price

            new_price = max(new_price, price_floor)
            new_price = min(new_price, price_ceiling)
            new_price = round(new_price, 2)

            # If price was clamped, create escalation
            if new_price != round(original_requested, 2):
                action.escalated = True
                action.channel = "escalation"
                action.reasoning += (
                    f" [CLAMPED: Requested ${original_requested:.2f}, "
                    f"applied ${new_price:.2f} (floor=${price_floor:.2f}, ceiling=${price_ceiling:.2f})]"
                )
                action.confidence = max(action.confidence - 0.2, 0.0)

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
                if cost > shop_state.cash_on_hand - rules.min_cash_reserve:
                    # Escalate: can't restock without breaking reserve
                    action.escalated = True
                    action.channel = "escalation"
                    action.reasoning += (
                        f" [BLOCKED: Restock cost ${cost:.2f} would breach "
                        f"${rules.min_cash_reserve:.2f} cash reserve. "
                        f"Cash: ${shop_state.cash_on_hand:.2f}]"
                    )
                    action.confidence = 0.3
                    break  # Maintain reserve
                if cost > shop_state.cash_on_hand * rules.max_restock_spend_pct:
                    # Escalate: would exceed restock spend limit
                    action.escalated = True
                    action.channel = "escalation"
                    action.reasoning += (
                        f" [BLOCKED: Restock cost ${cost:.2f} exceeds "
                        f"{rules.max_restock_spend_pct*100:.0f}% of cash "
                        f"(${shop_state.cash_on_hand * rules.max_restock_spend_pct:.2f})]"
                    )
                    action.confidence = 0.3
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
