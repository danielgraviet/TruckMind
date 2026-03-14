"""
Agent: The Crowd (Persona Generator)
=====================================
Input:  Demographics data + Strategy context
Output: list[Persona]

Two-phase generation:
1. SEED: LLM generates 15-25 detailed "seed" personas grounded in census data
2. EXPAND: Programmatic variation creates 200-400 total personas from seeds

This is the Silicon Sampling engine — the key differentiator.
"""

import json
import random
import hashlib
import pathlib
from typing import Optional
from models.schema import (
    Persona, Strategy, PriceSensitivity, MealPreference,
)
from utils.llm_client import LLMClient
import utils.census as census

# ─── Persona file cache ───────────────────────────────────────────────────────

_PERSONA_CACHE_FILE = pathlib.Path(__file__).parent.parent / ".cache" / "personas.json"

def _load_persona_cache() -> dict:
    try:
        return json.loads(_PERSONA_CACHE_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def _save_persona_cache(cache: dict) -> None:
    _PERSONA_CACHE_FILE.parent.mkdir(exist_ok=True)
    _PERSONA_CACHE_FILE.write_text(json.dumps(cache, indent=2))

def _persona_cache_key(location: str, strategy: Strategy, num_personas: int, num_seeds: int) -> str:
    """Hash on location + counts only — personas are reusable across concepts at the same city."""
    raw = f"{location}|{num_personas}|{num_seeds}"
    return hashlib.md5(raw.encode()).hexdigest()



# TODO: where should our caching layer sit? is it overkill to do Redis? 
CACHED_DEMOGRAPHICS = {
    "Provo, UT": {
        # Source: US Census ACS — actual API data
        "total_population": 115_496,
        "median_age": 23.4,
        "median_household_income": 60_139,
        "per_capita_income": 29_093,
        "poverty_rate": 0.274,
        "gender_split": {"male": 0.486, "female": 0.514},
        "race_ethnicity": {
            "white": 0.773,
            "black": 0.022,
            "asian": 0.025,
            "other_multi": 0.180,
            "hispanic_latino": 0.149,
        },
        "age_distribution": {
            "18-24": 0.42,   # BYU skews this hard
            "25-34": 0.22,
            "35-44": 0.12,
            "45-54": 0.09,
            "55-64": 0.08,
            "65+": 0.07,
        },
        "income_distribution": {
            "under_25k": 0.25,
            "25k-50k": 0.22,
            "50k-75k": 0.20,
            "75k-100k": 0.14,
            "100k-150k": 0.12,
            "150k_plus": 0.07,
        },
        "education_distribution": {
            "high_school": 0.137,
            "some_college": 0.216,
            "bachelors": 0.349,
            "graduate": 0.137,
        },
        "employment": {
            "labor_force": 71_439,
            "employed": 66_615,
            "unemployment_rate": 0.066,
        },
        "housing": {
            "median_home_value": 513_200,
            "median_gross_rent": 1_255,
            "total_households": 34_923,
            "family_households_pct": 0.641,
        },
        "notable_traits": [
            "Large university population (BYU ~34k students)",
            "Significant LDS/Mormon community",
            "Many young families (64% family households)",
            "Tech startup scene growing (Silicon Slopes adjacent)",
            "Outdoor recreation culture",
            "High poverty rate (27%) driven by student population",
            "High education levels despite low per-capita income",
            "Median rent $1,255 — housing cost pressure on students",
        ],
    },
    "Salt Lake City, UT": {
        "total_population": 200_000,
        "median_age": 32.0,
        "median_household_income": 60_000,
        "age_distribution": {
            "18-24": 0.15,
            "25-34": 0.28,
            "35-44": 0.20,
            "45-54": 0.15,
            "55-64": 0.12,
            "65+": 0.10,
        },
        "income_distribution": {
            "under_25k": 0.18,
            "25k-50k": 0.22,
            "50k-75k": 0.22,
            "75k-100k": 0.16,
            "100k-150k": 0.14,
            "150k_plus": 0.08,
        },
        "education_distribution": {
            "high_school": 0.12,
            "some_college": 0.25,
            "bachelors": 0.38,
            "graduate": 0.25,
        },
        "notable_traits": [
            "Growing tech hub (Silicon Slopes)",
            "More diverse than Provo",
            "Active food scene with food truck culture",
            "Young professional population",
            "Ski/outdoor culture influences spending",
        ],
    },
    "Orem, UT": {
        "total_population": 102_389,
        "median_age": 26.0,
        "median_household_income": 72_000,
        "per_capita_income": 27_000,
        "age_distribution": {
            "18-24": 0.30,
            "25-34": 0.22,
            "35-44": 0.15,
            "45-54": 0.12,
            "55-64": 0.10,
            "65+": 0.11,
        },
        "income_distribution": {
            "under_25k": 0.18,
            "25k-50k": 0.20,
            "50k-75k": 0.22,
            "75k-100k": 0.18,
            "100k-150k": 0.14,
            "150k_plus": 0.08,
        },
        "education_distribution": {
            "high_school": 0.14,
            "some_college": 0.25,
            "bachelors": 0.36,
            "graduate": 0.13,
        },
        "notable_traits": [
            "Adjacent to Provo/BYU corridor",
            "Mix of families and young professionals",
            "UVU campus population (~40k students)",
            "Growing suburban tech workforce",
        ],
    },
    "Logan, UT": {
        "total_population": 54_000,
        "median_age": 24.5,
        "median_household_income": 48_000,
        "per_capita_income": 20_000,
        "age_distribution": {
            "18-24": 0.38,
            "25-34": 0.20,
            "35-44": 0.12,
            "45-54": 0.10,
            "55-64": 0.10,
            "65+": 0.10,
        },
        "income_distribution": {
            "under_25k": 0.30,
            "25k-50k": 0.22,
            "50k-75k": 0.20,
            "75k-100k": 0.14,
            "100k-150k": 0.09,
            "150k_plus": 0.05,
        },
        "education_distribution": {
            "high_school": 0.14,
            "some_college": 0.24,
            "bachelors": 0.35,
            "graduate": 0.15,
        },
        "notable_traits": [
            "Utah State University campus (~29k students)",
            "High student population drives price sensitivity",
            "Outdoor recreation culture (Cache Valley)",
            "Lower income than Provo/SLC markets",
        ],
    },
    "Lehi, UT": {
        "total_population": 84_373,
        "median_age": 25.4,
        "median_household_income": 115_000,
        "per_capita_income": 36_500,
        "poverty_rate": 0.045,
        "gender_split": {"male": 0.505, "female": 0.495},
        "race_ethnicity": {
            "white": 0.841,
            "hispanic_latino": 0.075,
            "asian": 0.028,
            "black": 0.008,
            "other_multi": 0.048,
        },
        "age_distribution": {
            "18-24": 0.12,
            "25-34": 0.38,   # High concentration of young professionals
            "35-44": 0.25,
            "45-54": 0.12,
            "55-64": 0.08,
            "65+": 0.05,
        },
        "income_distribution": {
            "under_25k": 0.05,
            "25k-50k": 0.08,
            "50k-75k": 0.12,
            "75k-100k": 0.20,
            "100k-150k": 0.32,
            "150k_plus": 0.23,
        },
        "education_distribution": {
            "high_school": 0.10,
            "some_college": 0.24,
            "bachelors": 0.48,
            "graduate": 0.18,
        },
        "notable_traits": [
            "Heart of Silicon Slopes (high density of software engineers and tech workers)",
            "Very high median income with low price sensitivity",
            "Extremely high concentration of young families",
            "Rapid suburban growth and heavy commuter traffic",
        ],
    },
    "West Valley City, UT": {
        "total_population": 140_230,
        "median_age": 30.5,
        "median_household_income": 76_500,
        "per_capita_income": 25_400,
        "poverty_rate": 0.102,
        "gender_split": {"male": 0.51, "female": 0.49},
        "race_ethnicity": {
            "white": 0.420,
            "hispanic_latino": 0.390,
            "asian": 0.055,
            "pacific_islander": 0.040,
            "black": 0.025,
            "other_multi": 0.070,
        },
        "age_distribution": {
            "18-24": 0.15,
            "25-34": 0.25,
            "35-44": 0.22,
            "45-54": 0.18,
            "55-64": 0.12,
            "65+": 0.08,
        },
        "income_distribution": {
            "under_25k": 0.12,
            "25k-50k": 0.22,
            "50k-75k": 0.28,
            "75k-100k": 0.20,
            "100k-150k": 0.13,
            "150k_plus": 0.05,
        },
        "education_distribution": {
            "high_school": 0.40,
            "some_college": 0.35,
            "bachelors": 0.18,
            "graduate": 0.07,
        },
        "notable_traits": [
            "Most racially and ethnically diverse city in Utah",
            "Strong working-class and industrial employment base",
            "High concentration of Hispanic/Latino and Pacific Islander communities",
            "More budget-conscious consumer base, high demand for quick/casual dining",
        ],
    },
    "St. George, UT": {
        "total_population": 99_958,
        "median_age": 37.8,
        "median_household_income": 70_500,
        "per_capita_income": 32_100,
        "poverty_rate": 0.095,
        "gender_split": {"male": 0.49, "female": 0.51},
        "race_ethnicity": {
            "white": 0.810,
            "hispanic_latino": 0.125,
            "other_multi": 0.040,
            "asian": 0.010,
            "black": 0.015,
        },
        "age_distribution": {
            "18-24": 0.12,
            "25-34": 0.15,
            "35-44": 0.13,
            "45-54": 0.10,
            "55-64": 0.15,
            "65+": 0.35,  # Heavy retiree population
        },
        "income_distribution": {
            "under_25k": 0.15,
            "25k-50k": 0.22,
            "50k-75k": 0.22,
            "75k-100k": 0.16,
            "100k-150k": 0.15,
            "150k_plus": 0.10,
        },
        "education_distribution": {
            "high_school": 0.20,
            "some_college": 0.35,
            "bachelors": 0.30,
            "graduate": 0.15,
        },
        "notable_traits": [
            "Major retirement destination (very high 65+ demographic)",
            "Heavy tourism economy driven by nearby Zion National Park",
            "Seasonal population spikes (snowbirds) in winter months",
            "Diverse mix of wealthy retirees and lower-income service/hospitality workers",
        ],
    },
    "Park City, UT": {
        "total_population": 8_457,
        "median_age": 42.5,
        "median_household_income": 125_000,
        "per_capita_income": 82_000,
        "poverty_rate": 0.052,
        "gender_split": {"male": 0.52, "female": 0.48},
        "race_ethnicity": {
            "white": 0.825,
            "hispanic_latino": 0.140,
            "asian": 0.015,
            "other_multi": 0.015,
            "black": 0.005,
        },
        "age_distribution": {
            "18-24": 0.06,
            "25-34": 0.20,
            "35-44": 0.16,
            "45-54": 0.22,
            "55-64": 0.20,
            "65+": 0.16,
        },
        "income_distribution": {
            "under_25k": 0.08,
            "25k-50k": 0.12,
            "50k-75k": 0.15,
            "75k-100k": 0.12,
            "100k-150k": 0.20,
            "150k_plus": 0.33,
        },
        "education_distribution": {
            "high_school": 0.10,
            "some_college": 0.18,
            "bachelors": 0.45,
            "graduate": 0.27,
        },
        "notable_traits": [
            "Luxury resort town with massive tourist influx during ski season and Sundance",
            "Extremely high disposable income and low price sensitivity",
            "Demand for premium, high-quality, and niche dietary options (vegan, gluten-free)",
            "Significant divide between affluent residents and seasonal service workers",
        ],
    }
}


_GENERIC_DEMOGRAPHICS = {
    "total_population": 50_000,
    "median_age": 35,
    "median_household_income": 55_000,
    "per_capita_income": 0,
    "age_distribution": {"18-24": 0.15, "25-34": 0.25, "35-44": 0.20, "45-54": 0.18, "55-64": 0.12, "65+": 0.10},
    "income_distribution": {"under_25k": 0.20, "25k-50k": 0.25, "50k-75k": 0.22, "75k-100k": 0.15, "100k-150k": 0.12, "150k_plus": 0.06},
    "education_distribution": {"high_school": 0.15, "some_college": 0.25, "bachelors": 0.35, "graduate": 0.25},
    "notable_traits": [],
}


def get_demographics(location: str) -> dict:
    """
    Get demographic data for a location. Three-tier fallback:
      1. CACHED_DEMOGRAPHICS (Provo, SLC, Orem, Logan, etc.) — instant, no API call
      2. Live Census ACS API (works for any US city)
      3. Generic US average profile
    """
    # Tier 1: cached data — exact match
    if location in CACHED_DEMOGRAPHICS:
        return CACHED_DEMOGRAPHICS[location]

    # Tier 1: cached data — fuzzy match
    for key, data in CACHED_DEMOGRAPHICS.items():
        if location.lower() in key.lower() or key.lower() in location.lower():
            return data

    # Tier 2: live Census API
    try:
        city, state = census.parse_location(location)
        return census.fetch_demographics_sync(city, state)
    except Exception as e:
        print(f"  Census API unavailable for '{location}' ({e}), using generic profile.")

    # Tier 3: generic fallback
    return _GENERIC_DEMOGRAPHICS


# ─── Public entry point (cached) ─────────────────────────────────────────────

def generate_personas(
    location: str,
    strategy: Strategy,
    client: LLMClient,
    num_personas: int = 100,
    num_seeds: int = 20,
    on_persona: Optional[callable] = None,
) -> list[Persona]:
    """
    Generate a full persona crowd, using a file cache to skip LLM calls on
    repeat runs at the same location + counts, regardless of concept.

    on_persona(Persona) is called for each persona as it's created so the
    server can stream them to the frontend in real time.
    """
    cache = _load_persona_cache()
    key = _persona_cache_key(location, strategy, num_personas, num_seeds)

    if key in cache:
        print(f"  Persona cache hit — loading {num_personas} personas from disk")
        personas = [Persona.from_dict(d) for d in cache[key]]
        random.shuffle(personas)  # different faces appear each run
        if on_persona:
            for p in personas:
                on_persona(p)
        return personas

    print(f"  Persona cache miss — generating via LLM + expansion")
    seeds = generate_seed_personas(location, strategy, client, num_seeds=num_seeds, on_persona=on_persona)
    demographics = get_demographics(location)
    personas = expand_personas(seeds, num_personas, location, demographics, on_persona=on_persona)

    cache[key] = [p.to_dict() for p in personas]
    _save_persona_cache(cache)
    print(f"  Saved {len(personas)} personas to cache")

    return personas


# ─── Seed generation (LLM) ──────────────────────────────────────────────────

SEED_SYSTEM_PROMPT = """You are a demographic researcher creating realistic synthetic customer personas.
Each persona must feel like a real individual — not a stereotype or archetype.
Give them specific names, specific jobs, specific quirks. Make them human.
Ground them in the actual demographics of the location provided."""

SEED_PROMPT_TEMPLATE = """Generate {num_seeds} diverse, realistic customer personas for a food truck in {location}.

DEMOGRAPHIC CONTEXT:
- Population: {population:,}
- Median age: {median_age}
- Median household income: ${median_income:,}
- Age distribution: {age_dist}
- Income distribution: {income_dist}
- Education: {education_dist}
- Notable local traits: {traits}

CRITICAL RULES FOR DIVERSITY:
- Personas MUST match the statistical distribution above. If 42% of the population is 18-24, 
  roughly 42% of your personas should be 18-24.
- Include a range of income levels that matches the distribution.
- Mix of: students, professionals, retirees, families, singles.
- Some should be excited about this truck, some indifferent, some actively disinterested.
- Vary price sensitivity realistically with income (but not perfectly — some wealthy people are cheap, 
  some students splurge on food).
- Dietary restrictions MUST reflect real-world rates. In a group of 10 personas, AT MOST 1-2 should have any restriction. Most people (85%+) have an EMPTY dietary_restrictions list [].

Return a JSON array of persona objects:
{{
    "name": "Full Name",
    "age": 22,
    "occupation": "Specific job title",
    "annual_income": 35000,
    "household_size": 1,
    "neighborhood": "Specific area near {location}",
    "price_sensitivity": "low|medium|high",
    "meal_preference": "quick|social|health|indulgent",
    "dietary_restrictions": ["vegetarian"],
    "flavor_preferences": ["spicy", "savory"],
    "lunch_budget": 9.50,
    "visit_likelihood": "daily|weekly|occasional|unlikely",
    "backstory": "2-3 sentences that make this person feel real.",
    "education_level": "high_school|some_college|bachelors|graduate"
}}"""


def generate_seed_personas(
    location: str,
    strategy: Strategy,
    client: LLMClient,
    num_seeds: int = 20,
    on_persona: Optional[callable] = None,
) -> list[Persona]:
    """Generate seed personas via LLM, grounded in census demographics."""
    demographics = get_demographics(location)

    prompt = SEED_PROMPT_TEMPLATE.format(
        num_seeds=num_seeds,
        location=location,
        population=demographics["total_population"],
        median_age=demographics["median_age"],
        median_income=demographics["median_household_income"],
        age_dist=json.dumps(demographics["age_distribution"]),
        income_dist=json.dumps(demographics["income_distribution"]),
        education_dist=json.dumps(demographics["education_distribution"]),
        traits=", ".join(demographics.get("notable_traits", [])),
    )

    response = client.complete_json_list(
        prompt=prompt,
        system=SEED_SYSTEM_PROMPT,
        max_tokens=8000,
        temperature=0.8,  # Higher temp = more diversity
    )

    if not response.parsed_json or not isinstance(response.parsed_json, list):
        raise ValueError(f"Failed to parse seed personas. Raw:\n{response.raw_text[:500]}")

    personas = []
    for i, data in enumerate(response.parsed_json):
        try:
            p = _parse_persona(data, f"seed-{i:03d}")
            personas.append(p)
            if on_persona:
                on_persona(p)
        except (KeyError, ValueError) as e:
            print(f"Warning: skipping malformed persona {i}: {e}")
            continue

    return personas


# ─── Programmatic expansion ──────────────────────────────────────────────────

# Name pools for expansion (demographically appropriate for Utah)
FIRST_NAMES = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Jackson", "Sophia", "Lucas",
    "Isabella", "Oliver", "Mia", "Ethan", "Charlotte", "Aiden", "Amelia",
    "James", "Harper", "Benjamin", "Evelyn", "Mason", "Abigail", "Logan",
    "Emily", "Alexander", "Elizabeth", "Sebastian", "Sofia", "Jack", "Avery",
    "Daniel", "Ella", "Henry", "Scarlett", "Michael", "Grace", "Owen",
    "Chloe", "Samuel", "Victoria", "Ryan", "Riley", "Nathan", "Aria",
    "Caleb", "Lily", "Christian", "Aurora", "Dylan", "Zoey", "Isaac",
    "Maria", "Jose", "Carlos", "Ana", "Miguel", "Wei", "Mei",
    "Priya", "Raj", "Fatima", "Omar", "Yuki", "Kenji", "Seo-yeon",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas",
    "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez",
    "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
    "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall",
    "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Chen", "Kim",
    "Patel", "Singh", "Jensen", "Larsen", "Christensen", "Sorensen",
]

