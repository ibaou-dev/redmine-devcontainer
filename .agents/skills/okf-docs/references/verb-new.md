# Verb: new

Scaffold an OKF v0.2 document. The arguments are the text following `new` in the
invocation.

You are the scaffolder. Write the document, place it where the folder map
dictates, record it in the edit log, and validate it. Do not improvise a layout,
do not invent frontmatter keys, and do not assert a human review you did not
witness. If the methodology behind any field is unclear, read
`skill://okf-docs`.

## 1. Parse the request into arguments

Form: `new <type> "<title>" [--slug s] [--status draft]`

| Argument     | Default           | Meaning                                                                                              |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `<type>`     | required          | one of `adr`, `feature`, `runbook`, `concept`, `reference`                                           |
| `"<title>"`  | required          | the quoted human title, used verbatim in `title` and the H1                                          |
| `--slug s`   | title kebab-cased | filename slug; for `adr`/`feature` the `NNNN-` prefix is added for you and is never part of the slug |
| `--status s` | `draft`           | one of `draft`, `proposed`, `stable`, `superseded`, `deprecated`                                     |

An unrecognised `<type>` is a stop, not a guess — report the five valid types
and end. A `<type>` outside the folder map has no template and no destination.

## 2. Load the configuration

Read `.omp/okf-docs.json` — or `.okf-docs.json` at the same level when the
project has no `.omp/` directory — walking up from the working directory. Take
`bundleRoot`, `obsidian`, `agentId` and `staleAfterDays` from it. When neither
file is found anywhere up the tree, apply the documented defaults:

| Key              | Default     |
| ---------------- | ----------- |
| `bundleRoot`     | `docs`      |
| `obsidian`       | `false`     |
| `agentId`        | `agent:omp` |
| `humanId`        | `null`      |
| `staleAfterDays` | `null`      |

## 3. Resolve the template and compute the destination

The template is the skill's `templates/<type>.md`. Resolve the skill directory
the same way you resolve the validator (see the last section) — the templates
sit alongside `scripts/`.

Folder map, relative to `<bundleRoot>`:

| `type`      | Destination                            |
| ----------- | -------------------------------------- |
| `adr`       | `<bundleRoot>/adrs/NNNN-<slug>.md`     |
| `feature`   | `<bundleRoot>/features/NNNN-<slug>.md` |
| `runbook`   | `<bundleRoot>/runbooks/<slug>.md`      |
| `concept`   | `<bundleRoot>/concepts/<slug>.md`      |
| `reference` | `<bundleRoot>/references/<slug>.md`    |

For `adr` and `feature`, scan the target directory for existing `NNNN-`
prefixes, take the maximum and add one, then zero-pad to four digits. An empty
directory starts at `0001`. Numbers are monotonic — never reuse a number freed
by a deletion, because the old number lives on in git history and in prose that
cites it.

If the destination already exists, **stop and report the path**. Never
overwrite. Pick a different slug or amend the existing document instead.

## 4. Substitute every placeholder

| Placeholder       | Value                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__TITLE__`       | the quoted title, verbatim                                                                                                                                                                                                                                                                                             |
| `__SLUG__`        | the four-digit number, in `adr.md` and `feature.md` only (so `ADR 0004:` and the `ADR-0004` alias render); the other three templates carry no `__SLUG__` token — their kebab slug is used for the filename, not inside the document                                                                                    |
| `__DESCRIPTION__` | a one-sentence summary you write from the request — not the title restated                                                                                                                                                                                                                                             |
| `__AGENT_ID__`    | `<agentId>/<your own model id>`, e.g. `agent:omp/claude-opus-5`                                                                                                                                                                                                                                                        |
| `__TIMESTAMP__`   | the current UTC instant as ISO 8601 with a `Z` suffix, e.g. `2026-08-21T13:45:00Z` — run `date -u +%Y-%m-%dT%H:%M:%SZ` and use its output; a stated "today" elsewhere in context can be stale relative to the actual clock, and `log.md`'s `## YYYY-MM-DD` heading must match this run's real date, not an assumed one |
| `__DATE__`        | the current date as `YYYY-MM-DD`, sliced from the same `date -u` output above — no shipped template uses it, but step 5 needs it for the `## YYYY-MM-DD` log heading                                                                                                                                                   |

Leave no `__PLACEHOLDER__` token behind. The validator tolerates them inside
`templates/`, and nowhere else.

When `obsidian` is `false`, delete the `# obsidian-block:` comment line and the
two keys beneath it (`aliases`, `cssclasses`). When it is `true`, keep all three
and quote any wiki link you put in frontmatter — an unquoted `[[…]]` is YAML
flow syntax, not a link (R9).

`staleAfterDays` is the project's re-verification window. When it is set, add
`stale_after: "<today + staleAfterDays>"` as `YYYY-MM-DD`, placed after
`verified` in the key order; when it is null, omit the key. A `stale_after` in
the past is only an error on a `stable` document (R14), so it is safe — and
useful — on a draft.

**This command never writes `verified`.** Only a human review adds that block,
so a fresh document carries no `verified` key at all. That makes
`--status stable` unsatisfiable here: R4 rejects `status: stable` without a
`verified.by` human attribution. If the request asks for `stable`, create the
document at `proposed`, say why, and point at the promotion procedure in
`skill://okf-docs/references/frontmatter.md`.

## 5. Record the creation in the edit log

Prepend a bullet to today's section of `<bundleRoot>/log.md`, naming the file
and what it is for:

```markdown
## 2026-08-21

- Created `docs/adrs/0004-okf-documentation-governance.md` — records the OKF
  governance decisions.
```

When today has no section, create `## YYYY-MM-DD` above the existing sections —
dates run newest-first and R12 enforces that order. Never add frontmatter to
`log.md`; it is a reserved file and frontmatter there is a finding.

## 6. Validate and report

Run the validator on the new file **and** on `<bundleRoot>/log.md` — step 5 just
wrote to it, and `R17` checks the shape of the entry you added there, not just
the new document:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts docs/adrs/0004-okf-documentation-governance.md docs/log.md
```

Report the destination path, the number assigned (for `adr`/`feature`), the log
line you added, and the validator result for both files. A finding means the
document — or the log entry — is wrong; fix it. Never edit the validator, never
relax a rule, and never report success while a finding stands.

## Resolving the validator path

Resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s "Resolving
`$OKF_DOCS_HOME`" section, then invoke `$OKF_DOCS_HOME/scripts/okf-validate.ts`.
