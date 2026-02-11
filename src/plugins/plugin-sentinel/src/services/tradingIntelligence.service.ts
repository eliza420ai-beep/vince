/**
 * Trading Intelligence Service
 *
 * Deep knowledge of VINCE's paper trading bot and Solus's options strategy:
 *
 * VINCE (Perps on Hyperliquid):
 * - Signal aggregator with 20+ sources
 * - Feature store with 50+ features per decision
 * - ONNX ML models (signal quality, sizing, TP/SL)
 * - Thompson Sampling weight bandit
 * - WHY THIS TRADE explainability
 *
 * Solus (Options on Hypersurface):
 * - Weekly options (Friday 08:00 UTC expiry)
 * - Covered calls and cash-secured puts
 * - Strike ritual process
 * - EV framework (bull/base/bear scenarios)
 * - $100K stack, $3K/week target
 *
 * Sentinel uses this to suggest improvements to both systems.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

// Paper Trading Bot Architecture
export interface SignalSource {
  name: string;
  service: string;
  description: string;
  requiresKey: boolean;
  keyEnv?: string;
  defaultWeight: number;
  thresholds?: string;
}

export interface FeatureCategory {
  category: string;
  features: string[];
  description: string;
}

export interface MLModel {
  name: string;
  purpose: string;
  inputs: string[];
  output: string;
  trainingMinSamples: number;
}

// Options Strategy Architecture
export interface HypersurfaceAsset {
  ticker: string;
  name: string;
  expiry: string;
  strategies: string[];
}

export interface StrikeRitualStep {
  step: number;
  actor: string;
  action: string;
  output: string;
}

// Signal sources in the aggregator
const SIGNAL_SOURCES: SignalSource[] = [
  {
    name: "CoinGlass",
    service: "VinceCoinGlassService",
    description: "Funding, L/S ratio, OI, OI change, Fear/Greed — 5-8 factors always",
    requiresKey: false,
    keyEnv: "COINGLASS_API_KEY",
    defaultWeight: 1.0,
    thresholds: "Always contributes when data available",
  },
  {
    name: "BinanceTopTraders",
    service: "VinceBinanceService",
    description: "Top trader long % > 62 or < 38",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Top trader long % > 62% or < 38%",
  },
  {
    name: "BinanceTakerFlow",
    service: "VinceBinanceService",
    description: "Taker buy/sell ratio signals",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Ratio > 1.25 or < 0.75",
  },
  {
    name: "BinanceOIFlush",
    service: "VinceBinanceService",
    description: "OI trend falling < -5%",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "OI trend < -5%",
  },
  {
    name: "BinanceFundingExtreme",
    service: "VinceBinanceService",
    description: "Funding in top/bottom 10% of recent",
    requiresKey: false,
    defaultWeight: 1.5,
    thresholds: "Funding percentile > 90% or < 10%",
  },
  {
    name: "LiquidationCascade",
    service: "VinceBinanceLiquidationService",
    description: "Cascade detected — high impact",
    requiresKey: false,
    defaultWeight: 2.0,
    thresholds: "Cascade detected",
  },
  {
    name: "LiquidationPressure",
    service: "VinceBinanceLiquidationService",
    description: "Per-symbol liquidation pressure",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Per-symbol pressure detected",
  },
  {
    name: "NewsSentiment",
    service: "VinceNewsSentimentService",
    description: "MandoMinutes news sentiment with asset-specific weighting",
    requiresKey: false,
    defaultWeight: 0.6,
    thresholds: "Confidence ≥ 40%",
  },
  {
    name: "XSentiment",
    service: "VinceXSentimentService",
    description: "X/Twitter search sentiment — staggered one asset per hour",
    requiresKey: true,
    keyEnv: "X_BEARER_TOKEN",
    defaultWeight: 0.5,
    thresholds: "Confidence ≥ 40% (X_SENTIMENT_CONFIDENCE_FLOOR)",
  },
  {
    name: "DeribitIVSkew",
    service: "VinceDeribitService",
    description: "IV skew fearful, bullish, or neutral (BTC/ETH/SOL)",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Skew is fearful or bullish",
  },
  {
    name: "DeribitPutCallRatio",
    service: "VinceDeribitService",
    description: "Put/Call ratio signals",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "P/C > 1.2 or < 0.82",
  },
  {
    name: "MarketRegime",
    service: "VinceMarketRegimeService",
    description: "Regime classification (bullish/bearish/volatile/neutral)",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Regime is not neutral",
  },
  {
    name: "SanbaseExchangeFlows",
    service: "VinceSanbaseService",
    description: "Exchange in/out flows",
    requiresKey: true,
    keyEnv: "SANBASE_API_KEY",
    defaultWeight: 1.0,
    thresholds: "Significant in or out flow",
  },
  {
    name: "SanbaseWhales",
    service: "VinceSanbaseService",
    description: "Whale activity signals",
    requiresKey: true,
    keyEnv: "SANBASE_API_KEY",
    defaultWeight: 1.0,
    thresholds: "Whale activity detected",
  },
  {
    name: "HyperliquidOICap",
    service: "Hyperliquid fallback",
    description: "Perp at OI cap — max crowding, contrarian signal",
    requiresKey: false,
    defaultWeight: 1.5,
    thresholds: "Perp at OI cap",
  },
  {
    name: "HyperliquidFundingExtreme",
    service: "Hyperliquid fallback",
    description: "HL funding in top/bottom 10% of history — mean reversion",
    requiresKey: false,
    defaultWeight: 1.5,
    thresholds: "Funding extreme",
  },
  {
    name: "CrossVenueFunding",
    service: "Hyperliquid + Binance",
    description: "Funding arbitrage opportunity across venues",
    requiresKey: false,
    defaultWeight: 1.2,
    thresholds: "Funding divergence detected",
  },
  {
    name: "TopTraders",
    service: "VinceTopTradersService",
    description: "Hyperliquid whale positions",
    requiresKey: false,
    defaultWeight: 1.0,
    thresholds: "Whale position crosses threshold",
  },
];

// Feature store categories
const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    category: "market",
    features: [
      "priceChange24h", "volumeRatio", "fundingPercentile", "longShortRatio",
      "dvol", "rsi14", "oiChange24h", "fundingDelta", "bookImbalance",
      "bidAskSpread", "priceVsSma20", "atrPct",
    ],
    description: "Market data features from exchanges and aggregators",
  },
  {
    category: "session",
    features: ["utcHour", "isWeekend", "isOpenWindow", "dayOfWeek"],
    description: "Session and timing features",
  },
  {
    category: "signal",
    features: [
      "strength", "confidence", "source_count", "avg_sentiment",
      "hasCascadeSignal", "hasFundingExtreme", "hasWhaleSignal", "hasOICap",
    ],
    description: "Aggregated signal features from all sources",
  },
  {
    category: "regime",
    features: ["volatilityRegime", "marketRegime", "volatility_high", "bullish", "bearish"],
    description: "Market regime classification",
  },
  {
    category: "news",
    features: [
      "avg_sentiment", "nasdaqChange", "etfFlowBtc", "etfFlowEth",
      "macro_risk_on", "macro_risk_off",
    ],
    description: "News and macro features",
  },
  {
    category: "execution",
    features: ["entryPrice", "leverage", "positionSizeUsd", "stopLossPrice", "takeProfitPrice"],
    description: "Trade execution parameters",
  },
  {
    category: "outcome",
    features: ["realizedPnl", "realizedPnlPct", "exitReason", "durationMs", "feesUsd"],
    description: "Trade outcome features (net of fees)",
  },
  {
    category: "labels",
    features: ["profitable", "winAmount", "lossAmount", "rMultiple"],
    description: "Training labels for ML",
  },
];

// ML models in the pipeline
const ML_MODELS: MLModel[] = [
  {
    name: "signal_quality",
    purpose: "Predict trade quality from signal features — filters bad setups",
    inputs: ["market_*", "session_*", "signal_*", "regime_*", "news_*"],
    output: "quality_score (0-100)",
    trainingMinSamples: 90,
  },
  {
    name: "position_sizing",
    purpose: "Optimal position size based on regime and volatility",
    inputs: ["market_dvol", "regime_*", "signal_confidence"],
    output: "size_multiplier (0.5-2.0)",
    trainingMinSamples: 90,
  },
  {
    name: "tp_optimizer",
    purpose: "Optimal take profit level",
    inputs: ["market_atrPct", "regime_*", "signal_strength"],
    output: "tp_percentage",
    trainingMinSamples: 90,
  },
  {
    name: "sl_optimizer",
    purpose: "Optimal stop loss level",
    inputs: ["market_atrPct", "regime_volatility_high", "signal_confidence"],
    output: "sl_percentage",
    trainingMinSamples: 90,
  },
];

// Hypersurface options
const HYPERSURFACE_ASSETS: HypersurfaceAsset[] = [
  { ticker: "HYPE", name: "Hyperliquid", expiry: "Friday 08:00 UTC", strategies: ["covered_call", "secured_put", "wheel"] },
  { ticker: "SOL", name: "Solana", expiry: "Friday 08:00 UTC", strategies: ["covered_call", "secured_put", "wheel"] },
  { ticker: "WBTC", name: "Wrapped Bitcoin", expiry: "Friday 08:00 UTC", strategies: ["covered_call", "secured_put", "wheel"] },
  { ticker: "ETH", name: "Ethereum", expiry: "Friday 08:00 UTC", strategies: ["covered_call", "secured_put", "wheel"] },
];

// Strike ritual process
const STRIKE_RITUAL: StrikeRitualStep[] = [
  { step: 1, actor: "User", action: "Say 'options' to VINCE", output: "IV/DVOL and strike suggestions" },
  { step: 2, actor: "User", action: "Ask VINCE 'What's CT saying about BTC'", output: "CT vibe and sentiment" },
  { step: 3, actor: "User", action: "Paste VINCE output to Solus", output: "Context for strike call" },
  { step: 4, actor: "Solus", action: "Give size/skip/watch with strike", output: "OTM %, invalidation" },
  { step: 5, actor: "User", action: "Execute on Hypersurface", output: "Position opened" },
];

// Solus EV framework
export interface EVScenario {
  name: string;
  probability: number;
  return_pct: number;
}

/**
 * Get all signal sources
 */
