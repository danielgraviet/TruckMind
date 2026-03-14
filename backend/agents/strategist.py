"""
Agent: The Strategist
=====================
Input:  BusinessConcept
Output: Strategy

Takes a one-line business idea and produces a complete operating plan:
menu, pricing, positioning, target demo. This is the first agent in the pipeline.
"""

from models.schema import BusinessConcept, Strategy, MenuItem
from utils.llm_client import LLMClient

SYSTEM_PROMPT = """You are an expert food business strategist. You design food truck concepts 
that are profitable, locally relevant, and differentiated.

You think about:
- Local demographics and what they actually eat and spend
- Food cost margins (aim for 65-75% gross margin on each item)
- Menu simplicity (a food truck should have 5-8 items max)
- Speed of service (average order should take <5 min to prepare)
- Competitive landscape (what else is nearby?)

You are decisive. You don't hedge. You make clear recommendations."""

STRATEGY_PROMPT_TEMPLATE = """Given this business concept, create a food truck operating plan as JSON.

{concept}

Return ONLY this JSON structure, no extra text:
{{
    "business_name": "Name",
    "tagline": "Tagline",
    "menu": [
        {{
            "name": "Item Name",
            "description": "10 words max",
            "category": "entree|side|drink|dessert",
            "base_price": 0.00,
            "cost_to_make": 0.00,
            "prep_time_minutes": 0,
            "tags": ["vegetarian", "spicy", "gluten-free"]
        }}
    ],
    "target_demographic_summary": "One sentence.",
    "pricing_rationale": "One sentence.",
    "operating_hours": "11am-8pm",
    "location_rationale": "One sentence.",
    "competitive_advantage": "One sentence."
}}

Rules:
- 5-8 menu items
- cost_to_make = 30-40% of base_price
- Prices fit {location} (college town, not NYC)
- At least one vegetarian option and one item under $6
"""

STRATEGY_OPTIONS_PROMPT_TEMPLATE = """Given this business concept, create THREE distinct food truck strategies as a JSON array.

{concept}

Each strategy must have a different positioning angle:
1. "value"   — Budget-friendly, high-volume. Prices 20-30% below market. Targets students/budget-conscious.
2. "premium" — Quality-first, smaller menu, higher margins. Targets professionals/foodies willing to pay more.
3. "niche"   — Hyper-specialized concept serving an underserved segment (dietary, cultural, etc.).

Return ONLY a JSON array with exactly 3 objects:
[
    {{
        "positioning": "value",
        "business_name": "Name",
        "tagline": "Tagline",
        "menu": [
            {{
                "name": "Item Name",
                "description": "10 words max",
                "category": "entree|side|drink|dessert",
                "base_price": 0.00,
                "cost_to_make": 0.00,
                "prep_time_minutes": 0,
                "tags": []
            }}
        ],
        "target_demographic_summary": "One sentence.",
        "pricing_rationale": "One sentence.",
        "operating_hours": "11am-8pm",
        "location_rationale": "One sentence.",
        "competitive_advantage": "One sentence."
    }},
    {{ ...premium... }},
    {{ ...niche... }}
]

Rules:
- 5-8 menu items per strategy
- cost_to_make = 30-40% of base_price
- Prices fit {location}
- Each strategy must feel GENUINELY DIFFERENT — different names, different menus, different price points
- At least one vegetarian option per strategy
"""

REFINEMENT_PROMPT_TEMPLATE = """You created this food truck strategy:

{strategy_json}

After testing it against {num_personas} synthetic customers, here are the results:

Overall interest rate: {interest_rate:.0%}
Average sentiment: {avg_sentiment:+.2f} (scale: -2 hostile to +2 excited)
Projected daily customers: {daily_customers}
Projected daily revenue: ${daily_revenue:,.2f}

Top concerns from customers:
{concerns}

Top strengths:
{strengths}

Menu item performance:
{menu_performance}

Based on this feedback, revise the strategy. You may:
- Adjust prices (up or down)
- Remove underperforming items
- Add new items that address unmet demand
- Adjust positioning or target demographic

Return the complete revised strategy in the same JSON format. Increment the version number."""


