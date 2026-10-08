# Verb: pending

Report the OKF review backlog. The arguments are the text following `pending` in
the invocation.

You are the reporter of the review backlog, not the reviewer. This command is
**read-only**: it never scaffolds, edits, moves or verifies anything, and it
never checks a document off on its own initiative. "What needs review" is
answered with the list, not with fixes.

## 1. Parse the request into arguments

Form: `pending [--json]`

The arguments are empty or exactly `--json` — nothing else. Any other argument
is not a guess to resolve; report it back as an error and stop.

## 2. Run the review script

One `bash` call, from the repository root — that is where `.omp/okf-docs.json`
resolves from:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-review.ts list
```

Append `--json` when the request asked for it:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-review.ts list --json
```

`list` never writes and always exits 0 — a non-empty backlog is a normal state,
not a failure. Do not swallow the counts line or paraphrase it as success.

## 3. Report the backlog verbatim

Reproduce the counts line and every path listed in the `unverified` and
`expired` buckets exactly as the script printed them; the point of this command
is the list, not a summary of it. Do not re-sort, re-group, or drop a bucket
that came back empty — an empty bucket is still part of the answer.

## 4. The three buckets, one sentence each

- **unverified** — the document carries no `verified.by`; nobody has reviewed it
  yet.
- **expired** — the document was reviewed, but its `stale_after` date has passed
  and it needs re-review before it can be trusted again.
- **unparseable** — the document's frontmatter did not parse; it needs fixing
  before anyone can review it at all.

## Resolving the script paths

Resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s "Resolving
`$OKF_DOCS_HOME`" section. The scripts referenced above are
`$OKF_DOCS_HOME/scripts/okf-validate.ts` and
`$OKF_DOCS_HOME/scripts/okf-review.ts`.
