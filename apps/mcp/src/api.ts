/** Thin client for the bookshelf REST API — the MCP server holds no state of its own. */

export interface ShelfMeta {
  slug: string;
  name: string;
  description: string;
  cardCount: number;
  parseErrors: string[];
}

export interface CardLinks {
  parent?: string;
  "depends-on": string[];
  "relates-to": string[];
  supersedes: string[];
}

export interface Card {
  id: string;
  type: string;
  title: string;
  status: string;
  description?: string;
  owner?: string;
  tags: string[];
  load?: string;
  links: CardLinks;
  created: string;
  updated: string;
  body: string;
  tokens: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface ShelfGraph {
  nodes: { id: string; type: string; title: string; status: string }[];
  edges: GraphEdge[];
}

export interface SearchHit {
  id: string;
  title: string;
  type: string;
  status: string;
  score: number;
  snippet: string;
}

export interface ContextPackResult {
  markdown: string;
}

export class ApiError extends Error {}

export class ApiClient {
  constructor(private baseUrl: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // keep the status line
      }
      throw new ApiError(message);
    }
    return res.json() as Promise<T>;
  }

  listShelves(): Promise<ShelfMeta[]> {
    return this.get("/api/shelves");
  }

  getCards(shelf: string): Promise<Card[]> {
    return this.get(`/api/shelves/${encodeURIComponent(shelf)}/cards`);
  }

  getGraph(shelf: string): Promise<ShelfGraph> {
    return this.get(`/api/shelves/${encodeURIComponent(shelf)}/graph`);
  }

  search(shelf: string, q: string, type?: string): Promise<SearchHit[]> {
    const params = new URLSearchParams({ q });
    if (type) params.set("type", type);
    return this.get(`/api/shelves/${encodeURIComponent(shelf)}/search?${params}`);
  }

  contextPack(shelf: string, id: string, budget?: number): Promise<ContextPackResult> {
    const params = budget ? `?budget=${budget}` : "";
    return this.get(
      `/api/shelves/${encodeURIComponent(shelf)}/context-pack/${encodeURIComponent(id)}${params}`,
    );
  }
}
