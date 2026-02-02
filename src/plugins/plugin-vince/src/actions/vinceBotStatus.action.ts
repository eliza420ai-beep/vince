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
import { formatPnL, formatPct, formatUsd, formatPositionExplanation } from "../utils/tradeExplainer";

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
      lines.push("**Paper Trading Bot**");
      lines.push("");

      // Status
      const statusIcon = status.isPaused ? "⏸️" : "🟢";
      const statusLabel = status.isPaused ? "PAUSED" : "ACTIVE";
      lines.push(`${statusIcon} Status: **${statusLabel}**${status.pauseReason ? ` - ${status.pauseReason}` : ""}`);
      
      // Trading Session Info
      const riskManager = runtime.getService("VINCE_RISK_MANAGER_SERVICE") as VinceRiskManagerService | null;
      if (riskManager) {
        const session = riskManager.getTradingSession();
        const sessionIcon = session.isOverlap ? "🔥" : session.session === "asian" ? "🌙" : session.session === "off-hours" ? "💤" : "☀️";
        const sizeInfo = session.sizeMultiplier < 1.0 ? ` (${Math.round(session.sizeMultiplier * 100)}% size)` : "";
        lines.push(`${sessionIcon} Session: **${session.session.toUpperCase()}** - ${session.description}${sizeInfo}`);
      }
      lines.push("");

      // Data Sources (new multi-source aggregation)
      if (signalStatus && signalStatus.dataSources) {
        const activeSources = signalStatus.dataSources.filter(d => d.available);
        const sourceNames = activeSources.map(d => d.name).join(", ");
        lines.push(`**Data Sources** (${activeSources.length}/${signalStatus.dataSources.length})`);
        lines.push(sourceNames || "None active");
        lines.push("");
      }

      // Portfolio
      lines.push("**Portfolio**");
      const returnStr = portfolio.returnPct >= 0 ? `+${portfolio.returnPct.toFixed(2)}%` : `${portfolio.returnPct.toFixed(2)}%`;
      lines.push(`Total Value: **${formatUsd(portfolio.totalValue)}** (${returnStr})`);
      lines.push(`Balance: ${formatUsd(portfolio.balance)}`);
      lines.push(`Realized P&L: ${formatPnL(portfolio.realizedPnl)}`);
      lines.push(`Unrealized P&L: ${formatPnL(portfolio.unrealizedPnl)}`);
      lines.push("");

      // KPI Dashboard (Goal-Aware Trading)
      const goalTracker = runtime.getService("VINCE_GOAL_TRACKER_SERVICE") as VinceGoalTrackerService | null;
      if (goalTracker) {
        const kpi = goalTracker.getKPIProgress(portfolio);
        const goal = goalTracker.getGoal();
        
        lines.push("**📊 KPI Dashboard**");
        lines.push(`Target: $${goal.dailyTarget}/day | $${goal.monthlyTarget.toLocaleString()}/month`);
        lines.push("");
        
        // Daily progress
        const dailyIcon = kpi.daily.pace === "ahead" ? "🚀" : kpi.daily.pace === "behind" ? "⚠️" : "✅";
        const dailyPnlStr = kpi.daily.current >= 0 ? `+$${kpi.daily.current.toLocaleString()}` : `-$${Math.abs(kpi.daily.current).toLocaleString()}`;
        lines.push(`${dailyIcon} **Today**: ${dailyPnlStr} (${kpi.daily.pct}% of target)`);
        lines.push(`   Trades: ${kpi.daily.trades} | Win Rate: ${kpi.daily.winRate.toFixed(0)}%`);
        const paceStr = kpi.daily.paceAmount >= 0 ? `+$${kpi.daily.paceAmount}` : `-$${Math.abs(kpi.daily.paceAmount)}`;
        lines.push(`   Pace: ${kpi.daily.pace.toUpperCase()} (${paceStr} vs expected)`);
        lines.push("");
        
        // Monthly progress
        const monthlyIcon = kpi.monthly.status === "ahead" ? "🚀" : kpi.monthly.status === "behind" ? "⚠️" : "✅";
        const monthlyPnlStr = kpi.monthly.current >= 0 ? `+$${kpi.monthly.current.toLocaleString()}` : `-$${Math.abs(kpi.monthly.current).toLocaleString()}`;
        lines.push(`${monthlyIcon} **Month**: ${monthlyPnlStr} (${kpi.monthly.pct}% of target)`);
        lines.push(`   Days: ${kpi.monthly.tradingDays}/${kpi.monthly.tradingDays + kpi.monthly.tradingDaysRemaining}`);
        if (kpi.monthly.status === "behind") {
          lines.push(`   ⚡ Need $${kpi.monthly.dailyTargetToHitGoal}/day to hit target`);
        }
        lines.push("");
        
        // Leverage recommendation
        const capitalReq = goalTracker.calculateCapitalRequirements(portfolio.totalValue);
        const leverageRec = goalTracker.calculateOptimalLeverage(
          portfolio.totalValue, 
          riskState.currentDrawdownPct, 
          null
        );
        
        lines.push("**💹 Leverage & Capital**");
        lines.push(`Kelly Safe: ${leverageRec.kellySafe.toFixed(1)}x | Recommended: **${leverageRec.recommended.toFixed(1)}x**`);
        if (leverageRec.adjustments.length > 0) {
          const adjustmentStr = leverageRec.adjustments.map(a => `${a.factor}: ${Math.round((1 - a.multiplier) * 100)}%↓`).join(", ");
          lines.push(`   Adjustments: ${adjustmentStr}`);
        }
        lines.push(`Capital: ${capitalReq.status.replace("-", " ").toUpperCase()}`);
        if (capitalReq.status === "under-capitalized") {
          lines.push(`   ⚠️ Need $${Math.abs(capitalReq.capitalGap).toLocaleString()} more for optimal`);
        } else if (capitalReq.status === "over-capitalized") {
          lines.push(`   ✅ Buffer: $${Math.abs(capitalReq.capitalGap).toLocaleString()} above optimal`);
        }
        lines.push("");
        
        // All-time stats
        if (kpi.allTime.totalTrades > 0) {
          lines.push("**📈 All-Time**");
          const allTimePnl = kpi.allTime.totalPnl >= 0 ? `+$${kpi.allTime.totalPnl.toLocaleString()}` : `-$${Math.abs(kpi.allTime.totalPnl).toLocaleString()}`;
          lines.push(`P&L: ${allTimePnl} | Trades: ${kpi.allTime.totalTrades}`);
          lines.push(`Profit Factor: ${kpi.allTime.profitFactor} | Sharpe: ${kpi.allTime.sharpeRatio}`);
          lines.push("");
        }
      }

      // Stats
      lines.push("**Performance**");
      lines.push(`Trades: ${portfolio.tradeCount} (${portfolio.winCount}W / ${portfolio.lossCount}L)`);
      lines.push(`Win Rate: ${portfolio.winRate.toFixed(1)}%`);
      if (portfolio.maxDrawdownPct > 0) {
        lines.push(`Max Drawdown: ${portfolio.maxDrawdownPct.toFixed(2)}%`);
      }
      lines.push("");

      // Risk State
      if (riskState.circuitBreakerActive || riskState.cooldownExpiresAt) {
        lines.push("**Risk State**");
        if (riskState.circuitBreakerActive) {
          lines.push(`⚠️ Circuit breaker active`);
        }
        if (riskState.cooldownExpiresAt && Date.now() < riskState.cooldownExpiresAt) {
          const remaining = Math.ceil((riskState.cooldownExpiresAt - Date.now()) / 60000);
          lines.push(`⏳ Cooldown: ${remaining}m remaining`);
        }
        lines.push(`Daily P&L: ${formatPnL(riskState.dailyPnl)} (${formatPct(riskState.dailyPnlPct)})`);
        lines.push("");
      }

      // Open Positions
      if (positions.length > 0) {
        lines.push("**Open Positions**");
        lines.push("");
        for (const pos of positions) {
          const dirIcon = pos.direction === "long" ? "🟢" : "🔴";
          const pnlStr = formatPnL(pos.unrealizedPnl);
          const pnlPct = formatPct(pos.unrealizedPnlPct);
          const duration = formatDuration(Date.now() - pos.openedAt);
          
          lines.push(`${dirIcon} **${pos.direction.toUpperCase()} ${pos.asset}** @ $${pos.entryPrice.toLocaleString()}`);
          lines.push(`   Size: ${formatUsd(pos.sizeUsd)} · ${pos.leverage}x · ${duration}`);
          lines.push(`   P&L: ${pnlStr} (${pnlPct})`);
          lines.push(`   SL: $${pos.stopLossPrice.toLocaleString()} | TP: $${pos.takeProfitPrices[0]?.toLocaleString() || "N/A"}`);
          lines.push("");
        }
      } else {
        lines.push("**Open Positions**");
        lines.push("_No open positions - waiting for setup_");
        lines.push("");
      }

      // Recent trades
      if (tradeJournal) {
        const stats = tradeJournal.getStats();
        if (stats.totalTrades > 0) {
          lines.push("**Journal Stats**");
          lines.push(`Total P&L: ${formatPnL(stats.totalPnl)}`);
          lines.push(`Avg Win: ${formatUsd(stats.avgWin)} | Avg Loss: ${formatUsd(stats.avgLoss)}`);
          if (stats.profitFactor > 0 && stats.profitFactor !== Infinity) {
            lines.push(`Profit Factor: ${stats.profitFactor.toFixed(2)}`);
          }
        }
      }

      lines.push("");
      lines.push("---");
      lines.push("*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*");

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
          text: "**Paper Trading Bot**\n\n🟢 Status: **ACTIVE**\n\n**Portfolio**\nTotal Value: **$102,450** (+2.45%)\nBalance: $97,200\nRealized P&L: +$1,250\nUnrealized P&L: +$1,000\n\n**Performance**\nTrades: 12 (8W / 4L)\nWin Rate: 66.7%\n\n**Open Positions**\n\n🟢 **LONG BTC** @ $80,340\n   Size: $5,000 · 3x · 4h 30m\n   P&L: +$250 (+1.67%)\n   SL: $79,100 | TP: $82,000",
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
