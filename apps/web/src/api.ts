import type { Card, CardInput, ShelfGraph, ShelfMeta } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep status line */
    }
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  listShelves: () => request<ShelfMeta[]>("/api/shelves"),
  createShelf: (name: string, description: string, seed: boolean) =>
    request<ShelfMeta>("/api/shelves", {
      method: "POST",
      body: JSON.stringify({ name, description, seed }),
    }),
  deleteShelf: (slug: string) => request<void>(`/api/shelves/${slug}`, { method: "DELETE" }),
  getCards: (slug: string) => request<Card[]>(`/api/shelves/${slug}/cards`),
  getGraph: (slug: string) => request<ShelfGraph>(`/api/shelves/${slug}/graph`),
  createCard: (slug: string, input: CardInput) =>
    request<Card>(`/api/shelves/${slug}/cards`, { method: "POST", body: JSON.stringify(input) }),
  updateCard: (slug: string, id: string, patch: Partial<CardInput>) =>
    request<Card>(`/api/shelves/${slug}/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  deleteCard: (slug: string, id: string) =>
    request<void>(`/api/shelves/${slug}/cards/${id}`, { method: "DELETE" }),
};
