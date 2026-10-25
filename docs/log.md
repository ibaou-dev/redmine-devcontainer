# Update Log

## 2026-10-25

- Created `concepts/workspace-model.md` explaining why plugins attach to this workspace
  rather than living in it.
- Created `runbooks/first-run-setup.md`, `runbooks/attach-a-plugin.md` and
  `runbooks/parallel-worktrees.md` from procedures previously duplicated across the README
  and AGENTS.md.
- Moved `CICD.md` to `runbooks/plugin-cicd.md`, retyped from `guide` to `runbook` so it
  carries verification and failure modes.
- Created `references/configuration.md`, `references/make-targets.md` and
  `references/agent-skills.md` as the single source for tables repeated elsewhere.
- Replaced `index.md` with a real manifest of the three directories.

## 2026-10-08

- Migrated the bundle to OKF v0.2 — frontmatter contract, one H1 per document, relative
  links — and compacted this log. Root manifest is `index.md`; prior dated history remains
  in git.
