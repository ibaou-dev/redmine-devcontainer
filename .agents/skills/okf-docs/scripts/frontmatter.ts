/**
 * Frontmatter reader for OKF v0.2 documents.
 *
 * This is NOT a general YAML implementation — it is a dependency-free reader for exactly the
 * subset of YAML this project's frontmatter blocks use (see
 * skill://okf-docs/references/frontmatter.md). It exists so a skill installed via `npx skills
 * add` into an arbitrary host project never depends on that project resolving the `yaml` npm
 * package.
 *
 * Supported subset:
 *   - A root block mapping of `key: value` pairs (or, defensively, a root block sequence).
 *   - Scalars in three forms:
 *       - plain: a bare token/word, e.g. `0.2`. Never coerced to a number/boolean/null — every
 *         scalar is returned as a string, which is safe because every call site in this project
 *         only ever consumes scalars through `String(value)`.
 *       - single-quoted: `'...'`, with `''` as an escaped literal quote.
 *       - double-quoted: `"..."`, with `\\`, `\"`, `\n`, `\t`, `\r` escapes.
 *     A quoted scalar MAY fold across lines, either closing on the line it opens on or continuing
 *     onto following lines indented deeper than its key — including the form where the value is
 *     moved wholesale onto its own indented line(s). Folding is a normal condition here, not an
 *     exotic one: Prettier runs over this repo with `proseWrap: always` and wraps any
 *     `description:` that outgrows the print width into exactly that shape. Each folded line
 *     break becomes a single space, as real YAML does. An unterminated quote with no deeper
 *     continuation to consume still throws, which is what keeps a genuinely malformed document
 *     landing in the review workflow's `unparseable` bucket instead of being silently repaired.
 *   - Block mappings, nested arbitrarily but used to exactly one level below the root in
 *     practice (`generated: {by, at}`, `verified: {by, at}`): a `key:` header with no inline
 *     value, followed by lines indented deeper than the header, each itself a `key: value` pair.
 *   - Block sequences (`tags`, `aliases`, `cssclasses`, `sources`, ...): one `- item` per line,
 *     plus the empty flow form `key: []`. A sequence item is either a scalar or a compact inline
 *     mapping — `- id: "x"` followed by further `key: value` lines indented to the same column as
 *     `id`, which is how `sources` entries carry `{id, resource, title}`.
 *   - `#` comments: a line whose first non-space character is `#` is dropped entirely. A `#`
 *     that follows whitespace outside any quoted scalar ends a value early (the rest of the line
 *     is a comment). A `#` inside a quoted scalar, or one directly abutting a plain value with no
 *     preceding space, is literal content, matching real YAML.
 *
 * Anything outside that subset — flow mappings/sequences other than `[]`, anchors/aliases, tags,
 * block scalars (`|`, `>`), tab indentation, or a plain scalar that
 * looks like a nested mapping (contains `: `) — throws rather than guessing. A silently wrong
 * parse of a trust-layer field (`verified.by`, `status`) would be far worse than a loud failure,
 * because it could launder an unapproved document to `stable`.
 */

type Line = { indent: number; text: string; lineNo: number };

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$/;
const ITEM_RE = /^-(?:[ \t]+(.*))?$/;
const DISALLOWED_PLAIN_START = /^[{}[\],&*!|>%@`]/;

/** True when `s` carries no real content on its line: blank, or a trailing `#` comment. */
function isEmptyOrComment(s: string): boolean {
  const trimmed = s.trimStart();
  return trimmed === "" || trimmed.startsWith("#");
}

function preprocess(source: string): Line[] {
  const lines: Line[] = [];
  const rawLines = source.split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].replace(/\r$/, "");
    if (line.trim() === "") continue;
    const indentText = line.match(/^[ \t]*/)?.[0] ?? "";
    if (indentText.includes("\t")) {
      throw new Error(
        `frontmatter: tabs are not supported for indentation (line ${i + 1})`,
      );
    }
    const indent = indentText.length;
    const content = line.slice(indent).replace(/[ \t]+$/, "");
    if (content.startsWith("#")) continue; // full-line comment
    lines.push({ indent, text: content, lineNo: i + 1 });
  }
  return lines;
}

