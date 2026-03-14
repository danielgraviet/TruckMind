# TICKET-3: Wire Census API into persona generation pipeline

**Assignee:** Persona Engineer
**Priority:** P1 — Important but not blocking
**Estimate:** 1.5 hours
**Dependencies:** TICKET-0
**Blocks:** Nothing (cached data works as fallback)

---

## Goal

Replace the hardcoded demographic data in `agents/crowd.py` with live Census API calls so any US city works, not just Provo and SLC. The cached data remains as a fallback if the API is slow or unavailable.

## Tasks

- [ ] Get your Census API key from https://api.census.gov/data/key_signup.html (takes 5 minutes)
- [ ] Add to `.env`: `CENSUS_API_KEY=your-key-here`
- [ ] Update `utils/census.py` — the skeleton already exists, wire it up:
  - [ ] Test the API call manually first:
    ```bash
    curl "https://api.census.gov/data/2022/acs/acs5?get=NAME,B01001_001E,B19013_001E&for=place:*&in=state:49&key=YOUR_KEY"
    ```
  - [ ] Implement `fetch_demographics_sync()` to return data in the same dict shape as `CACHED_DEMOGRAPHICS`
  - [ ] Handle the city name matching (Census returns "Provo city, Utah" — you need fuzzy match)
- [ ] Update `agents/crowd.py` `get_demographics()` to:
  1. Try live Census API first
  2. Fall back to cached data if API fails
  3. Fall back to generic profile if neither works
  ```python
  def get_demographics(location: str) -> dict:
      # Try live API
      try:
          city, state = parse_location(location)  # "Provo, UT" → ("Provo", "UT")
          return fetch_demographics_sync(city, state)
      except Exception as e:
          print(f"Census API failed ({e}), using cached data")
      
      # Fallback to cached
      if location in CACHED_DEMOGRAPHICS:
          return CACHED_DEMOGRAPHICS[location]
      
      # Generic fallback
      return GENERIC_DEMOGRAPHICS
  ```
- [ ] Add 1-2 more cities to `CACHED_DEMOGRAPHICS` as backup (Logan UT, Orem UT — likely demo locations)
- [ ] Test with 3 different cities to verify the API returns usable data:
  - Provo, UT (college town)
  - Austin, TX (tech city)
  - Miami, FL (different demographic)
- [ ] Verify that the persona expansion still hits target distributions with live Census data

## Edge cases to handle

- Census API returns `-666666666` for missing data fields — treat as 0
- Some small cities might not be in the ACS 5-year data — fall back gracefully
- API rate limit is generous (500/day) but add a 1-second delay between calls just in case
- The age distribution variables (B01001_003E through B01001_049E) are split by sex — you need to sum male + female for each bracket

## Definition of done

1. `get_demographics("Provo, UT")` returns real Census data
2. `get_demographics("Austin, TX")` works for a non-cached city
3. `get_demographics("Fake City, XX")` falls back gracefully
4. Pipeline runs successfully with live Census data
5. Persona age/income distributions match Census reality

## Notes

- This is a nice-to-have differentiator, not a blocker. If you're behind schedule, skip it — the cached data works fine for the demo. The judges will see real Census numbers either way.
- Pre-cache data for your planned demo location so you're not dependent on network during the presentation.
