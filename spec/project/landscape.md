---
name: landscape
description: Prior art — spec-driven dev tools, agent-context platforms, traceability research — and bookshelf's differentiation
tags: [landscape, prior-art, research, differentiation]
updated: 2026-07-17
---

# Landscape (researched 2026-07)

## Spec-driven dev tools

| Tool | Shape | Steal | Weakness |
|---|---|---|---|
| GitHub Spec Kit | Per-feature `spec.md`/`plan.md`/`tasks.md` + project `constitution.md`; 7 slash-command phases | `[NEEDS CLARIFICATION]` markers; constitution as higher-authority doc; `/converge` anti-drift diffing code vs spec | Heavyweight ceremony; single-repo scope; specs are scaffolding, not a governed corpus |
| AWS Kiro | `requirements.md` (EARS) / `design.md` / `tasks.md`; steering files | **Steering load modes: always / auto (semantic match) / manual** — answers the ~150–200 standing-instruction ceiling; task dependency "waves" | IDE lock-in |
| OpenSpec | Change-centric folders + `archive/`; propose→apply→archive | **Stores (beta): one spec repo consumed read-only by many code repos** — validates bookshelf's core premise; change/current-truth separation | Change-centric can drift from canonical truth |
| Tessl | Spec Registry ("npm for knowledge") + framework | Versioned spec packages for shared libraries — an internal-registry tier for bookshelf later; `[@test]` inline linkage | Closed beta |
| BMAD | Multi-persona phases; epic/story files with readiness gates | `sprint-status.yaml` machine-readable status beside human docs; readiness gates between levels | Heavy role-play overhead |
| Jama Connect MCP (2026-05) | RM tool exposing requirements via MCP | **Traceability created as a side effect of the agent doing the work** — exactly our `report_implementation` design | Legacy RM pricing/weight |

## Practitioner lessons (critiques of SDD)

- **Over-specification = waterfall relapse.** Pseudo-code-level specs mean writing the program twice. "Spec-anchored" (specs and code coexist as living docs) is the reported sweet spot — not spec-as-generative-source purity. Bookshelf takes the spec-anchored stance.
- **Instruction ceiling**: models degrade past ~150–200 standing instructions → selective loading (Kiro modes, context packs) is a hard requirement, not an optimization.
- **Governance gap at scale** (real audit: 41 spec files / 9 repos, 4 describing the same service differently): specs need named owners, versions pinned by SHA, gated changes, and "which spec version shaped this deployment" recorded. Built into our lifecycle + context-pack stamps.
- Drift doesn't disappear with SDD — it changes shape (everyone edits, nobody reconciles). Ownership + review + `/converge`-style reconciliation are the mitigations.

## Agent-context platforms

- **Table stakes triad** (GitBook, Mintlify converged): llms.txt index + clean-markdown content negotiation + auto MCP endpoint per published doc set. Bookshelf ships all three per shelf by default.
- **Context7 lesson**: rerank server-side with a cheap model; return curated chunks, never make the caller's expensive model paginate raw search results.
- **AGENTS.md won** as the cross-tool rules standard; Cursor/Windsurf/Claude dialects still fragment (`globs:` vs `paths:` vs `applyTo:`) — open spec gap. Bookshelf's wedge: **author once, compile to every dialect** (see `concepts/agent-sync.md`).
- **Backstage post-mortem**: portal-UI-first with siloed plugins failed the agent era; build a "context lake" — one structured, access-controlled API both humans and agents hit. That's our index+MCP layer.
- **Governed knowledge principle**: "available to read" ≠ "approved for code generation" — agent consumption is a distinct permission; scope MCP surfaces per domain/shelf, not one giant server.

## Traceability research

- Legacy matrix tools (DOORS, Jama, Polarion) = powerful, costly, stale-by-decoupling. GitHub's **PR-as-audit-unit** model is the lightweight reference.
- **Doorstop review-hash**: approving stamps a content hash of what was reviewed; later change ⇒ auto flag re-review. Adopted in our lifecycle.
- **ReqToCode (arXiv 2603.13999)**: generate language-native constants/annotations per requirement (`@TracesSWR(SWR_101...)`); deprecated ref → compiler warning, removed → build break. Traceability as a compile-time dependency, not recovered-after-the-fact guesswork. Adopted as opt-in codegen in `concepts/traceability.md`.
- Field trend: from *reactive trace recovery* (scan and guess) to *proactive trace creation* (links born in the authoring/coding workflow, often agent-mediated). Bookshelf is designed proactive-first.

## Differentiation

1. **Governed corpus, not per-feature scaffolding** — every tool above specs a feature then discards; nobody owns the living, connected, reviewed spec graph over time.
2. **Epic → Feature → Story as first-class three-level hierarchy** — none of the researched tools has it (BMAD closest with Epic→Story).
3. **Multi-repo canonical context source** — OpenSpec Stores and Tessl Registry both point at this need without serving it fully; bookshelf is built around it.
4. **Traceability as agent side effect** + compile-time-verifiable links — only Jama (legacy, expensive) touches this today.
