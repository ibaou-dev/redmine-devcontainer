# Agent System Formats

Reference for the two supported agent/skill systems in this repository.

---

## Claude Code Skills

**File location:** `.agents/skills/<skill-name>/SKILL.md` (project-local)
or `~/.claude/skills/<skill-name>/SKILL.md` (global, rare)

### YAML Frontmatter Schema

```yaml
---
name: skill-name              # Required. Kebab-case, matches directory name.
description: >                # Required. 50-300 words. Primary triggering mechanism.
  What this skill does and WHEN to use it. Be specific and "pushy" — list
  all trigger phrases, contexts, and file patterns that should activate it.
  Example: "Always use for X even if user doesn't explicitly ask."
compatibility:                # Optional. Rarely needed.
  tools:
    - mcp__tool_name          # MCP tools required for this skill to function
---
```

### Directory Structure

```
.agents/skills/<skill-name>/
├── SKILL.md          (required — frontmatter + instructions)
├── scripts/          (optional — executable scripts, not loaded into context)
├── references/       (optional — reference docs, loaded on demand)
└── assets/           (optional — static files used in output)
```

### How Triggering Works

1. **Metadata** (name + description only, always in context): Claude uses this to decide when to invoke the skill
2. **SKILL.md body** (loaded when skill triggers): Full instructions, max ~500 lines
3. **Reference files** (loaded only when explicitly needed): Deep reference material
4. **Scripts** (executed directly, never loaded into context): Deterministic automation

### Writing Effective Descriptions

The description is the most critical part — it determines when Claude uses the skill.
Include:
- What the skill does (1-2 sentences)
- All contexts/phrases that should trigger it (be explicit)
- File patterns or keywords that indicate the skill is needed
- "Always trigger for X" statements to prevent undertriggering

### Installation

Project-local skills in `.agents/skills/` are auto-discovered when Claude Code is run
from this directory. Global skills require adding to `~/.claude/settings.json`:
```json
{ "plugins": ["~/.claude/skills/skill-name"] }
```

### Full Example

```yaml
---
name: redmine-plugin-developer
description: >
  Expert Redmine 6.x plugin developer. Use whenever creating, modifying, or reviewing
  Redmine plugins. Always trigger for: init.rb edits, Redmine::Hook, plugin migrations,
  require_admin, accept_api_auth, Redmine::Plugin.register, files under plugins/.
---

# Redmine Plugin Developer

[skill instructions here]
```

---

## OpenCode Agents

**File location:** `.opencode/agents/<agent-name>.md` (workspace-level, this repo)
or `~/.config/opencode/agents/<agent-name>.md` (global)

### YAML Frontmatter Schema

```yaml
---
description: "Brief summary (1-1024 chars)"  # Required. Primary subagent selection mechanism.
mode: primary                                 # Optional: primary | subagent | all
model: anthropic/claude-sonnet-4-20250514     # Optional: provider/model
temperature: 0.1                              # Optional: 0.0-1.0
top_p: 0.95                                   # Optional: alternative to temperature
steps: 50                                     # Optional: max agentic iterations
hidden: false                                 # Optional: hide from @ menu
color: "#4c6ef5"                              # Optional: hex or theme color name
tools:                                        # Optional: enable/disable specific tools
  write: false
  edit: false
  bash: true
permission:                                   # Optional: granular permission overrides
  - allow: "bash(git *)"
  - deny: "bash(rm *)"
---
```

### System Prompt

The Markdown body below the closing `---` is the agent's full system prompt. Unlike Claude
Code skills, there are no bundled scripts/references/assets directories — everything is
inline in the system prompt.

### Tool Names (built-in)

`read`, `write`, `edit`, `bash`, `glob`, `grep`, `ls`, `webfetch`, `websearch`,
`todo_read`, `todo_write`, `task`, `skill`

MCP tools use the pattern: `mcp__<server_name>__<tool_name>`

### Permission Patterns

Permissions use last-rule-wins. Patterns support glob syntax:
```yaml
permission:
  - allow: "bash(git log*)"
  - allow: "bash(git diff*)"
  - deny: "bash(git push*)"
  - deny: "bash(rm *)"
```

### Mode Options

- `primary`: Shows in the main agent selector, can be invoked directly
- `subagent`: Hidden from main menu, used only when spawned by another agent
- `all`: Available in both contexts

### Full Example

```yaml
---
description: Reviews Ruby code for Redmine plugin conventions and best practices
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
tools:
  write: false
  edit: false
---

You are a Redmine plugin code reviewer specializing in Redmine 6.x conventions.

Review the provided code for:
1. Correct use of `Redmine::Plugin.register` block
2. Proper `Rails.application.config.to_prepare` for patches
3. `acts_as_*` module usage
4. Permission declarations
5. i18n key conventions

[rest of system prompt...]
```

---

## Key Differences: Claude Code Skills vs OpenCode Agents

| Aspect | Claude Code Skill | OpenCode Agent |
|--------|-------------------|----------------|
| File location | `.agents/skills/<name>/SKILL.md` | `.opencode/agents/<name>.md` |
| Model selection | Inherits from parent | Explicit `model:` field |
| Bundled resources | `scripts/`, `references/`, `assets/` | Everything inline in prompt |
| Tool control | Via `compatibility.tools` (MCP deps) | Explicit `tools:` enable/disable |
| Permissions | Inherited from Claude Code config | `permission:` array in frontmatter |
| Triggering | Description-based (Claude decides) | Description + `@agent-name` invoke |
| Context loading | Progressive (metadata → body → refs) | Full system prompt always loaded |
| Primary use | Extending Claude Code's capabilities | Specialized agents for OpenCode |
