# OKF Validator Rule Reference

Every rule the validator enforces, the exact message it emits, and how to fix
the document. The implementation is `$OKF_DOCS_HOME/scripts/okf-validate.ts`
(see `skill://okf-docs/SKILL.md`); the message strings below are copied from it
verbatim, with `<…>` marking the parts interpolated at runtime.

The validator collects **all** findings rather than stopping at the first, so
one run tells you everything wrong with a file. It exits 1 if there is any
finding, 0 otherwise.

## Rule index

| Rule  | Checks                                                                      |
| ----- | --------------------------------------------------------------------------- |
| `R0`  | the path exists                                                             |
| `R1`  | frontmatter is present, parses as YAML, and is a mapping                    |
| `R2`  | `type` is present and non-empty — the one rule of OKF conformance           |
| `R3`  | `status` is one of the five allowed values                                  |
| `R4`  | `status: stable` carries a human `verified.by`                              |
| `R5`  | `generated.by` and `generated.at` are present and well-formed               |
| `R6`  | `verified.by` is a human id; `verified.at` is a plain date                  |
| `R7`  | `tags`, `aliases`, `cssclasses`, `sources` are lists                        |
| `R8`  | each `sources` item is a URL string or has a `resource`                     |
| `R9`  | wiki links in frontmatter are quoted                                        |
| `R10` | internal links resolve                                                      |
| `R11` | depth inside the bundle is at most two levels                               |
| `R12` | the reserved files `index.md` and `log.md` are well-formed and present      |
| `R13` | the type's required `##` sections exist                                     |
| `R14` | `stale_after` is a plain date and has not passed on a `stable` document     |
| `R15` | the body has exactly one H1                                                 |
| `R16` | `type` matches the directory per the folder map                             |
| `R17` | each `log.md` entry is one bulleted, verb-led line naming a bundle document |
| `R18` | `status: superseded` and `superseded_by` require each other                 |
| `R19` | `superseded_by` resolves to an existing bundle document, not itself         |

Rules that read the frontmatter (`R1`–`R9`, `R13`, `R14`, `R18`, `R19`) are
skipped for the reserved files, which carry no frontmatter contract of their
own. `R11` and `R16` are skipped in draft and template mode. `R10` and `R15`
apply to every file, always. `R17` applies only to `log.md`.

## Rules

### R0 — the path exists

Every path handed to the validator must exist on disk.

```text
file does not exist
```

**Fix:** correct the path. In per-file mode arguments are used as given, so a
path relative to a different directory than the one you ran from produces this.
Non-`.md` arguments are dropped before this check, so passing a `.ts` file is
silently ignored rather than reported.

### R1 — frontmatter present, parseable, and a mapping

The document must open on line 1 with `---`, close the block with `---` on its
own line, and the block must parse as a YAML mapping.

```text
missing frontmatter
invalid YAML in frontmatter: <parser detail>
frontmatter must be a YAML mapping
```

**Fix:** `missing frontmatter` means the opening `---` is not the very first
line — a leading blank line, a BOM, or a comment above it all cause this.
`invalid YAML` quotes the parser's own complaint, which names the line and
column; the usual causes are inconsistent indentation and an unquoted value
containing `:` or `[`. `frontmatter must be a YAML mapping` means the block
parsed but produced a list or a scalar — you probably left a stray leading `-`
on the first key. Any of these three stops frontmatter checking for that file,
so fix it and re-run to see the rest.

### R2 — non-empty `type`

```text
missing 'type' in frontmatter
```

**Fix:** add `type` as the first key. In this bundle it is one of `adr`,
`feature`, `runbook`, `concept`, `reference`. An empty string, `null`, or a
missing key all report this.

### R3 — valid `status`

```text
invalid status '<value>'. Must be one of: draft, proposed, stable, superseded, deprecated
```

**Fix:** use one of the five. `draft`, `stable` and `deprecated` are OKF v0.2;
`proposed` and `superseded` are this project's documented extensions for the
decision-record lifecycle. Common mistakes: `approved` (use `stable`), `active`
(use `stable`), `wip` (use `draft`), `accepted` (use `stable`, or `proposed` if
nobody has reviewed it). Omitting `status` entirely is legal.

### R4 — `stable` requires human approval

```text
status 'stable' requires a 'verified.by' human attribution
```

**Fix:** either add the reviewer block, or lower the status. This is the
approval gate, and an agent must never satisfy it on its own behalf.

