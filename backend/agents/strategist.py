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

STRATEGY_PROMPT_TEMPLATE = """Given this business concept, create a complete food truck operating plan.

{concept}

Generate a detailed strategy as JSON with this exact structure:
{{
    "business_name": "Creative, memorable name",
    "tagline": "Short catchy tagline",
    "menu": [
        {{
            "name": "Item Name",
            "description": "Brief appetizing description",
            "category": "entree|side|drink|dessert",
            "base_price": 0.00,
            "cost_to_make": 0.00,
            "prep_time_minutes": 0,
            "tags": ["vegetarian", "spicy", "gluten-free", etc.]
        }}
    ],
    "target_demographic_summary": "2-3 sentences about who your customers are",
    "pricing_rationale": "Why these price points work for this market",
    "operating_hours": "e.g. 11am-8pm",
    "location_rationale": "Why this specific location/area works",
    "competitive_advantage": "What makes this truck win"
}}

Requirements:
- Menu should have 5-8 items across categories
- Every item must have realistic cost_to_make (30-40% of price for a food truck)
- Prices should reflect the local market (this is {location}, not NYC)
- Include at least one vegetarian option
- Include at least one option under $6
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
        max_tokens=4096,
        temperature=0.7,
    )

    if not response.parsed_json:
        raise ValueError(f"Failed to parse strategy JSON. Raw response:\n{response.raw_text[:500]}")

    return _parse_strategy(response.parsed_json)


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
        max_tokens=4096,
        temperature=0.5,  # Slightly more deterministic for refinement
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
