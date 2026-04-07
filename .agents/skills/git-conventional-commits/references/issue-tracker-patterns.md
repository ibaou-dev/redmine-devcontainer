# Issue Tracker Detection Patterns

When CONTRIBUTING.md is found, scan it for these signals to identify the tracker
type and extract format rules.

## Detection Heuristics

### GitHub

**Signals in CONTRIBUTING.md:**

- Text mentions `github.com`, `GitHub Issues`, `gh issue`
- Closing keywords: `Fixes #N`, `Closes #N`, `Resolves #N`, `Fix #N`
- PR references use `#N` (same namespace as issues)

**Footer format:**

```
Fixes #847
Closes #312
Refs #501
```

**Notes:**

- Issues and PRs share the `#N` namespace
- Multiple keywords can be on separate footer lines
- GitHub recognizes: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`,
  `resolve`, `resolves`, `resolved` (case-insensitive)

---

### GitLab

**Signals in CONTRIBUTING.md:**

- Text mentions `gitlab.com`, `GitLab`, `merge request`, `MR`
- Issues use `#N`, merge requests use `!N`
- May reference `gitlab.example.com` (self-hosted)

**Footer format:**

```
Closes #312
Closes !89
```

**CRITICAL:** `#89` and `!89` are DIFFERENT namespaces in GitLab:

- `#89` = issue #89
- `!89` = merge request !89

Never use `#89` for a merge request reference in a GitLab project. Use `!89`.

**Notes:**

- Closing keywords: `Closes`, `Fixes`, `Resolves` (same as GitHub)
- Cross-project: `group/project#N`

---

### Jira

**Signals in CONTRIBUTING.md:**

- Text mentions `jira`, `atlassian`, `JIRA`
- Issue key pattern: `[A-Z]+-\d+` (e.g. `PLAT-2891`, `AUTH-42`, `BACKEND-101`)
- May specify the project key prefix explicitly (e.g. `PROJECT_KEY: PLAT`)

**Footer format:**

```
Closes PLAT-2891
Refs AUTH-42
```

**CRITICAL:** Never use `#N` for Jira. The key is the full `PROJECT-NUMBER`
string.

**Extraction:**

- Project key: grep for `[A-Z]{2,10}-\d+` pattern in CONTRIBUTING.md examples
- Common prefixes: look for the project name or key in the first 20 lines
- If ambiguous, use whatever key format appears in `git log` examples in
  CONTRIBUTING.md

---

### Bitbucket

**Signals in CONTRIBUTING.md:**

- Text mentions `bitbucket.org`, `Bitbucket`
- Issue references: `#N` or `issue #N`

**Footer format:**

```
Closes #42
Fixes #17
```

**Notes:**

- Bitbucket uses `#N` like GitHub
- Pull requests also use `#N` (shared namespace)

---

### Gitea

**Signals in CONTRIBUTING.md:**

- Text mentions `gitea`, self-hosted git with Gitea branding

**Footer format:**

```
Closes #N
Fixes #N
```

---

### Redmine

**Signals in CONTRIBUTING.md:**

- Text mentions `redmine`, `tracker`
- References `#N` with context like "Redmine issue"

**Footer format:**

```
Closes #N
Refs #N
```

---

## Scope Rules Extraction

When CONTRIBUTING.md defines allowed scopes:

```
# Patterns to grep for:
- "scope" or "scopes" in a list context
- Comma-separated identifiers in parentheses after type examples
- A table with "Scope" column
- "valid scopes:" or "allowed scopes:"
```

If a scope list is found:

- Use ONLY values from that list
- Treat scope as **mandatory** if CONTRIBUTING.md says "required" or "must
  include"
- If the change doesn't fit any listed scope, pick the nearest or omit and note
  why

---

## Breaking Change Policy

Check CONTRIBUTING.md for:

- Custom footer tokens (some projects use `BREAKING:` instead of
  `BREAKING CHANGE:`)
- Whether `!` suffix is preferred, required, or forbidden
- Migration path requirements ("must include upgrade steps")

---

## Closing Keyword Extraction

Grep CONTRIBUTING.md for:

```
Fixes #    Closes #    Resolves #    Fix #
Fixes PROJ-  Closes PROJ-
```

Use the **exact keyword casing** found in CONTRIBUTING.md. If CONTRIBUTING.md
says `Fixes`, use `Fixes` not `fixes`.

---

## Fallback: No CONTRIBUTING.md

When CONTRIBUTING.md is absent:

1. Use standard CC spec defaults
2. Infer tracker from remote URL:
   - `github.com` → GitHub (`Fixes #N`)
   - `gitlab.com` or `gitlab.` → GitLab (`Closes #N`, `!N` for MRs)
   - `bitbucket.org` → Bitbucket (`Closes #N`)
   - `atlassian.net` → Jira (but you can't know the project key — omit issue
     reference or ask user)
3. If no remote URL or ambiguous → use `Closes #N` as generic default
4. **Always state explicitly:** "No CONTRIBUTING.md found — using standard CC
   spec with [GitHub/GitLab/inferred] issue format"
