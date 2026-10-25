---
type: "reference"
title: "Make targets"
description: "Every target in the Makefile, grouped by what it is for."
status: "draft"
tags:
  - "make"
  - "workflow"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Make targets

`make help` prints this list from the Makefile itself. This page groups the same targets by
purpose and notes the ones with arguments.

## Onboarding

| Target | Does |
|---|---|
| `make setup` | Full onboarding: check dependencies, create `.env`, fetch references, start, migrate, seed. Run once. |
| `make references` | Clone the Redmine source matching `REDMINE_VERSION` into `.references/redmine`. |

## Environment lifecycle

| Target | Does |
|---|---|
| `make start` | Alias for `start-local`. |
| `make start-local` | Start the local stack (no Traefik). |
| `make stop` | Alias for `stop-local`. |
| `make stop-local` | Stop the local stack. |
| `make restart` | Restart the `redmine` service only — use after Ruby or config changes. |
| `make build` | Rebuild the Redmine image. |
| `make logs` | Tail Redmine logs. |
| `make shell` | Open a bash shell in the running Redmine container. |
| `make migrate` | Run Redmine and plugin migrations. |
| `make seed` | Seed default Redmine data. |

## Test and ephemeral stack

| Target | Does |
|---|---|
| `make start-test` | Start the ephemeral stack on `TEST_REDMINE_PORT` with `tmpfs` PostgreSQL. |
| `make stop-test` | Stop it and discard all data. |
| `make test` | Start the test stack, wait for health, run Playwright e2e, stop. |

## Traefik mode

| Target | Does |
|---|---|
| `make start-traefik` | Start with Traefik routing. Requires the external `devlocal-net` and `proxy` networks. |
| `make stop-traefik` | Stop the Traefik stack. |

## Plugins and themes

| Target | Arguments | Does |
|---|---|---|
| `make scaffold-plugin` | `[NAME=redmine_foo]` | Scaffold a new plugin. Interactive without `NAME`. |
| `make scaffold-theme` | `[NAME=my-theme]` | Scaffold a new theme. Interactive without `NAME`. |
| `make attach-plugin` | `SRC=<path\|url> [NAME=] [REF=]` | Attach an existing plugin repo into `plugins/`, rebuild, migrate. |
| `make detach-plugin` | `NAME=<dir>` | Remove an attached plugin. Worktree-aware. |

## Worktrees

| Target | Arguments | Does |
|---|---|---|
| `make worktree` | `BRANCH=feature/foo [PORT=4010]` | Create a sibling worktree with its own isolated Compose stack. |
| `make worktree-remove` | `BRANCH=feature/foo` | Remove the worktree and delete its branch. |

## Quality

| Target | Does |
|---|---|
| `make lint` | Run RuboCop against plugin code. |
| `make help` | Print the generated target list. |
