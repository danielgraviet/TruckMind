"""
warm_cache.py — Pre-generate personas for all cached Utah cities.

Run once before a live demo so every city is a cache hit during the pipeline.
Uses the real LLM (requires ANTHROPIC_API_KEY). Takes ~2-4 minutes total.

Usage:
    cd backend
    python warm_cache.py            # all 8 cities
    python warm_cache.py --missing  # only cities not yet cached
    python warm_cache.py "Provo, UT" "Logan, UT"  # specific cities
"""

import sys
import time
from dotenv import load_dotenv

load_dotenv()

from agents.crowd import (
    CACHED_DEMOGRAPHICS,
    generate_personas,
    _persona_cache_key,
    _load_persona_cache,
)
from agents.strategist import create_strategy
from models.schema import BusinessConcept
from utils.llm_client import LLMClient

# Standard demo parameters — must match what the pipeline uses
NUM_PERSONAS = 100
NUM_SEEDS    = 20

# Generic concept used to warm the cache (location is what matters for persona gen)
WARMUP_CONCEPT = "taco truck serving lunch"

ALL_CITIES = list(CACHED_DEMOGRAPHICS.keys())


def cities_missing_cache() -> list[str]:
    cache = _load_persona_cache()
    return [c for c in ALL_CITIES if _persona_cache_key(c, None, NUM_PERSONAS, NUM_SEEDS) not in cache]


def warm_city(city: str, client: LLMClient) -> None:
    cache = _load_persona_cache()
    key = _persona_cache_key(city, None, NUM_PERSONAS, NUM_SEEDS)

    if key in cache:
        print(f"  ✓ {city} — already cached, skipping")
        return

    print(f"  → {city} — generating {NUM_PERSONAS} personas ({NUM_SEEDS} seeds)…")
    t0 = time.time()

    bc = BusinessConcept(description=WARMUP_CONCEPT, location=city)
    strategy = create_strategy(bc, client)
    generate_personas(city, strategy, client, NUM_PERSONAS, NUM_SEEDS)

    elapsed = time.time() - t0
    print(f"     done in {elapsed:.1f}s")


def main():
    args = sys.argv[1:]

    if "--missing" in args:
        targets = cities_missing_cache()
        if not targets:
            print("All cities already cached.")
            return
        print(f"Warming {len(targets)} missing cities…\n")
    elif args:
        targets = args
    else:
        targets = ALL_CITIES
        print(f"Warming all {len(targets)} cities…\n")

    client = LLMClient()

    for i, city in enumerate(targets, 1):
        print(f"[{i}/{len(targets)}]")
        try:
            warm_city(city, client)
        except Exception as e:
            print(f"  ERROR on {city}: {e}")

    print(f"\nDone. {len(targets)} cities processed.")
    print(client.cost_report())

    # Print final cache status
    print("\nCache status:")
    cache = _load_persona_cache()
    for city in ALL_CITIES:
        key = _persona_cache_key(city, None, NUM_PERSONAS, NUM_SEEDS)
        status = "✓" if key in cache else "✗"
        count = len(cache[key]) if key in cache else 0
        print(f"  {status} {city:<25} {count or '':>4} {'personas' if count else 'MISSING'}")


if __name__ == "__main__":
    main()
