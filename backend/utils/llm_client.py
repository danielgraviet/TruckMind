"""
LLM Client
==========
Two implementations:
  LLMClient     — real Anthropic Claude calls (requires ANTHROPIC_API_KEY in .env)
  MockLLMClient — deterministic fake responses for testing (no API calls, no key needed)

Both expose the same interface:
  .complete_json(prompt, system, max_tokens, temperature)       -> LLMResponse
  .complete_json_list(prompt, system, max_tokens, temperature)  -> LLMResponse
  .cost_report()                                                -> str

LLMResponse attributes:
  .parsed_json  — dict | list[dict] | None
  .raw_text     — str (full raw text from the model)
"""

import json
import os
import re
import random as _random
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()
from typing import Any, Optional

import anthropic


# =============================================================================
# RESPONSE TYPE
# =============================================================================

@dataclass
class LLMResponse:
    parsed_json: Optional[Any]   # dict or list[dict]; None if parse failed
    raw_text: str = ""


# =============================================================================
# JSON EXTRACTION UTILITY
# =============================================================================

def _extract_json(text: str, expect_list: bool = False) -> Optional[Any]:
    """
    Robustly extract a JSON object or array from LLM output.
    Handles: raw JSON, markdown code fences, JSON embedded in prose.
    """
    if not text:
        return None

    # Strip markdown code fences if present
    stripped = re.sub(r"^```(?:json)?\s*", "", text.strip())
    stripped = re.sub(r"\s*```$", "", stripped)

    # Try direct parse first
    try:
        result = json.loads(stripped)
        if expect_list:
            return result if isinstance(result, list) else None
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        pass

    # Scan the original text for the first matching open delimiter
    target_open = "[" if expect_list else "{"
    target_close = "]" if expect_list else "}"

    start = text.find(target_open)
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape_next = False

    for i, ch in enumerate(text[start:], start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
        if not in_string:
            if ch == target_open:
                depth += 1
            elif ch == target_close:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        return None
    return None


# =============================================================================
# REAL LLM CLIENT (Anthropic)
# =============================================================================

class LLMClient:
    """
    Anthropic Claude client. Reads ANTHROPIC_API_KEY from environment.

    Default model: claude-haiku-4-5-20251001 (fast + cheap for hackathon).
    Pass model="claude-sonnet-4-6" for higher quality output.
    """

    # (input_price, output_price) per million tokens
    _PRICING: dict[str, tuple[float, float]] = {
        "claude-haiku-4-5-20251001": (0.80, 4.00),
        "claude-sonnet-4-6": (3.00, 15.00),
        "claude-opus-4-6": (15.00, 75.00),
    }

    def __init__(self, model: str = "claude-haiku-4-5-20251001"):
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY not set. Add it to backend/.env or export it."
            )

        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._input_tokens = 0
        self._output_tokens = 0

    def complete_json(
        self,
        prompt: str,
        system: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        return self._call(prompt, system, max_tokens, temperature, expect_list=False)

    def complete_json_list(
        self,
        prompt: str,
        system: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        return self._call(prompt, system, max_tokens, temperature, expect_list=True)

    def _call(
        self,
        prompt: str,
        system: str,
        max_tokens: int,
        temperature: float,
        expect_list: bool,
    ) -> LLMResponse:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )

        self._input_tokens += response.usage.input_tokens
        self._output_tokens += response.usage.output_tokens

        raw = response.content[0].text
        parsed = _extract_json(raw, expect_list=expect_list)
        return LLMResponse(parsed_json=parsed, raw_text=raw)

    def cost_report(self) -> str:
        in_rate, out_rate = self._PRICING.get(self._model, (3.00, 15.00))
        in_cost = self._input_tokens * in_rate / 1_000_000
        out_cost = self._output_tokens * out_rate / 1_000_000
        total = in_cost + out_cost
        return (
            f"LLM cost: ${total:.4f} "
            f"({self._input_tokens:,} in / {self._output_tokens:,} out tokens)"
        )


# =============================================================================
# MOCK DATA
# =============================================================================

_MOCK_STRATEGY = {
    "business_name": "Comet Tacos",
    "tagline": "Orbit your hunger",
    "menu": [
        {
            "name": "Classic Street Taco",
            "description": "Seasoned beef, white onion, cilantro, salsa verde on corn tortilla",
            "category": "entree",
            "base_price": 3.50,
            "cost_to_make": 1.05,
            "prep_time_minutes": 2,
            "tags": ["spicy"],
        },
        {
            "name": "Grilled Chicken Taco",
            "description": "Marinated chicken, cabbage slaw, chipotle aioli, lime",
            "category": "entree",
            "base_price": 4.25,
            "cost_to_make": 1.40,
            "prep_time_minutes": 3,
            "tags": [],
        },
        {
            "name": "Black Bean Taco",
            "description": "Spiced black beans, roasted corn, avocado crema, pico de gallo",
            "category": "entree",
            "base_price": 3.75,
            "cost_to_make": 0.90,
            "prep_time_minutes": 2,
            "tags": ["vegetarian", "vegan"],
        },
        {
            "name": "Loaded Burrito",
            "description": "Rice, beans, cheese, sour cream, your choice of protein",
            "category": "entree",
            "base_price": 8.50,
            "cost_to_make": 2.80,
            "prep_time_minutes": 4,
            "tags": [],
        },
        {
            "name": "Chips & Salsa",
            "description": "House-made tortilla chips with fresh pico de gallo",
            "category": "side",
            "base_price": 2.50,
            "cost_to_make": 0.60,
            "prep_time_minutes": 1,
            "tags": ["vegetarian", "vegan", "gluten-free"],
        },
        {
            "name": "Horchata",
            "description": "Classic rice milk drink with cinnamon and vanilla",
            "category": "drink",
            "base_price": 3.00,
            "cost_to_make": 0.50,
            "prep_time_minutes": 1,
            "tags": ["vegetarian"],
        },
    ],
    "target_demographic_summary": (
        "BYU students and young professionals aged 18-35, price-conscious but quality-seeking. "
        "Secondary audience: faculty and families wanting fast, satisfying lunch options near campus."
    ),
    "pricing_rationale": (
        "Street tacos at $3.50-4.25 hit the sweet spot for student budgets. "
        "The burrito at $8.50 captures larger appetites. All items under $9 keeps the mental barrier low."
    ),
    "operating_hours": "11am-8pm",
    "location_rationale": (
        "BYU campus perimeter captures peak foot traffic between classes. "
        "Near Heritage Halls serves the residential student population in evenings."
    ),
    "competitive_advantage": (
        "Authentic street-style tacos with a tight, fast menu. Horchata differentiates from "
        "standard truck drinks. Vegan Black Bean Taco serves an underserved niche on campus."
    ),
}

# 20 diverse seed personas grounded in Provo, UT / BYU demographics.
# IDs are assigned by crowd.py (_parse_persona receives "seed-{i:03d}"),
# so these dicts intentionally omit the "id" field.
_MOCK_SEED_PERSONAS = [
    {
        "name": "Tyler Christensen", "age": 20,
        "occupation": "BYU sophomore", "annual_income": 11000,
        "household_size": 3, "neighborhood": "Heritage Halls",
        "price_sensitivity": "high", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "savory"],
        "lunch_budget": 5.50, "visit_likelihood": "daily",
        "backstory": "Idaho kid on a tight meal plan budget. Eats lunch between back-to-back econ and stats lectures. Values speed and spice above all else.",
        "education_level": "some_college",
    },
    {
        "name": "Emma Sorensen", "age": 22,
        "occupation": "BYU nursing student", "annual_income": 14000,
        "household_size": 2, "neighborhood": "Near campus apartments",
        "price_sensitivity": "high", "meal_preference": "health",
        "dietary_restrictions": ["gluten-free"], "flavor_preferences": ["mild", "fresh"],
        "lunch_budget": 7.00, "visit_likelihood": "weekly",
        "backstory": "Careful about gluten due to sensitivity. Wants clean, recognizable ingredients and eats lunch between clinical simulations.",
        "education_level": "some_college",
    },
    {
        "name": "Josh Nakamura", "age": 27,
        "occupation": "software engineer at local startup", "annual_income": 88000,
        "household_size": 1, "neighborhood": "Provo tech corridor",
        "price_sensitivity": "low", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "umami"],
        "lunch_budget": 15.00, "visit_likelihood": "weekly",
        "backstory": "Tokyo-born, moved to Utah for Silicon Slopes. Skips breakfast and wants a filling lunch fast. Has strong opinions about authentic tacos.",
        "education_level": "bachelors",
    },
    {
        "name": "Maria Garcia", "age": 35,
        "occupation": "elementary school teacher", "annual_income": 43000,
        "household_size": 4, "neighborhood": "East Provo",
        "price_sensitivity": "medium", "meal_preference": "social",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "mild"],
        "lunch_budget": 9.00, "visit_likelihood": "occasional",
        "backstory": "Grew up in a Mexican-American household. Has strong opinions about taco authenticity. Likes to grab lunch with fellow teachers on Fridays.",
        "education_level": "bachelors",
    },
    {
        "name": "Robert Whitmore", "age": 48,
        "occupation": "BYU professor of economics", "annual_income": 105000,
        "household_size": 5, "neighborhood": "Provo Heights",
        "price_sensitivity": "low", "meal_preference": "health",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "fresh"],
        "lunch_budget": 14.00, "visit_likelihood": "occasional",
        "backstory": "Meticulous about nutrition after a health scare at 44. Runs 5 miles every morning. Suspicious of street food but willing to try if it looks clean.",
        "education_level": "graduate",
    },
    {
        "name": "Rachel Kim", "age": 19,
        "occupation": "BYU freshman, undeclared", "annual_income": 9000,
        "household_size": 1, "neighborhood": "Helaman Halls",
        "price_sensitivity": "high", "meal_preference": "social",
        "dietary_restrictions": ["vegetarian"], "flavor_preferences": ["mild", "savory"],
        "lunch_budget": 5.00, "visit_likelihood": "weekly",
        "backstory": "First year away from home in Portland. Went vegetarian at 16. Budgets $5-6 per meal and loves eating with her floor group.",
        "education_level": "some_college",
    },
    {
        "name": "David Park", "age": 30,
        "occupation": "startup founder", "annual_income": 68000,
        "household_size": 1, "neighborhood": "Downtown Provo",
        "price_sensitivity": "low", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "bold"],
        "lunch_budget": 16.00, "visit_likelihood": "weekly",
        "backstory": "Building a logistics SaaS. Uses food trucks as a mental break. Judges everything on speed-to-quality ratio.",
        "education_level": "bachelors",
    },
    {
        "name": "Sarah Mitchell", "age": 32,
        "occupation": "stay-at-home mom / part-time Etsy seller", "annual_income": 52000,
        "household_size": 5, "neighborhood": "South Provo suburb",
        "price_sensitivity": "medium", "meal_preference": "social",
        "dietary_restrictions": [], "flavor_preferences": ["mild", "savory"],
        "lunch_budget": 10.00, "visit_likelihood": "occasional",
        "backstory": "Treats food truck visits as a fun family outing. Value-conscious — needs food everyone will eat including three picky kids.",
        "education_level": "some_college",
    },
    {
        "name": "Kevin Osei", "age": 24,
        "occupation": "BYU grad student in statistics", "annual_income": 22000,
        "household_size": 2, "neighborhood": "Near campus",
        "price_sensitivity": "high", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "hearty"],
        "lunch_budget": 7.50, "visit_likelihood": "weekly",
        "backstory": "International student from Ghana on a TA stipend. Cooks most meals but treats himself to lunch out on seminar days. Needs filling food that lasts through the afternoon.",
        "education_level": "graduate",
    },
    {
        "name": "Linda Sorenson", "age": 54,
        "occupation": "retired school librarian", "annual_income": 34000,
        "household_size": 2, "neighborhood": "North Provo",
        "price_sensitivity": "medium", "meal_preference": "social",
        "dietary_restrictions": [], "flavor_preferences": ["mild", "familiar"],
        "lunch_budget": 9.00, "visit_likelihood": "occasional",
        "backstory": "Enjoys leisurely lunches with her sister. Skeptical of unfamiliar cuisine but willing to try if it looks clean and staff is friendly.",
        "education_level": "bachelors",
    },
    {
        "name": "Marcus Wright", "age": 21,
        "occupation": "BYU junior, CS major", "annual_income": 10500,
        "household_size": 1, "neighborhood": "Campus housing",
        "price_sensitivity": "high", "meal_preference": "indulgent",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "cheesy", "bold"],
        "lunch_budget": 6.00, "visit_likelihood": "weekly",
        "backstory": "Skips breakfast and goes big at lunch. Watches food TikToks and has an opinion on every taco truck in Provo. Judges places purely on portion-per-dollar.",
        "education_level": "some_college",
    },
    {
        "name": "Ashley Nguyen", "age": 26,
        "occupation": "registered nurse, Utah Valley Hospital", "annual_income": 66000,
        "household_size": 1, "neighborhood": "Orem",
        "price_sensitivity": "medium", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "fresh"],
        "lunch_budget": 11.00, "visit_likelihood": "weekly",
        "backstory": "Works rotating shifts. Has exactly 30 minutes for lunch on most days. Speed and calories-per-minute is what matters — price is secondary.",
        "education_level": "bachelors",
    },
    {
        "name": "Carlos Rivera", "age": 34,
        "occupation": "construction foreman", "annual_income": 58000,
        "household_size": 4, "neighborhood": "West Provo",
        "price_sensitivity": "medium", "meal_preference": "indulgent",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "hearty", "savory"],
        "lunch_budget": 10.00, "visit_likelihood": "occasional",
        "backstory": "Mexican-American from a taco-loving family. Sets a high bar — will compare everything to his mom's cooking. Hates Americanized versions.",
        "education_level": "high_school",
    },
    {
        "name": "Stephanie Lee", "age": 28,
        "occupation": "UVU adjunct instructor", "annual_income": 29000,
        "household_size": 1, "neighborhood": "Orem",
        "price_sensitivity": "high", "meal_preference": "health",
        "dietary_restrictions": ["vegetarian"], "flavor_preferences": ["fresh", "citrus", "mild"],
        "lunch_budget": 7.00, "visit_likelihood": "weekly",
        "backstory": "Teaching English comp on a semester contract. Vegetarian for ethical reasons. Seeks plant-based options and appreciates labeled ingredients.",
        "education_level": "graduate",
    },
    {
        "name": "James Anderson", "age": 41,
        "occupation": "general contractor", "annual_income": 74000,
        "household_size": 3, "neighborhood": "Spanish Fork",
        "price_sensitivity": "medium", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "hearty"],
        "lunch_budget": 11.00, "visit_likelihood": "occasional",
        "backstory": "Drives to job sites across Utah County every day. Grabs lunch wherever the crew is. Loyal to places that are fast, filling, and don't require utensils.",
        "education_level": "high_school",
    },
    {
        "name": "Hannah Berg", "age": 20,
        "occupation": "BYU sophomore, exercise science", "annual_income": 10000,
        "household_size": 4, "neighborhood": "Heritage Halls",
        "price_sensitivity": "high", "meal_preference": "health",
        "dietary_restrictions": ["gluten-free"], "flavor_preferences": ["fresh", "light", "citrus"],
        "lunch_budget": 6.50, "visit_likelihood": "weekly",
        "backstory": "Celiac disease diagnosed at 15. Tracks macros carefully. Willing to pay slightly more for options that are genuinely gluten-free.",
        "education_level": "some_college",
    },
    {
        "name": "Michael Torres", "age": 29,
        "occupation": "youth pastor", "annual_income": 39000,
        "household_size": 3, "neighborhood": "Central Provo",
        "price_sensitivity": "medium", "meal_preference": "social",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "familiar"],
        "lunch_budget": 9.00, "visit_likelihood": "weekly",
        "backstory": "Often buys lunch for himself and a couple of youth group members. Looks for value meals and places that can handle a group quickly.",
        "education_level": "bachelors",
    },
    {
        "name": "Jessica Brown", "age": 24,
        "occupation": "dental assistant", "annual_income": 41000,
        "household_size": 2, "neighborhood": "Lindon",
        "price_sensitivity": "medium", "meal_preference": "quick",
        "dietary_restrictions": [], "flavor_preferences": ["savory", "mild"],
        "lunch_budget": 9.50, "visit_likelihood": "weekly",
        "backstory": "Works at a busy dental practice with a strict one-hour lunch window. Looks for something satisfying that won't make her feel sluggish at 2pm.",
        "education_level": "some_college",
    },
    {
        "name": "Samuel Price", "age": 18,
        "occupation": "BYU freshman, undeclared", "annual_income": 8000,
        "household_size": 1, "neighborhood": "Heritage Halls",
        "price_sensitivity": "high", "meal_preference": "indulgent",
        "dietary_restrictions": [], "flavor_preferences": ["spicy", "cheesy", "bold"],
        "lunch_budget": 5.00, "visit_likelihood": "daily",
        "backstory": "First time away from mom's cooking in rural Idaho. Eats a lot. Has $150/month for food after housing. Treats himself to a food truck once a week as his big splurge.",
        "education_level": "some_college",
    },
    {
        "name": "Patricia Olson", "age": 49,
        "occupation": "high school guidance counselor", "annual_income": 60000,
        "household_size": 2, "neighborhood": "North Orem",
        "price_sensitivity": "medium", "meal_preference": "health",
        "dietary_restrictions": [], "flavor_preferences": ["fresh", "savory", "light"],
        "lunch_budget": 11.00, "visit_likelihood": "occasional",
        "backstory": "Empty-nester recently prioritizing health. Tries new lunch spots on Fridays as a small weekly reward. Reads ingredient labels before ordering.",
        "education_level": "bachelors",
    },
]

