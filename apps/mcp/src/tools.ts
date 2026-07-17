import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient, ApiError } from "./api.js";
import {
  renderCard,
  renderSearch,
  renderShelfMap,
  renderShelves,
  renderWalk,
  walkGraph,
} from "./render.js";

const EDGE_TYPES = ["parent", "depends-on", "relates-to", "supersedes", "wiki"] as const;
const CARD_TYPES = ["epic", "feature", "story", "concept", "standard", "adr"] as const;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    const prefix = err instanceof ApiError ? "bookshelf api error" : "unexpected error";
    return {
      content: [{ type: "text", text: `${prefix}: ${(err as Error).message}` }],
      isError: true,
    };
  }
}

export function buildMcpServer(api: ApiClient): McpServer {
  const server = new McpServer({ name: "bookshelf", version: "0.1.0" });

  server.registerTool(
    "list_shelves",
    {
      title: "List shelves",
      description:
        "Start here. Lists every spec shelf (project space) in bookshelf with its card count. " +
        "A shelf holds connected spec cards: epics, features, user stories, concepts, standards, ADRs.",
      inputSchema: {},
    },
    () => guard(async () => ok(renderShelves(await api.listShelves()))),
  );

  server.registerTool(
    "get_shelf_map",
    {
      title: "Get shelf map",
      description:
        "Cheap orientation map of one shelf: the epic→feature→story hierarchy, the knowledge layer " +
        "(concepts/standards/ADRs), and all cross-links — ids, statuses, one-line descriptions, token sizes, " +
        "but no card bodies. Call this before deciding which cards to read.",
      inputSchema: { shelf: z.string().describe("shelf slug, from list_shelves") },
    },
    ({ shelf }) =>
      guard(async () => {
        const [cards, graph] = await Promise.all([api.getCards(shelf), api.getGraph(shelf)]);
        return ok(renderShelfMap(shelf, cards, graph));
      }),
  );

  server.registerTool(
    "search_cards",
    {
      title: "Search cards",
      description:
        "Full-text search over card titles, descriptions, bodies and tags in one shelf. " +
        "Returns ids + snippets (not full cards) — follow up with get_card or get_context_pack.",
      inputSchema: {
        shelf: z.string().describe("shelf slug"),
        query: z.string().describe("search terms"),
        type: z.enum(CARD_TYPES).optional().describe("filter by card type"),
      },
    },
    ({ shelf, query, type }) =>
      guard(async () => ok(renderSearch(shelf, query, await api.search(shelf, query, type)))),
  );

  server.registerTool(
    "walk_graph",
    {
      title: "Walk the knowledge graph",
      description:
        "Navigate the spec graph from a card WITHOUT reading bodies: lists connected cards up to a depth " +
        "along typed edges (parent, depends-on, relates-to, supersedes, wiki), each with title/type/status. " +
        "Use it to discover what's related before spending context on full cards. " +
        "direction 'out' follows the card's own links, 'in' finds cards pointing at it (e.g. an epic's children, " +
        "a standard's consumers), 'both' explores every connection.",
      inputSchema: {
        shelf: z.string().describe("shelf slug"),
        from: z.string().describe("card id to start from, e.g. US-0003"),
        direction: z.enum(["out", "in", "both"]).default("both").describe("edge direction to follow"),
        edge_types: z
          .array(z.enum(EDGE_TYPES))
          .optional()
          .describe("only follow these edge types (default: all)"),
        depth: z.number().int().min(1).max(3).default(2).describe("hops to traverse (1-3)"),
      },
    },
    ({ shelf, from, direction, edge_types, depth }) =>
      guard(async () => {
        const graph = await api.getGraph(shelf);
        if (!graph.nodes.some((n) => n.id === from)) {
          throw new ApiError(`card not found: ${from} (use get_shelf_map or search_cards first)`);
        }
        const steps = walkGraph(graph, from, direction, edge_types, depth);
        return ok(renderWalk(shelf, from, steps, graph, depth));
      }),
  );

  server.registerTool(
    "get_card",
    {
      title: "Get card",
      description:
        "Full content of one spec card (markdown body + metadata) plus every incoming and outgoing " +
        "connection with titles — so you always see the onward paths without another lookup.",
      inputSchema: {
        shelf: z.string().describe("shelf slug"),
        id: z.string().describe("card id, e.g. FT-0001"),
      },
    },
    ({ shelf, id }) =>
      guard(async () => {
        const [cards, graph] = await Promise.all([api.getCards(shelf), api.getGraph(shelf)]);
        const card = cards.find((c) => c.id === id);
        if (!card) throw new ApiError(`card not found: ${id}`);
        return ok(renderCard(shelf, card, graph));
      }),
  );

  server.registerTool(
    "get_context_pack",
    {
      title: "Get context pack",
      description:
        "THE tool to call before implementing a card: assembles everything needed to work on it — the card " +
        "itself, its parent feature/epic chain, related knowledge cards, always-on standards, and dependency " +
        "summaries — as one markdown bundle under a token budget, with per-section provenance. " +
        "Prefer this over fetching cards one by one when starting a task.",
      inputSchema: {
        shelf: z.string().describe("shelf slug"),
        id: z.string().describe("card id to work on, e.g. US-0003"),
        budget_tokens: z
          .number()
          .int()
          .min(200)
          .max(64000)
          .optional()
          .describe("max tokens for the bundle (default 8000)"),
      },
    },
    ({ shelf, id, budget_tokens }) =>
      guard(async () => ok((await api.contextPack(shelf, id, budget_tokens)).markdown)),
  );

  return server;
}
