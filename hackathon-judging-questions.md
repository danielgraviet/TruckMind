# Hackathon Judging Q&A Drill

Practical questions to rehearse concise, technical answers. Tailor numbers/examples to your build.

## Architecture & Data Flow
- What are the main components and how do they communicate (requests, SSE, queues)?
- Which parts are synchronous vs. async, and where are the bottlenecks?
- What data models are persisted vs. in-memory? Any schema evolution plan?
- How do you reset or replay a pipeline run for debugging?

## LLM Integration
- Which LLM/provider do you target? How do you swap to a different model?
- What safety/validation wraps LLM outputs (schema checks, retries, fallbacks)?
- How do you handle rate limits and cost tracking per request/pipeline?

## Simulation & Logic
- How do you generate personas and ensure demographic diversity or determinism?
- How is simulation tiering implemented, and how are scores learned/applied?
- What convergence criteria stop refinement loops? Can they be tuned?

## Shop Runtime
- How do inventory, pricing, and autonomous triggers update state? Any race protection?
- How is surge pricing decided and surfaced to users?
- How do you ensure idempotency for incoming orders or SSE reconnects?

## API & Transport
- What endpoints exist, and which payloads/verbs should clients use?
- How do you stream intermediate results? Retry/backoff strategy for dropped SSE?
- Any CORS/auth assumptions for the demo environment?

## Frontend
- How is state derived from SSE events and reconciled with REST responses?
- What loading/empty/error states are covered? Mobile layout considerations?
- How do you visualize simulation stats and live shop metrics effectively?

## Testing & Reliability
- What unit/integration tests exist or are planned? How do you mock the LLM?
- How do you seed deterministic data for reproducible runs?
- Any monitoring/logging hooks to debug bad runs or cost spikes?

## Security & Privacy
- What data is user-provided vs. synthetic? Any PII stored or transmitted?
- How are API keys managed (env, vault) and prevented from leaking client-side?
- What abuse cases are mitigated (prompt injection, path traversal, denial via floods)?

## Performance & Scalability
- Where does the system bottleneck under load (LLM calls, SSE fan-out, sim compute)?
- How would you parallelize or batch work if user volume grows?
- What are rough latency/cost numbers for a full pipeline run?

## Demo Readiness
- What’s the quickest “happy path” to show value in 90 seconds?
- What failure modes are most likely on stage, and how do you recover gracefully?