export function getSignalSources(): SignalSource[] {
  return SIGNAL_SOURCES;
}

/**
 * Get sources that require API keys
 */
export function getKeyRequiredSources(): SignalSource[] {
  return SIGNAL_SOURCES.filter(s => s.requiresKey);
}

/**
 * Get free sources (no API key)
 */
export function getFreeSources(): SignalSource[] {
  return SIGNAL_SOURCES.filter(s => !s.requiresKey);
}

/**
 * Get feature categories
 */
export function getFeatureCategories(): FeatureCategory[] {
  return FEATURE_CATEGORIES;
}

/**
 * Get ML models
 */
export function getMLModels(): MLModel[] {
  return ML_MODELS;
}

/**
 * Get Hypersurface assets
 */
export function getHypersurfaceAssets(): HypersurfaceAsset[] {
  return HYPERSURFACE_ASSETS;
}

/**
 * Get strike ritual steps
 */
export function getStrikeRitualSteps(): StrikeRitualStep[] {
  return STRIKE_RITUAL;
}

/**
 * Calculate EV for a recommendation
 */
export function calculateEV(scenarios: EVScenario[]): number {
  return scenarios.reduce((ev, s) => ev + (s.probability * s.return_pct), 0);
}

/**
 * Format EV calculation
 */
