---
name: domain-model
description: Card types, frontmatter schema, ID scheme, typed links, and lifecycle statuses
tags: [domain, model, cards, links, lifecycle]
updated: 2026-07-17
---

# Domain Model

## Entities

- **Org** → has **Shelves** (one per product/project). A shelf is backed by one git repo of markdown files.
- **Card** — one markdown file. Two layers:
  - *Product layer*: `epic`, `feature`, `story` — the requirements tree.
  - *Knowledge layer*: `concept`, `standard`, `adr` — the wiki that encodes company patterns.
- **Link** — typed edge between cards, or card ↔ code.

## ID scheme

Immutable, allocated on creation, never reused: `EP-0001`, `FT-0012`, `US-0103`, `AD-0004` (ADRs). Knowledge cards use slugs (`concept/agent-sync`). Filename = `<id>-<slug>.md` (e.g. `US-0103-sync-cli-managed-block.md`) so renames don't break links — links always target the ID.

## Frontmatter schema (card)

```yaml
id: US-0103
type: story            # epic | feature | story | concept | standard | adr
title: Sync CLI writes managed CLAUDE.md block
status: approved       # draft | review | approved | building | done | verified | archived
owner: lucas
priority: high         # critical | high | medium | low (PM field, optional)
effort: 5              # story points (optional)
iteration: 2026-Q3     # sprint/iteration label (optional)
due: 2026-08-01        # optional
tags: [cli, agent-sync]
updated: 2026-07-17
links:
  parent: FT-0012           # exactly one for feature/story; none for epic
  depends-on: [US-0101]
  relates-to: [concept/agent-sync]
  supersedes: []
anchors:                    # code refs, maintained by trace scanner + humans
  - packages/cli/src/sync.ts:writeManagedBlock
verified-by:                # test refs
  - packages/cli/test/sync.test.ts:managed-block
```

Body: free markdown. Stories carry an `## Acceptance Criteria` section in EARS notation (see `concepts/requirements-authoring.md`). Cross-card mentions in prose use `[[US-0101]]` wiki-links; the parser resolves them against IDs.

## Link types

| Type | Direction | Meaning |
|---|---|---|
| `parent` | story→feature→epic | Hierarchy (the tree) |
| `depends-on` | card→card | Ordering/blocking |
| `relates-to` | card→card | Cross-layer reference (story ↔ concept/standard) |
| `implements` | code→card | Derived from `anchors` + code annotations (`@implements US-0103`) |
| `verifies` | test→card | Derived from `verified-by` + test tags |
| `supersedes` | card→card | Revision history for approved requirements |

Knowledge cards (`concept`, `standard`, `adr`) additionally declare `load: always | auto | manual` — how agent sync tiers them into context (see `concepts/agent-sync.md`).

## Lifecycle

`draft → review → approved → building → done → verified` (+ `archived`).
- `review → approved` requires an approval from a card-type-appropriate reviewer (governance rules per shelf). Every card has a named `owner` — ownerless specs are how corpora rot.
- **Approval stamps a content hash** of what was reviewed (Doorstop lesson). Any later edit that changes the hash flips status back to `review` automatically — an approved card can never silently mean something else.
- Editing an `approved`+ card creates a revision entry (git history is the audit trail; the UI surfaces it).
- `done → verified` flips only when the trace scanner sees at least one `verifies` link passing in CI.
- Context packs stamp the shelf commit SHA they were built from, so "which spec version shaped this work" is always answerable.

## Invariants (spec lints)

- Every story has a parent feature; every feature a parent epic.
- No cycles in `parent`/`depends-on`.
- `approved`+ stories must have non-empty acceptance criteria.
- Wiki-links must resolve; broken links fail the lint.
