# Hackathon Judging Q&A Drill

Practical questions to rehearse concise, technical answers. Tailor numbers/examples to your build.

## Architecture & Data Flow
- What are the main components and how do they communicate (requests, SSE, queues)?
  - React → FastAPI via SSE (`/api/simulate`) + REST (`/api/order`, `/api/shop/*`)
- Which parts are synchronous vs. async, and where are the bottlenecks?
  - LLM calls are threaded (`asyncio.to_thread`); SSE drains a queue while sim runs. Bottleneck: LLM latency
- What data models are persisted vs. in-memory? Any schema evolution plan?
  - Persona cache on disk (`.cache/personas.json`); shop state in-memory dict
- How do you reset or replay a pipeline run for debugging?
  - Re-POST to `/api/simulate` — persona cache makes it deterministic

## LLM Integration
- Which LLM/provider do you target? How do you swap to a different model?
  - Anthropic Claude Haiku (fast/cheap); swap by changing `model=` in `LLMClient.__init__`
- What safety/validation wraps LLM outputs (schema checks, retries, fallbacks)?
  - `_extract_json()` strips markdown fences, retries bracket-matching; falls back to mock
- How do you handle rate limits and cost tracking per request/pipeline?
  - `cost_report()` tracks tokens per run; no retry logic yet

## Simulation & Logic
- How do you generate personas and ensure demographic diversity or determinism?
  - LLM seeds 20, deterministic expansion to 100 via `random.Random(42)` matching census distributions
- How is simulation tiering implemented, and how are scores learned/applied?
  - 24 personas via LLM batches, rest scored via rule interpolation
- What convergence criteria stop refinement loops? Can they be tuned?
  - Fixed 3 strategies × 1 simulation round; no loop currently

## Shop Runtime
- How do inventory, pricing, and autonomous triggers update state? Any race protection?
  - Single in-memory dict, synchronous mutations in `handle_customer()`; no race protection
- How is surge pricing decided and surfaced to users?
  - Rule-based threshold in shop agent triggers automatic price bump
- How do you ensure idempotency for incoming orders or SSE reconnects?
  - None — each order is fire-and-forget

## API & Transport
- What endpoints exist, and which payloads/verbs should clients use?
  - `GET /api/simulate` (SSE), `POST /api/order`, `GET /api/shop/state`, `POST /api/shop/simulate-rush`
- How do you stream intermediate results? Retry/backoff strategy for dropped SSE?
  - SSE with `data:` snapshots; no client retry/backoff implemented
- Any CORS/auth assumptions for the demo environment?
  - `allow_origins=["*"]` — open for demo

## Frontend
- How is state derived from SSE events and reconciled with REST responses?
  - SSE snapshots merged into reducer; REST only for shop init
- What loading/empty/error states are covered? Mobile layout considerations?
  - Loading skeletons, mock fallback on API failure; not mobile-optimized
- How do you visualize simulation stats and live shop metrics effectively?
  - Animated persona dot grid, live revenue counter, inventory bars

## Testing & Reliability
- What unit/integration tests exist or are planned? How do you mock the LLM?
  - None formally; `MockLLMClient` exists for offline runs
- How do you seed deterministic data for reproducible runs?
  - `random.Random(42)` seed + persona file cache
- Any monitoring/logging hooks to debug bad runs or cost spikes?
  - `print()` logs + `cost_report()`; no structured logging

## Security & Privacy
- What data is user-provided vs. synthetic? Any PII stored or transmitted?
  - All synthetic — no real user PII stored
- How are API keys managed (env, vault) and prevented from leaking client-side?
  - `.env` file, server-side only; never sent to client
- What abuse cases are mitigated (prompt injection, path traversal, denial via floods)?
  - No mitigations — prompt injection possible, no rate limiting

## Performance & Scalability
- Where does the system bottleneck under load (LLM calls, SSE fan-out, sim compute)?
  - LLM calls (~40s persona gen, ~30s simulation per strategy)
- How would you parallelize or batch work if user volume grows?
  - Persona gen cached; sim batches parallelized via `ThreadPoolExecutor`
- What are rough latency/cost numbers for a full pipeline run?
  - ~90s live, ~$0.15/run at Haiku pricing

## Demo Readiness
- What's the quickest "happy path" to show value in 90 seconds?
  - Demo Mode on → type concept → select city → watch 3 strategies test → winner auto-selected
- What failure modes are most likely on stage, and how do you recover gracefully?
  - LLM timeout mid-stream, SSE connection drop. Recovery: Demo Mode toggle always available as fallback
