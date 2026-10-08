---
type: "adr"
title: "ADR __SLUG__: __TITLE__"
description: "__DESCRIPTION__"
status: "draft"
sources: []
tags:
  - "architecture"
  - "kebab-case-topic"
generated:
  by: "__AGENT_ID__"
  at: "__TIMESTAMP__"
# obsidian-block: drop these two keys when obsidian is disabled
aliases:
  - "ADR-__SLUG__"
cssclasses:
  - "clean-embeds"
---

# ADR **SLUG**: **TITLE**

## Status

State the current lifecycle value and nothing else: `draft` while it is being
written, `proposed` once it is up for review, `stable` once a human has approved
it, `superseded` when a later ADR replaces this one (set `superseded_by` in the
frontmatter and name that ADR here too), `deprecated` when the decision is
withdrawn outright. Keep this line equal to the `status` field in the
frontmatter. Promotion to `stable` additionally requires the `verified` block
naming a human reviewer and the date they approved it — a writing agent never
adds that block to its own document.

## Context

State the forces that made a decision necessary: the constraint, the
measurement, the incident, the deadline. Facts only — no options and no
recommendation. A reader who ends up disagreeing with the decision must still
accept every sentence in this section. Date-stamp anything that will age.

## Decision

One paragraph in the active voice and present tense: "We do X." Then the
specifics — what changes, what the rule now is, and where it applies. Close by
naming each alternative that was seriously considered and the single reason it
lost; an alternative dismissed without a reason will be relitigated within the
year.

## Consequences

Both directions, honestly. What this buys: the capability gained, the code
deleted, the class of failure now impossible. What it costs: the migration work,
the new constraint on future changes, the thing that just got harder, the risk
accepted. An ADR whose consequences are all positive has not been thought
through — find the cost and write it down.