export function formatEV(ticker: string, price: number, scenarios: EVScenario[]): string {
  const ev = calculateEV(scenarios);
  const scenarioText = scenarios.map(s => 
    `${s.name}: ${Math.round(s.probability * 100)}% @ ${s.return_pct >= 0 ? '+' : ''}${s.return_pct}%`
  ).join('. ');
  
  return `${ticker} at $${price.toFixed(2)}. ${scenarioText}. EV: ${ev >= 0 ? '+' : ''}${ev.toFixed(1)}%`;
}

/**
 * Check paper trading health
 */
export function checkPaperTradingHealth(): { issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for API keys
  if (!process.env.X_BEARER_TOKEN) {
    issues.push("X_BEARER_TOKEN not set — XSentiment source disabled");
    suggestions.push("Set X_BEARER_TOKEN to enable X sentiment in signal aggregator");
  }
  
  if (!process.env.SANBASE_API_KEY) {
    issues.push("SANBASE_API_KEY not set — Sanbase sources disabled");
    suggestions.push("Set SANBASE_API_KEY for exchange flow and whale signals");
  }
  
  if (!process.env.COINGLASS_API_KEY) {
    suggestions.push("Consider COINGLASS_API_KEY for more stable CoinGlass data");
  }
  
  // Check Supabase for ML
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY not set — no dual-write for ML training");
    suggestions.push("Set Supabase keys for feature store persistence across deploys");
  }
  
  // Check aggressive mode
  if (!process.env.VINCE_PAPER_AGGRESSIVE) {
    suggestions.push("Consider VINCE_PAPER_AGGRESSIVE=true to collect more training data faster");
  }
  
  return { issues, suggestions };
}

