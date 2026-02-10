/**
 * VINCE Why Trade Action
 *
 * Human-style trade explanation that reads like a friend explaining their thesis.
 * Uses LLM to generate conversational narrative about trading decisions.
 *
 * Features:
 * - If position open: Why it was opened, thesis in plain English
 * - If no position: What's missing, what would trigger a trade
 * - Signal breakdown woven naturally into the narrative
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { Position } from "../types/paperTrading";
import { BOT_FOOTER } from "../constants/botFormat";
import { getGrokMarketReadSection } from "../utils/grokPulseParser";

// ==========================================
// Data Context Types
// ==========================================

interface PositionData {
  asset: string;
  direction: "long" | "short";
  entryPrice: number;
  markPrice: number;
  sizeUsd: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLossPrice: number;
  takeProfitPrices: number[];
  triggerSignals: string[];
  strategyName: string;
  openedAgo: string;
}

interface SignalData {
  asset: string;
  direction: "long" | "short" | "neutral";
  strength: number;
  confidence: number;
  confirmingCount: number;
  conflictingCount: number;
  factors: string[];
  sources: string[];
}

interface WhyTradeDataContext {
  hasPositions: boolean;
  positions: PositionData[];
  signals: SignalData[];
  dataSourcesActive: number;
  dataSourcesTotal: number;
  dataSourcesList: { name: string; available: boolean }[];
  thresholds: {
    strengthRequired: number;
    confidenceRequired: number;
    confirmingRequired: number;
  };
}

// ==========================================
// Build data context for LLM
// ==========================================

function buildWhyTradeDataContext(ctx: WhyTradeDataContext): string {
  const lines: string[] = [];

  lines.push("=== TRADING STATUS ===");
  lines.push(
    `Data sources: ${ctx.dataSourcesActive}/${ctx.dataSourcesTotal} active`,
  );
  lines.push(
    `Required thresholds: Strength >${ctx.thresholds.strengthRequired}%, Confidence >${ctx.thresholds.confidenceRequired}%, ${ctx.thresholds.confirmingRequired}+ confirming signals`,
  );
  lines.push("");

  if (ctx.hasPositions && ctx.positions.length > 0) {
    lines.push("=== OPEN POSITIONS ===");
    for (const pos of ctx.positions) {
      lines.push(
        `${pos.direction.toUpperCase()} ${pos.asset} @ $${pos.entryPrice.toLocaleString()}`,
      );
      lines.push(`  Opened: ${pos.openedAgo}`);
      lines.push(
        `  Size: $${pos.sizeUsd.toLocaleString()} at ${pos.leverage}x`,
      );
      lines.push(`  Strategy: ${pos.strategyName}`);
      lines.push(`  Current: $${pos.markPrice.toLocaleString()}`);
      lines.push(
        `  P&L: ${pos.unrealizedPnl >= 0 ? "+" : ""}$${pos.unrealizedPnl.toFixed(2)} (${pos.unrealizedPnlPct >= 0 ? "+" : ""}${pos.unrealizedPnlPct.toFixed(2)}%)`,
      );
      lines.push(`  Stop-Loss: $${pos.stopLossPrice.toLocaleString()}`);
      if (pos.takeProfitPrices.length > 0) {
        lines.push(
          `  Take-Profits: ${pos.takeProfitPrices.map((tp) => "$" + tp.toLocaleString()).join(", ")}`,
        );
      }
      lines.push(`  Entry signals: ${pos.triggerSignals.join(" | ")}`);
      lines.push("");
    }
  } else {
    lines.push("=== NO POSITIONS OPEN ===");
    lines.push("");
  }

  if (ctx.signals.length > 0) {
    lines.push("=== CURRENT SIGNALS ===");
    for (const sig of ctx.signals) {
      const meetsStrength = sig.strength >= ctx.thresholds.strengthRequired;
      const meetsConfidence =
        sig.confidence >= ctx.thresholds.confidenceRequired;
      const meetsConfirming =
        sig.confirmingCount >= ctx.thresholds.confirmingRequired;
      const canTrade = meetsStrength && meetsConfidence && meetsConfirming;

      lines.push(`${sig.asset}:`);
      lines.push(`  Direction: ${sig.direction.toUpperCase()}`);
      lines.push(
        `  Strength: ${sig.strength}% ${meetsStrength ? "(OK)" : "(BELOW THRESHOLD)"}`,
      );
      lines.push(
        `  Confidence: ${sig.confidence}% ${meetsConfidence ? "(OK)" : "(BELOW THRESHOLD)"}`,
      );
      lines.push(
        `  Confirming signals: ${sig.confirmingCount} ${meetsConfirming ? "(OK)" : "(NEED MORE)"}`,
      );
      lines.push(`  Conflicting: ${sig.conflictingCount}`);
      if (sig.factors.length > 0) {
        lines.push(`  Factors: ${sig.factors.join("; ")}`);
      }
      if (sig.sources.length > 0) {
        lines.push(`  Sources: ${sig.sources.join(", ")}`);
      }
      lines.push(`  Would trigger trade: ${canTrade ? "YES" : "NO"}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

async function generateWhyTradeHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are VINCE, explaining your trading decisions (or lack thereof) to a friend who wants to understand your reasoning.

Here's the data:

${dataContext}

Write a trade briefing that:
1. If positions are open: Explain the thesis naturally - why you got in, what the signals were telling you, and how it's going. Make it feel like you're explaining your conviction.
2. If no positions: Explain what's keeping you out. Be specific about what's missing. Don't just list thresholds - explain what each one means and why it matters.
3. Weave the signal breakdown into your explanation naturally. "Funding is negative at -0.015% which means shorts are paying - that's squeeze potential" is better than listing "Funding: -0.015%".
4. If you're in a trade, explain the risk management - where you're stopping out and why that level makes sense.
5. If you're waiting, explain what would get you in. Be specific - "a whale opening a short would add 20-30% to signal strength" is actionable.

STYLE RULES:
- Write like explaining to a smart trader friend
- Mix conviction with humility
- Use specific numbers but naturally - "up 85 bucks, about 0.8%" not "Unrealized P&L: +$85.00 (+0.80%)"
- No bullet points or headers - flow naturally
- Have conviction in your explanations but acknowledge uncertainty
- Around 150-250 words. Dense insight, no padding.

AVOID:
- "Interestingly", "notably"
- Robotic threshold listings
- Being overly cautious or hedging everything
- Generic takes

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_WHY_TRADE] Failed to generate briefing: ${error}`);
    return "Can't put together the trade explanation right now. Services might be warming up - give it another shot.";
  }
}

// ==========================================
// Utility Functions
// ==========================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ago`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return `${seconds}s ago`;
  }
}

function positionToData(pos: Position): PositionData {
  return {
    asset: pos.asset,
    direction: pos.direction,
    entryPrice: pos.entryPrice,
    markPrice: pos.markPrice,
    sizeUsd: pos.sizeUsd,
    leverage: pos.leverage,
    unrealizedPnl: pos.unrealizedPnl,
    unrealizedPnlPct: pos.unrealizedPnlPct,
    stopLossPrice: pos.stopLossPrice,
    takeProfitPrices: pos.takeProfitPrices,
    triggerSignals: pos.triggerSignals,
    strategyName: pos.strategyName,
    openedAgo: formatDuration(Date.now() - pos.openedAt),
  };
}

// ==========================================
// Action Definition
// ==========================================

export const vinceWhyTradeAction: Action = {
  name: "VINCE_WHY_TRADE",
  similes: [
    "WHY_TRADE",
    "WHY TRADE",
    "EXPLAIN_TRADE",
    "EXPLAIN TRADE",
    "WHY_NOT_TRADING",
    "WHY NOT TRADING",
    "TRADE_REASONING",
    "BRIEFING",
  ],
  description:
    "Human-style explanation of trading decisions - why in a trade or why sitting out",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("why") ||
      text.includes("explain") ||
      text.includes("reasoning") ||
      text.includes("briefing")
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
      const positionManager = runtime.getService(
        "VINCE_POSITION_MANAGER_SERVICE",
      ) as VincePositionManagerService | null;
      const signalAggregator = runtime.getService(
        "VINCE_SIGNAL_AGGREGATOR_SERVICE",
      ) as VinceSignalAggregatorService | null;

      if (!positionManager) {
        await callback({
          text: "Paper trading bot isn't active yet. Services are still spinning up - check back in a minute.",
          actions: ["VINCE_WHY_TRADE"],
        });
        return;
      }

      logger.info("[VINCE_WHY_TRADE] Building trade context...");

      // Get positions
      const positions = positionManager.getOpenPositions();
      const positionData = positions.map(positionToData);

      // Get signals
      const signals: SignalData[] = [];
      let dataSourcesActive = 0;
      let dataSourcesTotal = 0;
      let dataSourcesList: { name: string; available: boolean }[] = [];

      if (signalAggregator) {
        try {
          const allSignals = await signalAggregator.getAllSignals();
          const signalStatus = signalAggregator.getStatus();

          if (signalStatus.dataSources) {
            dataSourcesTotal = signalStatus.dataSources.length;
            dataSourcesActive = signalStatus.dataSources.filter(
              (d) => d.available,
            ).length;
            dataSourcesList = signalStatus.dataSources.map((d) => ({
              name: d.name,
              available: d.available,
            }));
          }

          for (const sig of allSignals) {
            signals.push({
              asset: sig.asset,
              direction: sig.direction,
              strength: sig.strength,
              confidence: sig.confidence,
              confirmingCount: sig.confirmingCount ?? sig.factors.length,
              conflictingCount: 0,
              factors: sig.factors,
              sources: sig.sources || [],
            });
          }
        } catch (error) {
          logger.warn(`[VINCE_WHY_TRADE] Could not get signals: ${error}`);
        }
      }

      // Build context
      const ctx: WhyTradeDataContext = {
        hasPositions: positions.length > 0,
        positions: positionData,
        signals,
        dataSourcesActive,
        dataSourcesTotal,
        dataSourcesList,
        thresholds: {
          strengthRequired: 60,
          confidenceRequired: 60,
          confirmingRequired: 2,
        },
      };

      // Generate briefing
      let dataContext = buildWhyTradeDataContext(ctx);
      dataContext += getGrokMarketReadSection();
      logger.info("[VINCE_WHY_TRADE] Generating briefing...");
      const briefing = await generateWhyTradeHumanBriefing(
        runtime,
        dataContext,
      );

      const output = [
        "**Trade Briefing**",
        "",
        briefing,
        "",
        "*Paper Trading Bot*",
        BOT_FOOTER,
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_WHY_TRADE"],
      });

      logger.info("[VINCE_WHY_TRADE] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_WHY_TRADE] Error: ${error}`);
      await callback({
        text: "Something went wrong pulling the trade context. Try again in a moment.",
        actions: ["VINCE_WHY_TRADE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "why trade" } },
      {
        name: "VINCE",
        content: {
          text: "**Trade Briefing**\n\nI'm long BTC from 80,340, about 3 and a half hours in. Position's up 85 bucks, roughly 0.85% on a $5k size at 3x leverage.\n\nThe thesis here is pretty straightforward - funding went negative at -0.015% which means shorts are paying longs to maintain their positions. When you see that, it usually means shorts are crowded and getting uncomfortable. Add in the L/S ratio unwinding - the crowded side is capitulating - and you've got squeeze potential.\n\nI got in via the signal following strategy. Two confirming signals from different sources, both pointing the same direction. That's the kind of confluence I look for.\n\nRisk is defined. Stop is at 79,100 which is about 1.5% below entry - tight but gives it room to breathe through normal volatility. First target is 81,500 where I'll take partial, second at 83k for the rest.\n\nRight now mark price is at 81,025 so we're in the money and the thesis is playing out. Shorts are still paying, nothing has changed to invalidate the setup. Holding with conviction until either my stop or my targets get hit.\n\n*Paper Trading Bot*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_WHY_TRADE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "why not trading" } },
      {
        name: "VINCE",
        content: {
          text: "**Trade Briefing**\n\nNo positions right now. The signals are leaning short but not convincingly enough to put money on.\n\nLooking at BTC specifically - direction is short, which is fine, I can trade either way. The problem is strength is only at 52% and I need it above 60 to pull the trigger. That 8% gap matters because at 52% you're basically saying \"slightly more bearish than not\" which isn't a trade, it's a coin flip with bad odds.\n\nConfidence is even worse at 48%. That means the signals that are pointing short aren't doing so with much conviction. One confirming signal when I need two isn't helping either.\n\nWhat would flip this? A whale opening a short would add 20-30% to signal strength immediately. That's the highest weight single signal. Or if funding goes extreme positive - meaning longs are crowded and paying premiums - that's another strong short signal. Either of those plus an extreme fear reading would get me over the threshold.\n\nFor now I'm sitting. The setup isn't there. Markets spend most of their time in these ambiguous zones where the right trade is no trade. I'd rather miss a move than force something that isn't there.\n\n*Paper Trading Bot*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_WHY_TRADE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "explain your position" } },
      {
        name: "VINCE",
        content: {
          text: "**Trade Briefing**\n\nI've got two positions running right now, both in profit.\n\nThe main one is a long on ETH from 3,420, about 6 hours old. Up 2.1% on it, roughly $210 on a $10k position at 2x. The setup was a combination of extreme fear on the sentiment index plus a whale accumulating. When you see smart money buying into fear, that's usually the play. Stop is set at 3,320 - below the recent swing low - and I'm targeting 3,600 first, then 3,750.\n\nSecond position is a smaller SOL long from 142, running about 2 hours. Only up 0.6% so far but the thesis is similar - funding negative, shorts paying, L/S ratio suggesting crowded shorts. This one's more speculative, smaller size at $2k with 2x. Stop at 138, target 148 then 152.\n\nBoth trades are thesis intact. ETH fear has already started reversing which validates the entry. SOL funding is still negative so shorts are still paying me to hold. Nothing to do but let them run and manage the risk.\n\nIf either hits stop, I'm out no questions. But right now both are working exactly as expected.\n\n*Paper Trading Bot*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_WHY_TRADE"],
        },
      },
    ],
  ],
};
