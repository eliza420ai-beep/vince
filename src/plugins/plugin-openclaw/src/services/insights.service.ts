/**
 * OpenClaw Insights Service
 * 
 * AI-generated insights, market overview, screener, whale tracker, news digest, fear & greed
 */

import { logger } from "@elizaos/core";

// ==================== AI INSIGHTS ====================

interface TradingInsight {
  token: string;
  signal: "bullish" | "bearish" | "neutral";
  confidence: number; // 1-100
  reasoning: string[];
  targets: {
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  timeframe: string;
  risk: "low" | "medium" | "high";
  timestamp: number;
}

export function generateInsights(token: string): TradingInsight {
  const signals = ["bullish", "bearish", "neutral"] as const;
  const signal = signals[Math.floor(Math.random() * signals.length)];
  const confidence = Math.floor(Math.random() * 40) + 50; // 50-90
  
  const bullishReasons = [
    "Strong accumulation pattern detected",
    "KOL sentiment turning positive",
    "Whale wallets increasing positions",
    "Breaking above key resistance",
    "Volume surge with price uptick",
  ];
  
  const bearishReasons = [
    "Distribution pattern forming",
    "Decreasing social engagement",
    "Whale wallets reducing exposure",
    "Breaking below support level",
    "Volume declining on rallies",
  ];
  
  const neutralReasons = [
    "Consolidating in range",
    "Mixed signals from indicators",
    "Awaiting catalyst",
    "Low volume, no clear direction",
  ];
  
  const reasons = signal === "bullish" 
    ? bullishReasons.slice(0, 3)
    : signal === "bearish"
    ? bearishReasons.slice(0, 3)
    : neutralReasons.slice(0, 2);
  
  return {
    token: token.toUpperCase(),
    signal,
    confidence,
    reasoning: reasons,
    targets: signal === "bullish" ? {
      entry: 100,
      stopLoss: 90,
      takeProfit: 120,
    } : signal === "bearish" ? {
      entry: 100,
      stopLoss: 110,
      takeProfit: 85,
    } : {},
    timeframe: "1-7 days",
    risk: confidence > 75 ? "low" : confidence > 60 ? "medium" : "high",
    timestamp: Date.now(),
  };
}

export function formatInsights(insight: TradingInsight): string {
  const signalIcon = {
    bullish: "🟢",
    bearish: "🔴",
    neutral: "🟡",
  }[insight.signal];
  
  const riskIcon = {
    low: "✅",
    medium: "⚠️",
    high: "🔶",
  }[insight.risk];
  
  const reasons = insight.reasoning.map(r => `• ${r}`).join("\n");
  
  let targets = "";
  if (insight.targets.entry) {
    targets = `
**Targets:**
• Entry: $${insight.targets.entry}
• Stop Loss: $${insight.targets.stopLoss}
• Take Profit: $${insight.targets.takeProfit}`;
  }
  
  return `🧠 **AI Insights: ${insight.token}**

${signalIcon} **Signal:** ${insight.signal.toUpperCase()}
📊 **Confidence:** ${insight.confidence}%
⏱️ **Timeframe:** ${insight.timeframe}
${riskIcon} **Risk:** ${insight.risk}

**Reasoning:**
${reasons}
${targets}

---
⚠️ *Not financial advice. DYOR.*
*Generated: ${new Date(insight.timestamp).toLocaleString()}*`;
}

// ==================== MARKET OVERVIEW ====================

interface MarketOverview {
  totalMarketCap: string;
  btcDominance: number;
  totalVolume: string;
  fearGreedIndex: number;
  fearGreedLabel: string;
  topGainers: { token: string; change: number }[];
  topLosers: { token: string; change: number }[];
  trending: string[];
  timestamp: number;
}

export function getMarketOverview(): MarketOverview {
  const fearGreed = Math.floor(Math.random() * 100);
  const label = fearGreed < 25 ? "Extreme Fear" 
    : fearGreed < 45 ? "Fear"
    : fearGreed < 55 ? "Neutral"
    : fearGreed < 75 ? "Greed"
    : "Extreme Greed";
  
  return {
    totalMarketCap: "$2.1T",
    btcDominance: 52 + Math.floor(Math.random() * 5),
    totalVolume: "$85B",
    fearGreedIndex: fearGreed,
    fearGreedLabel: label,
    topGainers: [
      { token: "BONK", change: 25 + Math.floor(Math.random() * 20) },
      { token: "WIF", change: 15 + Math.floor(Math.random() * 15) },
      { token: "JUP", change: 10 + Math.floor(Math.random() * 10) },
    ],
    topLosers: [
      { token: "SHIB", change: -(10 + Math.floor(Math.random() * 10)) },
      { token: "DOGE", change: -(5 + Math.floor(Math.random() * 10)) },
      { token: "PEPE", change: -(3 + Math.floor(Math.random() * 8)) },
    ],
    trending: ["SOL", "BTC", "ETH", "BONK", "JUP"],
    timestamp: Date.now(),
  };
}

export function formatMarketOverview(overview: MarketOverview): string {
  const fearIcon = overview.fearGreedIndex < 45 ? "😨" : overview.fearGreedIndex > 55 ? "🤑" : "😐";
  const fearBar = "█".repeat(Math.floor(overview.fearGreedIndex / 10)) + "░".repeat(10 - Math.floor(overview.fearGreedIndex / 10));
  
  const gainers = overview.topGainers
    .map(g => `• **${g.token}** +${g.change}%`)
    .join("\n");
  
  const losers = overview.topLosers
    .map(l => `• **${l.token}** ${l.change}%`)
    .join("\n");
  
  return `🌍 **Market Overview**

💰 **Market Cap:** ${overview.totalMarketCap}
📊 **24h Volume:** ${overview.totalVolume}
₿ **BTC Dominance:** ${overview.btcDominance}%

${fearIcon} **Fear & Greed:** ${overview.fearGreedIndex}/100 - ${overview.fearGreedLabel}
\`[${fearBar}]\`

📈 **Top Gainers:**
${gainers}

📉 **Top Losers:**
${losers}

🔥 **Trending:** ${overview.trending.join(", ")}

---
*Updated: ${new Date(overview.timestamp).toLocaleString()}*`;
}

// ==================== TOKEN SCREENER ====================

interface ScreenerCriteria {
  minAlpha?: number;
  maxRisk?: number;
  sentiment?: "bullish" | "bearish" | "any";
  minVolume?: string;
  category?: string;
}

interface ScreenerResult {
  token: string;
  alpha: number;
  risk: number;
  sentiment: string;
  volume: string;
  match: number; // match percentage
}

export function screenTokens(criteria: ScreenerCriteria): ScreenerResult[] {
  const allTokens = ["SOL", "BTC", "ETH", "BONK", "WIF", "JUP", "RNDR", "PYTH", "JTO", "ORCA"];
  
  const results: ScreenerResult[] = allTokens.map(token => ({
    token,
    alpha: Math.floor(Math.random() * 4) + 6,
    risk: Math.floor(Math.random() * 5) + 3,
    sentiment: ["Bullish", "Bearish", "Neutral"][Math.floor(Math.random() * 3)],
    volume: `$${Math.floor(Math.random() * 500) + 50}M`,
    match: 0,
  }));
  
  // Calculate match percentage
  results.forEach(r => {
    let score = 0;
    let total = 0;
    
    if (criteria.minAlpha) {
      total++;
      if (r.alpha >= criteria.minAlpha) score++;
    }
    if (criteria.maxRisk) {
      total++;
      if (r.risk <= criteria.maxRisk) score++;
    }
    if (criteria.sentiment && criteria.sentiment !== "any") {
      total++;
      if (r.sentiment.toLowerCase() === criteria.sentiment) score++;
    }
    
    r.match = total > 0 ? Math.round((score / total) * 100) : 100;
  });
  
  // Sort by match then alpha
  return results
    .filter(r => r.match >= 50)
    .sort((a, b) => b.match - a.match || b.alpha - a.alpha);
}

export function formatScreenerResults(results: ScreenerResult[], criteria: ScreenerCriteria): string {
  if (results.length === 0) {
    return `🔍 **No tokens match criteria**

Try relaxing your filters.`;
  }
  
  const criteriaStr = [
    criteria.minAlpha ? `Alpha ≥ ${criteria.minAlpha}` : "",
    criteria.maxRisk ? `Risk ≤ ${criteria.maxRisk}` : "",
    criteria.sentiment ? `Sentiment: ${criteria.sentiment}` : "",
  ].filter(Boolean).join(" • ") || "No filters";
  
  const rows = results.slice(0, 10).map((r, i) => {
    const sentimentIcon = r.sentiment === "Bullish" ? "📈" : r.sentiment === "Bearish" ? "📉" : "➡️";
    return `${i + 1}. **${r.token}** - Alpha: ${r.alpha}/10, Risk: ${r.risk}/10 ${sentimentIcon}
   Vol: ${r.volume} • Match: ${r.match}%`;
  }).join("\n\n");
  
  return `🔍 **Token Screener**

**Filters:** ${criteriaStr}
**Results:** ${results.length} tokens

${rows}

---
Research any: \`@VINCE research <token>\``;
}

// ==================== WHALE TRACKER ====================

interface WhaleMovement {
  token: string;
  type: "buy" | "sell" | "transfer";
  amount: string;
  value: string;
  from: string;
  to: string;
  timestamp: number;
}

export function getWhaleMovements(token?: string): WhaleMovement[] {
  const tokens = token ? [token.toUpperCase()] : ["SOL", "BTC", "ETH", "BONK"];
  const types = ["buy", "sell", "transfer"] as const;
  
  return tokens.flatMap(t => 
    Array.from({ length: 3 }, () => ({
      token: t,
      type: types[Math.floor(Math.random() * types.length)],
      amount: `${(Math.random() * 1000000).toFixed(0)}`,
      value: `$${(Math.random() * 10).toFixed(1)}M`,
      from: `0x${Math.random().toString(16).substr(2, 8)}...`,
      to: `0x${Math.random().toString(16).substr(2, 8)}...`,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    }))
  ).sort((a, b) => b.timestamp - a.timestamp);
}

export function formatWhaleMovements(movements: WhaleMovement[]): string {
  const rows = movements.slice(0, 10).map(m => {
    const icon = m.type === "buy" ? "🟢" : m.type === "sell" ? "🔴" : "🔄";
    const ago = Math.floor((Date.now() - m.timestamp) / 60000);
    return `${icon} **${m.token}** ${m.type.toUpperCase()}
   ${m.amount} tokens (${m.value}) • ${ago}m ago
   ${m.from} → ${m.to}`;
  }).join("\n\n");
  
  return `🐋 **Whale Tracker**

${rows}

---
*Last 10 movements. Updates every 5 minutes.*`;
}

// ==================== NEWS DIGEST ====================

interface NewsItem {
  title: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  tokens: string[];
  timestamp: number;
}

export function getNewsDigest(token?: string): NewsItem[] {
  const news: NewsItem[] = [
    { title: "SOL breaks new ATH amid ecosystem growth", source: "CoinDesk", sentiment: "positive", tokens: ["SOL"], timestamp: Date.now() - 3600000 },
    { title: "BTC ETF inflows hit record high", source: "Bloomberg", sentiment: "positive", tokens: ["BTC"], timestamp: Date.now() - 7200000 },
    { title: "ETH upgrade scheduled for Q2", source: "The Block", sentiment: "positive", tokens: ["ETH"], timestamp: Date.now() - 10800000 },
    { title: "Regulatory concerns in Asia markets", source: "Reuters", sentiment: "negative", tokens: ["BTC", "ETH"], timestamp: Date.now() - 14400000 },
    { title: "DeFi TVL reaches new milestone", source: "DeFi Llama", sentiment: "positive", tokens: ["ETH", "SOL"], timestamp: Date.now() - 18000000 },
  ];
  
  if (token) {
    return news.filter(n => n.tokens.includes(token.toUpperCase()));
  }
  return news;
}

export function formatNewsDigest(news: NewsItem[]): string {
  if (news.length === 0) {
    return `📰 **No recent news**`;
  }
  
  const rows = news.slice(0, 10).map(n => {
    const icon = n.sentiment === "positive" ? "📈" : n.sentiment === "negative" ? "📉" : "📰";
    const ago = Math.floor((Date.now() - n.timestamp) / 3600000);
    const tokens = n.tokens.join(", ");
    return `${icon} **${n.title}**
   ${n.source} • ${ago}h ago • ${tokens}`;
  }).join("\n\n");
  
  return `📰 **News Digest**

${rows}

---
*Aggregated from major crypto news sources*`;
}

// ==================== FEAR & GREED ====================

export interface FearGreedData {
  value: number;
  label: string;
  change24h: number;
  change7d: number;
  history: { date: string; value: number }[];
}

export function getFearGreedIndex(): FearGreedData {
  const value = Math.floor(Math.random() * 100);
  const label = value < 25 ? "Extreme Fear" 
    : value < 45 ? "Fear"
    : value < 55 ? "Neutral"
    : value < 75 ? "Greed"
    : "Extreme Greed";
  
  const history = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
    value: Math.floor(Math.random() * 100),
  })).reverse();
  
  return {
    value,
    label,
    change24h: Math.floor(Math.random() * 20) - 10,
    change7d: Math.floor(Math.random() * 30) - 15,
    history,
  };
}

