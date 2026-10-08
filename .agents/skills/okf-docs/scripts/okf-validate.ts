#!/usr/bin/env bun
/**
 * OKF v0.2 document validator.
 *
 * Usage:
 *   bun run $OKF_DOCS_HOME/scripts/okf-validate.ts [--bundle DIR] [--draft] [--json] [paths...]
 *
 * No paths  -> whole-bundle mode: every *.md under the bundle root, plus the bundle-level
 *              reserved-file rules (root index.md and log.md must exist).
 * Paths     -> per-file mode (what pre-commit uses); bundle-level rules are skipped.
 * --draft   -> skip the position rules (R11 depth, R16 folder map) for a document that has not
 *              been placed in the bundle yet, e.g. a pipeline checkpoint under .raw/runs/.
 *
 * Files under a `templates/` directory are validated in template mode: position rules are
 * skipped and `__PLACEHOLDER__` tokens satisfy any format rule, so a template stays lintable.
 *
 * Every rule id, message and fix is documented in skill://okf-docs/references/validation.md.
 */
import { existsSync, readFileSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { Glob } from "bun";
import { parse } from "./frontmatter.ts";

export type Finding = { path: string; rule: string; message: string };

export type OkfConfig = {
  bundleRoot: string;
  obsidian: boolean;
  agentId: string;
  humanId: string | null;
  staleAfterDays: number | null;
};

const DEFAULT_CONFIG: OkfConfig = {
  bundleRoot: "docs",
  obsidian: false,
  agentId: "agent:omp",
  humanId: null,
  staleAfterDays: null,
};

/** OKF v0.2 statuses plus the two documented ADR/FR lifecycle extensions. */
const VALID_STATUSES = [
  "draft",
  "proposed",
  "stable",
  "superseded",
  "deprecated",
];
const ARRAY_FIELDS = ["tags", "aliases", "cssclasses", "sources"];

/** type -> directory, relative to the bundle root. */
const FOLDER_MAP: Record<string, string> = {
  adr: "adrs",
  feature: "features",
  runbook: "runbooks",
  concept: "concepts",
  reference: "references",
};

/** Required `##` sections per type. Types absent from this map impose no section contract. */
const REQUIRED_SECTIONS: Record<string, string[]> = {
  adr: ["Status", "Context", "Decision", "Consequences"],
  feature: ["Status", "Problem", "Requirements"],
  runbook: [
    "Purpose",
    "Preconditions",
    "Procedure",
    "Verification",
    "Failure modes",
  ],
};

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const PLACEHOLDER = /^__[A-Z0-9_]+__$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Walk up from `startDir` looking for `.omp/okf-docs.json`, then `.okf-docs.json` at the same
 * level (a harness-neutral fallback for a project with no `.omp/` directory); fall back to the
 * defaults when neither is found anywhere up the tree.
 */
export function loadOkfConfig(startDir = process.cwd()): {
  config: OkfConfig;
  root: string;
} {
  let dir = resolve(startDir);
  for (;;) {
    const primary = join(dir, ".omp", "okf-docs.json");
    const fallback = join(dir, ".okf-docs.json");
    const candidate = existsSync(primary)
      ? primary
      : existsSync(fallback)
        ? fallback
        : null;
    if (candidate) {
      const parsed = JSON.parse(
        readFileSync(candidate, "utf8"),
      ) as Partial<OkfConfig>;
      return { config: { ...DEFAULT_CONFIG, ...parsed }, root: dir };
    }
    const parent = dirname(dir);
    if (parent === dir)
      return { config: { ...DEFAULT_CONFIG }, root: resolve(startDir) };
    dir = parent;
  }
}

/** Remove fenced blocks and inline code so example markup is never mistaken for real markup. */
function stripCode(body: string): string {
  const withoutFences = body.replace(
    /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm,
    "",
  );
  return withoutFences.replace(/`[^`\n]*`/g, "");
}

/** Heading lines outside fenced code, as `{ depth, text }`. */
function headings(body: string): { depth: number; text: string }[] {
  const out: { depth: number; text: string }[] = [];
  let fence: string | null = null;
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0].repeat(3);
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading)
      out.push({ depth: heading[1].length, text: heading[2].trim() });
  }
  return out;
}

function isPlaceholder(value: unknown): boolean {
  return typeof value === "string" && PLACEHOLDER.test(value.trim());
}

function asDateString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  return null;
}

type FileContext = {
  /** path as given by the caller, used verbatim in messages */
  display: string;
  absolute: string;
  /** bundle-relative path, or null when the file lives outside the bundle */
  inBundle: string | null;
  reserved: "index" | "log" | null;
  rootIndex: boolean;
  template: boolean;
  skipPosition: boolean;
};

function describe(
  filePath: string,
  bundleAbs: string,
  draft: boolean,
): FileContext {
  const absolute = resolve(filePath);
  const rel = relative(bundleAbs, absolute);
  const inBundle =
    rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : null;
  const name = basename(absolute);
  const template = absolute.split(sep).includes("templates");
  const reserved =
    inBundle && name === "index.md"
      ? "index"
      : inBundle && name === "log.md"
        ? "log"
        : null;
  return {
    display: filePath,
    absolute,
    inBundle,
    reserved,
    rootIndex: reserved === "index" && inBundle === "index.md",
    template,
    skipPosition: draft || template,
  };
}

/**
 * R17: every log.md entry is one bulleted, verb-led, path-naming line — never a bare paragraph.
 * A regular past-tense verb ends in "ed" (hyphenated compounds like "Re-verified" included); a
 * short irregular list covers the common exceptions. The word cap is set from the compliant
 * corpus (max observed: 37 words) with headroom for a bullet naming several paths at once.
 */
const IRREGULAR_PAST_VERBS: Record<string, true> = {
  Made: true,
  Set: true,
  Cut: true,
  Put: true,
  Split: true,
  Read: true,
  Sent: true,
  Spent: true,
  Left: true,
  Built: true,
  Sold: true,
  Told: true,
  Held: true,
  Sought: true,
  Bought: true,
  Caught: true,
  Taught: true,
  Brought: true,
  Thought: true,
  Fought: true,
  Chose: true,
  Wrote: true,
  Broke: true,
  Spoke: true,
  Grew: true,
  Threw: true,
  Knew: true,
  Drew: true,
  Gave: true,
  Took: true,
  Rose: true,
  Wore: true,
  Bore: true,
  Came: true,
  Ate: true,
  Saw: true,
  Went: true,
  Did: true,
  Had: true,
  Said: true,
  Got: true,
  Found: true,
  Began: true,
  Ran: true,
  Kept: true,
};
const LOG_WORD_LIMIT = 50;
const LOG_MD_REFERENCE = /`[^`\n]*\.md`/;
const PAST_TENSE_SHAPE = /^[A-Z][a-zA-Z-]*$/;

/** First ~8 words of `text`, ellipsized, for identifying which entry a finding is about. */
function snippet(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const head = words.slice(0, 8).join(" ");
  return words.length > 8 ? `${head}…` : head;
}

function checkLogEntries(
  ctx: FileContext,
  content: string,
  findings: Finding[],
): void {
  const push = (message: string) =>
    findings.push({ path: ctx.display, rule: "R17", message });
  let inFence = false;
  let sawHeading = false;
  let bullet: string[] | null = null;

  const flush = () => {
    if (!bullet) return;
    const text = bullet.join(" ").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const firstWord = (words[0] ?? "").replace(/[^A-Za-z-]/g, "");
    const isPastTense =
      PAST_TENSE_SHAPE.test(firstWord) &&
      (firstWord.endsWith("ed") || IRREGULAR_PAST_VERBS[firstWord]);
    if (!isPastTense) {
      push(
        `log.md entry '${snippet(text)}' does not open with a past-tense action verb`,
      );
    }
    if (!LOG_MD_REFERENCE.test(text)) {
      push(`log.md entry '${snippet(text)}' names no bundle document`);
    }
    if (words.length > LOG_WORD_LIMIT) {
      push(
        `log.md entry '${snippet(text)}' is ${words.length} words, over the ${LOG_WORD_LIMIT}-word limit`,
      );
    }
    bullet = null;
  };

  for (const raw of content.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^[ \t]*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s/.test(line)) {
      flush();
      sawHeading = true;
      continue;
    }
    if (/^- /.test(line)) {
      flush();
      bullet = [line.slice(2)];
      continue;
    }
    if (bullet && /^ {2}\S/.test(line)) {
      bullet.push(line.trim());
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    flush();
    if (sawHeading)
      push(
        `log.md line '${snippet(line.trim())}' is not a bullet or a continuation`,
      );
  }
  flush();
}

/** R12: the reserved files. `index.md` and `log.md` carry no `type` and no trust layer. */
function checkReserved(
  ctx: FileContext,
  content: string,
  findings: Finding[],
): void {
  const hasFrontmatter = FRONTMATTER.test(content);
  if (ctx.reserved === "log") {
    if (hasFrontmatter) {
      findings.push({
        path: ctx.display,
        rule: "R12",
        message: "log.md must not contain frontmatter",
      });
    }
    const dates: string[] = [];
    for (const heading of headings(content)) {
      if (heading.depth !== 2) continue;
      if (!ISO_DATE.test(heading.text)) {
        findings.push({
          path: ctx.display,
          rule: "R12",
          message: `log.md heading '## ${heading.text}' must be an ISO date (## YYYY-MM-DD)`,
        });
        continue;
      }
      dates.push(heading.text);
    }
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] > dates[i - 1]) {
        findings.push({
          path: ctx.display,
          rule: "R12",
          message: "log.md dates must be newest-first",
        });
        break;
      }
    }
    checkLogEntries(ctx, content, findings);
    return;
  }

  if (!ctx.rootIndex) {
    if (hasFrontmatter) {
      findings.push({
        path: ctx.display,
        rule: "R12",
        message:
          "index.md must not contain frontmatter outside the bundle root",
      });
    }
    return;
  }

  const match = content.match(FRONTMATTER);
  const parsed: unknown = match ? parse(match[1]) : null;
  const keys =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed as Record<string, unknown>)
      : [];
  const spec =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).spec
      : undefined;
  if (
    !match ||
    keys.length !== 1 ||
    keys[0] !== "spec" ||
    String(spec) !== "0.2"
  ) {
    findings.push({
      path: ctx.display,
      rule: "R12",
      message: "root index.md frontmatter must declare only 'spec: 0.2'",
    });
  }
}

