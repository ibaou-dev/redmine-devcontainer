# OKF Frontmatter Field Reference

Every frontmatter key this bundle recognises, what shape it takes, whether it is
required, whether it comes from the Open Knowledge Format spec or is a local
extension, and which validator rule enforces it. Rule ids (`R0`–`R19`) are
defined in `validation.md` in this directory.

OKF has exactly one rule of conformance: **a document must declare a non-empty
`type`**. Everything else in this file is either the OKF v0.2 trust layer, an
Obsidian requirement, or a project policy layered on top. Consumers of an OKF
bundle are required to tolerate metadata they do not understand, so this project
never errors on an unrecognised key — see _Unknown keys_ below.

## Canonical key order

Write keys in this order, always. The validator does not check order; humans and
diffs do.

```yaml
type            # required
title
description
resource        # only when the concept points at an external asset
status
superseded_by   # only when status: superseded
sources
tags
generated
verified
stale_after
aliases         # Obsidian
cssclasses      # Obsidian
```

Formatting conventions that apply to every block:

- All scalar values are double-quoted. YAML 1.2 has no timestamp type, so
  `2026-08-21` parses as a string either way, but quoting keeps Obsidian from
  coercing the value to a Date property and keeps values containing `:`, `#`,
  `[`, `]`, `{`, `}`, `,` or `|` legal without special cases.
- Every list is a YAML block sequence (one `- item` per line), never a
  comma-separated string and never a flow sequence. Obsidian v1.9+ requires this
  for `tags`, `aliases` and `cssclasses`.
- Wiki links inside frontmatter are always quoted (`R9`). Unquoted, YAML reads
  the double brackets as a nested flow sequence and the link is silently lost,
  so the document looks fine and links to nothing:

  ```yaml
  primary_source: "[[Some Note]]"
  ```

- YAML anchors (`&`) and aliases (`*`) are disabled by Obsidian. Do not use
  them.
- The block starts on line 1 with `---` and closes with `---` on its own line.

## Field table

| Field           | Required                       | Origin                   | Shape                                                                                       | Rule                     |
| --------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------ |
| `type`          | yes                            | OKF v0.1 core            | non-empty string; one of `adr`, `feature`, `runbook`, `concept`, `reference` in this bundle | `R2`, `R16`              |
| `title`         | no (write it anyway)           | OKF v0.1 core            | string, human-friendly name                                                                 | none                     |
| `description`   | no (write it anyway)           | OKF v0.1 core            | string, one sentence                                                                        | none                     |
| `resource`      | no                             | OKF v0.1 core            | string, URL or bundle-relative path to the asset the concept describes                      | none                     |
| `status`        | no                             | OKF v0.2, extended here  | one of `draft`, `proposed`, `stable`, `superseded`, `deprecated`                            | `R3`, `R4`, `R14`, `R18` |
| `superseded_by` | only when `status: superseded` | project extension        | bundle-relative concept ID (path minus `.md`) of the replacing document                     | `R18`, `R19`             |
| `sources`       | no                             | OKF v0.2 trust layer     | list; each item a non-empty URL string or a mapping with a non-empty `resource`             | `R7`, `R8`               |
| `tags`          | no                             | OKF v0.1 core / Obsidian | list of strings, no leading `#`                                                             | `R7`                     |
| `generated.by`  | yes                            | OKF v0.2 trust layer     | string starting `agent:` or `human:`                                                        | `R5`                     |
| `generated.at`  | yes                            | OKF v0.2 trust layer     | ISO 8601 timestamp with an explicit zone                                                    | `R5`                     |
| `generated.run` | no                             | project extension        | opaque non-empty string, a producing workflow's own run identifier                          | `R5`                     |
| `verified.by`   | only when `status: stable`     | OKF v0.2 trust layer     | string starting `human:`                                                                    | `R4`, `R6`               |
| `verified.at`   | no                             | project extension        | `YYYY-MM-DD`                                                                                | `R6`                     |
| `stale_after`   | no                             | OKF v0.2 trust layer     | `YYYY-MM-DD`                                                                                | `R14`                    |
| `aliases`       | no                             | Obsidian                 | list of strings                                                                             | `R7`                     |
| `cssclasses`    | no                             | Obsidian                 | list of strings                                                                             | `R7`                     |

`title` and `description` carry no rule of their own, but they are the only
fields a reader sees in a bundle index or an agent sees in a context manifest.
Treat them as required in practice.

## Field notes

### `type`

The whole of OKF conformance. Non-empty string, checked by `R2`. In this bundle
`type` also decides where the file lives: `R16` maps each of the five known
types to a directory (see `folder-structure.md`). A type outside that map is
tolerated — `R16` only fires for mapped types — but inventing a sixth type means
the folder map and the section contract no longer cover it.

### `status`

OKF v0.2 defines three values: `draft`, `stable`, `deprecated`. This project
documents two extensions, `proposed` and `superseded`, which carry the ADR /
feature-request lifecycle:

