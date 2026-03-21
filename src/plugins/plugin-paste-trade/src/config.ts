import { join } from "node:path";
import type { IAgentRuntime } from "@elizaos/core";

/** Plugin is omitted from VINCE entirely when this is true (no HTTP routes). */
export function isPasteTradePluginDisabled(): boolean {
  return process.env.PASTE_TRADE_ENABLED === "false";
}

/** Chat + pipeline: key present and feature not explicitly off. */
export function pasteTradeEnabled(): boolean {
  if (isPasteTradePluginDisabled()) return false;
  const key =
    process.env.PASTE_TRADE_KEY?.trim() ||
    process.env.PASTE_TRADE_API_KEY?.trim();
  return !!key;
}

/**
 * Chat action may run without a key when the default is local-only (no remote publish).
 */
export function pasteTradeChatRunnable(runtime?: IAgentRuntime): boolean {
  if (isPasteTradePluginDisabled()) return false;
  if (getPasteTradeKey(runtime)) return true;
  return !getPasteTradeRemotePublishDefault(runtime);
}

export function getPasteTradeBaseUrl(runtime?: IAgentRuntime): string {
  const fromRuntime =
    runtime?.getSetting("PASTE_TRADE_BASE_URL") ||
    runtime?.getSetting("PASTE_TRADE_URL");
  const raw =
    (typeof fromRuntime === "string" && fromRuntime.trim()) ||
    process.env.PASTE_TRADE_BASE_URL?.trim() ||
    process.env.PASTE_TRADE_URL?.trim() ||
    process.env.BOARD_URL?.trim() ||
    process.env.BELIEF_BOARD_URL?.trim() ||
    "https://paste.trade";
  return raw.replace(/\/$/, "");
}

export function getPasteTradeKey(runtime?: IAgentRuntime): string {
  const fromRuntime =
    runtime?.getSetting("PASTE_TRADE_KEY") ||
    runtime?.getSetting("PASTE_TRADE_API_KEY");
  const k =
    (typeof fromRuntime === "string" && fromRuntime.trim()) ||
    process.env.PASTE_TRADE_KEY?.trim() ||
    process.env.PASTE_TRADE_API_KEY?.trim() ||
    "";
  return k;
}

export function getPasteTradeUiOrigin(runtime?: IAgentRuntime): string {
  const fromRuntime = runtime?.getSetting("PASTE_TRADE_UI_ORIGIN");
  const raw =
    (typeof fromRuntime === "string" && fromRuntime.trim()) ||
    process.env.PASTE_TRADE_UI_ORIGIN?.trim() ||
    getPasteTradeBaseUrl(runtime);
  return raw.replace(/\/$/, "");
}

export function getPasteTradePollMs(): number {
  const n = Number(process.env.PASTE_TRADE_POLL_MS ?? "5000");
  return Number.isFinite(n) && n >= 2000 ? n : 5000;
}

/**
 * When false, the pipeline still extracts + LLM theses + local batch-save, but skips
 * createSource / events / snapshot polling against paste.trade (no public app.paste.trade page).
 * Per-run override: POST body `remotePublish: true|false`.
 */
export function getPasteTradeRemotePublishDefault(
  runtime?: IAgentRuntime,
): boolean {
  const fromRuntime = runtime?.getSetting("PASTE_TRADE_REMOTE_PUBLISH");
  const s =
    (typeof fromRuntime === "string" && fromRuntime.trim()) ||
    process.env.PASTE_TRADE_REMOTE_PUBLISH?.trim() ||
    "";
  const low = s.toLowerCase();
  if (low === "false" || low === "0" || low === "no" || low === "off") {
    return false;
  }
  return true;
}

export function resolvePasteTradeRemotePublish(
  runtime: IAgentRuntime,
  bodyRemotePublish: boolean | undefined,
): boolean {
  if (typeof bodyRemotePublish === "boolean") return bodyRemotePublish;
  return getPasteTradeRemotePublishDefault(runtime);
}

export function getPasteTradePackageRoot(): string {
  return join(process.cwd(), "packages", "paste-trade");
}
