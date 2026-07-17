import { typeFromId } from "./ids.js";
import type { Card, GraphEdge, ShelfGraph, ShelfIssue } from "./types.js";

export const WIKI_LINK = /\[\[([A-Z]{2}-\d{4})\]\]/g;

/** Extract [[ID]] wiki-links from a card body. */
export function wikiLinks(body: string): string[] {
  return [...body.matchAll(WIKI_LINK)].map((m) => m[1] as string);
}

/** Build the typed graph for a set of cards. Unknown targets are skipped (surfaced by validateShelf). */
export function buildGraph(cards: Card[]): ShelfGraph {
  const known = new Set(cards.map((c) => c.id));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const push = (from: string, to: string, type: GraphEdge["type"]) => {
    const key = `${from}|${to}|${type}`;
    if (!known.has(to) || seen.has(key) || from === to) return;
    seen.add(key);
    edges.push({ from, to, type });
  };

  for (const card of cards) {
    if (card.links.parent) push(card.id, card.links.parent, "parent");
    for (const to of card.links["depends-on"]) push(card.id, to, "depends-on");
    for (const to of card.links["relates-to"]) push(card.id, to, "relates-to");
    for (const to of card.links.supersedes) push(card.id, to, "supersedes");
    for (const to of wikiLinks(card.body)) {
      const key = (t: GraphEdge["type"]) => `${card.id}|${to}|${t}`;
      const typed =
        seen.has(key("parent")) ||
        seen.has(key("depends-on")) ||
        seen.has(key("relates-to")) ||
        seen.has(key("supersedes"));
      if (!typed) push(card.id, to, "wiki");
    }
  }

  return {
    nodes: cards.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      status: c.status,
      tags: c.tags,
      tokens: c.tokens,
    })),
    edges,
  };
}

/** Structural lints: duplicate ids, broken refs, hierarchy rules, parent cycles. */
export function validateShelf(cards: Card[]): ShelfIssue[] {
  const issues: ShelfIssue[] = [];
  const byId = new Map<string, Card>();

  for (const card of cards) {
    if (byId.has(card.id)) {
      issues.push({
        cardId: card.id,
        level: "error",
        message: `duplicate id (files: ${byId.get(card.id)?.file}, ${card.file})`,
      });
    } else {
      byId.set(card.id, card);
    }
    const expected = typeFromId(card.id);
    if (expected && expected !== card.type) {
      issues.push({
        cardId: card.id,
        level: "error",
        message: `id prefix says "${expected}" but type is "${card.type}"`,
      });
    }
  }

  for (const card of cards) {
    const refs = [
      ...(card.links.parent ? [card.links.parent] : []),
      ...card.links["depends-on"],
      ...card.links["relates-to"],
      ...card.links.supersedes,
      ...wikiLinks(card.body),
    ];
    for (const ref of refs) {
      if (!byId.has(ref)) {
        issues.push({ cardId: card.id, level: "error", message: `broken link → ${ref}` });
      }
    }

    if (card.type === "story" || card.type === "feature") {
      const wantParent = card.type === "story" ? "feature" : "epic";
      const parent = card.links.parent ? byId.get(card.links.parent) : undefined;
      if (!card.links.parent) {
        issues.push({ cardId: card.id, level: "warning", message: `${card.type} has no parent` });
      } else if (parent && parent.type !== wantParent) {
        issues.push({
          cardId: card.id,
          level: "error",
          message: `parent of a ${card.type} must be a ${wantParent}, got ${parent.type}`,
        });
      }
    }

    // parent-chain cycle guard
    const visited = new Set<string>([card.id]);
    let cur = card.links.parent ? byId.get(card.links.parent) : undefined;
    while (cur) {
      if (visited.has(cur.id)) {
        issues.push({ cardId: card.id, level: "error", message: "parent cycle detected" });
        break;
      }
      visited.add(cur.id);
      cur = cur.links.parent ? byId.get(cur.links.parent) : undefined;
    }
  }

  return issues;
}
