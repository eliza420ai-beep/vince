/**
 * VINCE Dexter Drift Action
 *
 * Compares paper bot positions to Dexter's three portfolios (HL, tastytrade, watchlist)
 * and core crypto (BTC, SOL, HYPE). Reports which paper positions are in the Dexter
 * universe and which Dexter watchlist names have no paper exposure.
 * Trigger: "drift", "dexter drift", "portfolio drift", "dexter report".
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import {
  loadDexterPortfolios,
  getDexterUniverseSet,
  type DexterPortfolios,
} from "../utils/dexterPortfolio";

const TRIGGERS = [
  "drift",
  "dexter drift",
  "portfolio drift",
  "dexter report",
  "dexter universe",
];

function buildDriftReport(
  dexter: DexterPortfolios,
  openAssets: string[],
): string {
  const lines: string[] = [];
  const dexterSet = getDexterUniverseSet(dexter);
  const inHl = openAssets.filter((a) =>
    dexter.hyperliquid.includes(a.toUpperCase()),
  );
  const inTt = openAssets.filter((a) =>
    dexter.tastytrade.includes(a.toUpperCase()),
  );
  const inWatch = openAssets.filter((a) =>
    dexter.watchlist.includes(a.toUpperCase()),
  );
  const inCrypto = openAssets.filter((a) =>
    (dexter.coreCrypto as readonly string[]).includes(a.toUpperCase()),
  );
  const paperInUniverse = openAssets.filter((a) =>
    dexterSet.has(a.toUpperCase()),
  );
  const paperNotInUniverse = openAssets.filter(
    (a) => !dexterSet.has(a.toUpperCase()),
  );
  const watchlistNoPaper = dexter.watchlist.filter(
    (s) => !openAssets.some((a) => a.toUpperCase() === s.toUpperCase()),
  );

  lines.push("**Dexter drift (paper bot vs monitoring universe)**");
  lines.push("");
  lines.push(
    `Paper open positions: ${openAssets.length > 0 ? openAssets.join(", ") : "none"}`,
  );
  if (paperInUniverse.length > 0) {
    lines.push(
      `In Dexter universe: ${paperInUniverse.join(", ")} (HL: ${inHl.join(", ") || "—"} | TT: ${inTt.join(", ") || "—"} | watchlist: ${inWatch.join(", ") || "—"} | core crypto: ${inCrypto.join(", ") || "—"})`,
    );
  }
  if (paperNotInUniverse.length > 0) {
    lines.push(
      `Not in Dexter universe: ${paperNotInUniverse.join(", ")} (paper-only names)`,
    );
  }
  if (watchlistNoPaper.length > 0) {
    lines.push(
      `Watchlist names with no paper exposure: ${watchlistNoPaper.slice(0, 15).join(", ")}${watchlistNoPaper.length > 15 ? ` (+${watchlistNoPaper.length - 15} more)` : ""}`,
    );
  }
  if (
    openAssets.length === 0 &&
    watchlistNoPaper.length === 0 &&
    dexter.watchlist.length === 0
  ) {
    lines.push(
      "No paper positions and no watchlist loaded. Load portfolio_*.json for full drift.",
    );
  }
  return lines.join("\n");
}

export const vinceDexterDriftAction: Action = {
  name: "VINCE_DEXTER_DRIFT",
  similes: [
    "DEXTER_DRIFT",
    "PORTFOLIO_DRIFT",
    "VINCE_DRIFT_REPORT",
    "DEXTER_REPORT",
  ],
  description:
    "Compare paper trading positions to Dexter portfolios (HL, tastytrade, watchlist) and core crypto; report which positions are in the Dexter universe and which watchlist names have no paper exposure.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return TRIGGERS.some((t) => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<void | undefined> => {
    try {
      const dexter = loadDexterPortfolios();
      const positionManager = runtime.getService(
        "VINCE_POSITION_MANAGER_SERVICE",
      ) as VincePositionManagerService | null;
      const openAssets = positionManager
        ? positionManager
            .getOpenPositions()
            .map((p) => p.asset)
            .filter(Boolean)
        : [];
      const report = buildDriftReport(dexter, openAssets);
      if (callback) {
        await callback({
          text: report,
          actions: ["VINCE_DEXTER_DRIFT"],
        });
      }
    } catch (error) {
      logger.warn(`[VINCE_DEXTER_DRIFT] Error: ${error}`);
      if (callback) {
        await callback({
          text: "Could not build Dexter drift report (missing positions or portfolio files).",
          actions: ["VINCE_DEXTER_DRIFT"],
        });
      }
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "dexter drift" },
      },
      {
        name: "VINCE",
        content: {
          text: "**Dexter drift (paper bot vs monitoring universe)**\n\nPaper open positions: BTC, NVDA\nIn Dexter universe: BTC (core crypto), NVDA (HL sleeve). Watchlist names with no paper exposure: PANW, CRWD, NET, …",
          actions: ["VINCE_DEXTER_DRIFT"],
        },
      },
    ],
  ],
};

export default vinceDexterDriftAction;