_FEEDBACK_BY_SENTIMENT: dict[str, list[str]] = {
    "excited": [
        "This is exactly what I've been wanting around here!",
        "The prices are really fair — I'd be here all the time.",
        "Finally a food truck with real street-style tacos. I'm sold.",
        "Love the concept. I'd bring friends here for sure.",
    ],
    "positive": [
        "Looks solid. I'd stop by if I was in the area.",
        "Good value for what you're getting — I'd give it a shot.",
        "Not bad, the menu has some interesting choices.",
        "I'd probably come back for lunch again.",
    ],
    "neutral": [
        "It's fine, I guess. Nothing that really stands out to me.",
        "I'd consider it if nothing else was nearby.",
        "Might try it once, but probably wouldn't become a regular.",
        "Not really my style, but I can see the appeal.",
    ],
    "negative": [
        "A bit pricey for what it is, honestly.",
        "Not enough variety for my taste.",
        "Doesn't really fit what I'm looking for in a quick meal.",
        "I'd have to be pretty hungry to stop here.",
    ],
    "hostile": [
        "Way too expensive for a food truck. Hard pass.",
        "There are way better options in the area for less money.",
        "I don't get who this is for. Not me.",
    ],
}


# =============================================================================
# MOCK LLM CLIENT
# =============================================================================

