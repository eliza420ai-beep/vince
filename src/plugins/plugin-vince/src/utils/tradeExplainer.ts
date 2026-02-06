/**
 * VINCE Trade Explainer Utilities
 *
 * Converts trading signals into educational narratives.
 * Explains WHY trades are happening (or not) in human terms.
 */

import type {
  Position,
  AggregatedTradeSignal,
  TradeSignalDetail,
} from "../types/paperTrading";
import { SIGNAL_EXPLANATIONS } from "../constants/paperTradingDefaults";

// ==========================================
// Signal Explanation Mappings
// ==========================================

const SIGNAL_PATTERN_EXPLANATIONS: Record<
  string,
  (context: string, direction: string) => string
> = {
  // Market Regime
  ranging: (ctx, dir) =>
    `**Market Regime: Ranging** - Mean reversion works best here. Price bounces between levels rather than trending. ${dir === "short" ? "Shorting near resistance" : "Buying near support"}.`,

  trending: (ctx, dir) =>
    `**Market Regime: Trending** - Momentum strategies excel. Following the dominant ${dir === "long" ? "uptrend" : "downtrend"} rather than fighting it.`,

  // Funding Rate
  funding: (ctx, dir) => {
    const match = ctx.match(/(-?\d+(?:\.\d+)?%?)/);
    const rate = match ? match[1] : "current level";
    const isNegative =
      ctx.includes("-") || ctx.toLowerCase().includes("negative");
    const isHigh =
      ctx.toLowerCase().includes("high") ||
      ctx.toLowerCase().includes("extreme");

    if (isNegative && dir === "long") {
      return `**Funding negative (${rate})** - Shorts are crowded and paying premiums. Potential short squeeze setup. We get paid to hold longs.`;
    } else if (isHigh && dir === "short") {
      return `**Funding elevated (${rate})** - Longs are crowded and paying premiums. Overleveraged longs vulnerable to flush.`;
    }
    return `**Funding at ${rate}** - Positioning favors ${dir} bias.`;
  },

  // Long/Short Ratio
  "l/s": (ctx, dir) => {
    const match = ctx.match(/(\d+(?:\.\d+)?)/);
    const ratio = match ? match[1] : "current";
    const isHigh = parseFloat(ratio || "1") > 1.5;
    const isLow = parseFloat(ratio || "1") < 0.8;

    if (isHigh && dir === "short") {
      return `**L/S ratio at ${ratio}** - Longs are crowded. Contrarian short signal as overleveraged longs become exit liquidity.`;
    } else if (isLow && dir === "long") {
      return `**L/S ratio at ${ratio}** - Shorts are crowded. Contrarian long signal as shorts get squeezed.`;
    } else if (ctx.toLowerCase().includes("unwind")) {
      return `**L/S unwinding** - Crowded side is capitulating. Confirming the move.`;
    }
    return `**L/S ratio: ${ratio}** - Positioning context for ${dir} bias.`;
  },

  // Price deviation from MA
  sma: (ctx, dir) => {
    const match = ctx.match(/(\d+(?:\.\d+)?)%/);
    const deviation = match ? match[1] : "significant";

    if (dir === "short") {
      return `**Price ${deviation}% above SMA** - Extended above moving average. Mean reversion play - shorting the overextension.`;
    }
    return `**Price ${deviation}% below SMA** - Oversold below moving average. Bounce play back toward the mean.`;
  },

  // Order book pressure
  pressure: (ctx, dir) => {
    const isBid = ctx.toLowerCase().includes("bid");
    const isAsk = ctx.toLowerCase().includes("ask");

    if (isAsk && dir === "short") {
      return `**Heavy ask pressure** - Sellers dominating the order book. Real selling interest confirming short thesis.`;
    } else if (isBid && dir === "long") {
      return `**Heavy bid pressure** - Buyers stacking the order book. Real demand confirming long thesis.`;
    }
    return `**Order book pressure** - Microstructure supporting ${dir} direction.`;
  },

  // Whale activity
  whale: (ctx, dir) =>
    `**Whale activity detected** - Smart money positioning ${dir}. Following traders with better information and larger risk budgets.`,

  // Liquidations
  liquidation: (ctx, dir) => {
    if (dir === "long") {
      return `**Short liquidation cascade** - Forced buying as shorts get stopped out. Accelerating upward momentum.`;
    }
    return `**Long liquidation cascade** - Forced selling as longs get liquidated. Accelerating downward momentum.`;
  },

  // Open Interest
  "open interest": (ctx, dir) => {
    const rising =
      ctx.toLowerCase().includes("rising") ||
      ctx.toLowerCase().includes("increas");
    if (rising) {
      return `**Rising Open Interest** - New money entering the market. Fresh conviction behind the move.`;
    }
    return `**Declining Open Interest** - Positions being closed. Potential trend exhaustion.`;
  },

  // Fear & Greed
  fear: (ctx, dir) =>
    `**Extreme Fear reading** - Market sentiment at lows. Contrarian buy signal - "be greedy when others are fearful."`,

  greed: (ctx, dir) =>
    `**Extreme Greed reading** - Market euphoria. Contrarian sell signal - "be fearful when others are greedy."`,

  // Top Traders
  "top trader": (ctx, dir) =>
    `**Top traders aligned ${dir}** - Most profitable traders on exchange positioned this direction. Following proven track records.`,
};

