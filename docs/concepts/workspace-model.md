---
type: "concept"
title: "The workspace model"
description: "Why this repository is a stable workspace that plugins attach to, rather than a container for them."
status: "draft"
tags:
  - "architecture"
  - "devcontainer"
  - "workflow"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# The workspace model

Most plugin templates expect you to develop *inside* them: you clone the template, your
code lives in it, and the template's git history and yours are the same history. This
repository deliberately inverts that.

**This repository is the workspace. Your plugin is a guest.**

## The split

| | Lives here | Lives in the plugin repo |
|---|---|---|
| Docker images, compose files, `make` | yes | no |
| Agent skills (`.agents/skills/`) | yes | no |
| Redmine source reference (`.references/`) | yes | no |
| Plugin source code | **no** — bind-mounted in | yes |
| Plugin git history, branches, remotes | **no** | yes |
| Plugin CI configuration | **no** | yes |

`plugins/*` and `themes/*` are git-ignored here (only the `.gitkeep` files are tracked),
so an attached plugin can never be committed into this repository by accident. You commit,
branch and push from *inside* `plugins/<name>`, against the plugin's own remote.

## Why it is arranged this way

**The tooling outlives any one plugin.** You will work on a dozen plugins over the life of
this workspace. Rebuilding the Docker stack, the Make targets and the agent skills once per
plugin is waste; worse, they drift apart and a fix made while working on one plugin never
reaches the others.

**The plugin must be buildable without this repository.** A plugin whose build depends on
the workspace it was written in cannot be built by CI, by a colleague, or by a user
installing it. That is why CI configuration lives in the plugin repo — see
[plugin-cicd](../runbooks/plugin-cicd.md) — and why attaching a plugin never rewrites its
structure.

**Agent skills need a stable root.** Skills auto-trigger on paths such as `plugins/` and
`themes/`. Opening your editor or agent session at the workspace root is what makes
`redmine-plugin-developer` fire for whichever plugin is currently attached. Open the
session inside `plugins/<name>` instead and you get no skills at all.

## Two ways in, and why both exist

`make attach-plugin` takes either a local path or a remote URL, and treats them
differently on purpose:

- A **local repo** is attached as a `git worktree`. There is no second copy and no second
  `.git`; the attached directory shares the source repository's objects, branches and
  remotes. Edits are immediately visible to the original checkout.
- A **remote URL** is cloned, because there is no local repository to share.

The worktree case is the common one and the reason attaching is preferred over scaffolding
for any plugin that already exists. The procedure is in
[attach-a-plugin](../runbooks/attach-a-plugin.md).

## The dev image is not the test image

The image this workspace runs omits the Ruby `test` bundle group to keep the runtime lean.
That is a deliberate trade and it has one consequence worth stating plainly: **you cannot
run a plugin's test suite in the dev container.** Tests need `mocha` and the rest of the
test group.

Give the plugin a self-contained CI image instead — the official `redmine:` base plus a
full `bundle install`. This is not a workaround; it is the same property as above. A test
image owned by the plugin is a test image that works in CI, on a colleague's machine, and
here.

## Isolation between branches

Each worktree gets its own `.env` with a unique `COMPOSE_PROJECT_NAME`, `REDMINE_PORT`
and `TEST_REDMINE_PORT`. Docker prefixes every container, network and volume with the
project name, so two branches can run full stacks simultaneously with no collision. See
[parallel-worktrees](../runbooks/parallel-worktrees.md).
