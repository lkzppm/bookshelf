---
name: requirements-authoring
description: Establishing requirements — card templates, EARS acceptance criteria, AI elicitation, spec lints
tags: [requirements, ears, elicitation, authoring, lints]
updated: 2026-07-17
---

# Requirements Authoring — establishing the requisites

The corpus is only as good as what enters it. Bookshelf treats requirement *establishment* as a first-class flow, not a blank textbox.

## Card templates

Each type gets a template the editor scaffolds:
- **Epic**: problem statement, business outcome, success metrics, out-of-scope.
- **Feature**: user value, constraints, linked concepts/standards, child stories list (generated).
- **Story**: user-story sentence ("As a…, I want…, so that…"), `## Acceptance Criteria` (EARS), `## Notes for agents` (implementation constraints worth injecting into context packs).

## EARS acceptance criteria

Acceptance criteria use EARS notation (Easy Approach to Requirements Syntax) — born at Rolls-Royce for jet-engine control requirements, industrially validated (Airbus, Bosch, Intel, NASA) long before the AI era, and what Kiro normalized for agent consumption. Fixed clause order (precondition → trigger → system → response), six patterns:

```
The <system> shall <response>                          # ubiquitous
While <state>, the <system> shall <response>           # state-driven
When <trigger>, the <system> shall <response>          # event-driven
Where <feature is included>, the <system> shall <…>    # optional feature
If <condition>, then the <system> shall <response>     # unwanted behavior
While <state>, when <trigger>, the <system> shall <…>  # complex
```

Each pattern maps cleanly to a testable condition, so criteria flow into test structure without re-interpretation. The editor offers EARS-aware autocomplete; the lint flags vague verbs ("handle", "support", "properly") and criteria with no testable outcome.

## Ambiguity markers & the over-specification guardrail

- `[NEEDS CLARIFICATION: …]` (Spec Kit convention) is a first-class marker: authors and the elicitation agent flag open questions in the artifact instead of silently assuming. Lint blocks `review → approved` while any marker remains.
- **Specs stay lean.** Practitioner consensus: pseudo-code-level specs mean writing the program twice ("waterfall relapse"). Bookshelf is *spec-anchored*, not spec-as-generative-source — cards state intent, constraints, and acceptance criteria; they do not dictate implementations. The token-size lint is the enforcement teeth.

## AI-assisted elicitation (v4)

An elicitation agent that interviews the author instead of receiving a brief:
1. PM states intent in prose → agent asks clarifying questions (actors, triggers, edge cases, non-functionals).
2. Drafts the epic→feature→story tree with EARS criteria.
3. **Corpus-aware checks**: semantic search for duplicate/conflicting existing cards; suggests `relates-to` links to standards/concepts the requirement touches.
4. Output lands as `draft` cards — humans review, never auto-approved.

The same agent powers "requirement review": given a draft card, critique for ambiguity, missing criteria, untestability, conflicts.

## Spec lints (`bookshelf lint`)

Runs in shelf CI and in the editor:
- Structural invariants from `project/domain-model.md` (parents, cycles, broken wiki-links).
- `approved`+ story ⇒ non-empty EARS criteria, owner set.
- Vague-verb and no-outcome heuristics on criteria.
- Token-size warning: card > ~1.5k tokens ⇒ suggest splitting (cards are context-pack bricks; oversized bricks blow agent budgets).
- Staleness: `updated` older than N days on `building` cards.