```yaml
status: "stable"
verified:
  by: "human:ibaou"
  at: "2026-08-21"
```

If no human has reviewed the document, set `status: "proposed"` and leave
`verified` out entirely.

### R5 — author provenance

`generated.by` must start with `agent:` or `human:`, and `generated.at` must be
an ISO 8601 timestamp with an explicit zone.

```text
missing 'generated.by'
'generated.by' must start with 'agent:' or 'human:'
missing 'generated.at'
'generated.at' must be an ISO 8601 timestamp
```

**Fix:** add the block. When `generated` is absent altogether only
`missing 'generated.by'` is reported, so fix and re-run rather than assuming
`at` is fine. `generated.run` is optional and unchecked beyond "non-empty string
when present" — an opaque identifier the producing workflow chooses, which a
consumer resolves to a staging location on its own terms; the validator has no
opinion on its shape.

```yaml
generated:
  by: "agent:omp/claude-opus-5"
  at: "2026-08-21T13:45:00Z"
```

The zone is required: `2026-08-21T13:45:00` fails, `2026-08-21T13:45:00Z` and
`2026-08-21T15:45:00+02:00` pass. A date-only value fails — use `stale_after` or
`verified.at` for plain dates. Seconds and fractional seconds are optional. `by`
takes the `agentId` prefix from `.omp/okf-docs.json` plus the writing model's
own id.

### R6 — reviewer provenance

Checked only when a `verified` block is present.

```text
'verified.by' must start with 'human:'
'verified.at' must be YYYY-MM-DD
```

**Fix:** prefix the reviewer with `human:` — `"human:ibaou"`, not `"ibaou"` and
not `"agent:omp/…"`, because an agent cannot be the verifier. `verified.at` must
be exactly ten characters, `YYYY-MM-DD`; a full timestamp fails here even though
it would pass for `generated.at`.

### R7 — list-shaped fields

`tags`, `aliases`, `cssclasses` and `sources` must be YAML lists when present.

```text
'<field>' must be an array, not a scalar
```

**Fix:** expand the scalar into a block sequence. `tags: research` becomes:

```yaml
tags:
  - "research"
```

Obsidian v1.9+ requires this for `tags`, `aliases` and `cssclasses`; a
comma-separated string is no longer parsed. An empty list is written `tags: []`
and is valid.

### R8 — provenance items

Each entry in `sources` must be a non-empty URL string or a mapping with a
non-empty `resource`.

```text
sources[<index>] must be a URL string or an object with a 'resource'
```

**Fix:** the index is zero-based and points at the offending entry. Either
shorthand or object form is accepted, and a list may mix them:

```yaml
sources:
  - "https://arxiv.org/abs/2604.05854"
  - id: "okf-spec"
    resource: "docs/references/okf-v0-2-format.md"
    title: "Open Knowledge Format (OKF) v0.2"
```

An object carrying only `id` and `title` fails — `resource` is the field that
says what the source actually is. An empty string entry fails; drop it.

### R9 — quoted wiki links in frontmatter

```text
internal wiki links in frontmatter must be quoted
```

**Fix:** wrap the value in double quotes. Unquoted, YAML reads the double
brackets as a nested flow sequence and the link is silently destroyed, so the
document looks fine and links to nothing:

```yaml
primary_source: "[[Some Note]]"
```

### R10 — link integrity

Every internal link in the body must resolve. Wiki links are checked only when
`obsidian` is `true` in `.omp/okf-docs.json`, since the syntax is meaningless
otherwise; markdown links are always checked. Fenced code blocks and inline code
spans are stripped first, so example markup in a code block is never mistaken
for a real link.

```text
broken internal wiki link: [[<target>]]
broken markdown link: <target>
```

**Fix:** wiki links resolve against an index of every `*.md` basename **inside
the bundle**, case-insensitively and without the `.md` suffix, so the target is
a bare filename — a path or an extension in the target will not match, and
neither will a file outside the bundle. An alias part after `|` is ignored for
resolution. Markdown links resolve as paths relative to the linking file's own
directory; a fragment after `#` is stripped before the existence check, and
anything with a URL scheme, a leading `#`, or a protocol-relative `//` prefix is
skipped. Either fix the target's spelling, create the missing file, or — when
the link is illustrative — move it into a code fence.

### R11 — depth limit

```text
nested beyond two levels inside docs/
```

