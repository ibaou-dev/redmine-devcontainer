# Redmine CLI Skill

> **Install:** `npx skills add diskd-ai/redmine-cli` | [skills.sh](https://skills.sh)

Command-line skill for interacting with Redmine via the REST API using a `red-cli`-style interface. Bundles a dependency-free Python CLI.

---

## Scope & Purpose

This skill provides a CLI tool and patterns for working with Redmine's REST API, covering:

* List and filter issues (by project, status, assignee, query)
* View issue details with journals/comments
* Add journal notes (public or private)
* Update/remove existing comments (journals) by journal id
* Update issue description
* List projects and user info
* Multi-instance support via `--rid` flag
* Configuration management (`~/.red/config.json`)

---

## When to Use This Skill

**Triggers:**
* Mentions of Redmine, red-cli, or Redmine REST API
* Requests to list/view/update issues from the command line
* Working with `.red/config.json`, `api-key`, `project-id`, `user-id`
* Multi-instance Redmine setups requiring `--rid` selection

**Use cases:**
* Automate issue tracking workflows from terminal
* Query and filter issues across projects
* Add notes/comments to issues programmatically
* Integrate Redmine into CI/CD pipelines or scripts

---

## Quick Reference

### Configuration

Create `~/.red/config.json` with your Redmine credentials:

```json
{
  "api-key": "YOUR_API_KEY",
  "editor": "",
  "pager": "",
  "project": "",
  "project-id": 0,
  "server": "https://redmine.example.com",
  "user-id": 0
}
```

Optional: create `./.red/config.json` in your working directory to override settings per-repo.

### Basic Usage

```bash
# List projects
python scripts/redmine_cli.py project list
python scripts/redmine_cli.py project list --json

# List issues (uses project-id from config)
python scripts/redmine_cli.py issue list
python scripts/redmine_cli.py issue list --json --limit 10

# List all issues across projects
python scripts/redmine_cli.py issue list --all

# List issues assigned to current user
python scripts/redmine_cli.py issue list me

# View issue with journals
python scripts/redmine_cli.py issue view 12345 --journals

# Add a note to an issue
python scripts/redmine_cli.py issue note 12345 -m "Fixed in commit abc123"
python scripts/redmine_cli.py issue note 12345 -m "Internal note" --private

# Update issue description
python scripts/redmine_cli.py issue edit 12345 --description-file ./description.md

# Update/remove a comment (journal) by id (find ids via `issue view --journals`)
python scripts/redmine_cli.py issue comment update 5993 -m "Updated comment text"
python scripts/redmine_cli.py issue comment remove 5993

# Show current user
python scripts/redmine_cli.py user me
```

### Multi-Instance (`--rid`)

For v2 configs with multiple servers:

```bash
python scripts/redmine_cli.py issue list --rid prod
python scripts/redmine_cli.py issue list --rid 1
```

---

## Skill Structure

```
redmine-cli/
  SKILL.md                    # Entry point (routing + quick start)
  README.md                   # This file (overview)
  scripts/
    redmine_cli.py            # Dependency-free Python CLI
  references/
    rest-api.md               # Redmine REST API quick reference
  agents/
    openai.yaml               # OpenAI agent configuration
```

---

## Key Patterns

### Filtering Issues

```bash
# Filter by status and sort
python scripts/redmine_cli.py issue list --status_id 1 --sort priority

# Search by query string
python scripts/redmine_cli.py issue list --query "login fails"

# Include project column and issue URLs
python scripts/redmine_cli.py issue list --project --issue-urls
```

### JSON Output for Automation

```bash
# Pipe to jq for processing
python scripts/redmine_cli.py issue list --json | jq '.issues[].id'

# Get issue details (JSON by default)
python scripts/redmine_cli.py issue view 12345 | jq '.issue.subject'
```

### Debug Mode

```bash
# Print request URL and raw response to stderr
python scripts/redmine_cli.py issue list -d
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| HTTP 401/403 | API key invalid or REST API disabled | Verify API key in Redmine UI (*My account* -> *API access key*) |
| HTTP 404 | Wrong base URL | Ensure `server` is Redmine root, not a sub-path |
| Config not found | Missing config file | Create `~/.red/config.json` with valid JSON |
| No issues returned | `project-id` not set | Set `project-id` in config or use `--all` flag |

---

## Resources

* **Full skill reference**: [SKILL.md](SKILL.md)
* **REST API guide**: [references/rest-api.md](references/rest-api.md)
* **Redmine REST API docs**: https://www.redmine.org/projects/redmine/wiki/Rest_api

---

## License

MIT
