---
spec: 0.2
---

# Documentation

Knowledge bundle for this Redmine plugin and theme development workspace. Start with the
concept if you are new; the runbooks are procedures; the references are lookup tables.

## Concepts

Why the workspace is arranged the way it is.

- [workspace-model](concepts/workspace-model.md) — this repository is the workspace and
  your plugin is a guest; what that buys, and what it costs.

## Runbooks

Procedures, each with its own verification and failure modes.

- [first-run-setup](runbooks/first-run-setup.md) — fresh clone to a running Redmine.
- [attach-a-plugin](runbooks/attach-a-plugin.md) — bring an existing plugin or theme
  repository in without copying it.
- [parallel-worktrees](runbooks/parallel-worktrees.md) — several branches at once, each
  with an isolated Docker stack.
- [plugin-cicd](runbooks/plugin-cicd.md) — a pipeline that lives in the plugin's own
  repository, and the traps that cost the most time.

## References

Lookup tables. Nothing here needs reading end to end.

- [configuration](references/configuration.md) — environment variables, Compose modes,
  resource limits, local-only paths.
- [make-targets](references/make-targets.md) — every Make target, grouped by purpose.
- [agent-skills](references/agent-skills.md) — the vendored skills, their triggers, and
  the Redmine source paths they read.
