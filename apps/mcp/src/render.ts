import type { Card, GraphEdge, SearchHit, ShelfGraph, ShelfMeta } from "./api.js";

/**
 * Renderers produce compact, agent-friendly markdown. Every output starts with
 * a pointer line so agents that truncate long content keep the way back
 * (which tool to call next, from where).
 */

const KNOWLEDGE = new Set(["concept", "standard", "adr"]);

export function renderShelves(shelves: ShelfMeta[]): string {
  if (shelves.length === 0) {
    return "No shelves yet. Create one in the bookshelf UI (or POST /api/shelves).";
  }
  const lines = shelves.map(
    (s) =>
      `- **${s.slug}** — ${s.name}${s.description ? `: ${s.description}` : ""} (${s.cardCount} cards${s.parseErrors.length > 0 ? `, ${s.parseErrors.length} parse errors` : ""})`,
  );
  return [
    `# Shelves (${shelves.length})`,
    `> Next: get_shelf_map(shelf) to orient before reading cards.`,
    "",
    ...lines,
  ].join("\n");
}

export function renderShelfMap(shelf: string, cards: Card[], graph: ShelfGraph): string {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const childrenOf = new Map<string, Card[]>();
  const roots: Card[] = [];

  for (const c of cards) {
    if (KNOWLEDGE.has(c.type)) continue;
    const parent = c.links.parent ? byId.get(c.links.parent) : undefined;
    if (parent) {
      const list = childrenOf.get(parent.id) ?? [];
      list.push(c);
      childrenOf.set(parent.id, list);
    } else {
      roots.push(c);
    }
  }

  const line = (c: Card, indent: number) => {
    const load = c.load ? `, load:${c.load}` : "";
    const desc = c.description ? ` — ${c.description}` : "";
    return `${"  ".repeat(indent)}- ${c.id} [${c.type}, ${c.status}${load}]${desc ? ` **${c.title}**${desc}` : ` **${c.title}**`} (~${c.tokens} tok)`;
  };

  const tree: string[] = [];
  const walk = (c: Card, depth: number) => {
    tree.push(line(c, depth));
    for (const child of (childrenOf.get(c.id) ?? []).sort((a, b) => a.id.localeCompare(b.id))) {
      walk(child, depth + 1);
    }
  };
  for (const root of roots.sort((a, b) => a.id.localeCompare(b.id))) walk(root, 0);

  const knowledge = cards
    .filter((c) => KNOWLEDGE.has(c.type))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => line(c, 0));

  const crossEdges = graph.edges.filter((e) => e.type !== "parent");
  const crossLines = crossEdges.map((e) => `- ${e.from} —${e.type}→ ${e.to}`);

  return [
    `# Shelf map: ${shelf} (${cards.length} cards)`,
    `> Next: get_context_pack(card_id) to start working on a card; walk_graph(card_id) to explore relations; get_card(card_id) to read one.`,
    "",
    "## Hierarchy (epic → feature → story)",
    ...(tree.length > 0 ? tree : ["(no product cards yet)"]),
    "",
    "## Knowledge layer (concepts, standards, ADRs)",
    ...(knowledge.length > 0 ? knowledge : ["(none)"]),
    "",
    `## Cross-links (${crossEdges.length})`,
    ...(crossLines.length > 0 ? crossLines : ["(none)"]),
  ].join("\n");
}

export function renderSearch(shelf: string, q: string, hits: SearchHit[]): string {
  if (hits.length === 0) {
    return `No results for "${q}" in shelf ${shelf}. Try broader terms or get_shelf_map(${shelf}).`;
  }
  const lines = hits.map(
    (h) => `- ${h.id} [${h.type}, ${h.status}] **${h.title}** — ${h.snippet.replace(/\n+/g, " ")}`,
  );
  return [
    `# Search "${q}" in ${shelf}: ${hits.length} hits`,
    `> Next: get_card(id) for full content, or get_context_pack(id) to start working on one.`,
    "",
    ...lines,
  ].join("\n");
}

export interface WalkStep {
  from: string;
  to: string;
  type: string;
  direction: "out" | "in";
  depth: number;
}

