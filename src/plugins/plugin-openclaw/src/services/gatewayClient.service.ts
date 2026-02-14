/**
 * OpenClaw Gateway client — health, status, and optional agent run.
 * Used when OPENCLAW_GATEWAY_URL is set. No Eliza Service class; plain module.
 */

import { logger } from "@elizaos/core";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const GATEWAY_CLI_TIMEOUT_MS = 120_000;

const DEFAULT_GATEWAY_URL = "http://127.0.0.1:18789";

/** Hostnames considered safe (loopback/localhost). */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/**
 * Returns true if the URL points to loopback or localhost.
 * Accepts http://127.0.0.1:*, http://localhost:*, http://[::1]:*.
 */
function isUrlLoopbackOrLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(host) || host === "[::1]";
  } catch {
    return false;
  }
}

function allowRemoteGateway(): boolean {
  return process.env.OPENCLAW_ALLOW_REMOTE_GATEWAY === "true";
}

export interface GatewayHealthResult {
  ok: boolean;
  status: string;
  message?: string;
}

export interface GatewayStatusResult {
  ok: boolean;
  status: string;
  message?: string;
  details?: string;
}

export interface RunAgentResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

function getBaseUrl(): string {
  const url = process.env.OPENCLAW_GATEWAY_URL?.trim();
  return url || DEFAULT_GATEWAY_URL;
}

function getToken(): string | undefined {
  return process.env.OPENCLAW_GATEWAY_TOKEN?.trim() || undefined;
}

/**
 * Check if Gateway URL is configured (plugin can offer Gateway-backed features).
 */
export function isGatewayConfigured(): boolean {
  return !!process.env.OPENCLAW_GATEWAY_URL?.trim();
}

const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_RETRY_DELAY_MS = 2000;

/**
 * Single attempt to fetch health from one endpoint.
 */
async function fetchHealthOnce(
  url: string,
  headers: Record<string, string>,
): Promise<GatewayHealthResult> {
  const res = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
  if (res.ok) return { ok: true, status: "ok", message: "Gateway reachable." };
  const text = await res.text();
  return { ok: false, status: "error", message: `Gateway returned ${res.status}: ${text.slice(0, 200)}` };
}

/**
 * GET health from Gateway. Tries {url}/ then {url}/health.
 * Uses OPENCLAW_GATEWAY_TOKEN in Authorization header if set.
 * Retries once after HEALTH_RETRY_DELAY_MS on failure (e.g. slow Gateway).
 * Refuses to connect to remote URLs unless OPENCLAW_ALLOW_REMOTE_GATEWAY=true.
 */
export async function getHealth(): Promise<GatewayHealthResult> {
  const base = getBaseUrl().replace(/\/$/, "");
  if (!isUrlLoopbackOrLocalhost(base)) {
    if (!allowRemoteGateway()) {
      logger?.warn?.(
        { url: base },
        "OpenClaw Gateway URL is not loopback/localhost. Refusing to connect. Set OPENCLAW_ALLOW_REMOTE_GATEWAY=true to override.",
      );
      return {
        ok: false,
        status: "blocked",
        message:
          "OPENCLAW_GATEWAY_URL points to a remote host. For security, the plugin refuses to connect unless OPENCLAW_ALLOW_REMOTE_GATEWAY=true. Prefer loopback (http://127.0.0.1:18789).",
      };
    }
    logger?.warn?.({ url: base }, "Connecting to remote OpenClaw Gateway (OPENCLAW_ALLOW_REMOTE_GATEWAY=true).");
  }
  const token = getToken();
  const headers: Record<string, string> = {
    "Accept": "application/json, text/plain, */*",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const endpoints = [`${base}/`, `${base}/health`];
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of endpoints) {
      try {
        return await fetchHealthOnce(url, headers);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger?.debug?.({ err, url, attempt }, "OpenClaw Gateway health fetch failed");
        if (url === endpoints[endpoints.length - 1] && attempt === 0) {
          await new Promise((r) => setTimeout(r, HEALTH_RETRY_DELAY_MS));
        } else if (url === endpoints[endpoints.length - 1]) {
          return { ok: false, status: "unreachable", message: msg };
        }
      }
    }
  }
  return { ok: false, status: "unreachable", message: "Gateway did not respond." };
}

/**
 * Get status: prefer health; optionally run `openclaw gateway status` and parse.
 */
export async function getStatus(): Promise<GatewayStatusResult> {
  const health = await getHealth();
  if (health.ok) {
    return { ok: true, status: health.status, message: health.message };
  }
  try {
    const { stdout } = await execAsync("openclaw gateway status", { timeout: 5000 });
    const details = stdout?.trim().slice(0, 500);
    return {
      ok: false,
      status: "unknown",
      message: health.message,
      details: details || undefined,
    };
  } catch {
    return { ok: false, status: health.status, message: health.message };
  }
}

/**
 * Run an agent via CLI: openclaw agent --message "..." [--agent <id>].
 * Prefer CLI for minimal dependency on Gateway protocol.
 */
export async function runAgent(task: string, agentId?: string): Promise<RunAgentResult> {
  const args = ["agent", "--message", task];
  if (agentId) args.push("--agent", agentId);
  const cmd = "openclaw " + args.map((a) => (a.includes(" ") ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ");
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: GATEWAY_CLI_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { ok: true, stdout: stdout?.trim(), stderr: stderr?.trim() };
  } catch (err: unknown) {
    const ex = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      stdout: ex.stdout?.trim(),
      stderr: ex.stderr?.trim(),
      error: ex.message ?? String(err),
    };
  }
}
