#!/usr/bin/env bun
/**
 * OKF v0.2 review workflow.
 *
 * Usage:
 *   bun run $OKF_DOCS_HOME/scripts/okf-review.ts list    [--bundle DIR] [--json]
 *   bun run $OKF_DOCS_HOME/scripts/okf-review.ts approve [--all | paths...] [--by human:id] [--date YYYY-MM-DD] [--bundle DIR] [--json]
 *
 * list    -> buckets every non-reserved bundle document into unverified / expired / verified /
 *            unparseable, so the review backlog is one command instead of opening every
 *            frontmatter block by hand. Read-only, always exits 0.
 * approve -> writes `verified: {by, at}`, promotes `status` to "stable", refreshes `stale_after`
 *            and logs the approval to `<bundle>/log.md`. Refuses, before writing anything, a
 *            reviewer id that is not `human:...`; refuses, after writing, a document that still
 *            fails validation once the R4/R14 findings approval itself fixes are dropped, and
 *            restores the original bytes. Exits 1 if anything was refused, else 0 — a skip does
 *            not fail the run.
 *
 * Every rule id here is defined in ./okf-validate.ts and documented at
 * skill://okf-docs/references/validation.md.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { parse } from "./frontmatter.ts";
import {
  collectBundleFiles,
  type Finding,
  loadOkfConfig,
  type OkfConfig,
  validate,
} from "./okf-validate.ts";

const TODAY = new Date().toISOString().slice(0, 10);
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;

const USAGE =
  "Usage: bun run okf-review.ts list    [--bundle DIR] [--json]\n" +
  "       bun run okf-review.ts approve [--all | paths...] [--by human:id] [--date YYYY-MM-DD] [--bundle DIR] [--json]";

/** `start`/`end` bound the inner YAML in `content`, so a rebuild is `slice(0,start)+yaml+slice(end)`. */
function frontmatterOf(
  content: string,
): { text: string; start: number; end: number } | null {
  const match = content.match(FRONTMATTER);
  if (!match) return null;
  const start = (match.index ?? 0) + "---\n".length;
  const end = start + match[1].length;
  return { text: match[1], start, end };
}

