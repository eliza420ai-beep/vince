/**
 * VINCE Bot Status Action
 *
 * Shows paper trading bot status:
 * - Active/paused state
 * - Portfolio value and P&L
 * - Open positions
 * - Recent performance
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import type { VinceTradeJournalService } from "../services/vinceTradeJournal.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceRiskManagerService } from "../services/vinceRiskManager.service";
import type { VinceGoalTrackerService } from "../services/goalTracker.service";
import { formatPnL, formatPct, formatUsd } from "../utils/tradeExplainer";
import { BOT_FOOTER } from "../constants/botFormat";

export const vinceBotStatusAction: Action = {
  name: "VINCE_BOT_STATUS",
  similes: ["BOT", "BOT_STATUS", "PAPER", "PAPER_TRADING", "TRADING_BOT"],
  description: "Shows paper trading bot status, portfolio, and open positions",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("bot") ||
      text.includes("paper") ||
      text === "status"
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
      const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as VincePaperTradingService | null;
      const positionManager = runtime.getService("VINCE_POSITION_MANAGER_SERVICE") as VincePositionManagerService | null;
      const tradeJournal = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as VinceTradeJournalService | null;

      if (!paperTrading || !positionManager) {
        await callback({
          text: "Paper trading bot is not active. Services still initializing.",
          actions: ["VINCE_BOT_STATUS"],
        });
        return;
      }

      const status = paperTrading.getStatus();
      const portfolio = positionManager.getPortfolio();
      const positions = positionManager.getOpenPositions();
      const riskState = positionManager.getRiskState();

      // Get signal aggregator status for data sources
      const signalAggregator = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as VinceSignalAggregatorService | null;
      const signalStatus = signalAggregator?.getStatus();

      const lines: string[] = [];

      // Header
      const statusIcon = status.isPaused ? "⏸️" : "🟢";
      const statusLabel = status.isPaused ? "PAUSED" : "ACTIVE";
      lines.push(`**Paper Trading Bot**  ${statusIcon} ${statusLabel}${status.pauseReason ? ` · ${status.pauseReason}` : ""}`);
      lines.push("");

      // Session
      const riskManager = runtime.getService("VINCE_RISK_MANAGER_SERVICE") as VinceRiskManagerService | null;
      if (riskManager) {
        const session = riskManager.getTradingSession();
        const sessionIcon = session.isOverlap ? "🔥" : session.session === "asian" ? "🌙" : session.session === "off-hours" ? "💤" : "☀️";
        const sizeInfo = session.sizeMultiplier < 1.0 ? ` · ${Math.round(session.sizeMultiplier * 100)}% size` : "";
        lines.push(`${sessionIcon} **${session.session.toUpperCase()}** · ${session.description}${sizeInfo}`);
      }
      if (signalStatus?.dataSources) {
        const activeCount = signalStatus.dataSources.filter(d => d.available).length;
        const total = signalStatus.dataSources.length;
        lines.push(`📡 Data: ${activeCount}/${total} sources`);
      }
      lines.push("");

      // Portfolio
      const returnStr = portfolio.returnPct >= 0 ? `+${portfolio.returnPct.toFixed(2)}%` : `${portfolio.returnPct.toFixed(2)}%`;
      lines.push("**Portfolio**");
      lines.push(`${formatUsd(portfolio.totalValue)} (${returnStr}) · Balance ${formatUsd(portfolio.balance)}`);
      lines.push(`P&L: Realized ${formatPnL(portfolio.realizedPnl)} · Unrealized ${formatPnL(portfolio.unrealizedPnl)}`);
      lines.push("_Realized P&L is net of fees (0.05% round-trip)._");
      lines.push("");

      // KPI & Performance (compact)
      const goalTracker = runtime.getService("VINCE_GOAL_TRACKER_SERVICE") as VinceGoalTrackerService | null;
      if (goalTracker) {
        const kpi = goalTracker.getKPIProgress(portfolio);
        const goal = goalTracker.getGoal();
        const dailyIcon = kpi.daily.pace === "ahead" ? "🚀" : kpi.daily.pace === "behind" ? "⚠️" : "✅";
        const dailyPnlStr = kpi.daily.current >= 0 ? `+$${kpi.daily.current}` : `-$${Math.abs(kpi.daily.current)}`;
        const monthlyIcon = kpi.monthly.status === "ahead" ? "🚀" : kpi.monthly.status === "behind" ? "⚠️" : "✅";
        const monthlyPnlStr = kpi.monthly.current >= 0 ? `+$${kpi.monthly.current.toLocaleString()}` : `-$${Math.abs(kpi.monthly.current).toLocaleString()}`;
        const leverageRec = goalTracker.calculateOptimalLeverage(portfolio.totalValue, riskState.currentDrawdownPct, null);

        lines.push("**KPI**");
        lines.push(`${dailyIcon} Today: ${dailyPnlStr} (${kpi.daily.pct}% of $${goal.dailyTarget}) · ${kpi.daily.trades} trades · ${kpi.daily.winRate.toFixed(0)}% WR`);
        lines.push(`${monthlyIcon} Month: ${monthlyPnlStr} (${kpi.monthly.pct}% of $${goal.monthlyTarget.toLocaleString()}) · ${kpi.monthly.tradingDays}/${kpi.monthly.tradingDays + kpi.monthly.tradingDaysRemaining} days`);
        if (kpi.monthly.status === "behind") {
          lines.push(`   → Need $${kpi.monthly.dailyTargetToHitGoal}/day to hit goal`);
        }
        lines.push(`Leverage: **${leverageRec.recommended.toFixed(1)}x** recommended · ${portfolio.tradeCount} trades (${portfolio.winRate.toFixed(1)}% WR${portfolio.maxDrawdownPct > 0 ? ` · ${portfolio.maxDrawdownPct.toFixed(2)}% max DD` : ""})`);
        lines.push("");
      } else {
        lines.push("**Performance**");
        lines.push(`${portfolio.tradeCount} trades (${portfolio.winRate.toFixed(1)}% WR)${portfolio.maxDrawdownPct > 0 ? ` · Max DD ${portfolio.maxDrawdownPct.toFixed(2)}%` : ""}`);
        lines.push("");
      }

      // Risk (only when relevant)
      if (riskState.circuitBreakerActive || (riskState.cooldownExpiresAt && Date.now() < riskState.cooldownExpiresAt)) {
        lines.push("**Risk**");
        if (riskState.circuitBreakerActive) lines.push("⚠️ Circuit breaker active");
        if (riskState.cooldownExpiresAt && Date.now() < riskState.cooldownExpiresAt) {
          const remaining = Math.ceil((riskState.cooldownExpiresAt - Date.now()) / 60000);
          lines.push(`⏳ Cooldown: ${remaining}m remaining`);
        }
        lines.push(`Daily: ${formatPnL(riskState.dailyPnl)} (${formatPct(riskState.dailyPnlPct)})`);
        lines.push("");
      }

      // Open Positions
      lines.push("**Open Positions**");
      if (positions.length > 0) {
        for (const pos of positions) {
          const dirIcon = pos.direction === "long" ? "🟢" : "🔴";
          const pnlStr = formatPnL(pos.unrealizedPnl);
          const pnlPct = formatPct(pos.unrealizedPnlPct);
          const duration = formatDuration(Date.now() - pos.openedAt);
          lines.push(`${dirIcon} ${pos.direction.toUpperCase()} ${pos.asset} @ $${pos.entryPrice.toLocaleString()} · ${formatUsd(pos.sizeUsd)} · ${pos.leverage}x · ${duration}`);
          lines.push(`   P&L ${pnlStr} (${pnlPct}) · SL $${pos.stopLossPrice.toLocaleString()} · TP $${pos.takeProfitPrices[0]?.toLocaleString() || "—"}`);
        }
      } else {
        lines.push("_No open positions_");
      }
      lines.push("");

      // Journal (compact)
      if (tradeJournal) {
        const stats = tradeJournal.getStats();
        if (stats.totalTrades > 0) {
          lines.push("**Journal** " + [formatPnL(stats.totalPnl), `avg win ${formatUsd(stats.avgWin)}`, stats.profitFactor > 0 && stats.profitFactor !== Infinity ? `PF ${stats.profitFactor.toFixed(2)}` : ""].filter(Boolean).join(" · "));
        }
      }

      lines.push(BOT_FOOTER);

      await callback({
        text: lines.join("\n"),
        actions: ["VINCE_BOT_STATUS"],
      });

    } catch (error) {
      logger.error(`[VINCE_BOT_STATUS] Error: ${error}`);
      await callback({
        text: "Unable to get bot status right now. Try again in a moment.",
        actions: ["VINCE_BOT_STATUS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "bot" } },
      {
        name: "VINCE",
        content: {
          text: "**Paper Trading Bot**  🟢 ACTIVE\n\n☀️ **US** · New York overlap · Best liquidity\n📡 Data: 8/8 sources\n\n**Portfolio**\n$102,450 (+2.45%) · Balance $97,200\nP&L: Realized +$1,250 · Unrealized +$1,000\n\n**KPI**\n🚀 Today: +$350 (83% of $420) · 2 trades · 100% WR\n✅ Month: +$2,100 (21% of $10,000) · 5/19 days\nLeverage: **2.5x** recommended · 12 trades (66.7% WR · 1.20% max DD)\n\n**Open Positions**\n🟢 LONG BTC @ $80,340 · $5,000 · 3x · 4h 30m\n   P&L +$250 (+1.67%) · SL $79,100 · TP $82,000\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_BOT_STATUS"],
        },
      },
    ],
  ],
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
