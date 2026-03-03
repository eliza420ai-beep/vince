/**
 * VINCE HL Crypto Action
 *
 * HIP-3 style dashboard for all Hyperliquid crypto perps.
 * Shows TOP MOVERS, VOLUME LEADERS, and TLDR of market vibes.
 * Use for: "hl crypto", "crypto scan", "tickers with traction", "hyperliquid crypto".
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type {
  IHyperliquidService,
  IHyperliquidCryptoPulse,
} from "../types/external-services";
import { getOrCreateHyperliquidService } from "../services/fallbacks";

function formatVol(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function formatChange(c: number): string {
  const s = c >= 0 ? `+${c.toFixed(2)}` : c.toFixed(2);
  return `${s}%`;
}

/** Shared for action response and startup dashboard. */
export function printHlCryptoDashboard(pulse: IHyperliquidCryptoPulse): string {
  const lines: string[] = [];
  const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

  lines.push("");
  lines.push(
    "╔═══════════════════════════════════════════════════════════════╗",
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "║   📊 HL CRYPTO DASHBOARD (Hyperliquid perps)                  ║",
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "╟───────────────────────────────────────────────────────────────╢",
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    `║   Assets: ${pad(String(pulse.assets.length), 8)} crypto perps on main dex                      ║`,
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "╟───────────────────────────────────────────────────────────────╢",
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "║   🔥 TOP MOVERS (by % change)                                 ║",
  );
  lines.push(
    "║                                                               ║",
  );

  for (const m of pulse.topMovers) {
    const emoji = m.change24h >= 0 ? "🟢" : "🔴";
    const sym = m.symbol.padEnd(10);
    const ch = formatChange(m.change24h).padEnd(10);
    const vol = `Vol: ${formatVol(m.volume24h)}`;
    lines.push(`║   ${emoji} ${pad(sym + ch + vol, 56)} ║`);
  }

  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "╟───────────────────────────────────────────────────────────────╢",
  );
  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "║   📊 VOLUME LEADERS                                           ║",
  );
  lines.push(
    "║                                                               ║",
  );

  for (const l of pulse.volumeLeaders) {
    const sym = l.symbol.padEnd(10);
    const vol = formatVol(l.volume24h).padEnd(12);
    const oi = `OI: ${formatVol(l.openInterest)}`.padEnd(18);
    const fund = `Fund: ${(l.funding8h * 100).toFixed(4)}%`;
    lines.push(`║   ${pad(sym + vol + oi + fund, 56)} ║`);
  }

  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "╟───────────────────────────────────────────────────────────────╢",
  );
  lines.push(
    "║                                                               ║",
  );

  const biasEmoji =
    pulse.overallBias === "bullish"
      ? "🟢"
      : pulse.overallBias === "bearish"
        ? "🔴"
        : "⚪";
  lines.push(
    `║   ${biasEmoji} Bias: ${pulse.overallBias.toUpperCase().padEnd(52)} ║`,
  );
  const hotStr = `HOTTEST (top10 vol avg): ${formatChange(pulse.hottestAvg)}`;
  const coldStr = `COLDEST: ${formatChange(pulse.coldestAvg)}`;
  lines.push(`║   ${pad(hotStr, 56)} ║`);
  lines.push(`║   ${pad(coldStr, 56)} ║`);

  const crowded = pulse.assets.filter(
    (a) =>
      a.crowdingLevel &&
      a.crowdingLevel !== "neutral" &&
      ["extreme_long", "long", "extreme_short", "short"].includes(
        a.crowdingLevel,
      ),
  );
  if (crowded.length > 0) {
    const crowdStr = `Crowded: ${crowded
      .slice(0, 5)
      .map((a) => `${a.symbol} ${a.crowdingLevel}`)
      .join(", ")}`;
    lines.push(`║   ${pad(crowdStr, 56)} ║`);
  }

  lines.push(
    "║                                                               ║",
  );
  lines.push(
    "╚═══════════════════════════════════════════════════════════════╝",
  );
  lines.push("");
  lines.push(
    "*Source: Hyperliquid main dex. Commands: PERPS, HIP3, OPTIONS, MEMES, INTEL*",
  );
  lines.push("");

  return lines.join("\n");
}

export const vinceHlCryptoAction: Action = {
  name: "VINCE_HL_CRYPTO",
  similes: [
    "HL_CRYPTO",
    "HL CRYPTO",
    "HYPERLIQUID CRYPTO",
    "CRYPTO SCAN",
    "CRYPTO DASHBOARD",
    "TICKERS TRACTION",
    "TICKERS WITH TRACTION",
  ],
  description:
    "HIP-3 style dashboard for all Hyperliquid crypto perps: top movers, volume leaders, market vibes",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content.text || "").toLowerCase();
    return (
      text.includes("hl crypto") ||
      text.includes("hyperliquid crypto") ||
      text.includes("crypto scan") ||
      text.includes("crypto dashboard") ||
      text.includes("tickers with traction") ||
      text.includes("tickers traction") ||
      (text.includes("crypto") &&
        (text.includes("movers") ||
          text.includes("volume") ||
          text.includes("traction")))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    try {
      const hlService = getOrCreateHyperliquidService(
        runtime,
      ) as IHyperliquidService | null;
      if (!hlService || typeof hlService.getAllCryptoPulse !== "function") {
        await callback({
          text: "Hyperliquid crypto pulse isn't available. Services might still be starting.",
          actions: ["VINCE_HL_CRYPTO"],
        });
        return;
      }

      logger.info("[VINCE_HL_CRYPTO] Fetching HL crypto pulse...");
      const pulse = await hlService.getAllCryptoPulse();

      if (!pulse || pulse.assets.length === 0) {
        await callback({
          text: "Can't get crypto data from Hyperliquid right now. Try again in a minute.",
          actions: ["VINCE_HL_CRYPTO"],
        });
        return;
      }

      const dashboard = printHlCryptoDashboard(pulse);
      await callback({
        text: dashboard,
        actions: ["VINCE_HL_CRYPTO"],
      });
    } catch (error) {
      logger.error(`[VINCE_HL_CRYPTO] Error: ${error}`);
      await callback({
        text: `HL crypto dashboard failed: ${error instanceof Error ? error.message : String(error)}`,
        actions: ["VINCE_HL_CRYPTO"],
      });
    }
  },
};
