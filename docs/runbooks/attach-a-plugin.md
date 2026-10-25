---
type: "runbook"
title: "Attach a plugin or theme"
description: "Bring an existing plugin repository into the workspace without copying it or disturbing its structure."
status: "draft"
tags:
  - "plugins"
  - "themes"
  - "worktree"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Attach a plugin or theme

## Purpose

Develop a plugin that already has its own git repository. Attaching is preferred over
scaffolding for anything that exists: the plugin keeps its own history, branches and
remotes, and this workspace never tracks it.

Scaffold instead only when creating something new — `make scaffold-plugin`,
`make scaffold-theme`.

## Preconditions

- A working environment — see [first-run-setup](first-run-setup.md).
- For local attachment, the source must be a git repository, not a plain directory.
- The plugin directory name must be the Redmine plugin id, because Redmine resolves
  plugins by directory name. `NAME=` overrides the inferred name.

## Procedure

```bash
# Local repo → attached as a git worktree (no second copy)
make attach-plugin SRC=../redmine_my_plugin                  # new branch wt/<name>
make attach-plugin SRC=../redmine_my_plugin REF=feature/x    # existing branch

# Remote repo → cloned
make attach-plugin SRC=https://git.example.com/me/redmine_my_plugin.git

# Remove again (worktree-aware)
make detach-plugin NAME=redmine_my_plugin
```

The mode is chosen from `SRC`: a local path becomes a `git worktree` sharing the source
repository's objects and remotes; a URL is cloned. In worktree mode `REF` defaults to a new
branch `wt/<name>` off the source's HEAD, and an existing ref is checked out as-is.

Attaching then rebuilds the image — so the plugin's `PluginGemfile` gems are installed —
and runs plugin migrations.

Themes attach the same way and land in `themes/`.

## Verification

```bash
ls plugins/                                   # the plugin directory is present
git -C plugins/redmine_my_plugin status       # its own repo, its own branch
git status --short                            # clean here: plugins/* is git-ignored
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:4000
```

Then confirm Redmine sees it: **Administration → Plugins**.

Commit, branch and push from **inside** `plugins/<name>`. That directory is the real plugin
repository; this workspace tracks only `plugins/.gitkeep`.

## Failure modes

**Redmine will not boot after attaching.** A load-time error in the plugin. `make logs`
has the trace. `make detach-plugin NAME=<dir>` restores a bootable stack while you fix it.

**The plugin does not appear in the admin list.** The directory name is not the plugin id
registered in `init.rb`. Rename it, or re-attach with `NAME=<plugin_id>`.

**New gems are not installed.** `attach-plugin` rebuilds, but a `PluginGemfile` edited
*after* attaching needs `make build && make restart`.

**Migrations did not run.** `make migrate`. This is also needed after adding any new file
under the plugin's `db/migrate/`.

**Tests will not run in the container.** Expected. The dev image omits the Ruby `test`
bundle group; give the plugin a self-contained CI image instead —
[plugin-cicd](plugin-cicd.md), and the reasoning in
[workspace-model](../concepts/workspace-model.md).

**`detach-plugin` leaves a registered worktree behind.** If the directory was removed by
hand rather than by the target, prune it from the source repo:
`git -C ../redmine_my_plugin worktree prune`.