OCCUPATIONS_BY_AGE = {
    "18-24": [
        "BYU student", "UVU student", "barista at local coffee shop",
        "part-time retail worker", "intern at tech startup", "restaurant server",
        "freelance graphic designer", "Doordash driver", "ski instructor",
        "campus tour guide", "CS student", "nursing student",
    ],
    "25-34": [
        "software engineer", "marketing manager", "elementary school teacher",
        "dental hygienist", "startup founder", "project manager",
        "registered nurse", "real estate agent", "data analyst",
        "physical therapist", "accountant", "UX designer",
    ],
    "35-44": [
        "senior software engineer", "small business owner", "attorney",
        "school principal", "IT director", "operations manager",
        "construction foreman", "sales director", "family therapist",
        "orthodontist", "HR director", "product manager",
    ],
    "45-54": [
        "VP of engineering", "business consultant", "university professor",
        "financial advisor", "medical doctor", "regional sales manager",
        "general contractor", "insurance agent", "nonprofit director",
    ],
    "55-64": [
        "retired teacher", "semi-retired consultant", "executive director",
        "senior partner at law firm", "hospital administrator",
        "commercial real estate investor", "franchise owner",
    ],
    "65+": [
        "retired", "retired engineer", "retired school administrator",
        "part-time volunteer coordinator", "retired business owner",
    ],
}