/**
 * Get paper trading improvement suggestions
 */
export function getPaperTradingImprovements(): string[] {
  return [
    "Add more signal sources: Nansen smart money, additional exchange flows",
    "Tune source weights via run-improvement-weights.ts after 90+ trades",
    "Enable VINCE_PAPER_AGGRESSIVE=true to reach 90 trades faster",
    "Focus on one asset first: VINCE_PAPER_ASSETS=BTC",
    "Add avoided decision analysis for no-trade days",
    "Implement walk-forward optimization to reduce overfitting",
    "Add backtesting as first-class step (replay historical features)",
    "Create dashboard for WHY THIS TRADE + PnL + SHAP explanations",
  ];
}

/**
 * Get Solus/options improvement suggestions
 */
export function getSolusImprovements(): string[] {
  return [
    "Implement persistent memory for recommendations tracking (recommendations.jsonl)",
    "Add EV calibration: track actual vs predicted scenarios",
    "Build smart wallet database for alpha signals",
    "Enable Grok sub-agents for multi-angle X intelligence (GROK_SUB_AGENTS_ENABLED=true)",
    "Implement session state for cross-session investigations",
    "Add automated strike suggestions based on IV surface",
    "Create weekly compiled briefing output",
    "Track early exercise risk for Thursday night decisions",
  ];
}

/**
 * Generate paper trading architecture overview
 */
export function getPaperTradingOverview(): string {
  const sources = getSignalSources();
  const freeSources = getFreeSources();
  const keyRequired = getKeyRequiredSources();
  const models = getMLModels();
  
  return `# Paper Trading Bot Architecture (VINCE)

## North Star
Self-improving paper trading bot that makes money in 1h/1d/2d. ML loop trains in prod without redeploy.

## Signal Aggregator (${sources.length} sources)

**Free Sources (${freeSources.length}):**
${freeSources.map(s => `• **${s.name}** (${s.defaultWeight}x): ${s.description}`).join("\n")}

**API Key Required (${keyRequired.length}):**
${keyRequired.map(s => `• **${s.name}** (${s.keyEnv}): ${s.description}`).join("\n")}

## Feature Store (50+ features)

${FEATURE_CATEGORIES.map(c => `**${c.category}:** ${c.features.slice(0, 5).join(", ")}...`).join("\n")}

## ML Models (ONNX)

${models.map(m => `• **${m.name}:** ${m.purpose}`).join("\n")}

## Training Pipeline
1. Collect 90+ closed trades
2. Run train_models.py → ONNX export
3. Upload to Supabase vince-ml-models bucket
4. ML service auto-reloads
5. run-improvement-weights.ts to tune source weights

## Key Env Vars
- VINCE_PAPER_AGGRESSIVE=true (faster data collection)
- VINCE_PAPER_ASSETS=BTC (focus one asset)
- SUPABASE_SERVICE_ROLE_KEY (persist features)
- X_BEARER_TOKEN (X sentiment)
`;
}

/**
 * Generate Solus/options architecture overview
 */
