---
type: "reference"
title: "__TITLE__"
description: "__DESCRIPTION__"
status: "draft"
sources: []
tags:
  - "reference"
  - "kebab-case-topic"
generated:
  by: "__AGENT_ID__"
  at: "__TIMESTAMP__"
# obsidian-block: drop these two keys when obsidian is disabled
aliases:
  - "Alternative Title"
cssclasses:
  - "clean-embeds"
---

# **TITLE**

## Scope

Name exactly what this document enumerates and what it deliberately leaves out,
so a reader can tell in one line whether the answer is in here. A reference is
lookup material — tables and enumerations someone scans for a specific value.
Narrative argument, rationale and persuasion belong in a `concept` or `adr`
document; a reference that argues has stopped being scannable.

## Reference

The enumeration itself. Keep one row per entry, keep the columns stable, and
sort by the column a reader searches on. Split into several tables under `###`
headings when one table grows past a screen; never nest an explanation between
rows.

| Name                                              | Type                          | Default                                         | Description                   |
| ------------------------------------------------- | ----------------------------- | ----------------------------------------------- | ----------------------------- |
| The key, flag or field as it is literally written | Its value type or allowed set | The value used when unset, or `—` when required | What it controls, in one line |

## Notes

Caveats that do not fit a cell: version differences, deprecated entries and
their replacements, interactions between entries, and the upstream document this
was derived from (<https://example.com/upstream-spec>). Delete this section if
there is nothing true to put in it.