# City-specific occupation overrides — used when a city's workforce differs
# significantly from the BYU/UVU-skewed default list above.
OCCUPATIONS_BY_AGE_OVERRIDES: dict[str, dict[str, list[str]]] = {
    "St. George, UT": {
        "18-24": [
            "Dixie State University student", "hotel front desk clerk",
            "restaurant server", "retail associate", "landscaping crew",
            "National Park guide", "part-time housekeeper", "delivery driver",
        ],
        "25-34": [
            "hospitality manager", "contractor", "dental hygienist",
            "real estate agent", "retail manager", "elementary school teacher",
            "outdoor tour guide", "medical assistant",
        ],
        "55-64": [
            "semi-retired contractor", "property manager", "golf course manager",
            "part-time real estate investor", "retired from out-of-state",
            "snowbird business owner", "franchise owner",
        ],
        "65+": [
            "retired snowbird", "retired professional", "part-time volunteer",
            "retired military", "seasonal resident", "retired executive",
        ],
    },
    "Park City, UT": {
        "18-24": [
            "ski resort lift operator", "ski patrol trainee", "barista",
            "resort hospitality staff", "part-time guide", "nanny/au pair",
            "outdoor gear shop associate", "film festival volunteer",
        ],
        "25-34": [
            "ski instructor", "real estate agent", "resort manager",
            "remote software engineer", "financial analyst (remote)",
            "personal trainer", "restaurant manager", "event planner",
        ],
        "35-44": [
            "resort director", "luxury real estate broker", "venture capitalist (remote)",
            "hedge fund manager (remote)", "startup founder", "film producer",
            "private equity analyst", "boutique hotel owner",
        ],
        "45-54": [
            "retired tech executive", "investment manager", "wealth advisor",
            "commercial real estate developer", "ski resort executive",
            "private equity partner", "successful entrepreneur",
        ],
        "55-64": [
            "semi-retired investor", "luxury real estate developer",
            "part-time consultant", "resort board member", "angel investor",
        ],
        "65+": [
            "retired executive", "retired athlete", "seasonal resident",
            "art gallery owner", "philanthropist", "retired surgeon",
        ],
    },
    "West Valley City, UT": {
        "18-24": [
            "warehouse associate", "delivery driver", "fast food worker",
            "retail associate", "construction laborer", "part-time mechanic",
            "SLCC student", "manufacturing line worker",
        ],
        "25-34": [
            "warehouse supervisor", "truck driver", "electrician",
            "HVAC technician", "plumber", "Amazon fulfillment worker",
            "medical assistant", "office manager",
        ],
        "35-44": [
            "construction foreman", "logistics coordinator", "small business owner",
            "electrician (journeyman)", "warehouse operations manager",
            "car mechanic shop owner", "restaurant owner",
        ],
    },
    "Logan, UT": {
        "18-24": [
            "Utah State University student", "USU research assistant",
            "part-time barista", "outdoor guide", "restaurant server",
            "farm/agriculture intern", "retail associate", "ski patrol",
        ],
        "25-34": [
            "agricultural researcher", "USU graduate student", "teacher",
            "engineer at local firm", "veterinarian", "physical therapist",
            "small business owner", "remote software developer",
        ],
    },
    "Lehi, UT": {
        "18-24": [
            "tech internship", "retail associate", "part-time software developer",
            "community college student", "startup QA tester", "delivery driver",
        ],
        "25-34": [
            "software engineer at Silicon Slopes company", "product manager",
            "cybersecurity analyst", "DevOps engineer", "data scientist",
            "SaaS sales rep", "startup founder", "UX researcher",
        ],
        "35-44": [
            "senior software engineer", "engineering manager", "VP of product",
            "startup CTO", "director of engineering", "tech company founder",
            "solutions architect", "principal engineer",
        ],
    },
}