/** `index.md` and `log.md` carry no `type` and no trust layer; the review workflow ignores them. */
function isReserved(path: string): boolean {
  const name = basename(path);
  return name === "index.md" || name === "log.md";
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function isMap(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveBundle(bundleFlag: string | undefined): {
  config: OkfConfig;
  bundleLabel: string;
  bundleAbs: string;
} {
  const { config } = loadOkfConfig();
  const bundleLabel = bundleFlag ?? config.bundleRoot;
  const bundleAbs = resolve(process.cwd(), bundleLabel);
  return { config, bundleLabel, bundleAbs };
}

type Classification = {
  path: string;
  bucket: "unverified" | "expired" | "verified" | "unparseable";
  status: string | null;
  title: string | null;
  generatedBy: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  staleAfter: string | null;
  reason: string | null;
};

/** Read and bucket one bundle document. Shared by `list` and `approve --all` target resolution. */
function classifyDocument(path: string): Classification {
  const base: Omit<Classification, "bucket" | "reason"> = {
    path,
    status: null,
    title: null,
    generatedBy: null,
    verifiedBy: null,
    verifiedAt: null,
    staleAfter: null,
  };
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) {
    return { ...base, bucket: "unparseable", reason: "file does not exist" };
  }
  const content = readFileSync(absolute, "utf8");
  const fm = frontmatterOf(content);
  if (!fm) {
    return { ...base, bucket: "unparseable", reason: "missing frontmatter" };
  }
  let parsed: unknown;
  try {
    parsed = parse(fm.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      bucket: "unparseable",
      reason: `invalid YAML: ${message}`,
    };
  }
  if (!isMap(parsed)) {
    return {
      ...base,
      bucket: "unparseable",
      reason: "frontmatter must be a YAML mapping",
    };
  }

  const status =
    parsed.status !== undefined && parsed.status !== null
      ? String(parsed.status)
      : null;
  const title =
    parsed.title !== undefined && parsed.title !== null
      ? String(parsed.title)
      : null;
  const generatedMap = isMap(parsed.generated) ? parsed.generated : null;
  const generatedBy =
    generatedMap && generatedMap.by !== undefined
      ? String(generatedMap.by)
      : null;
  const verifiedMap = isMap(parsed.verified) ? parsed.verified : null;
  const verifiedByRaw =
    verifiedMap && verifiedMap.by !== undefined
      ? String(verifiedMap.by).trim()
      : "";
  const verifiedAt =
    verifiedMap && verifiedMap.at !== undefined ? String(verifiedMap.at) : null;
  const staleAfter =
    parsed.stale_after !== undefined && parsed.stale_after !== null
      ? String(parsed.stale_after)
      : null;

  const bucket: Classification["bucket"] = !verifiedByRaw
    ? "unverified"
    : staleAfter && staleAfter < TODAY
      ? "expired"
      : "verified";

  return {
    ...base,
    bucket,
    status,
    title,
    generatedBy,
    verifiedBy: verifiedByRaw || null,
    verifiedAt,
    staleAfter,
    reason: null,
  };
}

// ---------------------------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------------------------

function runList(bundleFlag: string | undefined, json: boolean): void {
  const { bundleLabel, bundleAbs } = resolveBundle(bundleFlag);
  const paths = collectBundleFiles(bundleAbs, bundleLabel).filter(
    (path) => !isReserved(path),
  );
  const entries = paths.map((path) => classifyDocument(path));

  const unverified = entries.filter((entry) => entry.bucket === "unverified");
  const expired = entries.filter((entry) => entry.bucket === "expired");
  const unparseable = entries.filter((entry) => entry.bucket === "unparseable");
  const verifiedCount = entries.filter(
    (entry) => entry.bucket === "verified",
  ).length;

  const counts = {
    unverified: unverified.length,
    expired: expired.length,
    verified: verifiedCount,
    unparseable: unparseable.length,
  };

  if (json) {
    console.log(
      JSON.stringify({
        counts,
        unverified: unverified.map((entry) => ({
          path: entry.path,
          status: entry.status,
          title: entry.title,
          generated_by: entry.generatedBy,
          stale_after: entry.staleAfter,
        })),
        expired: expired.map((entry) => ({
          path: entry.path,
          status: entry.status,
          verified_by: entry.verifiedBy,
          verified_at: entry.verifiedAt,
          stale_after: entry.staleAfter,
        })),
        unparseable: unparseable.map((entry) => ({
          path: entry.path,
          reason: entry.reason,
        })),
      }),
    );
    return;
  }

  const lines: string[] = [];
  lines.push(`unverified (${unverified.length})`);
  for (const entry of unverified) {
    lines.push(
      `  ${entry.path.padEnd(52)}${(entry.status ?? "-").padEnd(12)}${entry.generatedBy ?? "-"}`,
    );
  }
  lines.push(`expired (${expired.length})`);
  for (const entry of expired) {
    lines.push(
      `  ${entry.path.padEnd(52)}${(entry.status ?? "-").padEnd(12)}${entry.generatedBy ?? "-"} stale_after ${entry.staleAfter}`,
    );
  }
  lines.push(`unparseable (${unparseable.length})`);
  for (const entry of unparseable) {
    lines.push(`  ${entry.path}: ${entry.reason}`);
  }
  lines.push("");
  lines.push(
    `${counts.unverified} unverified, ${counts.expired} expired, ${counts.verified} verified, ${counts.unparseable} unparseable`,
  );
  console.log(lines.join("\n"));
}

// ---------------------------------------------------------------------------------------------
// approve
// ---------------------------------------------------------------------------------------------

type ApproveOutcome =
  | {
      kind: "verified";
      path: string;
      statusFrom: string | null;
      verifiedBy: string;
      verifiedAt: string;
      staleAfter: string | null;
      bullet: string;
    }
  | { kind: "skipped"; path: string; reason: string }
  | { kind: "refused"; path: string; findings: Finding[] };

/** Insert `newLine` right after the first line starting with one of `prefixes`, tried in order. */
function insertAfterFirstPrefix(
  yaml: string,
  prefixes: string[],
  newLine: string,
): string {
  const lines = yaml.split("\n");
  for (const prefix of prefixes) {
    const idx = lines.findIndex((line) => line.startsWith(prefix));
    if (idx !== -1) {
      lines.splice(idx + 1, 0, newLine);
      return lines.join("\n");
    }
  }
  lines.unshift(newLine);
  return lines.join("\n");
}

/** Index just past a `key:` block header and its contiguous two-space-indented children. */
function blockEnd(lines: string[], headerIdx: number): number {
  let end = headerIdx + 1;
  while (end < lines.length && /^ {2}\S/.test(lines[end])) end++;
  return end;
}

function setStatus(yaml: string): string {
  const line = 'status: "stable"';
  if (/^status:\s.*$/m.test(yaml)) return yaml.replace(/^status:\s.*$/m, line);
  return insertAfterFirstPrefix(
    yaml,
    ["description:", "title:", "type:"],
    line,
  );
}

function setVerified(yaml: string, reviewer: string, date: string): string {
  const block = ["verified:", `  by: "${reviewer}"`, `  at: "${date}"`];
  const lines = yaml.split("\n");

  const verifiedIdx = lines.findIndex((line) => /^verified:\s*$/.test(line));
  if (verifiedIdx !== -1) {
    lines.splice(
      verifiedIdx,
      blockEnd(lines, verifiedIdx) - verifiedIdx,
      ...block,
    );
    return lines.join("\n");
  }

  const generatedIdx = lines.findIndex((line) => /^generated:\s*$/.test(line));
  if (generatedIdx !== -1) {
    lines.splice(blockEnd(lines, generatedIdx), 0, ...block);
    return lines.join("\n");
  }

  for (const prefix of ["stale_after:", "aliases:", "cssclasses:"]) {
    const idx = lines.findIndex((line) => line.startsWith(prefix));
    if (idx !== -1) {
      lines.splice(idx, 0, ...block);
      return lines.join("\n");
    }
  }

  lines.push(...block);
  return lines.join("\n");
}

function setStaleAfter(yaml: string, date: string): string {
  const line = `stale_after: "${date}"`;
  if (/^stale_after:\s.*$/m.test(yaml))
    return yaml.replace(/^stale_after:\s.*$/m, line);

  const lines = yaml.split("\n");
  const verifiedIdx = lines.findIndex((l) => /^verified:\s*$/.test(l));
  if (verifiedIdx !== -1) {
    lines.splice(blockEnd(lines, verifiedIdx), 0, line);
    return lines.join("\n");
  }
  lines.push(line);
  return lines.join("\n");
}

/** Prepend one bullet per approved document to today's `## <date>` section of `log.md`. */
function appendLogBullets(
  bundleAbs: string,
  date: string,
  bullets: string[],
): void {
  const logPath = join(bundleAbs, "log.md");
  const content = existsSync(logPath)
    ? readFileSync(logPath, "utf8")
    : "# Documentation Log\n";
  const heading = `## ${date}`;
  const lines = content.split("\n");

  const headingIdx = lines.indexOf(heading);
  if (headingIdx !== -1) {
    let insertAt = headingIdx + 1;
    if (lines[insertAt] === "") insertAt++;
    lines.splice(insertAt, 0, ...bullets);
    writeFileSync(logPath, lines.join("\n"), "utf8");
    return;
  }

  const firstHeadingIdx = lines.findIndex((line) => line.startsWith("## "));
  const insertAt = firstHeadingIdx === -1 ? lines.length : firstHeadingIdx;
  const section = [heading, "", ...bullets, ""];
  if (insertAt > 0 && lines[insertAt - 1] !== "")
    lines.splice(insertAt, 0, "", ...section);
  else lines.splice(insertAt, 0, ...section);
  writeFileSync(logPath, lines.join("\n"), "utf8");
}

function approveOne(
  path: string,
  ctx: {
    bundleLabel: string;
    bundleAbs: string;
    config: OkfConfig;
    reviewer: string;
    reviewDate: string;
  },
): ApproveOutcome {
  if (isReserved(path))
    return { kind: "skipped", path, reason: "not a bundle document" };

  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute))
    return { kind: "skipped", path, reason: "not a bundle document" };
  const rel = relative(ctx.bundleAbs, absolute);
  if (isAbsolute(rel) || rel.startsWith("..")) {
    return { kind: "skipped", path, reason: "not a bundle document" };
  }

  const original = readFileSync(absolute, "utf8");
  const fm = frontmatterOf(original);
  let parsed: unknown;
  if (fm) {
    try {
      parsed = parse(fm.text);
    } catch {
      parsed = undefined;
    }
  }
  if (!fm || !isMap(parsed)) {
    return {
      kind: "refused",
      path,
      findings: [{ path, rule: "R1", message: "frontmatter did not parse" }],
    };
  }
  const data = parsed;

  const statusFrom =
    data.status !== undefined && data.status !== null
      ? String(data.status)
      : null;
  if (statusFrom === "superseded" || statusFrom === "deprecated") {
    return {
      kind: "skipped",
      path,
      reason: `status '${statusFrom}' is not promotable; verify applies to draft, proposed or stable`,
    };
  }

  const preFindings = validate([path], { bundleRoot: ctx.bundleLabel }).filter(
    (finding) => {
      if (finding.rule === "R4") return false;
      if (
        finding.rule === "R14" &&
        finding.message.includes("has passed") &&
        typeof ctx.config.staleAfterDays === "number"
      ) {
        return false;
      }
      return true;
    },
  );
  if (preFindings.length > 0)
    return { kind: "refused", path, findings: preFindings };

  const verifiedMap = isMap(data.verified) ? data.verified : null;
  const wasVerified =
    !!verifiedMap && String(verifiedMap.by ?? "").trim().length > 0;

  let yaml = setStatus(fm.text);
  yaml = setVerified(yaml, ctx.reviewer, ctx.reviewDate);
  let staleAfter: string | null = null;
  if (typeof ctx.config.staleAfterDays === "number") {
    staleAfter = addDays(ctx.config.staleAfterDays);
    yaml = setStaleAfter(yaml, staleAfter);
  }

  const newContent =
    original.slice(0, fm.start) + yaml + original.slice(fm.end);
  writeFileSync(absolute, newContent, "utf8");

  const postFindings = validate([path], { bundleRoot: ctx.bundleLabel });
  if (postFindings.length > 0) {
    writeFileSync(absolute, original, "utf8");
    return {
      kind: "refused",
      path,
      findings: postFindings.map((finding) => ({
        path,
        rule: finding.rule,
        message: `post-edit validation failed: ${finding.rule} ${finding.message}`,
      })),
    };
  }

  const bullet = wasVerified
    ? staleAfter !== null
      ? `- Re-verified \`${path}\` — reviewed by ${ctx.reviewer}; stale_after moved to ${staleAfter}.`
      : `- Re-verified \`${path}\` — reviewed by ${ctx.reviewer}.`
    : `- Verified \`${path}\` — reviewed by ${ctx.reviewer}, status ${statusFrom ?? "absent"} → stable.`;

  return {
    kind: "verified",
    path,
    statusFrom,
    verifiedBy: ctx.reviewer,
    verifiedAt: ctx.reviewDate,
    staleAfter,
    bullet,
  };
}