export function getSolusOverview(): string {
  const assets = getHypersurfaceAssets();
  const ritual = getStrikeRitualSteps();
  
  return `# Options Strategy Architecture (Solus)

## North Star
Solus makes money when: (1) good strike selection, (2) good weekly sentiment. Friday 08:00 UTC expiry.

## Hypersurface Assets

| Ticker | Strategies | Expiry |
|--------|------------|--------|
${assets.map(a => `| ${a.ticker} | ${a.strategies.join(", ")} | ${a.expiry} |`).join("\n")}

## Strategies

**Covered Calls:** Own asset → sell call at strike → earn premium
• Above strike = assigned (sell at strike)
• At/below strike = keep asset + premium

**Cash-Secured Puts:** Hold stablecoins → sell put → earn premium
• Below strike = assigned (buy at strike, premium reduces cost basis)
• At/above strike = keep cash + premium

**Wheel:** Own → covered calls → if assigned, hold cash → secured puts → repeat

## Strike Ritual Process

${ritual.map(s => `${s.step}. **${s.actor}:** ${s.action} → ${s.output}`).join("\n")}

## EV Framework

Every recommendation needs:
- **Bull scenario:** probability × return
- **Base scenario:** probability × return
- **Bear scenario:** probability × return
- **EV:** sum of (prob × return)

Example: "BTC at $105K. Bull: 30% @ +150%. Base: 45% @ +20%. Bear: 25% @ -60%. EV: +24.5%"

## $100K Stack (Seven Pillars)
1. Hypersurface options — $3K/week minimum
2. Yield (USDC/USDT0)
3. Stack sats
4. Echo seed DD
5. Paper perps bot
6. HIP-3 spot
7. Airdrop farming
`;
}

/**
 * Get data pipeline overview
 */
export function getDataPipelineOverview(): string {
  return `# Data Pipeline Architecture

## Flow: Sources → Aggregator → Paper Bot → Feature Store → ML

\`\`\`
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ 20+ Sources │ ─► │ Aggregator   │ ─► │ Paper Bot   │ ─► │ Feature Store│
│ (APIs, WS)  │    │ (weights)    │    │ (decisions) │    │ (50+ features)
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                   │
                                                                   ▼
                   ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
                   │ Inference    │ ◄─ │ ONNX Models │ ◄─ │ Training     │
                   │ (runtime)    │    │ (4 models)  │    │ (90+ trades) │
                   └──────────────┘    └─────────────┘    └──────────────┘
\`\`\`

## Data Sources by Category

**Perps/Funding:**
• Binance (funding, OI, taker flow, liquidations)
• Hyperliquid (funding, OI cap, crowding)
• CoinGlass (aggregated funding, L/S, Fear/Greed)

**Options/Vol:**
• Deribit (IV, skew, DVOL, put/call ratio)

**Sentiment:**
• MandoMinutes (news sentiment)
• X/Twitter (social sentiment via X_BEARER_TOKEN)

**On-Chain:**
• Sanbase (exchange flows, whale activity)
• Nansen (smart money — not yet in aggregator)

**Regime:**
• MarketRegime service (bullish/bearish/volatile/neutral)

## Storage Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| JSONL | .elizadb/vince-paper-bot/features/ | Backup, offline, export |
| PGLite | In-memory | Dev/local runtime |
| Postgres | POSTGRES_URL | Production ElizaOS tables |
| Supabase | vince_paper_bot_features | ML training queries |

## Key Metrics to Monitor
• Sources per trade ("N sources" in WHY THIS TRADE)
• Feature completeness (50+ features per decision)
• ML quality score (0-100)
• Win rate and EV calibration
`;
}

export default {
  getSignalSources,
  getKeyRequiredSources,
  getFreeSources,
  getFeatureCategories,
  getMLModels,
  getHypersurfaceAssets,
  getStrikeRitualSteps,
  calculateEV,
  formatEV,
  checkPaperTradingHealth,
  getPaperTradingImprovements,
  getSolusImprovements,
  getPaperTradingOverview,
  getSolusOverview,
  getDataPipelineOverview,
};
