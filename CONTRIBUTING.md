# Contributing Guidelines

We welcome contributions to this Redmine development environment, including plugins,
themes, infrastructure improvements, and documentation. To keep our history clean and
collaboration smooth, please follow the guidelines below.

---

## Branching Strategy

### Main Branch

`main` is the stable branch. All development happens in feature branches branched from
`main`. Direct commits to `main` are not accepted.

### Branch Naming

| Prefix | Use for |
|--------|---------|
| `feat/` | New general features or capabilities |
| `fix/` | Bug fixes |
| `plugin/` | Plugin feature work (files under `plugins/`) |
| `theme/` | Theme work (files under `themes/`) |
| `chore/` | Build, tooling, dependency, or config changes |
| `docs/` | Documentation-only changes |
| `test/` | Test additions or fixes with no production code change |
| `refactor/` | Code restructuring with no behaviour change |

**Examples:**

```
plugin/redmine-pipeline-tracker-pipeline-view
theme/ibaou-modern-dark-mode
feat/worktree-port-autodetect
fix/migrate-broken-on-fresh-db
```

### Workflow

1. Branch from `main`.
2. Implement your changes following the guidelines below.
3. Ensure tests pass (`make test`).
4. Submit a Pull Request to `main`.

---

## Commit Message Convention

We use **Conventional Commits** to keep our history clean and machine-readable.

**Format:** `<type>(<scope>): <description>`

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace; no logic change |
| `refactor` | Restructuring without behaviour change |
| `test` | Adding or fixing tests; no production code change |
| `chore` | Build tasks, tooling, dependencies, config |

**Scope** is optional but encouraged. Use the area of the codebase affected:
`plugin`, `theme`, `docker`, `makefile`, `e2e`, `scripts`, etc.

**Examples:**

```
feat(plugin): add pipeline status column to issues list
fix(theme): correct sidebar padding on mobile viewport
chore(docker): pin postgres image to 14.12
test(e2e): add login flow smoke test
docs: update README quick start section
```

**Rules:**
- Use the imperative mood in the description: "add", not "added" or "adds"
- Do not capitalise the first letter of the description
- Do not end the description with a period
- Keep the subject line under 72 characters
- Use the commit body (blank line after subject) for additional context when needed

---

## Development Guidelines

### Plugin Work (`plugins/`)

- Files under `plugins/` are bind-mounted — changes are reflected in the running
  container immediately (no restart for view/asset changes).
- After adding a `db/migrate/` file, always run:
  ```bash
  make migrate
  ```
- After editing `init.rb` or any Ruby file that changes class loading, run:
  ```bash
  make restart
  ```
- For controllers, models, or hooks: follow the patterns in the
  `redmine-plugin-developer` skill (`.agents/skills/redmine-plugin-developer/`).
- Use `make shell` to open a container shell for debugging or running rake tasks
  manually.

### Theme Work (`themes/`)

- Files under `themes/` are bind-mounted — CSS and JS changes are reflected after a
  browser hard-refresh (Ctrl+Shift+R).
- No asset compilation step is needed. Propshaft serves files directly.
- For CSS custom property patterns and `theme.js` conventions, refer to the
  `redmine-theme-developer` skill (`.agents/skills/redmine-theme-developer/`).
- After UI changes, validate with:
  ```bash
  make test
  ```

### Infrastructure and Tooling

- Changes to `docker-compose*.yml` or `Dockerfile` should be tested in both local
  mode (`make start`) and test mode (`make start-test`) before submitting.
- Changes to `Makefile` should be tested with `make help` to verify the help output
  remains correct.
- Never commit `.env` — it is git-ignored. Only update `.env.example` when new
  variables are introduced.

---

## Testing

```bash
make test        # Start ephemeral test environment + run all Playwright e2e tests
make start-test  # Start test environment only (for interactive manual testing)
make stop-test   # Stop and discard ephemeral test environment
```

- Tests live in `e2e/` and use Playwright.
- The test environment runs on `http://localhost:${TEST_REDMINE_PORT:-4001}`.
- Test data is fully ephemeral (PostgreSQL on `tmpfs`) — each `make start-test` starts
  clean.
- Run `make test` before submitting any PR that touches UI, controllers, or migrations.

---

## Pull Request Guidelines

- Keep PRs focused. One concern per PR.
- Reference related issues in the PR description where applicable.
- Ensure `make test` passes before requesting review.
- Add a short description of what was changed and why — not just what the diff shows.
- For plugin or theme PRs, include a brief note on how to manually verify the change
  (e.g., "Navigate to Issues list — the new Pipeline column should appear").

---

## Local Setup Reminder

```bash
cp .env.example .env   # Configure your environment
make setup             # First-time onboarding (build, start, migrate, seed)
make start             # Subsequent starts
make references        # Initialize Redmine source reference (optional, for IDE/AI use)
```

See [README.md](README.md) for full documentation.
