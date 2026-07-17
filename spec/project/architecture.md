---
name: architecture
description: Storage decision (git-native), monorepo layout, components, and index database
tags: [architecture, stack, storage, monorepo]
updated: 2026-07-17
---

# Architecture

## Core decision: git-native storage

A shelf **is** a git repo of markdown files; Postgres is a derived, rebuildable index. The web UI is a "head" over git — every edit becomes a commit (author attribution preserved). Rationale:

- Agents and devs consume plain files — zero-integration context injection.
- Review/approval can piggyback on PRs for technical cards while the UI offers form-based approvals for PMs.
- Full history/audit for free; no export/import problem; survives the platform dying.
- Trade-off accepted: write path is more complex (commit orchestration, conflicts) than a plain DB. Mitigation: UI writes go through the API which serializes commits per shelf; last-writer conflicts surfaced as merge UI only in the rare concurrent-edit case.

## Monorepo layout (planned)

```
bookshelf/
├─ packages/
│  ├─ core/        # parser (frontmatter + [[wiki-links]]), graph builder,
│  │               # ID allocator, lints, context-pack assembler — pure TS, no IO
│  ├─ cli/         # `bookshelf sync|scan|lint|new` — used by devs and CI
│  └─ shared/      # types, zod schemas for card frontmatter
├─ apps/
│  ├─ web/         # React UI: editor, graph, boards, dashboards
│  ├─ api/         # backend: auth (SSO/OIDC), git service, index, webhooks
│  └─ mcp/         # MCP server exposing shelves to agents
└─ spec/           # bookshelf's own shelf (dogfood)
```

## Components

| Component | Responsibility |
|---|---|
| `core` parser | md + YAML → Card objects; resolve `[[id]]` links; build typed graph |
| Index (Postgres) | Card metadata, link edges, FTS + pgvector embeddings for semantic search; rebuilt idempotently from git on webhook/push |
| Git service | Clone/pull shelf repos, serialize UI commits, PR integration (GitHub/Azure DevOps APIs) |
| Trace scanner | CI-side: scan product repos for `@implements`/`Implements:` annotations and test tags → push trace edges to API (see `concepts/traceability.md`) |
| MCP server | search/get/context-pack/trace tools over the index (see `concepts/agent-sync.md`) |
| Web editor | Markdown editor (Tiptap/Milkdown-class) with wiki-link autocomplete, frontmatter as form fields |

## Stack (proposed, confirm at v0 scaffold)

- TypeScript everywhere; pnpm workspaces + Turborepo.
- API: Node (Fastify or Nest) — same language as core parser; Postgres 16 + pgvector.
- Web: Vite + React 18, Zustand + React-Query (mirrors patterns Lucas already uses), MUI or shadcn.
- Graph rendering: React Flow (xyflow) for card views; Cytoscape.js pre-approved fallback for network/analysis views (see `concepts/graph-view.md`).
- MCP: official TypeScript SDK, streamable HTTP transport (stateless core — scales on plain HTTP infra), one scoped server per shelf, `.well-known` capability metadata, org SSO in front.
- Auth: OIDC (Entra ID first — enterprise reality), roles: viewer / editor / approver / admin per shelf. Distinct permission axis for agents: "readable by humans" ≠ "approved for agent code generation" — agent consumption is granted per card set, with audit logging of what agents actually retrieved (the context-lake lesson from Backstage's failure; see `project/landscape.md`).

## Non-goals (for now)

- Real-time collaborative editing (CRDTs) — git serialization is enough until proven otherwise.
- Replacing Jira for sprint mechanics — bookshelf owns *requirements truth*, not sprint ceremonies; sync adapters can mirror status to Jira/ADO later.