// ==========================================
// Signal Explanation Function
// ==========================================

export function explainSignal(signal: string, direction: string): string {
  const signalLower = signal.toLowerCase();

  // Find matching pattern
  for (const [pattern, explainer] of Object.entries(
    SIGNAL_PATTERN_EXPLANATIONS,
  )) {
    if (signalLower.includes(pattern)) {
      return explainer(signal, direction);
    }
  }

  // Default: return signal with basic formatting
  return `**Signal:** ${signal}`;
}

// ==========================================
// Trade Thesis Builder
// ==========================================

export function buildTradeThesis(position: Position): string {
  const { direction, triggerSignals } = position;
  const signalsStr = triggerSignals.join(" | ").toLowerCase();

  // Detect key themes
  const hasRegime =
    signalsStr.includes("regime") ||
    signalsStr.includes("ranging") ||
    signalsStr.includes("trending");
  const hasFunding = signalsStr.includes("funding");
  const hasDeviation =
    signalsStr.includes("sma") || signalsStr.includes("deviation");
  const hasWhale = signalsStr.includes("whale");
  const hasLS =
    signalsStr.includes("l/s") ||
    signalsStr.includes("long") ||
    signalsStr.includes("short");

  let thesis = "";

  if (hasRegime && hasDeviation && direction === "short") {
    thesis =
      "Market is ranging (not trending), with price extended above its moving average. Classic mean reversion setup - betting on a pullback to the mean.";
  } else if (hasRegime && hasDeviation && direction === "long") {
    thesis =
      "Market is ranging with price dipped below its moving average. Buying the dip expecting a bounce back - mean reversion play.";
  } else if (hasFunding && hasLS && direction === "short") {
    thesis =
      "Funding data shows longs are crowded and paying premiums. L/S ratio confirms overleveraged bulls. Positioned to profit when they get flushed.";
  } else if (hasFunding && hasLS && direction === "long") {
    thesis =
      "Funding negative with shorts crowded. When shorts pay premiums to maintain positions, squeeze potential is high. Positioned for the squeeze.";
  } else if (hasWhale && direction === "long") {
    thesis =
      "Whale activity confirmed bullish positioning. Smart money leading the way - following their conviction with size.";
  } else if (hasWhale && direction === "short") {
    thesis =
      "Whale activity confirmed bearish positioning. Smart money getting defensive - following their lead to the downside.";
  } else {
    thesis = `Multiple independent signals confirming ${direction} bias. When different data sources agree, confidence increases significantly.`;
  }

  return thesis;
}

