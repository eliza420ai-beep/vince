import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  logger,
} from "@elizaos/core";
import { initXClientFromEnv } from "../services/xClient.service";
import { getXSearchService } from "../services/xSearch.service";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { sendActionResponse } from "./helpers/actionResponse";
import {
  dedupeByText,
  formatTradingSignalBlock,
  inferTradingSignalFromTexts,
} from "./helpers/signalScoring";

interface BtcLongTermSignalPayload {
  schemaVersion: 1;
  asset: "BTC";
  lookbackHours: number;
  sampleSize: number;
  directionBias: "bullish" | "bearish" | "mixed";
  confidence: number;
  targets: {
    floor: number | null;
    median: number | null;
    tail: number | null;
  };
  cueCounts: {
    bullish: number;
    bearish: number;
  };
}

const LONG_HORIZON_TERMS = [
  "long term",
  "long-term",
  "12 month",
  "12m",
  "next year",
  "year end",
  "cycle top",
  "cycle low",
  "2026",
  "2027",
];

const PREDICTION_TERMS = [
  "target",
  "prediction",
  "forecast",
  "base case",
  "bull case",
  "bear case",
  "price objective",
];

const BULLISH_CUES = [
  "bullish",
  "higher",
  "upside",
  "breakout",
  "accumulation",
  "new ath",
  "melt up",
];

const BEARISH_CUES = [
  "bearish",
  "lower",
  "downside",
  "distribution",
  "rejection",
  "drawdown",
  "capitulation",
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function parseTargetValues(text: string): number[] {
  const out: number[] = [];
  const normalized = text.toLowerCase();

  const compactRegex = /\$?\s*(\d{2,4}(?:\.\d+)?)\s*([km])/gi;
  for (const match of normalized.matchAll(compactRegex)) {
    const raw = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(raw)) continue;
    const value = unit === "m" ? raw * 1_000_000 : raw * 1_000;
    if (value >= 30_000 && value <= 2_000_000) out.push(Math.round(value));
  }

  const plainRegex = /\$?\s*(\d{5,7})(?!\d)/g;
  for (const match of normalized.matchAll(plainRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    if (value >= 30_000 && value <= 2_000_000) out.push(Math.round(value));
  }

  return out;
}

function percentile(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((pct / 100) * (sorted.length - 1))),
  );
  return sorted[idx] ?? null;
}

function summarizeTargets(targets: number[]): {
  low: number | null;
  median: number | null;
  high: number | null;
} {
  return {
    low: percentile(targets, 20),
    median: percentile(targets, 50),
    high: percentile(targets, 80),
  };
}

function formatUsd(value: number | null): string {
  if (!value) return "n/a";
  return `$${Math.round(value / 1000)}k`;
}

function cueCount(texts: string[], cues: string[]): number {
  return texts.reduce((sum, text) => {
    const lowered = text.toLowerCase();
    const hits = cues.filter((cue) => lowered.includes(cue)).length;
    return sum + hits;
  }, 0);
}

