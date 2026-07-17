import { firstParagraph } from "./parser.js";
import { estimateTokens } from "./tokens.js";
import { wikiLinks } from "./graph.js";
import { KNOWLEDGE_TYPES, type Card, type ContextPack, type ContextPackSection, type PackMode } from "./types.js";

export interface ContextPackOptions {
  budget?: number;
  shelfName?: string;
}

interface Candidate {
  card: Card;
  mode: PackMode;
  reason: string;
}

const DEFAULT_BUDGET = 8000;

/**
 * Assemble the context an agent needs to work on a card, by priority-ordered
 * graph traversal under a token budget:
 *   root (full) → parent chain (full) → related knowledge (full) →
 *   always-on standards (full) → dependencies (summary) → children (summary) →
 *   wiki-linked (summary).
 * Greedy fill: sections that don't fit are skipped (listed as omitted), later
 * smaller ones may still fit. The root is always included.
 */
export function buildContextPack(
  cards: Card[],
  rootId: string,
  opts: ContextPackOptions = {},
): ContextPack {
  const budget = opts.budget ?? DEFAULT_BUDGET;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const root = byId.get(rootId);
  if (!root) throw new Error(`card not found: ${rootId}`);

  const candidates: Candidate[] = [];
  const queued = new Set<string>();
  const add = (card: Card | undefined, mode: PackMode, reason: string) => {
    if (!card || queued.has(card.id)) return;
    queued.add(card.id);
    candidates.push({ card, mode, reason });
  };

  add(root, "full", "root");

  // parent chain, walking up (cycle-guarded)
  let cur = root.links.parent ? byId.get(root.links.parent) : undefined;
  while (cur && !queued.has(cur.id)) {
    add(cur, "full", "parent chain");
    cur = cur.links.parent ? byId.get(cur.links.parent) : undefined;
  }

  for (const id of root.links["relates-to"]) {
    const c = byId.get(id);
    add(c, c && KNOWLEDGE_TYPES.includes(c.type) ? "full" : "summary", "related");
  }

  for (const c of cards) {
    if (c.load === "always" && KNOWLEDGE_TYPES.includes(c.type)) {
      add(c, "full", "always-on standard");
    }
  }

  for (const id of root.links["depends-on"]) add(byId.get(id), "summary", "dependency");

  if (root.type === "epic" || root.type === "feature") {
    for (const c of cards) {
      if (c.links.parent === root.id) add(c, "summary", "child");
    }
  }

  for (const id of wikiLinks(root.body)) add(byId.get(id), "summary", "mentioned");

  // greedy fill under budget — root always included
  const included: ContextPackSection[] = [];
  const omitted: string[] = [];
  const sections: string[] = [];
  let total = 0;

  for (const { card, mode, reason } of candidates) {
    const text = renderSection(card, mode, reason);
    const tokens = estimateTokens(text);
    if (card.id !== rootId && total + tokens > budget) {
      omitted.push(card.id);
      continue;
    }
    sections.push(text);
    included.push({ id: card.id, mode, reason, tokens });
    total += tokens;
  }

  const shelfLabel = opts.shelfName ? ` · shelf: ${opts.shelfName}` : "";
  const header = [
    `# Context pack: ${root.id} — ${root.title}`,
    `> ${included.length} cards · ~${total} tokens (budget ${budget})${shelfLabel}`,
    `> included: ${included.map((s) => `${s.id}(${s.mode})`).join(", ")}`,
    omitted.length > 0
      ? `> omitted for budget: ${omitted.join(", ")} — fetch individually via get_card`
      : `> nothing omitted`,
  ].join("\n");

  return {
    rootId,
    markdown: `${header}\n\n${sections.join("\n\n")}\n`,
    included,
    tokens: total,
    budget,
    truncated: omitted.length > 0,
  };
}

function renderSection(card: Card, mode: PackMode, reason: string): string {
  const meta = [
    `type: ${card.type}`,
    `status: ${card.status}`,
    card.updated ? `updated: ${card.updated}` : "",
    `included: ${mode}`,
    `why: ${reason}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const content =
    mode === "full" ? card.body : card.description || firstParagraph(card.body) || "(no summary)";

  return `---\n### [${card.id}] ${card.title}\n_${meta}_\n\n${content}`;
}
