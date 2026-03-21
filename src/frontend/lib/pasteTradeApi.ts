/**
 * paste.trade — handlers live on plugin-vince; route paths are `/vince/paste-trade/...`.
 * See `src/shared/pasteTradeElizaRouting.ts` for the URL contract (must match @elizaos/server).
 * Always pass VINCE’s agent id + `?agentId=` (see leaderboardsApi).
 *
 * POST /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/runs?agentId=
 * GET  /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/run?runId=&agentId=
 * GET  /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/handoff?runId=&agentId=
 */
import { buildPasteTradeApiPathname } from "@/shared/pasteTradeElizaRouting";

function pasteTradeUrl(base: string, agentId: string, subpath: string): string {
  const q = subpath.includes("?") ? "&" : "?";
  const pathname = buildPasteTradeApiPathname(agentId, subpath);
  return `${base}${pathname}${q}agentId=${encodeURIComponent(agentId)}`;
}

export interface PasteTradeRunRecord {
  runId: string;
  agentId: string;
  roomId?: string;
  /** Server set when run did not call paste.trade API (no public source page). */
  localOnly?: boolean;
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

export type StartPasteTradeRunResult =
  | { ok: true; runId: string; agentId: string; status: string }
  | { ok: false; message: string };

function formatPasteTradeError(status: number, bodyText: string): string {
  const raw = bodyText.slice(0, 400).trim();
  try {
    const j = JSON.parse(raw) as { error?: string; hint?: string };
    if (typeof j.error === "string") {
      const extra = typeof j.hint === "string" ? ` ${j.hint}` : "";
      return `${j.error}${extra}`;
    }
  } catch {
    /* not JSON */
  }
  if (raw) return raw;
  return `HTTP ${status}`;
}

/**
 * Start a paste.trade pipeline run. Call with **VINCE’s** agent id — the plugin
 * is only registered on that agent.
 */
export async function startPasteTradeRun(
  agentId: string,
  body: {
    url?: string;
    text?: string;
    roomId?: string;
    /** false = extract + theses only, no POST /api/sources (no app.paste.trade page). */
    remotePublish?: boolean;
  },
): Promise<StartPasteTradeRunResult> {
  const base = window.location.origin;
  const url = pasteTradeUrl(base, agentId, "/runs");
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
    const errText = await res.text().catch(() => "");
    if (!res.ok) {
      const detail = formatPasteTradeError(res.status, errText);
      if (res.status === 404) {
        return {
          ok: false,
          message: `404: ${detail} — use VINCE’s id from GET /api/agents where status is active (name VINCE), correct URL .../plugins/plugin-vince/vince/paste-trade/..., postinstall patch + restart. On Vite (:5173), /api must proxy to SERVER_PORT (see vite.config.ts); wrong port looks like this 404. Inactive agents have no plugin routes.`,
        };
      }
      if (res.status === 503) {
        return {
          ok: false,
          message: `503: ${detail} — run \`bun run packages/paste-trade/scripts/onboard.ts\` once to auto-provision a key (or set PASTE_TRADE_KEY / PASTE_TRADE_API_KEY), then restart the server.`,
        };
      }
      return { ok: false, message: `${res.status}: ${detail}` };
    }
    const json = JSON.parse(errText) as {
      runId?: string;
      agentId?: string;
      status?: string;
    };
    if (!json.runId) {
      return {
        ok: false,
        message: "Server returned 200 but no runId — unexpected response.",
      };
    }
    return {
      ok: true,
      runId: json.runId,
      agentId: String(json.agentId ?? agentId),
      status: String(json.status ?? "accepted"),
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Network error or timeout starting run.";
    return { ok: false, message: msg };
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
  const url = pasteTradeUrl(
    base,
    agentId,
    `/handoff?runId=${encodeURIComponent(runId)}`,
  );
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

export async function fetchPasteTradeRunsList(
  agentId: string,
  opts?: { limit?: number },
): Promise<PasteTradeRunRecord[] | null> {
  const base = window.location.origin;
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 50;
  const url = pasteTradeUrl(base, agentId, `/runs?limit=${lim}`);
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
    const body = (await res.json()) as { runs?: PasteTradeRunRecord[] };
    return Array.isArray(body.runs) ? body.runs : [];
  } catch {
    return null;
  }
}

export async function fetchPasteTradeRun(
  agentId: string,
  runId: string,
): Promise<PasteTradeRunRecord | null> {
  const base = window.location.origin;
  const url = pasteTradeUrl(
    base,
    agentId,
    `/run?runId=${encodeURIComponent(runId)}`,
  );
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
