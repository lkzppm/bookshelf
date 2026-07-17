---
name: traceability
description: Code↔card linking — annotation conventions, trace scanner, coverage and staleness dashboards
tags: [traceability, coverage, ci, scanner]
updated: 2026-07-17
---

# Traceability — connecting code to requirements

Goal: answer "which code satisfies requirement X?" and its inverse "which requirement justifies this code?" continuously, not as a one-off audit.

## Link sources (in trust order)

1. **Code annotations** — `// @implements US-0103` on the function/module that satisfies a story; `@verifies US-0103` in tests (or test-name tags `[US-0103]`).
2. **Commit trailers** — `Implements: US-0103` (Git-native, survives squashes if in the merge commit).
3. **PR references** — PR body links to cards; scanner resolves merged PR → files touched.
4. **Card `anchors`** — hand-maintained `path:symbol` refs in frontmatter (the human override; same convention as this spec folder).
5. **Agent-registered links** — an agent implementing a story via the MCP `report_implementation` tool creates trace edges as a *side effect of doing the work* (the pattern Jama's MCP server validated in 2026): no separate bookkeeping step, still audit-trailed.
6. **LLM-suggested links** (v4) — embedding similarity + LLM judge proposes card↔code links for un-annotated code; humans confirm in the UI. Suggestions are never auto-trusted.

## Compile-time-verifiable links (opt-in codegen, v4)

The ReqToCode idea (arXiv 2603.13999), flipped into bookshelf: `bookshelf sync --codegen` emits language-native requirement identifiers (a TS const/decorator, a Java annotation, a Python marker) per approved story. Code references `implementsReq(US_0103)` instead of a magic comment; when a card is archived/superseded, the generated identifier is marked deprecated (compiler warning) then removed (build break). Broken trace links can't silently rot — they fail the build. Annotation comments remain the zero-setup default; codegen is for teams that want traceability with teeth.

## Trace scanner (`bookshelf scan`)

Runs in product-repo CI:
1. Parse annotations/trailers/test tags since last indexed SHA.
2. Validate IDs against the shelf (unknown ID = CI warning).
3. Push edges `{card, repo, path, symbol?, sha, kind: implements|verifies}` to the API.
4. Detect **staleness**: file with an `implements` edge changed while its card's `updated` didn't → flag card as *possibly drifted*; surfaces in dashboard and in context packs ("⚠ code moved since spec approved").

## Coverage model

| View | Question answered |
|---|---|
| Requirement coverage | % of `approved`+ stories with ≥1 `implements` edge and ≥1 green `verifies` edge |
| Orphan requirements | Approved cards with no implementing code — the backlog truth |
| Orphan code | Files/modules with no path to any card — undocumented behavior or gold-plating |
| Trace view (per card) | Story → files/symbols → tests → last CI status, rendered as a subgraph |

`done → verified` status transition is driven by this model (see `project/domain-model.md`).

## Granularity policy

Default granularity is **file/symbol per story**. Finer (line ranges) rots instantly; coarser (repo per epic) is useless. Symbols via lightweight static parse (ts-morph / tree-sitter per language), not full builds — scanner must stay fast enough for CI.
