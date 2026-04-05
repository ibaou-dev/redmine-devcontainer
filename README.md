# Redmine Development Environment

A self-contained, self-installing template for Redmine 6.x plugin and theme development.
Clone it, run `make setup`, and have a fully working Redmine instance in minutes.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker | 24.0+ | With Docker Compose v2 (`docker compose` subcommand) |
| Git | 2.30+ | Git worktree support required |
| Make | 3.81+ | GNU make |
| Node.js | 18+ | For Playwright e2e tests |

---

## Quick Start

```bash
# 1. Clone (or use this as a GitHub template)
git clone <your-repo-url> redmine-development
cd redmine-development

# 2. Configure environment
cp .env.example .env
# Edit .env to set your COMPOSE_PROJECT_NAME and ports if needed

# 3. One-command setup
make setup
```

`make setup` will:
- Check all dependencies
- Start PostgreSQL and Redmine containers (no Traefik required)
- Wait for Redmine to be healthy
- Run database migrations and plugin migrations
- Seed default Redmine data

Redmine is then available at **http://localhost:4000** (or `REDMINE_PORT` from `.env`).

> Credentials: see `.agents/notes/login_credentials.md`

---

## Project Structure

```
redmine-development/
├── plugins/                    # Redmine plugins (bind-mounted into container)
│   └── redmine_pipeline_tracker/           # Example: CI/CD integration plugin
├── themes/                     # Redmine themes (bind-mounted into container)
│   └── ibaou-modern/         # Example: modern JIRA-inspired theme
├── config/
│   └── additional_environment.rb  # Rails host allowlist
├── e2e/                        # Playwright end-to-end tests
├── scripts/
│   ├── setup.sh                # Full onboarding script (called by make setup)
│   ├── init-references.sh      # Clone Redmine source into .references/
│   ├── new-worktree.sh         # Create isolated git worktree
│   └── wait-healthy.sh         # Poll until Redmine responds
├── .agents/
│   └── skills/                 # AI agent skills for development
│       ├── redmine-plugin-developer/   # Redmine 6.x plugin patterns
│       ├── redmine-theme-developer/    # Redmine 6.x theme patterns
│       ├── redmine-cli/                # Redmine REST API CLI
│       ├── skill-creator/              # Create/improve agent skills
│       ├── git-workflow/               # Git conventions
│       ├── docker-expert/              # Docker expertise
│       ├── beads/                      # Task management
│       └── opencode-agent-creator/     # OpenCode agent creation
├── docker-compose.yml          # Base compose (Traefik-enabled)
├── docker-compose.local.yml    # Local override (no Traefik, adds resource limits)
├── docker-compose.test.yml     # Standalone ephemeral environment (CI/DevContainers)
├── .devcontainer/
│   └── devcontainer.json       # VS Code DevContainer specification
├── .env.example                # Environment variable template
├── Makefile                    # Developer workflow commands
├── Dockerfile                  # Custom redmine:6.1.1 image
└── AGENTS.md                   # AI agent development guidelines
```

---

## Development Workflow

### Plugin Development

Edit files in `plugins/<your_plugin>/` — changes reflect immediately (bind-mounted).

```bash
make shell   # Open a shell in the running container
make migrate # Run migrations after adding db/migrate/ files
make logs    # Tail Redmine logs
make restart # Restart Redmine service after config changes
```

The AI skill `redmine-plugin-developer` (in `.agents/skills/`) provides expert guidance
on Redmine 6.x plugin conventions: `init.rb`, hooks, monkey patches, models, controllers,
testing, and i18n. It auto-triggers when you work in `plugins/`.

### Theme Development

Edit files in `themes/<your_theme>/` — changes reflect immediately (bind-mounted).

CSS and JS are served directly by Propshaft (no compilation). Hard-refresh your browser
after changes.

The AI skill `redmine-theme-developer` auto-triggers when you work in `themes/`.

---

## Docker Compose Modes

Three compose configurations are available:

### Local Mode (default — no Traefik required)

```bash
make start        # Start
make stop         # Stop
make restart      # Restart Redmine only
```

Combines `docker-compose.yml` + `docker-compose.local.yml`. Both networks become local
(no external Traefik required). Access at `http://localhost:${REDMINE_PORT:-4000}`.

