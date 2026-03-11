/**
 * SENTINEL_TRADING_INTEL — Paper Trading Bot & Options Strategy Expert
 *
 * Deep knowledge of:
 * - VINCE's paper trading bot (signal aggregator, feature store, ML, ONNX)
 * - Solus's options strategy (Hypersurface, strike ritual, EV framework)
 * - Data pipeline and analysis
 *
 * Triggers:
 * - "paper trading", "paper bot"
 * - "signal sources", "aggregator"
 * - "feature store", "ml training", "onnx"
 * - "hypersurface", "options strategy", "strike ritual"
 * - "solus improvements", "ev framework"
 * - "data pipeline"
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import {
  getSignalSources,
  getKeyRequiredSources,
  getFreeSources,
  getFeatureCategories,
  getMLModels,
  getHypersurfaceAssets,
  getStrikeRitualSteps,
  checkPaperTradingHealth,
  getPaperTradingImprovements,
  getSolusImprovements,
  getPaperTradingOverview,
  getSolusOverview,
  getDataPipelineOverview,
  formatEV,
  type EVScenario,
} from "../services/tradingIntelligence.service";

const TRADING_INTEL_TRIGGERS = [
  "paper trading",
  "paper bot",
  "signal sources",
  "signal aggregator",
  "feature store",
  "ml training",
  "onnx",
  "hypersurface",
  "options strategy",
  "strike ritual",
  "solus improvements",
  "ev framework",
  "data pipeline",
  "improve the algo",
  "trading improvements",
  "perps algo",
  "options algo",
];

function wantsTradingIntel(text: string): boolean {
  const lower = text.toLowerCase();
  return TRADING_INTEL_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelTradingIntelAction: Action = {
  name: "SENTINEL_TRADING_INTEL",
  similes: [
    "PAPER_TRADING_EXPERT",
    "SIGNAL_AGGREGATOR",
    "OPTIONS_STRATEGY",
    "FEATURE_STORE",
    "ML_PIPELINE",
  ],
  description:
    "Deep knowledge of VINCE's paper trading bot (20+ signal sources, feature store, ONNX ML) and Solus's options strategy (Hypersurface, strike ritual, EV framework). Can suggest improvements to both systems.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsTradingIntel(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SENTINEL_TRADING_INTEL] Action fired");

    try {
      const userText = (message.content?.text ?? "").trim();
      const lower = userText.toLowerCase();

      // Signal sources query
      if (lower.includes("signal source") || lower.includes("aggregator")) {
        const sources = getSignalSources();
        const freeSources = getFreeSources();
        const keyRequired = getKeyRequiredSources();

        await callback({
          text: `📡 **Signal Aggregator (${sources.length} sources)**

**Free Sources (${freeSources.length}):**
${freeSources
  .slice(0, 8)
  .map((s) => `• **${s.name}** (${s.defaultWeight}x): ${s.thresholds}`)
  .join("\n")}

**API Key Required (${keyRequired.length}):**
${keyRequired.map((s) => `• **${s.name}** (${s.keyEnv}): ${s.description}`).join("\n")}

**How it works:**
1. Each source contributes factors when thresholds are met
2. Factors are weighted (default + bandit adjustment)
3. Net direction = weighted average
4. "N sources" = distinct sources that contributed this tick

**To get more factors:**
• Set API keys (X_BEARER_TOKEN, SANBASE_API_KEY)
• Ensure services are returning data for your assets
• Check thresholds in SIGNAL_SOURCES.md`,
        });
        return { success: true };
      }

      // Feature store query
      if (lower.includes("feature store") || lower.includes("features")) {
        const categories = getFeatureCategories();
        const totalFeatures = categories.reduce(
          (sum, c) => sum + c.features.length,
          0,
        );

        await callback({
          text: `📊 **Feature Store (${totalFeatures}+ features per decision)**

${categories.map((c) => `**${c.category}:** ${c.features.join(", ")}`).join("\n\n")}

**Storage:**
• JSONL: \`.elizadb/vince-paper-bot/features/\` (always)
• Postgres: \`plugin_vince.paper_bot_features\` (when DB available)
• Supabase: \`vince_paper_bot_features\` (when keys set)

**Avoided Decisions:**
Records no-trade evaluations with same features but \`avoided: { reason }\` — keeps learning on quiet days.

**Training:**
• Min 90 closed trades
• Run \`train_models.py\` → ONNX export
• Models in \`.elizadb/vince-paper-bot/models/\` or Supabase bucket`,
        });
        return { success: true };
      }

      // ML/ONNX query
      if (
        lower.includes("ml") ||
        lower.includes("onnx") ||
        lower.includes("training")
      ) {
        const models = getMLModels();

        await callback({
          text: `🤖 **ML Pipeline (ONNX)**

**Models:**
${models.map((m) => `• **${m.name}:** ${m.purpose}\n  Inputs: ${m.inputs.join(", ")}\n  Output: ${m.output}`).join("\n\n")}

**Training Flow:**
1. Collect 90+ closed trades (VINCE_PAPER_AGGRESSIVE=true speeds this up)
2. TRAIN_ONNX_WHEN_READY task runs automatically
3. \`train_models.py\` exports 4 ONNX models
4. Upload to Supabase \`vince-ml-models\` bucket
5. ML service reloads without redeploy

**Improvement Weights:**
After training, run \`run-improvement-weights.ts\` to tune source weights from feature importance.

**Key Env:**
\`\`\`
VINCE_PAPER_AGGRESSIVE=true  # Faster data collection
VINCE_PAPER_ASSETS=BTC       # Focus one asset
SUPABASE_SERVICE_ROLE_KEY=...  # Persist features
\`\`\``,
        });
        return { success: true };
      }

      // Hypersurface/options query
      if (
        lower.includes("hypersurface") ||
        lower.includes("options strategy") ||
        lower.includes("strike")
      ) {
        const assets = getHypersurfaceAssets();
        const ritual = getStrikeRitualSteps();

        await callback({
          text: `🎯 **Hypersurface Options (Solus's Lane)**

**Assets (Friday 08:00 UTC expiry):**
${assets.map((a) => `• **${a.ticker}:** ${a.strategies.join(", ")}`).join("\n")}

**Strategies:**
• **Covered Call:** Own asset → sell call → earn premium
• **Secured Put:** Hold stables → sell put → earn premium
• **Wheel:** Calls → if assigned, puts → repeat

**Strike Ritual:**
${ritual.map((s) => `${s.step}. ${s.actor}: ${s.action}`).join("\n")}

**Key Points:**
• Early exercise possible ~24h before (Thursday night matters)
• Target ~20-35% assignment probability
• $3K/week minimum target
• Invalidation = what changes your mind

*Solus owns Hypersurface. VINCE provides IV/data.*`,
        });
        return { success: true };
      }

      // EV framework query
      if (lower.includes("ev framework") || lower.includes("expected value")) {
        const example: EVScenario[] = [
          { name: "Bull", probability: 0.3, return_pct: 150 },
          { name: "Base", probability: 0.45, return_pct: 20 },
          { name: "Bear", probability: 0.25, return_pct: -60 },
        ];

        await callback({
          text: `📈 **EV Framework (Solus)**

**Every recommendation needs:**
• Bull scenario: probability × return
• Base scenario: probability × return
• Bear scenario: probability × return
• EV = Σ(probability × return)

**Example:**
${formatEV("BTC", 105000, example)}

**Calibration:**
• Track which scenario played out
• Adjust probabilities based on track record
• Category win rates inform new recommendations
• Overweighting bull case is the common mistake

**Memory Files (North Star):**
• \`recommendations.jsonl\` — full lifecycle of every recommendation
• \`track_record.json\` — wins, losses, EV calibration
• \`patterns.json\` — signal reliability, regime history`,
        });
        return { success: true };
      }

      // Data pipeline query
      if (lower.includes("data pipeline") || lower.includes("data flow")) {
        const overview = getDataPipelineOverview();
        await callback({ text: overview });
        return { success: true };
      }

      // Improvements query
      if (lower.includes("improve") || lower.includes("suggestion")) {
        const paperImprovements = getPaperTradingImprovements();
        const solusImprovements = getSolusImprovements();
        const health = checkPaperTradingHealth();

        let response = `🔧 **Trading System Improvements**\n\n`;

        if (health.issues.length > 0) {
          response += `**⚠️ Current Issues:**\n${health.issues.map((i) => `• ${i}`).join("\n")}\n\n`;
        }

        response += `**Paper Trading Bot (VINCE):**\n${paperImprovements
          .slice(0, 5)
          .map((i, n) => `${n + 1}. ${i}`)
          .join("\n")}\n\n`;
        response += `**Options Strategy (Solus):**\n${solusImprovements
          .slice(0, 5)
          .map((i, n) => `${n + 1}. ${i}`)
          .join("\n")}\n\n`;

        if (health.suggestions.length > 0) {
          response += `**Quick Wins:**\n${health.suggestions.map((s) => `• ${s}`).join("\n")}`;
        }

        const out1 = "Here's the trading intel—\n\n" + response;
        await callback({ text: out1 });
        return { success: true };
      }

      // General overview
      const paperOverview = getPaperTradingOverview();
      const solusOverview = getSolusOverview();
      const health = checkPaperTradingHealth();

      let response = `📊 **Trading Intelligence Overview**\n\n`;
      response += `**VINCE (Perps on Hyperliquid):**\n`;
      response += `• ${getSignalSources().length} signal sources in aggregator\n`;
      response += `• 50+ features per decision in feature store\n`;
      response += `• ${getMLModels().length} ONNX models (signal quality, sizing, TP, SL)\n\n`;

      response += `**Solus (Options on Hypersurface):**\n`;
      response += `• ${getHypersurfaceAssets().length} assets (HYPE, SOL, WBTC, ETH)\n`;
      response += `• Friday 08:00 UTC weekly expiry\n`;
      response += `• EV framework with three scenarios\n\n`;

      if (health.issues.length > 0) {
        response += `**⚠️ Issues:**\n${health.issues
          .slice(0, 3)
          .map((i) => `• ${i}`)
          .join("\n")}\n\n`;
      }

      response += `---\n*Ask about: "signal sources", "feature store", "ml training", "hypersurface", "ev framework", "improve the algo"*`;

      const out = "Here's the trading intel—\n\n" + response;
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_TRADING_INTEL] Failed:", error);
      await callback({
        text: "Failed to provide trading intelligence. Check SIGNAL_SOURCES.md and FEATURE-STORE.md for documentation.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "Tell me about the signal sources in the paper trading bot",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "📡 **Signal Aggregator (20 sources)**\n\n**Free Sources:**\n• CoinGlass (1.0x): Funding, L/S, OI...\n\n**API Key Required:**\n• XSentiment (X_BEARER_TOKEN)...",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "How can we improve the algo?" } },
      {
        name: "{{agent}}",
        content: {
          text: "🔧 **Trading System Improvements**\n\n**Paper Trading Bot:**\n1. Add more signal sources\n2. Tune weights after 90+ trades\n...\n\n**Options Strategy:**\n1. Implement persistent memory\n2. Add EV calibration...",
        },
      },
    ],
  ],
};
