# Verb: verify

Record a human review. The arguments are the text following `verify` in the
invocation.

You are the recorder of a human review, not the reviewer. This command writes an
attestation someone else made — it never decides on its own that a document is
fine, and it never runs unless the user asked for it in this turn.

## 1. Parse the request into arguments

Form: `verify <paths…> | --all [--by human:id] [--date YYYY-MM-DD]`

| Argument            | Default                           | Meaning                                                                                                                                              |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<paths…>`          | —                                 | one or more bundle paths to approve                                                                                                                  |
| `--all`             | —                                 | every unverified and expired document; mutually exclusive with `<paths…>` — passing both is an error the script reports, not one to resolve yourself |
| `--by human:id`     | `humanId` in `.omp/okf-docs.json` | the reviewer's id; must match `human:...`                                                                                                            |
| `--date YYYY-MM-DD` | today, UTC                        | the review date                                                                                                                                      |

## 2. Run the review script

One `bash` call, from the repository root — that is where `.omp/okf-docs.json`
and `docs/log.md` resolve from. Explicit paths:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-review.ts approve docs/references/okf-v0-2-format.md
```

Or the whole backlog:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-review.ts approve --all
```

Add `--by`/`--date` only when the request supplied them.

## 3. Report the result verbatim

Reproduce the script's per-document lines (`✅` verified, `⏭` skipped, `❌`
refused) and its counts line exactly as printed. A non-zero exit is the result —
report it and stop; do not retry, and do not silently treat a skip or a refusal
as success.

## 4. What approval did to each verified file

State this explicitly for every `✅` line, so the user does not have to infer
it: the script wrote `verified.by` and `verified.at` into the document's
frontmatter, set `status: "stable"`, refreshed `stale_after`, and appended a
bullet to today's section of `docs/log.md`.

## Rules

- Only run this command when the user asked for it in this turn. Never verify a
  document on your own initiative, and never invent a `--by` value — omit the
  flag and let the script read `humanId`.
- When the script refuses a document, report the findings and stop — a refusal
  is final for this session. Do not fix the document and re-run `verify` on it
  in the same turn, even if the user's request was to review or approve a batch
  that included it; a fixed-then-immediately-reapproved document has had its
  repair reviewed by nobody, which is exactly what `verify` exists to prevent.
  Fixing a refused document is separate work — do it if asked, but re-verifying
  it needs its own explicit request in a later turn.
- Never hand-edit a `verified` block to get past a refusal.
- When the user asks what still needs review, that is the `pending` verb, not
  this one.

## Resolving the script paths

Resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s "Resolving
`$OKF_DOCS_HOME`" section. The scripts referenced above are
`$OKF_DOCS_HOME/scripts/okf-validate.ts` and
`$OKF_DOCS_HOME/scripts/okf-review.ts`.