```text
draft → proposed → stable → superseded
                          → deprecated
```

- `draft` — being written; an agent's own output starts here.
- `proposed` — complete and awaiting a human decision. Use this instead of
  `stable` when nobody has reviewed the document yet.
- `stable` — reviewed and in force. **Requires `verified.by`** (`R4`).
- `superseded` — replaced by a later document, named in `superseded_by` (`R18`)
  and, for a human reading the prose, in the Status section too.
- `deprecated` — no longer in force and not replaced.

`R3` rejects anything else with
`invalid status '<v>'. Must be one of: draft, proposed, stable, superseded, deprecated`.
Omitting `status` entirely is legal; the document then makes no lifecycle claim,
and `R4` and the `stale_after` expiry check do not apply.

### `superseded_by`

The machine-readable half of supersession. `status: "superseded"` requires it,
and it requires `status: "superseded"` right back (`R18`) — a stale key left
over from a status that has since moved on is exactly as much a defect as a
missing one.

```yaml
status: "superseded"
superseded_by: "adrs/0007-successor-slug"
```

The value is a bundle-relative concept ID — the path minus its `.md` suffix —
checked against every document actually in the bundle (`R19`): it must resolve,
and it must not name the document itself. There is no `supersedes` counterpart;
that edge is derivable from `superseded_by` and a duplicated inverse would only
drift out of sync with it.

### `sources`

The OKF provenance field: what the concept was built from. Two shapes are
accepted, and a single list may mix them.

Shorthand — a bare URL string. This is what the deep-research pipeline emits,
one entry per cited source:

```yaml
sources:
  - "https://arxiv.org/abs/2604.05854"
  - "https://www.langchain.com/blog/deep-agents-v0-5"
```

OKF object form — `{id, resource, title}`, where only `resource` is load-bearing
for the validator. Use it when the source needs a stable citation key or a
human-readable name:

```yaml
sources:
  - id: "okf-spec"
    resource: "docs/references/okf-v0-2-format.md"
    title: "Open Knowledge Format (OKF) v0.2"
```

`R7` requires `sources` to be a list when present. `R8` checks each item: a
string must be non-empty, a mapping must have a non-empty `resource`. An empty
list (`sources: []`) is valid and is the right way to say "no external inputs" —
a decision record written from a conversation genuinely has none.

### `generated`

Who wrote the document, and when. Both subkeys are required on every
non-reserved document.

```yaml
generated:
  by: "agent:omp/claude-opus-5"
  at: "2026-08-21T13:45:00Z"
  run: "deep-research-verified/sdlc-methodology-selection"
```

- `by` must start with `agent:` or `human:`. The prefix comes from `agentId` in
  `.omp/okf-docs.json` (default `agent:omp`); a writing agent appends
  `/<its model id>` so the exact author is recoverable. A human author writes
  `human:<id>`.
- `at` must be an ISO 8601 timestamp **with an explicit zone** —
  `2026-08-21T13:45:00Z` or `2026-08-21T15:45:00+02:00`. A bare
  `2026-08-21T13:45:00` is rejected; so is a date-only value. Seconds and
  fractional seconds are optional.
- `run` is optional: an opaque identifier the producing workflow chooses, naming
  the run that produced this document. Useful for a multi-agent pipeline with
  several distinct authors across its stages — a scout, a verifier per source, a
  synthesist — where flattening to one `by` value would discard exactly the
  provenance trail the pipeline built. A consumer resolves `run` to a staging
  location on its own terms; the validator only checks it is non-empty when
  present.
- If the `generated` block is missing altogether, only `missing 'generated.by'`
  is reported; fix the block and re-run to surface anything else.

### `verified`

Who reviewed the document. This is the approval gate, and it is the one field an
agent must never write about itself.

```yaml
verified:
  by: "human:ibaou"
  at: "2026-08-21"
```

- `by` must start with `human:` (`R6`). `humanId` in `.omp/okf-docs.json` names
  the reviewer this project expects.
- `at` is a **project extension** — OKF v0.2 defines only `verified.by`. When
  present it must be exactly `YYYY-MM-DD` (`R6`), not a timestamp.
- Omit the whole `verified` key on a draft. An empty or absent `verified` on a
  `stable` document is the `R4` failure
  `status 'stable' requires a 'verified.by' human attribution`.

### `stale_after`

Absolute re-verification deadline, `YYYY-MM-DD` (`R14`). `staleAfterDays` in
`.omp/okf-docs.json` (180 here) is the horizon a scaffolding command uses to
compute it. Two behaviours worth knowing:

- A malformed value is always an error: `'stale_after' must be YYYY-MM-DD`.
- A **past** date is an error only when `status: stable` —
  `stale_after <date> has passed; re-verify or lower status`. That is
  deliberate: an expired `stable` document is actively misleading, while an
  expired draft is just old. Fix it by re-reviewing and moving `verified.at` and
  `stale_after` forward, or by dropping the status to `proposed` or
  `deprecated`.

