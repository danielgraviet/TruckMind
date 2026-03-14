"""
Census API Integration
======================
Pulls real demographic data from the US Census ACS 5-Year API.
Replaces the cached demographics in crowd.py with live data.

API docs: https://www.census.gov/data/developers/data-sets/acs-5year.html
Get a key: https://api.census.gov/data/key_signup.html

Usage:
    from utils.census import fetch_demographics
    demo = fetch_demographics("Provo", "UT")
    # Returns a dict in the same shape as CACHED_DEMOGRAPHICS entries
"""

import os
import json
from typing import Optional

# You'll need httpx installed: pip install httpx
# import httpx

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "")
BASE_URL = "https://api.census.gov/data/2022/acs/acs5"

# State FIPS codes (add more as needed)
STATE_FIPS = {
    "UT": "49", "CA": "06", "TX": "48", "NY": "36", "FL": "12",
    "CO": "08", "AZ": "04", "ID": "16", "NV": "32", "OR": "41",
}

# Census variable codes we need
VARIABLES = {
    # Population
    "B01001_001E": "total_population",
    "B01001_002E": "male_population",
    "B01001_026E": "female_population",
    "B01002_001E": "median_age",

    # Income
    "B19013_001E": "median_household_income",
    "B19301_001E": "per_capita_income",

    # Poverty
    "B17001_001E": "poverty_universe",
    "B17001_002E": "below_poverty",

    # Education (age 25+)
    "B15003_017E": "hs_diploma",       # Regular high school diploma
    "B15003_018E": "ged",              # GED or alternative
    "B15003_019E": "some_college_1yr",
    "B15003_020E": "some_college_no_degree",
    "B15003_021E": "associates",
    "B15003_022E": "bachelors",
    "B15003_023E": "masters",
    "B15003_024E": "professional",
    "B15003_025E": "doctorate",

    # Housing
    "B25077_001E": "median_home_value",
    "B25064_001E": "median_gross_rent",

    # Households
    "B11001_001E": "total_households",
    "B11001_002E": "family_households",

    # Race
    "B02001_002E": "white",
    "B02001_003E": "black",
    "B02001_005E": "asian",

    # Hispanic/Latino
    "B03003_003E": "hispanic_latino",

    # Employment
    "B23025_002E": "labor_force",
    "B23025_004E": "employed",
    "B23025_005E": "unemployed",
}