NEIGHBORHOODS = {
    "Provo, UT": [
        "downtown Provo", "near BYU campus", "Joaquin neighborhood",
        "Grandview", "North Provo", "Edgemont", "Sunset", "Spring Creek",
        "south Provo near the mall", "Riverwoods area",
    ],
    "Salt Lake City, UT": [
        "Sugar House", "downtown SLC", "The Avenues", "Capitol Hill",
        "Liberty Park area", "9th and 9th", "Marmalade District",
        "East Bench", "Rose Park", "Poplar Grove",
    ],
    "Orem, UT": [
        "near UVU campus", "University Parkway corridor", "Center Street area",
        "State Street corridor", "North Orem", "South Orem", "Cascade",
        "Sharon Park", "near Orem Fitness District", "Geneva Road area",
    ],
    "Logan, UT": [
        "near USU campus", "downtown Logan", "North Logan",
        "Providence", "River Heights", "Hyde Park", "Smithfield",
        "Millville", "Cache Valley floor", "east bench above Logan",
    ],
    "Lehi, UT": [
        "Silicon Slopes corridor", "Traverse Mountain", "Thanksgiving Point area",
        "North Lehi", "Scott's Pond", "I-15 corridor", "Holbrook Farms",
        "American Fork border", "Lehi Crossing", "Saddleback",
    ],
    "West Valley City, UT": [
        "Hunter", "Granger", "Chesterfield", "Stonebridge",
        "Redwood Road corridor", "Valley Fair area", "West Pointe",
        "Fairbourne Station", "Copper Hills border", "West Jordan border",
    ],
    "St. George, UT": [
        "downtown St. George", "Bloomington Hills", "Sunriver",
        "Entrada", "Little Valley", "Washington City", "Hurricane area",
        "Snow Canyon area", "Southgate", "Desert Color",
    ],
    "Park City, UT": [
        "Old Town Park City", "Deer Valley", "Kimball Junction",
        "Prospector", "Sun Peak", "Pinebrook", "Jeremy Ranch",
        "Snyderville Basin", "Quarry Mountain", "Silver Springs",
    ],
}