function readDoubleQuoted(
  s: string,
  lineNo: number,
): { value: string; rest: string } {
  let out = "";
  let i = 1;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') return { value: out, rest: s.slice(i + 1) };
    if (ch === "\\") {
      const next = s[i + 1];
      if (next === '"') out += '"';
      else if (next === "\\") out += "\\";
      else if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else if (next === "r") out += "\r";
      else {
        throw new Error(
          `frontmatter: unsupported escape sequence '\\${next ?? ""}' at line ${lineNo}`,
        );
      }
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  throw new Error(
    `frontmatter: unterminated double-quoted scalar at line ${lineNo}`,
  );
}

function readSingleQuoted(
  s: string,
  lineNo: number,
): { value: string; rest: string } {
  let out = "";
  let i = 1;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'") {
      if (s[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      return { value: out, rest: s.slice(i + 1) };
    }
    out += ch;
    i++;
  }
  throw new Error(
    `frontmatter: unterminated single-quoted scalar at line ${lineNo}`,
  );
}

/** After a quoted scalar closes, only trailing whitespace and/or a `#` comment may follow. */
function assertNoTrailingJunk(rest: string, lineNo: number): void {
  const trimmed = rest.trimStart();
  if (trimmed !== "" && !trimmed.startsWith("#")) {
    throw new Error(
      `frontmatter: unexpected content '${trimmed}' after quoted scalar at line ${lineNo}`,
    );
  }
}

/** Parse one value token: a quoted scalar, `[]`, or a plain scalar (always returned as a string). */
function parseValue(s: string, lineNo: number): unknown {
  if (s[0] === '"') {
    const { value, rest } = readDoubleQuoted(s, lineNo);
    assertNoTrailingJunk(rest, lineNo);
    return value;
  }
  if (s[0] === "'") {
    const { value, rest } = readSingleQuoted(s, lineNo);
    assertNoTrailingJunk(rest, lineNo);
    return value;
  }
  if (s === "[]") return [];
  if (DISALLOWED_PLAIN_START.test(s)) {
    throw new Error(
      `frontmatter: unsupported YAML construct starting with '${s[0]}' at line ${lineNo}`,
    );
  }
  let hashIdx = -1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === "#" && /\s/.test(s[i - 1])) {
      hashIdx = i;
      break;
    }
  }
  const value = (hashIdx === -1 ? s : s.slice(0, hashIdx)).trimEnd();
  if (value === "")
    throw new Error(`frontmatter: empty value at line ${lineNo}`);
  if (value.includes(": ") || value.endsWith(":")) {
    throw new Error(
      `frontmatter: ambiguous unquoted value '${value}' at line ${lineNo} looks like a nested mapping; quote it`,
    );
  }
  return value;
}

/**
 * Collect a quoted scalar that folds across lines. YAML folds a line break inside a flow scalar
 * to a single space, and `preprocess` has already dropped blank lines, so joining with one space
 * is exact for the shapes this bundle produces. Prettier's `proseWrap: always` emits precisely
 * this form whenever a `description:` outgrows the print width, so folding is a normal condition
 * here, not an exotic one.
 */
function gatherFolded(
  lines: Line[],
  start: number,
  parentIndent: number,
): { text: string; next: number } {
  const parts: string[] = [];
  let pos = start;
  while (
    pos < lines.length &&
    lines[pos].indent > parentIndent &&
    !ITEM_RE.test(lines[pos].text)
  ) {
    parts.push(lines[pos].text);
    pos++;
  }
  return { text: parts.join(" "), next: pos };
}

