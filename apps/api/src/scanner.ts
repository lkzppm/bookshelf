import { createHash } from "node:crypto";
import { type Dirent, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Scans a repository for `@implements <CARD-ID>` annotations in code comments
 * and hashes the annotated block so later scans can detect that the
 * implementing code changed (→ the requirement goes stale).
 */

export interface CodeLink {
  file: string;
  line: number;
  hash: string;
  /** Hash the requirement was last reviewed/accepted against. */
  acceptedHash: string;
  snippet: string;
}

export interface ScanHit {
  card: string;
  file: string;
  line: number;
  hash: string;
  snippet: string;
}

const ANNOTATION = /@implements\s+((?:EP|FT|US|CO|ST|AD)-\d{4})/g;
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".turbo",
  "vendor",
  "__pycache__",
  ".venv",
]);
const MAX_FILE_BYTES = 1024 * 1024;
const BLOCK_MAX_LINES = 40;
const SNIPPET_LINES = 8;

function isTextFile(buf: Buffer): boolean {
  const probe = buf.subarray(0, 4096);
  return !probe.includes(0);
}

function* walkFiles(root: string, rel = ""): Generator<string> {
  const dir = path.join(root, rel);
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walkFiles(root, relPath);
    } else if (entry.isFile()) {
      yield relPath;
    }
  }
}

/**
 * The "block" a requirement anchors to: the annotation line plus following
 * lines until a blank line ends the block (or BLOCK_MAX_LINES). Hash covers
 * the block content minus the annotation line itself, so editing nearby
 * comments doesn't count but editing the implementation does.
 */
function extractBlock(lines: string[], annotationIdx: number): { text: string; snippet: string } {
  const block: string[] = [];
  for (let i = annotationIdx + 1; i < lines.length && block.length < BLOCK_MAX_LINES; i++) {
    const line = lines[i] as string;
    if (block.length > 0 && line.trim() === "") break;
    block.push(line.trimEnd());
  }
  const text = block.join("\n");
  const snippetSrc = block.filter((l) => l.trim() !== "").slice(0, SNIPPET_LINES);
  return { text, snippet: snippetSrc.join("\n") };
}

export function scanRepo(repoPath: string): { hits: ScanHit[]; filesScanned: number } {
  const hits: ScanHit[] = [];
  let filesScanned = 0;

  for (const rel of walkFiles(repoPath)) {
    let buf: Buffer;
    try {
      const st = statSync(path.join(repoPath, rel));
      if (st.size > MAX_FILE_BYTES) continue;
      buf = readFileSync(path.join(repoPath, rel));
    } catch {
      continue;
    }
    if (!isTextFile(buf)) continue;
    filesScanned++;

    const content = buf.toString("utf8");
    if (!content.includes("@implements")) continue;
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      for (const m of line.matchAll(ANNOTATION)) {
        const { text, snippet } = extractBlock(lines, idx);
        hits.push({
          card: m[1] as string,
          file: rel,
          line: idx + 1,
          hash: createHash("sha256").update(text).digest("hex").slice(0, 16),
          snippet,
        });
      }
    });
  }

  return { hits, filesScanned };
}

/**
 * Merge fresh scan hits with the previous trace: `acceptedHash` survives so a
 * changed block shows as stale until a human reviews it. New links start
 * accepted (annotating code is itself the claim that it implements the card).
 */
export function mergeLinks(
  previous: Record<string, CodeLink[]>,
  hits: ScanHit[],
): Record<string, CodeLink[]> {
  const next: Record<string, CodeLink[]> = {};
  const prevByKey = new Map<string, CodeLink[]>();
  for (const [card, links] of Object.entries(previous)) {
    for (const link of links) {
      const key = `${card}|${link.file}`;
      const list = prevByKey.get(key) ?? [];
      list.push(link);
      prevByKey.set(key, list);
    }
  }

  for (const hit of hits) {
    const prevList = prevByKey.get(`${hit.card}|${hit.file}`);
    const prev = prevList?.shift();
    const link: CodeLink = {
      file: hit.file,
      line: hit.line,
      hash: hit.hash,
      acceptedHash: prev ? prev.acceptedHash : hit.hash,
      snippet: hit.snippet,
    };
    (next[hit.card] ??= []).push(link);
  }
  return next;
}

export type RequirementState = "checked" | "stale" | "unchecked";

export function cardState(links: CodeLink[] | undefined): RequirementState {
  if (!links || links.length === 0) return "unchecked";
  return links.every((l) => l.hash === l.acceptedHash) ? "checked" : "stale";
}