// ==========================================
// Position Explanation
// ==========================================

export function formatPositionExplanation(position: Position): string {
  const lines: string[] = [];

  // Header
  const dirIcon = position.direction === "long" ? "🟢" : "🔴";
  lines.push(
    `${dirIcon} **${position.direction.toUpperCase()} ${position.asset}** @ $${position.entryPrice.toLocaleString()}`,
  );

  // Duration and strategy
  const duration = formatDuration(Date.now() - position.openedAt);
  lines.push(`Opened ${duration} ago by ${position.strategyName}`);
  lines.push(
    `Size: $${position.sizeUsd.toLocaleString()} · ${position.leverage}x leverage`,
  );
  lines.push("");

  // The thesis
  lines.push("**THE THESIS**");
  lines.push(
    `_Why ${position.direction.toUpperCase()} ${position.asset} makes sense:_`,
  );
  lines.push("");
  lines.push(buildTradeThesis(position));
  lines.push("");

  // Signal breakdown
  if (position.triggerSignals.length > 0) {
    lines.push("**SIGNAL BREAKDOWN**");
    for (const signal of position.triggerSignals) {
      lines.push(explainSignal(signal, position.direction));
      lines.push("");
    }
  }

  // Risk management
  lines.push("**RISK MANAGEMENT**");
  const slPct =
    ((position.stopLossPrice - position.entryPrice) / position.entryPrice) *
    100;
  lines.push(
    `Stop-Loss: $${position.stopLossPrice.toLocaleString()} (${slPct >= 0 ? "+" : ""}${slPct.toFixed(1)}%)`,
  );

  if (position.takeProfitPrices.length > 0) {
    lines.push("Take-Profit Targets:");
    position.takeProfitPrices.forEach((tp, i) => {
      const tpPct = ((tp - position.entryPrice) / position.entryPrice) * 100;
      lines.push(
        `  ${i + 1}. $${tp.toLocaleString()} (${tpPct >= 0 ? "+" : ""}${tpPct.toFixed(1)}%)`,
      );
    });
  }
  lines.push("");

  // Current status
  lines.push("**CURRENT STATUS**");
  const pnlIcon = position.unrealizedPnl >= 0 ? "📈" : "📉";
  const pnlStr =
    position.unrealizedPnl >= 0
      ? `+$${position.unrealizedPnl.toFixed(2)}`
      : `-$${Math.abs(position.unrealizedPnl).toFixed(2)}`;
  const pnlPct =
    position.unrealizedPnlPct >= 0
      ? `+${position.unrealizedPnlPct.toFixed(2)}%`
      : `${position.unrealizedPnlPct.toFixed(2)}%`;

  lines.push(`${pnlIcon} Unrealized P&L: **${pnlStr}** (${pnlPct})`);
  lines.push(`Mark Price: $${position.markPrice.toLocaleString()}`);

  return lines.join("\n");
}

// ==========================================
// Why Not Trading Explanation
// ==========================================