function parseMapping(
  lines: Line[],
  start: number,
  indent: number,
): [Record<string, unknown>, number] {
  const result: Record<string, unknown> = {};
  let pos = start;
  while (pos < lines.length && lines[pos].indent === indent) {
    const line = lines[pos];
    if (ITEM_RE.test(line.text)) {
      throw new Error(
        `frontmatter: expected 'key: value', found a list item at line ${line.lineNo}`,
      );
    }
    const match = line.text.match(KEY_RE);
    if (!match) {
      throw new Error(
        `frontmatter: could not parse '${line.text}' at line ${line.lineNo}`,
      );
    }
    const key = match[1];
    const rawRest = match[2];
    pos++;
    if (rawRest !== undefined && !isEmptyOrComment(rawRest)) {
      if (rawRest[0] === '"' || rawRest[0] === "'") {
        try {
          result[key] = parseValue(rawRest, line.lineNo);
          continue;
        } catch (err) {
          // A quote that opens on the key line but never closes there is either a fold or a
          // genuine defect. Only a deeper-indented continuation can distinguish them: with no
          // continuation to consume, the original unterminated-quote error is the right answer.
          if (!/unterminated/.test((err as Error).message)) throw err;
          const { text, next } = gatherFolded(lines, pos, indent);
          if (text === "") throw err;
          result[key] = parseValue(`${rawRest} ${text}`, line.lineNo);
          pos = next;
          continue;
        }
      }
      result[key] = parseValue(rawRest, line.lineNo);
      continue;
    }
    if (pos < lines.length && lines[pos].indent > indent) {
      const childIndent = lines[pos].indent;
      if (ITEM_RE.test(lines[pos].text)) {
        const [seq, next] = parseSequence(lines, pos, childIndent);
        result[key] = seq;
        pos = next;
      } else if (!KEY_RE.test(lines[pos].text)) {
        // Deeper, not a list item, not `key: value` — the value was moved wholesale onto its own
        // indented line(s), which is what prettier does to a long scalar.
        const { text, next } = gatherFolded(lines, pos, indent);
        result[key] = parseValue(text, lines[pos].lineNo);
        pos = next;
      } else {
        const [map, next] = parseMapping(lines, pos, childIndent);
        result[key] = map;
        pos = next;
      }
    } else {
      result[key] = null;
    }
  }
  return [result, pos];
}

function parseSequence(
  lines: Line[],
  start: number,
  indent: number,
): [unknown[], number] {
  const result: unknown[] = [];
  let pos = start;
  while (
    pos < lines.length &&
    lines[pos].indent === indent &&
    ITEM_RE.test(lines[pos].text)
  ) {
    const line = lines[pos];
    const match = line.text.match(ITEM_RE);
    if (!match) break;
    const itemText = match[1] ?? "";
    if (isEmptyOrComment(itemText)) {
      throw new Error(
        `frontmatter: sequence item with no inline content at line ${line.lineNo} is not supported`,
      );
    }
    if (KEY_RE.test(itemText)) {
      const fieldIndent = line.indent + (line.text.length - itemText.length);
      const itemLines: Line[] = [
        { indent: fieldIndent, text: itemText, lineNo: line.lineNo },
      ];
      pos++;
      while (
        pos < lines.length &&
        lines[pos].indent === fieldIndent &&
        !ITEM_RE.test(lines[pos].text)
      ) {
        itemLines.push(lines[pos]);
        pos++;
      }
      const [obj] = parseMapping(itemLines, 0, fieldIndent);
      result.push(obj);
    } else {
      result.push(parseValue(itemText, line.lineNo));
      pos++;
    }
  }
  return [result, pos];
}

/** Parse an OKF frontmatter block. Same name and call shape as the `yaml` import it replaces. */
export function parse(source: string): unknown {
  const lines = preprocess(source);
  if (lines.length === 0) return null;
  if (lines[0].indent !== 0) {
    throw new Error(
      `frontmatter: content must start without indentation (line ${lines[0].lineNo})`,
    );
  }
  const [value, pos] = ITEM_RE.test(lines[0].text)
    ? parseSequence(lines, 0, 0)
    : parseMapping(lines, 0, 0);
  if (pos !== lines.length) {
    throw new Error(
      `frontmatter: unexpected indentation at line ${lines[pos].lineNo}`,
    );
  }
  return value;
}
