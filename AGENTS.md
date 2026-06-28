# Redmine Development Guidelines

This document outlines the approach for developing in this Redmine environment.

## Environment Overview

- **Version:** Redmine 6.x (see `REDMINE_VERSION` in `.env` — default 6.1.2)
- **Stack:** Rails 7.2, Ruby 3.2+, PostgreSQL 14, Docker
- **Base Directory (in container):** `/usr/src/redmine`
- **Development Workflow:**
    - This devcontainer is the **stable workspace root** (Docker, Make, and the AI skills
      via `.claude/skills` → `.agents/skills`). **Plugins live in `plugins/<name>`**
      (git-ignored) and are bind-mounted in. Run the agent/editor session from the
      **devcontainer root** so skills auto-trigger for the attached plugin.
    - `themes/` and `plugins/` directories are bind-mounted into the container.
    - Changes made locally are reflected immediately (no restart needed for CSS/views).
    - Ruby/config changes may require `make restart`.
- **Reference Code:** Redmine source at `.references/redmine` (local-only, initialize with `make references`).

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

- **`redmine-cli`** — Manage Redmine issues via REST API. Python CLI at `.agents/skills/redmine-cli/scripts/redmine_cli.py`. Configuration in `.red/config.json` (git-ignored).

### Infrastructure Skills

- **`docker-expert`** — Docker and Docker Compose expertise. Use when modifying `Dockerfile`, `docker-compose*.yml`, or troubleshooting container issues.

- **`git-workflow`** — Git workflow, Conventional Commits, branching strategy. Use when creating branches, writing commit messages, or setting up CONTRIBUTING.md.

- **`git-conventional-commits`** — Structured commit message generation with Conventional Commits spec. Auto-detects project issue tracker format.

### Agent/Skill Management

- **`skill-creator`** — Create and improve agent skills. Targets Claude Code skills (`.agents/skills/<name>/SKILL.md`). Includes evaluation framework.

## Reference Paths

### Plugin Development
- **Core extension points:** `.references/redmine/lib/redmine/` — plugin, hook, acts_as modules
- **Available view hooks:** Search `.references/redmine/app/views/` for `call_hook`
- **Test fixtures:** `.references/redmine/test/fixtures/`

### Theme Development
- **Core Stylesheets:** `.references/redmine/app/assets/stylesheets/application.css`
- **Responsive:** `.references/redmine/app/assets/stylesheets/responsive.css`
- **Official themes:** `.references/redmine/app/assets/themes/`

## Scaffolding New Plugins and Themes

```bash
make scaffold-plugin    # Interactive: prompts for name, author, description
make scaffold-theme     # Interactive: prompts for name and options
```

Or use the AI skills directly — just describe what you want and the agent will
scaffold the correct structure for your Redmine version.

## Attaching an Existing Plugin

To work on a plugin that already has its own git repository, attach it into `plugins/`
instead of scaffolding. A **local** repo is attached as a git **worktree** (no second
copy; shares the source repo's `.git` and remotes), a **remote** URL is cloned.

```bash
make attach-plugin SRC=../redmine_my_plugin                    # worktree, branch wt/<name>
make attach-plugin SRC=../redmine_my_plugin REF=feature/x      # worktree on a branch
make attach-plugin SRC=https://git.example.com/me/plugin.git   # clone
make detach-plugin NAME=redmine_my_plugin                      # remove (worktree-aware)
```

`attach-plugin` rebuilds the image (to install the plugin's `PluginGemfile` gems) and runs
plugin migrations. Commit/branch/push from **inside `plugins/<name>`** — it is the real
plugin repo; the devcontainer never tracks it (`plugins/*` is git-ignored). Running the
plugin's tests needs the `test` bundle group, which this dev image omits — give the plugin
a self-contained CI image (official `redmine:` base + full `bundle install`).

## CI/CD

Each plugin ships its own CI/CD config and follows a shared pipeline (test image → test →
SonarQube branch/PR analysis → quality gate → PR → merge → package → tag → release). See
**[docs/CICD.md](docs/CICD.md)** for the layout, realistic per-plugin quality gates, and the
gotchas — in particular: **add an eager-load boot check**
(`bundle exec rails runner "Rails.application.eager_load!"`) so load-time errors fail CI
instead of crash-looping production, and remember the dev image omits the `test` bundle group.

## Implementation Workflow

When working on new features or changes:

1. Check `.references/redmine` to understand Redmine's core logic and available hooks.
2. Use the `redmine-plugin-developer` skill for plugin work, `redmine-theme-developer` for theme work.
3. Run `make migrate` after adding any new migration files.
4. Test changes against the live environment at `http://localhost:${REDMINE_PORT:-4000}`.
5. Never translate (`l()`/`I18n`) or hit the DB at module/class-body load time — it crashes
   eager-load in production (see the `redmine-plugin-developer` skill → *Load-time safety*).

## Git Worktrees

Worktrees allow simultaneous work on multiple branches, each with an isolated Docker stack.

**Standard location: sibling directories next to the main repo.**

```
/path/to/workspace/
├── redmine-devcontainer/   ← main repo
├── redmine-feature-foo/    ← worktree
└── redmine-fix-bar/        ← worktree
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
cd ../redmine-devcontainer
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
