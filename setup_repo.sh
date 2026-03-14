#!/bin/bash

# --- Backend Structure ---
mkdir -p backend/agents
touch backend/agents/__init__.py
touch backend/agents/strategist.py
touch backend/agents/crowd.py
touch backend/agents/simulator.py
touch backend/agents/shop.py

mkdir -p backend/models
touch backend/models/__init__.py
touch backend/models/schema.py

mkdir -p backend/utils
touch backend/utils/__init__.py
touch backend/utils/llm_client.py
touch backend/utils/census.py

mkdir -p backend/engine
touch backend/engine/__init__.py
touch backend/engine/pipeline.py

touch backend/server.py
touch backend/requirements.txt

# --- Frontend Structure ---
mkdir -p frontend/src/components/pipeline
touch frontend/src/components/pipeline/ConceptInput.jsx
touch frontend/src/components/pipeline/StrategyCard.jsx
touch frontend/src/components/pipeline/ReactionBoard.jsx
touch frontend/src/components/pipeline/PersonaCard.jsx
touch frontend/src/components/pipeline/SimulationStats.jsx

mkdir -p frontend/src/components/shop
touch frontend/src/components/shop/ChatPanel.jsx
touch frontend/src/components/shop/InventoryBars.jsx
touch frontend/src/components/shop/PriceTable.jsx
touch frontend/src/components/shop/RevenueCounter.jsx
touch frontend/src/components/shop/ActionFeed.jsx

mkdir -p frontend/src/components/shared
touch frontend/src/components/shared/PhaseIndicator.jsx
touch frontend/src/components/shared/LoadingState.jsx

mkdir -p frontend/src/hooks
touch frontend/src/hooks/useSSE.js
touch frontend/src/hooks/useShop.js

mkdir -p frontend/src/pages
touch frontend/src/pages/PipelinePage.jsx
touch frontend/src/pages/ShopPage.jsx

touch frontend/src/App.jsx
touch frontend/src/main.jsx
touch frontend/index.html
touch frontend/tailwind.config.js
touch frontend/vite.config.js
touch frontend/package.json

# --- Root Files ---
touch .env.example
touch .gitignore
touch README.md
touch Makefile

echo "✅ Repository structure created successfully."