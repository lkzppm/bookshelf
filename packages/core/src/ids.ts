import type { CardType } from "./types.js";

export const TYPE_PREFIX: Record<CardType, string> = {
  epic: "EP",
  feature: "FT",
  story: "US",
  concept: "CO",
  standard: "ST",
  adr: "AD",
};

const PREFIX_TYPE = Object.fromEntries(
  Object.entries(TYPE_PREFIX).map(([t, p]) => [p, t as CardType]),
) as Record<string, CardType>;

export const ID_PATTERN = /^(EP|FT|US|CO|ST|AD)-(\d{4})$/;

export function typeFromId(id: string): CardType | undefined {
  const m = ID_PATTERN.exec(id);
  return m ? PREFIX_TYPE[m[1] as string] : undefined;
}

/** Allocate the next free id for a card type given all existing ids in the shelf. */
export function nextId(type: CardType, existingIds: Iterable<string>): string {
  const prefix = TYPE_PREFIX[type];
  let max = 0;
  for (const id of existingIds) {
    const m = ID_PATTERN.exec(id);
    if (m && m[1] === prefix) max = Math.max(max, Number(m[2]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export function cardFilename(id: string, title: string): string {
  const slug = slugify(title);
  return slug ? `${id}-${slug}.md` : `${id}.md`;
}
