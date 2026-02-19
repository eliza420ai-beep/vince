/**
 * Improvement report → aggregator weights (THINGS TO DO #3).
 * Reads training_metadata.json (feature_importances, suggested_signal_factors),
 * logs top features and sources, and optionally aligns dynamicConfig source weights.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import {
  dynamicConfig,
  initializeDynamicConfig,
} from "../config/dynamicConfig";

const MODELS_DIRS = [
  "./.elizadb/vince-paper-bot/models",
  path.join(__dirname, "../../models"),
];

/** Feature name → aggregator source name (for signal_quality importance) */
const FEATURE_TO_SOURCE: Record<string, string> = {
  regime_bullish: "MarketRegime",
  regime_bearish: "MarketRegime",
  regime_volatility_high: "MarketRegime",
  signal_avg_sentiment: "NewsSentiment",
  news_nasdaqChange: "NewsSentiment",
  news_macro_risk_on: "NewsSentiment",
  news_macro_risk_off: "NewsSentiment",
  signal_hasWhaleSignal: "BinanceTopTraders",
  signal_hasFundingExtreme: "BinanceFundingExtreme",
  signal_hasOICap: "HyperliquidOICap",
  signal_hasCascadeSignal: "LiquidationCascade",
  market_longShortRatio: "CoinGlass",
  market_fundingPercentile: "CoinGlass",
  market_oiChange24h: "CoinGlass",
  market_fundingDelta: "CoinGlass",
  market_priceChange24h: "MarketRegime",
  market_volumeRatio: "CoinGlass",
  news_etfFlowBtc: "NewsSentiment",
  news_etfFlowEth: "NewsSentiment",
  x_sentiment: "XSentiment",
  signal_xSentimentScore: "XSentiment",
  session_isOpenWindow: "_session",
};

export interface ImprovementReport {
  feature_importances?: {
    signal_quality?: {
      feature_importances?: Record<string, number>;
    };
  };
  suggested_signal_factors?: Array<{
    name: string;
    reason?: string;
    description?: string;
  }>;
  /** Holdout MAE / quantile loss / AUC per model (from train_models --holdout). */
  holdout_metrics?: Record<string, Record<string, number>>;
}

function findMetadataPath(): string | null {
  for (const dir of MODELS_DIRS) {
    const resolved = path.resolve(process.cwd(), dir);
    const file = path.join(resolved, "training_metadata.json");
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function loadImprovementReport(): ImprovementReport | null {
  const metaPath = findMetadataPath();
  if (!metaPath) return null;
  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    const meta = JSON.parse(raw) as { improvement_report?: ImprovementReport };
    return meta.improvement_report ?? null;
  } catch {
    return null;
  }
}

/**
 * Map signal_quality feature importances to aggregator source names and sum per source.
 * Exported for tests and scripts.
 */
export function sourceImportancesFromReport(
  report: ImprovementReport,
): Map<string, number> {
  const imp = report.feature_importances?.signal_quality?.feature_importances;
  if (!imp || typeof imp !== "object") return new Map();

  const bySource = new Map<string, number>();
  for (const [featureName, importance] of Object.entries(imp)) {
    const source = FEATURE_TO_SOURCE[featureName];
    if (source && source !== "_session") {
      const v = bySource.get(source) ?? 0;
      bySource.set(source, v + importance);
    }
  }
  return bySource;
}

/**
 * Log top feature names, top sources by importance, and suggested_signal_factors.
 * Optionally align dynamicConfig source weights with importances (when applyWeights is true).
 */
export async function logAndApplyImprovementReportWeights(
  applyWeights: boolean,
): Promise<void> {
  await initializeDynamicConfig();

  const report = loadImprovementReport();
  if (!report) {
    logger.debug(
      "[ImprovementReport] No training_metadata.json found; skipping.",
    );
    return;
  }

  const imp = report.feature_importances?.signal_quality?.feature_importances;
  if (imp && typeof imp === "object") {
    const entries = Object.entries(imp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    logger.info(
      "[ImprovementReport] Top signal_quality features: " +
        entries.map(([n, v]) => `${n}=${(v * 100).toFixed(2)}%`).join(", "),
    );
  }

  const bySource = sourceImportancesFromReport(report);
  if (bySource.size > 0) {
    const sorted = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    logger.info(
      "[ImprovementReport] Source importance (from features): " +
        sorted
          .map(
            ([s, v]) =>
              `${s}=${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%`,
          )
          .join(", "),
    );

    if (applyWeights && sorted.length > 0) {
      const maxImportance = sorted[0][1];
      for (const [source, importance] of sorted) {
        const current = dynamicConfig.getSourceWeight(source);
        if (current === 0) continue; // Don't re-enable disabled sources
        const ratio = maxImportance > 0 ? importance / maxImportance : 0;
        const suggested = Math.max(
          0.5,
          Math.min(2.0, current * (0.85 + 0.3 * ratio)),
        );
        if (Math.abs(suggested - current) > 0.05) {
          await dynamicConfig.updateSourceWeight(
            source,
            suggested,
            "Improvement report alignment (feature_importances)",
          );
        }
      }
    }
  }

  const suggested = report.suggested_signal_factors;
  if (suggested && suggested.length > 0) {
    logger.info(
      "[ImprovementReport] Suggested signal factors (populate next): " +
        suggested.map((f) => f.name).join(", "),
    );
  }

  const holdout = report.holdout_metrics;
  if (holdout && typeof holdout === "object") {
    const parts = Object.entries(holdout).map(([model, metrics]) => {
      const m = Object.entries(metrics as Record<string, number>)
        .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(4) : v}`)
        .join(", ");
      return `${model}: ${m}`;
    });
    logger.info(
      "[ImprovementReport] Holdout metrics (drift/sizing): " +
        parts.join(" | "),
    );
  }
}
