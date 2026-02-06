/**
 * VINCE Perps Action
 *
 * Perpetual trading signals with LLM-generated narrative.
 * Reads like a friend texting you about trading setups, not a robotic report.
 *
 * Features:
 * - Market signals from CoinGlass, Binance, Top Traders
 * - Aggregated signal direction with confidence
 * - Paper trading bot status (active/paused, positions, P&L)
 * - Educational explanations of why trades are/aren't happening
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceSanbaseService } from "../services/sanbase.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";

// ==========================================
// Data Context Builder
// ==========================================

interface PerpsDataContext {
  marketContext: string[];
  tradingSignals: string[];
  topTraders: string[];
  fundingRates: string[];
  onChain: string[];
  paperBot: string[];
}

async function buildPerpsDataContext(
  runtime: IAgentRuntime,
): Promise<PerpsDataContext> {
  const context: PerpsDataContext = {
    marketContext: [],
    tradingSignals: [],
    topTraders: [],
    fundingRates: [],
    onChain: [],
    paperBot: [],
  };

  const assets = ["BTC", "ETH", "SOL", "HYPE"];

  // Get services
  const coinglassService = runtime.getService(
    "VINCE_COINGLASS_SERVICE",
  ) as VinceCoinGlassService | null;
  const signalService = runtime.getService(
    "VINCE_SIGNAL_AGGREGATOR_SERVICE",
  ) as VinceSignalAggregatorService | null;
  const topTradersService = runtime.getService(
    "VINCE_TOP_TRADERS_SERVICE",
  ) as VinceTopTradersService | null;
  const marketDataService = runtime.getService(
    "VINCE_MARKET_DATA_SERVICE",
  ) as VinceMarketDataService | null;
  const sanbaseService = runtime.getService(
    "VINCE_SANBASE_SERVICE",
  ) as VinceSanbaseService | null;
  const positionManager = runtime.getService(
    "VINCE_POSITION_MANAGER_SERVICE",
  ) as VincePositionManagerService | null;

  // Market context
  if (marketDataService) {
    for (const asset of assets) {
      try {
        const ctx = await marketDataService.getEnrichedContext(asset);
        if (ctx) {
          const change =
            ctx.priceChange24h >= 0
              ? `+${ctx.priceChange24h.toFixed(1)}%`
              : `${ctx.priceChange24h.toFixed(1)}%`;
          context.marketContext.push(
            `${asset}: $${ctx.currentPrice.toLocaleString()} (${change}) - ${ctx.marketRegime}`,
          );
        }
      } catch (e) {
        // Skip failed assets
      }
    }
  }

  // Trading signals
  if (signalService) {
    for (const asset of assets) {
      try {
        const signal = await signalService.getSignal(asset);
        const direction = signal.direction.toUpperCase();
        context.tradingSignals.push(
          `${asset}: ${direction} (strength: ${signal.strength}%, confidence: ${signal.confidence}%)` +
            (signal.factors.length > 0
              ? ` - ${signal.factors.slice(0, 2).join(", ")}`
              : ""),
        );
      } catch (e) {
        // Skip failed assets
      }
    }
  } else if (coinglassService) {
    for (const asset of assets) {
      try {
        const signal = coinglassService.generateSignal(asset);
        if (signal) {
          context.tradingSignals.push(
            `${asset}: ${signal.direction.toUpperCase()} (strength: ${signal.strength}%)`,
          );
        }
      } catch (e) {
        // Skip failed assets
      }
    }
  }

  // Top traders
  if (topTradersService) {
    try {
      const status = topTradersService.getStatus();
      context.topTraders.push(`Tracking ${status.trackedCount} whale wallets`);

      const recentSignals = topTradersService.getRecentSignals(3);
      if (recentSignals.length > 0) {
        for (const sig of recentSignals) {
          const action = sig.action.replace("_", " ");
          context.topTraders.push(
            `${sig.asset}: whale ${action} ($${(sig.size / 1000).toFixed(0)}k)`,
          );
        }
      } else {
        context.topTraders.push("No recent whale activity");
      }
    } catch (e) {
      // Skip if unavailable
    }
  }

  // Funding rates
  if (coinglassService) {
    try {
      const allFunding = coinglassService.getAllFunding();
      for (const funding of allFunding) {
        const rate = (funding.rate * 100).toFixed(4);
        const bias =
          funding.rate > 0.0001
            ? "(longs paying)"
            : funding.rate < -0.0001
              ? "(shorts paying)"
              : "(neutral)";
        context.fundingRates.push(`${funding.asset}: ${rate}% ${bias}`);
      }
    } catch (e) {
      // Skip if unavailable
    }
  }

  // On-chain context (Sanbase)
  if (sanbaseService && sanbaseService.isConfigured()) {
    try {
      const btcOnChain = await sanbaseService.getOnChainContext("BTC");
      if (btcOnChain.exchangeFlows) {
        context.onChain.push(
          `BTC Exchange flows: ${btcOnChain.exchangeFlows.sentiment} (30d lag)`,
        );
      }
      if (btcOnChain.whaleActivity) {
        context.onChain.push(
          `BTC Whale activity: ${btcOnChain.whaleActivity.sentiment} (30d lag)`,
        );
      }
      if (btcOnChain.networkActivity) {
        context.onChain.push(
          `Network activity: ${btcOnChain.networkActivity.trend}`,
        );
      }
    } catch (e) {
      // Skip if unavailable
    }
  }

  // Paper bot status
  if (positionManager) {
    try {
      const positions = positionManager.getOpenPositions();
      const portfolio = positionManager.getPortfolio();
      const riskState = positionManager.getRiskState();

      const statusLabel = riskState.isPaused ? "PAUSED" : "ACTIVE";
      const returnPct =
        portfolio.returnPct >= 0
          ? `+${portfolio.returnPct.toFixed(2)}%`
          : `${portfolio.returnPct.toFixed(2)}%`;
      context.paperBot.push(
        `Bot: ${statusLabel} | Portfolio: $${portfolio.totalValue.toLocaleString()} (${returnPct})`,
      );

      if (positions.length > 0) {
        for (const pos of positions) {
          const pnlStr =
            pos.unrealizedPnl >= 0
              ? `+$${pos.unrealizedPnl.toFixed(0)}`
              : `-$${Math.abs(pos.unrealizedPnl).toFixed(0)}`;
          const pnlPct =
            pos.unrealizedPnlPct >= 0
              ? `+${pos.unrealizedPnlPct.toFixed(1)}%`
              : `${pos.unrealizedPnlPct.toFixed(1)}%`;
          const duration = formatDuration(Date.now() - pos.openedAt);
          context.paperBot.push(
            `${pos.direction.toUpperCase()} ${pos.asset} @ $${pos.entryPrice.toLocaleString()} (${duration}) - P&L: ${pnlStr} (${pnlPct})`,
          );
          context.paperBot.push(
            `  Strategy: ${pos.strategyName} | Signals: ${pos.triggerSignals.slice(0, 2).join(", ")}`,
          );
        }
      } else {
        context.paperBot.push("No open positions - waiting for setup");

        // Get why not trading if signal service available
        if (signalService) {
          const btcSignal = await signalService.getSignal("BTC");
          const reasons: string[] = [];
          if (btcSignal.strength < 60)
            reasons.push(`strength ${btcSignal.strength}% (need 60%)`);
          if (btcSignal.confidence < 60)
            reasons.push(`confidence ${btcSignal.confidence}% (need 60%)`);
          if (reasons.length > 0) {
            context.paperBot.push(`Why waiting: ${reasons.join(", ")}`);
          }
        }
      }
    } catch (e) {
      context.paperBot.push("Paper bot initializing...");
    }
  } else {
    context.paperBot.push("Paper bot not active");
  }

  return context;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

// ==========================================
// LLM Narrative Generator
// ==========================================

async function generatePerpsNarrative(
  runtime: IAgentRuntime,
  context: PerpsDataContext,
): Promise<string> {
  const dataContext = [
    "=== MARKET CONTEXT ===",
    ...context.marketContext,
    "",
    "=== TRADING SIGNALS ===",
    ...context.tradingSignals,
    "",
    "=== TOP TRADERS (Hyperliquid) ===",
    ...context.topTraders,
    "",
    "=== FUNDING RATES ===",
    ...context.fundingRates,
    ...(context.onChain.length > 0
      ? ["", "=== ON-CHAIN (30d lag) ===", ...context.onChain]
      : []),
    "",
    "=== PAPER BOT STATUS ===",
    ...context.paperBot,
  ].join("\n");

  const prompt = `You are VINCE, giving a perps trading briefing. You're texting this to a friend who trades - be real, be specific, have opinions.

Here's the data:

${dataContext}

Write a trading briefing that covers:
1. Start with the vibe - what's the setup looking like? Bullish, bearish, choppy?
2. Walk through the signals - which assets look tradeable? Don't just list them, explain what the signals are saying.
3. Mention whale activity if interesting, or note if it's quiet.
4. Comment on funding - is one side getting crowded?
5. End with the paper bot status - what are we doing and why?

STYLE RULES:
- Write like you're explaining this to a trading buddy, not a board meeting
- Mix short punchy takes with explanations when needed
- Use specific numbers naturally - "BTC at 80k" not "BTC: $80,340.00"
- No bullet points or headers - flow naturally
- Have opinions. If the setup sucks, say it sucks. If something looks good, say it.
- Don't hedge everything - take positions
- Around 150-250 words. Don't pad it.

AVOID:
- "Interestingly", "notably", "it's worth noting"
- Starting every sentence with the asset name
- Generic observations that could apply to any day
- Phrases like "the market is showing signs of..."

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_PERPS] Failed to generate narrative: ${error}`);
    return "Having trouble getting my thoughts together on perps right now. Data's loading but the analysis isn't clicking. Try again in a sec.";
  }
}

export const vincePerpsAction: Action = {
  name: "VINCE_PERPS",
  similes: ["PERPS", "PERPETUALS", "TRADING", "SIGNALS", "MARKET_SIGNALS"],
  description:
    "Perpetual trading signals with LLM-generated narrative - reads like a friend texting about setups",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("perp") ||
      text.includes("trading") ||
      text.includes("signal") ||
      text.includes("market") ||
      text.includes("position")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      logger.info("[VINCE_PERPS] Building data context...");

      // Build data context from all services
      const context = await buildPerpsDataContext(runtime);

      logger.info("[VINCE_PERPS] Generating narrative...");

      // Generate LLM narrative
      const narrative = await generatePerpsNarrative(runtime, context);

      // Format final output
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      // Build source attribution - list all 15 signal aggregator sources
      const allSources = [
        "CoinGlass",
        "Top Traders (Hyperliquid)",
        "Binance (positions)",
        "Binance (taker flow)",
        "Binance Funding Extremes",
        "Binance Liquidations",
        "News Sentiment",
        "Deribit IV Skew",
        "Market Regime",
        "Sanbase (exchange flows)",
        "Sanbase (whales)",
        "Hyperliquid Bias",
        "Hyperliquid Crowding",
        "Cross-Venue Funding",
        "Deribit Put/Call Ratio",
      ];

      const outro =
        "\n---\nPulse check done. Next moves: `ALOHA` (full vibe) · `OPTIONS` (O/I flows, greeks) · `UPLOAD <url>` (stash research)";
      const output = [
        `**Perps** _${time}_`,
        "",
        narrative,
        "",
        `*Source: ${allSources.join(", ")}*`,
        outro,
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_PERPS"],
      });

      logger.info("[VINCE_PERPS] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_PERPS] Error: ${error}`);
      await callback({
        text: "Having trouble pulling perps data right now. Services may be initializing. Try again in a moment.",
        actions: ["VINCE_PERPS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "perps" } },
      {
        name: "VINCE",
        content: {
          text: "**Perps** _6:54 PM_\n\nUgly day across the board. All four majors bleeding - BTC down to 80k, ETH getting hammered at -8%, SOL following suit. Fear index sitting at 20 which normally screams buy the dip, except the L/S ratio is still at 2.6 meaning longs aren't capitulating. That's the weird part.\n\nThe signals are leaning short across the board but with weak conviction. BTC showing SHORT at 65% strength, ETH and SOL both LONG at 75% - seems like a funding play since shorts are paying. HYPE is neutral, just kind of existing.\n\nWhale activity is quiet. Tracking 2 wallets but nothing moving. Sometimes no news is news - smart money sitting on hands waiting for the flush.\n\nFunding is interesting though - ETH at -0.017% and SOL at -0.016%, both shorts paying. That negative funding with the crowded L/S could mean squeeze potential if we get any catalyst.\n\nPaper bot is active but waiting. Signal strength at 52% when we need 60%. Not forcing anything here. Would need to see a whale make a move or funding hit extreme levels to trigger an entry.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_PERPS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What are the trading signals?" } },
      {
        name: "VINCE",
        content: {
          text: "**Perps** _10:30 AM_\n\nNow we're talking. SOL woke up and chose violence - up 8% leading the pack. Funding flipped negative overnight which usually signals the squeeze is starting, not ending. BTC grinding at 85k, nothing special, but the L/S unwound from 2.9 to 1.8 suggesting the crowded long trade has finally started capitulating.\n\nSignals are bullish across the board. BTC LONG at 70%, SOL LONG at 82% - that's a strong read. ETH lagging at 65% but following. Only HYPE looking neutral.\n\nWhale just opened a $200k long on BTC about 2 hours ago. That's the confirmation I like to see - smart money positioning before the move.\n\nPaper bot went LONG BTC at $84,500 about 3 hours ago. Currently up $1,250 (+1.5%). Stop at $83,200, first TP at $86,000. The setup triggered on the funding flip plus whale activity - exactly the kind of confluence we look for.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_PERPS"],
        },
      },
    ],
  ],
};