**Fix:** move the file up. A bundle-relative path may have at most two segments,
one directory plus the filename: `docs/adrs/0004-x.md` is fine,
`docs/adrs/2026/0004-x.md` is not. The directory name in the message is whatever
`bundleRoot` (or `--bundle`) is set to. Skipped in draft and template mode. The
rationale for the limit is in `folder-structure.md` in this directory.

### R12 — the reserved files

`index.md` and `log.md` are bundle infrastructure. Seven distinct messages:

```text
log.md must not contain frontmatter
log.md heading '## <heading>' must be an ISO date (## YYYY-MM-DD)
log.md dates must be newest-first
index.md must not contain frontmatter outside the bundle root
root index.md frontmatter must declare only 'spec: 0.2'
bundle is missing its root index.md
bundle is missing log.md
```

**Fix, per message:**

- `log.md must not contain frontmatter` — delete the whole `---` block. The log
  makes no claims that need provenance.
- `log.md heading … must be an ISO date` — every `##` in the log is a bare
  `YYYY-MM-DD`. Move any descriptive text into the bullets below it.
- `log.md dates must be newest-first` — reorder the sections descending.
  Reported once per file, not once per misplaced heading.
- `index.md must not contain frontmatter outside the bundle root` — delete the
  block from the subdirectory index; only the root manifest may have one.
- `root index.md frontmatter must declare only 'spec: 0.2'` — the root
  manifest's frontmatter is exactly one key. Not zero (the block is required),
  not two, and the value must be `0.2`.
- `bundle is missing its root index.md` / `bundle is missing log.md` — create
  them. These two fire only in whole-bundle mode and are reported against the
  bundle root rather than a file.

The exemption is keyed on the basename, so a `log.md` or `index.md` anywhere in
the bundle is validated by these rules rather than the frontmatter rules.

### R13 — required sections per type

Each `##` heading required by the type must be present. Matching is a
case-insensitive prefix match on the heading text, so
`## Failure modes and recovery` satisfies `Failure modes`. Headings inside
fenced code do not count.

```text
type '<type>' requires a '## <Section>' section
```

| `type`      | Required `##` sections                                         |
| ----------- | -------------------------------------------------------------- |
| `adr`       | Status, Context, Decision, Consequences                        |
| `feature`   | Status, Problem, Requirements                                  |
| `runbook`   | Purpose, Preconditions, Procedure, Verification, Failure modes |
| `concept`   | none                                                           |
| `reference` | none                                                           |

**Fix:** add the missing heading at `##` depth — not `###`, which does not
count. One finding is reported per missing section, so the first run lists all
of them. Types absent from the table impose no section contract.

### R14 — freshness

```text
'stale_after' must be YYYY-MM-DD
stale_after <date> has passed; re-verify or lower status
```

**Fix:** the format error means the value is not exactly a ten-character
`YYYY-MM-DD` — a timestamp or a phrase like `next quarter` fails. The expiry
error fires only when `status: stable`, because an expired approved document
actively misleads while an expired draft is merely old. Resolve it by
re-reviewing (bump `verified.at` and push `stale_after` out by
`staleAfterDays`), by dropping the status to `proposed` or `deprecated`, or by
removing `stale_after` if the document does not rot.

### R15 — exactly one H1

```text
document must contain exactly one H1
```

**Fix:** the body — everything after the frontmatter — must contain exactly one
`#` heading. Headings inside fenced code are not counted. Zero H1s means the
document has no title heading; add one matching `title`. More than one means a
`##` was written as `#`; demote the extras. This applies to the reserved files
too: `index.md` and `log.md` each need their single H1.

### R16 — type matches directory

```text
type '<type>' must live in docs/<dir>/
```

**Fix:** move the file into the mapped directory, or correct `type` if the
directory is right. The map is `adr`→`adrs`, `feature`→`features`,
`runbook`→`runbooks`, `concept`→`concepts`, `reference`→`references`. A document
outside the bundle entirely also reports this, which is what catches a report
written to the wrong destination. Types absent from the map are tolerated, and
the rule is skipped in draft and template mode.

### R17 — log entry discipline

`log.md` is read by someone with no access to git, so each entry must stand on
its own: a bulleted line, opening with a past-tense action verb, naming the
document it is about. Checked per top-level bullet — a line starting with a dash
and a space plus any 2-space-indented continuation lines with no blank line
between them.

