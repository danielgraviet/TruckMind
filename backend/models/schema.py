"""
TruckMind Data Contracts
========================
Every agent in the system communicates through these models.
If you change a model here, you're changing the API between agents.
Do it deliberately.

Design principle: agents are functions.
    Strategist:  BusinessConcept → Strategy
    CrowdGen:    Demographics → list[Persona]
    Simulator:   (Strategy, list[Persona]) → SimulationResult
    ShopAgent:   (Strategy, ShopState, CustomerMessage) → (ShopAction, ShopState)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import json
import uuid
from datetime import datetime


# =============================================================================
# PHASE 1: Business Concept (User Input → Strategist)
# =============================================================================

@dataclass
class BusinessConcept:
    """What the user gives us. Deliberately minimal."""
    description: str          # "Taco truck near BYU campus"
    location: str             # "Provo, UT"
    budget: Optional[float] = None  # Starting budget in dollars (optional)

    def to_prompt(self) -> str:
        parts = [f"Business concept: {self.description}", f"Location: {self.location}"]
        if self.budget:
            parts.append(f"Starting budget: ${self.budget:,.0f}")
        return "\n".join(parts)


# =============================================================================
# PHASE 2: Strategy (Strategist Output)
# =============================================================================

@dataclass
class MenuItem:
    name: str
    description: str
    category: str             # "entree", "side", "drink", "dessert"
    base_price: float         # dollars
    cost_to_make: float       # dollars (COGS)
    prep_time_minutes: int
    tags: list[str] = field(default_factory=list)  # "vegetarian", "spicy", "gluten-free"

    @property
    def margin(self) -> float:
        if self.base_price == 0:
            return 0.0
        return (self.base_price - self.cost_to_make) / self.base_price

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "base_price": self.base_price,
            "cost_to_make": self.cost_to_make,
            "prep_time_minutes": self.prep_time_minutes,
            "tags": self.tags,
            "margin": round(self.margin, 2),
        }


@dataclass
class Strategy:
    """The Strategist's output. A complete operating plan."""
    business_name: str
    tagline: str
    menu: list[MenuItem]
    target_demographic_summary: str   # free text description
    pricing_rationale: str            # why these prices
    operating_hours: str              # "11am-8pm"
    location_rationale: str           # why this specific spot
    competitive_advantage: str
    version: int = 1                  # incremented on refinement

    def to_dict(self) -> dict:
        return {
            "business_name": self.business_name,
            "tagline": self.tagline,
            "menu": [item.to_dict() for item in self.menu],
            "target_demographic_summary": self.target_demographic_summary,
            "pricing_rationale": self.pricing_rationale,
            "operating_hours": self.operating_hours,
            "location_rationale": self.location_rationale,
            "competitive_advantage": self.competitive_advantage,
            "version": self.version,
        }

    def menu_summary(self) -> str:
        """Human-readable menu for prompts."""
        lines = []
        for item in self.menu:
            lines.append(f"  - {item.name}: ${item.base_price:.2f} — {item.description} ({', '.join(item.tags)})")
        return "\n".join(lines)


# =============================================================================
# PHASE 3: Personas (CrowdGen Output)
# =============================================================================

class PriceSensitivity(str, Enum):
    LOW = "low"           # Will pay premium for quality
    MEDIUM = "medium"     # Price-conscious but flexible
    HIGH = "high"         # Very budget-driven

class MealPreference(str, Enum):
    QUICK = "quick"       # Wants fast, convenient
    SOCIAL = "social"     # Eating is a social activity
    HEALTH = "health"     # Prioritizes nutrition
    INDULGENT = "indulgent"  # Treats themselves

@dataclass
class Persona:
    """A synthetic customer. Must feel like a real person."""
    id: str
    name: str
    age: int
    occupation: str
    annual_income: int
    household_size: int
    neighborhood: str           # where they live relative to the truck

    # Behavioral attributes (the interesting stuff)
    price_sensitivity: PriceSensitivity
    meal_preference: MealPreference
    dietary_restrictions: list[str]    # "vegetarian", "gluten-free", etc.
    flavor_preferences: list[str]     # "spicy", "savory", "mild", etc.
    lunch_budget: float               # typical spend per meal, dollars
    visit_likelihood: str             # "daily", "weekly", "occasional", "unlikely"
    backstory: str                    # 2-3 sentences. Makes the persona feel real.

    # Derived from census data
    census_tract: Optional[str] = None
    education_level: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "occupation": self.occupation,
            "annual_income": self.annual_income,
            "household_size": self.household_size,
            "neighborhood": self.neighborhood,
            "price_sensitivity": self.price_sensitivity.value,
            "meal_preference": self.meal_preference.value,
            "dietary_restrictions": self.dietary_restrictions,
            "flavor_preferences": self.flavor_preferences,
            "lunch_budget": self.lunch_budget,
            "visit_likelihood": self.visit_likelihood,
            "backstory": self.backstory,
            "census_tract": self.census_tract,
            "education_level": self.education_level,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Persona":
        return cls(
            id=d["id"],
            name=d["name"],
            age=d["age"],
            occupation=d["occupation"],
            annual_income=d["annual_income"],
            household_size=d["household_size"],
            neighborhood=d["neighborhood"],
            price_sensitivity=PriceSensitivity(d["price_sensitivity"]),
            meal_preference=MealPreference(d["meal_preference"]),
            dietary_restrictions=d["dietary_restrictions"],
            flavor_preferences=d["flavor_preferences"],
            lunch_budget=d["lunch_budget"],
            visit_likelihood=d["visit_likelihood"],
            backstory=d["backstory"],
            census_tract=d.get("census_tract"),
            education_level=d.get("education_level"),
        )

    def to_prompt(self) -> str:
        """Render this persona for use in an LLM prompt."""
        return (
            f"{self.name}, {self.age}, {self.occupation}. "
            f"Income: ${self.annual_income:,}/yr. Household: {self.household_size}. "
            f"Lives in {self.neighborhood}. "
            f"Price sensitivity: {self.price_sensitivity.value}. "
            f"Meal style: {self.meal_preference.value}. "
            f"Diet: {', '.join(self.dietary_restrictions) or 'none'}. "
            f"Likes: {', '.join(self.flavor_preferences)}. "
            f"Typical lunch budget: ${self.lunch_budget:.2f}. "
            f"Background: {self.backstory}"
        )


