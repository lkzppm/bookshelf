export const CARD_TYPES = ["epic", "feature", "story", "concept", "standard", "adr"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const PRODUCT_TYPES: readonly CardType[] = ["epic", "feature", "story"];
export const KNOWLEDGE_TYPES: readonly CardType[] = ["concept", "standard", "adr"];

export const CARD_STATUSES = [
  "draft",
  "review",
  "approved",
  "building",
  "done",
  "verified",
  "archived",
] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const LOAD_MODES = ["always", "auto", "manual"] as const;
export type LoadMode = (typeof LOAD_MODES)[number];

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EDGE_TYPES = ["parent", "depends-on", "relates-to", "supersedes", "wiki"] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export interface CardLinks {
  parent?: string;
  "depends-on": string[];
  "relates-to": string[];
  supersedes: string[];
}

export interface Card {
  id: string;
  type: CardType;
  title: string;
  status: CardStatus;
  description?: string;
  owner?: string;
  priority?: Priority;
  /** Story points / effort estimate. */
  effort?: number;
  /** Sprint / iteration label, e.g. "2026-Q3 Sprint 4". */
  iteration?: string;
  /** Due date, YYYY-MM-DD. */
  due?: string;
  tags: string[];
  load?: LoadMode;
  links: CardLinks;
  created: string;
  updated: string;
  /** Markdown body without frontmatter. */
  body: string;
  /** Filename relative to the shelf's cards/ directory. */
  file: string;
  /** Estimated tokens for the full card (frontmatter + body). */
  tokens: number;
}

export interface GraphNode {
  id: string;
  type: CardType;
  title: string;
  status: CardStatus;
  tags: string[];
  tokens: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface ShelfGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ShelfIssue {
  cardId: string;
  level: "error" | "warning";
  message: string;
}

export type PackMode = "full" | "summary";

export interface ContextPackSection {
  id: string;
  mode: PackMode;
  reason: string;
  tokens: number;
}

export interface ContextPack {
  rootId: string;
  markdown: string;
  included: ContextPackSection[];
  tokens: number;
  budget: number;
  truncated: boolean;
}