export function formatWhyNotTrading(signal: AggregatedTradeSignal): string {
  const lines: string[] = [];

  lines.push("**MARKET ANALYSIS**");
  lines.push("");

  // Current bias
  const biasIcon =
    signal.direction === "long"
      ? "🟢"
      : signal.direction === "short"
        ? "🔴"
        : "⚪";
  const biasStrength =
    signal.strength < 50
      ? "(weak)"
      : signal.strength < 70
        ? "(moderate)"
        : "(strong)";
  lines.push(
    `Current Bias: ${biasIcon} **${signal.direction.toUpperCase()}** ${biasStrength}`,
  );
  lines.push(`Strength: ${signal.strength.toFixed(0)}% (need 60%)`);
  lines.push(`Confidence: ${signal.confidence.toFixed(0)}% (need 60%)`);
  lines.push(
    `Confirming: ${signal.confirmingCount} | Conflicting: ${signal.conflictingCount}`,
  );
  lines.push("");

  // Threshold status
  lines.push("**THRESHOLD STATUS**");
  const dirOk = signal.direction !== "neutral";
  const strengthOk = signal.strength >= 60;
  const confidenceOk = signal.confidence >= 60;
  const confirmingOk = signal.confirmingCount >= 2;

  lines.push(
    `${dirOk ? "[X]" : "[ ]"} Direction: ${signal.direction.toUpperCase()}${!dirOk ? " (need clear direction)" : ""}`,
  );
  lines.push(
    `${strengthOk ? "[X]" : "[ ]"} Strength: ${signal.strength.toFixed(0)}%${!strengthOk ? ` (${60 - signal.strength}% below threshold)` : ""}`,
  );
  lines.push(
    `${confidenceOk ? "[X]" : "[ ]"} Confidence: ${signal.confidence.toFixed(0)}%${!confidenceOk ? ` (${60 - signal.confidence}% below threshold)` : ""}`,
  );
  lines.push(
    `${confirmingOk ? "[X]" : "[ ]"} Confirming signals: ${signal.confirmingCount}${!confirmingOk ? ` (need ${2 - signal.confirmingCount} more)` : ""}`,
  );
  lines.push("");

  // Why waiting
  lines.push("**WHY WE'RE WAITING**");
  const issues: string[] = [];

  if (!dirOk) issues.push("- No clear directional bias (signals are mixed)");
  if (!strengthOk)
    issues.push(
      `- Signal strength (${signal.strength.toFixed(0)}%) below 60% threshold`,
    );
  if (!confidenceOk)
    issues.push(
      `- Confidence (${signal.confidence.toFixed(0)}%) below 60% threshold`,
    );
  if (!confirmingOk)
    issues.push(
      `- Only ${signal.confirmingCount} confirming signal(s), need 2`,
    );
  if (signal.conflictingCount > 0)
    issues.push(
      `- ${signal.conflictingCount} conflicting signal(s) reducing confidence`,
    );

  if (issues.length === 0) {
    issues.push("- All thresholds met but conditions may have changed");
  }

  lines.push(issues.join("\n"));
  lines.push("");

  // What would trigger
  lines.push("**WHAT WOULD TRIGGER A TRADE**");
  lines.push("_Specific conditions that would generate enough confidence:_");
  lines.push("");

  const triggers: string[] = [];

  if (!strengthOk) {
    const needed = 60 - signal.strength;
    if (signal.direction === "long") {
      triggers.push(
        `📈 **+${needed.toFixed(0)}% signal strength** could come from:`,
      );
      triggers.push(`   • Whale opening a long position (+20-30% weight)`);
      triggers.push(`   • Funding going negative (shorts crowded)`);
    } else if (signal.direction === "short") {
      triggers.push(
        `📉 **+${needed.toFixed(0)}% signal strength** could come from:`,
      );
      triggers.push(`   • Whale opening a short position (+20-30% weight)`);
      triggers.push(`   • Funding going extreme positive (longs crowded)`);
    } else {
      triggers.push(`⚡ **Need clear directional signal**`);
      triggers.push(`   • Any significant whale move would establish bias`);
    }
  }

  if (!confirmingOk) {
    triggers.push(
      `✅ **Need ${2 - signal.confirmingCount} more confirming signal(s)**`,
    );
    triggers.push(`   • Extreme fear/greed reading`);
    triggers.push(`   • Liquidation cascade in opposite direction`);
  }

  if (triggers.length === 0) {
    triggers.push(`✅ Thresholds look met - bot may be paused or in cooldown`);
  }

  lines.push(triggers.slice(0, 6).join("\n"));

  return lines.join("\n");
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
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

export function formatPnL(value: number): string {
  if (value >= 0) {
    return `+$${value.toFixed(2)}`;
  }
  return `-$${Math.abs(value).toFixed(2)}`;
}

export function formatPct(value: number): string {
  if (value >= 0) {
    return `+${value.toFixed(2)}%`;
  }
  return `${value.toFixed(2)}%`;
}

export function formatUsd(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}
