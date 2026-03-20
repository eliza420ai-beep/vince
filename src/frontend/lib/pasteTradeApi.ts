/**
 * paste.trade integration — agent-scoped plugin routes.
 * POST /api/agents/:agentId/plugins/plugin-paste-trade/paste-trade/runs
 * GET  /api/agents/:agentId/plugins/plugin-paste-trade/paste-trade/run?runId=
 * GET  /api/agents/:agentId/plugins/plugin-paste-trade/paste-trade/handoff?runId=
 */

export interface PasteTradeRunRecord {
  runId: string;
  agentId: string;
  roomId?: string;
  sourceId?: string;
  sourceUrl?: string;
  status: string;
  inputUrl?: string;
  inputText?: string;
  error?: string;
  events: Array<{
    t: number;
    event_type: string;
    data: Record<string, unknown>;
  }>;
  lastSnapshot?: unknown;
  createdAt: number;
  updatedAt: number;
}

export async function startPasteTradeRun(
  agentId: string,
  body: { url?: string; text?: string; roomId?: string },
): Promise<{ runId: string; agentId: string; status: string } | null> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-paste-trade/paste-trade/runs`;
  try {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-API-KEY": token } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${err.slice(0, 200)}`);
    }
    return (await res.json()) as {
      runId: string;
      agentId: string;
      status: string;
    };
  } catch {
    return null;
  }
}

export interface PasteTradeOtakuHandoff {
  eligible: boolean;
  reason?: string;
  message: string;
  expressions: Array<{
    platform?: string;
    ticker: string;
    direction?: string;
    instrument?: string;
    thesis?: string;
  }>;
  sourceUrl?: string;
  runId: string;
}

export async function fetchPasteTradeHandoff(
  agentId: string,
  runId: string,
): Promise<PasteTradeOtakuHandoff | null> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-paste-trade/paste-trade/handoff?runId=${encodeURIComponent(runId)}`;
  try {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { "X-API-KEY": token } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PasteTradeOtakuHandoff;
  } catch {
    return null;
  }
}

export async function fetchPasteTradeRun(
  agentId: string,
  runId: string,
): Promise<PasteTradeRunRecord | null> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-paste-trade/paste-trade/run?runId=${encodeURIComponent(runId)}`;
  try {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { "X-API-KEY": token } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PasteTradeRunRecord;
  } catch {
    return null;
  }
}