export function walkGraph(
  graph: ShelfGraph,
  fromId: string,
  direction: "out" | "in" | "both",
  edgeTypes: string[] | undefined,
  depth: number,
  nodeCap = 50,
): WalkStep[] {
  const steps: WalkStep[] = [];
  // depth each node was first reached at — suppresses noisy back-edges toward
  // shallower nodes (e.g. a d2 edge pointing back at the origin) while keeping
  // genuine cross-links between same-depth branches
  const seenAt = new Map<string, number>([[fromId, 0]]);
  let frontier = [fromId];

  for (let d = 1; d <= depth && frontier.length > 0 && seenAt.size < nodeCap; d++) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      for (const e of graph.edges) {
        if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(e.type)) continue;
        const matchOut = (direction === "out" || direction === "both") && e.from === nodeId;
        const matchIn = (direction === "in" || direction === "both") && e.to === nodeId;
        if (!matchOut && !matchIn) continue;
        const other = matchOut ? e.to : e.from;
        if ((seenAt.get(other) ?? Number.POSITIVE_INFINITY) < d) continue;
        steps.push({ from: nodeId, to: other, type: e.type, direction: matchOut ? "out" : "in", depth: d });
        if (!seenAt.has(other) && seenAt.size < nodeCap) {
          seenAt.set(other, d);
          next.push(other);
        }
      }
    }
    frontier = next;
  }
  return steps;
}

export function renderWalk(
  shelf: string,
  fromId: string,
  steps: WalkStep[],
  graph: ShelfGraph,
  depth: number,
): string {
  const nodeInfo = new Map(graph.nodes.map((n) => [n.id, n]));
  if (steps.length === 0) {
    return `# Walk from ${fromId} (${shelf})\nNo connected cards within depth ${depth}. Try direction "both" or get_shelf_map(${shelf}).`;
  }
  const lines = steps.map((s) => {
    const target = nodeInfo.get(s.to);
    const label = target ? ` [${target.type}, ${target.status}] ${target.title}` : "";
    const arrow = s.direction === "out" ? `—${s.type}→` : `←${s.type}—`;
    return `- (d${s.depth}) ${s.from} ${arrow} ${s.to}${label}`;
  });
  return [
    `# Walk from ${fromId} in ${shelf} (depth ${depth}, ${steps.length} edges)`,
    `> Next: get_card(id) to read any of these; get_context_pack(${fromId}) for a ready-made working set.`,
    "",
    ...lines,
  ].join("\n");
}

export function renderCard(shelf: string, card: Card, graph: ShelfGraph): string {
  const nodeInfo = new Map(graph.nodes.map((n) => [n.id, n]));
  const fmt = (e: GraphEdge, dir: "out" | "in") => {
    const otherId = dir === "out" ? e.to : e.from;
    const other = nodeInfo.get(otherId);
    const arrow = dir === "out" ? `—${e.type}→` : `←${e.type}—`;
    return `- ${arrow} ${otherId}${other ? ` [${other.type}, ${other.status}] ${other.title}` : ""}`;
  };
  const outgoing = graph.edges.filter((e) => e.from === card.id).map((e) => fmt(e, "out"));
  const incoming = graph.edges.filter((e) => e.to === card.id).map((e) => fmt(e, "in"));

  const meta = [
    `type: ${card.type}`,
    `status: ${card.status}`,
    card.owner ? `owner: ${card.owner}` : "",
    card.tags.length > 0 ? `tags: ${card.tags.join(", ")}` : "",
    card.load ? `load: ${card.load}` : "",
    `updated: ${card.updated}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    `# [${card.id}] ${card.title} (${shelf})`,
    `> ${meta}`,
    `> Next: walk_graph(${card.id}) to explore further; get_context_pack(${card.id}) before implementing.`,
    "",
    card.body || "(empty body)",
    "",
    "## Connections",
    ...(outgoing.length > 0 ? ["**Outgoing:**", ...outgoing] : ["**Outgoing:** none"]),
    ...(incoming.length > 0 ? ["**Incoming:**", ...incoming] : ["**Incoming:** none"]),
  ].join("\n");
}
