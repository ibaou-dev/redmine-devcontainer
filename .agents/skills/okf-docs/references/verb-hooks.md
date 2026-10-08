# Verb: hooks

Install the OKF v0.2 validator as a pre-commit check in this repository. The
arguments are the text following `hooks` in the invocation.

This is a repository-tooling action, not a bundle change: it never touches
`docs/`, never writes a `log.md` entry, and it never overrides a hook mechanism
this repository already uses for something else.

## 1. Parse the request into arguments

Form: `hooks`

No arguments today. Any argument after `hooks` is not a guess to resolve; report
it back as an error and stop.

## 2. Run the installer

One `bash` call, from the repository root:

```bash
bun run $OKF_DOCS_HOME/scripts/install-hooks.ts
```

The script detects, in order, the Python `pre-commit` framework
(`.pre-commit-config.yaml`), Husky (`.husky/` or a `husky` dependency), an
already-configured native git hooks directory, or nothing — in which case it
bootstraps a plain `.githooks/` directory and wires `package.json`'s `prepare`
script (when one exists) so the hook activates on every future `bun install`
with no further manual step. It only ever adds to what is there; it does not
rewrite, reformat, or remove any hook it did not add itself, and running it
twice is a no-op the second time.

## 3. Report what happened, exactly

The script prints one line starting `OKF pre-commit hook: ` describing what it
did (or that it was already installed). Reproduce that line. Do not paraphrase
"installed" as "done" without saying where, and do not claim the hook is active
if the script reported that a tool it needed (for example the `pre-commit`
binary itself) was missing — reproduce that caveat too.

## 4. An unrecognised mechanism is not a failure to fix

If the script detects a hook manager it does not support (for example Lefthook
or Overcommit), it exits with status 2 and prints the exact command to add by
hand plus a pointer to that tool's own documentation. Relay that message
verbatim. Do not attempt to work around it by installing a second, competing
hook mechanism into the same repository — that is exactly the outcome this verb
exists to avoid.

## Resolving the script path

Resolve `$OKF_DOCS_HOME` per `skill://okf-docs/SKILL.md`'s "Resolving
`$OKF_DOCS_HOME`" section. The script referenced above is
`$OKF_DOCS_HOME/scripts/install-hooks.ts`.