Resource limits: Redmine 2 CPU / 2 GB, PostgreSQL 1 CPU / 1 GB.

### Traefik Mode (for users with a Traefik proxy)

```bash
make start-traefik
```

Uses `docker-compose.yml` only. Requires `devlocal-net` and `proxy` external Docker networks.
Set `TRAEFIK_HOST` in `.env`. Routes via HTTPS at the configured hostname.

### Test / CI / DevContainer Mode

```bash
make start-test   # Start ephemeral environment
make stop-test    # Stop and discard all data
make test         # Start, wait, run Playwright tests, stop
```

Uses `docker-compose.test.yml` (standalone). PostgreSQL data is RAM-backed (`tmpfs`) —
fully ephemeral, zero state between runs. Test Redmine on port `${TEST_REDMINE_PORT:-4001}`.

Resource limits: Redmine 1.5 CPU / 1.5 GB, PostgreSQL 0.5 CPU / 512 MB.

---

## Git Worktrees (Parallel Development)

Work on multiple branches simultaneously with isolated Docker stacks:

```bash
# Create a new worktree on a new branch, starting on port 4010
make worktree BRANCH=feature/my-new-feature PORT=4010

# The worktree gets its own .env with unique COMPOSE_PROJECT_NAME
# cd to it and start independently:
cd ../redmine-feature-my-new-feature
make start   # runs on port 4010, isolated from other stacks
```

Each worktree has a unique `COMPOSE_PROJECT_NAME` which Docker uses to prefix all
container, network, and volume names — complete isolation with no port conflicts.

---

## E2E Tests

```bash
make test         # Start test env + run all Playwright tests
make start-test   # Start test env only (for manual testing)
```

Tests live in `e2e/`. Playwright configuration: `e2e/playwright.config.ts`.
Test environment URL: `http://localhost:${TEST_REDMINE_PORT:-4001}`.

---

## Redmine Source Reference

For IDE navigation and AI agent use, initialize a local read-only copy of the Redmine source:

```bash
make references
# Clones Redmine REDMINE_VERSION (from .env) into .references/redmine/
# git-ignored — not committed, local only
```

AI skills use this to find base stylesheets, available hooks, fixture files, and core patterns.

---

## DevContainer (VS Code)

Open this repository in VS Code and select **"Reopen in Container"**. The DevContainer:
- Uses `docker-compose.test.yml` (ephemeral, no Traefik)
- Forwards port 4001 (Redmine) and 5432 (PostgreSQL)
- Installs Ruby LSP, Solargraph, Playwright extensions
- Runs migrations and seeds on first start

---

## AI Agent Skills

This repository includes agent skills in `.agents/skills/` that provide domain-specific
expertise. They auto-trigger based on context in Claude Code and OpenCode.

| Skill | Triggers on |
|-------|-------------|
| `redmine-plugin-developer` | Files in `plugins/`, `init.rb`, hooks, migrations |
| `redmine-theme-developer` | Files in `themes/`, CSS, `theme.js` |
| `redmine-cli` | Redmine API, issue management, `.red/config.json` |
| `skill-creator` | Creating/improving agent skills |
| `git-workflow` | Git commits, branching, CONTRIBUTING.md |
| `docker-expert` | Dockerfiles, compose files, container issues |
| `beads` | Task/issue tracking |
| `opencode-agent-creator` | Creating OpenCode agents |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, commit format, and
the development workflow.

---

## Configuration Reference

All configuration is via `.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_PROJECT_NAME` | `redmine-dev` | Docker project prefix (unique per worktree) |
| `REDMINE_PORT` | `4000` | Local dev Redmine port |
| `TEST_REDMINE_PORT` | `4001` | Test/CI/DevContainer Redmine port |
| `TRAEFIK_HOST` | `redmine.int.sumsol.gr` | Hostname for Traefik routing |
| `POSTGRES_PASSWORD` | `password` | PostgreSQL password |
| `REDMINE_SECRET_KEY_BASE` | `development_secret_key_base` | Rails secret |
| `REDMINE_VERSION` | `6.1.1` | Redmine version for `make references` |