function runApprove(args: {
  bundleFlag: string | undefined;
  json: boolean;
  all: boolean;
  paths: string[];
  by: string | undefined;
  date: string | undefined;
}): void {
  if (args.all && args.paths.length > 0) {
    console.error("--all takes no paths");
    process.exit(2);
  }
  if (!args.all && args.paths.length === 0) {
    console.error("nothing to approve: pass paths or --all");
    process.exit(2);
  }

  const { config, bundleLabel, bundleAbs } = resolveBundle(args.bundleFlag);

  let reviewer: string;
  if (args.by !== undefined) reviewer = args.by;
  else if (config.humanId) reviewer = config.humanId;
  else {
    console.error("no humanId in .omp/okf-docs.json; pass --by human:<name>");
    process.exit(2);
  }
  if (!/^human:/.test(reviewer)) {
    console.error("--by must be a human id (human:<name>)");
    process.exit(2);
  }

  let reviewDate = TODAY;
  if (args.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      console.error("--date must be YYYY-MM-DD");
      process.exit(2);
    }
    reviewDate = args.date;
  }

  let targets: string[];
  if (args.all) {
    const bundleFiles = collectBundleFiles(bundleAbs, bundleLabel).filter(
      (path) => !isReserved(path),
    );
    targets = bundleFiles
      .map((path) => classifyDocument(path))
      .filter(
        (entry) => entry.bucket === "unverified" || entry.bucket === "expired",
      )
      .map((entry) => entry.path);
  } else {
    targets = args.paths;
  }

  const verified: Array<{
    path: string;
    status_from: string | null;
    verified_by: string;
    verified_at: string;
    stale_after: string | null;
  }> = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  const refused: Array<{ path: string; findings: Finding[] }> = [];
  const bullets: string[] = [];
  const lines: string[] = [];

  for (const target of targets) {
    const outcome = approveOne(target, {
      bundleLabel,
      bundleAbs,
      config,
      reviewer,
      reviewDate,
    });
    if (outcome.kind === "verified") {
      verified.push({
        path: outcome.path,
        status_from: outcome.statusFrom,
        verified_by: outcome.verifiedBy,
        verified_at: outcome.verifiedAt,
        stale_after: outcome.staleAfter,
      });
      bullets.push(outcome.bullet);
      const staleClause = outcome.staleAfter
        ? `, stale_after ${outcome.staleAfter}`
        : "";
      lines.push(
        `✅ ${outcome.path} — stable, verified.by ${outcome.verifiedBy}, verified.at ${outcome.verifiedAt}${staleClause}`,
      );
    } else if (outcome.kind === "skipped") {
      skipped.push({ path: outcome.path, reason: outcome.reason });
      lines.push(`⏭ ${outcome.path} — skipped: ${outcome.reason}`);
    } else {
      refused.push({ path: outcome.path, findings: outcome.findings });
      for (const finding of outcome.findings) {
        lines.push(
          `❌ ${outcome.path} — refused: ${finding.rule} ${finding.message}`,
        );
      }
    }
  }

  if (bullets.length > 0) appendLogBullets(bundleAbs, reviewDate, bullets);

  const ok = refused.length === 0;

  if (args.json) {
    console.log(
      JSON.stringify({
        ok,
        verified,
        skipped,
        refused: refused.map((entry) => ({
          path: entry.path,
          findings: entry.findings.map((finding) => ({
            rule: finding.rule,
            message: finding.message,
          })),
        })),
      }),
    );
  } else {
    console.log(lines.join("\n"));
    console.log("");
    console.log(
      `${verified.length} verified, ${skipped.length} skipped, ${refused.length} refused`,
    );
  }

  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function main(): void {
  const argv = process.argv.slice(2);
  const sub = argv[0];
  if (sub !== "list" && sub !== "approve") {
    console.error(USAGE);
    process.exit(2);
  }

  let bundleFlag: string | undefined;
  let json = false;
  let all = false;
  let by: string | undefined;
  let date: string | undefined;
  const paths: string[] = [];

  const rest = argv.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--bundle") bundleFlag = rest[++i];
    else if (arg.startsWith("--bundle="))
      bundleFlag = arg.slice("--bundle=".length);
    else if (arg === "--json") json = true;
    else if (sub === "approve" && arg === "--all") all = true;
    else if (sub === "approve" && arg === "--by") by = rest[++i];
    else if (sub === "approve" && arg === "--date") date = rest[++i];
    else paths.push(arg);
  }

  if (sub === "list") {
    runList(bundleFlag, json);
    return;
  }
  runApprove({ bundleFlag, json, all, paths, by, date });
}

if (import.meta.main) main();
