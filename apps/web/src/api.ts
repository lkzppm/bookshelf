import type { Card, CardInput, RepoConfig, ShelfGraph, ShelfMeta, TraceCard, TraceData } from "./types";

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
  setRepo: (slug: string, path: string, name?: string) =>
    request<RepoConfig>(`/api/shelves/${slug}/repo`, {
      method: "PUT",
      body: JSON.stringify({ path, name }),
    }),
  scan: (slug: string) => request<TraceData>(`/api/shelves/${slug}/scan`, { method: "POST" }),
  getTrace: (slug: string) => request<TraceData>(`/api/shelves/${slug}/trace`),
  reviewCard: (slug: string, id: string) =>
    request<TraceCard>(`/api/shelves/${slug}/trace/${id}/review`, { method: "POST" }),
};
