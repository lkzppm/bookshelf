import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type Card,
  type CardLinks,
  type CardStatus,
  type CardType,
  type LoadMode,
  type Priority,
  type ShelfGraph,
  type ShelfIssue,
  buildContextPack,
  buildGraph,
  cardFilename,
  nextId,
  parseCard,
  sampleShelfCards,
  serializeCard,
  slugify,
  validateShelf,
} from "@bookshelf/core";
import chokidar, { type FSWatcher } from "chokidar";
import MiniSearch from "minisearch";
import YAML from "yaml";
import { type CodeLink, type RequirementState, cardState, mergeLinks, scanRepo } from "./scanner.js";

export interface RepoConfig {
  name: string;
  path: string;
}

export interface ShelfMeta {
  slug: string;
  name: string;
  description: string;
  created: string;
  cardCount: number;
  parseErrors: string[];
  repo?: RepoConfig;
}

export interface CardInput {
  type: CardType;
  title: string;
  description?: string;
  status?: CardStatus;
  owner?: string;
  priority?: Priority;
  effort?: number;
  iteration?: string;
  due?: string;
  tags?: string[];
  load?: LoadMode;
  links?: Partial<CardLinks>;
  body?: string;
}

export interface TraceCard {
  state: RequirementState;
  links: CodeLink[];
}

export interface TraceData {
  repo?: RepoConfig;
  scannedAt?: string;
  filesScanned?: number;
  warnings: string[];
  cards: Record<string, TraceCard>;
}

interface TraceFile {
  scannedAt?: string;
  filesScanned?: number;
  warnings: string[];
  cards: Record<string, CodeLink[]>;
}

export interface SearchHit {
  id: string;
  title: string;
  type: CardType;
  status: CardStatus;
  score: number;
  snippet: string;
}

interface ShelfState {
  meta: { name: string; description: string; created: string; repo?: RepoConfig };
  cards: Map<string, Card>;
  parseErrors: string[];
  search: MiniSearch;
  trace: TraceFile;
}

const today = () => new Date().toISOString().slice(0, 10);

function newSearchIndex(): MiniSearch {
  return new MiniSearch({
    fields: ["id", "title", "description", "body", "tags"],
    storeFields: ["id", "title", "type", "status", "body", "description"],
    searchOptions: { boost: { title: 3, id: 3, description: 2, tags: 2 }, prefix: true, fuzzy: 0.1 },
  });
}

export class ShelfStore {
  private shelves = new Map<string, ShelfState>();
  private watcher?: FSWatcher;
  private reloadTimer?: NodeJS.Timeout;

  constructor(readonly dataDir: string) {
    mkdirSync(this.shelvesDir, { recursive: true });
    this.loadAll();
  }

  private get shelvesDir(): string {
    return path.join(this.dataDir, "shelves");
  }

  private shelfDir(slug: string): string {
    return path.join(this.shelvesDir, slug);
  }

  private cardsDir(slug: string): string {
    return path.join(this.shelfDir(slug), "cards");
  }

  /** Watch the data dir and reload on external edits (agents, git pulls, editors). */
  startWatching(): void {
    this.watcher = chokidar.watch(this.shelvesDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    this.watcher.on("all", () => {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.loadAll(), 300);
    });
  }

  async close(): Promise<void> {
    clearTimeout(this.reloadTimer);
    await this.watcher?.close();
  }

  loadAll(): void {
    const next = new Map<string, ShelfState>();
    if (existsSync(this.shelvesDir)) {
      for (const entry of readdirSync(this.shelvesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        next.set(entry.name, this.loadShelf(entry.name));
      }
    }
    this.shelves = next;
  }

  private loadShelf(slug: string): ShelfState {
    const metaFile = path.join(this.shelfDir(slug), "shelf.yml");
    let meta: ShelfState["meta"] = { name: slug, description: "", created: today() };
    if (existsSync(metaFile)) {
      try {
        meta = { ...meta, ...YAML.parse(readFileSync(metaFile, "utf8")) };
      } catch {
        // fall back to defaults; shelf.yml is metadata only
      }
    }

    let trace: TraceFile = { warnings: [], cards: {} };
    const traceFile = path.join(this.shelfDir(slug), "trace.json");
    if (existsSync(traceFile)) {
      try {
        trace = { warnings: [], cards: {}, ...JSON.parse(readFileSync(traceFile, "utf8")) };
      } catch {
        // corrupted trace is rebuildable by rescanning
      }
    }

    const cards = new Map<string, Card>();
    const parseErrors: string[] = [];
    const dir = this.cardsDir(slug);
    if (existsSync(dir)) {
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
        const { card, error } = parseCard(file, readFileSync(path.join(dir, file), "utf8"));
        if (card) {
          if (cards.has(card.id)) parseErrors.push(`${file}: duplicate id ${card.id}`);
          else cards.set(card.id, card);
        } else if (error) {
          parseErrors.push(error);
        }
      }
    }

    const search = newSearchIndex();
    search.addAll(
      [...cards.values()].map((c) => ({
        ...c,
        tags: c.tags.join(" "),
      })),
    );

    return { meta, cards, parseErrors, search, trace };
  }