```text
log.md entry '<snippet>' does not open with a past-tense action verb
log.md entry '<snippet>' names no bundle document
log.md entry '<snippet>' is <N> words, over the 50-word limit
log.md line '<snippet>' is not a bullet or a continuation
```

`<snippet>` is the entry's first ~8 words, ellipsized, so a finding can be
matched back to the bullet it is about without quoting the whole thing.

**Fix, per message:**

- `does not open with a past-tense action verb` — start the bullet with what
  happened: `Created`, `Deleted`, `Moved`, `Verified`, `Dropped`, `Updated`,
  `Added`, `Retrofitted`, `Compacted`… A regular `-ed` verb passes (hyphenated
  compounds like `Re-verified` too); a short list of irregulars (`Made`, `Set`,
  `Wrote`, `Found`, …) covers the rest. `The`, `This`, `A material edit…` do not
  open with a verb and are rejected.
- `names no bundle document` — the bullet must quote at least one path ending in
  `.md` inside backticks, e.g.
  `` `docs/adrs/0005-skill-command-entry-point.md` ``. A reference by ADR/FR
  shorthand alone, or no reference at all, fails this — the path is the concept
  ID, and the log's whole job is pointing a reader at documents, not summarising
  work in the abstract.
- `is <N> words, over the 50-word limit` — this is a one-line log, not a
  paragraph. Cut it to the path and the reason; move rationale, numbers and
  caveats into the document itself if they belong anywhere. The limit is set
  from the compliant corpus (longest entry: 37 words) with headroom for a bullet
  naming several paths at once.
- `is not a bullet or a continuation` — every non-blank line under a
  `## YYYY-MM-DD` heading must either start a bullet (dash, space) or continue
  one (exactly two spaces of indent, no blank line since the bullet started). A
  bare paragraph, a `###` sub-heading, or a differently-indented line all fail
  this.

Skill-development changes — edits to this skill's own scripts, templates, verb
files or evals — are not logged here at all (see the fourth rule in `SKILL.md`'s
"one rule, four contracts" list); that history belongs in git, which is exactly
what `R17`'s reference requirement makes checkable: no `.md` path, no bundle
document, no entry.

### R18 — supersession requires both sides

```text
status 'superseded' requires a 'superseded_by' successor
'superseded_by' is set but status is '<status>', not 'superseded'
```

**Fix:** the two fields require each other, the same way `R4` requires
`verified.by` for `status: stable`. Moving a document to `status: "superseded"`
without naming what replaced it leaves the supersession graph unwalkable — see
`R19`. Setting `superseded_by` on a document that is not (or no longer)
`status: "superseded"` is equally a defect: either the status update was missed,
or the key is stale and should be deleted.

```yaml
status: "superseded"
superseded_by: "adrs/0007-successor-slug"
```

### R19 — `superseded_by` resolves

```text
'superseded_by' must not name the document itself
'superseded_by' target '<value>' does not exist in the bundle
```

**Fix:** the value is a bundle-relative concept ID — the path minus its `.md`
suffix, e.g. `adrs/0007-successor-slug` for `docs/adrs/0007-successor-slug.md`
when `bundleRoot` is `docs`. Unlike `R10`'s wiki-link resolution this is the
full path, not just the basename, so two documents sharing a basename in
different folders cannot collide. A document cannot supersede itself. This rule
does not walk the graph for cycles (A superseding B while B supersedes A) — only
the two direct checks above are enforced today.

## Invocation modes

### Per-file mode

Any path argument selects per-file mode. Only the named files are read, and the
two bundle-level existence checks (`bundle is missing its root index.md`,
`bundle is missing log.md`) are skipped, so a single-file check never fails
because of a sibling. Arguments not ending in `.md` are dropped. This is the
mode the pre-commit hook uses, since it passes staged filenames.

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts docs/adrs/0004-okf-documentation-governance.md
```

### Whole-bundle mode

Passing no paths validates every `*.md` under the bundle root, sorted, plus the
bundle-level existence checks. This is the mode that answers "is the bundle
conformant".

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts
```

Note that whole-bundle mode reports on files other people may be editing. When
several agents are writing to the bundle at once, validate only your own files.

### `--draft`

