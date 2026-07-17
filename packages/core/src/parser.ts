import matter from "gray-matter";
import { frontmatterSchema } from "./schema.js";
import { estimateTokens } from "./tokens.js";
import type { Card } from "./types.js";

export interface ParseResult {
  card?: Card;
  error?: string;
}

/** Parse one markdown card file (frontmatter + body) into a Card. */
export function parseCard(file: string, raw: string): ParseResult {
  let data: Record<string, unknown>;
  let body: string;
  try {
    const parsed = matter(raw);
    data = parsed.data;
    body = parsed.content.trim();
  } catch (err) {
    return { error: `${file}: invalid frontmatter — ${(err as Error).message}` };
  }

  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { error: `${file}: ${issues}` };
  }

  return {
    card: {
      ...result.data,
      body,
      file,
      tokens: estimateTokens(raw),
    },
  };
}

/** Serialize a Card back to markdown with YAML frontmatter (write path). */
export function serializeCard(card: Card): string {
  const fm: Record<string, unknown> = {
    id: card.id,
    type: card.type,
    title: card.title,
    status: card.status,
  };
  if (card.description) fm.description = card.description;
  if (card.owner) fm.owner = card.owner;
  if (card.priority) fm.priority = card.priority;
  if (card.effort !== undefined) fm.effort = card.effort;
  if (card.iteration) fm.iteration = card.iteration;
  if (card.due) fm.due = card.due;
  if (card.tags.length > 0) fm.tags = card.tags;
  if (card.load) fm.load = card.load;

  const links: Record<string, unknown> = {};
  if (card.links.parent) links.parent = card.links.parent;
  if (card.links["depends-on"].length > 0) links["depends-on"] = card.links["depends-on"];
  if (card.links["relates-to"].length > 0) links["relates-to"] = card.links["relates-to"];
  if (card.links.supersedes.length > 0) links.supersedes = card.links.supersedes;
  if (Object.keys(links).length > 0) fm.links = links;

  if (card.created) fm.created = card.created;
  if (card.updated) fm.updated = card.updated;

  return matter.stringify(`\n${card.body.trim()}\n`, fm);
}

/** First meaningful paragraph of a card body — used for summary mode. */
export function firstParagraph(body: string, maxChars = 400): string {
  for (const block of body.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}…` : trimmed;
  }
  return "";
}
