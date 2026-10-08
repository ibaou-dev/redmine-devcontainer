---
type: "runbook"
title: "__TITLE__"
description: "__DESCRIPTION__"
status: "draft"
sources: []
tags:
  - "runbook"
  - "kebab-case-topic"
generated:
  by: "__AGENT_ID__"
  at: "__TIMESTAMP__"
# obsidian-block: drop these two keys when obsidian is disabled
aliases:
  - "Alternative name an operator would search for"
cssclasses:
  - "clean-embeds"
---

# **TITLE**

## Purpose

One sentence naming what this procedure accomplishes, followed by the trigger
that sends an operator here — the alert, the request, the schedule. Explanation
of how the system works belongs in a `concept` document; this document only
tells someone what to do.

## Preconditions

Everything that must already be true before step 1: access and credentials, the
working directory, required tools and their versions, the state the system must
be in. Every line is checkable — an operator can answer yes or no without
judgement.

- Repository checked out at the revision under operation, with dependencies
  installed.
- Replace this list; delete any precondition the procedure does not actually
  depend on.

## Procedure

Numbered steps in execution order, one action per step, with the real command
rather than a description of it. Each step states the output that means it
worked, so the operator can stop at the first divergence instead of at the end.

1. Do the first thing.

   ```bash
   command --flag value
   ```

   Expect: the observable result that means this step succeeded.

2. Do the next thing. Where a step is destructive or irreversible, say so in the
   step itself and name what to capture first.

## Verification

Prove the procedure worked from outside the procedure: the command to run, the
value to read, the page to load. State the expected output exactly — "it looks
fine" is not verification.

```bash
command --check
```

## Failure modes

Every row is something that has actually gone wrong or plausibly will. Recovery
is an action, not a suggestion to investigate.

| Symptom                                         | Cause          | Recovery                                            |
| ----------------------------------------------- | -------------- | --------------------------------------------------- |
| What the operator sees, verbatim where possible | Why it happens | The corrective action, or the person to escalate to |
