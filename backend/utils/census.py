"""
Utility: Census API Integration
===============================
Fetches and formats demographic data from the Census Reporter API.
Outputs a standardized dictionary for use by the Crowd agent.
"""

import requests

# In-memory cache to prevent spamming the API during development
_CENSUS_CACHE = {}

# Pre-mapped GEO_IDs for Utah tech/population hubs
LOCATION_GEO_IDS = {
    "provo": "16000US4962470",
    "salt lake": "16000US4967000",
    "lehi": "16000US4944320",
    "orem": "16000US4957300",
}

def _sum_vars(table: dict, prefix: str, suffixes: list[str]) -> int:
    """Helper to sum specific census variable estimates."""
    return sum(table.get(f"{prefix}{s}", 0) for s in suffixes)

def fetch_demographics(location_name: str) -> dict:
    """Fetch and format real Census Reporter data for a location."""
    # Identify GEO_ID based on loose string matching
    geo_id = LOCATION_GEO_IDS.get("salt lake") # Default fallback
    for key, val in LOCATION_GEO_IDS.items():
        if key in location_name.lower():
            geo_id = val
            break

    if geo_id in _CENSUS_CACHE:
        return _CENSUS_CACHE[geo_id]

    tables = "B01001,B01002,B19013,B19001,B15003"
    response = requests.get(
        "https://api.censusreporter.org/1.0/data/show/latest",
        params={"table_ids": tables, "geo_ids": geo_id},
        timeout=10
    )

    if response.status_code != 200:
        print(f"Census API Error: {response.text}. Using fallback.")
        return _get_fallback_demographics(location_name)

    d = response.json()["data"][geo_id]
    
    # Extract tables
    age_sex = d["B01001"]["estimate"]
    median_age = d["B01002"]["estimate"]["B01002001"]
    median_inc = d["B19013"]["estimate"]["B19013001"]
    income = d.get("B19001", {}).get("estimate", {})
    edu = d["B15003"]["estimate"]

    # Calculate distributions from raw estimates
    total_pop = age_sex["B01001001"]
    total_inc = income.get("B19001001", 1)
    total_edu = edu["B15003001"]

    demographics = {
        "total_population": total_pop,
        "median_age": median_age,
        "median_household_income": median_inc,
        "age_distribution": {
            "18-24": _sum_vars(age_sex, "B010010", ["07","08","09","10","11", "31","32","33","34","35"]) / total_pop,
            "25-34": _sum_vars(age_sex, "B010010", ["12","13", "36","37"]) / total_pop,
            "35-44": _sum_vars(age_sex, "B010010", ["14","15", "38","39"]) / total_pop,
            "45-54": _sum_vars(age_sex, "B010010", ["16","17", "40","41"]) / total_pop,
            "55-64": _sum_vars(age_sex, "B010010", ["18","19", "42","43"]) / total_pop,
            "65+":   _sum_vars(age_sex, "B010010", ["20","21","22","23","24","25", "44","45","46","47","48","49"]) / total_pop,
        },
        "income_distribution": {
            "under_25k": _sum_vars(income, "B190010", ["02","03","04","05"]) / total_inc,
            "25k-50k":   _sum_vars(income, "B190010", ["06","07","08","09","10"]) / total_inc,
            "50k-75k":   _sum_vars(income, "B190010", ["11","12"]) / total_inc,
            "75k-100k":  _sum_vars(income, "B190010", ["13"]) / total_inc,
            "100k-150k": _sum_vars(income, "B190010", ["14","15"]) / total_inc,
            "150k_plus": _sum_vars(income, "B190010", ["16","17"]) / total_inc,
        },
        "education_distribution": {
            "high_school":  edu["B15003017"] / total_edu,
            "some_college": _sum_vars(edu, "B150030", ["19","20"]) / total_edu,
            "bachelors":    edu["B15003022"] / total_edu,
            "graduate":     _sum_vars(edu, "B150030", ["23","24","25"]) / total_edu,
        },
        "notable_traits": [f"Tech hub proximity ({location_name})"],
    }

    _CENSUS_CACHE[geo_id] = demographics
    return demographics

def _get_fallback_demographics(location_name: str) -> dict:
    return {
        "total_population": 50_000,
        "median_age": 35,
        "median_household_income": 55_000,
        "age_distribution": {"18-24": 0.15, "25-34": 0.25, "35-44": 0.20, "45-54": 0.18, "55-64": 0.12, "65+": 0.10},
        "income_distribution": {"under_25k": 0.20, "25k-50k": 0.25, "50k-75k": 0.22, "75k-100k": 0.15, "100k-150k": 0.12, "150k_plus": 0.06},
        "education_distribution": {"high_school": 0.15, "some_college": 0.25, "bachelors": 0.35, "graduate": 0.25},
        "notable_traits": [f"Fallback data used for {location_name}"],
    }