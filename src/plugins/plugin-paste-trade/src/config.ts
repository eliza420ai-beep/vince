import { join } from "node:path";
import type { IAgentRuntime } from "@elizaos/core";

export function pasteTradeEnabled(): boolean {
  if (process.env.PASTE_TRADE_ENABLED === "false") return false;
  const key =
    process.env.PASTE_TRADE_KEY?.trim() ||
    process.env.PASTE_TRADE_API_KEY?.trim();
  return !!key;
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

export function getPasteTradePackageRoot(): string {
  return join(process.cwd(), "packages", "paste-trade");
}
