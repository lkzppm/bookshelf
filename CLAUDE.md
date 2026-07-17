# Bookshelf

Spec-driven development platform for enterprise teams. Teams author **connected markdown specs** (Epic → Feature → User Story, plus a knowledge layer of Concepts/Standards/ADRs), manage them through a friendly web UI, visualize them as a graph, and — the core bet — serve them as the **canonical, synced context source for coding agents** (Claude Code and friends). Code in repos links back to spec cards, so you can always answer "which code satisfies which requirement".

## Read this first

`spec/INDEX.md` is the routing table for all project specs. Load it, then pull only the files whose "Read when…" matches your task. Never guess at product or architecture decisions that a spec already answers.

## Working agreements

- **Spec-first**: bookshelf is built spec-driven, eating its own dog food. `spec/` in this repo is bookshelf's own first "shelf". Before implementing a feature, its card must exist under `spec/`; update the card's status as work progresses.
- Specs are markdown with YAML frontmatter (`name`, `description`, `tags`, `updated`, optional `anchors` mapping to code symbols). Cross-reference other specs by relative path.
- Keep spec files small (~1–1.5k tokens) and single-topic. Update `spec/INDEX.md` whenever you add or meaningfully change a spec.
- Language: English for all specs, code, and comments.
- No code exists yet — greenfield. When scaffolding starts, record stack decisions in `spec/project/architecture.md` before writing code.

## Domain vocabulary

| Term | Meaning |
|---|---|
| Shelf | One project/product space (backed by one git repo of specs) |
| Card | One spec file: Epic, Feature, Story, Concept, Standard, or ADR |
| Link | Typed edge between cards or card↔code: `parent`, `depends-on`, `relates-to`, `implements`, `verifies`, `supersedes` |
| Context pack | Graph-scoped bundle of cards assembled for an agent working on a given card |
| Trace | The card → code files → tests chain proving a requirement is implemented |
