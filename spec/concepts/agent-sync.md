---
name: agent-sync
description: How coding agents consume shelves — CLI repo sync, MCP server, context packs, managed CLAUDE.md block
tags: [agents, mcp, cli, context, sync]
updated: 2026-07-17
---

# Agent Sync — the symbiosis layer

Three delivery channels, in MVP order. All are read paths over the same graph; the reverse path (agent → platform) closes the loop.

## 1. Repo sync (CLI) — v0

`bookshelf sync` in any product repo:
1. Reads `.bookshelf.yml` (shelf URL, scope filters: tags/subtree/card types).
2. Pulls the scoped card set into `spec/` locally — same layout convention as the shelf (INDEX.md with "read when…" + token counts, generated).
3. **Compiles rules to every agent dialect** — this is the wedge. AGENTS.md won as the cross-tool standard, but dialects still fragment (Cursor `globs:` vs Claude `paths:` vs Copilot `applyTo:`), and teams hand-copy the same conventions into `.claude/`, `.cursor/rules/`, `.windsurf/`. Bookshelf is the compiler, not another dialect: cards carry tool-agnostic metadata; sync emits AGENTS.md (source of truth) + thin per-tool outputs, each with a managed block between `<!-- bookshelf:start/end -->` markers. Never touches content outside the markers.
4. `--check` mode for CI: fails if the synced copy drifts from the shelf (keeps repos current).

This is the zero-integration channel: works offline, works with any agent that reads files.

### Load modes (the instruction-ceiling answer)

Models degrade past ~150–200 standing instructions, so knowledge cards declare a `load` mode (Kiro steering-file lesson): `always` (into the managed block — keep this set tiny), `auto` (synced into `spec/`, surfaced via INDEX "read when…" triggers and semantic match), `manual` (fetched on demand via MCP only). Sync budget-checks the `always` set and warns when it bloats.

## 2. MCP server — v0 (read-only), v3+ (write)

Design rules (from what already works in the field):
- **Tools for on-demand retrieval, resources for pinning** — the model decides when to call tools; the host app attaches resources at session start. Both are needed: `get_context_pack` as a tool, the shelf's `always`-tier standards as resources.
- **Rerank server-side** (Context7 lesson): `search_specs` runs FTS + vector + cheap-model rerank on the server and returns curated chunks — never make the caller's model paginate raw hits (Context7 measured 65% context-token savings doing this).
- **Truncation survival** (Mintlify lesson): every response starts with a one-line pointer ("index: shelf X, card ID, updated date") so agents that truncate long content keep the way back.
- **Scoped per shelf** — small, well-described tool surfaces per domain, not one giant org server; publish capability metadata via MCP `.well-known` discovery.

Tools (over org SSO):
- `search_specs(query, shelf?, type?)` — FTS + semantic.
- `get_card(id)` — full card + resolved links.
- `get_context_pack(id, budget_tokens?)` — see below.
- `get_standards(area)` — knowledge-layer cards by tag (e.g. "frontend", "api-design").
- `trace(id)` — card → anchors → tests, with CI status.
- `report_implementation(id, files[], pr?)` — agent registers what it built (write, gated).
- `propose_update(id, patch, rationale)` — agent suggests spec changes → lands as a review-status revision, human approves (write, gated).

## 3. Exports — v1+

The 2026 docs-platform baseline (GitBook/Mintlify converged on it, so it's table stakes, not differentiation): `llms.txt` + `llms-full.txt` per shelf, plus content negotiation on the read-only site — same URL serves HTML to browsers and clean markdown to agents sending `Accept: text/markdown`. llms.txt works as a *first-party* index for agents we point at it (its real niche), not as third-party SEO.

## Context packs

The unit of agent context. Given a card (usually the story being worked on) and a token budget, `core` assembles by graph traversal, priority-ordered until budget:

1. The card itself (always).
2. `parent` chain: feature + epic (summaries beyond depth 1).
3. `depends-on` cards (summaries).
4. `relates-to` knowledge cards (full — this is where company patterns ride in).
5. Shelf-global standards tagged `always` (e.g. code style, security baseline).

Output: one markdown bundle with source IDs + `updated` stamps per section, so the agent can cite which card drove a decision and staleness is visible.

## Reverse path (closing the loop)

- Commit trailer convention: `Implements: US-0103` — picked up by the trace scanner (see `concepts/traceability.md`), flips status `building → done`, records trace edges.
- `report_implementation` / `propose_update` MCP tools for richer, agent-initiated updates — always mediated by human review for `approved`+ cards.
