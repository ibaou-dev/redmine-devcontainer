# OKF Bundle Folder Structure

The layout of a knowledge bundle is dictated, not advisory: the validator
derives a document's expected directory from its `type` and fails the file when
the two disagree. This file is the authority on where things go, what the two
reserved files contain, how documents are named, and how the edit log is kept.
Rule ids (`R0`–`R19`) are defined in `validation.md` in this directory.

The bundle root is `bundleRoot` in `.omp/okf-docs.json` — `docs` in this
project. Every path below is relative to it, and every rule message that names a
directory uses that configured name.

## Folder map

| `type`      | Path                           | Notes                             |
| ----------- | ------------------------------ | --------------------------------- |
| `adr`       | `docs/adrs/NNNN-<slug>.md`     | 4-digit zero-padded, monotonic    |
| `feature`   | `docs/features/NNNN-<slug>.md` | 4-digit zero-padded, monotonic    |
| `runbook`   | `docs/runbooks/<slug>.md`      |                                   |
| `concept`   | `docs/concepts/<slug>.md`      | explanations and research reports |
| `reference` | `docs/references/<slug>.md`    |                                   |
| reserved    | `docs/index.md`, `docs/log.md` | see _Reserved files_              |

`R16` enforces the mapping: a `type: runbook` document anywhere other than
`docs/runbooks/` fails with `type 'runbook' must live in docs/runbooks/`. Types
absent from the map are tolerated — the bundle may invent one — but an invented
type gets no directory, no section contract, and no placement guarantee, so
prefer one of the five.

Directories are created lazily. Do not add `docs/references/` until something
lives in it; an empty directory is not tracked by git and only clutters the
tree.

## Reserved files

OKF reserves two filenames. Both are exempt from the `type` requirement and the
whole trust layer — they are bundle infrastructure, not concepts — so `R1`
through `R9`, `R13`, `R14` and `R16` are skipped for them. `R11` (depth) and
`R15` (exactly one H1) still apply, as does `R10` link integrity, which is the
point: the index is the bundle's link surface.

### `docs/index.md` — the bundle manifest

The root `index.md` is the **only** file in the bundle allowed to carry
frontmatter, and that frontmatter declares the spec version and nothing else:

```yaml
---
spec: 0.2
---
```

Exactly one key, exactly that value. Anything else — an extra key, a different
version, or no frontmatter at all — is
`root index.md frontmatter must declare only 'spec: 0.2'` (`R12`). The body is a
manifest: one section per directory, saying what belongs there, and links to the
live documents.

### `docs/<dir>/index.md` — a directory manifest

A per-directory index is optional and carries **no frontmatter**; adding any is
`index.md must not contain frontmatter outside the bundle root` (`R12`). Body
only: an H1 and a list of what is in that directory.

### `docs/log.md` — the edit log

No frontmatter (`log.md must not contain frontmatter`). One H1, then one `##`
section per calendar day, each heading an ISO date and nothing else:

```markdown
# Documentation Log

## 2026-08-21

- Created `docs/adrs/0004-okf-documentation-governance.md` recording OKF
  governance decisions.
- Deleted `docs/quantum-computing.md`; off-topic, superseded by no successor.

## 2026-08-14

- Created `docs/features/0001-gated-deep-research-pipeline.md`.
```

Two `R12` rules police it. A heading that is not an ISO date gives
`log.md heading '## <heading>' must be an ISO date (## YYYY-MM-DD)` — so no
`## Monday`, no `## 2026-08-21 (housekeeping)`, no `## Week 34`. Dates out of
descending order give `log.md dates must be newest-first`, once per file rather
than once per heading.

Note that the reserved-file exemption is keyed on the **basename**, so a
`log.md` placed in a subdirectory is validated by the `log.md` rules too. Keep
one log, at the bundle root.

### Bundle-level existence

In whole-bundle mode the validator additionally requires both files to be
present, reporting `bundle is missing its root index.md` and
`bundle is missing log.md` against the bundle root path. A bundle without them
is not conformant even if every document in it is clean.

## Depth limit: at most two levels

A path inside the bundle may have at most two segments — one directory plus the
filename. `R11` rejects anything deeper with
`nested beyond two levels inside docs/`.

The reason is the **concept ID**: OKF defines it as the bundle-relative path
minus the `.md` extension, and that ID is what links, indexes and agent context
manifests carry. A flat bundle keeps IDs short
(`adrs/0004-okf-documentation-governance`), stable across reorganisation, and
unambiguous by basename — which is also what lets wiki-style links resolve on
basename alone. Deep hierarchies push taxonomy into the path, and every later
reshuffle then rewrites every ID that referenced it. When a directory feels too
big, the answer is a better index or better tags, not a subdirectory.

