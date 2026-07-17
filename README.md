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
