---
name: overview
description: What bookshelf is — vision, personas, product pillars, and MVP path
tags: [overview, vision, roadmap]
updated: 2026-07-17
---

# Bookshelf — Overview

Bookshelf is a platform for **spec-driven development at enterprise team scale**. Teams write connected markdown specs organized as a requirements tree (Epic → Feature → User Story) plus a knowledge layer (Concepts, Standards, ADRs). The platform gives humans a friendly UI with management features, and gives coding agents a synced, governed, always-current context source — an *LLM wiki* that enforces company patterns.

## The problem

- Requirements live in Jira/Azure DevOps (unstructured prose, stale), knowledge in Confluence (rots), truth in code (opaque to PMs). Nothing connects them.
- Every developer hand-rolls CLAUDE.md / rules files for their agent; they drift from each other and from reality. There is no team-wide way to inject consistent, updated context into agents.
- Spec-driven tools (Spec Kit, Kiro) treat specs as per-feature scaffolding — written, used once, discarded. Nobody governs the corpus over time.
- Nobody can answer "which code implements requirement X?" without archaeology.

## The bet

One connected, versioned markdown corpus that is simultaneously:
1. The **requirements system of record** (with lifecycle, owners, approvals),
2. The **agent context source** (served via repo sync, MCP, and exports),
3. **Traceable to code** (typed links from cards to files/symbols/tests, continuously verified in CI).

## Personas

| Persona | Uses bookshelf to… |
|---|---|
| PM / PO | Author epics/features/stories in a rich editor, never touching git |
| Tech lead / architect | Write standards & ADRs, review/approve specs, curate the graph |
| Developer | Get scoped context into their agent; link code; flip card statuses |
| **Coding agent** (first-class persona) | Read context packs, report implementations, propose spec updates |
| Eng manager | Dashboards: requirement coverage, staleness, progress |

## Product pillars

1. **Connected cards** — every spec is a card with a stable ID, typed links, frontmatter. See `project/domain-model.md`.
2. **Git-native storage** — a shelf is a git repo; the UI is a head over git. See `project/architecture.md`.
3. **Agent symbiosis** — CLI sync into repos, MCP server, context packs. See `concepts/agent-sync.md`.
4. **Traceability** — code↔card links, coverage & staleness dashboards. See `concepts/traceability.md`.
5. **Graph** — hierarchy view + network view of the corpus. See `concepts/graph-view.md`.
6. **Requirements authoring** — templates, EARS acceptance criteria, AI-assisted elicitation, spec lints. See `concepts/requirements-authoring.md`.

## Differentiation (vs the 2026 landscape — see `project/landscape.md`)

- Every spec-driven tool (Spec Kit, Kiro, OpenSpec) treats specs as **per-feature, single-repo scaffolding**; bookshelf owns a governed, living corpus serving many repos and many agents.
- **No researched tool has Epic → Feature → Story as a first-class hierarchy** — the closest (BMAD) stops at Epic → Story.
- Traceability tools are either legacy-heavyweight (DOORS, Jama, Polarion) or absent; bookshelf makes trace links a **side effect of agents doing the work**, with opt-in compile-time verification.

## MVP path (eat our own dog food)

| Phase | Ships | Proves |
|---|---|---|
| v0 | Core parser + `bookshelf sync` CLI + read-only MCP server; this repo's `spec/` is the first shelf | Agents get value with zero UI |
| v1 | Web UI read-only: browse cards, graph view, search; SSO auth | Humans can navigate the corpus |
| v2 | UI editing (writes = git commits), lifecycle/status, review flows, boards | PMs work without git |
| v3 | Trace scanner (CI), coverage dashboard, code↔card links | The traceability promise |
| v4 | AI elicitation agent, drift detection, spec lints in CI | The intelligence layer |
