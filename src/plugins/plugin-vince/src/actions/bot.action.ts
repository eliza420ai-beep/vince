/**
 * VINCE Bot Action - Hybrid Trading Strategy
 *
 * Combines the BEST of Core, Expert, and Degen strategies:
 *
 * FROM EXPERT (Primary Foundation):
 * - ATR-normalized dynamic thresholds
 * - RSI quality scoring (momentum confirmation)
 * - Volume spike detection
 * - Order book depth analysis
 * - Market regime filtering
 * - Trend alignment with SMA
 * - Funding percentile analysis
 *
 * FROM DEGEN (Opportunistic Edge):
 * - Whale signal priority (highest weight)
 * - Lower activation thresholds
 * - Volatility boost (opportunity, not risk)
 * - RSI extreme detection as fallback
 *
 * FROM CORE (Reliability):
 * - Simple funding confirmation
 * - Conservative position sizing
 * - Circuit breaker safety
 *
 * This action evaluates BTC and triggers paper trades when conditions are met.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceRiskManagerService } from "../services/vinceRiskManager.service";
import type { AggregatedTradeSignal } from "../types/paperTrading";
import { BOT_FOOTER } from "../constants/botFormat";

// ==========================================
// Hybrid Strategy Configuration
// ==========================================

/** Hybrid thresholds (between Expert and Degen) */
const HYBRID_CONFIG = {
  // Signal thresholds
  MIN_STRENGTH: 55,           // Expert: 55, Degen: 30
  MIN_CONFIDENCE: 55,         // Expert: 50, Degen: 30
  DYNAMIC_THRESHOLD_PCT: 0.3, // Expert: 0.5-1%, Degen: 0.2%

  // Position sizing (from Expert for safety)
  MAX_LEVERAGE: 5,            // Expert: 3, Degen: 40
  POSITION_SIZE_PCT: 5,       // Expert: 5-10%, Degen: 2.5%
  STOP_LOSS_ATR_MULT: 1.5,    // Expert: 2, Degen: 0.8
  TAKE_PROFIT_RR_RATIOS: [1.5, 3, 5], // R:R targets

  // Signal weights
  WHALE_SIGNAL_BOOST: 25,     // Degen priority
  VOLUME_SPIKE_BOOST: 15,
  RSI_CONFIRMATION_BOOST: 10,
  FUNDING_CONFIRMATION_BOOST: 10,
  ORDER_BOOK_BOOST: 8,
  VOLATILITY_BOOST: 10,       // Degen: volatility = opportunity

  // Thresholds
  VOLUME_SPIKE_THRESHOLD: 1.5,
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  FUNDING_EXTREME_THRESHOLD: 0.0003, // 0.03%
} as const;

// ==========================================
// Hybrid Signal Interface
// ==========================================

interface HybridSignal {
  direction: "long" | "short" | "neutral";
  strength: number;
  confidence: number;
  factors: string[];
  reasoning: string[];
  positionSizePct: number;
  leverage: number;
  stopLoss: number;
  takeProfits: number[];
  wouldTrade: boolean;
  whyNotTrade: string[];
}

// ==========================================
// Strategy Evaluation
// ==========================================

