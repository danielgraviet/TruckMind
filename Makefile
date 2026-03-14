dev-backend:
	cd backend && uv run uvicorn server:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	make -j2 dev-backend dev-frontend
