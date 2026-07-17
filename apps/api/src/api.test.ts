import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { ShelfStore } from "./store.js";

let app: FastifyInstance;
let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "bookshelf-test-"));
  app = buildApp(new ShelfStore(dir));
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("shelves", () => {
  it("creates a seeded shelf and lists it", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/shelves",
      payload: { name: "Acme Tasks", description: "demo", seed: true },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().slug).toBe("acme-tasks");

    const list = await app.inject({ method: "GET", url: "/api/shelves" });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].cardCount).toBe(8);
    expect(list.json()[0].parseErrors).toEqual([]);
  });

  it("rejects duplicates and blank names", async () => {
    const dup = await app.inject({
      method: "POST",
      url: "/api/shelves",
      payload: { name: "Acme Tasks" },
    });
    expect(dup.statusCode).toBe(409);
    const blank = await app.inject({ method: "POST", url: "/api/shelves", payload: {} });
    expect(blank.statusCode).toBe(400);
  });
});

describe("cards", () => {
  it("serves the graph with typed edges", async () => {
    const res = await app.inject({ method: "GET", url: "/api/shelves/acme-tasks/graph" });
    const graph = res.json();
    expect(graph.nodes).toHaveLength(8);
    expect(graph.edges).toContainEqual({ from: "FT-0001", to: "EP-0001", type: "parent" });
    expect(graph.edges).toContainEqual({ from: "FT-0002", to: "FT-0001", type: "depends-on" });
  });

  it("creates a card with an allocated id and updates it", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/shelves/acme-tasks/cards",
      payload: {
        type: "story",
        title: "Snooze a reminder",
        links: { parent: "FT-0002" },
        body: "As a user, I want to snooze a reminder.",
      },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().id).toBe("US-0004");

    const update = await app.inject({
      method: "PUT",
      url: "/api/shelves/acme-tasks/cards/US-0004",
      payload: { status: "review" },
    });
    expect(update.json().status).toBe("review");
    expect(update.json().links.parent).toBe("FT-0002");
  });

  it("searches cards", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/shelves/acme-tasks/search?q=reminder",
    });
    const hits = res.json();
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h: { id: string }) => h.id)).toContain("FT-0002");
  });

  it("builds a context pack for a story", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/shelves/acme-tasks/context-pack/US-0003",
    });
    const pack = res.json();
    expect(pack.included.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining(["US-0003", "FT-0002", "EP-0001", "ST-0001"]),
    );
    expect(res.statusCode).toBe(200);
  });

  it("404s cleanly on unknown ids", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/shelves/acme-tasks/cards/US-9999",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toContain("US-9999");
  });

  it("deletes a card", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/shelves/acme-tasks/cards/US-0004",
    });
    expect(res.statusCode).toBe(204);
    const gone = await app.inject({
      method: "GET",
      url: "/api/shelves/acme-tasks/cards/US-0004",
    });
    expect(gone.statusCode).toBe(404);
  });
});
