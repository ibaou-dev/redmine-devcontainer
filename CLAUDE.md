# Claude Code Configuration

This is a Redmine plugin/theme development template. See the links below for key context.

## Key Files

- `AGENTS.md` — development guidelines, skill inventory, reference paths, worktree workflow
- `CONTRIBUTING.md` — branch naming, commit conventions, PR workflow
- `docs/CICD.md` — recommended per-plugin CI/CD pipeline (Jenkins/SonarQube/coverage/release) + gotchas
- `.agents/skills/` — domain-specific AI skills (auto-trigger based on context)
- `.env.example` → `.env` — environment configuration (ports, version, passwords)
- `.claude/settings.local.json.example` → `.claude/settings.local.json` — Claude Code settings (created by `make setup`)

## Quick Context

| Topic | Detail |
|-------|--------|
| Redmine version | `REDMINE_VERSION` in `.env` (default 6.1.2) |
| Plugins | `plugins/` — bind-mounted, changes reflect immediately (git-ignored) |
| Themes | `themes/` — bind-mounted, hard-refresh after CSS/JS changes (git-ignored) |
| Attach a plugin/theme | `make attach-plugin SRC=<path\|url>` (worktree for local, clone for remote) |
| Reference source | `.references/redmine/` — initialize with `make references` |
| Commands | `make help` for full list |
| Credentials | admin / admin — change password on first login |

> **Workspace model:** open your Claude/editor session at this devcontainer root (skills
> live in `.claude/skills` → `.agents/skills`); your plugin lives in `plugins/<name>`.

## Skills Available

| Skill | Auto-triggers on |
|-------|-----------------|
| `redmine-plugin-developer` | Files in `plugins/`, `init.rb`, hooks, migrations |
| `redmine-theme-developer` | Files in `themes/`, CSS, `theme.js` |
| `redmine-cli` | Redmine API, issue management, `.red/config.json` |
| `docker-expert` | Dockerfiles, compose files, container issues |
| `git-workflow` | Git commits, branching, CONTRIBUTING.md |
| `git-conventional-commits` | Commit messages, changelog |
| `skill-creator` | Creating/improving agent skills |
