---
id: TASK-2.1
title: Implement SSE pipeline streaming endpoint
status: To Do
assignee: []
created_date: '2026-03-14 17:33'
labels:
  - backend
  - agent-architect
dependencies: []
parent_task_id: TASK-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build POST /api/pipeline and GET /api/stream/{pipeline_id} endpoints.

POST /api/pipeline starts the pipeline in a background task and returns {pipeline_id}.
GET /api/stream/{pipeline_id} returns StreamingResponse with SSE events: phase, strategy, personas, reaction, simulation_complete, shop_ready, error.

Use asyncio.to_thread() for blocking pipeline agents.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/pipeline accepts {concept, location, budget?} returns {pipeline_id}
- [ ] #2 GET /api/stream/{id} returns SSE events in real time
- [ ] #3 All 6 event types emitted correctly (phase, strategy, personas, reaction, simulation_complete, shop_ready)
- [ ] #4 Error events emitted on pipeline failure
- [ ] #5 Pipeline runs in thread executor (non-blocking)
<!-- AC:END -->
