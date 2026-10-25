# Redmine Development Environment

A self-contained workspace for Redmine plugin and theme development. Clone it, run
`make setup`, and have a working Redmine in minutes.

The unusual part: **this repository is the workspace, and your plugin is a guest.** Your
plugin keeps its own git repository, its own branches and its own CI; it is bind-mounted
in and never tracked here. One workspace serves every plugin you work on, and every plugin
stays buildable without it. See
[the workspace model](docs/concepts/workspace-model.md).

## Quick start

Needs Docker 24.0+ with Compose v2, Git 2.30+ and GNU Make 3.81+.

```bash
git clone <your-repo-url> my-redmine-dev
cd my-redmine-dev

cp .env.example .env
# Change POSTGRES_PASSWORD and REDMINE_SECRET_KEY_BASE before any networked use.

make setup
```

Redmine comes up on **http://localhost:4000**, credentials `admin` / `admin` — Redmine
forces a password change on first login.

Then bring in the plugin you actually want to work on:

```bash
make attach-plugin SRC=../redmine_my_plugin
```

Full procedure and failure modes: [first-run-setup](docs/runbooks/first-run-setup.md) and
[attach-a-plugin](docs/runbooks/attach-a-plugin.md).

> **Security.** The defaults in `.env.example` are for a loopback-only development stack.
> Change `POSTGRES_PASSWORD` and `REDMINE_SECRET_KEY_BASE` before exposing this
> environment to any network.

## Documentation

Everything lives in [`docs/`](docs/index.md) as an OKF v0.2 knowledge bundle.

| | |
|---|---|
| **Concept** | [workspace-model](docs/concepts/workspace-model.md) — why plugins attach rather than live here |
| **Runbooks** | [first-run-setup](docs/runbooks/first-run-setup.md) · [attach-a-plugin](docs/runbooks/attach-a-plugin.md) · [parallel-worktrees](docs/runbooks/parallel-worktrees.md) · [plugin-cicd](docs/runbooks/plugin-cicd.md) |
| **References** | [configuration](docs/references/configuration.md) · [make-targets](docs/references/make-targets.md) · [agent-skills](docs/references/agent-skills.md) |

`make help` lists every target.

## What is in here

```
redmine-devcontainer/
├── plugins/                  your plugins, bind-mounted (git-ignored)
├── themes/                   your themes, bind-mounted (git-ignored)
├── scripts/                  setup, scaffolding, attach/detach, worktrees
├── .agents/skills/           agent skills; .claude/skills symlinks here
├── .devcontainer/            VS Code DevContainer specification
├── config/                   Rails host allowlist
├── docs/                     this documentation bundle
├── docker-compose*.yml       local / Traefik / test modes
├── Dockerfile                custom Redmine image, tag from REDMINE_VERSION
└── Makefile                  every workflow command
```

## Working with AI agents

`.agents/skills/` carries domain skills that auto-trigger on context —
`redmine-plugin-developer` for anything under `plugins/`, `redmine-theme-developer` for
`themes/`, plus Docker, git and documentation skills. `.claude/skills` is a symlink to the
same directory, so Claude Code and OpenCode share one copy.

Open your editor or agent session at **this directory**, not inside `plugins/<name>` —
that is what makes the skills fire. The inventory is in
[agent-skills](docs/references/agent-skills.md).

## DevContainer

Open in VS Code and choose **Reopen in Container**. It uses `docker-compose.test.yml`
(ephemeral, no Traefik), forwards Redmine and PostgreSQL, installs Ruby LSP, Solargraph
and Playwright, and runs migrations and seeds on first start.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming and commit format.