## Numbering discipline for `adr` and `feature`

Decision records and feature requests are numbered because they are referred to
by number in conversation, commits and other documents.

- **Four digits, zero-padded.** `0004`, not `4` or `004`. Padding keeps lexical
  order equal to numeric order, so a directory listing is the history.
- **Monotonic.** The next number is one past the highest existing prefix in that
  directory. Scan the directory; never guess.
- **Never reused.** A deleted or abandoned record burns its number. Reuse makes
  every existing reference to that number ambiguous.
- **Never renumbered after publication.** If a record is wrong, supersede it:
  write a new record and set the old one to `status: superseded` with
  `superseded_by` pointing at the successor (`R18`, `R19`) and a matching
  pointer in its Status section for a human reader.
- **Per-directory sequences.** `adrs/` and `features/` number independently; ADR
  0002 and FR 0002 coexist. Disambiguate in prose with the `ADR-` / `FR-`
  prefix, which is also what the `aliases` entry is for.

## Slug rules

Applies to every type, including the part after the number:

- Lowercase kebab-case: `okf-documentation-governance`, not
  `OKF_Documentation_Governance`.
- ASCII letters, digits and hyphens only. No spaces, no `+`, no `&`, no
  parentheses.
- **No dates in the slug.** The log records when; the frontmatter records when;
  a date in the filename is a third copy that goes stale the moment the document
  is revised.
- No version suffixes either — no `-v2`, no `-new`, no `-final`. A revision
  edits the file; a replacement gets its own number and supersedes the old one.
- Derived from the title, trimmed of filler: title
  `ADR 0004: OKF Documentation Governance` gives slug
  `okf-documentation-governance` and filename
  `0004-okf-documentation-governance.md`.
- Unique across the whole bundle, not just its directory. Basename-resolved
  links cannot tell two `overview.md` files apart.

## A healthy bundle

```text
docs/
├── index.md                                  spec: 0.2, manifest of the tree below
├── log.md                                    ## YYYY-MM-DD sections, newest first
├── adrs/
│   ├── 0001-agent-framework-architecture.md  status: superseded
│   ├── 0002-research-workflow-sources-and-gates.md
│   ├── 0003-omp-native-workflow-substrate.md
│   └── 0004-okf-documentation-governance.md
├── features/
│   ├── 0001-gated-deep-research-pipeline.md
│   └── 0002-okf-docs-skill.md
├── runbooks/
│   ├── deep-research-pipeline.md
│   ├── okf-docs-authoring.md
│   └── okf-docs-install.md
└── concepts/
    └── agentic-deep-research.md              status: draft, agent-authored
```

`docs/references/` is absent because nothing needs it yet. `docs/.obsidian/` may
also be present — it is editor state, not part of the bundle, and the validator
only looks at `*.md`.

## Log discipline

The log is the bundle's own history, written for a reader who has no access to
git.

- **One bullet per change, under the current date.** Create the `## YYYY-MM-DD`
  section if today has none; it goes at the top, immediately after the H1.
- **Newest date first.** Sections descend; the newest work is what a reader
  wants first, and `R12` enforces it.
- **One line per action, naming the path.**
  `Created docs/runbooks/okf-docs-install.md — how another repo consumes this skill.`
  Not a paragraph, not a changelog of prose edits: one line, the path, and why.
- **What gets an entry:** creating, deleting, moving or renaming a document; a
  status change (especially promotion to `stable`); a structural change to the
  bundle. Fixing a typo does not.
- **Deletions always get an entry.** This is the log's main job. Git history
  records the removal but a reader of the bundle cannot see git — without a log
  line, a deleted document simply vanishes, and every reference to it becomes an
  unexplained dead end. Say what was deleted and why, and name the successor if
  there is one.
- **Moves name both paths**, so a stale link elsewhere can be traced to its new
  home.
- **`R17` checks the shape mechanically:** a bullet, a past-tense verb, a
  `` `path.md` `` reference, at most 50 words. It cannot judge whether an entry
  is _interesting_ — only whether it has the shape one does. Full rule text and
  fix-per-message is in `validation.md` in this directory.
- **Skill-development changes don't belong here.** Editing this skill's own
  `SKILL.md`, scripts, templates, verb files or evals is not a bundle-document
  action — `R17`'s document-reference requirement enforces exactly this: no
  `.md` path in the bundle, no entry.
- **`log.md` is one shared file — parallel writers must not each append to it.**
  Two agents writing concurrently can both read the file before either writes,
  and the second write silently drops the first agent's entry. When several
  agents are writing to the bundle at once, either serialise the log write or
  have one agent record every entry after the parallel writes complete.
