/**
 * Otaku alerts API – proactive alerts (Morpho, DCA, stop-loss) for notifications UI.
 * GET /api/agents/:agentId/plugins/plugin-otaku/otaku/alerts
 *
 * Returns AlertItem[] when available; null on non-2xx or error.
 */

export interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "morpho_warning" | "dca_active" | "stop_loss_active";
  time: number;
}

export async function fetchOtakuAlerts(
  agentId: string,
): Promise<AlertItem[] | null> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${base}/api/agents/${agentId}/plugins/plugin-otaku/otaku/alerts`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AlertItem[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}
