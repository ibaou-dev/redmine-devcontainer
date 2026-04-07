# Makefile — Redmine Development Environment
# Requires: docker compose v2, make, bash
#
# Quick start:
#   make setup        # Full onboarding (first time only)
#   make start        # Start local dev environment
#   make help         # Show all commands

# Load .env if it exists (provides REDMINE_PORT, COMPOSE_PROJECT_NAME, etc.)
-include .env
export

COMPOSE_LOCAL   := docker compose -f docker-compose.yml -f docker-compose.local.yml
COMPOSE_TEST    := docker compose -f docker-compose.test.yml
COMPOSE_TRAEFIK := docker compose -f docker-compose.yml

.PHONY: help setup start start-local stop stop-local restart logs shell \
        migrate seed test start-test stop-test start-traefik stop-traefik \
        references worktree worktree-remove build lint scaffold-plugin scaffold-theme

help: ## Show available commands
	@printf '\nRedmine Development Environment\n\n'
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@printf '\n'

# ── First-time setup ──────────────────────────────────────────────────────────

setup: ## Full developer onboarding: check deps, .env, references, start, migrate, seed
	@bash scripts/setup.sh

# ── Local development (no Traefik required) ───────────────────────────────────

start: start-local ## Alias for start-local

start-local: ## Start local environment (no Traefik required)
	$(COMPOSE_LOCAL) up -d

stop: stop-local ## Alias for stop-local

stop-local: ## Stop local environment
	$(COMPOSE_LOCAL) down

restart: ## Restart redmine service only
	$(COMPOSE_LOCAL) restart redmine

build: ## Rebuild the redmine image
	$(COMPOSE_LOCAL) build redmine

logs: ## Tail redmine service logs
	$(COMPOSE_LOCAL) logs -f redmine

shell: ## Open a bash shell in the running redmine container
	$(COMPOSE_LOCAL) exec redmine bash

migrate: ## Run Redmine DB + plugin migrations
	$(COMPOSE_LOCAL) exec redmine bundle exec rake db:migrate RAILS_ENV=development
	$(COMPOSE_LOCAL) exec redmine bundle exec rake redmine:plugins:migrate RAILS_ENV=development

seed: ## Seed database with default Redmine data
	$(COMPOSE_LOCAL) exec redmine bundle exec rake db:seed RAILS_ENV=development

# ── Test / CI / DevContainer environment ─────────────────────────────────────

start-test: ## Start ephemeral test environment (port TEST_REDMINE_PORT, tmpfs postgres)
	$(COMPOSE_TEST) up -d

stop-test: ## Stop and remove ephemeral test environment
	$(COMPOSE_TEST) down

test: ## Run Playwright e2e tests (starts test env, waits, then runs tests)
	@test -d e2e || (echo "No e2e/ directory found. Create one with Playwright tests first. See CONTRIBUTING.md." && exit 1)
	$(COMPOSE_TEST) up -d
	@bash scripts/wait-healthy.sh redmine $${TEST_REDMINE_PORT:-4001}
	cd e2e && npx playwright test

# ── Traefik environment (requires external devlocal-net and proxy networks) ───

start-traefik: ## Start with Traefik routing (requires devlocal-net + proxy external networks)
	$(COMPOSE_TRAEFIK) up -d

stop-traefik: ## Stop Traefik environment
	$(COMPOSE_TRAEFIK) down

# ── Development utilities ─────────────────────────────────────────────────────

references: ## Initialize .references/redmine from GitHub (one-time, uses REDMINE_VERSION from .env)
	@bash scripts/init-references.sh

worktree: ## Create a git worktree with isolated compose: make worktree BRANCH=feature/foo PORT=4010
	@test -n "$(BRANCH)" || (echo "Usage: make worktree BRANCH=<branch-name> [PORT=<port>]" && exit 1)
	@bash scripts/new-worktree.sh "$(BRANCH)" "$(PORT)"

worktree-remove: ## Remove a git worktree and delete its branch: make worktree-remove BRANCH=feature/foo
	@test -n "$(BRANCH)" || (echo "Usage: make worktree-remove BRANCH=<branch-name>" && exit 1)
	$(eval SLUG := $(shell echo "$(BRANCH)" | tr '/' '-' | tr '_' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g'))
	$(eval DIR  := $(shell pwd)/../redmine-$(SLUG))
	@git worktree remove "$(DIR)" && git branch -d "$(BRANCH)" && echo "Removed worktree $(DIR) and branch $(BRANCH)."

lint: ## Run RuboCop on plugin code
	bundle exec rubocop plugins/

# ── Scaffolding ───────────────────────────────────────────────────────────────

scaffold-plugin: ## Scaffold a new Redmine plugin interactively (or: make scaffold-plugin NAME=redmine_foo)
	@bash scripts/scaffold-plugin.sh "$(NAME)"

scaffold-theme: ## Scaffold a new Redmine theme interactively (or: make scaffold-theme NAME=my-theme)
	@bash scripts/scaffold-theme.sh "$(NAME)"
