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

export const TYPE_COLORS: Record<CardType, string> = {
  epic: "#8b5cf6",
  feature: "#3b82f6",
  story: "#10b981",
  concept: "#f59e0b",
  standard: "#ef4444",
  adr: "#64748b",
};

export const STATUS_COLORS: Record<CardStatus, string> = {
  draft: "#9ca3af",
  review: "#f59e0b",
  approved: "#3b82f6",
  building: "#8b5cf6",
  done: "#10b981",
  verified: "#14b8a6",
  archived: "#6b7280",
};

export const EDGE_STYLES: Record<GraphEdge["type"], { stroke: string; dash?: string; label: string }> = {
  parent: { stroke: "#94a3b8", label: "parent" },
  "depends-on": { stroke: "#ef4444", dash: "6 3", label: "depends on" },
  "relates-to": { stroke: "#3b82f6", dash: "2 3", label: "relates to" },
  supersedes: { stroke: "#a78bfa", dash: "8 4", label: "supersedes" },
  wiki: { stroke: "#64748b", dash: "1 4", label: "mentions" },
};
