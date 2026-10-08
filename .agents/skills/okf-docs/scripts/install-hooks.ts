#!/usr/bin/env bun
/**
 * Install the OKF v0.2 pre-commit validator into whatever hook mechanism a consuming repository
 * already uses -- never its own. Detects, in order: the Python `pre-commit` framework
 * (`.pre-commit-config.yaml`), Husky (`.husky/` or a `husky` dependency), an already-configured
 * native git hooks directory (`core.hooksPath` pointing at an existing dir), or nothing at all --
 * in which case it bootstraps a plain `.githooks/` directory and, if the repo has a
 * `package.json`, wires a `prepare` script so the hook self-activates on every future
 * `bun install`. A mechanism this script does not recognise (Lefthook, Overcommit,
 * simple-git-hooks, ...) is reported, never overridden -- see docs/adrs/0006-*.md for why.
 *
 * Usage:
 *   bun run $OKF_DOCS_HOME/scripts/install-hooks.ts
 *
 * Idempotent: every write carries the same marker comment, and a second run finds it and does
 * nothing. Never touches an existing hook it did not add itself.
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { loadOkfConfig } from "./okf-validate.ts";

const MARKER = "okf-docs:okf-validate";

function sh(cmd: string[], cwd: string): { stdout: string; exitCode: number } {
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    stdout: proc.stdout.toString().trim(),
    exitCode: proc.exitCode ?? 1,
  };
}

function repoRoot(): string {
  const { stdout, exitCode } = sh(
    ["git", "rev-parse", "--show-toplevel"],
    process.cwd(),
  );
  if (exitCode !== 0) {
    console.error("error: not inside a git repository");
    process.exit(1);
  }
  return stdout;
}

function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function detectIndent(text: string, marker: string, fallback: string): string {
  const line = text.split("\n").find((l) => l.trimStart().startsWith(marker));
  const match = line?.match(/^(\s*)/);
  return match ? match[1] : fallback;
}

type Mechanism =
  | { type: "pre-commit" }
  | { type: "husky" }
  | { type: "native"; dir: string; bootstrap: boolean }
  | { type: "unsupported"; name: string };

function detectMechanism(root: string): Mechanism {
  if (existsSync(join(root, ".pre-commit-config.yaml")))
    return { type: "pre-commit" };

  const pkg = readJson(join(root, "package.json"));
  const hasHusky =
    existsSync(join(root, ".husky")) ||
    Boolean(
      (pkg?.devDependencies as Record<string, unknown> | undefined)?.husky,
    ) ||
    Boolean((pkg?.dependencies as Record<string, unknown> | undefined)?.husky);
  if (hasHusky) return { type: "husky" };

  const { stdout: hooksPath, exitCode } = sh(
    ["git", "config", "--get", "core.hooksPath"],
    root,
  );
  if (exitCode === 0 && hooksPath && existsSync(join(root, hooksPath))) {
    return { type: "native", dir: hooksPath, bootstrap: false };
  }

  if (
    existsSync(join(root, "lefthook.yml")) ||
    existsSync(join(root, "lefthook.yaml"))
  ) {
    return { type: "unsupported", name: "Lefthook" };
  }
  if (existsSync(join(root, ".overcommit.yml"))) {
    return { type: "unsupported", name: "Overcommit" };
  }
  if (pkg?.["simple-git-hooks"]) {
    return { type: "unsupported", name: "simple-git-hooks" };
  }

  return { type: "native", dir: ".githooks", bootstrap: true };
}

/**
 * This script's own filesystem location determines where `okf-validate.ts` lives -- true
 * regardless of which agent target (`.agents/skills`, `.claude/skills`, `.omp/skills`, ...)
 * `npx skills` installed under, so there is no guessing across known install paths.
 */
function entryPath(root: string): string {
  return relative(root, join(import.meta.dir, "okf-validate.ts"));
}

function alreadyInstalled(text: string): boolean {
  return text.includes(MARKER);
}

function shellStage(entry: string): string {
  return [
    "",
    `# --- ${MARKER} (auto-installed by the okf-docs skill's hooks verb) ---`,
    "if command -v bun >/dev/null 2>&1; then",
    `  if ! bun run ${entry}; then`,
    '    echo "OKF validation failed -- see findings above." >&2',
    "    exit 1",
    "  fi",
    "else",
    '  echo "warning: bun not found -- skipping OKF validation" >&2',
    "fi",
    "",
  ].join("\n");
}

/**
 * Appends the stage, but never past a terminal `exit`. A host hook that ends in an
 * unindented `exit` (`exit $fail`) makes everything below it unreachable, so a blind
 * append installs a stage that is never executed -- the hook reports success and
 * validates nothing. Splices immediately before the last top-level `exit` when one
 * exists, and falls back to a plain append when it does not.
 */
export function spliceStage(text: string, stage: string): string {
  const body = text.replace(/\n?$/, "\n");
  const lines = body.split("\n");
  let target = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^exit(\s|$)/.test(lines[i])) {
      target = i;
      break;
    }
  }
  if (target === -1) return body + stage;
  const head = lines.slice(0, target).join("\n").replace(/\n?$/, "\n");
  const tail = lines.slice(target).join("\n");
  return `${head}${stage}\n${tail}`;
}

