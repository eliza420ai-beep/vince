/**
 * OpenClaw Backtest Action
 * 
 * Commands:
 * - backtest <token> [strategy] [days] - Run backtest simulation
 * - signal <token> <long/short> <entry> <target> <stop> - Record trading signal
 * - signal close <id> <price> - Close a signal
 * - signals [token] - View open signals
 * - performance [agent] - View agent performance leaderboard
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  runBacktest,
  formatBacktestResult,
  getBacktestHistory,
  formatBacktestHistory,
  recordSignal,
  closeSignal,
  getOpenSignals,
  getAllSignals,
  getAgentPerformance,
  formatAgentPerformance,
  type BacktestConfig,
} from "../services/backtest.service";

const STRATEGIES = ["momentum", "mean_reversion", "breakout", "sentiment"] as const;

export const backtestAction: Action = {
  name: "OPENCLAW_BACKTEST",
  description: `Backtesting and signal tracking for trading strategies.
Commands:
- "backtest SOL momentum 90" - Run 90-day momentum backtest
- "backtest ETH mean_reversion" - Run mean reversion backtest
- "signal SOL long 100 120 95" - Record long signal
- "signal close sig_xxx 115" - Close signal at price
- "signals" / "open signals" - View open signals
- "performance" - View agent performance leaderboard
- "backtest history" - View past backtests`,
  similes: [
    "backtest",
    "back test",
    "test strategy",
    "strategy backtest",
    "signal",
    "record signal",
    "close signal",
    "signals",
    "open signals",
    "performance",
    "agent performance",
    "leaderboard",
    "backtest history",
  ],
  examples: [
    [
      { name: "{{user1}}", content: { text: "backtest SOL momentum" } },
      { name: "{{agent}}", content: { text: "Running momentum backtest on SOL...", actions: ["OPENCLAW_BACKTEST"] } },
    ],
    [
      { name: "{{user1}}", content: { text: "signal ETH long 3500 4000 3300" } },
      { name: "{{agent}}", content: { text: "Recorded long signal for ETH...", actions: ["OPENCLAW_BACKTEST"] } },
    ],
    [
      { name: "{{user1}}", content: { text: "show agent performance" } },
      { name: "{{agent}}", content: { text: "Here's the agent performance leaderboard...", actions: ["OPENCLAW_BACKTEST"] } },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("backtest") ||
      text.includes("back test") ||
      text.includes("signal") ||
      text.includes("performance") ||
      text.includes("leaderboard")
    );
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const text = message.content?.text?.toLowerCase() || "";
    const originalText = message.content?.text || "";
    
    try {
      // Parse command
      const tokens = originalText.split(/\s+/);
      
      // Backtest history
      if (text.includes("backtest") && text.includes("history")) {
        const history = getBacktestHistory(10);
        const response = formatBacktestHistory(history);
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // Run backtest
      if (text.includes("backtest") && !text.includes("signal")) {
        // Find token and strategy
        const upperTokens = tokens.map(t => t.toUpperCase());
        const commonTokens = ["BTC", "ETH", "SOL", "BONK", "WIF", "RNDR", "LINK", "UNI", "AAVE", "ARB", "OP"];
        const token = upperTokens.find(t => commonTokens.includes(t)) || "SOL";
        
        const strategy = tokens.find(t => STRATEGIES.includes(t.toLowerCase() as any))?.toLowerCase() as typeof STRATEGIES[number] || "momentum";
        
        // Find days (number > 10)
        const daysMatch = tokens.find(t => /^\d+$/.test(t) && parseInt(t) > 10);
        const days = daysMatch ? parseInt(daysMatch) : 90;
        
        const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];
        
        if (callback) {
          callback({ text: `🔄 Running ${strategy} backtest on ${token} (${days} days)...` });
        }
        
        const config: BacktestConfig = {
          token,
          strategy,
          startDate,
          endDate,
          initialCapital: 10000,
          positionSize: 10,
          stopLoss: 5,
          takeProfit: 15,
        };
        
        const result = runBacktest(config);
        const response = formatBacktestResult(result);
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // Record signal
      if ((text.includes("signal") && (text.includes("long") || text.includes("short"))) && !text.includes("close")) {
        // Parse: signal <token> <long/short> <entry> <target> <stop>
        const direction = text.includes("long") ? "long" : "short";
        const upperTokens = tokens.map(t => t.toUpperCase());
        const commonTokens = ["BTC", "ETH", "SOL", "BONK", "WIF", "RNDR", "LINK", "UNI", "AAVE", "ARB", "OP"];
        const token = upperTokens.find(t => commonTokens.includes(t)) || "SOL";
        
        // Find prices (numbers)
        const prices = tokens.filter(t => /^\d+(\.\d+)?$/.test(t)).map(Number);
        if (prices.length < 3) {
          if (callback) {
            callback({ text: "⚠️ Please specify entry, target, and stop prices:\n`signal <token> long/short <entry> <target> <stop>`" });
          }
          return { success: true };
        }
        
        const [entry, target, stop] = prices;
        
        const signal = recordSignal({
          token,
          direction,
          confidence: Math.floor(Math.random() * 20) + 70,
          entryPrice: entry,
          targetPrice: target,
          stopLoss: stop,
          timestamp: Date.now(),
          agent: "user",
          reasoning: [`Manual ${direction} signal recorded`],
        });
        
        const riskReward = direction === "long" 
          ? ((target - entry) / (entry - stop)).toFixed(2)
          : ((entry - target) / (stop - entry)).toFixed(2);
        
        const response = `✅ **Signal Recorded**

**Token:** ${token}
**Direction:** ${direction.toUpperCase()}
**Entry:** $${entry}
**Target:** $${target} (${direction === "long" ? "+" : ""}${((target / entry - 1) * 100).toFixed(1)}%)
**Stop:** $${stop} (${direction === "long" ? "" : "+"}${((stop / entry - 1) * 100).toFixed(1)}%)
**R:R:** ${riskReward}

Signal ID: \`${signal.id}\`

Close with: \`signal close ${signal.id} <exit_price>\``;
        
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // Close signal
      if (text.includes("signal") && text.includes("close")) {
        const idMatch = tokens.find(t => t.startsWith("sig_"));
        if (!idMatch) {
          if (callback) {
            callback({ text: "⚠️ Please specify signal ID:\n`signal close <signal_id> <exit_price>`" });
          }
          return { success: true };
        }
        
        const priceMatch = tokens.find(t => /^\d+(\.\d+)?$/.test(t));
        if (!priceMatch) {
          if (callback) {
            callback({ text: "⚠️ Please specify exit price:\n`signal close <signal_id> <exit_price>`" });
          }
          return { success: true };
        }
        
        const exitPrice = parseFloat(priceMatch);
        const closedSignal = closeSignal(idMatch, exitPrice);
        
        if (!closedSignal) {
          if (callback) callback({ text: `❌ Signal not found or already closed: ${idMatch}` });
          return { success: true };
        }
        
        const pnlIcon = (closedSignal.pnl || 0) >= 0 ? "📈" : "📉";
        const response = `✅ **Signal Closed**

**Token:** ${closedSignal.token}
**Direction:** ${closedSignal.direction.toUpperCase()}
**Entry:** $${closedSignal.entryPrice}
**Exit:** $${exitPrice}
${pnlIcon} **PnL:** ${(closedSignal.pnl || 0) >= 0 ? "+" : ""}${closedSignal.pnl?.toFixed(2)}%
**Result:** ${closedSignal.status === "hit_target" ? "🎯 Target Hit" : closedSignal.status === "hit_stop" ? "🛑 Stopped Out" : "📤 Manual Close"}`;
        
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // View signals
      if (text.includes("signal") && (text.includes("open") || text.includes("view") || tokens.includes("signals"))) {
        const upperTokens = tokens.map(t => t.toUpperCase());
        const commonTokens = ["BTC", "ETH", "SOL", "BONK", "WIF", "RNDR", "LINK", "UNI", "AAVE"];
        const token = upperTokens.find(t => commonTokens.includes(t));
        
        const signals = getOpenSignals(token);
        
        if (signals.length === 0) {
          if (callback) {
            callback({ text: `📊 **Open Signals**${token ? ` (${token})` : ""}\n\nNo open signals.\n\nRecord: \`signal <token> long/short <entry> <target> <stop>\`` });
          }
          return { success: true };
        }
        
        const rows = signals.map((s, i) => {
          const dirIcon = s.direction === "long" ? "📈" : "📉";
          const targetPct = ((s.targetPrice / s.entryPrice - 1) * 100).toFixed(1);
          const stopPct = ((s.stopLoss / s.entryPrice - 1) * 100).toFixed(1);
          return `${i + 1}. ${dirIcon} **${s.token}** ${s.direction.toUpperCase()}
   Entry: $${s.entryPrice} → Target: $${s.targetPrice} (${targetPct}%)
   Stop: $${s.stopLoss} (${stopPct}%)
   ID: \`${s.id}\``;
        }).join("\n\n");
        
        const response = `📊 **Open Signals**${token ? ` (${token})` : ""}

${rows}

---
Close: \`signal close <id> <price>\``;
        
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // Performance leaderboard
      if (text.includes("performance") || text.includes("leaderboard")) {
        const performances = getAgentPerformance();
        const response = formatAgentPerformance(performances);
        if (callback) callback({ text: response });
        return { success: true };
      }
      
      // Default - show help
      const response = `📊 **Backtest & Signals**

**Commands:**
• \`backtest <token> <strategy> [days]\` - Run backtest
• \`signal <token> long/short <entry> <target> <stop>\` - Record signal
• \`signal close <id> <price>\` - Close signal
• \`signals\` - View open signals
• \`performance\` - Agent leaderboard
• \`backtest history\` - Past backtests

**Strategies:** momentum, mean_reversion, breakout, sentiment

**Example:**
\`backtest SOL momentum 90\`
\`signal ETH long 3500 4000 3300\``;
      
      if (callback) callback({ text: response });
      return { success: true };
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("[Backtest] Error:", error);
      if (callback) {
        callback({ text: `❌ Error: ${msg}` });
      }
      return { success: false, error: new Error(msg) };
    }
  },
};

export default backtestAction;