/** R1-R9, R13, R14: everything derived from the frontmatter mapping and the required sections. */
function checkFrontmatter(
  ctx: FileContext,
  content: string,
  body: string,
  pathIndex: Set<string>,
  findings: Finding[],
): void {
  const push = (rule: string, message: string) =>
    findings.push({ path: ctx.display, rule, message });

  const match = content.match(FRONTMATTER);
  if (!match) {
    push("R1", "missing frontmatter");
    return;
  }
  const fmText = match[1];

  // Obsidian parses `key: [[A]]` as a nested sequence, silently losing the link.
  if (/^(?!.*(['"]).*\1)[a-zA-Z0-9_-]+\s*:\s*\[\[.*\]\]/m.test(fmText)) {
    push("R9", "internal wiki links in frontmatter must be quoted");
  }

  let parsed: unknown;
  try {
    parsed = parse(fmText);
  } catch (error: unknown) {
    push(
      "R1",
      `invalid YAML in frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    push("R1", "frontmatter must be a YAML mapping");
    return;
  }
  const fm = parsed as Record<string, unknown>;

  // R2 — the one rule of OKF conformance.
  const type =
    typeof fm.type === "string"
      ? fm.type.trim()
      : fm.type
        ? String(fm.type)
        : "";
  if (!type) push("R2", "missing 'type' in frontmatter");

  // R3 / R4 — lifecycle and the approval gate.
  const status = fm.status === undefined ? null : String(fm.status);
  if (
    status !== null &&
    !isPlaceholder(fm.status) &&
    !VALID_STATUSES.includes(status)
  ) {
    push(
      "R3",
      `invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }

  // R18 / R19 — the supersession edge. `superseded_by` is a bundle-relative concept ID (the
  // path minus its `.md` suffix), the same identity a markdown link target resolves against.
  const supersededBy =
    fm.superseded_by === undefined ? null : String(fm.superseded_by);
  if (status === "superseded" && !supersededBy) {
    push("R18", "status 'superseded' requires a 'superseded_by' successor");
  }
  if (
    supersededBy &&
    !isPlaceholder(fm.superseded_by) &&
    status !== "superseded"
  ) {
    push(
      "R18",
      `'superseded_by' is set but status is '${status}', not 'superseded'`,
    );
  }
  if (supersededBy && !isPlaceholder(fm.superseded_by)) {
    const self = ctx.inBundle?.replace(/\.md$/, "");
    if (self && supersededBy === self) {
      push("R19", "'superseded_by' must not name the document itself");
    } else if (!pathIndex.has(supersededBy)) {
      push(
        "R19",
        `'superseded_by' target '${supersededBy}' does not exist in the bundle`,
      );
    }
  }
  const verified = fm.verified;
  const verifiedMap =
    verified && typeof verified === "object" && !Array.isArray(verified)
      ? (verified as Record<string, unknown>)
      : null;
  if (status === "stable" && !verifiedMap?.by) {
    push("R4", "status 'stable' requires a 'verified.by' human attribution");
  }

  // R5 — provenance of the author.
  const generated = fm.generated;
  const generatedMap =
    generated && typeof generated === "object" && !Array.isArray(generated)
      ? (generated as Record<string, unknown>)
      : null;
  if (!generatedMap || generatedMap.by === undefined) {
    push("R5", "missing 'generated.by'");
  } else if (
    !isPlaceholder(generatedMap.by) &&
    !/^(agent|human):/.test(String(generatedMap.by))
  ) {
    push("R5", "'generated.by' must start with 'agent:' or 'human:'");
  }
  if (generatedMap) {
    const at = generatedMap.at;
    if (at === undefined) push("R5", "missing 'generated.at'");
    else if (!isPlaceholder(at)) {
      const value = asDateString(at);
      if (
        !value ||
        !ISO_TIMESTAMP.test(value) ||
        Number.isNaN(Date.parse(value))
      ) {
        push("R5", "'generated.at' must be an ISO 8601 timestamp");
      }
    }
    // `run` is optional -- an opaque workflow-chosen identifier with no shape contract beyond
    // not being blank, so a producing pipeline can resolve it to its own staging location.
    if (
      generatedMap.run !== undefined &&
      !isPlaceholder(generatedMap.run) &&
      String(generatedMap.run).trim() === ""
    ) {
      push("R5", "'generated.run' must not be blank");
    }
  }

  // R6 — provenance of the reviewer.
  if (verifiedMap) {
    const by = verifiedMap.by;
    if (by !== undefined && !isPlaceholder(by) && !/^human:/.test(String(by))) {
      push("R6", "'verified.by' must start with 'human:'");
    }
    const at = verifiedMap.at;
    if (at !== undefined && !isPlaceholder(at)) {
      const value = asDateString(at);
      if (!value || !ISO_DATE.test(value.slice(0, 10)) || value.length !== 10) {
        push("R6", "'verified.at' must be YYYY-MM-DD");
      }
    }
  }

  // R7 / R8 — list-shaped fields and provenance items.
  for (const field of ARRAY_FIELDS) {
    if (fm[field] !== undefined && !Array.isArray(fm[field])) {
      push("R7", `'${field}' must be an array, not a scalar`);
    }
  }
  if (Array.isArray(fm.sources)) {
    fm.sources.forEach((source, index) => {
      let ok = false;
      if (typeof source === "string") ok = source.trim().length > 0;
      else if (source && typeof source === "object" && !Array.isArray(source)) {
        ok =
          String((source as Record<string, unknown>).resource ?? "").trim()
            .length > 0;
      }
      if (!ok) {
        push(
          "R8",
          `sources[${index}] must be a URL string or an object with a 'resource'`,
        );
      }
    });
  }

  // R13 — the type's section contract.
  const required = REQUIRED_SECTIONS[type];
  if (required) {
    const present = headings(body)
      .filter((heading) => heading.depth === 2)
      .map((heading) => heading.text.toLowerCase());
    for (const section of required) {
      if (!present.some((text) => text.startsWith(section.toLowerCase()))) {
        push("R13", `type '${type}' requires a '## ${section}' section`);
      }
    }
  }

  // R14 — freshness.
  if (fm.stale_after !== undefined && !isPlaceholder(fm.stale_after)) {
    const value = asDateString(fm.stale_after);
    if (value === null || value.length !== 10 || !ISO_DATE.test(value)) {
      push("R14", "'stale_after' must be YYYY-MM-DD");
    } else if (
      status === "stable" &&
      value < new Date().toISOString().slice(0, 10)
    ) {
      push("R14", `stale_after ${value} has passed; re-verify or lower status`);
    }
  }
}

/** R10: every internal link resolves. Wiki links only matter when Obsidian mode is on. */
function checkLinks(
  ctx: FileContext,
  body: string,
  mdIndex: Map<string, string>,
  obsidian: boolean,
  findings: Finding[],
): void {
  const prose = stripCode(body);

  if (obsidian) {
    for (const match of prose.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      const target = match[1].trim();
      if (!mdIndex.has(target.toLowerCase())) {
        findings.push({
          path: ctx.display,
          rule: "R10",
          message: `broken internal wiki link: [[${target}]]`,
        });
      }
    }
  }

  for (const match of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
    const pathPart = target.split("#")[0];
    if (!pathPart) continue;
    if (!existsSync(resolve(dirname(ctx.absolute), pathPart))) {
      findings.push({
        path: ctx.display,
        rule: "R10",
        message: `broken markdown link: ${target}`,
      });
    }
  }
}

/** R11 / R16: where the document sits. Skipped for drafts and templates. */
function checkPosition(
  ctx: FileContext,
  content: string,
  bundleLabel: string,
  findings: Finding[],
): void {
  if (ctx.inBundle && ctx.inBundle.split(sep).length > 2) {
    findings.push({
      path: ctx.display,
      rule: "R11",
      message: `nested beyond two levels inside ${bundleLabel}/`,
    });
  }
  if (ctx.reserved) return;

  const match = content.match(FRONTMATTER);
  if (!match) return;
  let parsed: unknown;
  try {
    parsed = parse(match[1]);
  } catch {
    return; // R1 already reported it
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  const type = String((parsed as Record<string, unknown>).type ?? "").trim();
  const expected = FOLDER_MAP[type];
  if (!expected) return; // unmapped types are tolerated; OKF lets a bundle invent types
  const actual = ctx.inBundle ? dirname(ctx.inBundle) : null;
  if (actual !== expected) {
    findings.push({
      path: ctx.display,
      rule: "R16",
      message: `type '${type}' must live in ${bundleLabel}/${expected}/`,
    });
  }
}

export type ValidateOptions = {
  bundleRoot?: string;
  cwd?: string;
  draft?: boolean;
  /** whole-bundle mode adds the bundle-level reserved-file checks */
  bundleMode?: boolean;
};

export function validate(
  paths: string[],
  options: ValidateOptions = {},
): Finding[] {
  const cwd = resolve(options.cwd ?? process.cwd());
  const { config } = loadOkfConfig(cwd);
  const bundleLabel = options.bundleRoot ?? config.bundleRoot;
  const bundleAbs = resolve(cwd, bundleLabel);
  const findings: Finding[] = [];

  // Wiki links omit paths and the .md suffix, so resolve them through a basename index of the
  // bundle. Restricting the index to the bundle keeps a link from resolving against .refs/.
  // `pathIndex` is the same scan keyed by the full bundle-relative path minus `.md`, which is
  // what `superseded_by` (R19) resolves against -- a concept ID, not just a basename, so two
  // documents sharing a basename in different folders can't collide.
  const mdIndex = new Map<string, string>();
  const pathIndex = new Set<string>();
  if (existsSync(bundleAbs)) {
    for (const file of new Glob("**/*.md").scanSync(bundleAbs)) {
      mdIndex.set(basename(file, ".md").toLowerCase(), file);
      pathIndex.add(file.replace(/\.md$/, ""));
    }
  }

  if (options.bundleMode) {
    if (!existsSync(join(bundleAbs, "index.md"))) {
      findings.push({
        path: bundleLabel,
        rule: "R12",
        message: "bundle is missing its root index.md",
      });
    }
    if (!existsSync(join(bundleAbs, "log.md"))) {
      findings.push({
        path: bundleLabel,
        rule: "R12",
        message: "bundle is missing log.md",
      });
    }
  }

  for (const filePath of paths) {
    const ctx = describe(filePath, bundleAbs, options.draft ?? false);
    if (!existsSync(ctx.absolute)) {
      findings.push({
        path: ctx.display,
        rule: "R0",
        message: "file does not exist",
      });
      continue;
    }
    const content = readFileSync(ctx.absolute, "utf8");
    const match = content.match(FRONTMATTER);
    const body = match ? content.slice(match[0].length) : content;

    if (!ctx.skipPosition) checkPosition(ctx, content, bundleLabel, findings);

    if (ctx.reserved) checkReserved(ctx, content, findings);
    else checkFrontmatter(ctx, content, body, pathIndex, findings);

    checkLinks(ctx, body, mdIndex, config.obsidian, findings);

    // R15 — exactly one H1, counted on the body so a frontmatter comment never counts.
    const h1s = headings(body).filter((heading) => heading.depth === 1).length;
    if (h1s !== 1) {
      findings.push({
        path: ctx.display,
        rule: "R15",
        message: "document must contain exactly one H1",
      });
    }
  }

  return findings;
}

export function collectBundleFiles(
  bundleAbs: string,
  bundleLabel: string,
): string[] {
  if (!existsSync(bundleAbs)) return [];
  return [...new Glob("**/*.md").scanSync(bundleAbs)]
    .sort()
    .map((file) => join(bundleLabel, file));
}

function main(): void {
  const argv = process.argv.slice(2);
  const paths: string[] = [];
  let json = false;
  let draft = false;
  let bundleOverride: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") json = true;
    else if (arg === "--draft") draft = true;
    else if (arg === "--bundle") bundleOverride = argv[++i];
    else if (arg.startsWith("--bundle="))
      bundleOverride = arg.slice("--bundle=".length);
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: bun run okf-validate.ts [--bundle DIR] [--draft] [--json] [paths...]\n" +
          "No paths validates the whole bundle. Rules: skill://okf-docs/references/validation.md",
      );
      process.exit(0);
    } else paths.push(arg);
  }

  const { config } = loadOkfConfig();
  const bundleLabel = bundleOverride ?? config.bundleRoot;
  const bundleAbs = resolve(process.cwd(), bundleLabel);
  const bundleMode = paths.length === 0;
  const targets = bundleMode
    ? collectBundleFiles(bundleAbs, bundleLabel)
    : paths.filter((path) => path.endsWith(".md"));

  const findings = validate(targets, {
    bundleRoot: bundleLabel,
    draft,
    bundleMode,
  });

  if (json) {
    console.log(
      JSON.stringify({ ok: findings.length === 0, errors: findings }),
    );
  } else {
    const failed = new Set(findings.map((finding) => finding.path));
    for (const target of targets)
      if (!failed.has(target)) console.log(`✅ ${target}`);
    for (const finding of findings) {
      console.error(`❌ ${finding.path}: ${finding.rule} — ${finding.message}`);
    }
    if (findings.length === 0 && targets.length === 0)
      console.log("no markdown files to validate");
  }

  if (findings.length > 0) process.exit(1);
}

if (import.meta.main) main();