  listShelves(): ShelfMeta[] {
    return [...this.shelves.entries()].map(([slug, s]) => ({
      slug,
      name: s.meta.name,
      description: s.meta.description,
      created: s.meta.created,
      cardCount: s.cards.size,
      parseErrors: s.parseErrors,
      ...(s.meta.repo ? { repo: s.meta.repo } : {}),
    }));
  }

  createShelf(name: string, description = "", seed = false): ShelfMeta {
    const slug = slugify(name);
    if (!slug) throw new StoreError(400, "shelf name must contain letters or digits");
    if (this.shelves.has(slug)) throw new StoreError(409, `shelf "${slug}" already exists`);

    mkdirSync(this.cardsDir(slug), { recursive: true });
    const meta = { name, description, created: today() };
    writeFileSync(path.join(this.shelfDir(slug), "shelf.yml"), YAML.stringify(meta));

    if (seed) {
      for (const { file, content } of sampleShelfCards()) {
        writeFileSync(path.join(this.cardsDir(slug), file), content);
      }
    }

    this.shelves.set(slug, this.loadShelf(slug));
    return { slug, ...meta, cardCount: this.shelf(slug).cards.size, parseErrors: [] };
  }

  deleteShelf(slug: string): void {
    this.shelf(slug);
    rmSync(this.shelfDir(slug), { recursive: true, force: true });
    this.shelves.delete(slug);
  }

  private shelf(slug: string): ShelfState {
    const s = this.shelves.get(slug);
    if (!s) throw new StoreError(404, `shelf not found: ${slug}`);
    return s;
  }

  getCards(slug: string): Card[] {
    return [...this.shelf(slug).cards.values()];
  }

  getCard(slug: string, id: string): Card {
    const card = this.shelf(slug).cards.get(id);
    if (!card) throw new StoreError(404, `card not found: ${id}`);
    return card;
  }

  createCard(slug: string, input: CardInput): Card {
    const shelf = this.shelf(slug);
    const id = nextId(input.type, shelf.cards.keys());
    const card: Card = {
      id,
      type: input.type,
      title: input.title,
      status: input.status ?? "draft",
      ...(input.description ? { description: input.description } : {}),
      ...(input.owner ? { owner: input.owner } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.effort !== undefined ? { effort: input.effort } : {}),
      ...(input.iteration ? { iteration: input.iteration } : {}),
      ...(input.due ? { due: input.due } : {}),
      tags: input.tags ?? [],
      ...(input.load ? { load: input.load } : {}),
      links: {
        ...(input.links?.parent ? { parent: input.links.parent } : {}),
        "depends-on": input.links?.["depends-on"] ?? [],
        "relates-to": input.links?.["relates-to"] ?? [],
        supersedes: input.links?.supersedes ?? [],
      },
      created: today(),
      updated: today(),
      body: input.body ?? "",
      file: cardFilename(id, input.title),
      tokens: 0,
    };
    this.writeCard(slug, card);
    return this.getCard(slug, id);
  }

  updateCard(slug: string, id: string, patch: Partial<CardInput>): Card {
    const existing = this.getCard(slug, id);
    if (patch.type && patch.type !== existing.type) {
      throw new StoreError(400, "card type is immutable (ids encode the type)");
    }
    const card: Card = {
      ...existing,
      title: patch.title ?? existing.title,
      status: patch.status ?? existing.status,
      description: patch.description ?? existing.description,
      owner: patch.owner ?? existing.owner,
      priority: patch.priority ?? existing.priority,
      effort: patch.effort ?? existing.effort,
      iteration: patch.iteration ?? existing.iteration,
      due: patch.due ?? existing.due,
      tags: patch.tags ?? existing.tags,
      load: patch.load ?? existing.load,
      links: patch.links
        ? {
            ...(patch.links.parent !== undefined
              ? patch.links.parent
                ? { parent: patch.links.parent }
                : {}
              : existing.links.parent
                ? { parent: existing.links.parent }
                : {}),
            "depends-on": patch.links["depends-on"] ?? existing.links["depends-on"],
            "relates-to": patch.links["relates-to"] ?? existing.links["relates-to"],
            supersedes: patch.links.supersedes ?? existing.links.supersedes,
          }
        : existing.links,
      body: patch.body ?? existing.body,
      updated: today(),
    };
    this.writeCard(slug, card);
    return this.getCard(slug, id);
  }