/**
 * Returns whether a `prepare` assertion is now present -- true only when a `package.json`
 * actually exists to carry it. `installNative`'s success message must not claim the hook
 * "activates automatically on every future `bun install`" when there was nothing to wire it
 * into (see https://github.com/ibaou-dev/skills/issues/5).
 */
function wirePrepareScript(root: string, hooksDir: string): boolean {
  const pkgPath = join(root, "package.json");
  const pkg = readJson(pkgPath);
  if (!pkg) return false;
  const assertion = `git config core.hooksPath ${hooksDir}`;
  if (!pkg.scripts) pkg.scripts = {};
  const scripts = pkg.scripts as Record<string, string>;
  const existing = scripts.prepare;
  if (!existing) scripts.prepare = assertion;
  else if (!existing.includes(assertion))
    scripts.prepare = `${existing} && ${assertion}`;
  else return true;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}

function installPreCommit(
  root: string,
  entry: string,
  bundleRoot: string,
): string {
  const file = join(root, ".pre-commit-config.yaml");
  const text = readFileSync(file, "utf8");
  if (alreadyInstalled(text))
    return "already installed in .pre-commit-config.yaml";

  const indent = detectIndent(text, "- repo:", "  ");
  const hookIndent = `${indent}  `;
  const block = [
    "",
    `${indent}- repo: local  # ${MARKER}`,
    `${hookIndent}hooks:`,
    `${hookIndent}  - id: okf-validate`,
    `${hookIndent}    name: OKF v0.2 Validator`,
    `${hookIndent}    entry: bun run ${entry}`,
    `${hookIndent}    language: system`,
    `${hookIndent}    types: [markdown]`,
    `${hookIndent}    files: ^${bundleRoot}/.*\\.md$`,
    `${hookIndent}    pass_filenames: true`,
    "",
  ].join("\n");
  writeFileSync(file, text.replace(/\n?$/, "\n") + block);

  const pc = sh(["pre-commit", "install"], root);
  if (pc.exitCode === 0)
    return "appended to .pre-commit-config.yaml; ran `pre-commit install`";
  return (
    "appended to .pre-commit-config.yaml; the `pre-commit` binary was not found on PATH -- " +
    "install it and run `pre-commit install` once to activate it for this clone"
  );
}

function installHusky(root: string, entry: string): string {
  const huskyDir = join(root, ".husky");
  mkdirSync(huskyDir, { recursive: true });
  const hookFile = join(huskyDir, "pre-commit");
  if (existsSync(hookFile)) {
    const text = readFileSync(hookFile, "utf8");
    if (alreadyInstalled(text)) return "already installed in .husky/pre-commit";
    writeFileSync(hookFile, spliceStage(text, shellStage(entry)));
  } else {
    writeFileSync(hookFile, shellStage(entry).replace(/^\n/, ""));
  }
  chmodSync(hookFile, 0o755);
  return "wired .husky/pre-commit";
}

function installNative(
  root: string,
  dir: string,
  entry: string,
  bootstrap: boolean,
): string {
  const hooksDir = join(root, dir);
  const hookFile = join(hooksDir, "pre-commit");
  mkdirSync(hooksDir, { recursive: true });

  if (existsSync(hookFile)) {
    const text = readFileSync(hookFile, "utf8");
    if (alreadyInstalled(text)) return `already installed in ${dir}/pre-commit`;
    writeFileSync(hookFile, spliceStage(text, shellStage(entry)));
  } else {
    writeFileSync(hookFile, `#!/bin/sh\nset -eu\n${shellStage(entry)}`);
  }
  chmodSync(hookFile, 0o755);

  if (!bootstrap) return `appended a stage to ${dir}/pre-commit`;

  sh(["git", "config", "core.hooksPath", dir], root);
  const wired = wirePrepareScript(root, dir);
  if (wired) {
    return (
      `created ${dir}/pre-commit and set core.hooksPath -- also wired package.json's "prepare" ` +
      "script so this activates automatically on every future `bun install`"
    );
  }
  return (
    `created ${dir}/pre-commit and set core.hooksPath -- no package.json found, so ` +
    `core.hooksPath must be re-set after a fresh clone (git config core.hooksPath ${dir})`
  );
}

function main(): void {
  const root = repoRoot();
  const { config } = loadOkfConfig(root);
  const entry = entryPath(root);
  const mechanism = detectMechanism(root);

  if (mechanism.type === "unsupported") {
    console.log(
      `Detected ${mechanism.name} managing git hooks in this repository, which this installer ` +
        "does not support automatically.\n\n" +
        "Add the OKF validator as a step yourself -- it needs no other setup:\n\n" +
        `  bun run ${entry}\n\n` +
        `See ${mechanism.name}'s own documentation for how to add a custom step.`,
    );
    process.exit(2);
  }

  const result =
    mechanism.type === "pre-commit"
      ? installPreCommit(root, entry, config.bundleRoot)
      : mechanism.type === "husky"
        ? installHusky(root, entry)
        : installNative(root, mechanism.dir, entry, mechanism.bootstrap);

  console.log(`OKF pre-commit hook: ${result}`);
}

// Guarded like `okf-validate.ts` and `okf-review.ts`: importing a shipped script must never
// run it. Without this, any consumer-side check that merely loads the file dies with a raw
// "not inside a git repository" from deep inside the hook detector.
if (import.meta.main) main();
