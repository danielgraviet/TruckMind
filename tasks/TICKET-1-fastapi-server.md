# TICKET-1: FastAPI server with SSE pipeline streaming + shop REST endpoint

**Assignee:** Backend / Agent Architect
**Priority:** P0 — Blocker
**Estimate:** 2-3 hours
**Dependencies:** TICKET-0
**Blocks:** TICKET-4, TICKET-5, TICKET-6

---

## Goal

Build `backend/server.py` — the FastAPI app that exposes two interfaces:

1. **SSE endpoint** (`GET /api/stream/{pipeline_id}`) — streams pipeline progress (phases 1-3) to the frontend in real time
2. **Shop endpoint** (`POST /api/order`) — handles customer orders during phase 4 and returns updated shop state

This is the bridge between all the agent code and the React frontend. Without this, the frontend has nothing to render.

## Tasks

### SSE pipeline endpoint

Note: For this hackathon we run the pipeline lazily inside the SSE generator. `/api/pipeline` just registers inputs; the work starts when the client connects to `/api/stream/{pipeline_id}` so events are not missed and we avoid double-runs.

- [ ] Create `POST /api/pipeline` that accepts `{ concept, location, budget?, mock? }`, stores inputs, and returns `{ pipeline_id }` (the pipeline executes when the SSE stream is opened)
- [ ] Create `GET /api/stream/{pipeline_id}` that returns a `StreamingResponse` with `media_type="text/event-stream"`
- [ ] Emit these SSE events as the pipeline runs:
  ```
  event: phase
  data: {"phase": "strategy", "status": "running"}

  event: strategy
  data: { ...strategy.to_dict() }

  event: phase
  data: {"phase": "personas", "status": "running"}

  event: personas
  data: {"count": 100, "sample": [first 10 personas as dicts]}  # count matches default target

  event: phase
  data: {"phase": "simulation", "status": "running"}

  event: reaction
  data: { ...reaction.to_dict() }
  (one per persona — 100 total by default)

  event: simulation_complete
  data: { ...simulation_result summary stats }

  event: phase
  data: {"phase": "shop", "status": "ready"}

  event: shop_ready
  data: { ...shop_state.to_dict() }
  ```
- [ ] Wire the `on_reaction` callback in the simulator to push each reaction as an SSE event
- [ ] Handle errors gracefully — if the pipeline fails, emit `event: error` with a message

### Shop REST endpoint

- [ ] Create `POST /api/order` that accepts `{ message, customer_name? }`
- [ ] Call `handle_customer()` from `agents/shop.py`
- [ ] Return the full response:
  ```json
  {
    "cashier_message": "string",
    "order": { order dict or null },
    "autonomous_actions": [ list of action dicts ],
    "shop_state": { full shop state dict }
  }
  ```
- [ ] Create `GET /api/shop/state` that returns current shop state (for initial page load)
- [ ] Create `POST /api/shop/simulate-rush` that sends 15-20 persona-based orders with delays

### Infrastructure

- [ ] Add CORS middleware (frontend is on a different port during dev)
- [ ] Store pipeline state in a simple dict keyed by pipeline_id (in-memory is fine for hackathon)
- [ ] Add `python-dotenv` to load `.env` for API keys

## Technical notes

The SSE generator pattern with FastAPI:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio, json

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory store
pipelines = {}

async def pipeline_event_generator(pipeline_id: str):
    state = pipelines[pipeline_id]
    
    # Phase 1: Strategy
    yield f"event: phase\ndata: {json.dumps({'phase': 'strategy', 'status': 'running'})}\n\n"
    
    strategy = create_strategy(state["concept"], client)
    yield f"event: strategy\ndata: {json.dumps(strategy.to_dict())}\n\n"
    
    # Phase 2: Personas
    yield f"event: phase\ndata: {json.dumps({'phase': 'personas', 'status': 'running'})}\n\n"
    # ... generate personas, yield event ...
    
    # Phase 3: Simulation — use a queue for streaming reactions
    reaction_queue = asyncio.Queue()
    
    def on_reaction(reaction):
        reaction_queue.put_nowait(reaction)
    
    # Run simulation in thread (it's blocking/CPU-bound)
    # Push reactions through queue → yield as SSE events
    
    yield f"event: shop_ready\ndata: {json.dumps(shop_state.to_dict())}\n\n"

@app.get("/api/stream/{pipeline_id}")
async def stream(pipeline_id: str):
    return StreamingResponse(
        pipeline_event_generator(pipeline_id),
        media_type="text/event-stream"
    )
```

**Important:** The pipeline agents use synchronous code (blocking LLM calls). You'll need to run them in a thread executor (`asyncio.to_thread()` or `loop.run_in_executor()`) so they don't block the async SSE generator.

## Definition of done

1. `POST /api/pipeline` with `{"concept": "Taco truck near BYU", "location": "Provo, UT"}` returns a pipeline_id
2. `GET /api/stream/{id}` in a browser or `curl` shows SSE events streaming in real time
3. After pipeline completes, `POST /api/order` with `{"message": "I want 2 tacos"}` returns a cashier response + updated state
4. Frontend person can connect EventSource and see events arriving

## Test it

```bash
# Terminal 1: start server
cd backend && uvicorn server:app --reload --port 8000

# Terminal 2: start pipeline
curl -X POST http://localhost:8000/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{"concept": "Taco truck near BYU", "location": "Provo, UT"}'

# Terminal 3: watch SSE stream (use the pipeline_id from above)
curl -N http://localhost:8000/api/stream/{pipeline_id}

# Terminal 4: send an order (after pipeline completes)
curl -X POST http://localhost:8000/api/order \
  -H "Content-Type: application/json" \
  -d '{"message": "What do you have?"}'
```
