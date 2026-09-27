.PHONY: install build-index dev build start test typecheck screenshots clean

# Install all workspace dependencies (server and web).
install:
	npm install

# Build the embedding index from the Markdown knowledge base.
build-index:
	npm run build:index

# Run the backend (tsx watch) and the Vite dev server together.
# Use two terminals, or run them separately: `make dev-server` / `make dev-web`.
dev:
	npm run dev:server & npm run dev:web

dev-server:
	npm run dev:server

dev-web:
	npm run dev:web

# Build the production frontend.
build:
	npm run build

# Start the production server (serves the built frontend and the API).
start:
	npm start

# Run the test suite.
test:
	npm test

# Type-check the backend and the frontend.
typecheck:
	npm run typecheck

# Regenerate the README screenshots (requires a running server and a model).
screenshots:
	npx tsx scripts/screenshot.ts

clean:
	rm -rf dist web/dist data/index.json
