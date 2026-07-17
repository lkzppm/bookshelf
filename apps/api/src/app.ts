import cors from "@fastify/cors";
import { CARD_TYPES, type CardType } from "@bookshelf/core";
import Fastify, { type FastifyInstance } from "fastify";
import { type CardInput, ShelfStore, StoreError } from "./store.js";

export function buildApp(store: ShelfStore): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err instanceof StoreError ? err.statusCode : (err.statusCode ?? 500);
    reply.status(status).send({ error: err.message });
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/shelves", async () => store.listShelves());

  app.post<{ Body: { name?: string; description?: string; seed?: boolean } }>(
    "/api/shelves",
    async (req, reply) => {
      const { name, description, seed } = req.body ?? {};
      if (!name?.trim()) throw new StoreError(400, "name is required");
      const shelf = store.createShelf(name.trim(), description ?? "", seed ?? false);
      reply.status(201).send(shelf);
    },
  );

  app.delete<{ Params: { slug: string } }>("/api/shelves/:slug", async (req, reply) => {
    store.deleteShelf(req.params.slug);
    reply.status(204).send();
  });

  app.get<{ Params: { slug: string } }>("/api/shelves/:slug/cards", async (req) =>
    store.getCards(req.params.slug),
  );

  app.post<{ Params: { slug: string }; Body: CardInput }>(
    "/api/shelves/:slug/cards",
    async (req, reply) => {
      const input = req.body;
      if (!input?.title?.trim()) throw new StoreError(400, "title is required");
      if (!CARD_TYPES.includes(input.type)) {
        throw new StoreError(400, `type must be one of: ${CARD_TYPES.join(", ")}`);
      }
      reply.status(201).send(store.createCard(req.params.slug, input));
    },
  );

  app.get<{ Params: { slug: string; id: string } }>(
    "/api/shelves/:slug/cards/:id",
    async (req) => store.getCard(req.params.slug, req.params.id),
  );

  app.put<{ Params: { slug: string; id: string }; Body: Partial<CardInput> }>(
    "/api/shelves/:slug/cards/:id",
    async (req) => store.updateCard(req.params.slug, req.params.id, req.body ?? {}),
  );

  app.delete<{ Params: { slug: string; id: string } }>(
    "/api/shelves/:slug/cards/:id",
    async (req, reply) => {
      store.deleteCard(req.params.slug, req.params.id);
      reply.status(204).send();
    },
  );

  app.get<{ Params: { slug: string } }>("/api/shelves/:slug/graph", async (req) =>
    store.graph(req.params.slug),
  );

  app.put<{ Params: { slug: string }; Body: { path?: string; name?: string } }>(
    "/api/shelves/:slug/repo",
    async (req) => {
      const { path: repoPath, name } = req.body ?? {};
      if (!repoPath?.trim()) throw new StoreError(400, "path is required");
      return store.setRepo(req.params.slug, repoPath.trim(), name?.trim() || undefined);
    },
  );

  app.post<{ Params: { slug: string } }>("/api/shelves/:slug/scan", async (req) =>
    store.scan(req.params.slug),
  );

  app.get<{ Params: { slug: string } }>("/api/shelves/:slug/trace", async (req) =>
    store.trace(req.params.slug),
  );

  app.post<{ Params: { slug: string; id: string } }>(
    "/api/shelves/:slug/trace/:id/review",
    async (req) => store.reviewCard(req.params.slug, req.params.id),
  );

  app.get<{ Params: { slug: string } }>("/api/shelves/:slug/issues", async (req) =>
    store.issues(req.params.slug),
  );

  app.get<{ Params: { slug: string }; Querystring: { q?: string; type?: string } }>(
    "/api/shelves/:slug/search",
    async (req) => {
      const { q, type } = req.query;
      if (!q?.trim()) throw new StoreError(400, "q is required");
      return store.search(req.params.slug, q, type as CardType | undefined);
    },
  );

  app.get<{ Params: { slug: string; id: string }; Querystring: { budget?: string } }>(
    "/api/shelves/:slug/context-pack/:id",
    async (req) => {
      const budget = req.query.budget ? Number(req.query.budget) : undefined;
      if (budget !== undefined && (!Number.isFinite(budget) || budget < 200)) {
        throw new StoreError(400, "budget must be a number >= 200");
      }
      return store.contextPack(req.params.slug, req.params.id, budget);
    },
  );

  return app;
}