def create_strategy(concept: BusinessConcept, client: LLMClient) -> Strategy:
    """Generate initial strategy from a business concept."""
    prompt = STRATEGY_PROMPT_TEMPLATE.format(
        concept=concept.to_prompt(),
        location=concept.location,
    )

    response = client.complete_json(
        prompt=prompt,
        system=SYSTEM_PROMPT,
        max_tokens=1000,
        temperature=0.7,
    )

    if not response.parsed_json:
        raise ValueError(f"Failed to parse strategy JSON. Raw response:\n{response.raw_text[:500]}")

    return _parse_strategy(response.parsed_json)


def create_strategy_options(concept: BusinessConcept, client: LLMClient) -> list:
    """Generate 3 strategy options (value/premium/niche) in a single LLM call."""
    prompt = STRATEGY_OPTIONS_PROMPT_TEMPLATE.format(
        concept=concept.to_prompt(),
        location=concept.location,
    )

    response = client.complete_json_list(
        prompt=prompt,
        system=SYSTEM_PROMPT,
        max_tokens=3000,
        temperature=0.8,
    )

    if not response.parsed_json or not isinstance(response.parsed_json, list):
        raise ValueError(f"Failed to parse strategy options JSON. Raw:\n{response.raw_text[:500]}")

    strategies = []
    for data in response.parsed_json[:3]:
        s = _parse_strategy(data)
        s.positioning = data.get("positioning", "")
        strategies.append(s)

    return strategies


def refine_strategy(
    strategy: Strategy,
    simulation_result,  # SimulationResult — avoiding circular import
    client: LLMClient,
) -> Strategy:
    """Refine a strategy based on simulation feedback."""
    import json

    # Build menu performance summary
    menu_lines = []
    for item_analysis in simulation_result.menu_analysis:
        menu_lines.append(
            f"  - {item_analysis.item_name}: "
            f"demand={item_analysis.demand_score:.0%}, "
            f"avg willingness to pay=${item_analysis.avg_willingness_to_pay:.2f}, "
            f"current price=${_get_item_price(strategy, item_analysis.item_name):.2f}, "
            f"too expensive={item_analysis.price_too_high_pct:.0%}"
        )

    prompt = REFINEMENT_PROMPT_TEMPLATE.format(
        strategy_json=json.dumps(strategy.to_dict(), indent=2),
        num_personas=simulation_result.total_personas,
        interest_rate=simulation_result.overall_interest_rate,
        avg_sentiment=simulation_result.avg_sentiment_score,
        daily_customers=simulation_result.projected_daily_customers,
        daily_revenue=simulation_result.projected_daily_revenue,
        concerns="\n".join(f"  - {c}" for c in simulation_result.top_concerns),
        strengths="\n".join(f"  - {s}" for s in simulation_result.top_strengths),
        menu_performance="\n".join(menu_lines),
    )

    response = client.complete_json(
        prompt=prompt,
        system=SYSTEM_PROMPT,
        max_tokens=1000,
        temperature=0.5,
    )

    if not response.parsed_json:
        raise ValueError(f"Failed to parse refined strategy JSON. Raw:\n{response.raw_text[:500]}")

    refined = _parse_strategy(response.parsed_json)
    refined.version = strategy.version + 1
    return refined


def _parse_strategy(data: dict) -> Strategy:
    """Parse JSON dict into Strategy dataclass."""
    menu_items = []
    for item_data in data.get("menu", []):
        menu_items.append(MenuItem(
            name=item_data["name"],
            description=item_data.get("description", ""),
            category=item_data.get("category", "entree"),
            base_price=float(item_data.get("base_price", 0)),
            cost_to_make=float(item_data.get("cost_to_make", 0)),
            prep_time_minutes=int(item_data.get("prep_time_minutes", 5)),
            tags=item_data.get("tags", []),
        ))

    return Strategy(
        business_name=data.get("business_name", "Unnamed Truck"),
        tagline=data.get("tagline", ""),
        menu=menu_items,
        target_demographic_summary=data.get("target_demographic_summary", ""),
        pricing_rationale=data.get("pricing_rationale", ""),
        operating_hours=data.get("operating_hours", "11am-8pm"),
        location_rationale=data.get("location_rationale", ""),
        competitive_advantage=data.get("competitive_advantage", ""),
    )


def _get_item_price(strategy: Strategy, item_name: str) -> float:
    for item in strategy.menu:
        if item.name == item_name:
            return item.base_price
    return 0.0