class MockLLMClient:
    """
    Deterministic fake LLM client for testing without API calls.

    Detects which agent is calling based on system/prompt content and returns
    hardcoded but structurally correct responses. All pipeline phases complete
    successfully — no API key required.

    The simulation batch mock parses persona IDs directly from the prompt so
    the ScoringModel gets correctly keyed Tier 1 data for Tier 2 interpolation.
    """

    def __init__(self):
        self._call_count = 0

    def complete_json(
        self,
        prompt: str,
        system: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        self._call_count += 1
        data = self._dispatch_json(prompt, system)
        raw = json.dumps(data) if data is not None else ""
        return LLMResponse(parsed_json=data, raw_text=raw)

    def complete_json_list(
        self,
        prompt: str,
        system: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        self._call_count += 1
        data = self._dispatch_json_list(prompt, system)
        return LLMResponse(parsed_json=data, raw_text=json.dumps(data))

    def cost_report(self) -> str:
        return (
            f"MockLLMClient: {self._call_count} call(s) total — "
            f"$0.0000 (no real API calls made)"
        )

    # ── Dispatch ───────────────────────────────────────────────────────────

    def _dispatch_json(self, prompt: str, system: str) -> Optional[dict]:
        s = system.lower()
        if "food business strategist" in s:
            return _MOCK_STRATEGY
        if "cashier" in s:
            return self._mock_cashier(prompt, system)
        if "operations manager" in s:
            return self._mock_autonomous_decision()
        return None

    def _dispatch_json_list(self, prompt: str, system: str) -> list:
        s = system.lower()
        if "demographic researcher" in s:
            return _MOCK_SEED_PERSONAS
        if "react to this food truck" in prompt:
            return self._mock_simulation_batch(prompt)
        return []

    # ── Cashier mock ────────────────────────────────────────────────────────
    # Parses item names + prices from the live menu in the system prompt so
    # this works correctly regardless of what strategy was generated.

    def _mock_cashier(self, prompt: str, system: str) -> dict:
        # active_menu_display() format:  "  Item Name — $X.XX (tags)"
        items = re.findall(r"  ([\w][\w ,&'\-]+?) — \$([\d.]+)", system)

        customer_msg = ""
        match = re.search(r'Customer says: "([^"]+)"', prompt)
        if match:
            customer_msg = match.group(1).lower()

        order_triggers = ["want", "get", "have", "order", "give me", "take", "i'll", "please", "one", "two"]
        is_ordering = any(w in customer_msg for w in order_triggers) and bool(items)

        if is_ordering:
            name = items[0][0].strip()
            price = float(items[0][1])
            return {
                "message": f"Great choice! One {name} coming right up — that'll be ${price:.2f}.",
                "action": "take_order",
                "order_items": [name],
                "total": price,
            }

        if items:
            preview = ", ".join(n.strip() for n, _ in items[:3])
            return {
                "message": f"Welcome! We've got {preview} and more. What can I get for you?",
                "action": "none",
                "order_items": [],
                "total": 0.0,
            }

        return {
            "message": "Welcome! What can I get for you today?",
            "action": "none",
            "order_items": [],
            "total": 0.0,
        }

    # ── Autonomous decision mock ────────────────────────────────────────────

    def _mock_autonomous_decision(self) -> dict:
        return {
            "action_type": "restock",
            "description": "Restocking item to maintain service capacity through the lunch rush.",
            "details": {
                "item_name": "Classic Street Taco",
                "new_price": 0.0,
                "quantity": 20,
                "reason": "Inventory is below threshold; restocking is cost-effective given current cash on hand.",
            },
        }

    # ── Simulation batch mock ───────────────────────────────────────────────
    # Parses persona IDs from the batch prompt so the ScoringModel lookup
    # (persona_map.get(r.persona_id)) succeeds for all Tier 1 results.

    def _mock_simulation_batch(self, prompt: str) -> list[dict]:
        # Batch prompt format: "--- seed-001: Tyler Christensen, 20, ..."
        ids_and_names = re.findall(r"--- ([\w-]+): ([^,\n]+)", prompt)
        if not ids_and_names:
            return []

        # First menu item in the prompt for likely_order
        menu_match = re.search(r"MENU:\n  ([\w][\w ,&'\-]+?) —", prompt)
        first_item = menu_match.group(1).strip() if menu_match else "Classic Street Taco"

        # Cycle through sentiments with a bias toward positive
        sentiment_cycle = ["positive", "excited", "positive", "neutral", "negative", "positive"]
        freq_by_sentiment = {
            "excited": "weekly",
            "positive": "weekly",
            "neutral": "monthly",
            "negative": "never",
            "hostile": "never",
        }

        reactions = []
        for i, (pid, pname) in enumerate(ids_and_names):
            sentiment = sentiment_cycle[i % len(sentiment_cycle)]
            would_visit = sentiment in ("excited", "positive", "neutral")
            freq = freq_by_sentiment[sentiment] if would_visit else "never"
            feedback_pool = _FEEDBACK_BY_SENTIMENT[sentiment]
            feedback = feedback_pool[i % len(feedback_pool)]

            reactions.append({
                "persona_id": pid,
                "persona_name": pname.strip(),
                "sentiment": sentiment,
                "would_visit": would_visit,
                "likely_order": first_item if would_visit else None,
                "max_willing_to_pay": 4.25 if would_visit else 0.0,
                "feedback": feedback,
                "visit_frequency": freq,
            })

        return reactions
