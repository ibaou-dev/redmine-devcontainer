# Redmine Development Environment

A self-contained template for Redmine plugin and theme development.
Clone it, run `make setup`, and have a fully working Redmine instance in minutes.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker | 24.0+ | With Docker Compose v2 (`docker compose` subcommand) |
| Git | 2.30+ | Git worktree support required |
| Make | 3.81+ | GNU make |

> Node.js 18+ is only required if you add Playwright e2e tests to `e2e/`.

---

## Quick Start

```bash
# 1. Clone (or use this as a GitHub template)
git clone <your-repo-url> my-redmine-dev
cd my-redmine-dev

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum change POSTGRES_PASSWORD and REDMINE_SECRET_KEY_BASE

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

> **Default credentials:** `admin` / `admin`  
> Redmine will prompt you to change the password on first login.

> **Security:** The defaults in `.env.example` are for local development only.
> Always change `POSTGRES_PASSWORD` and `REDMINE_SECRET_KEY_BASE` before
> exposing this environment to any network.

---

## Project Structure

```
redmine-devcontainer/
├── plugins/                    # Your Redmine plugins (bind-mounted into container)
├── themes/                     # Your Redmine themes (bind-mounted into container)
├── config/
│   └── additional_environment.rb  # Rails host allowlist
├── scripts/
│   ├── setup.sh                # Full onboarding script (called by make setup)
│   ├── scaffold-plugin.sh      # Interactive plugin scaffolder
│   ├── scaffold-theme.sh       # Interactive theme scaffolder
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
│       ├── git-conventional-commits/   # Conventional commit messages
│       └── docker-expert/              # Docker expertise
├── docker-compose.yml          # Base compose (Traefik-enabled)
├── docker-compose.local.yml    # Local override (no Traefik, adds resource limits)
├── docker-compose.test.yml     # Standalone ephemeral environment (CI/DevContainers)
├── .devcontainer/
│   └── devcontainer.json       # VS Code DevContainer specification
├── .env.example                # Environment variable template
├── Makefile                    # Developer workflow commands
├── Dockerfile                  # Custom Redmine image (version from REDMINE_VERSION)
└── AGENTS.md                   # AI agent development guidelines
```

---

## Development Workflow

### Plugin Development

Drop your plugin directory into `plugins/` — it is bind-mounted and changes reflect
immediately (no restart for view/asset changes).

```bash
make scaffold-plugin    # Scaffold a new plugin interactively
make shell              # Open a shell in the running container
make migrate            # Run migrations after adding db/migrate/ files
make logs               # Tail Redmine logs
make restart            # Restart Redmine service after config/Ruby changes
```

The AI skill `redmine-plugin-developer` (in `.agents/skills/`) provides expert guidance
on Redmine 6.x plugin conventions: `init.rb`, hooks, monkey patches, models, controllers,
testing, and i18n. It auto-triggers when you work in `plugins/`.

### Theme Development

Drop your theme directory into `themes/` — changes reflect immediately after a browser
hard-refresh (Ctrl+Shift+R).

```bash
make scaffold-theme     # Scaffold a new theme interactively
```

CSS and JS are served directly by Propshaft (no compilation step needed).

The AI skill `redmine-theme-developer` auto-triggers when you work in `themes/`.

---

## Docker Compose Modes

### Local Mode (default — no Traefik required)

```bash
make start        # Start
make stop         # Stop
make restart      # Restart Redmine only
```

Combines `docker-compose.yml` + `docker-compose.local.yml`. Both networks become local
(no external Traefik required). Access at `http://localhost:${REDMINE_PORT:-4000}`.

Resource limits: Redmine 2 CPU / 3 GB, PostgreSQL 1 CPU / 1 GB.

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

---

## Git Worktrees (Parallel Development)

Work on multiple branches simultaneously with isolated Docker stacks:

```bash
# Create a new worktree on a new branch, starting on port 4010
make worktree BRANCH=feature/my-new-feature PORT=4010

# The worktree gets its own .env with unique COMPOSE_PROJECT_NAME
cd ../redmine-feature-my-new-feature
make start   # runs on port 4010, isolated from other stacks
```

Each worktree has a unique `COMPOSE_PROJECT_NAME` which Docker uses to prefix all
container, network, and volume names — complete isolation with no port conflicts.

---

## Scaffolding

Quickly generate a new plugin or theme skeleton:

```bash
make scaffold-plugin    # Prompts for name, author, description
make scaffold-theme     # Prompts for name and options
```

Or call the scripts directly for non-interactive use:

```bash
bash scripts/scaffold-plugin.sh redmine_my_plugin
bash scripts/scaffold-theme.sh my-theme
```

The AI skills `redmine-plugin-developer` and `redmine-theme-developer` can also scaffold
interactively — just describe what you want to build and the AI will guide you through it.

---

## E2E Tests

To add end-to-end tests, create an `e2e/` directory with Playwright:

```bash
mkdir e2e && cd e2e
npm init playwright@latest
```

Then use:
```bash
make test         # Start test env + run all Playwright tests
make start-test   # Start test environment only (for manual testing)
```

See `e2e/playwright.config.ts` for configuration. The test URL is
`http://localhost:${TEST_REDMINE_PORT:-4001}`.

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
- Forwards port 3000 (Redmine) and 5432 (PostgreSQL)
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
| `git-conventional-commits` | Commit messages, changelog |
| `git-workflow` | Git commits, branching, CONTRIBUTING.md |
| `docker-expert` | Dockerfiles, compose files, container issues |
| `skill-creator` | Creating/improving agent skills |

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
| `TRAEFIK_HOST` | `redmine.localhost` | Hostname for Traefik routing |
| `POSTGRES_PASSWORD` | _(change me)_ | PostgreSQL password |
| `REDMINE_SECRET_KEY_BASE` | _(change me)_ | Rails secret key base |
| `REDMINE_VERSION` | `6.1.1` | Redmine image tag and source reference version |
| `REDMINE_API_KEY` | _(unset)_ | Redmine system API key for repo-sync (optional) |
