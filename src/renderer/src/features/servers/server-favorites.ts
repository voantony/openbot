import { createSignal } from "solid-js";
import { SERVER_FAVORITES_STORAGE_KEY } from "../../layout-constants";

function readFavoriteServerIds(): ReadonlySet<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SERVER_FAVORITES_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

const [favoriteServerIds, setFavoriteServerIds] = createSignal<ReadonlySet<string>>(readFavoriteServerIds());

export function getFavoriteServerIds(): ReadonlySet<string> {
  return favoriteServerIds();
}

export function isFavoriteServer(serverId: string): boolean {
  return favoriteServerIds().has(serverId);
}

export function setFavoriteServer(serverId: string, favorite: boolean): void {
  const next = new Set(favoriteServerIds());
  if (favorite) next.add(serverId);
  else next.delete(serverId);
  setFavoriteServerIds(next);
  try {
    window.localStorage.setItem(SERVER_FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    return;
  }
}

export function toggleFavoriteServer(serverId: string): void {
  setFavoriteServer(serverId, !isFavoriteServer(serverId));
}
