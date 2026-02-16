/**
 * Otaku completion events API – event store (swap, DCA, bridge, etc.) for notifications UI.
 * GET /api/agents/:agentId/plugins/plugin-otaku/otaku/notifications
 *
 * Returns NotificationEvent[] when available; null on non-2xx or error.
 */

export interface NotificationEvent {
  id: string;
  action: string;
  title: string;
  subtitle?: string;
  time: number;
  metadata?: Record<string, unknown>;
}

export async function fetchOtakuNotifications(
  agentId: string,
  userId?: string | null,
): Promise<NotificationEvent[] | null> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const search = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const url = `${base}/api/agents/${agentId}/plugins/plugin-otaku/otaku/notifications${search}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NotificationEvent[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}
