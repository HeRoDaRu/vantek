# ──────────────────────────────────────────────────────────────────────────────
# Makefile — developer shortcuts for Vantek (host has no node → run via Docker)
# ──────────────────────────────────────────────────────────────────────────────
#
# WHAT IT DOES
#   Wraps the npm test workflow in a node:22 container so the suite runs without
#   a local Node install. Targets cover one-time setup (deps + native build) and
#   running the backend/frontend Vitest suites.
#
# USAGE
#   make setup   # install deps + compile better-sqlite3 (run once)
#   make test    # run both suites (backend + frontend)
#   make test-backend / make test-frontend
#
# NOTES
#   · better-sqlite3 ships no prebuilt binary for this Node → must build-release.
#   · The workspace is bind-mounted at /app inside the container.
# ──────────────────────────────────────────────────────────────────────────────

NODE_IMAGE := node:22
DOCKER_RUN := docker run --rm -v "$(CURDIR)":/app -w /app $(NODE_IMAGE) bash -lc

.DEFAULT_GOAL := test
.PHONY: setup install build-sqlite test test-backend test-frontend watch-backend watch-frontend clean deps-outdated deps-update deps-update-majors

## setup: install dependencies and compile native modules (run once)
setup: install build-sqlite

## install: install monorepo dependencies
install:
	$(DOCKER_RUN) 'npm install'

## build-sqlite: compile better-sqlite3 from source (no prebuilt binary)
build-sqlite:
	docker run --rm -v "$(CURDIR)":/app -w /app/node_modules/better-sqlite3 $(NODE_IMAGE) bash -lc 'npm run build-release'

## test: run backend + frontend test suites
test:
	$(DOCKER_RUN) 'npm test'

## test-backend: run the backend Vitest suite
test-backend:
	$(DOCKER_RUN) 'npm run test --workspace=app/backend'

## test-frontend: run the frontend Vitest suite
test-frontend:
	$(DOCKER_RUN) 'npm run test --workspace=app/frontend'

## watch-backend: run the backend suite in watch mode
watch-backend:
	$(DOCKER_RUN) 'npm run test:watch --workspace=app/backend'

## watch-frontend: run the frontend suite in watch mode
watch-frontend:
	$(DOCKER_RUN) 'npm run test:watch --workspace=app/frontend'

## clean: remove installed dependencies
clean:
	$(DOCKER_RUN) 'rm -rf node_modules app/backend/node_modules app/frontend/node_modules'

## deps-outdated: report outdated npm packages across all workspaces (no changes)
deps-outdated:
	$(DOCKER_RUN) 'npm outdated --workspaces --include-workspace-root || true'

## deps-update: bump deps within the current major (safe), regen lock, rebuild sqlite
deps-update:
	$(DOCKER_RUN) 'bash scripts/update-deps.sh'
	$(MAKE) build-sqlite

## deps-update-majors: bump deps to latest incl. majors (breaking), regen lock, rebuild sqlite
deps-update-majors:
	$(DOCKER_RUN) 'bash scripts/update-deps.sh --majors'
	$(MAKE) build-sqlite
