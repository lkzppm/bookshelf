/** Rough token estimate (chars/4) — good enough for budgeting context packs. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
