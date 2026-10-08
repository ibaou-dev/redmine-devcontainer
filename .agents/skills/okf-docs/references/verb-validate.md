# Verb: validate

Validate the OKF documentation. The arguments are the text following `validate`
in the invocation.

You are the reporter, not the fixer. This command is **read-only**: it never
edits a file, never creates one, and never stages or deletes anything. If the
findings need fixing, say so and stop — fixing is a separate, explicitly
requested job.

## 1. Parse the request into targets

Form: `validate [paths…]`

Everything that is not a flag is a path. With no paths, the whole bundle is
validated: every `*.md` under `bundleRoot` plus the bundle-level reserved-file
checks (the root `index.md` and `log.md` must exist). With paths, only those
files are checked and the bundle-level checks are skipped. Non-`.md` arguments
are ignored by the validator, so a directory argument checks nothing — expand it
to files first.

| Flag           | Meaning                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bundle DIR` | override the configured `bundleRoot`                                                                                                           |
| `--draft`      | skip the position rules (R11 depth, R16 folder map) for a document not yet placed in the bundle, e.g. a pipeline checkpoint under `.raw/runs/` |
| `--json`       | emit `{"ok": bool, "errors": [{"path", "rule", "message"}]}` instead of the text report                                                        |

Files under a `templates/` directory are validated in template mode
automatically: position rules are skipped and `__PLACEHOLDER__` tokens satisfy
any format rule.

## 2. Run the validator

One `bash` call. Whole bundle:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts
```

Specific files:

```bash
bun run $OKF_DOCS_HOME/scripts/okf-validate.ts docs/adrs/0004-okf-documentation-governance.md docs/log.md
```

Run it from the repository root, the way pre-commit does — that is where the
`yaml` dependency and `.omp/okf-docs.json` resolve from. Do not swallow a
non-zero exit: it is the result, not an error.

Text output is `✅ <path>` per clean file and `❌ <path>: <rule> — <message>`
per finding. Exit code is 1 when there is any finding, 0 otherwise. Use `--json`
when you need to count or filter findings rather than read them.

## 3. Report the findings

Group findings by file, in the validator's own order. For each finding give the
rule id, the message verbatim, and one line saying how to fix it — take that fix
line from `skill://okf-docs/references/validation.md`, which documents every
rule id, its exact message and its remedy. Do not paraphrase a rule from memory;
read the reference.

```text
docs/adrs/0004-okf-documentation-governance.md
  R4  status 'stable' requires a 'verified.by' human attribution
      Add the verified block after a human review, or drop the status to proposed.
  R13 type 'adr' requires a '## Consequences' section
      Add the missing section; the four adr sections are Status, Context, Decision, Consequences.

exit code: 1 — 2 findings across 1 file
```

Close with the counts and the exit code. Then state what a human has to decide,
if anything: R4 and R14 findings are approval questions, not formatting ones —
no agent can clear them by editing, only a human review can. Everything else is
a document defect.

Clean run: report the file count and `exit code: 0`, and say nothing else. Do
not volunteer edits, improvements or restructuring — that was not the request.

## Resolving the validator path

Resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s "Resolving
`$OKF_DOCS_HOME`" section, then invoke `$OKF_DOCS_HOME/scripts/okf-validate.ts`.
