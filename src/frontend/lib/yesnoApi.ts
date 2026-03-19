export type YesNoMode = "swing" | "day";

export interface YesNoFetchResult<T = any> {
  data: T | null;
  error: string | null;
}

export async function fetchYesNoWithError(
  agentId: string,
  mode: YesNoMode,
): Promise<YesNoFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/yesno?mode=${encodeURIComponent(
    mode,
  )}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg };
    }
    return { data: body, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg };
  }
}
