# Conventional Commits Specification v1.0.0

Full reference: https://conventionalcommits.org/en/v1.0.0

## Grammar

```
<type>[optional scope][optional !]: <description>
[optional blank line]
[optional body]
[optional blank line]
[optional footer(s)]
```

## Rules

1. Commits MUST be prefixed with a type (noun) followed by optional scope,
   optional `!`, then `: ` (colon + space).
2. `feat` MUST be used for new features. Correlates with MINOR in SemVer.
3. `fix` MUST be used for bug fixes. Correlates with PATCH in SemVer.
4. A scope MAY be provided in parentheses after the type: `fix(parser):`.
5. The description MUST immediately follow the `: ` after the optional scope.
6. A body MAY be included after the description, separated by one blank line.
7. One or more footers MAY be provided, each on its own line after the body.
8. Footer tokens MUST use `-` in place of whitespace, except `BREAKING CHANGE`.
9. A breaking change MUST be indicated in the footer as
   `BREAKING CHANGE: <description>`, OR by appending `!` after the type/scope.
10. Types other than `feat` and `fix` are permitted (e.g. `docs:`, `style:`,
    `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:`, `revert:`).
11. `BREAKING CHANGE` in a footer correlates with MAJOR in SemVer.

## Examples

### Simple feature

```
feat(lang): add Polish language support
```

### Bug fix with issue reference

```
fix(auth): prevent session token expiry race condition

The session refresh check used a non-atomic read+write. Replace with
a mutex-protected refresh to prevent duplicate token requests.

Fixes #1234
```

### Breaking change with `!` and footer

```
feat(api)!: remove XML response format

BREAKING CHANGE: The API no longer returns XML. All endpoints now
return JSON only. Update clients to use Content-Type: application/json.
```

### Revert

```
revert: feat(auth): implement OAuth2 PKCE flow

Reverts commit abc123def456.
Reason: OAuth2 provider changed their endpoints; reverting until updated.
```

### Chore with no body

```
chore(deps): bump eslint from 8.50.0 to 8.51.0
```

### Multi-paragraph body

```
fix(db): handle NULL values in user_preferences column

Prior to this fix, querying users with no saved preferences caused a
null pointer dereference in the preference serializer.

The NULL check was missing because the column was added in a migration
without a default value, making NULL a valid database state.

Fixes #892
```

## Type Reference

| Type       | SemVer | Description                                 |
| ---------- | ------ | ------------------------------------------- |
| `feat`     | MINOR  | New feature visible to end users            |
| `fix`      | PATCH  | Bug fix                                     |
| `docs`     | —      | Documentation only                          |
| `style`    | —      | Formatting, whitespace — no behavior change |
| `refactor` | —      | Code restructure without behavior change    |
| `perf`     | PATCH  | Performance improvement                     |
| `test`     | —      | Adding or correcting tests                  |
| `build`    | —      | Build system, package manager               |
| `ci`       | —      | CI/CD configuration                         |
| `chore`    | —      | Maintenance (not `fix`, not `feat`)         |
| `revert`   | —      | Reverts a previous commit                   |

## Line Length

- **First line (subject):** maximum 72 characters (type + scope + `: ` +
  description)
- **Body and footer lines:** 72 characters is a soft guide; prefer wrapping at
  sentence boundaries

## Breaking Change Patterns

Both forms are valid and often used together:

```
# Minimal — footer only
fix: remove deprecated --format flag

BREAKING CHANGE: The --format flag is removed. Use --output instead.

# Preferred — ! AND footer (dual signal for parsers that check only one)
fix!: remove deprecated --format flag

BREAKING CHANGE: The --format flag is removed. Use --output instead.
```

Never document a breaking change silently with `chore:`. Always use
`BREAKING CHANGE:` footer.

## Footer Format

```
Token: value
Token #value
```

Standard tokens:

- `BREAKING CHANGE` — breaking API change (space allowed; required by spec)
- `Fixes` / `Closes` / `Resolves` — GitHub issue closing keywords
- `Reviewed-by` — reviewer attribution
- `Co-authored-by` — co-author attribution
- `Refs` — non-closing issue reference

Footer tokens with multiple words use `-` as separator: `Reviewed-by:`.