async function evaluateHybridStrategy(
  runtime: IAgentRuntime,
  asset: string = "BTC"
): Promise<HybridSignal> {
  const factors: string[] = [];
  const reasoning: string[] = [];
  const whyNotTrade: string[] = [];
  let strength = 40; // Base strength (slightly lower than Expert's 50)
  let confidence = 40;
  let direction: "long" | "short" | "neutral" = "neutral";

  // Get services
  const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
  const coinGlass = runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
  const topTraders = runtime.getService("VINCE_TOP_TRADERS_SERVICE") as VinceTopTradersService | null;
  const signalAggregator = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as VinceSignalAggregatorService | null;

  // Get market context
  let currentPrice = 0;
  let atr = 0;
  let rsi = 50;
  let priceChange24h = 0;
  let volumeRatio = 1;
  let marketRegime = "ranging";
  let priceVsSma20 = 0;
  let bidAskRatio = 1;
  let fundingRate = 0;

  // Fetch enriched context
  if (marketData) {
    try {
      const ctx = await marketData.getEnrichedContext(asset);
      if (ctx) {
        currentPrice = ctx.currentPrice;
        atr = ctx.atr || currentPrice * 0.02;
        rsi = ctx.rsi14 || 50;
        priceChange24h = ctx.priceChange24h;
        volumeRatio = ctx.volumeRatio || 1;
        marketRegime = ctx.marketRegime || "ranging";
        priceVsSma20 = ctx.priceVsSma20 || 0;
        bidAskRatio = ctx.bidAskRatio || 1;
      }
    } catch (e) {
      logger.warn(`[BotAction] Failed to get market context: ${e}`);
    }
  }

  // Fetch funding rate
  if (coinGlass) {
    try {
      const funding = coinGlass.getFunding(asset);
      if (funding) {
        fundingRate = funding.rate;
      }
    } catch (e) {
      // Silent fail
    }
  }

  // === 1. REGIME CHECK (from Expert) ===
  if (marketRegime === "extreme") {
    reasoning.push("Market regime is EXTREME - skipping trade for safety");
    whyNotTrade.push("Extreme volatility regime - waiting for stabilization");
    return createNeutralSignal(currentPrice, atr, whyNotTrade, ["Extreme regime detected"]);
  }

  if (marketRegime === "volatile") {
    // DEGEN TWIST: Volatility boost instead of reduction
    strength += HYBRID_CONFIG.VOLATILITY_BOOST;
    factors.push(`🔥 Volatile regime: +${HYBRID_CONFIG.VOLATILITY_BOOST} strength (Degen: volatility = opportunity)`);
  }

  // === 2. WHALE SIGNALS (from Degen - Priority 1) ===
  let whaleDirection: "long" | "short" | null = null;
  if (topTraders) {
    try {
      const recentSignals = topTraders.getRecentSignals(5);
      const assetSignals = recentSignals.filter(s => s.asset === asset);

      if (assetSignals.length > 0) {
        const latestSignal = assetSignals[0];
        const age = (Date.now() - latestSignal.timestamp) / (60 * 1000);

        if (age < 60) { // Within 60 minutes
          if (latestSignal.action === "opened_long" || latestSignal.action === "increased_long") {
            whaleDirection = "long";
            direction = "long";
            strength += HYBRID_CONFIG.WHALE_SIGNAL_BOOST;
            confidence += 15;
            const sizeK = (latestSignal.size / 1000).toFixed(0);
            factors.push(`🐋 Whale ${latestSignal.action.replace("_", " ")} $${sizeK}k: +${HYBRID_CONFIG.WHALE_SIGNAL_BOOST} strength`);
            reasoning.push(`Smart money just went LONG. Whale opened $${sizeK}k position within ${Math.round(age)} minutes.`);
          } else if (latestSignal.action === "opened_short" || latestSignal.action === "increased_short") {
            whaleDirection = "short";
            direction = "short";
            strength += HYBRID_CONFIG.WHALE_SIGNAL_BOOST;
            confidence += 15;
            const sizeK = (latestSignal.size / 1000).toFixed(0);
            factors.push(`🐋 Whale ${latestSignal.action.replace("_", " ")} $${sizeK}k: +${HYBRID_CONFIG.WHALE_SIGNAL_BOOST} strength`);
            reasoning.push(`Smart money just went SHORT. Whale opened $${sizeK}k position within ${Math.round(age)} minutes.`);
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  // === 3. AGGREGATED SIGNAL CHECK ===
  if (signalAggregator && direction === "neutral") {
    try {
      const signal = await signalAggregator.getSignal(asset);
      if (signal && signal.confidence >= 40) {
        if (signal.direction === "long" || signal.direction === "short") {
          direction = signal.direction;
          strength += Math.round(signal.strength * 0.3); // 30% of signal strength
          confidence += Math.round(signal.confidence * 0.3);
          factors.push(`📊 Aggregated signal: ${signal.direction.toUpperCase()} (${signal.confidence}% conf)`);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  // === 4. MOMENTUM CHECK (from Expert) ===
  const dynamicThreshold = Math.max(
    HYBRID_CONFIG.DYNAMIC_THRESHOLD_PCT,
    (atr / currentPrice) * 100 * 0.5
  );

  const hasMomentum = Math.abs(priceChange24h) >= dynamicThreshold;
  if (hasMomentum && direction === "neutral") {
    direction = priceChange24h > 0 ? "long" : "short";
    strength += 10;
    factors.push(`📈 Price ${priceChange24h > 0 ? "up" : "down"} ${Math.abs(priceChange24h).toFixed(2)}% (threshold: ${dynamicThreshold.toFixed(2)}%)`);
  }

  // === 5. RSI CONFIRMATION (from Expert) ===
  if (direction === "long" && rsi > 40 && rsi < HYBRID_CONFIG.RSI_OVERBOUGHT) {
    strength += HYBRID_CONFIG.RSI_CONFIRMATION_BOOST;
    factors.push(`RSI ${rsi.toFixed(0)} confirms bullish momentum`);
  } else if (direction === "short" && rsi < 60 && rsi > HYBRID_CONFIG.RSI_OVERSOLD) {
    strength += HYBRID_CONFIG.RSI_CONFIRMATION_BOOST;
    factors.push(`RSI ${rsi.toFixed(0)} confirms bearish momentum`);
  } else if (direction === "long" && rsi > HYBRID_CONFIG.RSI_OVERBOUGHT) {
    strength -= 5;
    reasoning.push(`RSI ${rsi.toFixed(0)} overbought - momentum may exhaust`);
  } else if (direction === "short" && rsi < HYBRID_CONFIG.RSI_OVERSOLD) {
    strength -= 5;
    reasoning.push(`RSI ${rsi.toFixed(0)} oversold - momentum may exhaust`);
  }

  // === 6. RSI EXTREME FALLBACK (from Degen) ===
  if (direction === "neutral") {
    if (rsi < 25) {
      direction = "long";
      strength += 15;
      factors.push(`📉 RSI extreme oversold (${rsi.toFixed(0)}) - contrarian long`);
      reasoning.push("RSI at extreme levels. Oversold bounce setup.");
    } else if (rsi > 75) {
      direction = "short";
      strength += 15;
      factors.push(`📈 RSI extreme overbought (${rsi.toFixed(0)}) - contrarian short`);
      reasoning.push("RSI at extreme levels. Overbought pullback setup.");
    }
  }

  // === 7. FUNDING CONFIRMATION (from Core/Expert) ===
  if (direction !== "neutral") {
    const fundingPct = (fundingRate * 100).toFixed(4);
    if (direction === "long" && fundingRate < HYBRID_CONFIG.FUNDING_EXTREME_THRESHOLD) {
      strength += HYBRID_CONFIG.FUNDING_CONFIRMATION_BOOST;
      if (fundingRate < 0) {
        factors.push(`Funding negative (${fundingPct}%) - shorts crowded, squeeze potential`);
        reasoning.push("Negative funding means shorts are paying longs. Shorts are crowded and we get paid to hold.");
      } else {
        factors.push(`Funding neutral (${fundingPct}%) - not crowded`);
      }
    } else if (direction === "short" && fundingRate > -HYBRID_CONFIG.FUNDING_EXTREME_THRESHOLD) {
      strength += HYBRID_CONFIG.FUNDING_CONFIRMATION_BOOST;
      if (fundingRate > 0) {
        factors.push(`Funding positive (${fundingPct}%) - longs crowded, flush potential`);
        reasoning.push("Positive funding means longs are paying shorts. Longs are crowded and vulnerable.");
      } else {
        factors.push(`Funding neutral (${fundingPct}%) - not crowded`);
      }
    } else {
      // Funding against us
      strength -= 5;
      reasoning.push(`Funding ${fundingPct}% shows crowding in our direction - increased risk`);
    }
  }

  // === 8. MEAN REVERSION FALLBACK (from Expert) ===
  if (direction === "neutral" && Math.abs(fundingRate) > HYBRID_CONFIG.FUNDING_EXTREME_THRESHOLD * 2) {
    // Extreme funding = fade the crowd
    direction = fundingRate > 0 ? "short" : "long";
    strength += 15;
    const fundingPct = (fundingRate * 100).toFixed(4);
    factors.push(`💰 Extreme funding (${fundingPct}%) - fading crowded ${fundingRate > 0 ? "longs" : "shorts"}`);
    reasoning.push(`Extreme funding indicates ${fundingRate > 0 ? "longs" : "shorts"} are heavily crowded. Mean reversion likely.`);
  }

  // === 9. VOLUME CONFIRMATION (from Expert) ===
  if (volumeRatio >= HYBRID_CONFIG.VOLUME_SPIKE_THRESHOLD) {
    strength += HYBRID_CONFIG.VOLUME_SPIKE_BOOST;
    confidence += 10;
    factors.push(`🔊 Volume spike: ${volumeRatio.toFixed(1)}x average`);
    reasoning.push("High volume confirms real interest behind the move.");
  } else if (volumeRatio < 0.7) {
    strength -= 5;
    reasoning.push(`Low volume (${volumeRatio.toFixed(1)}x) - move may lack conviction`);
  }

  // === 10. ORDER BOOK CONFIRMATION (from Expert) ===
  if (direction === "long" && bidAskRatio > 1.2) {
    strength += HYBRID_CONFIG.ORDER_BOOK_BOOST;
    factors.push(`📗 Order book favors longs (${bidAskRatio.toFixed(2)} ratio)`);
  } else if (direction === "short" && bidAskRatio < 0.8) {
    strength += HYBRID_CONFIG.ORDER_BOOK_BOOST;
    factors.push(`📕 Order book favors shorts (${bidAskRatio.toFixed(2)} ratio)`);
  } else if (
    (direction === "long" && bidAskRatio < 0.7) ||
    (direction === "short" && bidAskRatio > 1.3)
  ) {
    strength -= 5;
    reasoning.push("Order book opposes our direction");
  }

  // === 11. TREND ALIGNMENT (from Expert) ===
  if (direction === "long" && priceVsSma20 > 0) {
    strength += 5;
    factors.push(`Price ${priceVsSma20.toFixed(1)}% above SMA20 - trend aligned`);
  } else if (direction === "short" && priceVsSma20 < 0) {
    strength += 5;
    factors.push(`Price ${Math.abs(priceVsSma20).toFixed(1)}% below SMA20 - trend aligned`);
  }

  // === CALCULATE CONFIDENCE ===
  const confirmingCount = factors.length;
  confidence = Math.min(100, confidence + confirmingCount * 5);

  // === CHECK THRESHOLDS ===
  const wouldTrade = 
    direction !== "neutral" &&
    strength >= HYBRID_CONFIG.MIN_STRENGTH &&
    confidence >= HYBRID_CONFIG.MIN_CONFIDENCE;

  if (!wouldTrade) {
    if (direction === "neutral") {
      whyNotTrade.push("No clear direction detected");
    }
    if (strength < HYBRID_CONFIG.MIN_STRENGTH) {
      whyNotTrade.push(`Strength ${strength}% (need ${HYBRID_CONFIG.MIN_STRENGTH}%)`);
    }
    if (confidence < HYBRID_CONFIG.MIN_CONFIDENCE) {
      whyNotTrade.push(`Confidence ${confidence}% (need ${HYBRID_CONFIG.MIN_CONFIDENCE}%)`);
    }
    if (!whaleDirection) {
      whyNotTrade.push("No whale activity in past 60 min");
    }
    if (volumeRatio < HYBRID_CONFIG.VOLUME_SPIKE_THRESHOLD) {
      whyNotTrade.push(`Volume ${volumeRatio.toFixed(1)}x (need ${HYBRID_CONFIG.VOLUME_SPIKE_THRESHOLD}x for confirmation)`);
    }
  }

  // === CALCULATE LEVELS ===
  const leverage = HYBRID_CONFIG.MAX_LEVERAGE;
  const positionSizePct = HYBRID_CONFIG.POSITION_SIZE_PCT;
  const stopDistance = atr * HYBRID_CONFIG.STOP_LOSS_ATR_MULT;
  const stopLoss = direction === "long"
    ? currentPrice - stopDistance
    : currentPrice + stopDistance;

  const takeProfits = HYBRID_CONFIG.TAKE_PROFIT_RR_RATIOS.map(rr => {
    const target = stopDistance * rr;
    return direction === "long" ? currentPrice + target : currentPrice - target;
  });

  // Add summary reasoning
  if (wouldTrade) {
    reasoning.unshift(`${direction.toUpperCase()} ${asset} setup detected with ${confirmingCount} confirming factors.`);
  }

  return {
    direction: direction === "neutral" ? "neutral" : direction,
    strength: Math.round(Math.min(100, Math.max(0, strength))),
    confidence: Math.round(Math.min(100, Math.max(0, confidence))),
    factors,
    reasoning,
    positionSizePct,
    leverage,
    stopLoss,
    takeProfits,
    wouldTrade,
    whyNotTrade,
  };
}

function createNeutralSignal(
  currentPrice: number,
  atr: number,
  whyNotTrade: string[],
  factors: string[]
): HybridSignal {
  return {
    direction: "neutral",
    strength: 0,
    confidence: 0,
    factors,
    reasoning: ["Market conditions not suitable for trading"],
    positionSizePct: 0,
    leverage: 0,
    stopLoss: currentPrice - atr,
    takeProfits: [],
    wouldTrade: false,
    whyNotTrade,
  };
}

// ==========================================
// Format Response
// ==========================================

function formatTradeTriggered(
  asset: string,
  signal: HybridSignal,
  entryPrice: number
): string {
  const dirIcon = signal.direction === "long" ? "🟢" : "🔴";
  const sizeUsd = (100000 * signal.positionSizePct / 100).toLocaleString();
  const lines: string[] = [];

  lines.push(`**${asset} Trade Opened**`);
  lines.push("");
  lines.push(`${dirIcon} **${signal.direction.toUpperCase()} ${asset}** @ $${entryPrice.toLocaleString()} · $${sizeUsd} · ${signal.leverage}x`);
  lines.push(`SL $${signal.stopLoss.toLocaleString()} · TP1 $${signal.takeProfits[0]?.toLocaleString() || "—"}`);
  lines.push("");
  lines.push("**Thesis**");
  for (const reason of signal.reasoning.slice(0, 3)) {
    lines.push(reason);
  }
  lines.push("");
  lines.push(`**Signals** ${signal.strength}% · ${signal.confidence}%`);
  for (const f of signal.factors.slice(0, 4)) {
    lines.push(`• ${f.replace(/^[•·]\s*/, "")}`);
  }

  return lines.join("\n") + BOT_FOOTER;
}

function formatNoTrade(asset: string, signal: HybridSignal): string {
  const lines: string[] = [];

  lines.push(`**${asset} — No Trade**`);
  lines.push("");
  lines.push(`Signal: **${signal.direction.toUpperCase()}** (${signal.strength}% strength · ${signal.confidence}% confidence)`);
  lines.push("");
  lines.push("**Missing**");
  lines.push(signal.whyNotTrade.slice(0, 5).join(" · "));
  if (signal.strength < HYBRID_CONFIG.MIN_STRENGTH || signal.confidence < HYBRID_CONFIG.MIN_CONFIDENCE) {
    const triggers: string[] = [];
    if (signal.strength < HYBRID_CONFIG.MIN_STRENGTH) triggers.push(`Whale (+${HYBRID_CONFIG.WHALE_SIGNAL_BOOST}%) or volume spike`);
    if (signal.confidence < HYBRID_CONFIG.MIN_CONFIDENCE) triggers.push("extreme funding or RSI");
    lines.push("");
    lines.push(`**Would trigger** ${triggers.join("; ")}`);
  }
  if (signal.factors.length > 0) {
    lines.push("");
    lines.push(signal.factors.slice(0, 3).map(f => f.replace(/^[•·]\s*/, "")).join(" · "));
  }

  return lines.join("\n") + BOT_FOOTER;
}

// ==========================================
// Action Definition
// ==========================================

export const vinceBotAction: Action = {
  name: "VINCE_BOT_TRADE",
  similes: ["TRADE", "TRIGGER_BOT", "RUN_BOT", "EXECUTE", "GO_LONG", "GO_SHORT", "TRADE_NOW"],
  description: "Evaluates BTC using hybrid Core/Expert/Degen strategy and triggers paper trade if conditions are met",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text === "trade" ||
      text === "execute" ||
      text.includes("trigger") ||
      text.includes("run bot") ||
      text.includes("trade now") ||
      text.includes("go long") ||
      text.includes("go short") ||
      text.includes("open trade") ||
      text.includes("take trade")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      logger.info("[VINCE_BOT_TRADE] Evaluating hybrid strategy for BTC...");

      const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as VincePaperTradingService | null;
      const positionManager = runtime.getService("VINCE_POSITION_MANAGER_SERVICE") as VincePositionManagerService | null;
      const riskManager = runtime.getService("VINCE_RISK_MANAGER_SERVICE") as VinceRiskManagerService | null;
      const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;

      if (!paperTrading || !positionManager) {
        await callback({
          text: "Paper trading bot is not active. Services still initializing.",
          actions: ["VINCE_BOT_TRADE"],
        });
        return;
      }

      // Check if already have BTC position
      if (positionManager.hasOpenPosition("BTC")) {
        const positions = positionManager.getOpenPositions();
        const btcPos = positions.find(p => p.asset === "BTC");
        if (btcPos) {
          const pnlStr = btcPos.unrealizedPnl >= 0 
            ? `+$${btcPos.unrealizedPnl.toFixed(0)}` 
            : `-$${Math.abs(btcPos.unrealizedPnl).toFixed(0)}`;
          await callback({
            text: `Already have an open BTC position:\n\n` +
              `${btcPos.direction === "long" ? "🟢" : "🔴"} **${btcPos.direction.toUpperCase()} BTC** @ $${btcPos.entryPrice.toLocaleString()}\n` +
              `P&L: ${pnlStr} (${btcPos.unrealizedPnlPct.toFixed(2)}%)\n\n` +
              `_Use \`bot\` to see full status or wait for position to close._`,
            actions: ["VINCE_BOT_TRADE"],
          });
          return;
        }
      }

      // Check if bot is paused
      if (paperTrading.isPaused()) {
        const status = paperTrading.getStatus();
        await callback({
          text: `Paper trading bot is **PAUSED**${status.pauseReason ? `: ${status.pauseReason}` : ""}\n\n` +
            `Use \`resume bot\` to resume trading.`,
          actions: ["VINCE_BOT_TRADE"],
        });
        return;
      }

      // Evaluate hybrid strategy
      const signal = await evaluateHybridStrategy(runtime, "BTC");

      if (!signal.wouldTrade) {
        // No trade - explain why
        await callback({
          text: formatNoTrade("BTC", signal),
          actions: ["VINCE_BOT_TRADE"],
        });
        return;
      }

      // Get current price for entry
      let entryPrice = 0;
      if (marketData) {
        try {
          const ctx = await marketData.getEnrichedContext("BTC");
          entryPrice = ctx?.currentPrice || 0;
        } catch (e) {
          logger.error(`[VINCE_BOT_TRADE] Failed to get entry price: ${e}`);
        }
      }

      if (!entryPrice) {
        await callback({
          text: "Unable to get current BTC price. Try again in a moment.",
          actions: ["VINCE_BOT_TRADE"],
        });
        return;
      }

      // Validate with risk manager
      if (riskManager) {
        const portfolio = positionManager.getPortfolio();
        const sizeUsd = portfolio.totalValue * (signal.positionSizePct / 100);
        
        const validation = riskManager.validateTrade({
          sizeUsd,
          leverage: signal.leverage,
          portfolioValue: portfolio.totalValue,
          currentExposure: positionManager.getCurrentExposure(),
        });

        if (!validation.valid) {
          await callback({
            text: `Trade blocked by risk manager: ${validation.reason}\n\n` +
              `Signal was: ${signal.direction.toUpperCase()} with ${signal.strength}% strength\n\n` +
              `_Check \`bot\` for current risk state._`,
            actions: ["VINCE_BOT_TRADE"],
          });
          return;
        }
      }

      // Build trade signal for paper trading
      const tradeSignal: AggregatedTradeSignal = {
        asset: "BTC",
        direction: signal.direction as "long" | "short",
        strength: signal.strength,
        confidence: signal.confidence,
        confirmingCount: signal.factors.length,
        conflictingCount: 0,
        signals: signal.factors.map(f => ({
          source: "hybrid_strategy",
          direction: signal.direction as "long" | "short",
          strength: signal.strength,
          description: f,
        })),
        reasons: signal.factors,
        sourceBreakdown: {},
        timestamp: Date.now(),
      };

      // Execute trade
      const portfolio = positionManager.getPortfolio();
      const sizeUsd = portfolio.totalValue * (signal.positionSizePct / 100);

      const position = await paperTrading.openTrade({
        asset: "BTC",
        direction: signal.direction as "long" | "short",
        sizeUsd,
        leverage: signal.leverage,
        signal: tradeSignal,
      });

      if (position) {
        logger.info(`[VINCE_BOT_TRADE] ✅ Opened ${signal.direction.toUpperCase()} BTC @ $${position.entryPrice}`);
        await callback({
          text: formatTradeTriggered("BTC", signal, position.entryPrice),
          actions: ["VINCE_BOT_TRADE"],
        });
      } else {
        await callback({
          text: "Failed to execute trade. Check bot status with `bot` command.",
          actions: ["VINCE_BOT_TRADE"],
        });
      }

    } catch (error) {
      logger.error(`[VINCE_BOT_TRADE] Error: ${error}`);
      await callback({
        text: "Error evaluating trade. Try again in a moment.",
        actions: ["VINCE_BOT_TRADE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "trade" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Paper Trade Triggered**\n\n🟢 **LONG BTC** @ $85,340 (5x leverage)\nPosition: $5,000 | Stop: $83,800 | TP1: $87,500\n\n**THE THESIS**\nLONG BTC setup detected with 5 confirming factors.\nSmart money just went LONG. Whale opened $500k position within 15 minutes.\nNegative funding means shorts are paying longs. Shorts are crowded and we get paid to hold.\n\n**SIGNAL BREAKDOWN**\n• 🐋 Whale opened long $500k: +25 strength\n• Funding negative (-0.012%) - shorts crowded, squeeze potential\n• RSI 48 confirms bullish momentum\n• 🔊 Volume spike: 1.8x average\n• Order book favors longs (1.35 ratio)\n• **Total: 75% strength, 70% confidence**\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_BOT_TRADE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "go long" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Analysis - No Trade**\n\nCurrent Signal: **LONG** (strength: 42%, confidence: 38%)\n\n**WHAT'S MISSING**\n• Strength 42% (need 55%)\n• Confidence 38% (need 55%)\n• No whale activity in past 60 min\n• Volume 0.9x (need 1.5x for confirmation)\n\n**WHAT WOULD TRIGGER**\n• +13% strength could come from:\n   - Whale opening position (+25% weight)\n   - Volume spike above 1.5x (+15%)\n• More confirming signals needed:\n   - Extreme funding (>0.03% or <-0.03%)\n   - RSI reaching extreme (<25 or >75)\n\n**CURRENT FACTORS**\n• Price up 0.5% (threshold: 0.30%)\n• RSI 52 - neutral zone\n\n_Use `bot` to check bot status, `perps` for market overview_",
          actions: ["VINCE_BOT_TRADE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "trigger" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Paper Trade Triggered**\n\n🔴 **SHORT BTC** @ $92,150 (5x leverage)\nPosition: $5,000 | Stop: $94,200 | TP1: $89,100\n\n**THE THESIS**\nSHORT BTC setup detected with 4 confirming factors.\nRSI at extreme levels. Overbought pullback setup.\nPositive funding means longs are paying shorts. Longs are crowded and vulnerable.\n\n**SIGNAL BREAKDOWN**\n• 📈 RSI extreme overbought (78) - contrarian short\n• Funding positive (0.028%) - longs crowded, flush potential\n• 🔥 Volatile regime: +10 strength (Degen: volatility = opportunity)\n• Price 2.1% above SMA20 - extended\n• **Total: 68% strength, 62% confidence**\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_BOT_TRADE"],
        },
      },
    ],
  ],
};

export default vinceBotAction;