BACKSTORY_FRAGMENTS = [
    "Moved here {years} years ago from {origin}.",
    "Born and raised in the area.",
    "Just started a new job at {company}.",
    "Has {kids} kids and is always looking for quick meal options.",
    "Tries to eat healthy but has a weakness for {weakness}.",
    "Usually brings lunch from home but sometimes treats themselves.",
    "Eats out almost every day because they hate cooking.",
    "On a tight budget this month due to {reason}.",
    "Big foodie who follows local food trucks on Instagram.",
    "Doesn't pay much attention to food trends, just wants something filling.",
    "Training for a marathon and watches their macros carefully.",
    "Works from home and loves any excuse to get outside for lunch.",
]


def expand_personas(
    seeds: list[Persona],
    target_count: int,
    location: str,
    demographics: Optional[dict] = None,
    on_persona: Optional[callable] = None,
) -> list[Persona]:
    """
    Programmatically expand seed personas to target count.
    
    Strategy:
    - Each seed becomes a "cluster center"
    - We create variations by perturbing attributes within realistic ranges
    - Statistical distributions are enforced to match census data
    """
    if demographics is None:
        demographics = get_demographics(location)

    neighborhoods = NEIGHBORHOODS.get(location, ["near " + location])
    all_personas = list(seeds)  # Start with seeds
    variations_per_seed = max(1, (target_count - len(seeds)) // len(seeds))

    # TODO: is it best practice to replace this with module level _rng? 
    rng = random.Random(42)  # Deterministic for reproducibility

    for seed in seeds:
        for v in range(variations_per_seed):
            if len(all_personas) >= target_count:
                break
            variant = _create_variant(seed, v, rng, demographics, neighborhoods, location)
            all_personas.append(variant)
            if on_persona:
                on_persona(variant)

    # Fill any remaining gap with random combinations
    while len(all_personas) < target_count:
        base_seed = rng.choice(seeds)
        v = len(all_personas)
        variant = _create_variant(base_seed, v, rng, demographics, neighborhoods, location)
        all_personas.append(variant)
        if on_persona:
            on_persona(variant)
    
    # lets adjust this to create the list, then return. this return signature feels clunky. 

    return all_personas[:target_count]


def _create_variant(
    seed: Persona,
    variant_num: int,
    rng: random.Random, # TODO: because this files uses a rng, we should declare a module level one initialized at the top.
    demographics: dict,
    neighborhoods: list[str],
    location: str, # TODO: remove if not used. 
) -> Persona:
    """Create a single variant of a seed persona."""

    # Sample age from demographic distribution
    age_bracket = _weighted_choice(demographics["age_distribution"], rng)
    age = _sample_age_from_bracket(age_bracket, rng)

    # Sample income from distribution
    income_bracket = _weighted_choice(demographics["income_distribution"], rng)
    income = _sample_income_from_bracket(income_bracket, rng)

    # Derive price sensitivity from income (with noise)
    price_sensitivity = _derive_price_sensitivity(income, rng)

    # Pick occupation appropriate to age, using city-specific list when available
    city_occupations = OCCUPATIONS_BY_AGE_OVERRIDES.get(location, {})
    occupation_pool = city_occupations.get(age_bracket) or OCCUPATIONS_BY_AGE.get(age_bracket, ["professional"])
    occupation = rng.choice(occupation_pool)

    # Generate name
    first = rng.choice(FIRST_NAMES)
    last = rng.choice(LAST_NAMES)
    name = f"{first} {last}"

    # Perturb other attributes from seed
    meal_pref = rng.choice(list(MealPreference)) if rng.random() > 0.5 else seed.meal_preference

    # Dietary restrictions: mostly none, occasionally something
    # TODO: is this grounded with statistics or random? 
    diet_roll = rng.random()
    if diet_roll < 0.06:
        dietary = ["vegetarian"]
    elif diet_roll < 0.08:
        dietary = ["vegan"]
    elif diet_roll < 0.14:
        dietary = ["gluten-free"]
    elif diet_roll < 0.16:
        dietary = rng.sample(seed.dietary_restrictions, min(1, len(seed.dietary_restrictions)))
    else:
        dietary = []

    # Flavor preferences: mix seed's with some randomness
    all_flavors = ["spicy", "savory", "mild", "sweet", "tangy", "smoky", "fresh", "rich", "umami"]
    if rng.random() > 0.4:
        flavors = rng.sample(all_flavors, rng.randint(1, 3))
    else:
        flavors = list(seed.flavor_preferences)

    # Lunch budget correlates with income
    base_budget = income / 5000  # rough: $35k income → ~$7 budget
    lunch_budget = round(max(4.0, min(25.0, base_budget + rng.gauss(0, 2))), 2)

    # Visit likelihood
    likelihoods = ["daily", "weekly", "occasional", "unlikely"]
    visit = rng.choice(likelihoods)

    # Household size correlates with age
    if age < 25:
        hh_size = rng.choice([1, 1, 1, 2, 2, 3])
    elif age < 40:
        hh_size = rng.choice([1, 2, 2, 3, 3, 4, 4, 5])
    else:
        hh_size = rng.choice([1, 2, 2, 3, 3, 4])

    # Build a unique ID
    uid = hashlib.md5(f"{name}-{age}-{variant_num}".encode()).hexdigest()[:8]

    # Backstory: pick a random fragment and fill in
    backstory = _generate_backstory(name, age, occupation, rng, location)

    # Education correlates with age and income
    education = _weighted_choice(demographics.get("education_distribution", {}), rng)
    if age < 22:
        education = "some_college"

    return Persona(
        id=f"gen-{uid}",
        name=name,
        age=age,
        occupation=occupation,
        annual_income=income,
        household_size=hh_size,
        neighborhood=rng.choice(neighborhoods),
        price_sensitivity=price_sensitivity,
        meal_preference=meal_pref,
        dietary_restrictions=dietary,
        flavor_preferences=flavors,
        lunch_budget=lunch_budget,
        visit_likelihood=visit,
        backstory=backstory,
        education_level=education,
    )


def _weighted_choice(distribution: dict, rng: random.Random) -> str:
    """Pick a key from a {key: probability} dict."""
    keys = list(distribution.keys())
    weights = list(distribution.values())
    return rng.choices(keys, weights=weights, k=1)[0]


def _sample_age_from_bracket(bracket: str, rng: random.Random) -> int:
    ranges = {
        "18-24": (18, 24), "25-34": (25, 34), "35-44": (35, 44),
        "45-54": (45, 54), "55-64": (55, 64), "65+": (65, 80),
    }
    lo, hi = ranges.get(bracket, (25, 45))
    return rng.randint(lo, hi)


def _sample_income_from_bracket(bracket: str, rng: random.Random) -> int:
    ranges = {
        "under_25k": (12000, 25000), "25k-50k": (25000, 50000),
        "50k-75k": (50000, 75000), "75k-100k": (75000, 100000),
        "100k-150k": (100000, 150000), "150k_plus": (150000, 300000),
    }
    lo, hi = ranges.get(bracket, (30000, 70000))
    return rng.randint(lo, hi)


def _derive_price_sensitivity(income: int, rng: random.Random) -> PriceSensitivity:
    """Income-correlated but noisy."""
    noise = rng.gauss(0, 0.2)
    if income < 30000:
        score = 0.8 + noise
    elif income < 60000:
        score = 0.5 + noise
    elif income < 100000:
        score = 0.3 + noise
    else:
        score = 0.15 + noise

    if score > 0.6:
        return PriceSensitivity.HIGH
    elif score > 0.3:
        return PriceSensitivity.MEDIUM
    else:
        return PriceSensitivity.LOW


_UNIVERSITY_BY_LOCATION = {
    "Provo, UT": "BYU",
    "Orem, UT": "UVU",
    "Logan, UT": "Utah State",
    "St. George, UT": "Dixie State",
}


def _generate_backstory(name: str, age: int, occupation: str, rng: random.Random, location: str = "") -> str:
    """Build a plausible 2-sentence backstory."""
    origins = ["California", "Idaho", "Arizona", "Texas", "the Midwest", "the East Coast", "Oregon"]
    weaknesses = ["street tacos", "burgers", "fried chicken", "boba tea", "pizza", "ice cream"]

    local_university = _UNIVERSITY_BY_LOCATION.get(location, "the local university")

    sentences = []

    if age < 25 and "student" in occupation.lower():
        sentences.append(f"Currently studying at {local_university}.")
    elif rng.random() > 0.5:
        years = rng.randint(1, max(1, min(age - 18, 30)))
        origin = rng.choice(origins)
        sentences.append(f"Moved here {years} years ago from {origin}.")
    else:
        sentences.append("Born and raised in the area.")

    # Second sentence — something about food habits
    roll = rng.random()
    if roll < 0.25:
        weakness = rng.choice(weaknesses)
        sentences.append(f"Tries to eat healthy but has a weakness for {weakness}.")
    elif roll < 0.5:
        sentences.append("Usually brings lunch from home but occasionally treats themselves.")
    elif roll < 0.75:
        sentences.append("Eats out almost every day — always on the lookout for something new.")
    else:
        sentences.append("Doesn't follow food trends, just wants something filling and affordable.")

    return " ".join(sentences)


# ─── Parsing helper ──────────────────────────────────────────────────────────

def _parse_persona(data: dict, persona_id: str) -> Persona:
    """Parse a JSON dict into a Persona dataclass."""
    return Persona(
        id=persona_id,
        name=data["name"],
        age=int(data["age"]),
        occupation=data["occupation"],
        annual_income=max(8000, int(data.get("annual_income") or 40000)),
        household_size=int(data.get("household_size", 1)),
        neighborhood=data.get("neighborhood", "nearby"),
        price_sensitivity=PriceSensitivity(data.get("price_sensitivity", "medium")),
        meal_preference=MealPreference(data.get("meal_preference", "quick")),
        dietary_restrictions=data.get("dietary_restrictions", []),
        flavor_preferences=data.get("flavor_preferences", ["savory"]),
        lunch_budget=float(data.get("lunch_budget", 10.0)),
        visit_likelihood=data.get("visit_likelihood", "occasional"),
        backstory=data.get("backstory", ""),
        education_level=data.get("education_level"),
    )
