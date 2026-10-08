---
type: "feature"
title: "FR __SLUG__: __TITLE__"
description: "__DESCRIPTION__"
status: "draft"
sources: []
tags:
  - "feature-request"
  - "kebab-case-topic"
generated:
  by: "__AGENT_ID__"
  at: "__TIMESTAMP__"
# obsidian-block: drop these two keys when obsidian is disabled
aliases:
  - "FR-__SLUG__"
cssclasses:
  - "clean-embeds"
---

# FR **SLUG**: **TITLE**

## Status

State the current lifecycle value and nothing else: `draft` while it is being
written, `proposed` once it is up for review, `stable` once the feature is
delivered and a human has confirmed it, `superseded` when a later request
replaces it, `deprecated` when it is dropped. Keep this line equal to the
`status` field in the frontmatter, and remember that `stable` additionally
requires the `verified` block naming the human who checked the delivered
behaviour.

## Problem

Describe the gap in terms of observed behaviour and its cost: what breaks or is
missing, how often, who pays for it, and what the current workaround is. Do not
describe the solution here — a problem statement that already names an
implementation is a solution hunting for a justification.

## Requirements

One row per requirement, each an observable behaviour rather than an
implementation detail, each paired with the check that proves it. A requirement
with no stated verification is a wish. Number them if later documents need to
cite them.

| Requirement                                                          | Verification                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| The system MUST … (one testable behaviour, no implementation detail) | The command, test or observation that proves it, plus the expected result |
