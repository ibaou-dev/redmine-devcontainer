# Development Guidelines

The working contract for agents and humans in this workspace. Procedures live in
[`docs/`](docs/index.md); this page is the part you should know before touching code.

## The model, in one paragraph

This repository is the **workspace** — Docker, Make, skills, Redmine source reference.
Your plugin lives in `plugins/<name>`, is bind-mounted into the container, keeps its own
git repository and remotes, and is git-ignored here. Commit and push from *inside*
`plugins/<name>`. Run the agent session from this directory so skills trigger. Full
reasoning: [workspace-model](docs/concepts/workspace-model.md).

## Environment

| | |
|---|---|
| Redmine | 6.x — `REDMINE_VERSION` in `.env`, default 6.1.2 |
| Stack | Rails 7.2, Ruby 3.2+, PostgreSQL 14, Docker |
| Base directory in container | `/usr/src/redmine` |
| Redmine source reference | `.references/redmine` — `make references` |

Bind-mounted changes apply immediately. Views, CSS and JS need no restart; CSS and JS need
a browser hard-refresh. Ruby and config changes need `make restart`. New migrations need
`make migrate`.

## The rule that breaks production

**Never call `l()`, `I18n.t`, or touch the database at module or class-body load time.**

Development and test do not eager-load, so a load-time call passes every local check and
then crash-loops Redmine in production. Defer it into a method.

Catch it in CI with a boot check:

```bash
bundle exec rails runner "Rails.application.eager_load!"
```

See [plugin-cicd](docs/runbooks/plugin-cicd.md).

## Implementation workflow

1. Read `.references/redmine` to find the real hook, method or pattern — do not guess at
   core behaviour. Paths are listed in [agent-skills](docs/references/agent-skills.md).
2. Let the skills do their job: `redmine-plugin-developer` under `plugins/`,
   `redmine-theme-developer` under `themes/`.
3. `make migrate` after adding a migration; `make restart` after Ruby or config changes.
4. Verify against the running instance on `REDMINE_PORT`.
5. Check nothing you added runs at load time.

## Testing

```bash
make test         # ephemeral stack + Playwright e2e
make start-test   # the stack alone, for manual work
make stop-test    # stop and discard
```

The test stack is fully ephemeral — PostgreSQL on `tmpfs`, clean on every start.

**A plugin's own Ruby test suite will not run in the dev container.** That image omits the
Ruby `test` bundle group. Give the plugin a self-contained CI image instead; this is
deliberate, and the reasoning is in [workspace-model](docs/concepts/workspace-model.md).

## Common tasks

| Task | Where |
|---|---|
| Set up a fresh clone | [first-run-setup](docs/runbooks/first-run-setup.md) |
| Attach or detach a plugin or theme | [attach-a-plugin](docs/runbooks/attach-a-plugin.md) |
| Work on several branches at once | [parallel-worktrees](docs/runbooks/parallel-worktrees.md) |
| Give a plugin a pipeline | [plugin-cicd](docs/runbooks/plugin-cicd.md) |
| Look up a variable or target | [configuration](docs/references/configuration.md), [make-targets](docs/references/make-targets.md) |

Scaffolding for something genuinely new: `make scaffold-plugin`, `make scaffold-theme`.
For anything that already exists, attach it instead.

## Documentation

`docs/` is an OKF v0.2 bundle validated by a pre-commit hook. Use the `okf-docs` skill to
add to it — the layout, frontmatter and log format are all enforced, and a new file in the
wrong directory fails the commit.