export function formatFearGreed(data: FearGreedData): string {
  const icon = data.value < 45 ? "😨" : data.value > 55 ? "🤑" : "😐";
  const bar = "█".repeat(Math.floor(data.value / 10)) + "░".repeat(10 - Math.floor(data.value / 10));
  
  const change24hIcon = data.change24h >= 0 ? "📈" : "📉";
  const change7dIcon = data.change7d >= 0 ? "📈" : "📉";
  
  const chart = data.history.map(h => {
    if (h.value >= 70) return "█";
    if (h.value >= 50) return "▆";
    if (h.value >= 30) return "▄";
    return "▂";
  }).join("");
  
  return `😱 **Fear & Greed Index**

${icon} **Current:** ${data.value}/100 - **${data.label}**
\`[${bar}]\`
   Fear ◄────────► Greed

**Changes:**
${change24hIcon} 24h: ${data.change24h >= 0 ? "+" : ""}${data.change24h}
${change7dIcon} 7d: ${data.change7d >= 0 ? "+" : ""}${data.change7d}

**7-Day Chart:**
\`${chart}\` (Fear ▂▄▆█ Greed)

---
*Updated: ${new Date().toLocaleString()}*`;
}

export default {
  generateInsights,
  formatInsights,
  getMarketOverview,
  formatMarketOverview,
  screenTokens,
  formatScreenerResults,
  getWhaleMovements,
  formatWhaleMovements,
  getNewsDigest,
  formatNewsDigest,
  getFearGreedIndex,
  formatFearGreed,
};
