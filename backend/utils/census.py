"""
Census API Integration
======================
Fetches demographic data from the US Census Bureau ACS 5-Year API.
Used by agents/crowd.py to ground persona generation in real demographics.

CENSUS_API_KEY in .env is optional — the API works without it at lower rate limits.
Get a free key at: https://api.census.gov/data/key_signup.html

Usage:
    from utils.census import fetch_demographics_sync, parse_location

    city, state = parse_location("Provo, UT")   # → ("Provo", "UT")
    data = fetch_demographics_sync(city, state)  # → demographics dict
"""

import os
import json
import pathlib
import requests
from typing import Optional

# Census sentinel value for missing data — treat as 0
_MISSING = -666666666

# File-based cache so repeated runs skip the Census API entirely
_CACHE_FILE = pathlib.Path(__file__).parent.parent / ".cache" / "census.json"

def _load_cache() -> dict[str, dict]:
    try:
        return json.loads(_CACHE_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def _save_cache(cache: dict) -> None:
    _CACHE_FILE.parent.mkdir(exist_ok=True)
    _CACHE_FILE.write_text(json.dumps(cache, indent=2))

# In-memory cache (populated from disk on first use)
_cache: dict[str, dict] = _load_cache()

# State abbreviation → FIPS code
_STATE_FIPS: dict[str, str] = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
    "CO": "08", "CT": "09", "DE": "10", "FL": "12", "GA": "13",
    "HI": "15", "ID": "16", "IL": "17", "IN": "18", "IA": "19",
    "KS": "20", "KY": "21", "LA": "22", "ME": "23", "MD": "24",
    "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29",
    "MT": "30", "NE": "31", "NV": "32", "NH": "33", "NJ": "34",
    "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45",
    "SD": "46", "TN": "47", "TX": "48", "UT": "49", "VT": "50",
    "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56",
    "DC": "11",
}

# Census API allows max 50 variables per request, so we split into two calls.
# Call 1: age + basic stats (40 vars)
_VARS_AGE = ",".join([
    "NAME",
    "B01001_001E",   # total population
    "B01002_001E",   # median age
    "B19013_001E",   # median household income
    # Male 18+
    "B01001_007E", "B01001_008E", "B01001_009E", "B01001_010E", "B01001_011E",  # 18-24
    "B01001_012E", "B01001_013E",                                                # 25-34
    "B01001_014E", "B01001_015E",                                                # 35-44
    "B01001_016E", "B01001_017E",                                                # 45-54
    "B01001_018E", "B01001_019E",                                                # 55-64
    "B01001_020E", "B01001_021E", "B01001_022E",                                 # 65-74
    "B01001_023E", "B01001_024E", "B01001_025E",                                 # 75+
    # Female 18+
    "B01001_031E", "B01001_032E", "B01001_033E", "B01001_034E", "B01001_035E",  # 18-24
    "B01001_036E", "B01001_037E",                                                # 25-34
    "B01001_038E", "B01001_039E",                                                # 35-44
    "B01001_040E", "B01001_041E",                                                # 45-54
    "B01001_042E", "B01001_043E",                                                # 55-64
    "B01001_044E", "B01001_045E", "B01001_046E",                                 # 65-74
    "B01001_047E", "B01001_048E", "B01001_049E",                                 # 75+
])

# Call 2: income + education (26 vars)
_VARS_INC_EDU = ",".join([
    "NAME",
    "B19001_001E",                                                               # total HH
    "B19001_002E", "B19001_003E", "B19001_004E", "B19001_005E",                  # <25k
    "B19001_006E", "B19001_007E", "B19001_008E", "B19001_009E", "B19001_010E",  # 25-50k
    "B19001_011E", "B19001_012E",                                                # 50-75k
    "B19001_013E",                                                               # 75-100k
    "B19001_014E", "B19001_015E",                                                # 100-150k
    "B19001_016E", "B19001_017E",                                                # 150k+
    "B15003_001E",                                                               # total 25+
    "B15003_017E",                                                               # HS diploma
    "B15003_019E", "B15003_020E",                                                # some college
    "B15003_022E",                                                               # bachelors
    "B15003_023E", "B15003_024E", "B15003_025E",                                 # graduate
])


def _safe(val) -> float:
    """Coerce a Census value to float, returning 0 for missing sentinel."""
    if val is None:
        return 0.0
    try:
        f = float(val)
        return 0.0 if f == _MISSING else f
    except (TypeError, ValueError):
        return 0.0


def parse_location(location: str) -> tuple[str, str]:
    """
    Parse a location string into (city, state_abbrev).
    "Provo, UT" → ("Provo", "UT")
    "Austin, Texas" is not supported — use 2-letter abbreviations.
    """
    parts = [p.strip() for p in location.split(",")]
    if len(parts) < 2:
        raise ValueError(f"Cannot parse '{location}'. Expected 'City, ST' format.")
    city = parts[0].strip()
    state = parts[-1].strip().upper()[:2]
    return city, state


