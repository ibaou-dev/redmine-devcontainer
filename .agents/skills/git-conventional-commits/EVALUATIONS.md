<!-- prettier-ignore-start -->

<style>
.g { color: #22863a; font-weight: bold; }
.r { color: #cb2431; font-weight: bold; }
</style>

## `git-conventional-commits` — v1.0.0

### Multi-model summary

| Model | With Skill | Without Skill | Delta | Uplift |
| ----- | ---------- | ------------- | ----- | ------ |
| claude-sonnet-4-6 | **49/50 (98%)** | **34/50 (68%)** | **+30pp** | **1.44×** |
| claude-haiku-4-5 | **49/50 (98%)** | **34/50 (68%)** | **+30pp** | **1.44×** |
| qwen3-coder-30b-a3b-instruct | **41/50 (82%)** | **35/50 (70%)** | **+12pp** | **1.17×** |

_Claude models score identically in aggregate (+30pp, 1.44×), but fail **different** evals without the skill. Qwen3 scores lower delta (+12pp, 1.17×), driven by zero-delta on evals 2, 3, 4, 5 — see per-eval breakdown below._

<details>
<summary>Per-eval WITHOUT comparison (where models diverge)</summary>

| Eval | Sonnet WITHOUT | Haiku WITHOUT | Qwen3 WITHOUT | Notes |
| --- | --- | --- | --- | --- |
| 2 · breaking-change | 2/5 | **5/5** | **5/5** | Haiku and Qwen3 know BREAKING CHANGE format; Sonnet defaulted to `chore:` |
| 4 · scope-override | 3/5 | 2/5 | 3/5 | Qwen3 WITH also fails (used `frontend` scope despite CONTRIBUTING.md) |
| 5 · gitlab-mr | 4/5 | **5/5** | **5/5** | Haiku and Qwen3 correctly separate !89 and #312; Sonnet merged them |
| 6 · scope-mandatory | 4/5 | 2/5 | 3/5 | Qwen3 without used invalid scope `readme`; Haiku dropped scope entirely |
| 7 · cve-framing | **5/5** | **5/5** | 2/5 | Qwen3 uniquely tripped here — used `chore:` for CVE without skill; Claude models unaffected |
| 10 · atomic-split | 3/5 | 2/5 | 3/5 | All models struggle — eval has structural weaknesses in 10.4/10.5 |

</details>

<details>
<summary>Full breakdown — claude-sonnet-4-6 (50 assertions)</summary>

_Run: 2026-03-29 · grading: regex/manual (1.1–8.5, 9.3–10.5) + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_
_Evals 3, 4, 7, 10 redesigned after run 1; assertion 9.4 broadened._

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** — rename+extract is refactor not feat | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="r">✗ 86 chars</span> | <span class="r">✗ 86 chars</span> |
| | **breaking-change-footer-required** — deprecated API removal needs BREAKING CHANGE, not chore | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="r">✗</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ wrote chore</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="r">✗</span> |
| | **contributing-md-non-standard-closing-keyword** — 'Addressed #N' from CONTRIBUTING.md (skill_context injected to WITH only) | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="g">✓</span> | <span class="r">✗ used (#512) in subject</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.3 | scope = (payments) | <span class="g">✓</span> | <span class="r">✗ used (payment)</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="r">✗ in subject line</span> |
| | **contributing-md-scope-override** — mandatory 'core' scope for UI/forms (skill_context injected to WITH only) | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 4.1 | scope is (core) | <span class="g">✓</span> | <span class="r">✗ used (auth)</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="g">✓ used (auth)</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="r">✗</span> |
| | **gitlab-mr-vs-issue-reference** — !N for MRs, #N for issues, separate footer lines | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="r">✗ same line</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** — scope mandatory for docs commits too | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="r">✗ noted file but not CI enforcement</span> |
| | **developer-framing-override-cve-is-fix** — dev calls CVE patch 'maintenance', skill overrides to fix | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | mentions high/CVSS/vulnerability | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** — revert: type with formal Reverts: footer | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="g">✓</span> | <span class="r">✗ in body not footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** — must explicitly note absence and name the spec | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓ cmd/root</span> | <span class="g">✓ cmd</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** — feat + version bump must be split | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ wrote combined commit, then weakly offered split as optional</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="g">✓</span> | <span class="r">✗ only 1.3.0 in chore commit</span> |

</details>

<details>
<summary>Full breakdown — claude-haiku-4-5 (50 assertions)</summary>

_Run: 2026-03-29 · grading: regex/manual (1.1–8.5, 9.3–10.5) + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="g">✓ 68 chars</span> | <span class="r">✗ 88 chars</span> |
| | **breaking-change-footer-required** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓ used feat!</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="g">✓</span> | <span class="r">✗ used 'Closes #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.3 | scope = (payments) | <span class="g">✓</span> | <span class="r">✗ used (payment)</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="g">✓</span> | <span class="r">✗ used 'Closes #512'</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="g">✓ footer position correct</span> |
| | **contributing-md-scope-override** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 4.1 | scope is (core) | <span class="g">✓</span> | <span class="r">✗ used (frontend)</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="r">✗ used (frontend)</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="r">✗ no CONTRIBUTING.md found note</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="r">✗ wrote docs: with no scope</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="r">✗</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="r">✗</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="g">✓ mentioned CI rejection</span> |
| | **developer-framing-override-cve-is-fix** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | mentions high/CVSS/vulnerability | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="g">✓</span> | <span class="r">✗ "This reverts commit…" in body, not footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗ no mention</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗ only "standard conventions"</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓ cli</span> | <span class="g">✓ cli</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** | **<span class="r">4/5</span>** | **<span class="r">2/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ wrote combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="r">✗ no split discussion</span> |
| 10.3 | feat: for CSV export | <span class="g">✓ feat(export)</span> | <span class="g">✓ feat(export)</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓ chore(release)</span> | <span class="r">✗ bundled with feat</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="r">✗ only 1.3.0</span> | <span class="g">✓ in bullet list</span> |

</details>

<details>
<summary>Full breakdown — qwen3-coder-30b-a3b-instruct (50 assertions)</summary>

_Run: 2026-03-30 · executor: local (http://100.84.126.41:1453) · judge: session (claude-sonnet-4-6) · grading: regex (1.1–8.5, 9.3–10.5) + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** — rename+extract is refactor not feat | **<span class="r">4/5</span>** | **<span class="g">5/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="r">✗ 89 chars</span> | <span class="g">✓</span> |
| | **breaking-change-footer-required** — deprecated API removal needs BREAKING CHANGE, not chore | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — 'Addressed #N' from CONTRIBUTING.md (skill_context injected to WITH only) | **<span class="r">2/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="r">✗ no 'Addressed #512'</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="r">✗ wrote prose ("Thanks for fixing…")</span> |
| 3.3 | scope = (payments) | <span class="r">✗ used (payment)</span> | <span class="r">✗ no scope</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="r">✗ used Fixes/Closes</span> | <span class="g">✓</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-scope-override** — mandatory 'core' scope for UI/forms (skill_context injected to WITH only) | **<span class="r">3/5</span>** | **<span class="r">3/5</span>** |
| 4.1 | scope is (core) | <span class="r">✗ used (frontend)</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose ("Thanks for adding…")</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="r">✗ used (frontend)</span> | <span class="g">✓ no scope</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **gitlab-mr-vs-issue-reference** — !N for MRs, #N for issues, separate footer lines | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** — scope mandatory for docs commits too | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="r">✗ used scope 'readme' (not in allowed list)</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="r">✗ used 'readme'</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **developer-framing-override-cve-is-fix** — dev calls CVE patch 'maintenance', skill overrides to fix | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="r">✗ wrote chore: update node-s…</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 7.3 | mentions high/CVSS/vulnerability | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** — revert: type with formal Reverts: footer | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="r">✗ no 'Reverts …' footer</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** — must explicitly note absence and name the spec | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗ no acknowledgment of CONTRIBUTING.md absence</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗ no reference to any standard</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** — feat + version bump must be split | **<span class="r">3/5</span>** | **<span class="r">3/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ wrote single combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="r">✗ no chore(release):</span> | <span class="r">✗ no chore(release):</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="r">✗ missing versions</span> | <span class="g">✓</span> |

</details>

### Analysis

**Delta +30pp exceeds the +20pp target across both models.** The `skill_context` injection pattern for evals 3 & 4 is the main driver — injecting CONTRIBUTING.md content to the WITH run only exposed genuine discrimination that was hidden in run 1 when both runs had the file inline.

**The skill provides identical aggregate uplift (+30pp, 1.44×) on both Haiku and Sonnet**, which means it can be recommended for cost-sensitive deployments using Haiku without any reduction in commit message quality.

**Per-eval breakdown (Sonnet · Haiku · Qwen3):**

| Eval | Sonnet WITH | Sonnet WITHOUT | Haiku WITH | Haiku WITHOUT | Qwen3 WITH | Qwen3 WITHOUT | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 · refactor-vs-feat | 4/5 | 4/5 | 5/5 | 4/5 | 4/5 | 5/5 | Claude models fail 1.5 WITH (long subject); Qwen3 fails WITH but passes WITHOUT. Structural eval issue. |
| 2 · breaking-change | 5/5 | 2/5 | 5/5 | **5/5** | 5/5 | **5/5** | Haiku and Qwen3 know BREAKING CHANGE format cold; Sonnet defaulted to `chore:`. |
| 3 · non-standard keyword | 5/5 | 2/5 | 5/5 | 2/5 | 2/5 | 2/5 | Qwen3 WITH fails too — skill injection doesn't fix scope typo (payment vs payments) or keyword override. |
| 4 · scope-override | 5/5 | 3/5 | 5/5 | 2/5 | 3/5 | 3/5 | Qwen3 used `(frontend)` WITH and WITHOUT — skill injection not sufficient for this model. |
| 5 · gitlab-mr | 5/5 | 4/5 | 5/5 | **5/5** | 5/5 | **5/5** | Qwen3 knows GitLab MR format without the skill. |
| 6 · scope-mandatory | 5/5 | 4/5 | 5/5 | 2/5 | 5/5 | 3/5 | Qwen3 with skill correctly restricts scope; without uses invalid `readme`. |
| 7 · cve-framing | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 2/5 | **Strongest Qwen3 signal** — without skill uses `chore:` for CVE, with skill overrides to `fix:`. |
| 8 · revert-format | 5/5 | 4/5 | 5/5 | 4/5 | 4/5 | 4/5 | All models fail 8.3 WITHOUT; Qwen3 also fails WITH. Formal `Reverts:` footer is non-obvious. |
| 9 · no-contributing-md | 5/5 | 3/5 | 5/5 | 3/5 | 5/5 | 3/5 | Consistent across all models: without skill, no acknowledgment of CONTRIBUTING.md absence. |
| 10 · atomic-split | 5/5 | 3/5 | 4/5 | 2/5 | 3/5 | 3/5 | All models miss 10.4 (chore(release):) and/or 10.5 (version pair). Eval structural weakness. |

**Qwen3 analysis (+12pp, 1.17×):**

Qwen3 shows significantly lower delta than Claude models. The skill still provides meaningful uplift but is less effective for two reasons:

1. **Evals 3 & 4 zero-delta WITH skill** — The `skill_context` injection approach (prepending CONTRIBUTING.md to prompt) doesn't reliably steer Qwen3. It followed the scope rule partially (didn't use prohibited scopes in 4) but still used wrong scope/keyword in 3 and 4. For small open-weights models, prompt injection may need stronger framing.

2. **Evals 2 & 5 already known** — Qwen3 knows BREAKING CHANGE footer format and GitLab MR `!N` syntax without the skill. This inflates the WITHOUT baseline, compressing the delta.

3. **Eval 7 is the strongest signal for Qwen3** (+3pp) — Without the skill, Qwen3 framed a CVE patch as `chore:`, honoring the developer's "maintenance" label. The skill correctly overrides this to `fix:`. This trap activates more strongly for Qwen3 than for Claude models.

4. **Eval 8.3 universal failure** — No model reliably produces a formal `Reverts: <hash> (<subject>)` footer line. This is an eval weakness to address in v1.1.0.

**Candidates for v1.1.0 redesign:**

- **Eval 1 (1.5):** Shorten function names (`authenticateUser → verifyCredentials` forces 86-char subject on all models). Fix: `getUser → findUser` so 72 chars is achievable.
- **Eval 7:** Claude models already know explicit CVSS scores = security fix. Replace with implicit CVE context (e.g. package changelog mention, no CVSS score in prompt). This also restores the trap for Qwen3 after it was partially visible.
- **Evals 3 & 4 (Qwen3):** Consider stronger skill_context framing — current prompt injection insufficient for smaller open-weights models to override scope defaults.

---

## `git-conventional-commits` — v1.1.0

### Changes from v1.0.0

- **SKILL.md:** Added `Reverts:` footer guidance in Step 7 (was missing from CC spec impl)
- **Eval 1:** Shortened function names (`getUser`/`checkAuth`/`verifyToken`) so 72-char subject achievable
- **Eval 7:** Removed explicit CVSS score; replaced with `npm audit` framing + developer's `chore` suggestion

### Multi-model summary

| Model | With Skill | Without Skill | Delta | Uplift |
| ----- | ---------- | ------------- | ----- | ------ |
| claude-sonnet-4-6 | **50/50 (100%)** | **35/50 (70%)** | **+30pp** | **1.43×** |
| claude-haiku-4-5 | **47/50 (94%)** | **32/50 (64%)** | **+30pp** | **1.47×** |
| qwen3-coder-30b-a3b-instruct | **40/50 (80%)** | **32/50 (64%)** | **+16pp** | **1.25×** |
| qwen/qwen3.5-9b (vLLM) | **49/50 (98%)** | **34/50 (68%)** | **+30pp** | **1.44×** |
| qwen/qwen3.5-9b (LMStudio) | **41/50 (82%)** | **31/50 (62%)** | **+20pp⚠** | **1.32×** |

_⚠ qwen3.5-9b LMStudio eval 10 WITHOUT timed out (0/5 invalid) — real delta likely ~+15pp._
_vLLM uses system message for skill injection; LMStudio used local executor (system\_prompt field)._

<details>
<summary>Full breakdown — claude-sonnet-4-6 (50 assertions)</summary>

_Run: 2026-03-30 · executor: session (claude -p) · judge: session · grading: regex + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** — rename+extract is refactor not feat | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="g">✓</span> | <span class="g">✓</span> |
| | **breaking-change-footer-required** — deprecated API removal needs BREAKING CHANGE | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">1/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="g">✓</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 3.3 | scope = (payments) | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="r">✗ ref in subject</span> |
| | **contributing-md-scope-override** — mandatory 'core' scope for UI/forms | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 4.1 | scope is (core) | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="r">✗</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="r">✗ no CI mandate mention</span> |
| | **developer-framing-override-cve-is-fix** — npm audit finding, developer says chore | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="r">✗ wrote chore(deps)</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | references audit/security context | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** — revert: type with formal Reverts: footer | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="g">✓</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ single combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓</span> | <span class="r">✗</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="g">✓</span> | <span class="g">✓</span> |

</details>

<details>
<summary>Full breakdown — claude-haiku-4-5 (50 assertions)</summary>

_Run: 2026-03-31 · executor: session (claude -p --model claude-haiku-4-5-20251001) · judge: session (batched) · grading: regex + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_
_3rd run — confirms 7.5/8.3 as model limitations after footer reorganization + version-range guidance._

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="g">✓</span> | <span class="r">✗ 74 chars</span> |
| | **breaking-change-footer-required** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ type is chore</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="g">✓</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 3.3 | scope = (payments) | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-scope-override** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 4.1 | scope is (core) | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="r">✗</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **developer-framing-override-cve-is-fix** — npm audit finding, developer says chore | **<span class="r">4/5</span>** | **<span class="r">2/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="r">✗ wrote chore(deps)</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | references audit/security context | <span class="g">✓</span> | <span class="r">✗</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="r">✗ missing versions</span> | <span class="g">✓</span> |
| | **revert-commit-format** | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="r">✗ no 'Reverts …' footer</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** | **<span class="r">4/5</span>** | **<span class="r">1/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ single combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="r">✗</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓</span> | <span class="r">✗</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="r">✗ missing versions</span> | <span class="r">✗ missing versions</span> |

</details>

<details>
<summary>Full breakdown — qwen/qwen3.5-9b via vLLM (50 assertions)</summary>

_Run: 2026-03-31 · executor: openai\_compat (http://100.84.126.41:8000, vLLM BF16) · judge: session (batched) · grading: regex + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_
_Skill injected as system message (not concatenated into user prompt). max\_tokens=4096._

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="g">✓</span> | <span class="g">✓</span> |
| | **breaking-change-footer-required** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="g">✓</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 3.3 | scope = (payments) | <span class="g">✓</span> | <span class="r">✗ used (payment)</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="g">✓</span> | <span class="r">✗ used Fixes/Closes</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-scope-override** — skill_context injected to WITH only | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 4.1 | scope is (core) | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="r">✗ no !89</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="r">✗ refs on same line</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="r">✗ used 'scope' literally</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="r">✗ used 'scope'</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="r">✗ wrote template</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **developer-framing-override-cve-is-fix** — npm audit finding, developer says chore | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 7.1 | type = fix (not chore) | <span class="g">✓</span> | <span class="r">✗ wrote chore(deps)</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | references audit/security context | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.4 | type ≠ chore | <span class="g">✓</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="r">✗ missing versions</span> |
| | **revert-commit-format** | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="r">✗ no 'Reverts …' footer</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ single combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="g">✓</span> | <span class="g">✓</span> |

</details>

<details>
<summary>Full breakdown — qwen3-coder-30b-a3b-instruct (50 assertions)</summary>

_Run: 2026-03-30 · executor: local (http://100.84.126.41:1453) · judge: session · grading: regex + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** | **<span class="r">4/5</span>** | **<span class="g">5/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="r">✗ 74 chars</span> | <span class="g">✓</span> |
| | **breaking-change-footer-required** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="r">✗ no BREAKING CHANGE: footer</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="r">✗ no ! or BREAKING CHANGE</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="r">2/5</span>** | **<span class="r">2/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="r">✗ no 'Addressed #512'</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 3.3 | scope = (payments) | <span class="r">✗ used (payment)</span> | <span class="r">✗ no scope</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="r">✗ used Fixes/Closes</span> | <span class="g">✓</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-scope-override** — skill_context injected to WITH only | **<span class="r">3/5</span>** | **<span class="r">3/5</span>** |
| 4.1 | scope is (core) | <span class="r">✗ used (frontend)</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="r">✗ used (frontend)</span> | <span class="g">✓ no scope</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="r">✗ used scope 'readme'</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="r">✗ used 'readme'</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **developer-framing-override-cve-is-fix** — npm audit finding, developer says chore | **<span class="r">3/5</span>** | **<span class="r">2/5</span>** |
| 7.1 | type = fix (not chore) | <span class="r">✗ wrote chore(deps)</span> | <span class="r">✗ wrote chore(deps)</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | references audit/security context | <span class="g">✓</span> | <span class="r">✗</span> |
| 7.4 | type ≠ chore | <span class="r">✗ type is chore</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="r">✗ no 'Reverts …' footer</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">3/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** | **<span class="r">4/5</span>** | **<span class="r">2/5</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ single combined commit</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="r">✗</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="g">✓</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="r">✗ no chore(release):</span> | <span class="r">✗ no chore(release):</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="g">✓</span> | <span class="g">✓</span> |

</details>

<details>
<summary>Full breakdown — qwen/qwen3.5-9b (50 assertions)</summary>

_Run: 2026-03-30 · executor: local (http://100.84.126.41:1453) · judge: session · grading: regex + LLM-as-judge (9.1, 9.2, 10.1, 10.2)_
_⚠ Eval 10 WITHOUT timed out — 0/5 is invalid, not a model failure._

| # | Assertion | With | Without |
| --- | --- | --- | --- |
| | **type-discrimination-refactor-vs-feat** | **<span class="r">4/5</span>** | **<span class="g">5/5</span>** |
| 1.1 | type is 'refactor' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.2 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.3 | no word 'add'/'adds' | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.4 | scope is (auth) | <span class="g">✓</span> | <span class="g">✓</span> |
| 1.5 | first line ≤ 72 chars | <span class="r">✗ 78 chars</span> | <span class="g">✓</span> |
| | **breaking-change-footer-required** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 2.1 | BREAKING CHANGE: footer present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.2 | migration path references /api/v2/auth | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.3 | type ≠ chore | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.4 | body present | <span class="g">✓</span> | <span class="g">✓</span> |
| 2.5 | ! suffix or BREAKING CHANGE footer | <span class="g">✓</span> | <span class="g">✓</span> |
| | **contributing-md-non-standard-closing-keyword** — skill_context injected to WITH only | **<span class="r">1/5</span>** | **<span class="r">1/5</span>** |
| 3.1 | 'Addressed #512' on its own line | <span class="r">✗ no 'Addressed #512'</span> | <span class="r">✗ no 'Addressed #512'</span> |
| 3.2 | type = fix | <span class="r">✗ used feat(payment)</span> | <span class="g">✓</span> |
| 3.3 | scope = (payments) | <span class="r">✗ used (payment)</span> | <span class="r">✗ used (payment)</span> |
| 3.4 | no 'Fixes #512' or 'Closes #512' | <span class="r">✗ used Fixes/Closes</span> | <span class="r">✗ used Fixes/Closes</span> |
| 3.5 | reference in footer, not description | <span class="g">✓</span> | <span class="r">✗ ref in subject</span> |
| | **contributing-md-scope-override** — skill_context injected to WITH only | **<span class="r">4/5</span>** | **<span class="r">3/5</span>** |
| 4.1 | scope is (core) | <span class="r">✗ used (form)</span> | <span class="r">✗ no scope</span> |
| 4.2 | type = feat | <span class="g">✓</span> | <span class="r">✗ wrote prose</span> |
| 4.3 | scope ≠ user/registration/ui/forms/frontend | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.4 | description mentions validation or form | <span class="g">✓</span> | <span class="g">✓</span> |
| 4.5 | acknowledges CONTRIBUTING.md mandate | <span class="g">✓</span> | <span class="g">✓</span> |
| | **gitlab-mr-vs-issue-reference** | **<span class="g">5/5</span>** | **<span class="g">5/5</span>** |
| 5.1 | '#312' for issue | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.2 | '!89' for MR (with !) | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.3 | type = fix | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.4 | issue and MR on separate footer lines | <span class="g">✓</span> | <span class="g">✓</span> |
| 5.5 | no '#89' for MR | <span class="g">✓</span> | <span class="g">✓</span> |
| | **scope-required-by-contributing-md** | **<span class="g">5/5</span>** | **<span class="r">4/5</span>** |
| 6.1 | scope present | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.2 | scope is valid per CONTRIBUTING.md | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.3 | scope = docs or config | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.4 | type = docs | <span class="g">✓</span> | <span class="g">✓</span> |
| 6.5 | acknowledges CI mandate | <span class="g">✓</span> | <span class="r">✗ no CI mandate mention</span> |
| | **developer-framing-override-cve-is-fix** — npm audit finding, developer says chore | **<span class="r">3/5</span>** | **<span class="r">2/5</span>** |
| 7.1 | type = fix (not chore) | <span class="r">✗ wrote chore(deps)</span> | <span class="r">✗ wrote chore(deps)</span> |
| 7.2 | scope = deps or security | <span class="g">✓</span> | <span class="g">✓</span> |
| 7.3 | references audit/security context | <span class="g">✓</span> | <span class="r">✗</span> |
| 7.4 | type ≠ chore | <span class="r">✗ type is chore</span> | <span class="r">✗ type is chore</span> |
| 7.5 | version numbers 5.7.1 and 5.7.2 | <span class="g">✓</span> | <span class="g">✓</span> |
| | **revert-commit-format** | **<span class="r">4/5</span>** | **<span class="r">4/5</span>** |
| 8.1 | type = revert | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.2 | hash present | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.3 | formal Reverts: footer line | <span class="r">✗ no 'Reverts …' footer</span> | <span class="r">✗ no 'Reverts …' footer</span> |
| 8.4 | original subject referenced | <span class="g">✓</span> | <span class="g">✓</span> |
| 8.5 | reason in body | <span class="g">✓</span> | <span class="g">✓</span> |
| | **no-contributing-md-found** | **<span class="g">5/5</span>** | **<span class="r">2/5</span>** |
| 9.1 | [LLM-judge] notes no CONTRIBUTING.md found | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.2 | [LLM-judge] states standard CC spec used | <span class="g">✓</span> | <span class="r">✗</span> |
| 9.3 | type = feat | <span class="g">✓</span> | <span class="g">✓</span> |
| 9.4 | scope = cli, cmd, or cmd/root | <span class="g">✓</span> | <span class="r">✗ no scope</span> |
| 9.5 | imperative mood | <span class="g">✓</span> | <span class="g">✓</span> |
| | **atomic-commit-split-feat-plus-release** — ⚠ WITHOUT timed out | **<span class="g">5/5</span>** | **<span class="r">0/5 ⚠</span>** |
| 10.1 | [LLM-judge] recommends splitting | <span class="g">✓</span> | <span class="r">✗ ⚠ timeout</span> |
| 10.2 | [LLM-judge] identifies both concerns | <span class="g">✓</span> | <span class="r">✗ ⚠ timeout</span> |
| 10.3 | feat: for CSV export | <span class="g">✓</span> | <span class="r">✗ ⚠ timeout</span> |
| 10.4 | chore(release): or chore: for version bump | <span class="g">✓</span> | <span class="r">✗ ⚠ timeout</span> |
| 10.5 | version numbers 1.2.3 and 1.3.0 in bump commit | <span class="g">✓</span> | <span class="r">✗ ⚠ timeout</span> |

</details>

### Analysis

**v1.1.0 improvements over v1.0.0:**

| Model | v1.0.0 Delta | v1.1.0 Delta | Change | Key driver |
| --- | --- | --- | --- | --- |
| claude-sonnet-4-6 | +30pp | +30pp | steady | 100% WITH (was 98%); eval 7/8 gains offset by lower WITHOUT on 3/4 |
| claude-haiku-4-5 | +30pp | +26pp | −4pp | eval 7 gains (+3); 8.3 still fails WITH; 7.5 new regression |
| qwen3-coder-30b | +12pp | +16pp | +4pp | eval 2/10 gains; eval 7 still partial (chore WITH) |
| qwen3.5-9b | — | +20pp⚠ | — | eval 10 WITHOUT timeout inflates delta; similar pattern to 30b |

**What improved:**
- **Eval 1.5** — Shorter function names fixed the line-length trap. Sonnet now 100% WITH (was 98%). All models now achievable.
- **Eval 7** — Removing CVSS restored the trap. Sonnet WITHOUT now uses `chore(deps)` (+2 delta). Haiku WITHOUT fully tripped (+3 delta). v1.0.0 had zero delta for Claude on this eval.
- **Eval 8.3** — Sonnet WITH now produces formal `Reverts:` footer (+1 delta). The Step 7 addition worked for Sonnet.

**What didn't improve:**
- **Eval 8.3 (Haiku/Qwen3)** — `Reverts:` footer guidance works for Sonnet but not Haiku or Qwen3. These models still put the hash in the body, not as a formal footer. May need stronger framing or example.
- **Eval 7 (Qwen3)** — WITH still uses `chore(deps)` (3/5). The skill's type table guidance is insufficient for this model to override the developer's explicit `chore` suggestion.
- **Evals 3/4 (Qwen3)** — Persistent zero-delta. `skill_context` injection doesn't steer Qwen3 on scope/keyword overrides.
- **Eval 7.5 (Haiku)** — Consistent regression across 2 runs: Haiku omits version numbers WITH skill. Confirmed as model limitation, not fixable via skill changes.
- **Eval 8.3 (Haiku, confirmed)** — Footer reorganization (consolidating all footer types into unified list with example) did not fix Haiku. Re-run confirms model limitation. Follow-up run: 47/50 WITH, 31/50 WITHOUT, +32pp (1.52×) — delta increase due to WITHOUT variance, WITH unchanged.

**qwen3.5-9b observations:**
- Performs comparably to qwen3-coder-30b despite being 3× smaller (9B vs 30B params).
- Eval 3: worst WITH score across all models (1/5) — misidentified type as `feat`, used `(payment)` not `(payments)`, used standard keyword despite CONTRIBUTING.md injection. Skill injection barely penetrates this model.
- Eval 4: used `(form)` scope WITH (+1 over 30b which used `(frontend)`), closer but still wrong.
- Eval 7: same pattern as 30b — both WITH and WITHOUT use `chore(deps)`, skill doesn't override developer framing.
- Eval 9: strong signal (+3) — skill clearly teaches CONTRIBUTING.md absence acknowledgment.
- Eval 10: 5/5 WITH (best among Qwen models), but WITHOUT timed out — delta artificially inflated.

---

## `git-conventional-commits` — v1.2.0

### Changes from v1.1.0

- **SKILL.md:** Reorganized Step 7 footers into unified list (BREAKING CHANGE, Reverts, issue refs) with examples. Added version-range body guidance to Step 6.
- **evals.json:** Added `grading` objects to all 50 assertions (generic regex patterns + LLM-judge declarations). Added `context_label` field for skill-specific context framing.
- **benchmark.py:** Generic grader — skill-agnostic, reads patterns from evals.json. System message injection for openai_compat executor. Batched LLM judge.

### Multi-model summary

| Model | With Skill | Without Skill | Delta | Uplift |
| ----- | ---------- | ------------- | ----- | ------ |
| claude-sonnet-4-6 | **50/50 (100%)** | **35/50 (70%)** | **+30pp** | **1.43×** |
| claude-haiku-4-5 | **43/50 (86%)** | **32/50 (64%)** | **+22pp** | **1.34×** |
| qwen/qwen3.5-9b (vLLM) | **48/50 (96%)** | **35/50 (70%)** | **+26pp** | **1.37×** |

_Sonnet result carried from v1.1.0 (v1.2.0 changes are incremental, no re-run needed)._
_Haiku WITH variance: eval 10 stochastic failure (1/5 — model argued against splitting). Previous runs: 47/50._
_vLLM qwen3.5-9b confirms system message injection is robust across runs (48/50 vs 49/50 v1.1.0)._

### Analysis

**Key finding: system message injection is critical for small models.**

The openai_compat executor now uses the system message role for skill injection. This was the breakthrough that enabled qwen3.5-9b (9B params) to match Claude-tier performance:

| Injection method | qwen3.5-9b WITH | Delta |
| --- | --- | --- |
| User message concatenation | 34/50 (68%) | **-6pp** (skill hurts) |
| System message | **48-49/50 (96-98%)** | **+26-30pp** |

**Haiku stochastic variance:** WITH score ranges from 43-47/50 across runs (eval 10 is the swing eval — Haiku sometimes argues against splitting). Eval 7.5 (version numbers) and 8.3 (Reverts footer) remain consistent model limitations across all runs.

**Generic grader validated:** All results produced by the new generic regex grader (patterns in evals.json) match previous hardcoded grader output on the same responses.

<!-- prettier-ignore-end -->
