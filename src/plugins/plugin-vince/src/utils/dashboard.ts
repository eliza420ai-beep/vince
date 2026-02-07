/**
 * Dashboard display helpers.
 * Dashboards are only printed for the VINCE agent to avoid duplicate output
 * when both VINCE and Eliza load plugin-vince (each agent gets its own service instance).
 */

import type { IAgentRuntime } from "@elizaos/core";

function getCharacterName(runtime: IAgentRuntime): string | undefined {
  return (runtime as { character?: { name?: string } }).character?.name;
}

/**
 * Returns true if the current agent is VINCE. Use to skip printing terminal dashboards
 * when the plugin is loaded by another agent (e.g. Eliza) so dashboards don't appear twice.
 */
export function isVinceAgent(runtime: IAgentRuntime): boolean {
  return getCharacterName(runtime) === "VINCE";
}

/**
 * Returns true if the current agent is Eliza. Use to skip heavy startup work (API fetches,
 * cache fills) so we only run them once for VINCE and avoid 2x API/token cost.
 */
export function isElizaAgent(runtime: IAgentRuntime): boolean {
  return getCharacterName(runtime) === "Eliza";
}

/** Service type → short label for startup summary. */
const STARTUP_SERVICE_LABELS: [string, string][] = [
  ["VINCE_COINGLASS_SERVICE", "CoinGlass"],
  ["VINCE_COINGECKO_SERVICE", "CoinGecko"],
  ["VINCE_DERIBIT_SERVICE", "Deribit"],
  ["VINCE_TOP_TRADERS_SERVICE", "TopTraders"],
  ["VINCE_NEWS_SENTIMENT_SERVICE", "NewsSentiment"],
  ["VINCE_MARKET_DATA_SERVICE", "MarketRegime"],
  ["VINCE_SANBASE_SERVICE", "Sanbase"],
  ["VINCE_DEXSCREENER_SERVICE", "DexScreener"],
  ["VINCE_NFT_FLOOR_SERVICE", "NFTFloor"],
  ["VINCE_METEORA_SERVICE", "Meteora"],
  ["VINCE_BINANCE_SERVICE", "Binance"],
  ["VINCE_BINANCE_LIQUIDATION_SERVICE", "BinanceLiq"],
  ["VINCE_HIP3_SERVICE", "HIP3"],
];

/**
 * Builds a single-line summary of which data services are available (for optional aggregated startup dashboard).
 */
export function getStartupSummaryLine(runtime: IAgentRuntime): string {
  const parts = STARTUP_SERVICE_LABELS.filter(([type]) => !!runtime.getService(type)).map(
    ([, label]) => `${label} ✓`,
  );
  return parts.length ? parts.join(" | ") : "—";
}
