import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { cardState, mergeLinks, scanRepo } from "./scanner.js";
import { ShelfStore } from "./store.js";

let app: FastifyInstance;
let dataDir: string;
let repoDir: string;

const CODE_V1 = `// @implements US-0001
export function createTask(title: string) {
  return { title, done: false };
}

// unrelated code below
export const other = 1;
`;

const CODE_V2 = CODE_V1.replace("done: false", "done: false, archived: false");

beforeAll(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), "bookshelf-trace-"));
  repoDir = mkdtempSync(path.join(tmpdir(), "bookshelf-repo-"));
  mkdirSync(path.join(repoDir, "src"));
  writeFileSync(path.join(repoDir, "src/tasks.ts"), CODE_V1);
  writeFileSync(
    path.join(repoDir, "src/unknown.ts"),
    "// @implements US-9999\nexport const x = 1;\n",
  );

  app = buildApp(new ShelfStore(dataDir));
  await app.ready();
  await app.inject({
    method: "POST",
    url: "/api/shelves",
    payload: { name: "Trace Demo", seed: true },
  });
});

afterAll(async () => {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(repoDir, { recursive: true, force: true });
});

describe("scanner", () => {
  it("finds annotations and hashes the following block", () => {
    const { hits } = scanRepo(repoDir);
    const hit = hits.find((h) => h.card === "US-0001");
    expect(hit?.file).toBe("src/tasks.ts");
    expect(hit?.line).toBe(1);
    expect(hit?.snippet).toContain("createTask");
  });

  it("keeps acceptedHash across merges so changed blocks go stale", () => {
    const { hits } = scanRepo(repoDir);
    const first = mergeLinks({}, hits);
    expect(cardState(first["US-0001"])).toBe("checked");

    writeFileSync(path.join(repoDir, "src/tasks.ts"), CODE_V2);
    const second = mergeLinks(first, scanRepo(repoDir).hits);
    expect(cardState(second["US-0001"])).toBe("stale");
    writeFileSync(path.join(repoDir, "src/tasks.ts"), CODE_V1);
  });
});

describe("trace endpoints", () => {
  it("requires a connected repo before scanning", async () => {
    const res = await app.inject({ method: "POST", url: "/api/shelves/trace-demo/scan" });
    expect(res.statusCode).toBe(400);
  });

  it("connects a repo, scans, and reports checked state + unknown-id warnings", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/shelves/trace-demo/repo",
      payload: { path: repoDir, name: "demo-repo" },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().name).toBe("demo-repo");

    const scan = await app.inject({ method: "POST", url: "/api/shelves/trace-demo/scan" });
    const trace = scan.json();
    expect(trace.cards["US-0001"].state).toBe("checked");
    expect(trace.warnings.some((w: string) => w.includes("US-9999"))).toBe(true);
    expect(trace.filesScanned).toBeGreaterThan(0);
  });

  it("flags stale on code change and clears after review", async () => {
    writeFileSync(path.join(repoDir, "src/tasks.ts"), CODE_V2);
    const scan = await app.inject({ method: "POST", url: "/api/shelves/trace-demo/scan" });
    expect(scan.json().cards["US-0001"].state).toBe("stale");

    const review = await app.inject({
      method: "POST",
      url: "/api/shelves/trace-demo/trace/US-0001/review",
    });
    expect(review.json().state).toBe("checked");

    const after = await app.inject({ method: "GET", url: "/api/shelves/trace-demo/trace" });
    expect(after.json().cards["US-0001"].state).toBe("checked");
  });

  it("404s review for cards with no links", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shelves/trace-demo/trace/US-0002/review",
    });
    expect(res.statusCode).toBe(404);
  });
});
