# Bookshelf

Spec-driven development platform: connected markdown specs (Epic → Feature → User Story + a knowledge layer) as the canonical, governed context source for enterprise teams **and their coding agents**.

- Author and manage specs as linked markdown cards with stable IDs and typed relations.
- Visualize the corpus as an interactive graph (hierarchy, dependencies, cross-links).
- Serve context to coding agents through an MCP server with knowledge-graph navigation tools.

See `spec/INDEX.md` for the full product & architecture specs (bookshelf dogfoods itself — its own specs are its first shelf).

## Monorepo

| Package | What |
|---|---|
| `packages/core` | Card parser (frontmatter + `[[wiki-links]]`), typed graph builder, ID allocator, context-pack assembler |
| `apps/api` | Fastify REST API — shelves & cards CRUD over markdown files, search, graph, context packs |
| `apps/web` | React UI — shelf management, card editing, React Flow graph views |
| `apps/mcp` | MCP server (streamable HTTP) — knowledge-graph navigation tools for coding agents |

## Quickstart (Docker)

```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| Web UI | http://localhost:8080 |
| REST API | http://localhost:9300/api/health |
| MCP server | http://localhost:9400/mcp |

Open the UI, create a shelf (check "seed with sample cards" for an instant demo), and explore the graph.

### Connect your coding agent (MCP)

```bash
claude mcp add --transport http bookshelf http://localhost:9400/mcp
```

The agent gets six knowledge-graph tools shaping an **orient → locate → navigate → read → pack** flow:

| Tool | What it does |
|---|---|
| `list_shelves` | entry point — all shelves with card counts |
| `get_shelf_map` | cheap orientation: hierarchy + knowledge layer + cross-links, no bodies |
| `search_cards` | full-text search, returns ids + snippets |
| `walk_graph` | BFS along typed edges (direction/type/depth filters) without reading bodies |
| `get_card` | full card + every in/out connection with titles |
| `get_context_pack` | budgeted one-call working set: card + parent chain + related knowledge + always-on standards |

Shelf data is plain markdown with YAML frontmatter on the `bookshelf-data` volume — editable by hand, by agents, or via the UI; the API watches and reindexes on change.

### Requirements traceability

Each shelf has a **Requirements** tab: connect a repository, annotate code with `// @implements US-0001`, and hit **Scan**. Bookshelf hashes each annotated block — a requirement shows **checked** while its code blocks are unchanged, flips to **needs review** the moment implementing code changes, and returns to checked after a human **Review & accept**. Mount local repos into the api container via `docker-compose.override.yml`:

```yaml
services:
  api:
    volumes:
      - /home/you/code/my-project:/repos/my-project:ro
```

The **Wiki** tab is the human face of the knowledge layer (concepts, standards, ADRs) — the same pages agents consume through MCP, with per-page agent load modes (`always` / `auto` / `manual`).

## Development

```bash
pnpm install
pnpm build          # build all packages
pnpm test           # run all tests
pnpm dev            # run everything in watch mode
```

Docker quickstart, architecture, and MCP usage docs land with their respective packages.

## Branching

`main` (stable) ← `develop` (integration) ← `feat/*`, `fix/*`. PRs auto-merge once CI is green.
