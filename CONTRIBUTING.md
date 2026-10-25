# Contributing Guidelines

Contributions to this workspace — infrastructure, scripts, skills, documentation — are
welcome. This page is the policy; the procedures it refers to live in
[`docs/`](docs/index.md).

> Contributing to a **plugin** attached under `plugins/` follows *that repository's*
> guidelines, not this one. Those are separate repositories with separate histories.

## Branching

`main` is stable. All work happens on a branch off `main`; direct commits to `main` are
not accepted.

| Prefix | For |
|---|---|
| `feat/` | New features or capabilities |
| `fix/` | Bug fixes |
| `plugin/` | Plugin-related work in this repository |
| `theme/` | Theme-related work in this repository |
| `chore/` | Build, tooling, dependency or config changes |
| `docs/` | Documentation only |
| `test/` | Tests, with no production change |
| `refactor/` | Restructuring, no behaviour change |

```
feat/worktree-port-autodetect
fix/migrate-broken-on-fresh-db
docs/okf-bundle-restructure
```

For parallel work, `make worktree BRANCH=feat/my-feature PORT=4010` gives the branch its
own isolated stack — see [parallel-worktrees](docs/runbooks/parallel-worktrees.md).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
Scope is optional but encouraged — `plugin`, `theme`, `docker`, `makefile`, `e2e`,
`scripts`, `skills`.

```
feat(scripts): add port autodetection to new-worktree
fix(docker): pin postgres image to 14.12
docs: restructure the bundle into concepts, runbooks and references
```

Rules:

- Imperative mood — "add", not "added" or "adds".
- No capital on the first letter of the description, no trailing period.
- Subject line under 72 characters; use the body for context.

The `git-conventional-commits` skill generates these.

## Before you open a PR

- `make test` passes, if `e2e/` has tests and you touched UI, controllers or migrations.
- Infrastructure changes are tested in **both** `make start` and `make start-test` —
  the local override and the standalone test stack diverge, and a change can work in one
  and break the other.
- `Makefile` changes keep `make help` correct.
- New environment variables are added to `.env.example` **and**
  [configuration](docs/references/configuration.md). Never commit `.env`.
- Documentation changes pass the bundle validator — the pre-commit hook runs it, and the
  `okf-docs` skill explains the layout.

## Pull requests

- One concern per PR.
- Say what changed and why, not what the diff already shows.
- Reference related issues.
- For anything user-visible, give a short manual verification step — "Navigate to the
  Issues list; the new column should appear".

## Setup

See [first-run-setup](docs/runbooks/first-run-setup.md), or the quick start in
[README.md](README.md).
