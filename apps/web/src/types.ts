export const CARD_TYPES = ["epic", "feature", "story", "concept", "standard", "adr"] as const;
export type CardType = (typeof CARD_TYPES)[number];

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
  tags: string[];
  load?: "always" | "auto" | "manual";
  links: CardLinks;
  created: string;
  updated: string;
  body: string;
  tokens: number;
}

export interface ShelfMeta {
  slug: string;
  name: string;
  description: string;
  created: string;
  cardCount: number;
  parseErrors: string[];
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
  type: "parent" | "depends-on" | "relates-to" | "supersedes" | "wiki";
}

export interface ShelfGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CardInput {
  type: CardType;
  title: string;
  description?: string;
  status?: CardStatus;
  owner?: string;
  tags?: string[];
  load?: "always" | "auto" | "manual";
  links?: Partial<CardLinks>;
  body?: string;
}

/** Azure DevOps work-item palette (epic orange, feature purple, story azure). */
export const TYPE_COLORS: Record<CardType, string> = {
  epic: "#f58b1f",
  feature: "#a374d8",
  story: "#00a8e8",
  concept: "#00b294",
  standard: "#e8555b",
  adr: "#8a8886",
};

export const STATUS_COLORS: Record<CardStatus, string> = {
  draft: "#8a8886",
  review: "#f2cb1d",
  approved: "#0078d4",
  building: "#a374d8",
  done: "#54a254",
  verified: "#00b294",
  archived: "#605e5c",
};

/** Chip text color that keeps contrast on each status color. */
export function statusTextColor(status: CardStatus): string {
  return status === "review" ? "#1b1a19" : "#fff";
}

export const EDGE_STYLES: Record<GraphEdge["type"], { stroke: string; dash?: string; label: string }> = {
  parent: { stroke: "#7a8394", label: "parent" },
  "depends-on": { stroke: "#e8555b", dash: "6 3", label: "depends on" },
  "relates-to": { stroke: "#0078d4", dash: "2 3", label: "relates to" },
  supersedes: { stroke: "#a374d8", dash: "8 4", label: "supersedes" },
  wiki: { stroke: "#8a8886", dash: "1 4", label: "mentions" },
};