# =============================================================================
# PHASE 4: Simulation (Simulator Output)
# =============================================================================

class Sentiment(str, Enum):
    EXCITED = "excited"       # "I'd go out of my way for this"
    POSITIVE = "positive"     # "Yeah, I'd try it"
    NEUTRAL = "neutral"       # "Maybe if I was nearby"
    NEGATIVE = "negative"     # "Not for me"
    HOSTILE = "hostile"       # "Who would pay that?"

@dataclass
class PersonaReaction:
    """One persona's reaction to the strategy. This is what the reaction board shows."""
    persona_id: str
    persona_name: str
    sentiment: Sentiment
    would_visit: bool
    likely_order: Optional[str]       # menu item name, or None
    max_willing_to_pay: Optional[float]
    feedback: str                     # 1-2 sentence reaction in their voice
    visit_frequency: str              # "daily", "weekly", "monthly", "never"

    def to_dict(self) -> dict:
        return {
            "persona_id": self.persona_id,
            "persona_name": self.persona_name,
            "sentiment": self.sentiment.value,
            "would_visit": self.would_visit,
            "likely_order": self.likely_order,
            "max_willing_to_pay": self.max_willing_to_pay,
            "feedback": self.feedback,
            "visit_frequency": self.visit_frequency,
        }


@dataclass
class MenuItemAnalysis:
    """Aggregated demand signal for a single menu item."""
    item_name: str
    demand_score: float          # 0-1, what fraction of personas would order this
    avg_willingness_to_pay: float
    price_too_high_pct: float    # fraction who think it's overpriced
    price_too_low_pct: float     # fraction who think it's suspiciously cheap
    suggested_price: float       # demand-optimized price point
    top_feedback_themes: list[str]

    def to_dict(self) -> dict:
        return {
            "item_name": self.item_name,
            "demand_score": round(self.demand_score, 3),
            "avg_willingness_to_pay": round(self.avg_willingness_to_pay, 2),
            "price_too_high_pct": round(self.price_too_high_pct, 3),
            "price_too_low_pct": round(self.price_too_low_pct, 3),
            "suggested_price": round(self.suggested_price, 2),
            "top_feedback_themes": self.top_feedback_themes,
        }


@dataclass
class SimulationResult:
    """The full output of one simulation round."""
    round_number: int
    strategy_version: int
    total_personas: int
    reactions: list[PersonaReaction]
    menu_analysis: list[MenuItemAnalysis]

    # Aggregate metrics
    overall_interest_rate: float    # % who would visit at all
    avg_sentiment_score: float      # -2 (hostile) to +2 (excited)
    projected_daily_customers: int
    projected_daily_revenue: float
    top_concerns: list[str]         # most common negative feedback themes
    top_strengths: list[str]        # most common positive feedback themes

    def to_dict(self) -> dict:
        return {
            "round_number": self.round_number,
            "strategy_version": self.strategy_version,
            "total_personas": self.total_personas,
            "reactions": [r.to_dict() for r in self.reactions],
            "menu_analysis": [m.to_dict() for m in self.menu_analysis],
            "overall_interest_rate": round(self.overall_interest_rate, 3),
            "avg_sentiment_score": round(self.avg_sentiment_score, 2),
            "projected_daily_customers": self.projected_daily_customers,
            "projected_daily_revenue": round(self.projected_daily_revenue, 2),
            "top_concerns": self.top_concerns,
            "top_strengths": self.top_strengths,
        }

    def summary(self) -> str:
        return (
            f"Round {self.round_number} | Strategy v{self.strategy_version}\n"
            f"  Interest rate: {self.overall_interest_rate:.0%}\n"
            f"  Avg sentiment: {self.avg_sentiment_score:+.2f}\n"
            f"  Projected daily customers: {self.projected_daily_customers}\n"
            f"  Projected daily revenue: ${self.projected_daily_revenue:,.2f}\n"
            f"  Top concerns: {', '.join(self.top_concerns[:3])}\n"
            f"  Top strengths: {', '.join(self.top_strengths[:3])}"
        )