async function generateNarrative(
  runtime: IAgentRuntime,
  context: string,
): Promise<string | null> {
  const prompt = `You are ECHO. Write a short long-horizon BTC sentiment read for a trader.

Context:
${context}

Write 130-180 words and include:
1) the market's long-term BTC bias,
2) base case and tails (bull/bear),
3) one invalidation condition that would force a view change.

Be direct and practical. No bullet list. No disclaimers.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Return only the narrative text.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = String(response).trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ err: error }, "[X_BTC_LONG_TERM_SENTIMENT] narrative failed");
    return null;
  }
}

export const xBtcLongTermSentimentAction: Action = {
  name: "X_BTC_LONG_TERM_SENTIMENT",
  description:
    "Get long-term BTC price-prediction sentiment from X with base/bull/bear framing.",
  similes: [
    "BTC_LONG_TERM_SENTIMENT",
    "BTC_CYCLE_SENTIMENT",
    "BTC_YEAR_END_TARGETS",
  ],
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Give me BTC long-term sentiment and price targets." },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "₿ **BTC Long-Term Sentiment**\n\nLong-horizon CT stays net bullish with higher target dispersion. Base case clusters around $120k-$140k, while bull tails still call for new ATH extension into 2026.\n\n**Target Range (X consensus):**\n- Bear-ish floor: $90k\n- Base case median: $130k\n- Bull-ish tail: $180k\n\n**Invalidation focus:** sustained macro risk-off + ETF flow deterioration.\n\n**Trading Signal:**\n- directionBias: long\n- confidence: 67\n- freshnessWindow: 7d\n- topCatalysts: BTC, macro\n- invalidationHint: Invalidates on failed follow-through and sustained lower-high structure.",
          action: "X_BTC_LONG_TERM_SENTIMENT",
        },
      },
    ],
  ],
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = normalizeWhitespace(
      (message.content?.text ?? "").toLowerCase(),
    );
    const hasBtc = /\bbtc\b|bitcoin/.test(text);
    if (!hasBtc) return false;
    const hasLongHorizon = includesAny(text, LONG_HORIZON_TERMS);
    const hasPrediction = includesAny(text, PREDICTION_TERMS);
    return hasLongHorizon || hasPrediction;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    try {
      initXClientFromEnv(runtime);
      const searchService = getXSearchService();

      const [topicTweets, predictionTweets] = await Promise.all([
        searchService.searchTopic("btc", {
          maxResults: 120,
          hoursBack: 24 * 7,
          sortOrder: "relevancy",
        }),
        searchService.searchQuery({
          query:
            '(bitcoin OR BTC) ("year end" OR "12 month" OR "next year" OR "cycle top" OR target OR forecast)',
          maxResults: 80,
          maxPages: 2,
          hoursBack: 24 * 7,
          sortOrder: "relevancy",
        }),
      ]);

      const combined = dedupeByText([
        ...predictionTweets,
        ...topicTweets,
      ]).slice(0, 200);
      if (combined.length === 0) {
        await sendActionResponse(callback, "X_BTC_LONG_TERM_SENTIMENT", {
          text: "₿ **BTC Long-Term Sentiment**\n\nNo recent long-horizon BTC prediction posts found (reason: no_recent_data).",
        });
        return { success: true };
      }

      const longHorizonTexts = combined
        .map((tweet) => tweet.text)
        .filter((text) => {
          const lowered = text.toLowerCase();
          return (
            /\bbtc\b|bitcoin/.test(lowered) &&
            (includesAny(lowered, LONG_HORIZON_TERMS) ||
              includesAny(lowered, PREDICTION_TERMS))
          );
        });

      const sourceTexts =
        longHorizonTexts.length > 0
          ? longHorizonTexts
          : combined.slice(0, 80).map((tweet) => tweet.text);

      const parsedTargets = sourceTexts.flatMap(parseTargetValues);
      const targetSummary = summarizeTargets(parsedTargets);
      const bullishCueHits = cueCount(sourceTexts, BULLISH_CUES);
      const bearishCueHits = cueCount(sourceTexts, BEARISH_CUES);

      const directionBias =
        bullishCueHits > bearishCueHits
          ? "bullish"
          : bearishCueHits > bullishCueHits
            ? "bearish"
            : "mixed";
      const confidence = Math.max(
        35,
        Math.min(
          85,
          45 + Math.min(20, Math.abs(bullishCueHits - bearishCueHits) * 2),
        ),
      );

      const context = [
        `Sample size: ${sourceTexts.length} posts (7d window)`,
        `Bias cues: bullish=${bullishCueHits}, bearish=${bearishCueHits}`,
        `Direction: ${directionBias}`,
        `Targets parsed: ${parsedTargets.length}`,
        `Target floor (20p): ${formatUsd(targetSummary.low)}`,
        `Target median (50p): ${formatUsd(targetSummary.median)}`,
        `Target tail (80p): ${formatUsd(targetSummary.high)}`,
        "Required invalidation lens: ETF flows, macro risk-off regime, and trend-structure failure.",
      ].join("\n");

      const narrative = await generateNarrative(runtime, context);
      const signal = inferTradingSignalFromTexts(sourceTexts.slice(0, 120), 7);

      const header = `₿ **BTC Long-Term Sentiment**\n\n`;
      const targetBlock = [
        "**Target Range (X consensus):**",
        `- Bear-ish floor: ${formatUsd(targetSummary.low)}`,
        `- Base case median: ${formatUsd(targetSummary.median)}`,
        `- Bull-ish tail: ${formatUsd(targetSummary.high)}`,
        "",
        `**Bias read:** ${directionBias} | confidence: ${confidence}%`,
      ].join("\n");

      const response = narrative
        ? `${header}${narrative}\n\n${targetBlock}\n\n${formatTradingSignalBlock(signal)}`
        : `${header}${targetBlock}\n\n${formatTradingSignalBlock(signal)}`;

      const btcLongTermSignal: BtcLongTermSignalPayload = {
        schemaVersion: 1,
        asset: "BTC",
        lookbackHours: 24 * 7,
        sampleSize: sourceTexts.length,
        directionBias,
        confidence,
        targets: {
          floor: targetSummary.low,
          median: targetSummary.median,
          tail: targetSummary.high,
        },
        cueCounts: {
          bullish: bullishCueHits,
          bearish: bearishCueHits,
        },
      };

      await sendActionResponse(callback, "X_BTC_LONG_TERM_SENTIMENT", {
        text: response,
        btcLongTermSignal,
      });

      return { success: true };
    } catch (error) {
      logger.warn({ err: error }, "[X_BTC_LONG_TERM_SENTIMENT] Error");
      await sendActionResponse(callback, "X_BTC_LONG_TERM_SENTIMENT", {
        text: `₿ **BTC Long-Term Sentiment**\n\n⚠️ Could not complete long-term BTC sentiment check (reason: api_limited).`,
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default xBtcLongTermSentimentAction;
