---
type: "reference"
title: "Configuration"
description: "Every environment variable, Compose mode and resource limit this workspace reads."
status: "draft"
tags:
  - "configuration"
  - "docker"
  - "environment"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Configuration

All configuration is environment-based. Copy `.env.example` to `.env` and edit; `.env` is
git-ignored and never committed.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `redmine-dev` | Docker resource prefix. **Must be unique per worktree** — this is what keeps parallel stacks from colliding. |
| `REDMINE_PORT` | `4000` | Host port for local and Traefik modes. Container always listens on 3000. |
| `TEST_REDMINE_PORT` | `4001` | Host port for the ephemeral test/CI/DevContainer stack. |
| `TRAEFIK_HOST` | `redmine.localhost` | Routing hostname. Only read in Traefik mode. |
| `POSTGRES_PASSWORD` | `change_me_in_production` | PostgreSQL password. |
| `REDMINE_SECRET_KEY_BASE` | `development_secret_key_base_change_me` | Rails secret key base. |
| `REDMINE_VERSION` | `6.1.2` | Drives **both** the base image tag and the source cloned by `make references`. Must be a real `redmine:` tag. |
| `REDMINE_API_KEY` | unset | Only needed for the `repo-sync` service (git repository mirroring). Blank disables the changeset fetch. |

> The two `change_me` defaults are for a loopback-only development stack. Change both
> before this environment is reachable from any network.

## Compose modes

Three modes, selected by Make target rather than by editing files.

| Mode | Target | Compose files | Characteristics |
|---|---|---|---|
| **Local** (default) | `make start` | `docker-compose.yml` + `docker-compose.local.yml` | No Traefik, no external networks. Both networks become local bridges. Serves on `REDMINE_PORT`. |
| **Traefik** | `make start-traefik` | `docker-compose.yml` | Requires the external `devlocal-net` and `proxy` networks to already exist. Routes by `TRAEFIK_HOST`. |
| **Test / CI / DevContainer** | `make start-test` | `docker-compose.test.yml` | Standalone. PostgreSQL data is `tmpfs`-backed, so state is discarded on stop. Serves on `TEST_REDMINE_PORT`. |

The local override exists because the base `docker-compose.yml` declares both networks as
external, which assumes a Traefik host. The override redefines them as local bridges and
adds the resource limits below.

## Resource limits (local mode only)

| Service | CPUs | Memory | Reservation |
|---|---|---|---|
| `redmine` | 2.0 | 3 GB | 0.5 CPU / 512 MB |
| `postgres` | 1.0 | 1 GB | — |
| `repo-sync` | 0.25 | 128 MB | — |

These are set in `docker-compose.local.yml` and apply to `make start` only. Traefik and
test modes are uncapped.

## Paths that are local-only

Git-ignored, created on demand, never committed:

| Path | Created by | Holds |
|---|---|---|
| `.env` | you, from `.env.example` | configuration |
| `.references/redmine/` | `make references` | read-only Redmine source for IDE and agent navigation |
| `plugins/<name>/` | `make attach-plugin` | the attached plugin (its own git repo) |
| `themes/<name>/` | `make attach-plugin` | the attached theme |
| `.red/config.json` | you | Redmine CLI credentials — may contain an API key |
| `.claude/settings.local.json` | `make setup` | agent settings, from the tracked `.example` |
| `sim/` | local experiments | scratch; never published |
