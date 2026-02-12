/**
 * In-memory store for the last X research output per room (for "save that").
 * TTL 5 minutes so we only save recent pulse/vibe/news.
 */

const TTL_MS = 5 * 60 * 1000;

const store = new Map<string, { text: string; expiresAt: number }>();

export function setLastResearch(roomId: string, text: string): void {
  store.set(roomId, { text, expiresAt: Date.now() + TTL_MS });
}

export function getLastResearch(roomId: string): string | null {
  const entry = store.get(roomId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(roomId);
    return null;
  }
  return entry.text;
}
