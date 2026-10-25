# Claude Code Configuration

A Redmine plugin and theme development workspace. Your plugin is bind-mounted into
`plugins/<name>` and keeps its own git repository; this repository never tracks it.

Read [AGENTS.md](AGENTS.md) first — it is the working contract. Everything else is in the
documentation bundle at [docs/index.md](docs/index.md).

## Orientation

| Need | Go to |
|---|---|
| Why the workspace is shaped this way | [docs/concepts/workspace-model.md](docs/concepts/workspace-model.md) |
| Get it running | [docs/runbooks/first-run-setup.md](docs/runbooks/first-run-setup.md) |
| Bring a plugin in | [docs/runbooks/attach-a-plugin.md](docs/runbooks/attach-a-plugin.md) |
| Several branches at once | [docs/runbooks/parallel-worktrees.md](docs/runbooks/parallel-worktrees.md) |
| Plugin pipelines | [docs/runbooks/plugin-cicd.md](docs/runbooks/plugin-cicd.md) |
| Env vars, Compose modes, limits | [docs/references/configuration.md](docs/references/configuration.md) |
| Every Make target | [docs/references/make-targets.md](docs/references/make-targets.md) |
| Skills and Redmine source paths | [docs/references/agent-skills.md](docs/references/agent-skills.md) |

## Session setup

Open the session at **this directory**. Skills live in `.agents/skills/` and trigger on
paths such as `plugins/` and `themes/`; a session opened inside `plugins/<name>` loads
none of them.

`make setup` creates `.claude/settings.local.json` from the tracked
`.claude/settings.local.json.example`.
