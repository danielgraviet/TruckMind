# TICKET-0: Project scaffolding and repo setup

**Assignee:** Anyone (do this first, together)
**Priority:** P0 — Blocker
**Estimate:** 30 minutes
**Dependencies:** None
**Blocks:** Everything

---

## Goal

Get the repo created, dependencies installed, environment configured, and the existing backend code dropped in so the whole team can start working.

## Tasks

- [ ] Create the GitHub repo
- [ ] Set up the directory structure:
  ```
  truckmind/
  ├── backend/
  │   ├── agents/
  │   ├── models/
  │   ├── utils/
  │   ├── engine/
  │   └── requirements.txt
  ├── frontend/
  ├── .env.example
  ├── .gitignore
  ├── README.md
  └── Makefile
  ```
- [ ] Copy in the existing backend code (schema.py, all agents, llm_client.py, census.py, pipeline.py)
- [ ] Add `__init__.py` files to all Python packages
- [ ] Install backend dependencies using the pinned file (do **not** overwrite it with `pip freeze`):
  ```bash
  cd backend
  pip install -r requirements.txt
  ```
- [ ] Set up `.env` with `ANTHROPIC_API_KEY` and `CENSUS_API_KEY`
- [ ] Scaffold the frontend:
  ```bash
  cd frontend
  npm create vite@latest . -- --template react
  npm install
  npm install tailwindcss @tailwindcss/vite
  ```
- [ ] Create the Makefile:
  ```makefile
  dev-backend:
  	cd backend && uvicorn server:app --reload --port 8000

  dev-frontend:
  	cd frontend && npm run dev

  dev:
  	make -j2 dev-backend dev-frontend
  ```
- [ ] Verify the backend pipeline runs in mock mode:
  ```bash
  cd backend
  python -m engine.pipeline "Taco truck near BYU" --location "Provo, UT" --mock
  ```
- [ ] Push to main. Everyone pulls.

## Definition of done

Every team member can clone the repo, run `make dev`, and see the backend start on :8000 and the frontend on :5173.

## Notes

- Don't bikeshed the frontend styling yet — just get Vite + Tailwind running
- The `.gitignore` should include: `__pycache__/`, `node_modules/`, `.env`, `*.pyc`, `.venv/`
