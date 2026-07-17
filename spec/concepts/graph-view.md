---
name: graph-view
description: Graph visualization — hierarchy and network views, trace subgraphs, rendering library choice
tags: [graph, visualization, ui, react-flow]
updated: 2026-07-17
---

# Graph View

The graph is a navigation and comprehension surface, not decoration — every node click opens the card, every view is filterable, and the graph answers questions plain lists can't ("what does this epic actually depend on?", "what's untraced?").

## Views

| View | Shape | Backing edges |
|---|---|---|
| Hierarchy | Tree/columns, Epic → Feature → Story | `parent` |
| Network | Force-directed, Obsidian-style | all typed edges, filterable by type |
| Trace | Card-rooted subgraph → code files → tests | `implements`, `verifies` |
| Dependency | DAG layout | `depends-on` |

Shared affordances: filter by type/status/tag/owner; status as node color, type as shape; hover = card summary tooltip; click = side-panel card view; double-click = open editor. Progressive disclosure — collapse epic subtrees, expand on demand; never render 2k nodes at once by default.

## Library choice

Research decision matrix (2026-07): **React Flow (xyflow)** = best React DX and custom DOM nodes, but ships no layout engine (bolt on dagre/elk); **Cytoscape.js** = canvas rendering, built-in hierarchical layouts *and* graph algorithms (paths, centrality, BFS) — recommended specifically for hierarchy-plus-cross-links graphs; **sigma.js** (WebGL) only matters when canvas chokes.

Choice: **React Flow for the card-centric views** (hierarchy, trace, dependency — rich custom nodes with status chips/avatars, elkjs layouts) where visible-node counts stay bounded by progressive disclosure; **Cytoscape.js is the pre-approved fallback** for the full-network view and for algorithm-backed views (impact analysis, path queries) if/when a shelf outgrows DOM rendering (~1–2k nodes). Do not adopt both before the pain is real.

## Data layer

`core` graph builder emits `{nodes, edges}` with types/status — views are pure projections + layout over that one structure. Layouts computed client-side (elkjs in a web worker for big shelves). The same projection endpoint feeds the MCP `trace(id)` tool, so humans and agents see identical graphs.
