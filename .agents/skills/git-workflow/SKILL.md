---
name: git-workflow
description: Manages Git workflow, enforces Conventional Commits, and ensures a CONTRIBUTING.md exists. Use this for managing commits, branching, and project contributing policies.
---

# Git Workflow Manager

This skill manages the project's version control operations, enforcing branching strategies and **Conventional Commits** standards.

## Initialization & Setup

If `CONTRIBUTING.md` is missing from the project root, this skill MUST offer to create one from the available templates:
1. **Generic Pattern**: Standard feature-branching workflow.
2. **EPPS Pattern**: Multi-version Git Flow for parallel releases.

Read the selected template from `templates/` and write it to `CONTRIBUTING.md` before proceeding.

## Conventional Commit Standards

All commits MUST follow the [Conventional Commits](references/conventional-commits.md) specification.

### Commit Instructions
1. **Analyze**: Determine the `type` and `scope` based on changes.
2. **Verify**: Ensure code adheres to the project's standards.
3. **Commit**: `git commit -m "<type>(<scope>): <description>"`
   - Use `!` for breaking changes.
   - Use the body for complex explanations.

## Branching & PR Workflow

Refer to the project's `CONTRIBUTING.md` for specific branching rules:
- **Feature Branches**: Typically `feature/` or `feat/`.
- **Hotfixes**: Typically `hotfix/`.
- **PR Targets**: Always target the appropriate base branch as defined in the policy.

## Git Worktrees

Use worktrees to work on multiple branches simultaneously, each with its own isolated Docker stack.

**Standard: worktrees live as sibling directories** next to the main repo (e.g., `../redmine-feature-foo/`). Never create worktrees inside the repo directory.

### Lifecycle

```bash
# Create (from main repo)
make worktree BRANCH=feature/my-feature PORT=4010
cd ../redmine-feature-my-feature && make start && make migrate

# Work — commit and push normally from within the worktree
git add ... && git commit -m "feat(scope): description"
git push -u origin feature/my-feature

# Merge (from main repo)
cd ../redmine-development
git merge feature/my-feature --no-ff

# Remove (from main repo)
make worktree-remove BRANCH=feature/my-feature
```

Each worktree gets a unique `COMPOSE_PROJECT_NAME` in its `.env` so Docker containers, networks, and volumes never conflict between branches.

## References
- [Conventional Commits Specification](references/conventional-commits.md)
- [Generic Template](templates/generic-contributing.md)
- [EPPS Template](templates/epps-contributing.md)
