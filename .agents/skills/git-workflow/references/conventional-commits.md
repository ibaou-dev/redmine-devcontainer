# Conventional Commits 1.0.0

## Summary
The Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of.

## Structure
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Primary Types
- **fix**: patches a bug in your codebase (correlates with PATCH in SemVer).
- **feat**: introduces a new feature to the codebase (correlates with MINOR in SemVer).
- **BREAKING CHANGE**: a commit that has a footer `BREAKING CHANGE:`, or appends a `!` after the type/scope, introduces a breaking API change (correlates with MAJOR in SemVer).

## Other Recommended Types
- **build**: Changes that affect the build system or external dependencies.
- **chore**: Other changes that don't modify src or test files.
- **ci**: Changes to CI configuration files and scripts.
- **docs**: Documentation only changes.
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- **refactor**: A code change that neither fixes a bug nor adds a feature.
- **perf**: A code change that improves performance.
- **test**: Adding missing tests or correcting existing tests.

## Specification Highlights
1. Commits MUST be prefixed with a type (noun), followed by optional scope, optional `!`, and REQUIRED terminal colon and space.
2. The type `feat` MUST be used when a commit adds a new feature.
3. The type `fix` MUST be used when a commit represents a bug fix.
4. A scope MAY be provided after a type (e.g., `fix(parser):`).
5. A description MUST immediately follow the colon and space.
6. A longer commit body MAY be provided after a blank line.
7. One or more footers MAY be provided after a blank line.
8. Breaking changes MUST be indicated by `!` in the type/scope or as a `BREAKING CHANGE:` footer.
