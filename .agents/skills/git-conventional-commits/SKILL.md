---
name: git-conventional-commits
description:
  "Creates git commit messages following the Conventional Commits specification
  (conventionalcommits.org/en/v1.0.0). Automatically detects CONTRIBUTING.md to
  adapt to project-specific issue tracker formats (GitHub, GitLab, Jira,
  Bitbucket, Gitea, Redmine), scope requirements, and breaking change
  conventions. Use this skill whenever creating or reviewing a git commit
  message, running /git-conventional-commits, asking about commit format, issue
  references, scope selection, or breaking change footers — even if the user
  doesn't explicitly ask for 'conventional commits'."
user-invocable: true
license: MIT
compatibility:
  Designed for Claude Code or similar AI coding agents. Requires git.
metadata:
  author: ibaou-dev
  version: "1.2.0"
  openclaw:
    emoji: "📝"
    homepage: https://github.com/ibaou-dev/skills
    requires:
      bins:
        - git
    install: []
allowed-tools: Read Glob Grep Bash(git:*)
---

**Persona:** You are a meticulous git historian. Every commit message you write
will be read by developers and CI pipelines for years. Precision and context
matter more than brevity.

**Thinking mode:** Use `ultrathink` for complex changesets spanning multiple
files or subsystems — prevents misclassifying refactors as features, or
under-describing breaking changes.

## Step 1: Understand the Change

Run in order, stop when you have enough context:

```bash
git diff --staged        # what will be committed
git diff HEAD            # unstaged changes for context
git log --oneline -10    # recent commit style reference
```

## Step 2: Detect CONTRIBUTING.md

Glob for CONTRIBUTING.md in: repo root, `.github/`, `docs/`.

- **If found:** extract tracker type, scope rules, closing keywords, breaking
  change policy. Override standard spec defaults where the file conflicts.
- **If not found:** use standard CC spec. Note the absence explicitly in your
  output.

→ See
[references/issue-tracker-patterns.md](references/issue-tracker-patterns.md) for
detection heuristics.

## Step 3: Select Type

| Type       | When to use                                                   |
| ---------- | ------------------------------------------------------------- |
| `feat`     | New capability that end users notice                          |
| `fix`      | Bug fix (including CVE patches — use `fix`, not `chore`)      |
| `docs`     | Documentation only                                            |
| `style`    | Whitespace, formatting — no logic change                      |
| `refactor` | Restructure without changing behavior (rename, extract, move) |
| `perf`     | Performance improvement                                       |
| `test`     | Adding or fixing tests                                        |
| `build`    | Build system, dependencies                                    |
| `ci`       | CI/CD pipeline changes                                        |
| `chore`    | Maintenance tasks (NOT CVE fixes, NOT deprecated API removal) |
| `revert`   | Reverting a prior commit                                      |

**Common traps:**

- Rename + extract → `refactor`, NOT `feat`
- Deprecated API removal → `BREAKING CHANGE` footer required, NOT silent `chore`
- CVE / security vulnerability → `fix(deps)` or `fix(security)`, NOT
  `chore(deps)`
- Reverting → `revert:` with hash reference, NOT `fix:` or `chore:`

## Step 4: Determine Scope

Use scope when the change is clearly bounded to one subsystem (e.g. `auth`,
`db`, `cli`, `api`).

Omit scope when the change is cross-cutting or repo-wide.

If CONTRIBUTING.md mandates scope: always include it, using the exact values
listed.

## Step 5: Write the Description

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removed"
- 72-character limit on the first line (type + scope + description combined)
- State what the change does AND why (when non-obvious)

## Step 6: Write the Body (when needed)

Include a body when:

- The change is complex or spans multiple subsystems
- A breaking change needs a migration path explained
- A revert references the original commit and reason
- A dependency update — include old → new version range

Separate body from subject with one blank line.

## Step 7: Write Footers

**Footers** (one per line, after blank line separating from body):

- `BREAKING CHANGE: <description>` — required for breaking changes (also add `!`
  suffix to type)
- `Reverts: <hash> <original subject>` — required for `revert:` commits
- `Fixes #N` / `Closes #N` — issue references per tracker (see table below)

```
feat(api)!: remove v1 authentication endpoint

BREAKING CHANGE: /api/v1/auth is removed. Migrate to /api/v2/auth.
```

```
revert: undo OAuth2 PKCE flow

Reverts: abc123def456789 feat(auth): implement OAuth2 PKCE flow
```

**Issue tracker formats** (detected in Step 2):

| Tracker         | Footer format                                  | Example            |
| --------------- | ---------------------------------------------- | ------------------ |
| GitHub          | `Fixes #N` / `Closes #N`                       | `Fixes #847`       |
| GitLab          | `Closes #N` (issues), `!N` (MRs separate line) | `Closes #312`      |
| Jira            | `Closes PROJ-N`                                | `Closes PLAT-2891` |
| Bitbucket       | `Closes #N` or `Fixes #N`                      | `Closes #42`       |
| Gitea / Redmine | `Closes #N`                                    | `Closes #17`       |

→ See
[references/conventional-commits-spec.md](references/conventional-commits-spec.md)
for full spec. → See
[references/issue-tracker-patterns.md](references/issue-tracker-patterns.md) for
tracker detection.

## Output

Provide the commit message in a code block, then explain:

1. **Type rationale** — why this type (not the alternatives)
2. **Scope rationale** — why this scope (or why omitted)
3. **CONTRIBUTING.md** — which file was detected (path), or explicitly state "No
   CONTRIBUTING.md found — using standard CC spec"
4. **Atomicity check** — if the staged changeset mixes concerns, suggest
   splitting and propose individual messages
