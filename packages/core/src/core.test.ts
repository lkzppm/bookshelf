import { describe, expect, it } from "vitest";
import { buildContextPack } from "./contextPack.js";
import { buildGraph, validateShelf, wikiLinks } from "./graph.js";
import { cardFilename, nextId, typeFromId } from "./ids.js";
import { firstParagraph, parseCard, serializeCard } from "./parser.js";
import { sampleShelfCards } from "./seed.js";
import type { Card } from "./types.js";

function parseSeed(): Card[] {
  return sampleShelfCards().map(({ file, content }) => {
    const { card, error } = parseCard(file, content);
    if (!card) throw new Error(error);
    return card;
  });
}

describe("ids", () => {
  it("allocates the next id per type", () => {
    expect(nextId("story", ["US-0001", "US-0007", "FT-0002"])).toBe("US-0008");
    expect(nextId("epic", [])).toBe("EP-0001");
  });

  it("maps id prefix to type and builds filenames", () => {
    expect(typeFromId("FT-0012")).toBe("feature");
    expect(typeFromId("XX-0001")).toBeUndefined();
    expect(cardFilename("US-0001", "Créate a Task!")).toBe("US-0001-create-a-task.md");
  });
});

describe("parser", () => {
  it("round-trips a card through serialize + parse", () => {
    const [card] = parseSeed();
    const raw = serializeCard(card as Card);
    const again = parseCard((card as Card).file, raw).card;
    expect(again?.id).toBe(card?.id);
    expect(again?.links).toEqual(card?.links);
    expect(again?.body.trim()).toBe(card?.body.trim());
  });

  it("rejects invalid frontmatter with a useful message", () => {
    const { error } = parseCard("bad.md", "---\nid: X-1\ntype: nope\n---\nbody");
    expect(error).toContain("bad.md");
  });

  it("extracts the first non-heading paragraph", () => {
    expect(firstParagraph("# Title\n\nreal content here\n\nmore")).toBe("real content here");
  });
});

describe("graph", () => {
  const cards = parseSeed();

  it("finds wiki links in bodies", () => {
    const ft1 = cards.find((c) => c.id === "FT-0001");
    expect(wikiLinks(ft1?.body ?? "")).toEqual(["CO-0001"]);
  });

  it("builds typed edges without duplicating wiki links over typed ones", () => {
    const graph = buildGraph(cards);
    expect(graph.nodes).toHaveLength(cards.length);
    const kinds = (from: string, to: string) =>
      graph.edges.filter((e) => e.from === from && e.to === to).map((e) => e.type);
    expect(kinds("FT-0001", "EP-0001")).toEqual(["parent"]);
    expect(kinds("FT-0002", "FT-0001")).toEqual(["depends-on"]);
    // FT-0001 relates-to CO-0001 AND mentions [[CO-0001]] — typed edge wins, no wiki dup
    expect(kinds("FT-0001", "CO-0001")).toEqual(["relates-to"]);
  });

  it("validates a clean shelf with no errors", () => {
    const errors = validateShelf(cards).filter((i) => i.level === "error");
    expect(errors).toEqual([]);
  });

  it("flags broken links and wrong parent types", () => {
    const broken = cards.map((c) =>
      c.id === "US-0001" ? { ...c, links: { ...c.links, parent: "EP-0001" } } : c,
    );
    const issues = validateShelf(broken);
    expect(issues.some((i) => i.message.includes("must be a feature"))).toBe(true);
  });
});

describe("context pack", () => {
  const cards = parseSeed();

  it("includes root, parent chain, always-standards; children as summaries", () => {
    const pack = buildContextPack(cards, "US-0003");
    const ids = pack.included.map((s) => s.id);
    expect(ids[0]).toBe("US-0003");
    expect(ids).toContain("FT-0002"); // parent
    expect(ids).toContain("EP-0001"); // grandparent
    expect(ids).toContain("ST-0001"); // load: always
    const dep = pack.included.find((s) => s.id === "US-0001");
    expect(dep?.mode).toBe("summary"); // dependency comes summarized
    expect(pack.truncated).toBe(false);
    expect(pack.markdown).toContain("# Context pack: US-0003");
  });

  it("respects the token budget and reports omissions", () => {
    const pack = buildContextPack(cards, "US-0003", { budget: 300 });
    expect(pack.tokens).toBeLessThanOrEqual(350); // root always included even near budget
    expect(pack.truncated).toBe(true);
    expect(pack.markdown).toContain("omitted for budget");
  });

  it("throws on unknown root", () => {
    expect(() => buildContextPack(cards, "US-9999")).toThrow("not found");
  });
});
