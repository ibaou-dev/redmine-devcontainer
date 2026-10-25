---
type: "runbook"
title: "First-run setup"
description: "Bring a fresh clone to a working Redmine instance with one command."
status: "draft"
tags:
  - "setup"
  - "onboarding"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# First-run setup

## Purpose

Take a fresh clone of this workspace to a running, migrated, seeded Redmine you can log
into. Run once per clone or worktree.

## Preconditions

| Tool | Version | Why |
|---|---|---|
| Docker | 24.0+ | With Compose v2 — the `docker compose` subcommand, not `docker-compose` |
| Git | 2.30+ | Worktree support |
| Make | 3.81+ | GNU make |

`make setup` checks these and stops with the list of what is missing rather than failing
part-way.

Node.js 18+ is needed only if you add Playwright e2e tests.

## Procedure

```bash
git clone <your-repo-url> my-redmine-dev
cd my-redmine-dev

cp .env.example .env
# Change POSTGRES_PASSWORD and REDMINE_SECRET_KEY_BASE before any networked use.

make setup
```

`make setup` checks dependencies, creates `.env` if absent, bootstraps
`.claude/settings.local.json` from its tracked `.example`, starts PostgreSQL and Redmine in
local mode, waits for health, runs Redmine and plugin migrations, then seeds default data.

Every variable it reads is in [configuration](../references/configuration.md).

## Verification

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:4000
```

Expect `200`. Then open `http://localhost:4000` and sign in with `admin` / `admin`;
Redmine forces a password change on first login.

```bash
make logs      # should be quiet, no repeating stack trace
```

Optionally fetch the Redmine source for IDE and agent navigation:

```bash
make references
```

## Failure modes

**`docker compose` not found, but `docker-compose` works.** You have Compose v1. The
Makefile uses the v2 subcommand throughout. Install the Compose plugin.

**Port 4000 already in use.** Set `REDMINE_PORT` in `.env`. If this clone is a worktree,
it also needs its own `COMPOSE_PROJECT_NAME` — `make worktree` sets both, a manual `git
worktree add` does not. See [parallel-worktrees](parallel-worktrees.md).

**Migrations fail on a half-created database.** The stack is disposable in local mode:

```bash
make stop-local
docker volume rm "$(basename "$PWD")_db-data" 2>/dev/null || true
make setup
```

**Redmine starts and then exits.** Almost always an attached plugin failing at load time —
a translation call or a database query in a module or class body. `make logs` shows the
trace. Detach the plugin (`make detach-plugin NAME=<dir>`) to confirm, then fix the
load-time call; [agent-skills](../references/agent-skills.md) explains the rule.

**`make references` is slow or fails.** It clones the full Redmine source for
`REDMINE_VERSION`. The version must be a real `redmine:` image tag; a typo yields a clone
of a non-existent ref.
