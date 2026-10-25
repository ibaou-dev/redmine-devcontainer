---
type: "reference"
title: "Agent skills"
description: "The skills vendored into this workspace, what triggers each, and the source paths they read."
status: "draft"
tags:
  - "agents"
  - "skills"
  - "tooling"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Agent skills

Skills live in `.agents/skills/`. `.claude/skills` is a tracked symlink to that directory,
so Claude Code and OpenCode both find the same copies and there is one place to edit.

They trigger on context, which is why the session must be opened at the **workspace root**
rather than inside `plugins/<name>` — see [workspace-model](../concepts/workspace-model.md).

## Inventory

| Skill | Triggers on | Covers |
|---|---|---|
| `redmine-plugin-developer` | any file under `plugins/`, `init.rb`, hooks, migrations | Plugin registration, hook system, monkey patching, `acts_as_*`, controller auth, migrations, testing, i18n, Propshaft assets |
| `redmine-theme-developer` | any file under `themes/`, CSS, `theme.js` | Propshaft pipeline, CSS custom properties, DOM patterns, base stylesheet overrides |
| `redmine-cli` | Redmine API work, `.red/config.json` | Issue management over REST via `scripts/redmine_cli.py` |
| `docker-expert` | `Dockerfile`, `docker-compose*.yml`, container faults | Docker and Compose |
| `git-workflow` | branching, commits, `CONTRIBUTING.md` | Workflow policy and the two contributing templates |
| `git-conventional-commits` | commit messages, changelogs | Conventional Commits, with issue-tracker detection |
| `okf-docs` | any `.md` under `docs/` | This documentation format — authoring, validation, the pre-commit hook |
| `skill-creator` | authoring or improving a skill | Skill structure plus an evaluation framework |

## Reference source paths

`make references` clones the Redmine source matching `REDMINE_VERSION` into
`.references/redmine/` (git-ignored). Skills read it to answer questions about core
behaviour instead of guessing.

### Plugin work

| Looking for | Path |
|---|---|
| Plugin, hook and `acts_as` modules | `.references/redmine/lib/redmine/` |
| Available view hooks | `.references/redmine/app/views/` — grep for `call_hook` |
| Test fixtures | `.references/redmine/test/fixtures/` |

### Theme work

| Looking for | Path |
|---|---|
| Core stylesheet | `.references/redmine/app/assets/stylesheets/application.css` |
| Responsive rules | `.references/redmine/app/assets/stylesheets/responsive.css` |
| Official themes | `.references/redmine/app/assets/themes/` |

## Contributing templates

`git-workflow` ships two templates and offers them when a repository has no
`CONTRIBUTING.md`:

- **Generic** (`templates/generic-contributing.md`) — standard feature-branch workflow.
- **Multi-version** (`templates/multi-version-contributing.md`) — Git Flow for a product
  maintained in several parallel version branches and deployment flavours at once, where
  changes are cherry-picked between versions rather than merged.

## The one rule that is not negotiable

**Never translate (`l()`, `I18n.t`) or touch the database at module or class-body load
time.** It passes in development and test, because neither eager-loads, and then
crash-loops in production. Defer it into a method. The `redmine-plugin-developer` skill
covers this under *Load-time safety*, and
[plugin-cicd](../runbooks/plugin-cicd.md) describes the CI boot check that catches it.
