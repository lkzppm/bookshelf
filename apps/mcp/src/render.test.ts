import { describe, expect, it } from "vitest";
import type { Card, ShelfGraph } from "./api.js";
import { renderCard, renderShelfMap, renderWalk, walkGraph } from "./render.js";

const cards: Card[] = [
  mk("EP-0001", "epic", "Task management"),
  mk("FT-0001", "feature", "Task CRUD", { parent: "EP-0001" }),
  mk("US-0001", "story", "Create a task", { parent: "FT-0001" }),
  mk("US-0002", "story", "Complete a task", { parent: "FT-0001", "depends-on": ["US-0001"] }),
  mk("ST-0001", "standard", "API conventions", {}, "always"),
];

const graph: ShelfGraph = {
  nodes: cards.map((c) => ({ id: c.id, type: c.type, title: c.title, status: c.status })),
  edges: [
    { from: "FT-0001", to: "EP-0001", type: "parent" },
    { from: "US-0001", to: "FT-0001", type: "parent" },
    { from: "US-0002", to: "FT-0001", type: "parent" },
    { from: "US-0002", to: "US-0001", type: "depends-on" },
  ],
};

function mk(
  id: string,
  type: string,
  title: string,
  links: Partial<Card["links"]> = {},
  load?: string,
): Card {
  return {
    id,
    type,
    title,
    status: "draft",
    tags: [],
    ...(load ? { load } : {}),
    links: { "depends-on": [], "relates-to": [], supersedes: [], ...links },
    created: "2026-07-17",
    updated: "2026-07-17",
    body: `Body of ${id}`,
    tokens: 100,
  };
}

describe("shelf map", () => {
  it("renders hierarchy indentation and knowledge layer", () => {
    const map = renderShelfMap("demo", cards, graph);
    expect(map).toContain("- EP-0001");
    expect(map).toContain("  - FT-0001");
    expect(map).toContain("    - US-0001");
    expect(map).toContain("load:always");
    expect(map).toContain("US-0002 —depends-on→ US-0001");
  });
});

describe("walk", () => {
  it("walks outgoing edges to the requested depth", () => {
    const steps = walkGraph(graph, "US-0002", "out", undefined, 2);
    const targets = steps.map((s) => `${s.to}@d${s.depth}`);
    expect(targets).toContain("FT-0001@d1");
    expect(targets).toContain("US-0001@d1");
    expect(targets).toContain("EP-0001@d2");
  });

  it("walks incoming edges (who points at me)", () => {
    const steps = walkGraph(graph, "FT-0001", "in", undefined, 1);
    expect(steps.map((s) => s.to).sort()).toEqual(["US-0001", "US-0002"]);
  });

  it("suppresses back-edges toward shallower nodes", () => {
    const steps = walkGraph(graph, "US-0002", "both", undefined, 2);
    expect(steps.some((s) => s.to === "US-0002")).toBe(false);
  });

  it("filters by edge type", () => {
    const steps = walkGraph(graph, "US-0002", "out", ["depends-on"], 2);
    expect(steps.map((s) => s.to)).toEqual(["US-0001"]);
  });

  it("renders walk lines with node info", () => {
    const steps = walkGraph(graph, "US-0002", "both", undefined, 1);
    const text = renderWalk("demo", "US-0002", steps, graph, 1);
    expect(text).toContain("US-0002 —parent→ FT-0001 [feature, draft] Task CRUD");
  });
});

describe("card", () => {
  it("renders body plus incoming and outgoing connections", () => {
    const ft = cards.find((c) => c.id === "FT-0001") as Card;
    const text = renderCard("demo", ft, graph);
    expect(text).toContain("Body of FT-0001");
    expect(text).toContain("—parent→ EP-0001");
    expect(text).toContain("←parent— US-0001");
  });
});
