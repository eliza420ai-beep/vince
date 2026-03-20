/**
 * Hyperliquid execution sidecar (future) — HTTP client stub.
 *
 * Otaku stays the orchestration surface; keys and HL API live in a separate
 * process. See docs/OTAKU_HL_SIDECAR.md for the contract.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

export const HL_SIDECAR_SCHEMA_VERSION = 1 as const;

/** Perps order payload sent to the sidecar (v1). */
export type HlSidecarPerpsOrderPayload = {
  schemaVersion: typeof HL_SIDECAR_SCHEMA_VERSION;
  correlationId: string;
  /** HL coin symbol, e.g. BTC, ETH */
  coin: string;
  isBuy: boolean;
  /** Size in coin units (string keeps precision) */
  size: string;
  orderType: "market" | "limit";
  limitPx?: string;
  reduceOnly?: boolean;
  /** Idempotency / venue client order id */
  clientOrderId?: string;
};

export type HlSidecarOrderResult = {
  ok: boolean;
  status: number;
  orderId?: string;
  clientOrderId?: string;
  raw?: unknown;
  error?: string;
};

function trimSetting(v: unknown): string {
  return String(v ?? "").trim();
}

export function getHlSidecarBaseUrl(
  runtime: IAgentRuntime,
): string | undefined {
  const url = trimSetting(
    runtime.getSetting("OTAKU_HL_SIDECAR_URL") ??
      process.env.OTAKU_HL_SIDECAR_URL,
  );
  return url || undefined;
}

export function isHlSidecarConfigured(runtime: IAgentRuntime): boolean {
  return !!getHlSidecarBaseUrl(runtime);
}

function getBearer(runtime: IAgentRuntime): string | undefined {
  const t = trimSetting(
    runtime.getSetting("OTAKU_HL_SIDECAR_BEARER") ??
      process.env.OTAKU_HL_SIDECAR_BEARER,
  );
  return t || undefined;
}

function getTimeoutMs(runtime: IAgentRuntime): number {
  const raw = Number(
    runtime.getSetting("OTAKU_HL_SIDECAR_TIMEOUT_MS") ??
      process.env.OTAKU_HL_SIDECAR_TIMEOUT_MS ??
      20_000,
  );
  if (!Number.isFinite(raw) || raw <= 0) return 20_000;
  return Math.min(raw, 120_000);
}

function normalizeBase(base: string): string {
  return base.replace(/\/$/, "");
}

function authHeaders(runtime: IAgentRuntime): Record<string, string> {
  const bearer = getBearer(runtime);
  if (!bearer) return {};
  return { Authorization: `Bearer ${bearer}` };
}

/**
 * GET /healthz or /health — first 2xx wins.
 */
export async function probeHlSidecarHealth(
  runtime: IAgentRuntime,
): Promise<{ ok: boolean; error?: string }> {
  const base = getHlSidecarBaseUrl(runtime);
  if (!base) return { ok: false, error: "OTAKU_HL_SIDECAR_URL not set" };

  const headers = authHeaders(runtime);
  const cap = Math.min(getTimeoutMs(runtime), 5000);

  for (const path of ["/healthz", "/health"]) {
    try {
      const res = await fetch(`${normalizeBase(base)}${path}`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(cap),
      });
      if (res.ok) return { ok: true };
    } catch {
      /* try next path */
    }
  }
  return { ok: false, error: "sidecar unreachable or non-OK" };
}

export type HlSidecarPerpsIntent = {
  coin: string;
  isBuy: boolean;
  size: string;
  orderType: "market" | "limit";
  limitPx?: string;
  reduceOnly?: boolean;
  clientOrderId?: string;
  correlationId?: string;
};

/**
 * POST {base}/v1/perps/orders — place one perps order via sidecar.
 */
export async function submitHlSidecarPerpsOrder(
  runtime: IAgentRuntime,
  intent: HlSidecarPerpsIntent,
): Promise<HlSidecarOrderResult> {
  const base = getHlSidecarBaseUrl(runtime);
  if (!base) {
    return { ok: false, status: 0, error: "OTAKU_HL_SIDECAR_URL not set" };
  }

  const correlationId =
    intent.correlationId?.trim() ||
    `otaku-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const payload: HlSidecarPerpsOrderPayload = {
    schemaVersion: HL_SIDECAR_SCHEMA_VERSION,
    correlationId,
    coin: intent.coin,
    isBuy: intent.isBuy,
    size: intent.size,
    orderType: intent.orderType,
    limitPx: intent.limitPx,
    reduceOnly: intent.reduceOnly,
    clientOrderId: intent.clientOrderId,
  };

  const url = `${normalizeBase(base)}/v1/perps/orders`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(runtime),
  };

  try {
    logger.info(
      `[OTAKU] HL sidecar POST ${url} coin=${payload.coin} ${payload.orderType}`,
    );
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(getTimeoutMs(runtime)),
    });

    const text = await res.text();
    let raw: unknown;
    try {
      raw = text ? JSON.parse(text) : {};
    } catch {
      raw = { rawBody: text };
    }

    const obj = raw as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        typeof obj.error === "string"
          ? obj.error
          : typeof obj.message === "string"
            ? obj.message
            : text.slice(0, 500);
      return {
        ok: false,
        status: res.status,
        error: errMsg || `HTTP ${res.status}`,
        raw,
      };
    }

    const orderId =
      typeof obj.orderId === "string"
        ? obj.orderId
        : typeof obj.oid === "string"
          ? obj.oid
          : typeof obj.oid === "number"
            ? String(obj.oid)
            : undefined;

    const clientOrderId =
      typeof obj.clientOrderId === "string"
        ? obj.clientOrderId
        : payload.clientOrderId;

    return {
      ok: true,
      status: res.status,
      orderId,
      clientOrderId,
      raw,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`[OTAKU] HL sidecar request failed: ${msg}`);
    return { ok: false, status: 0, error: msg };
  }
}

/**
 * GET /v1/reconcile or /reconcile — human-readable or JSON summary from sidecar.
 * Sidecar should return 200 + text/plain, text/markdown, or JSON with `summary` / `text` string.
 */
export async function fetchHlSidecarReconcile(
  runtime: IAgentRuntime,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const base = getHlSidecarBaseUrl(runtime);
  if (!base) return { ok: false, error: "OTAKU_HL_SIDECAR_URL not set" };

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    ...authHeaders(runtime),
  };

  for (const path of ["/v1/reconcile", "/reconcile"]) {
    try {
      const res = await fetch(`${normalizeBase(base)}${path}`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(getTimeoutMs(runtime)),
      });
      if (!res.ok) continue;

      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (ct.includes("application/json")) {
        const raw = (await res.json()) as Record<string, unknown>;
        const summary =
          typeof raw.summary === "string"
            ? raw.summary
            : typeof raw.text === "string"
              ? raw.text
              : typeof raw.report === "string"
                ? raw.report
                : null;
        if (summary?.trim()) return { ok: true, text: summary.trim() };
        return {
          ok: true,
          text: JSON.stringify(raw, null, 2).slice(0, 8000),
        };
      }

      const text = (await res.text()).trim();
      return { ok: true, text: text || undefined };
    } catch (e) {
      logger.debug(`[OTAKU] HL sidecar reconcile ${path} failed: ${e}`);
    }
  }

  return { ok: false, error: "no reconcile endpoint returned 200" };
}