def fetch_demographics_sync(city: str, state_abbrev: str) -> dict:
    """
    Fetch ACS 5-Year demographic data for any US city from Census.gov.

    Makes two lightweight API calls:
      1. Get all places in the state with all variables
      2. Fuzzy-match the city name from results

    Args:
        city: e.g. "Provo"
        state_abbrev: 2-letter e.g. "UT"

    Returns:
        Demographics dict matching the shape of CACHED_DEMOGRAPHICS in crowd.py.

    Raises:
        ValueError: if city not found or state abbreviation unknown.
        requests.HTTPError: if Census API returns an error status.
    """
    cache_key = f"{city.lower()},{state_abbrev.upper()}"
    if cache_key in _cache:
        return _cache[cache_key]

    state_fips = _STATE_FIPS.get(state_abbrev.upper())
    if not state_fips:
        raise ValueError(f"Unknown state abbreviation: '{state_abbrev}'")

    api_key = os.environ.get("CENSUS_API_KEY", "").strip()
    base_url = "https://api.census.gov/data/2022/acs/acs5"

    def _get(vars_str: str, for_clause: str) -> list:
        params: dict = {"get": vars_str, "for": for_clause, "in": f"state:{state_fips}"}
        if api_key:
            params["key"] = api_key
        r = requests.get(base_url, params=params, timeout=15)
        r.raise_for_status()
        return r.json()

    # Call 1: age + basic stats — scan all places to find city + its place FIPS
    rows_age = _get(_VARS_AGE, "place:*")
    headers_age = rows_age[0]
    name_idx = headers_age.index("NAME")

    target = city.lower()
    row_age: Optional[dict] = None
    place_fips: Optional[str] = None
    for row in rows_age[1:]:
        if target in row[name_idx].lower():
            row_age = dict(zip(headers_age, row))
            place_fips = row_age.get("place")
            break

    if row_age is None or place_fips is None:
        raise ValueError(f"City '{city}' not found in Census ACS data for {state_abbrev}")

    # Call 2: income + education — target the specific place FIPS for efficiency
    rows_inc = _get(_VARS_INC_EDU, f"place:{place_fips}")
    headers_inc = rows_inc[0]
    row_inc: dict = dict(zip(headers_inc, rows_inc[1])) if len(rows_inc) > 1 else {}

    # Merge both result dicts so the v() helper below can see all variables
    row_dict = {**row_age, **row_inc}

    def v(key: str) -> float:
        return _safe(row_dict.get(key))

    total_pop = v("B01001_001E") or 1.0
    total_inc = v("B19001_001E") or 1.0
    total_edu = v("B15003_001E") or 1.0

    # Sum male + female for each age bracket (both divided by total 18+ pop)
    pop_18plus = sum(v(k) for k in [
        "B01001_007E","B01001_008E","B01001_009E","B01001_010E","B01001_011E",
        "B01001_012E","B01001_013E","B01001_014E","B01001_015E","B01001_016E",
        "B01001_017E","B01001_018E","B01001_019E","B01001_020E","B01001_021E",
        "B01001_022E","B01001_023E","B01001_024E","B01001_025E",
        "B01001_031E","B01001_032E","B01001_033E","B01001_034E","B01001_035E",
        "B01001_036E","B01001_037E","B01001_038E","B01001_039E","B01001_040E",
        "B01001_041E","B01001_042E","B01001_043E","B01001_044E","B01001_045E",
        "B01001_046E","B01001_047E","B01001_048E","B01001_049E",
    ]) or total_pop

    def age(*keys: str) -> float:
        return sum(v(k) for k in keys) / pop_18plus

    def inc(*keys: str) -> float:
        return sum(v(k) for k in keys) / total_inc

    def edu(*keys: str) -> float:
        return sum(v(k) for k in keys) / total_edu

    demographics = {
        "total_population": int(total_pop),
        "median_age": v("B01002_001E") or 35.0,
        "median_household_income": int(v("B19013_001E") or 55_000),
        "per_capita_income": 0,  # not fetched; unused by crowd.py
        "age_distribution": {
            "18-24": age("B01001_007E","B01001_008E","B01001_009E","B01001_010E","B01001_011E",
                         "B01001_031E","B01001_032E","B01001_033E","B01001_034E","B01001_035E"),
            "25-34": age("B01001_012E","B01001_013E","B01001_036E","B01001_037E"),
            "35-44": age("B01001_014E","B01001_015E","B01001_038E","B01001_039E"),
            "45-54": age("B01001_016E","B01001_017E","B01001_040E","B01001_041E"),
            "55-64": age("B01001_018E","B01001_019E","B01001_042E","B01001_043E"),
            "65+":   age("B01001_020E","B01001_021E","B01001_022E","B01001_023E","B01001_024E","B01001_025E",
                         "B01001_044E","B01001_045E","B01001_046E","B01001_047E","B01001_048E","B01001_049E"),
        },
        "income_distribution": {
            "under_25k":  inc("B19001_002E","B19001_003E","B19001_004E","B19001_005E"),
            "25k-50k":    inc("B19001_006E","B19001_007E","B19001_008E","B19001_009E","B19001_010E"),
            "50k-75k":    inc("B19001_011E","B19001_012E"),
            "75k-100k":   inc("B19001_013E"),
            "100k-150k":  inc("B19001_014E","B19001_015E"),
            "150k_plus":  inc("B19001_016E","B19001_017E"),
        },
        "education_distribution": {
            "high_school":  edu("B15003_017E"),
            "some_college": edu("B15003_019E","B15003_020E"),
            "bachelors":    edu("B15003_022E"),
            "graduate":     edu("B15003_023E","B15003_024E","B15003_025E"),
        },
        "notable_traits": [f"Live Census ACS 5-Year data — {city}, {state_abbrev}"],
    }

    _cache[cache_key] = demographics
    _save_cache(_cache)
    return demographics
