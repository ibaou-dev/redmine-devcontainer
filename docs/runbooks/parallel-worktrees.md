---
type: "runbook"
title: "Parallel worktrees"
description: "Run several branches at once, each with its own isolated Docker stack."
status: "draft"
tags:
  - "worktree"
  - "docker"
  - "workflow"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Parallel worktrees

## Purpose

Work on two or more branches of this workspace simultaneously, each with a full Redmine
stack, without port or container-name collisions.

Not to be confused with the worktree that `make attach-plugin` creates — that one is a
worktree of the *plugin's* repository. This page is about worktrees of the workspace
itself.

## Preconditions

- A working environment — see [first-run-setup](first-run-setup.md).
- Enough memory for a second stack: local mode caps Redmine at 3 GB and PostgreSQL at 1 GB
  per stack ([configuration](../references/configuration.md)).
- **Worktrees go in sibling directories**, never inside this repository. `worktrees/` is
  git-ignored as a guard, but siblings are the convention the scripts assume.

## Procedure

```bash
# From the main checkout
make worktree BRANCH=feature/my-feature PORT=4010

cd ../redmine-feature-my-feature
make start
make migrate
```

The branch name is slugified into the directory name and `COMPOSE_PROJECT_NAME`
(`feature/my-feature` → `redmine-feature-my-feature`), and the worktree gets its own
`.env` with `REDMINE_PORT=PORT` and `TEST_REDMINE_PORT=PORT+1`. An existing branch is
checked out; a new name is created.

Work, commit and push from inside the worktree as normal, then merge from the main
checkout:

```bash
cd ../redmine-devcontainer
git merge feature/my-feature --no-ff
make worktree-remove BRANCH=feature/my-feature
```

## Verification

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | sort
```

Each stack's containers carry its own `COMPOSE_PROJECT_NAME` prefix and a distinct host
port. Both instances should answer:

```bash
curl -fsS -o /dev/null -w '4000 -> %{http_code}\n' http://localhost:4000
curl -fsS -o /dev/null -w '4010 -> %{http_code}\n' http://localhost:4010
```

`git worktree list` from the main checkout shows every worktree and its branch.

## Failure modes

**Port already allocated.** `PORT` and `PORT+1` are both claimed, and the test port is the
one usually forgotten. Space allocations at least two apart — 4010, 4020, 4030.

**Containers from two worktrees collide.** `COMPOSE_PROJECT_NAME` is duplicated. This
happens when a worktree was created with `git worktree add` directly instead of
`make worktree`, so no per-worktree `.env` was written. Copy `.env.example` into it and set
`COMPOSE_PROJECT_NAME`, `REDMINE_PORT` and `TEST_REDMINE_PORT` by hand.

**`worktree-remove` refuses.** The worktree has uncommitted changes, or its stack is still
running. Stop it with `make stop` from inside, commit or discard, then retry.

**A removed worktree still appears in `git worktree list`.** The directory was deleted by
hand. `git worktree prune`.

**Disk fills up.** Every stack carries its own PostgreSQL volume. `make stop-local` does
not delete them; remove the volume explicitly when retiring a worktree.
