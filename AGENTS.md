# Redmine Development Guidelines

This document outlines the approach for developing in this Redmine 6.1.1 environment.

## Environment Overview

- **Version:** Redmine 6.1.1 (Dockerized, Rails 7.2.3, Ruby 3.2+)
- **Base Directory (in container):** `/usr/src/redmine`
- **Development Workflow:**
    - `themes/` and `plugins/` directories are bind-mounted into the container.
    - Changes made locally are reflected immediately (no restart needed for CSS/views).
    - Ruby/config changes may require `make restart`.
- **Reference Code:** Full Redmine 6.1.1 source at `.references/redmine` (local-only, initialize with `make references`).

## Starting the Environment

```bash
make setup       # First time: full setup including build, migrate, seed
make start       # Subsequent starts (no Traefik required)
make start-test  # Ephemeral environment for tests/CI
make start-traefik  # With Traefik (requires external networks)
```

## Special Skills

For specialized development tasks, use these local skills (in `.agents/skills/`):

### Core Development Skills

- **`redmine-plugin-developer`** — Expert Redmine 6.x plugin developer. Covers `init.rb` registration, hook system, monkey patching, `acts_as_*` model patterns, controller auth patterns (`require_admin`, `accept_api_auth`), migrations, testing, i18n, and Propshaft assets. **Auto-triggers for any file in `plugins/`**.
  Reference files: `init-and-registration`, `hooks-and-patches`, `models-and-migrations`, `controllers-and-views`, `testing`, `assets-and-i18n`.

- **`redmine-theme-developer`** — Expert in Redmine 6.x theme development. Covers Propshaft asset pipeline, CSS custom properties, `theme.js` DOM patterns, base stylesheet override approach. **Auto-triggers for any file in `themes/`**.

- **`redmine-cli`** — Manage Redmine issues via REST API. Python CLI at `scripts/redmine_cli.py`. Configuration in `.red/config.json`.

### Infrastructure Skills

- **`docker-expert`** — Docker and Docker Compose expertise. Use when modifying `Dockerfile`, `docker-compose*.yml`, or troubleshooting container issues.

- **`git-workflow`** — Git workflow, Conventional Commits, branching strategy. Use when creating branches, writing commit messages, or setting up CONTRIBUTING.md.

### Agent/Skill Management

- **`skill-creator`** — Create and improve agent skills. Targets Claude Code skills (`.agents/skills/<name>/SKILL.md`) and OpenCode agents (`.opencode/agents/<name>.md`). Includes evaluation framework.

- **`opencode-agent-creator`** — Create OpenCode agents with YAML frontmatter configuration.

### Task Management

- **`beads`** — Git-backed issue tracking with dependency awareness. Use instead of TodoWrite.

## Reference Paths

### Plugin Development
- **Plugin examples:** `plugins/redmine_pipeline_tracker/` — real in-progress CI/CD plugin
- **Core extension points:** `.references/redmine/lib/redmine/` — plugin, hook, acts_as modules
- **Available view hooks:** Search `.references/redmine/app/views/` for `call_hook`
- **Test fixtures:** `.references/redmine/test/fixtures/`

### Theme Development
- **Core Stylesheets:** `.references/redmine/app/assets/stylesheets/application.css`
- **Responsive:** `.references/redmine/app/assets/stylesheets/responsive.css`
- **Official themes:** `.references/redmine/app/assets/themes/`
- **Theme example:** `themes/ibaou-modern/` — modern JIRA-inspired theme

## Implementation Workflow

When working on new features or changes:

1. Check `.references/redmine` to understand Redmine's core logic and available hooks.
2. Use the `redmine-plugin-developer` skill for plugin work, `redmine-theme-developer` for theme work.
3. Run `make migrate` after adding any new migration files.
4. Test changes against the live environment at `http://localhost:${REDMINE_PORT:-4000}`.
5. Run `make test` for e2e validation of UI changes.

## Git Worktrees

Worktrees allow simultaneous work on multiple branches, each with an isolated Docker stack.

**Standard location: sibling directories next to the main repo.**

```
/home/ibaou/workspace/
├── redmine-development/        ← main repo
├── redmine-feature-foo/        ← worktree
└── redmine-fix-bar/            ← worktree
```

### Create
```bash
# From the main repo:
make worktree BRANCH=feature/my-feature PORT=4010
cd ../redmine-feature-my-feature
make start        # Starts on port 4010, isolated from all other stacks
make migrate      # After adding new migrations
```

`PORT` is optional (default 4010). Each worktree gets its own `COMPOSE_PROJECT_NAME`, `REDMINE_PORT`, and `TEST_REDMINE_PORT` in its `.env` — Docker prefixes all container, network, and volume names with it so nothing conflicts.

### Work
```bash
make restart      # After Ruby/config changes
make test         # e2e tests on isolated TEST_REDMINE_PORT
```

### Commit, push, merge
```bash
# Commit and push from within the worktree as normal:
git add ... && git commit -m "feat(...): ..."
git push -u origin feature/my-feature

# Merge back from the main repo:
cd ../redmine-development
git merge feature/my-feature --no-ff
```

### Remove
```bash
# From the main repo:
make worktree-remove BRANCH=feature/my-feature
```

## Docker Compose Modes

| Command | Compose Files | Use Case |
|---------|--------------|----------|
| `make start` | `docker-compose.yml` + `docker-compose.local.yml` | Daily development (no Traefik) |
| `make start-traefik` | `docker-compose.yml` | Production-like with Traefik routing |
| `make start-test` | `docker-compose.test.yml` | CI, tests, DevContainers |
