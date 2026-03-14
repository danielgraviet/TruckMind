"""
Agent: The Shop (Live Operations)
=================================
Input:  (ShopState, customer_message) or (ShopState, trigger_event)
Output: (response_message, list[ShopAction], updated ShopState)

This is where the AI actually runs the business.
Two modes:
1. CUSTOMER-FACING: Chat interface that takes orders
2. AUTONOMOUS: Background decisions (pricing, inventory, menu changes)
"""

import json
from datetime import datetime
from typing import Optional
from models.schema import (
    Strategy, ShopState, ShopAction, ShopActionType,
    Order, InventoryItem, MenuItem,
)
from utils.llm_client import LLMClient
import uuid


# ─── Customer-facing chat ────────────────────────────────────────────────────

CASHIER_SYSTEM_PROMPT = """You are the AI cashier for {business_name}, a food truck.
Your personality: friendly, efficient, and enthusiastic about the food.
You speak naturally — not robotic, not overly formal.

CURRENT MENU (only offer items on this list):
{active_menu}

RULES:
- Only take orders for items currently on the menu
- If something is sold out, apologize and suggest an alternative
- Confirm the order and total before completing
- If a customer asks for modifications, be accommodating but note them
- You can upsell (suggest drinks, sides) but don't be pushy
- If asked about ingredients/allergens, provide helpful info based on the menu tags
- Keep responses concise — this is a food truck, not a sit-down restaurant

Respond in JSON:
{{
    "message": "Your response to the customer",
    "action": "none|take_order|suggest_alternative",
    "order_items": ["item names if taking order"],
    "total": 0.00
}}"""

CASHIER_PROMPT_TEMPLATE = """Customer says: "{customer_message}"

Current shop status:
- Orders today: {total_orders}
- Revenue today: ${total_revenue:.2f}
- Low stock items: {low_stock}
- Sold out items: {sold_out}
"""


def handle_customer(
    shop_state: ShopState,
    customer_message: str,
    client: LLMClient,
    customer_name: str = "Customer",
) -> tuple[str, list[ShopAction]]:
    """
    Process a customer message and return a response + any actions taken.
    
    Returns:
        (response_text, list_of_actions)
    """
    # Build context
    active_menu = shop_state.active_menu_display()
    low_stock = [i.menu_item_name for i in shop_state.inventory if i.is_low and not i.is_out]
    sold_out = [i.menu_item_name for i in shop_state.inventory if i.is_out]
    sold_out += shop_state.removed_items

    system = CASHIER_SYSTEM_PROMPT.format(
        business_name=shop_state.strategy.business_name,
        active_menu=active_menu,
    )

    prompt = CASHIER_PROMPT_TEMPLATE.format(
        customer_message=customer_message,
        total_orders=shop_state.total_orders,
        total_revenue=shop_state.total_revenue,
        low_stock=", ".join(low_stock) if low_stock else "none",
        sold_out=", ".join(sold_out) if sold_out else "none",
    )

    response = client.complete_json(
        prompt=prompt,
        system=system,
        max_tokens=1024,
        temperature=0.7,
    )

    actions = []
    message = customer_message  # fallback

    if response.parsed_json:
        data = response.parsed_json
        message = data.get("message", "Sorry, let me try that again.")

        if data.get("action") == "take_order" and data.get("order_items"):
            order_items = data["order_items"]
            total = float(data.get("total", 0))

            # Validate items exist and are available
            active_names = {i.name for i in shop_state.get_active_menu()}
            valid_items = [item for item in order_items if item in active_names]

            if valid_items:
                # Calculate total from current prices if LLM got it wrong
                calculated_total = sum(
                    shop_state.get_current_price(item) or 0 for item in valid_items
                )
                total = calculated_total  # trust our math over LLM's

                # Create order
                order = Order(
                    id=f"ORD-{uuid.uuid4().hex[:6].upper()}",
                    timestamp=datetime.now().isoformat(),
                    customer_name=customer_name,
                    items=valid_items,
                    total_price=total,
                    status="preparing",
                )

                # Update state
                shop_state.orders.append(order)
                shop_state.total_orders += 1
                shop_state.total_revenue += total
                shop_state.cash_on_hand += total

                # Decrement inventory
                for item_name in valid_items:
                    _decrement_inventory(shop_state, item_name)

                actions.append(ShopAction(
                    action_type=ShopActionType.TAKE_ORDER,
                    description=f"Order {order.id}: {', '.join(valid_items)} — ${total:.2f}",
                    details=order.to_dict(),
                    autonomous=False,  # Customer-initiated
                ))

                # Check if this order triggered any inventory thresholds
                auto_actions = check_autonomous_triggers(shop_state, client)
                actions.extend(auto_actions)

    return message, actions


# ─── Autonomous operations ───────────────────────────────────────────────────

AUTONOMOUS_SYSTEM_PROMPT = """You are the AI operations manager for {business_name}, a food truck.
You make autonomous decisions about pricing, inventory, and menu availability.

You think like a smart business operator:
- If an item is selling fast, you might raise the price slightly (surge pricing)
- If an item isn't moving, you might discount it or remove it
- If inventory is low, you decide whether to restock (costs money) or let it sell out
- You consider cash on hand when making restock decisions
- You're always optimizing for profit while keeping customers happy

Be decisive. Make ONE clear recommendation per issue."""

