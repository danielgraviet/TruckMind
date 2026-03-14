.PHONY: dev dev-backend dev-frontend

dev:
	@trap 'kill 0' EXIT; \
	cd backend && uv run uvicorn server:app --reload --port 8000 & \
	cd frontend && npm run dev & \
	wait

dev-backend:
	cd backend && uv run uvicorn server:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev
