/**
 * Otaku config API – runtime wallet mode from backend.
 * GET /api/agents/:agentId/plugins/plugin-otaku/otaku/config
 *
 * Returns { mode: "degen" | "normies" } when available; null on non-2xx or error.
 */

export type OtakuConfigMode = "degen" | "normies";

export interface OtakuConfig {
  mode: OtakuConfigMode;
}

export async function fetchOtakuConfig(
  agentId: string,
): Promise<OtakuConfig | null> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${base}/api/agents/${agentId}/plugins/plugin-otaku/otaku/config`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OtakuConfig;
    if (data?.mode !== "degen" && data?.mode !== "normies") return null;
    return data;
  } catch {
    return null;
  }
}
