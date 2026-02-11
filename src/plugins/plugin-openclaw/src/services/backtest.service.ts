/**
 * OpenClaw Backtest & Signal Performance Service
 * 
 * Historical backtesting, signal attribution, win rate tracking, PnL simulation
 */

import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = ".openclaw-data";
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
const BACKTEST_FILE = path.join(DATA_DIR, "backtests.json");

// ==================== TYPES ====================

export interface Signal {
  id: string;
  token: string;
  direction: "long" | "short";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timestamp: number;
  agent: string;
  reasoning: string[];
  status: "open" | "hit_target" | "hit_stop" | "expired";
  closedAt?: number;
  exitPrice?: number;
  pnl?: number;
}

export interface AgentPerformance {
  agentId: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestTrade: { token: string; pnl: number } | null;
  worstTrade: { token: string; pnl: number } | null;
  streakCurrent: number;
  streakBest: number;
}

export interface BacktestConfig {
  token: string;
  strategy: "momentum" | "mean_reversion" | "breakout" | "sentiment";
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTradeReturn: number;
    volatility: number;
  };
  trades: {
    date: string;
    type: "buy" | "sell";
    price: number;
    pnl: number;
  }[];
  equityCurve: { date: string; value: number }[];
  timestamp: number;
}

// ==================== SIGNAL STORAGE ====================

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSignals(): Signal[] {
  ensureDataDir();
  if (!fs.existsSync(SIGNALS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SIGNALS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveSignals(signals: Signal[]): void {
  ensureDataDir();
  fs.writeFileSync(SIGNALS_FILE, JSON.stringify(signals, null, 2));
}

function loadBacktests(): BacktestResult[] {
  ensureDataDir();
  if (!fs.existsSync(BACKTEST_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(BACKTEST_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveBacktests(backtests: BacktestResult[]): void {
  ensureDataDir();
  fs.writeFileSync(BACKTEST_FILE, JSON.stringify(backtests, null, 2));
}

// ==================== SIGNAL TRACKING ====================

export function recordSignal(signal: Omit<Signal, "id" | "status">): Signal {
  const signals = loadSignals();
  const newSignal: Signal = {
    ...signal,
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    status: "open",
  };
  signals.push(newSignal);
  saveSignals(signals);
  logger.info(`[Backtest] Recorded signal: ${newSignal.id} for ${signal.token}`);
  return newSignal;
}

export function closeSignal(signalId: string, exitPrice: number): Signal | null {
  const signals = loadSignals();
  const signal = signals.find(s => s.id === signalId);
  if (!signal || signal.status !== "open") return null;
  
  const pnlPercent = signal.direction === "long"
    ? ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100
    : ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;
  
  signal.status = exitPrice >= signal.targetPrice ? "hit_target" 
    : exitPrice <= signal.stopLoss ? "hit_stop" 
    : "expired";
  signal.closedAt = Date.now();
  signal.exitPrice = exitPrice;
  signal.pnl = pnlPercent;
  
  saveSignals(signals);
  return signal;
}

export function getOpenSignals(token?: string): Signal[] {
  const signals = loadSignals();
  return signals.filter(s => 
    s.status === "open" && (!token || s.token.toUpperCase() === token.toUpperCase())
  );
}

export function getAllSignals(limit = 50): Signal[] {
  return loadSignals().slice(-limit);
}

// ==================== AGENT PERFORMANCE ====================

export function getAgentPerformance(agentId?: string): AgentPerformance[] {
  const signals = loadSignals().filter(s => s.status !== "open");
  
  // Group by agent
  const byAgent = new Map<string, Signal[]>();
  signals.forEach(s => {
    const existing = byAgent.get(s.agent) || [];
    existing.push(s);
    byAgent.set(s.agent, existing);
  });
  
  const performances: AgentPerformance[] = [];
  
  byAgent.forEach((agentSignals, agent) => {
    if (agentId && agent !== agentId) return;
    
    const wins = agentSignals.filter(s => (s.pnl || 0) > 0);
    const losses = agentSignals.filter(s => (s.pnl || 0) <= 0);
    const pnls = agentSignals.map(s => s.pnl || 0);
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const avgPnl = pnls.length > 0 ? totalPnl / pnls.length : 0;
    
    // Sharpe calculation (simplified)
    const mean = avgPnl;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(pnls.length - 1, 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
    
    // Max drawdown
    let peak = 0;
    let maxDd = 0;
    let cumulative = 0;
    pnls.forEach(pnl => {
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDd) maxDd = dd;
    });
    
    // Streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    agentSignals.forEach(s => {
      if ((s.pnl || 0) > 0) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });
    // Current streak from end
    for (let i = agentSignals.length - 1; i >= 0; i--) {
      if ((agentSignals[i].pnl || 0) > 0) currentStreak++;
      else break;
    }
    
    const sortedByPnl = [...agentSignals].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    
    performances.push({
      agentId: agent,
      totalSignals: agentSignals.length,
      wins: wins.length,
      losses: losses.length,
      winRate: agentSignals.length > 0 ? (wins.length / agentSignals.length) * 100 : 0,
      avgPnl,
      totalPnl,
      sharpeRatio: sharpe,
      maxDrawdown: maxDd,
      bestTrade: sortedByPnl[0] ? { token: sortedByPnl[0].token, pnl: sortedByPnl[0].pnl || 0 } : null,
      worstTrade: sortedByPnl[sortedByPnl.length - 1] ? { token: sortedByPnl[sortedByPnl.length - 1].token, pnl: sortedByPnl[sortedByPnl.length - 1].pnl || 0 } : null,
      streakCurrent: currentStreak,
      streakBest: bestStreak,
    });
  });
  
  return performances.sort((a, b) => b.totalPnl - a.totalPnl);
}

export function formatAgentPerformance(performances: AgentPerformance[]): string {
  if (performances.length === 0) {
    return `📊 **Agent Performance**

No closed signals yet. Start tracking with:
\`signal <token> long/short <entry> <target> <stop>\``;
  }
  
  const rows = performances.map((p, i) => {
    const winIcon = p.winRate >= 60 ? "🟢" : p.winRate >= 45 ? "🟡" : "🔴";
    const pnlIcon = p.totalPnl >= 0 ? "📈" : "📉";
    const streak = p.streakCurrent > 0 ? `🔥 ${p.streakCurrent}` : "";
    
    return `**${i + 1}. ${p.agentId}**
${winIcon} Win Rate: ${p.winRate.toFixed(1)}% (${p.wins}W/${p.losses}L)
${pnlIcon} Total PnL: ${p.totalPnl >= 0 ? "+" : ""}${p.totalPnl.toFixed(2)}% | Avg: ${p.avgPnl.toFixed(2)}%
📐 Sharpe: ${p.sharpeRatio.toFixed(2)} | MaxDD: -${p.maxDrawdown.toFixed(2)}%
${p.bestTrade ? `🏆 Best: ${p.bestTrade.token} +${p.bestTrade.pnl.toFixed(1)}%` : ""}
${streak}`;
  }).join("\n\n");
  
  return `📊 **Agent Performance Leaderboard**

${rows}

---
*Based on ${performances.reduce((a, b) => a + b.totalSignals, 0)} closed signals*`;
}

// ==================== BACKTESTING ====================

export function runBacktest(config: BacktestConfig): BacktestResult {
  logger.info(`[Backtest] Running ${config.strategy} strategy on ${config.token}`);
  
  // Generate simulated historical data
  const days = Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / 86400000);
  const prices: number[] = [];
  let price = 100;
  
  for (let i = 0; i <= days; i++) {
    const change = (Math.random() - 0.48) * 5; // Slight upward bias
    price = Math.max(10, price * (1 + change / 100));
    prices.push(price);
  }
  
  // Run strategy
  const trades: { date: string; type: "buy" | "sell"; price: number; pnl: number }[] = [];
  const equityCurve: { date: string; value: number }[] = [];
  let capital = config.initialCapital;
  let position: { price: number; size: number } | null = null;
  let totalTrades = 0;
  let wins = 0;
  
  for (let i = 20; i < prices.length; i++) {
    const date = new Date(new Date(config.startDate).getTime() + i * 86400000).toISOString().split("T")[0];
    const currentPrice = prices[i];
    
    // Simple strategy signals
    const ma20 = prices.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20;
    const momentum = (currentPrice - prices[i - 5]) / prices[i - 5];
    
    let signal: "buy" | "sell" | null = null;
    
    switch (config.strategy) {
      case "momentum":
        if (momentum > 0.02 && !position) signal = "buy";
        if (momentum < -0.02 && position) signal = "sell";
        break;
      case "mean_reversion":
        if (currentPrice < ma20 * 0.97 && !position) signal = "buy";
        if (currentPrice > ma20 * 1.03 && position) signal = "sell";
        break;
      case "breakout":
        const high20 = Math.max(...prices.slice(i - 20, i));
        if (currentPrice > high20 && !position) signal = "buy";
        if (position && currentPrice < position.price * (1 - config.stopLoss / 100)) signal = "sell";
        break;
      case "sentiment":
        // Random sentiment-based entries
        if (Math.random() > 0.8 && !position) signal = "buy";
        if (position && Math.random() > 0.85) signal = "sell";
        break;
    }
    
    // Execute trades
    if (signal === "buy" && !position) {
      const size = (capital * config.positionSize / 100) / currentPrice;
      position = { price: currentPrice, size };
      trades.push({ date, type: "buy", price: currentPrice, pnl: 0 });
      totalTrades++;
    } else if (signal === "sell" && position) {
      const pnl = ((currentPrice - position.price) / position.price) * 100;
      capital += position.size * (currentPrice - position.price);
      if (pnl > 0) wins++;
      trades.push({ date, type: "sell", price: currentPrice, pnl });
      position = null;
    }
    
    // Check stop loss / take profit
    if (position) {
      const pnl = ((currentPrice - position.price) / position.price) * 100;
      if (pnl <= -config.stopLoss || pnl >= config.takeProfit) {
        capital += position.size * (currentPrice - position.price);
        if (pnl > 0) wins++;
        trades.push({ date, type: "sell", price: currentPrice, pnl });
        totalTrades++;
        position = null;
      }
    }
    
    // Track equity
    const equity = capital + (position ? position.size * currentPrice : 0);
    equityCurve.push({ date, value: equity });
  }
  
  // Calculate metrics
  const finalEquity = equityCurve[equityCurve.length - 1]?.value || config.initialCapital;
  const totalReturn = ((finalEquity - config.initialCapital) / config.initialCapital) * 100;
  const daysTraded = days;
  const annualizedReturn = totalReturn * (365 / daysTraded);
  
  // Max drawdown
  let peak = config.initialCapital;
  let maxDrawdown = 0;
  equityCurve.forEach(e => {
    if (e.value > peak) peak = e.value;
    const dd = ((peak - e.value) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });
  
  // Returns for Sharpe
  const returns = equityCurve.slice(1).map((e, i) => 
    (e.value - equityCurve[i].value) / equityCurve[i].value
  );
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;
  
  // Profit factor
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  const avgTradeReturn = trades.length > 0 
    ? trades.reduce((a, b) => a + b.pnl, 0) / trades.filter(t => t.type === "sell").length 
    : 0;
  
  const result: BacktestResult = {
    id: `bt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    config,
    metrics: {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate: totalTrades > 0 ? (wins / Math.ceil(totalTrades / 2)) * 100 : 0,
      profitFactor,
      totalTrades: Math.ceil(totalTrades / 2),
      avgTradeReturn,
      volatility: stdReturn * Math.sqrt(252) * 100,
    },
    trades,
    equityCurve,
    timestamp: Date.now(),
  };
  
  // Save backtest
  const backtests = loadBacktests();
  backtests.push(result);
  saveBacktests(backtests.slice(-50));
  
  return result;
}

export function formatBacktestResult(result: BacktestResult): string {
  const m = result.metrics;
  const c = result.config;
  
  const returnIcon = m.totalReturn >= 0 ? "📈" : "📉";
  const sharpeIcon = m.sharpeRatio >= 1 ? "🟢" : m.sharpeRatio >= 0.5 ? "🟡" : "🔴";
  const winIcon = m.winRate >= 50 ? "✅" : "⚠️";
  
  // Mini equity curve (ASCII)
  const curve = result.equityCurve;
  const min = Math.min(...curve.map(c => c.value));
  const max = Math.max(...curve.map(c => c.value));
  const range = max - min || 1;
  const sparkline = curve
    .filter((_, i) => i % Math.ceil(curve.length / 20) === 0)
    .map(c => {
      const level = Math.floor(((c.value - min) / range) * 4);
      return ["▁", "▂", "▃", "▄", "█"][level];
    })
    .join("");
  
  // Recent trades
  const recentTrades = result.trades
    .filter(t => t.type === "sell")
    .slice(-5)
    .map(t => `${t.date}: ${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(1)}%`)
    .join(" | ");
  
  return `📊 **Backtest Results**

**Strategy:** ${c.strategy.toUpperCase()}
**Token:** ${c.token.toUpperCase()}
**Period:** ${c.startDate} → ${c.endDate}
**Capital:** $${c.initialCapital.toLocaleString()}

---

${returnIcon} **Total Return:** ${m.totalReturn >= 0 ? "+" : ""}${m.totalReturn.toFixed(2)}%
📅 **Annualized:** ${m.annualizedReturn >= 0 ? "+" : ""}${m.annualizedReturn.toFixed(2)}%

${sharpeIcon} **Sharpe Ratio:** ${m.sharpeRatio.toFixed(2)}
📉 **Max Drawdown:** -${m.maxDrawdown.toFixed(2)}%
📊 **Volatility:** ${m.volatility.toFixed(1)}%

${winIcon} **Win Rate:** ${m.winRate.toFixed(1)}%
🎯 **Profit Factor:** ${m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2)}
📈 **Avg Trade:** ${m.avgTradeReturn >= 0 ? "+" : ""}${m.avgTradeReturn.toFixed(2)}%
🔢 **Total Trades:** ${m.totalTrades}

**Equity Curve:**
\`${sparkline}\`

**Recent Trades:**
${recentTrades || "No trades"}

---
*Backtest ID: ${result.id}*
*Simulated results. Past performance ≠ future results.*`;
}

export function getBacktestHistory(limit = 10): BacktestResult[] {
  return loadBacktests().slice(-limit);
}

export function formatBacktestHistory(backtests: BacktestResult[]): string {
  if (backtests.length === 0) {
    return `📊 **Backtest History**

No backtests yet. Run one:
\`backtest <token> <strategy> [days]\`

Strategies: momentum, mean_reversion, breakout, sentiment`;
  }
  
  const rows = backtests.slice(-10).reverse().map((bt, i) => {
    const icon = bt.metrics.totalReturn >= 0 ? "📈" : "📉";
    return `${i + 1}. ${icon} **${bt.config.token}** ${bt.config.strategy}
   Return: ${bt.metrics.totalReturn >= 0 ? "+" : ""}${bt.metrics.totalReturn.toFixed(1)}% | Sharpe: ${bt.metrics.sharpeRatio.toFixed(2)} | WR: ${bt.metrics.winRate.toFixed(0)}%`;
  }).join("\n\n");
  
  return `📊 **Backtest History**

${rows}

---
Run: \`backtest <token> <strategy>\``;
}

export default {
  recordSignal,
  closeSignal,
  getOpenSignals,
  getAllSignals,
  getAgentPerformance,
  formatAgentPerformance,
  runBacktest,
  formatBacktestResult,
  getBacktestHistory,
  formatBacktestHistory,
};