async def fetch_demographics(city: str, state: str) -> dict:
    """
    Fetch demographics from Census API and return in our standard format.
    
    This is the function you'd call to replace CACHED_DEMOGRAPHICS.
    Wire this into get_demographics() in crowd.py.
    
    Args:
        city: City name (e.g., "Provo")
        state: State abbreviation (e.g., "UT")
    
    Returns:
        Dict matching CACHED_DEMOGRAPHICS format
    """
    import httpx

    state_fips = STATE_FIPS.get(state)
    if not state_fips:
        raise ValueError(f"Unknown state: {state}. Add FIPS code to STATE_FIPS dict.")

    # Build the API request
    var_list = ",".join(VARIABLES.keys())
    params = {
        "get": f"NAME,{var_list}",
        "for": "place:*",
        "in": f"state:{state_fips}",
        "key": CENSUS_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

    # Find the matching city in results
    # data[0] is headers, data[1:] are rows
    headers = data[0]
    city_row = None
    for row in data[1:]:
        name = row[0]  # NAME field
        if city.lower() in name.lower():
            city_row = row
            break

    if not city_row:
        raise ValueError(f"City '{city}' not found in {state} census data")

    # Parse into a dict
    raw = {}
    for i, header in enumerate(headers):
        if header in VARIABLES:
            val = city_row[i]
            raw[VARIABLES[header]] = _safe_int(val)

    # Transform into our standard format
    total_pop = raw.get("total_population", 1)

    return {
        "total_population": total_pop,
        "median_age": raw.get("median_age", 30),
        "median_household_income": raw.get("median_household_income", 50000),
        "per_capita_income": raw.get("per_capita_income", 25000),
        "poverty_rate": _safe_ratio(raw.get("below_poverty", 0), raw.get("poverty_universe", 1)),
        "gender_split": {
            "male": _safe_ratio(raw.get("male_population", 0), total_pop),
            "female": _safe_ratio(raw.get("female_population", 0), total_pop),
        },
        "race_ethnicity": {
            "white": _safe_ratio(raw.get("white", 0), total_pop),
            "black": _safe_ratio(raw.get("black", 0), total_pop),
            "asian": _safe_ratio(raw.get("asian", 0), total_pop),
            "hispanic_latino": _safe_ratio(raw.get("hispanic_latino", 0), total_pop),
        },
        # NOTE: Age distribution requires B01001 sub-variables (003-025 for males, 027-049 for females)
        # For hackathon, you can use the median_age to approximate, or add those variables above.
        # This is a simplified version:
        "age_distribution": _estimate_age_distribution(raw.get("median_age", 30)),
        "income_distribution": {
            # TODO: Pull B19001 sub-variables for precise buckets
            # This is a reasonable approximation from median
            "under_25k": 0.25,
            "25k-50k": 0.22,
            "50k-75k": 0.20,
            "75k-100k": 0.14,
            "100k-150k": 0.12,
            "150k_plus": 0.07,
        },
        "education_distribution": _compute_education(raw),
        "employment": {
            "labor_force": raw.get("labor_force", 0),
            "employed": raw.get("employed", 0),
            "unemployment_rate": _safe_ratio(raw.get("unemployed", 0), raw.get("labor_force", 1)),
        },
        "housing": {
            "median_home_value": raw.get("median_home_value", 0),
            "median_gross_rent": raw.get("median_gross_rent", 0),
            "total_households": raw.get("total_households", 0),
            "family_households_pct": _safe_ratio(raw.get("family_households", 0), raw.get("total_households", 1)),
        },
        "notable_traits": [],  # You can populate this based on the data
    }


def _compute_education(raw: dict) -> dict:
    """Compute education distribution from raw census variables."""
    hs = raw.get("hs_diploma", 0) + raw.get("ged", 0)
    some_college = (
        raw.get("some_college_1yr", 0) +
        raw.get("some_college_no_degree", 0) +
        raw.get("associates", 0)
    )
    bachelors = raw.get("bachelors", 0)
    graduate = (
        raw.get("masters", 0) +
        raw.get("professional", 0) +
        raw.get("doctorate", 0)
    )

    total = hs + some_college + bachelors + graduate
    if total == 0:
        return {"high_school": 0.25, "some_college": 0.25, "bachelors": 0.35, "graduate": 0.15}

    return {
        "high_school": round(hs / total, 3),
        "some_college": round(some_college / total, 3),
        "bachelors": round(bachelors / total, 3),
        "graduate": round(graduate / total, 3),
    }


def _estimate_age_distribution(median_age: float) -> dict:
    """
    Estimate age brackets from median age.
    This is a rough heuristic — for precise data, pull B01001 sub-variables.
    """
    if median_age < 25:
        # College town (like Provo)
        return {"18-24": 0.42, "25-34": 0.22, "35-44": 0.12, "45-54": 0.09, "55-64": 0.08, "65+": 0.07}
    elif median_age < 32:
        # Young professional city
        return {"18-24": 0.18, "25-34": 0.28, "35-44": 0.20, "45-54": 0.14, "55-64": 0.11, "65+": 0.09}
    elif median_age < 38:
        # Average city
        return {"18-24": 0.13, "25-34": 0.20, "35-44": 0.19, "45-54": 0.18, "55-64": 0.16, "65+": 0.14}
    else:
        # Older community
        return {"18-24": 0.09, "25-34": 0.14, "35-44": 0.16, "45-54": 0.18, "55-64": 0.20, "65+": 0.23}


def _safe_int(val) -> int:
    """Safely convert census API value to int."""
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def _safe_ratio(numerator: int, denominator: int) -> float:
    """Safe division returning a ratio."""
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 3)


# ─── Synchronous wrapper for non-async contexts ─────────────────────────────

def fetch_demographics_sync(city: str, state: str) -> dict:
    """Synchronous version of fetch_demographics."""
    import asyncio
    return asyncio.run(fetch_demographics(city, state))