  deleteCard(slug: string, id: string): void {
    const card = this.getCard(slug, id);
    rmSync(path.join(this.cardsDir(slug), card.file));
    this.shelves.set(slug, this.loadShelf(slug));
  }

  private writeCard(slug: string, card: Card): void {
    writeFileSync(path.join(this.cardsDir(slug), card.file), serializeCard(card));
    this.shelves.set(slug, this.loadShelf(slug));
  }

  graph(slug: string): ShelfGraph {
    return buildGraph(this.getCards(slug));
  }

  issues(slug: string): ShelfIssue[] {
    return validateShelf(this.getCards(slug));
  }

  search(slug: string, query: string, type?: CardType): SearchHit[] {
    const shelf = this.shelf(slug);
    return shelf.search
      .search(query)
      .filter((r) => !type || r.type === type)
      .slice(0, 20)
      .map((r) => ({
        id: r.id as string,
        title: r.title as string,
        type: r.type as CardType,
        status: r.status as CardStatus,
        score: r.score,
        snippet: snippetFor(query, `${r.description ?? ""}\n${r.body ?? ""}`),
      }));
  }

  setRepo(slug: string, repoPath: string, name?: string): RepoConfig {
    const shelf = this.shelf(slug);
    if (!existsSync(repoPath)) throw new StoreError(400, `path not found on server: ${repoPath}`);
    const repo: RepoConfig = { name: name ?? path.basename(repoPath), path: repoPath };
    shelf.meta.repo = repo;
    writeFileSync(path.join(this.shelfDir(slug), "shelf.yml"), YAML.stringify(shelf.meta));
    return repo;
  }

  scan(slug: string): TraceData {
    const shelf = this.shelf(slug);
    const repo = shelf.meta.repo;
    if (!repo) throw new StoreError(400, "no repository connected — set one via PUT .../repo first");
    if (!existsSync(repo.path)) throw new StoreError(400, `repository path not found: ${repo.path}`);

    const { hits, filesScanned } = scanRepo(repo.path);
    const warnings: string[] = [];
    const known = hits.filter((h) => {
      if (shelf.cards.has(h.card)) return true;
      warnings.push(`${h.file}:${h.line} references unknown card ${h.card}`);
      return false;
    });

    shelf.trace = {
      scannedAt: new Date().toISOString(),
      filesScanned,
      warnings,
      cards: mergeLinks(shelf.trace.cards, known),
    };
    this.persistTrace(slug);
    return this.trace(slug);
  }

  trace(slug: string): TraceData {
    const shelf = this.shelf(slug);
    const cards: Record<string, TraceCard> = {};
    for (const [id, links] of Object.entries(shelf.trace.cards)) {
      cards[id] = { state: cardState(links), links };
    }
    return {
      ...(shelf.meta.repo ? { repo: shelf.meta.repo } : {}),
      ...(shelf.trace.scannedAt ? { scannedAt: shelf.trace.scannedAt } : {}),
      ...(shelf.trace.filesScanned !== undefined ? { filesScanned: shelf.trace.filesScanned } : {}),
      warnings: shelf.trace.warnings,
      cards,
    };
  }

  reviewCard(slug: string, id: string): TraceCard {
    const shelf = this.shelf(slug);
    const links = shelf.trace.cards[id];
    if (!links || links.length === 0) throw new StoreError(404, `no code links for card ${id}`);
    for (const link of links) link.acceptedHash = link.hash;
    this.persistTrace(slug);
    return { state: cardState(links), links };
  }

  private persistTrace(slug: string): void {
    const shelf = this.shelf(slug);
    writeFileSync(
      path.join(this.shelfDir(slug), "trace.json"),
      JSON.stringify(shelf.trace, null, 2),
    );
  }

  contextPack(slug: string, id: string, budget?: number) {
    const shelf = this.shelf(slug);
    try {
      return buildContextPack(this.getCards(slug), id, {
        ...(budget ? { budget } : {}),
        shelfName: shelf.meta.name,
      });
    } catch (err) {
      throw new StoreError(404, (err as Error).message);
    }
  }
}

export class StoreError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function snippetFor(query: string, text: string, radius = 120): string {
  const clean = text.trim();
  const term = query.split(/\s+/)[0]?.toLowerCase() ?? "";
  const idx = clean.toLowerCase().indexOf(term);
  if (idx < 0) return clean.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(clean.length, idx + radius);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}