AUTONOMOUS_PROMPT_TEMPLATE = """Current shop status:

INVENTORY:
{inventory_status}

SALES DATA:
- Total orders: {total_orders}
- Total revenue: ${total_revenue:.2f}
- Cash on hand: ${cash_on_hand:.2f}

RECENT ORDERS (last 10):
{recent_orders}

CURRENT PRICE ADJUSTMENTS:
{price_adjustments}

ISSUE TO ADDRESS:
{trigger}

What action should we take? Respond in JSON:
{{
    "action_type": "adjust_price|remove_item|restock|add_special",
    "description": "Human-readable explanation of your decision",
    "details": {{
        "item_name": "affected item",
        "new_price": 0.00,
        "quantity": 0,
        "reason": "why this decision"
    }}
}}"""


def check_autonomous_triggers(
    shop_state: ShopState,
    client: LLMClient,
) -> list[ShopAction]:
    """
    Check for conditions that should trigger autonomous decisions.
    Called after every order and periodically.
    """
    actions = []

    # Trigger 1: Low inventory
    for inv in shop_state.inventory:
        if inv.is_low and not inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            action = _make_autonomous_decision(
                shop_state, client,
                trigger=f"'{inv.menu_item_name}' is running low ({inv.quantity_remaining} remaining, threshold is {inv.restock_threshold}). "
                        f"Restocking would cost ${inv.unit_cost * (inv.max_capacity - inv.quantity_remaining):.2f}. "
                        f"We have ${shop_state.cash_on_hand:.2f} cash on hand."
            )
            if action:
                _apply_action(shop_state, action)
                actions.append(action)

    # Trigger 2: Out of stock
    for inv in shop_state.inventory:
        if inv.is_out and inv.menu_item_name not in shop_state.removed_items:
            action = ShopAction(
                action_type=ShopActionType.REMOVE_ITEM,
                description=f"Removed '{inv.menu_item_name}' from menu — sold out.",
                details={"item_name": inv.menu_item_name, "reason": "out of stock"},
                autonomous=True,
            )
            shop_state.removed_items.append(inv.menu_item_name)
            shop_state.action_log.append(action)
            actions.append(action)

    # Trigger 3: Surge pricing (if an item has been ordered a lot recently)
    recent_items = {}
    for order in shop_state.orders[-20:]:  # last 20 orders
        for item in order.items:
            recent_items[item] = recent_items.get(item, 0) + 1

    for item_name, count in recent_items.items():
        if count >= 8 and item_name not in shop_state.current_prices:
            # Item is hot — consider a price bump
            action = _make_autonomous_decision(
                shop_state, client,
                trigger=f"'{item_name}' has been ordered {count} times in the last 20 orders. "
                        f"Current price: ${shop_state.get_current_price(item_name):.2f}. "
                        f"Consider a surge price increase."
            )
            if action:
                _apply_action(shop_state, action)
                actions.append(action)

    return actions


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
        inv_lines.append(f"  {inv.menu_item_name}: {inv.quantity_remaining}/{inv.max_capacity} [{status}] (restock cost: ${inv.unit_cost:.2f}/unit)")

    # Format recent orders
    order_lines = []
    for order in shop_state.orders[-10:]:
        order_lines.append(f"  {order.id}: {', '.join(order.items)} — ${order.total_price:.2f}")

    # Format price adjustments
    price_lines = []
    for item, price in shop_state.current_prices.items():
        base = next((i.base_price for i in shop_state.strategy.menu if i.name == item), 0)
        diff = price - base
        price_lines.append(f"  {item}: ${price:.2f} ({'+' if diff >= 0 else ''}{diff:.2f} from base)")

    system = AUTONOMOUS_SYSTEM_PROMPT.format(
        business_name=shop_state.strategy.business_name,
    )

    prompt = AUTONOMOUS_PROMPT_TEMPLATE.format(
        inventory_status="\n".join(inv_lines) if inv_lines else "  No inventory data",
        total_orders=shop_state.total_orders,
        total_revenue=shop_state.total_revenue,
        cash_on_hand=shop_state.cash_on_hand,
        recent_orders="\n".join(order_lines) if order_lines else "  No orders yet",
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


def _apply_action(shop_state: ShopState, action: ShopAction):
    """Apply an autonomous action to the shop state."""
    details = action.details

    if action.action_type == ShopActionType.ADJUST_PRICE:
        item_name = details.get("item_name", "")
        new_price = float(details.get("new_price", 0))
        if item_name and new_price > 0:
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
                cost = inv.unit_cost * quantity
                if cost <= shop_state.cash_on_hand:
                    inv.quantity_remaining = min(inv.max_capacity, inv.quantity_remaining + quantity)
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


# ─── Shop initialization ────────────────────────────────────────────────────

def initialize_shop(strategy: Strategy, starting_cash: float = 500.0) -> ShopState:
    """Create initial shop state from a finalized strategy."""
    inventory = []
    for item in strategy.menu:
        # Default inventory: 30 units per item, restock at 5
        inventory.append(InventoryItem(
            menu_item_name=item.name,
            quantity_remaining=30,
            restock_threshold=5,
            max_capacity=50,
            unit_cost=item.cost_to_make,
        ))

    return ShopState(
        strategy=strategy,
        inventory=inventory,
        cash_on_hand=starting_cash,
    )