# =============================================================================
# PHASE 5: Shop Operations (Live State)
# =============================================================================

@dataclass
class InventoryItem:
    menu_item_name: str
    quantity_remaining: int
    restock_threshold: int      # trigger autonomous restock decision below this
    max_capacity: int
    unit_cost: float            # cost to restock one unit

    @property
    def is_low(self) -> bool:
        return self.quantity_remaining <= self.restock_threshold

    @property
    def is_out(self) -> bool:
        return self.quantity_remaining <= 0

    def to_dict(self) -> dict:
        return {
            "menu_item_name": self.menu_item_name,
            "quantity_remaining": self.quantity_remaining,
            "restock_threshold": self.restock_threshold,
            "max_capacity": self.max_capacity,
            "unit_cost": self.unit_cost,
            "is_low": self.is_low,
            "is_out": self.is_out,
        }


@dataclass
class Order:
    id: str
    timestamp: str
    customer_name: str
    items: list[str]           # menu item names
    total_price: float
    status: str = "pending"    # "pending", "preparing", "ready", "completed"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "customer_name": self.customer_name,
            "items": self.items,
            "total_price": self.total_price,
            "status": self.status,
        }


class ShopActionType(str, Enum):
    TAKE_ORDER = "take_order"
    REJECT_ORDER = "reject_order"       # out of stock
    ADJUST_PRICE = "adjust_price"
    REMOVE_ITEM = "remove_item"         # temporarily remove from menu
    RESTOCK = "restock"
    ADD_SPECIAL = "add_special"         # add a limited-time item
    UPDATE_STATUS = "update_status"     # change order status

@dataclass
class ShopAction:
    """An autonomous decision made by the shop agent."""
    action_type: ShopActionType
    description: str                    # human-readable explanation
    details: dict = field(default_factory=dict)  # action-specific payload
    autonomous: bool = True             # was this decided by the AI without human input?

    def to_dict(self) -> dict:
        return {
            "action_type": self.action_type.value,
            "description": self.description,
            "details": self.details,
            "autonomous": self.autonomous,
        }


@dataclass
class ShopState:
    """The complete state of the running shop. Mutable."""
    strategy: Strategy
    inventory: list[InventoryItem]
    orders: list[Order] = field(default_factory=list)
    action_log: list[ShopAction] = field(default_factory=list)
    current_prices: dict[str, float] = field(default_factory=dict)  # overrides
    removed_items: list[str] = field(default_factory=list)
    total_revenue: float = 0.0
    total_orders: int = 0
    cash_on_hand: float = 500.0         # starting cash

    def get_active_menu(self) -> list[MenuItem]:
        """Menu items currently available (in stock + not removed)."""
        active = []
        inv_map = {i.menu_item_name: i for i in self.inventory}
        for item in self.strategy.menu:
            if item.name in self.removed_items:
                continue
            inv = inv_map.get(item.name)
            if inv and inv.is_out:
                continue
            active.append(item)
        return active

    def get_current_price(self, item_name: str) -> Optional[float]:
        """Get the current price (with any dynamic adjustments)."""
        if item_name in self.current_prices:
            return self.current_prices[item_name]
        for item in self.strategy.menu:
            if item.name == item_name:
                return item.base_price
        return None

    def active_menu_display(self) -> str:
        """Formatted menu for the customer-facing chat."""
        lines = [f"🚚 {self.strategy.business_name} — {self.strategy.tagline}", ""]
        for item in self.get_active_menu():
            price = self.get_current_price(item.name)
            tags = f" ({', '.join(item.tags)})" if item.tags else ""
            lines.append(f"  {item.name} — ${price:.2f}{tags}")
            lines.append(f"    {item.description}")
            lines.append("")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "active_menu": [i.to_dict() for i in self.get_active_menu()],
            "inventory": [i.to_dict() for i in self.inventory],
            "recent_orders": [o.to_dict() for o in self.orders[-10:]],
            "recent_actions": [a.to_dict() for a in self.action_log[-10:]],
            "current_prices": self.current_prices,
            "removed_items": self.removed_items,
            "total_revenue": round(self.total_revenue, 2),
            "total_orders": self.total_orders,
            "cash_on_hand": round(self.cash_on_hand, 2),
        }


# =============================================================================
# PIPELINE: Full orchestration state
# =============================================================================

@dataclass
class PipelineState:
    """Tracks the entire system's progress. Passed between orchestration steps."""
    concept: BusinessConcept
    strategy: Optional[Strategy] = None
    personas: list[Persona] = field(default_factory=list)
    simulation_results: list[SimulationResult] = field(default_factory=list)
    shop_state: Optional[ShopState] = None
    current_phase: str = "concept"  # concept → strategy → personas → simulation → shop

    def advance_to(self, phase: str):
        valid_phases = ["concept", "strategy", "personas", "simulation", "refinement", "shop"]
        if phase not in valid_phases:
            raise ValueError(f"Invalid phase: {phase}. Must be one of {valid_phases}")
        self.current_phase = phase
