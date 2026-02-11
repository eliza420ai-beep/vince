/**
 * OpenClaw Analytics Service
 * 
 * Sentiment trends, risk analysis, stats dashboard, leaderboard
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "@elizaos/core";

const DATA_DIR = path.resolve(process.cwd(), ".openclaw-data");
const TRENDS_FILE = path.join(DATA_DIR, "trends.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

interface TrendDataPoint {
  timestamp: number;
  sentiment: number;
  price?: number;
  volume?: number;
}

interface TokenTrend {
  token: string;
  dataPoints: TrendDataPoint[];
  lastUpdated: number;
}

interface RiskAnalysis {
  token: string;
  riskScore: number; // 1-10, 10 = highest risk
  factors: RiskFactor[];
  recommendation: string;
  timestamp: number;
}

interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

interface UsageStats {
  totalQueries: number;
  totalCost: number;
  queriesByAgent: Record<string, number>;
  queriesByToken: Record<string, number>;
  dailyStats: DailyStat[];
  lastUpdated: number;
}

interface DailyStat {
  date: string;
  queries: number;
  cost: number;
}

interface LeaderboardEntry {
  token: string;
  alphaScore: number;
  sentiment: string;
  momentum: string;
  rank: number;
}

// Initialize
function initDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ==================== TRENDS ====================

export function getTrends(): TokenTrend[] {
  initDataDir();
  if (!existsSync(TRENDS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(TRENDS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveTrends(trends: TokenTrend[]): void {
  initDataDir();
  writeFileSync(TRENDS_FILE, JSON.stringify(trends, null, 2));
}

export function addTrendDataPoint(token: string, sentiment: number, price?: number, volume?: number): void {
  const trends = getTrends();
  let trend = trends.find(t => t.token.toLowerCase() === token.toLowerCase());
  
  if (!trend) {
    trend = { token: token.toUpperCase(), dataPoints: [], lastUpdated: Date.now() };
    trends.push(trend);
  }
  
  trend.dataPoints.push({
    timestamp: Date.now(),
    sentiment,
    price,
    volume,
  });
  
  // Keep only last 100 data points
  if (trend.dataPoints.length > 100) {
    trend.dataPoints = trend.dataPoints.slice(-100);
  }
  
  trend.lastUpdated = Date.now();
  saveTrends(trends);
}

export function getTokenTrend(token: string): TokenTrend | null {
  const trends = getTrends();
  return trends.find(t => t.token.toLowerCase() === token.toLowerCase()) || null;
}

export function formatTrend(trend: TokenTrend): string {
  if (!trend || trend.dataPoints.length === 0) {
    return `📈 **No trend data for ${trend?.token || "token"}**`;
  }
  
  const recent = trend.dataPoints.slice(-10);
  const avgSentiment = recent.reduce((sum, d) => sum + d.sentiment, 0) / recent.length;
  const firstSentiment = recent[0].sentiment;
  const lastSentiment = recent[recent.length - 1].sentiment;
  const change = lastSentiment - firstSentiment;
  
  const arrow = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
  const trend_direction = change > 0 ? "Improving" : change < 0 ? "Declining" : "Stable";
  
  // ASCII mini chart
  const chart = recent.map(d => {
    if (d.sentiment >= 7) return "█";
    if (d.sentiment >= 5) return "▆";
    if (d.sentiment >= 3) return "▄";
    return "▂";
  }).join("");
  
  return `📈 **Sentiment Trend: ${trend.token}**

**Current:** ${lastSentiment.toFixed(1)}/10 ${arrow}
**Average:** ${avgSentiment.toFixed(1)}/10
**Direction:** ${trend_direction} (${change >= 0 ? "+" : ""}${change.toFixed(1)})

**Chart (last 10):**
\`${chart}\` Low ▂▄▆█ High

**Data points:** ${trend.dataPoints.length}
**Last updated:** ${new Date(trend.lastUpdated).toLocaleString()}`;
}

// ==================== RISK ANALYSIS ====================

export function analyzeRisk(token: string): RiskAnalysis {
  // Simulated risk analysis
  const factors: RiskFactor[] = [
    {
      name: "Volatility",
      score: Math.floor(Math.random() * 5) + 3,
      description: "Price volatility based on historical data",
    },
    {
      name: "Liquidity",
      score: Math.floor(Math.random() * 4) + 2,
      description: "Market depth and trading volume",
    },
    {
      name: "Concentration",
      score: Math.floor(Math.random() * 5) + 2,
      description: "Whale concentration in holdings",
    },
    {
      name: "Market Cap",
      score: Math.floor(Math.random() * 4) + 1,
      description: "Size relative to market",
    },
    {
      name: "Sentiment",
      score: Math.floor(Math.random() * 5) + 2,
      description: "Social sentiment volatility",
    },
  ];
  
  const avgScore = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const riskScore = Math.round(avgScore);
  
  let recommendation: string;
  if (riskScore <= 3) {
    recommendation = "✅ Low risk - Suitable for conservative portfolios";
  } else if (riskScore <= 5) {
    recommendation = "⚠️ Moderate risk - Position sizing recommended";
  } else if (riskScore <= 7) {
    recommendation = "🔶 High risk - Only for experienced traders";
  } else {
    recommendation = "🔴 Very high risk - Extreme caution advised";
  }
  
  return {
    token: token.toUpperCase(),
    riskScore,
    factors,
    recommendation,
    timestamp: Date.now(),
  };
}

export function formatRiskAnalysis(analysis: RiskAnalysis): string {
  const riskBar = "█".repeat(analysis.riskScore) + "░".repeat(10 - analysis.riskScore);
  
  const factorList = analysis.factors.map(f => 
    `• **${f.name}:** ${f.score}/10 - ${f.description}`
  ).join("\n");
  
  return `⚠️ **Risk Analysis: ${analysis.token}**

**Risk Score:** ${analysis.riskScore}/10
\`[${riskBar}]\`

**Factors:**
${factorList}

**Recommendation:**
${analysis.recommendation}

---
*Analysis time: ${new Date(analysis.timestamp).toLocaleString()}*`;
}

// ==================== STATS DASHBOARD ====================

export function getStats(): UsageStats {
  initDataDir();
  if (!existsSync(STATS_FILE)) {
    return {
      totalQueries: 0,
      totalCost: 0,
      queriesByAgent: {},
      queriesByToken: {},
      dailyStats: [],
      lastUpdated: Date.now(),
    };
  }
  try {
    return JSON.parse(readFileSync(STATS_FILE, "utf-8"));
  } catch {
    return {
      totalQueries: 0,
      totalCost: 0,
      queriesByAgent: {},
      queriesByToken: {},
      dailyStats: [],
      lastUpdated: Date.now(),
    };
  }
}

export function saveStats(stats: UsageStats): void {
  initDataDir();
  stats.lastUpdated = Date.now();
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

export function recordQuery(agent: string, tokens: string[], cost: number): void {
  const stats = getStats();
  
  stats.totalQueries++;
  stats.totalCost += cost;
  
  // By agent
  stats.queriesByAgent[agent] = (stats.queriesByAgent[agent] || 0) + 1;
  
  // By token
  tokens.forEach(token => {
    const t = token.toUpperCase();
    stats.queriesByToken[t] = (stats.queriesByToken[t] || 0) + 1;
  });
  
  // Daily stats
  const today = new Date().toISOString().split("T")[0];
  let todayStat = stats.dailyStats.find(d => d.date === today);
  if (!todayStat) {
    todayStat = { date: today, queries: 0, cost: 0 };
    stats.dailyStats.push(todayStat);
  }
  todayStat.queries++;
  todayStat.cost += cost;
  
  // Keep only last 30 days
  stats.dailyStats = stats.dailyStats.slice(-30);
  
  saveStats(stats);
}

export function formatStats(stats: UsageStats): string {
  // Top agents
  const topAgents = Object.entries(stats.queriesByAgent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([agent, count], i) => `${i + 1}. ${agent}: ${count}`)
    .join("\n");
  
  // Top tokens
  const topTokens = Object.entries(stats.queriesByToken)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token, count], i) => `${i + 1}. ${token}: ${count}`)
    .join("\n");
  
  // Recent daily stats
  const recentDays = stats.dailyStats.slice(-7);
  const dailyChart = recentDays.map(d => {
    const bars = Math.min(Math.ceil(d.queries / 5), 10);
    return `${d.date.slice(5)}: ${"█".repeat(bars)}${"░".repeat(10 - bars)} ${d.queries}`;
  }).join("\n");
  
  return `📊 **Stats Dashboard**

**Overview:**
• Total queries: ${stats.totalQueries}
• Total cost: $${stats.totalCost.toFixed(4)}
• Avg cost/query: $${(stats.totalCost / Math.max(stats.totalQueries, 1)).toFixed(4)}

**Top Agents:**
${topAgents || "No data yet"}

**Top Tokens:**
${topTokens || "No data yet"}

**Last 7 Days:**
\`\`\`
${dailyChart || "No data yet"}
\`\`\`

*Last updated: ${new Date(stats.lastUpdated).toLocaleString()}*`;
}

// ==================== LEADERBOARD ====================

export function getLeaderboard(tokens?: string[]): LeaderboardEntry[] {
  // Simulated leaderboard
  const defaultTokens = tokens || ["SOL", "BTC", "ETH", "BONK", "PEPE", "WIF", "JUP", "RNDR"];
  
  const entries: LeaderboardEntry[] = defaultTokens.map(token => ({
    token,
    alphaScore: Math.floor(Math.random() * 4) + 6, // 6-10
    sentiment: ["Bullish", "Mixed", "Bearish"][Math.floor(Math.random() * 3)],
    momentum: ["Strong Up", "Up", "Sideways", "Down"][Math.floor(Math.random() * 4)],
    rank: 0,
  }));
  
  // Sort by alpha score
  entries.sort((a, b) => b.alphaScore - a.alphaScore);
  entries.forEach((e, i) => e.rank = i + 1);
  
  return entries;
}

export function formatLeaderboard(entries: LeaderboardEntry[]): string {
  const medals = ["🥇", "🥈", "🥉"];
  
  const rows = entries.slice(0, 10).map((e, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const sentimentIcon = e.sentiment === "Bullish" ? "📈" : e.sentiment === "Bearish" ? "📉" : "➡️";
    return `${medal} **${e.token}** - Alpha: ${e.alphaScore}/10 ${sentimentIcon} ${e.momentum}`;
  }).join("\n");
  
  return `🏆 **Token Leaderboard**

${rows}

---
*Ranked by alpha score. Updated: ${new Date().toLocaleString()}*

Research any: \`@VINCE research <token>\``;
}

export default {
  // Trends
  getTrends,
  addTrendDataPoint,
  getTokenTrend,
  formatTrend,
  // Risk
  analyzeRisk,
  formatRiskAnalysis,
  // Stats
  getStats,
  recordQuery,
  formatStats,
  // Leaderboard
  getLeaderboard,
  formatLeaderboard,
};