Skips the position rules `R11` (depth) and `R16` (folder map) for a document
that has not been placed in the bundle yet — a pipeline checkpoint at
`.raw/runs/<runId>/draft-2.md`, or a scratch file being assembled before it is
moved into place. Every content rule still applies, so a draft is held to the
same frontmatter, section and link standard as a published document; only its
location is excused.

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts --draft .raw/runs/20260821-a1b2/draft-2.md
```

### Template mode

Applied automatically — there is no flag — to any file whose path contains a
`templates/` segment. Two effects:

1. The position rules `R11` and `R16` are skipped, so a template may live in the
   skill directory while declaring `type: "adr"`.
2. A value matching `__UPPERCASE__` (double underscore, then uppercase letters,
   digits or underscores, then double underscore) satisfies any format rule.
   `status: "__STATUS__"` passes `R3`, `by: "__AGENT_ID__"` and
   `at: "__TIMESTAMP__"` pass `R5`, `at: "__DATE__"` passes `R6`, and
   `stale_after: "__DATE__"` passes `R14`.

Everything else is enforced normally: a template still needs its frontmatter
(`R1`), a non-empty `type` (`R2`), list-shaped list fields (`R7`), all of its
type's `##` sections (`R13`), resolving links (`R10`) and exactly one H1
(`R15`). That is the point — a template that would produce an invalid document
fails before anyone uses it.

### `--bundle DIR`

Overrides `bundleRoot` for this run, as `--bundle DIR` or `--bundle=DIR`. The
value is used verbatim in the `R11` and `R16` messages and it also relocates the
basename index that `R10` resolves wiki links against. Useful for validating a
second bundle, or a fixture tree, without touching the config.

### `--json`

Prints a single line and nothing else:

```json
{ "ok": true, "errors": [] }
```

```json
{
  "ok": false,
  "errors": [
    {
      "path": "docs/log.md",
      "rule": "R12",
      "message": "log.md dates must be newest-first"
    }
  ]
}
```

`path` is the argument as it was given, `rule` is the id, `message` is the text
documented above. Exit code is 1 whenever `errors` is non-empty, so a caller can
branch on either. Machine callers — eval assertions, gate scripts — should use
this rather than parsing the text output.

### Text output

The default. One line per clean file, then one line per finding on stderr:

```text
✅ docs/adrs/0004-okf-documentation-governance.md
❌ docs/log.md: R12 — log.md dates must be newest-first
```

A file with any finding does not get a `✅` line. When the target list is empty
the run prints `no markdown files to validate` and exits 0.

## Running it

From the repository root:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts [--bundle DIR] [--draft] [--json] [paths...]
```

Three things to know:

- **`skill://` does not expand in bash.** It resolves only in the read, glob and
  grep tools, so every shell invocation, hook entry and script call needs a real
  filesystem path — resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s
  "Resolving `$OKF_DOCS_HOME`" section and use
  `$OKF_DOCS_HOME/scripts/okf-validate.ts`.
- **Run from the repository root.** The validator resolves relative paths
  against the current directory, resolves the bundle root against it, and finds
  `.omp/okf-docs.json` by walking up from it. Running from a subdirectory finds
  the same config but computes a different bundle path. Bun resolves the `yaml`
  dependency from the root `package.json`, which is another reason to stay
  there.
- **Config is optional.** With neither `.omp/okf-docs.json` nor `.okf-docs.json`
  anywhere up the tree the defaults apply: bundle root `docs`, Obsidian mode off
  (so `R10` checks markdown links only), agent prefix `agent:omp`, no configured
  human, no stale horizon.

Add `--help` to print the usage line.

### Pre-commit hook

A project's own pre-commit config needs the literal installed path —
`$OKF_DOCS_HOME` is a session-time convention (see `skill://okf-docs/SKILL.md`),
not an environment variable a git hook can read — so resolve it once and
hardcode the result:

```yaml
- repo: local
  hooks:
    - id: okf-lint
      name: OKF Format Linter
      entry: bun run <resolved $OKF_DOCS_HOME>/scripts/okf-validate.ts
      language: system
      types: [markdown]
      files: ^docs/.*\.md$|^<resolved $OKF_DOCS_HOME>/templates/.*\.md$
      pass_filenames: true
```

`pass_filenames: true` is what selects per-file mode, so the hook never fails a
commit because of an unrelated file. The `files` pattern covers the templates as
well as the bundle, so a template that would generate an invalid document is
caught at commit time. `language: system` requires `bun` on `PATH`; the hook
entry cannot use `skill://`.