### The Obsidian trio: `tags`, `aliases`, `cssclasses`

Obsidian v1.9+ dropped the singular forms (`tag`, `alias`, `cssclass`) and
requires all three to be YAML lists. `R7` enforces the list shape for all three
plus `sources`, reporting `'<field>' must be an array, not a scalar`. Tags omit
the `#` symbol. Emit `aliases` and `cssclasses` only when `obsidian` is `true`
in `.omp/okf-docs.json`; in a non-Obsidian bundle they are noise.

### Unknown keys

Extra keys are tolerated on purpose. OKF is a format-as-contract and requires
consumers to be tolerant of metadata they do not recognise, so the validator
never reports an unknown field. Add project-specific keys freely — but document
them here first, or the next author will not know whether the key means
anything.

## Attribution and approval policy

Three rules, and the validator enforces all three:

1. **`generated` records the author.** Every non-reserved document carries it.
   An agent writes its own `agent:<prefix>/<model-id>`; a human writes
   `human:<id>`.
2. **`verified` records the human reviewer, and only a human adds it.** An agent
   never writes `verified` for its own output — not even when confident, not
   even when the human asked for the document. Doing so forges an approval that
   never happened.
3. **`status: stable` without `verified.by` is rejected** (`R4`). This is why
   the gate has teeth: the only way to reach `stable` is for a human to attest.
   An agent that has finished a document sets `status: draft` (still working) or
   `status: proposed` (ready for review) and stops there.

Promotion is therefore a two-line human edit: add the `verified` block, change
`status` to `stable`, and re-run the validator on the file.

## Worked blocks, one per type

### `adr`

```yaml
---
type: "adr"
title: "ADR 0004: OKF Documentation Governance"
description:
  "Where the validator lives, what the approval gate is, and how the bundle is
  laid out"
status: "stable"
sources: []
tags:
  - "documentation"
  - "okf"
generated:
  by: "agent:omp/claude-opus-5"
  at: "2026-08-21T13:45:00Z"
verified:
  by: "human:ibaou"
  at: "2026-08-21"
aliases:
  - "ADR-0004"
cssclasses:
  - "clean-embeds"
---
```

Required `##` sections (`R13`): Status, Context, Decision, Consequences.

### `feature`

```yaml
---
type: "feature"
title: "FR 0002: okf-docs Skill"
description:
  "Requirements for the documentation-authoring skill and how each one was
  verified"
status: "proposed"
sources: []
tags:
  - "documentation"
  - "tooling"
generated:
  by: "agent:omp/claude-opus-5"
  at: "2026-08-21T14:10:00Z"
aliases:
  - "FR-0002"
---
```

Required `##` sections (`R13`): Status, Problem, Requirements. Note the absent
`verified` block: this document is `proposed`, awaiting review, so no approval
is asserted.

### `runbook`

```yaml
---
type: "runbook"
title: "Deep Research Pipeline"
description: "Run, monitor and resume the gated deep-research pipeline"
status: "stable"
sources: []
tags:
  - "runbook"
  - "deep-research"
generated:
  by: "agent:omp/claude-opus-5"
  at: "2026-08-21T14:20:00Z"
verified:
  by: "human:ibaou"
  at: "2026-08-21"
stale_after: "2027-02-17"
---
```

Required `##` sections (`R13`): Purpose, Preconditions, Procedure, Verification,
Failure modes. Runbooks are the type most worth dating — a procedure rots when
the tool it drives changes — so `stale_after` is set 180 days out per
`staleAfterDays`.

### `concept`

```yaml
---
type: "concept"
title: "Agentic Deep Research"
description:
  "Survey of autonomous deep-research methodologies, architectures and
  frameworks"
status: "draft"
sources:
  - "https://arxiv.org/abs/2604.05854"
  - id: "langchain-deep-agents"
    resource: "https://www.langchain.com/blog/deep-agents-v0-5"
    title: "Deep Agents v0.5"
tags:
  - "research"
  - "agents"
generated:
  by: "agent:omp/claude-sonnet-5"
  at: "2026-08-20T09:12:00Z"
---
```

No required sections. This is the shape a research report lands in: authored by
an agent, `status: draft`, every cited source listed, and no `verified` key —
the report has not been read by a human yet.

### `reference`

```yaml
---
type: "reference"
title: "OKF Docs Configuration Keys"
description:
  "The keys in .omp/okf-docs.json and the defaults that apply when the file is
  absent"
status: "stable"
resource: ".omp/okf-docs.json"
sources:
  - id: "okf-spec"
    resource: "docs/references/okf-v0-2-format.md"
    title: "Open Knowledge Format (OKF) v0.2"
tags:
  - "reference"
  - "okf"
generated:
  by: "human:ibaou"
  at: "2026-08-21T15:00:00Z"
verified:
  by: "human:ibaou"
  at: "2026-08-21"
---
```

No required sections. `resource` points at the asset the reference describes; a
reference page whose content _is_ the asset omits it.
