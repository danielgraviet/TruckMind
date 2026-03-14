"""
Customer Generation Engine
Generates synthetic customers for demo and live modes.
"""
import random
from dataclasses import dataclass, field
from typing import Optional

from agents.crowd import FIRST_NAMES, LAST_NAMES

COMPLAINT_SCENARIOS = [
    {"type": "wrong_order", "mood": "frustrated", "opener": "This isn't what I ordered!"},
    {"type": "price_complaint", "mood": "upset", "opener": "Why did the price change since I last ordered?"},
    {"type": "dietary_question", "mood": "concerned", "opener": "Is this item actually gluten-free?"},
    {"type": "wait_time", "mood": "impatient", "opener": "I've been waiting 20 minutes, where's my food?"},
    {"type": "quality_issue", "mood": "disappointed", "opener": "This taco is barely warm."},
]

@dataclass
class SyntheticCustomer:
    name: str
    channel: str  # walk_up, text_order, escalation
    opening_message: str
    mood: str = "neutral"  # neutral, happy, frustrated, upset, impatient
    preferred_items: list = field(default_factory=list)
    scenario: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "channel": self.channel,
            "opening_message": self.opening_message,
            "mood": self.mood,
            "preferred_items": self.preferred_items,
            "scenario": self.scenario,
        }


def generate_customer(strategy=None, shop_state=None, channel: str = None, rng: random.Random = None) -> SyntheticCustomer:
    """
    Generate a synthetic customer in demo mode.

    Channel distribution if not specified: 70% walk_up, 20% text_order, 10% escalation
    """
    if rng is None:
        rng = random.Random()

    name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"

    # Determine channel
    if channel is None:
        roll = rng.random()
        if roll < 0.70:
            channel = "walk_up"
        elif roll < 0.90:
            channel = "text_order"
        else:
            channel = "escalation"

    # Get available menu items
    menu_items = []
    if strategy and hasattr(strategy, 'menu'):
        menu_items = [item.name for item in strategy.menu]
    elif strategy and isinstance(strategy, dict):
        menu_items = [item.get('name', 'item') for item in strategy.get('menu', [])]

    if not menu_items:
        menu_items = ["Taco", "Burrito", "Quesadilla", "Chips", "Horchata"]

    # Build opening message
    if channel == "escalation":
        scenario = rng.choice(COMPLAINT_SCENARIOS)
        mood = scenario["mood"]
        opening_message = scenario["opener"]
        preferred_items = rng.sample(menu_items, min(2, len(menu_items)))
        return SyntheticCustomer(
            name=name,
            channel=channel,
            opening_message=opening_message,
            mood=mood,
            preferred_items=preferred_items,
            scenario=scenario,
        )
    elif channel == "text_order":
        num_items = rng.randint(1, 3)
        items = rng.sample(menu_items, min(num_items, len(menu_items)))
        opening_message = f"Hi, I'd like to order: {', '.join(items)}. How long will it take?"
        return SyntheticCustomer(
            name=name,
            channel=channel,
            opening_message=opening_message,
            mood="neutral",
            preferred_items=items,
        )
    else:  # walk_up
        num_items = rng.randint(1, 3)
        items = rng.sample(menu_items, min(num_items, len(menu_items)))
        openers = [
            f"Hey! Can I get {' and '.join(items)}?",
            f"I'll have {items[0]} please" + (f" and {items[1]}" if len(items) > 1 else ""),
            f"What's good today? I'm thinking {items[0]}.",
            f"Can I get {', '.join(items)}? To go please.",
        ]
        opening_message = rng.choice(openers)
        return SyntheticCustomer(
            name=name,
            channel=channel,
            opening_message=opening_message,
            mood=rng.choice(["neutral", "neutral", "neutral", "happy"]),
            preferred_items=items,
        )


def get_trickle_interval(hour: int, is_rush: bool = False) -> tuple[float, float]:
    """
    Returns (min_seconds, max_seconds) between customer arrivals based on time of day.
    """
    if is_rush:
        return (3.0, 5.0)

    # Peak hours: 11am-2pm, 5pm-8pm
    if 11 <= hour <= 14 or 17 <= hour <= 20:
        return (8.0, 12.0)
    # Slow hours: before 10am, after 9pm
    elif hour < 10 or hour > 21:
        return (15.0, 20.0)
    # Normal hours
    else:
        return (10.0, 15.0)
