/**
 * ECHO What's the Trade — Daily Task
 *
 * Belief-router style report: one thesis (vibe-friendly), live adapters from
 * the whats-the-trade skill (Kalshi, Robinhood, Hyperliquid), then one
 * ALOHA-style narrative. Fits ECHO's lane: sentiment/vibe → one trade expression.
 *
 * Thesis derivation:
 * - Default (generic): suggestThesis() — LLM suggests one tradeable thesis with asymmetry (no X data).
 * - X-driven (ECHO_WTT_X_DRIVEN=true): fetchCtNarrativeForWtt() → suggestThesisFromX() — CT narrative from X search, then LLM turns it into one thesis.
 *
 * Output: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.md
 * Sidecar: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json (for paper bot).
 *
 * Set ECHO_WHATS_THE_TRADE_ENABLED=false to disable.
 * Set ECHO_WHATS_THE_TRADE_HOUR=9 (UTC) to run at 9:00 UTC (default).
 * Set ECHO_WTT_X_DRIVEN=true to derive thesis from X (Crypto Twitter) research.
 * Skill path: WHATS_THE_TRADE_SKILL_DIR or cwd/skills/whats-the-trade
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { initXClientFromEnv } from "../services/xClient.service";
import { getXSearchService } from "../services/xSearch.service";
import { ALL_TOPICS } from "../constants/topics";
import { getMandoContextForX } from "../utils/mandoContext";
import { getPolymarketContextForWtt } from "../utils/polymarketContext";
import {
  HIP3_STOCKS,
  WTT_UNIVERSE_LABEL,
  WTT_UNIVERSE_TICKERS,
} from "../../../plugin-vince/src/constants/targetAssets";

/** Comma-separated HIP-3 stocks for Robinhood adapter (offchain context). */
const ROBINHOOD_HIP3_TICKERS = (HIP3_STOCKS as readonly string[]).join(",");

/** Check if a WTT ticker is in the onchain-tradeable universe (core + HIP-3). */
function isWttUniverseTicker(ticker: string): boolean {
  return (WTT_UNIVERSE_TICKERS as readonly string[]).includes(
    ticker.trim().toUpperCase(),
  );
}

/** Structured pick for paper bot and ML (saved as JSON sidecar). */
/** Catalyst source tags for feedback: which inputs drove this thesis (headlines, CT, polymarket, or generic). */
export type WttCatalystSource = "headlines" | "ct" | "polymarket" | "generic";

export interface WttPick {
  date: string;
  thesis: string;
  primaryTicker: string;
  primaryDirection: "long" | "short";
  primaryInstrument: string;
  primaryEntryPrice: number;
  primaryRiskUsd: number;
  invalidateCondition: string;
  altTicker?: string;
  altDirection?: "long" | "short";
  altInstrument?: string;
  rubric: {
    alignment: "direct" | "pure_play" | "exposed" | "partial" | "tangential";
    edge: "undiscovered" | "emerging" | "consensus" | "crowded";
    payoffShape: "max_asymmetry" | "high" | "moderate" | "linear" | "capped";
    timingForgiveness:
      | "very_forgiving"
      | "forgiving"
      | "punishing"
      | "very_punishing";
  };
  evThresholdPct?: number;
  killConditions: string[];
  /** Which inputs drove this thesis; used for WTT performance by catalyst (e.g. headline-driven vs CT-driven). */
  catalystSources?: WttCatalystSource[];
}

const DEFAULT_HOUR_UTC = 9;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const SCRIPT_TIMEOUT_MS = 25_000;

function getSkillDir(): string {
  const envDir = process.env.WHATS_THE_TRADE_SKILL_DIR?.trim();
  if (envDir)
    return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
  return path.join(process.cwd(), "skills", "whats-the-trade");
}

function getOutputDir(): string {
  const base = process.env.STANDUP_DELIVERABLES_DIR?.trim()
    ? path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR)
    : path.join(process.cwd(), "docs", "standup");
  return path.join(base, "whats-the-trade");
}

function getOutputPath(date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return path.join(getOutputDir(), `${dateStr}-whats-the-trade.md`);
}

function getOutputPathJson(date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return path.join(getOutputDir(), `${dateStr}-whats-the-trade.json`);
}

/** Signals dir for EchoXSignal (paper bot): STANDUP_DELIVERABLES_DIR/signals or docs/standup/signals. */
function getEchoXSignalsDir(): string {
  const base = process.env.STANDUP_DELIVERABLES_DIR?.trim()
    ? path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR)
    : path.join(process.cwd(), "docs", "standup");
  return path.join(base, "signals");
}

/** Path for EchoXSignal file read by plugin-vince aggregator. */
function getEchoXSignalsPath(date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return path.join(getEchoXSignalsDir(), `${dateStr}-echo-x.json`);
}

/** EchoXSignal entry for paper bot aggregator (same-day file). */
export interface EchoXSignalEntry {
  asset: string;
  direction: "long" | "short" | "neutral";
  confidence?: number;
}

/** Write EchoXSignal file for aggregator (EchoXSignal source). */
async function saveEchoXSignalsFile(
  pick: WttPick | null,
  date: Date,
): Promise<void> {
  if (!pick) return;
  const signals: EchoXSignalEntry[] = [
    {
      asset: pick.primaryTicker,
      direction: pick.primaryDirection,
      confidence: 60,
    },
  ];
  if (pick.altTicker && pick.altDirection) {
    signals.push({
      asset: pick.altTicker,
      direction: pick.altDirection,
      confidence: 50,
    });
  }
  try {
    const dir = getEchoXSignalsDir();
    await fs.mkdir(dir, { recursive: true });
    const filepath = getEchoXSignalsPath(date);
    await fs.writeFile(
      filepath,
      JSON.stringify(
        { date: date.toISOString().slice(0, 10), signals },
        null,
        2,
      ),
      "utf-8",
    );
    logger.debug("[ECHO WhatstheTrade] Wrote EchoXSignal file " + filepath);
  } catch (err) {
    logger.warn(
      { err },
      "[ECHO WhatstheTrade] Failed to write EchoXSignal file",
    );
  }
}

/** Number of recent WTT days to consider for rotation hint. */
const RECENT_WTT_DAYS = 7;
/** If this ticker was primary in >= this many of the last RECENT_WTT_DAYS, we add a rotation nudge. */
const ROTATION_NUDGE_THRESHOLD = 3;

/**
 * Read recent WTT JSON sidecars and return primary tickers (most recent first).
 * Used to nudge the model away from repeating the same pick when it has dominated lately.
 */
async function getRecentWttPrimaryTickers(
  excludeDateStr: string,
  lastNDays: number,
): Promise<string[]> {
  const dir = getOutputDir();
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const jsonFiles = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith("-whats-the-trade.json") &&
          /^\d{4}-\d{2}-\d{2}-whats-the-trade\.json$/.test(e.name),
      )
      .map((e) => e.name.replace(/-whats-the-trade\.json$/, ""));
    const sorted = jsonFiles
      .filter((d) => d !== excludeDateStr)
      .sort()
      .reverse()
      .slice(0, lastNDays);
    const tickers: string[] = [];
    for (const dateStr of sorted) {
      const filepath = path.join(dir, `${dateStr}-whats-the-trade.json`);
      try {
        const raw = await fs.readFile(filepath, "utf-8");
        const data = JSON.parse(raw) as { primaryTicker?: string };
        if (data.primaryTicker && typeof data.primaryTicker === "string") {
          tickers.push(data.primaryTicker.trim().toUpperCase());
        }
      } catch {
        // skip unreadable or invalid JSON
      }
    }
    return tickers;
  } catch {
    return [];
  }
}

/**
 * If the same ticker dominated recent WTT picks, return a sentence to append to the thesis prompt.
 */
function buildRotationHint(recentTickers: string[]): string {
  if (recentTickers.length < ROTATION_NUDGE_THRESHOLD) return "";
  const counts = new Map<string, number>();
  for (const t of recentTickers) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const [topTicker, count] = [...counts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] ?? [null, 0];
  if (
    topTicker &&
    count >= ROTATION_NUDGE_THRESHOLD &&
    count >= Math.ceil(recentTickers.length / 2)
  ) {
    return ` Recent WTT primary picks (last ${recentTickers.length} days): ${recentTickers.join(", ")}. Prefer a different asset today unless the thesis strongly warrants repeating ${topTicker}.`;
  }
  return "";
}

function runBunScript(
  skillDir: string,
  scriptPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; json: unknown }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", scriptPath, ...args], {
      cwd: skillDir,
      timeout: SCRIPT_TIMEOUT_MS,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      const json = jsonMatch
        ? (() => {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch {
              return null;
            }
          })()
        : null;
      if (code !== 0 && !json) {
        reject(new Error(`Script exited ${code}: ${stderr.slice(0, 200)}`));
      } else {
        resolve({ stdout, stderr, json: json ?? {} });
      }
    });
  });
}

/**
 * Build a short news-context block for the thesis prompt from MandoMinutes headlines.
 * When a headline clearly implies a trade (e.g. "OpenAI wins US government AI deal"), the model can use it.
 */
function buildNewsContextBlock(newsContext: string | null): string {
  if (!newsContext || !newsContext.trim()) return "";
  return `\n\nToday's top headlines (use if one suggests a clear trade—e.g. company wins contract, regulatory deal, sector catalyst):\n${newsContext.trim()}\nIf one of these suggests a trade, prefer that thesis and name the asset.`;
}

/** Build a short block for Polymarket odds so the model can reinforce or contrast the thesis with prediction markets. */
function buildPolymarketContextBlock(polymarketContext: string | null): string {
  if (!polymarketContext || !polymarketContext.trim()) return "";
  return `\n\n${polymarketContext.trim()}\nUse if relevant to your thesis (e.g. odds support or contradict the narrative).`;
}

/** Chris Camillo / social-arbitrage lens for thesis: information imbalance, meaningful behavioral shift, pure play. */
const CAMILLO_LENS_THESIS =
  "\n\nApply a social-arbitrage lens: the edge is seeing a meaningful behavioral or social signal (real-world, headlines, or CT) before the market has fully priced it. Prefer theses that name a concrete information imbalance (what you see that may not yet be in the price). Prefer the clearest expression (pure play) of that thesis.";

/** Chris Camillo lens for narrative: thesis validity over price; invalidation = thesis broken or info priced in. */
const CAMILLO_LENS_NARRATIVE = `
Apply a social-arbitrage lens: the edge is being early on a behavioral/social signal before it's universal. Invalidation should reflect thesis failure or "info now priced in" (e.g. earnings confirmed the trend, headline is consensus), not only a price level. Prefer the pure-play expression of the thesis.`;

function buildCamilloLens(
  camilloStyle: boolean,
  forNarrative: boolean,
): string {
  if (!camilloStyle) return "";
  return forNarrative ? CAMILLO_LENS_NARRATIVE : CAMILLO_LENS_THESIS;
}

/** WTT universe tickers we can mention in extremity hint (core + common HIP-3). */
const EXTREMITY_HINT_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "HYPE",
  "NVDA",
  "TSLA",
  "MAG7",
  "PLTR",
  "COIN",
  "HOOD",
];

/**
 * If the CT narrative suggests very bullish or very bearish sentiment on an asset,
 * return a one-line nudge to consider fading the crowd. Otherwise return "".
 */
function buildSentimentExtremityHint(xNarrative: string): string {
  if (!xNarrative?.trim()) return "";
  const lower = xNarrative.toLowerCase();
  const extremeBull =
    /\b(extremely|very|overwhelmingly|max|everyone)\s*(bullish|long|greed|euphor|optimistic)|crowded\s+long|everyone\s+is\s+long|max\s+greed/i.test(
      lower,
    );
  const extremeBear =
    /\b(extremely|very|overwhelmingly|max|everyone)\s*(bearish|short|fear|capitul|pessimistic)|crowded\s+short|everyone\s+is\s+short|max\s+fear/i.test(
      lower,
    );
  if (!extremeBull && !extremeBear) return "";
  const assetMatch = EXTREMITY_HINT_TICKERS.find(
    (t) =>
      lower.includes(t.toLowerCase()) ||
      lower.includes(t.toLowerCase() + " ") ||
      lower.includes(" " + t.toLowerCase()),
  );
  const asset = assetMatch ?? "one asset";
  return ` Sentiment is extreme on ${asset}; consider whether the edge is to fade the crowd.`;
}

/**
 * Thesis is derived from a generic LLM suggestion (no X data injected yet).
 * When X-driven thesis is enabled, suggestThesisFromX() can use X_PULSE or a dedicated X scan.
 * Uses recent WTT primary tickers to nudge away from repeating the same pick when it dominated lately.
 * Optional newsContext (MandoMinutes headlines) lets the model catch headline-driven catalysts (e.g. OpenAI government deal).
 * Optional camilloStyle injects a social-arbitrage lens (information imbalance, pure play, meaningful behavioral signal).
 */
async function suggestThesis(
  runtime: IAgentRuntime,
  dateStr: string,
  hip3Only: boolean,
  newsContext: string | null = null,
  camilloStyle = false,
  polymarketContext: string | null = null,
): Promise<string> {
  const rotationTickers = await getRecentWttPrimaryTickers(
    dateStr,
    RECENT_WTT_DAYS,
  );
  const rotationHint = buildRotationHint(rotationTickers);
  const newsBlock = buildNewsContextBlock(newsContext);
  const polymarketBlock = buildPolymarketContextBlock(polymarketContext);
  const camilloBlock = buildCamilloLens(camilloStyle, false);

  const base = `Today is ${dateStr}. Suggest exactly one short tradeable thesis (one sentence) that states a clear mispricing or asymmetry—e.g. one segment priced wrong vs another, or relative strength the market hasn't fully priced. Rotate across asset classes: crypto, stocks, commodities, indices. Do not default to the same ticker every day. Examples: "SOL outperforms ETH on relative strength this week", "Silver breaks out on industrial demand while gold stalls", "GOOGL trades at a discount to MAG7 on AI capex fears", "Commodities outperform indices on supply disruption", "One sector is mispriced vs another (name the segment)". Do not give generic sentiment ("CT is bullish"); name the specific asymmetry.`;
  const constraint = hip3Only
    ? ` The trade MUST be expressible onchain via a Hyperliquid perp. Available tickers: ${WTT_UNIVERSE_LABEL}. Pick a thesis that maps to one of these assets.`
    : "";
  const prompt =
    base +
    constraint +
    newsBlock +
    polymarketBlock +
    camilloBlock +
    rotationHint +
    " Reply with only that one sentence, no quotes or preamble.";
  try {
    const out = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      maxTokens: 80,
    });
    return String(out)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch (e) {
    logger.warn(
      "[ECHO WhatstheTrade] Thesis suggestion failed, using fallback",
    );
    return "Macro rotation creates relative-value opportunities across the Hyperliquid universe.";
  }
}

/**
 * Fetch a short CT narrative from X for use as thesis context.
 * Used when ECHO_WTT_X_DRIVEN=true to derive thesis from live X research.
 * Returns null if X client or search fails (caller falls back to generic suggestThesis).
 */
async function fetchCtNarrativeForWtt(
  runtime: IAgentRuntime,
): Promise<string | null> {
  try {
    initXClientFromEnv(runtime);
    const searchService = getXSearchService();
    const highPriorityIds = ALL_TOPICS.filter((t) => t.priority === "high")
      .map((t) => t.id)
      .slice(0, 2);
    const topicResults = await searchService.searchMultipleTopics({
      topicsIds: highPriorityIds,
      maxResultsPerTopic: 15,
      cacheTtlMs: 5 * 60 * 1000,
      quick: true,
    });
    const allTweets = Array.from(topicResults.values()).flat();
    if (allTweets.length === 0) return null;
    const sample = allTweets
      .slice(0, 20)
      .map((t) => (t.text ?? "").slice(0, 200))
      .join("\n---\n");
    const out = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: `Below are recent Crypto Twitter posts. Summarize in 2–3 sentences what CT is saying about crypto or macro right now. If there is a clear narrative or asymmetry (e.g. one segment vs another), mention it. No preamble.

Posts:
${sample}

Summary:`,
      maxTokens: 150,
    });
    const text = String(out).trim();
    return text.length > 0 ? text : null;
  } catch (e) {
    logger.debug(
      "[ECHO WhatstheTrade] X-driven narrative fetch failed: " +
        (e as Error).message,
    );
    return null;
  }
}

/**
 * Turn a CT narrative (from X) into one tradeable thesis with a clear asymmetry.
 * Use when ECHO_WTT_X_DRIVEN=true; thesis is then X-derived instead of generic.
 * Uses recent WTT primary tickers to nudge away from repeating the same pick when it dominated lately.
 * Optional newsContext (MandoMinutes headlines) lets the model catch headline-driven catalysts (e.g. OpenAI government deal).
 * Optional camilloStyle injects a social-arbitrage lens (information imbalance, pure play).
 */
async function suggestThesisFromX(
  runtime: IAgentRuntime,
  dateStr: string,
  xNarrative: string,
  hip3Only: boolean,
  newsContext: string | null = null,
  camilloStyle = false,
  polymarketContext: string | null = null,
): Promise<string> {
  const rotationTickers = await getRecentWttPrimaryTickers(
    dateStr,
    RECENT_WTT_DAYS,
  );
  const rotationHint = buildRotationHint(rotationTickers);
  const newsBlock = buildNewsContextBlock(newsContext);
  const polymarketBlock = buildPolymarketContextBlock(polymarketContext);
  const camilloBlock = buildCamilloLens(camilloStyle, false);
  const extremityHint = buildSentimentExtremityHint(xNarrative);

  const constraint = hip3Only
    ? ` The trade MUST be expressible as a Hyperliquid perp. Tickers: ${WTT_UNIVERSE_LABEL}.`
    : "";
  const prompt = `Today is ${dateStr}. Below is a short summary of what Crypto Twitter is saying.

CT summary:
${xNarrative}
${newsBlock}
${polymarketBlock}
${camilloBlock}

Turn this into exactly one tradeable thesis (one sentence) that states a clear mispricing or asymmetry—e.g. one segment priced wrong vs another, or a narrative the market hasn't fully priced. Do not give generic sentiment; name the specific asymmetry. Do not default to the same ticker every day. If today's headlines suggest a clear trade (e.g. company wins contract), prefer that. If CT is overwhelmingly one-sided (everyone bullish or everyone bearish on one thing), consider whether the edge is to fade the crowd rather than follow it.${extremityHint}${constraint}${rotationHint}

Reply with only that one sentence, no quotes or preamble.`;
  try {
    const out = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      maxTokens: 80,
    });
    return String(out)
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch (e) {
    logger.warn(
      "[ECHO WhatstheTrade] X-driven thesis suggestion failed, using fallback",
    );
    return "Macro rotation creates relative-value opportunities across the Hyperliquid universe.";
  }
}

async function fetchAdapterData(
  skillDir: string,
  thesis: string,
  hip3Only: boolean,
  rhEnabled: boolean,
): Promise<string> {
  const lines: string[] = [];
  const keywords = thesis.split(/\s+/).slice(0, 4).join(" ");

  // Kalshi: prediction market odds (useful context regardless of hip3Only)
  try {
    const kalshi = await runBunScript(
      skillDir,
      "scripts/adapters/kalshi/instruments.ts",
      [keywords],
    );
    if (
      kalshi.json &&
      typeof kalshi.json === "object" &&
      "instruments" in kalshi.json
    ) {
      const arr =
        (kalshi.json as { instruments?: unknown[] }).instruments ?? [];
      lines.push("=== KALSHI ===");
      arr.slice(0, 5).forEach((i: Record<string, unknown>) => {
        lines.push(
          `  ${i.ticker ?? i.title ?? ""}: ${i.yes_ask ?? i.lastPrice ?? ""}`,
        );
      });
    }
  } catch (e) {
    logger.debug(
      "[ECHO WhatstheTrade] Kalshi adapter skip: " + (e as Error).message,
    );
  }

  // Robinhood/Yahoo: offchain stock context (optional, labeled as context-only when hip3Only)
  if (rhEnabled) {
    try {
      const rh = await runBunScript(
        skillDir,
        "scripts/adapters/robinhood/instruments.ts",
        [ROBINHOOD_HIP3_TICKERS],
      );
      if (
        rh.json &&
        typeof rh.json === "object" &&
        "validated_instruments" in rh.json
      ) {
        const arr =
          (rh.json as { validated_instruments?: unknown[] })
            .validated_instruments ?? [];
        const label = hip3Only
          ? "\n=== ROBINHOOD (offchain context only — do NOT use as primary pick) ==="
          : "\n=== ROBINHOOD (sample) ===";
        lines.push(label);
        arr.slice(0, 14).forEach((i: Record<string, unknown>) => {
          lines.push(
            `  ${i.ticker ?? ""}: $${i.price ?? ""} (${i.day_change_pct ?? ""}%)`,
          );
        });
      }
    } catch (e) {
      logger.debug(
        "[ECHO WhatstheTrade] Robinhood adapter skip: " + (e as Error).message,
      );
    }
  }

  // Hyperliquid: full HIP-3 universe when hip3Only, otherwise 3 core tickers
  const hlTickers = hip3Only
    ? (WTT_UNIVERSE_TICKERS as readonly string[]).join(",")
    : "SOL,BTC,ETH";
  try {
    const hl = await runBunScript(
      skillDir,
      "scripts/adapters/hyperliquid/instruments.ts",
      [hlTickers],
    );
    if (
      hl.json &&
      typeof hl.json === "object" &&
      "validated_instruments" in hl.json
    ) {
      const arr =
        (hl.json as { validated_instruments?: unknown[] })
          .validated_instruments ?? [];
      const label = hip3Only
        ? "\n=== HYPERLIQUID (onchain tradeable — pick from these) ==="
        : "\n=== HYPERLIQUID ===";
      lines.push(label);
      arr.forEach((i: Record<string, unknown>) => {
        lines.push(
          `  ${i.ticker ?? ""}: $${i.mark_price ?? ""} funding ${i.funding_rate ?? ""}`,
        );
      });
    }
  } catch (e) {
    logger.debug(
      "[ECHO WhatstheTrade] Hyperliquid adapter skip: " + (e as Error).message,
    );
  }

  return lines.length > 0
    ? lines.join("\n")
    : "No live instrument data could be loaded.";
}

async function generateNarrative(
  runtime: IAgentRuntime,
  thesis: string,
  dataContext: string,
  dateLabel: string,
  hip3Only: boolean,
  camilloStyle = false,
): Promise<string> {
  const marketScope = hip3Only
    ? `you pick the single best onchain expression using Hyperliquid perps (HIP-3 assets and crypto: stocks, indices, commodities all trade as perps on Hyperliquid). Your PRIMARY pick ticker must be from the Hyperliquid universe. You may reference offchain context (Robinhood stocks, Kalshi odds) to support your reasoning, but the trade card ticker must be a Hyperliquid perp from: ${WTT_UNIVERSE_LABEL}.`
    : "you pick the single best expression across markets.";

  const instrumentOptions = hip3Only
    ? "one Hyperliquid perp"
    : "one instrument: stock, option, Kalshi contract, or perp";

  const instrumentLabel = hip3Only ? "perp" : "[INSTRUMENT]";
  const camilloBlock = buildCamilloLens(camilloStyle, true);

  const prompt = `You are ECHO, writing your daily "What's the trade" for ${dateLabel}. Vibe and sentiment lead; ${marketScope}

Today's thesis: ${thesis}

Live data from prediction markets, stocks, and perps:

${dataContext}
${camilloBlock}

Write a short narrative (150–250 words) that:
1. Names the asymmetry clearly (what is mispriced vs what, or which relative move) and states the single best way to express this thesis (${instrumentOptions}). Say why this expression beats the obvious play.
2. Weaves in specific numbers from the data above.
3. Includes the downside: what you risk and what would invalidate or kill the trade (one concrete condition).
4. Ends with one minimal trade card in this format (≤6 lines):

[TICKER] · ${instrumentLabel} · [DIRECTION]
[QTY] @ $[PRICE] · risk $[AMOUNT]
$[price]   [lose/gain]   [condition]
+EV above [X]% · dies if [condition]
Alt: [TICKER] $[price] [dir] (one sentence)

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write the narrative and card (no "Here is your report" wrapper):`;

  try {
    const out = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      maxTokens: 600,
      temperature: 0.6,
    });
    return String(out).trim();
  } catch (e) {
    logger.error("[ECHO WhatstheTrade] LLM failed: " + (e as Error).message);
    return "Couldn't generate the narrative today. Data was gathered but the write step failed.";
  }
}

const ALIGNMENT_VALUES: Set<string> = new Set([
  "direct",
  "pure_play",
  "exposed",
  "partial",
  "tangential",
]);
const EDGE_VALUES: Set<string> = new Set([
  "undiscovered",
  "emerging",
  "consensus",
  "crowded",
]);
const PAYOFF_VALUES: Set<string> = new Set([
  "max_asymmetry",
  "high",
  "moderate",
  "linear",
  "capped",
]);
const TIMING_VALUES: Set<string> = new Set([
  "very_forgiving",
  "forgiving",
  "punishing",
  "very_punishing",
]);

function safeRubricValue<K extends keyof WttPick["rubric"]>(
  value: unknown,
  key: K,
  defaultVal: WttPick["rubric"][K],
): WttPick["rubric"][K] {
  const s = String(value ?? "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  const set =
    key === "alignment"
      ? ALIGNMENT_VALUES
      : key === "edge"
        ? EDGE_VALUES
        : key === "payoffShape"
          ? PAYOFF_VALUES
          : TIMING_VALUES;
  return (set.has(s) ? s : defaultVal) as WttPick["rubric"][K];
}

async function extractStructuredPick(
  runtime: IAgentRuntime,
  thesis: string,
  narrative: string,
  dateStr: string,
  hip3Only: boolean,
): Promise<WttPick | null> {
  const tickerConstraint = hip3Only
    ? `primaryTicker MUST be one of: ${WTT_UNIVERSE_LABEL}. `
    : "";
  const instrumentConstraint = hip3Only
    ? `- primaryInstrument: "perp" (Hyperliquid perp — only valid value)`
    : `- primaryInstrument: one of "perp", "option", "kalshi", "stock"`;

  const prompt = `Extract the trade pick from this "What's the trade" narrative into JSON only. No other text.

Thesis: ${thesis}

Narrative (with trade card):
${narrative}

${tickerConstraint}Return a single JSON object with these exact keys (use null for missing numbers):
- date: "${dateStr}"
- thesis: (the one-line thesis string)
- primaryTicker: (e.g. "NVDA", "BTC", "SOL") 
- primaryDirection: "long" or "short"
${instrumentConstraint}
- primaryEntryPrice: number or null
- primaryRiskUsd: number or null
- invalidateCondition: string e.g. "BTC < 65k" or "above $180"
- altTicker: string or null
- altDirection: "long" or "short" or null
- altInstrument: string or null
- rubric: object with alignment (one of: direct, pure_play, exposed, partial, tangential), edge (undiscovered, emerging, consensus, crowded), payoffShape (max_asymmetry, high, moderate, linear, capped), timingForgiveness (very_forgiving, forgiving, punishing, very_punishing)
- evThresholdPct: number or null
- killConditions: array of strings from "dies if" conditions

Output only the JSON object, no markdown or explanation.`;

  try {
    const out = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 400,
      temperature: 0.2,
    });
    const text = String(out).trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[ECHO WhatstheTrade] No JSON in extraction response");
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const rubricRaw = parsed.rubric as Record<string, unknown> | undefined;
    const pick: WttPick = {
      date: String(parsed.date ?? dateStr),
      thesis: String(parsed.thesis ?? thesis),
      primaryTicker: String(parsed.primaryTicker ?? "")
        .trim()
        .toUpperCase(),
      primaryDirection: parsed.primaryDirection === "short" ? "short" : "long",
      primaryInstrument: String(parsed.primaryInstrument ?? "perp"),
      primaryEntryPrice: Number(parsed.primaryEntryPrice) || 0,
      primaryRiskUsd: Number(parsed.primaryRiskUsd) || 0,
      invalidateCondition: String(parsed.invalidateCondition ?? ""),
      killConditions: Array.isArray(parsed.killConditions)
        ? (parsed.killConditions as string[])
        : [],
      rubric: {
        alignment: safeRubricValue(
          rubricRaw?.alignment,
          "alignment",
          "partial",
        ),
        edge: safeRubricValue(rubricRaw?.edge, "edge", "consensus"),
        payoffShape: safeRubricValue(
          rubricRaw?.payoffShape,
          "payoffShape",
          "moderate",
        ),
        timingForgiveness: safeRubricValue(
          rubricRaw?.timingForgiveness,
          "timingForgiveness",
          "punishing",
        ),
      },
    };
    if (parsed.altTicker != null)
      pick.altTicker = String(parsed.altTicker).trim().toUpperCase();
    if (parsed.altDirection === "short" || parsed.altDirection === "long")
      pick.altDirection = parsed.altDirection;
    if (parsed.altInstrument != null)
      pick.altInstrument = String(parsed.altInstrument);
    if (
      typeof parsed.evThresholdPct === "number" &&
      !Number.isNaN(parsed.evThresholdPct)
    )
      pick.evThresholdPct = parsed.evThresholdPct;

    if (hip3Only && !isWttUniverseTicker(pick.primaryTicker)) {
      logger.warn(
        "[ECHO WhatstheTrade] primaryTicker not in WTT universe: " +
          pick.primaryTicker,
      );
      return null;
    }
    return pick;
  } catch (e) {
    logger.warn(
      "[ECHO WhatstheTrade] Structured pick extraction failed: " +
        (e as Error).message,
    );
    return null;
  }
}

/** Default rubric when we fall back to narrative parsing (paper bot still needs a valid pick). */
const FALLBACK_RUBRIC: WttPick["rubric"] = {
  alignment: "direct",
  edge: "emerging",
  payoffShape: "high",
  timingForgiveness: "forgiving",
};

/**
 * When LLM extraction fails, try to infer a minimal pick from the narrative
 * so the paper bot still gets a JSON (e.g. "xyz: GOOGL-PERP perp LONG" or "long GOOGL").
 */
function extractPickFromNarrativeFallback(
  narrative: string,
  thesis: string,
  dateStr: string,
): WttPick | null {
  const text = (narrative + "\n" + thesis).toLowerCase();
  let direction: "long" | "short" = "long";
  const shortMatch = text.match(
    /\bshort\s+(\w+)\b|(\w+)[-\s]perp\s+perp\s+short/i,
  );
  const longMatch = text.match(
    /\blong\s+(\w+)\b|(\w+)[-\s]perp\s+perp\s+long/i,
  );
  if (shortMatch) {
    direction = "short";
  }
  const tickerCandidates: string[] = [];
  for (const t of WTT_UNIVERSE_TICKERS) {
    const upper = t.toUpperCase();
    const re = new RegExp(
      `(?:^|[^a-z])${upper.replace(/-/g, "[-\s]?")}(?:-?perp|\\s|$|[^a-z])`,
      "i",
    );
    if (re.test(narrative) || re.test(thesis)) {
      tickerCandidates.push(upper);
    }
  }
  const perpLine = narrative.match(
    /(?:xyz|flx|vntl|km)?:?\s*([A-Z][A-Z0-9]+)(?:-PERP)?\s+perp\s+(LONG|SHORT)/i,
  );
  if (perpLine) {
    const ticker = perpLine[1].toUpperCase().replace(/-/g, "");
    if (isWttUniverseTicker(ticker)) {
      tickerCandidates.unshift(ticker);
    }
    if (perpLine[2].toUpperCase() === "SHORT") {
      direction = "short";
    }
  }
  const priceMatch = narrative.match(/\$\s*([\d,.]+)/);
  const entryPrice = priceMatch
    ? parseFloat(priceMatch[1].replace(/,/g, ""))
    : 0;
  const ticker = tickerCandidates[0];
  if (!ticker || !isWttUniverseTicker(ticker)) {
    return null;
  }
  logger.info(
    `[ECHO WhatstheTrade] Fallback pick: ${ticker} ${direction} (from narrative)`,
  );
  return {
    date: dateStr,
    thesis,
    primaryTicker: ticker,
    primaryDirection: direction,
    primaryInstrument: "perp",
    primaryEntryPrice: entryPrice,
    primaryRiskUsd: 0,
    invalidateCondition: "",
    killConditions: [],
    rubric: FALLBACK_RUBRIC,
  };
}

/**
 * Parse the saved WTT markdown to produce a minimal WttPick when LLM and narrative
 * fallback both failed. Tries (1) "TICKER · perp · LONG|SHORT" in Structured Pick
 * section, (2) narrative + thesis extraction and narrative fallback.
 */
function parseStructuredPickFromMarkdown(
  mdContent: string,
  dateStr: string,
): WttPick | null {
  // 1) Structured Pick line: "TICKER · perp · LONG" or "TICKER · perp · SHORT"
  const pickLine = mdContent.match(
    /^\s*([A-Z0-9]+)\s*·\s*perp\s*·\s*(LONG|SHORT)\s*$/im,
  );
  if (pickLine) {
    const ticker = pickLine[1].toUpperCase().replace(/-/g, "");
    if (isWttUniverseTicker(ticker)) {
      const direction =
        pickLine[2].toUpperCase() === "SHORT" ? "short" : "long";
      logger.info(
        `[ECHO WhatstheTrade] Parsed pick from markdown Structured Pick line: ${ticker} ${direction}`,
      );
      return {
        date: dateStr,
        thesis: "",
        primaryTicker: ticker,
        primaryDirection: direction,
        primaryInstrument: "perp",
        primaryEntryPrice: 0,
        primaryRiskUsd: 0,
        invalidateCondition: "",
        killConditions: [],
        rubric: FALLBACK_RUBRIC,
      };
    }
  }
  // 2) Extract thesis and narrative from report and run narrative fallback
  const parts = mdContent.split(/\n---\n/);
  const beforeFirstRule = parts[0] ?? "";
  const afterFirstRule = parts[1] ?? "";
  const thesis = beforeFirstRule
    .replace(/^\s*\*\*What's the trade\*\*[^\n]*\n+/i, "")
    .trim();
  const narrative =
    afterFirstRule.split(/\n### Structured Pick\n/i)[0]?.trim() ?? "";
  if (!thesis && !narrative) return null;
  return extractPickFromNarrativeFallback(narrative, thesis, dateStr);
}

async function saveReport(content: string, date: Date): Promise<string | null> {
  try {
    const dir = getOutputDir();
    await fs.mkdir(dir, { recursive: true });
    const filepath = getOutputPath(date);
    const meta = `---
date: ${date.toISOString()}
type: whats-the-trade
generated: echo-daily-task
---

`;
    await fs.writeFile(filepath, meta + content, "utf-8");
    logger.info("[ECHO WhatstheTrade] Saved to " + filepath);
    return filepath;
  } catch (err) {
    logger.error({ err }, "[ECHO WhatstheTrade] Failed to save report");
    return null;
  }
}

async function savePickJson(pick: WttPick, date: Date): Promise<string | null> {
  try {
    const dir = getOutputDir();
    await fs.mkdir(dir, { recursive: true });
    const filepath = getOutputPathJson(date);
    await fs.writeFile(filepath, JSON.stringify(pick, null, 2), "utf-8");
    logger.info("[ECHO WhatstheTrade] Saved pick to " + filepath);
    return filepath;
  } catch (err) {
    logger.error({ err }, "[ECHO WhatstheTrade] Failed to save pick JSON");
    return null;
  }
}

function formatDirection(direction: "long" | "short"): string {
  return direction.toUpperCase();
}

function formatMaybePrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "n/a";
  return `$${value}`;
}

function formatMaybeRiskUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "n/a";
  return `$${Math.round(value)}`;
}

/**
 * Build the final markdown from one in-memory artifact object.
 * This keeps the human report and JSON sidecar in sync on core fields.
 */
export function buildWttReportMarkdown(params: {
  dateLabel: string;
  thesis: string;
  narrative: string;
  pick: WttPick | null;
}): string {
  const effectiveThesis = params.pick?.thesis?.trim() || params.thesis.trim();
  const lines: string[] = [
    `**What's the trade** _${params.dateLabel}_`,
    "",
    effectiveThesis,
    "",
    "---",
    "",
    params.narrative,
    "",
    "### Structured Pick",
  ];

  if (params.pick) {
    const p = params.pick;
    lines.push(
      `${p.primaryTicker} · ${p.primaryInstrument} · ${formatDirection(p.primaryDirection)}`,
      `${formatMaybePrice(p.primaryEntryPrice)} · risk ${formatMaybeRiskUsd(p.primaryRiskUsd)}`,
      `invalidates if: ${p.invalidateCondition || "n/a"}`,
      p.evThresholdPct != null
        ? `+EV above ${p.evThresholdPct}%`
        : "+EV threshold: n/a",
      p.altTicker
        ? `alt: ${p.altTicker} ${p.altDirection ?? ""} ${p.altInstrument ?? ""}`
            .replace(/\s+/g, " ")
            .trim()
        : "alt: none",
    );
  } else {
    lines.push("No valid structured pick extracted today.");
  }

  lines.push("", "---", "_Expressions, not advice. Do your own research._");
  return lines.join("\n");
}

/**
 * Run the full "what's the trade" report once (thesis → adapters → narrative → save).
 * Used by the daily task and by the on-demand ECHO_WHATS_THE_TRADE action.
 * Also produces a structured JSON sidecar for the paper bot when extraction succeeds.
 */
export async function runWhatsTheTradeReport(
  runtime: IAgentRuntime,
): Promise<{ filepath: string | null; report: string; pick: WttPick | null }> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // HIP-3 constraint: default true (Renaissance Fund 3.0 north star — all trades onchain)
  const hip3Only =
    (runtime.getSetting("ECHO_WTT_HIP3_ONLY") ??
      process.env.ECHO_WTT_HIP3_ONLY ??
      "true") !== "false";
  // Robinhood adapter: default true (offchain color helps LLM find best onchain proxy)
  const rhEnabled =
    (runtime.getSetting("ECHO_WTT_ROBINHOOD_ENABLED") ??
      process.env.ECHO_WTT_ROBINHOOD_ENABLED ??
      "true") !== "false";

  if (hip3Only) {
    logger.info(
      "[ECHO WhatstheTrade] HIP-3 only mode: primary pick must be a Hyperliquid perp",
    );
  }

  const skillDir = getSkillDir();
  const xDriven =
    (runtime.getSetting("ECHO_WTT_X_DRIVEN") ??
      process.env.ECHO_WTT_X_DRIVEN ??
      "false") === "true";
  const camilloStyle =
    (runtime.getSetting("ECHO_WTT_CAMILLO_STYLE") ??
      process.env.ECHO_WTT_CAMILLO_STYLE ??
      "false") === "true";
  if (camilloStyle) {
    logger.info(
      "[ECHO WhatstheTrade] Camillo / social-arbitrage lens enabled (ECHO_WTT_CAMILLO_STYLE)",
    );
  }

  // News context (MandoMinutes) so headline-driven catalysts (e.g. OpenAI government deal) can become the thesis
  let newsContext: string | null = null;
  try {
    const mando = await getMandoContextForX(runtime);
    if (mando?.headlines?.length) {
      newsContext = mando.headlines.slice(0, 10).join("\n");
      logger.info(
        `[ECHO WhatstheTrade] Injecting ${mando.headlines.length} headlines into thesis suggestion`,
      );
    }
  } catch (e) {
    logger.debug(
      "[ECHO WhatstheTrade] No news context for thesis: " +
        (e as Error).message,
    );
  }

  // Polymarket odds (Gamma public-search) so thesis can reinforce or contrast with prediction markets
  let polymarketContext: string | null = null;
  try {
    const searchQuery =
      newsContext
        ?.split(/\s+/)
        .filter((w) => w.length > 3)[0]
        ?.slice(0, 30) || "crypto bitcoin";
    polymarketContext = await getPolymarketContextForWtt(searchQuery);
    if (polymarketContext) {
      logger.info(
        "[ECHO WhatstheTrade] Injecting Polymarket context into thesis suggestion",
      );
    }
  } catch (e) {
    logger.debug(
      "[ECHO WhatstheTrade] No Polymarket context: " + (e as Error).message,
    );
  }

  const xNarrative = xDriven ? await fetchCtNarrativeForWtt(runtime) : null;
  let thesis: string;
  if (xNarrative) {
    logger.info("[ECHO WhatstheTrade] Using X-driven thesis");
    thesis = await suggestThesisFromX(
      runtime,
      dateStr,
      xNarrative,
      hip3Only,
      newsContext,
      camilloStyle,
      polymarketContext,
    );
  } else {
    thesis = await suggestThesis(
      runtime,
      dateStr,
      hip3Only,
      newsContext,
      camilloStyle,
      polymarketContext,
    );
  }

  /** Catalyst tags for feedback: which inputs drove this thesis (used in JSON sidecar and improvement reports). */
  const catalystSources: WttCatalystSource[] = [
    ...(newsContext ? (["headlines"] as const) : []),
    ...(xNarrative ? (["ct"] as const) : []),
    ...(polymarketContext ? (["polymarket"] as const) : []),
  ];
  if (catalystSources.length === 0) catalystSources.push("generic");

  const dataContext = await fetchAdapterData(
    skillDir,
    thesis,
    hip3Only,
    rhEnabled,
  );
  const narrative = await generateNarrative(
    runtime,
    thesis,
    dataContext,
    dateLabel,
    hip3Only,
    camilloStyle,
  );

  let pick = await extractStructuredPick(
    runtime,
    thesis,
    narrative,
    dateStr,
    hip3Only,
  );

  // Hard gate: reject non-HIP-3 primary picks when hip3Only is enabled
  if (hip3Only && pick) {
    const onchain = isWttUniverseTicker(pick.primaryTicker);
    if (!onchain) {
      logger.warn(
        `[ECHO WhatstheTrade] Primary pick ${pick.primaryTicker} is not a HIP-3 asset, checking alt...`,
      );
      const altOnchain = pick.altTicker
        ? isWttUniverseTicker(pick.altTicker)
        : false;
      if (altOnchain && pick.altTicker) {
        logger.info(
          `[ECHO WhatstheTrade] Swapping to alt ticker ${pick.altTicker} (HIP-3 asset)`,
        );
        pick.primaryTicker = pick.altTicker;
        pick.primaryDirection = pick.altDirection ?? pick.primaryDirection;
        pick.primaryInstrument = "perp";
        pick.altTicker = undefined;
        pick.altDirection = undefined;
        pick.altInstrument = undefined;
      } else {
        logger.warn(
          `[ECHO WhatstheTrade] Neither primary (${pick.primaryTicker}) nor alt (${pick.altTicker ?? "none"}) is HIP-3. Pick rejected.`,
        );
        pick = null;
      }
    }
  }

  if (pick) {
    pick.catalystSources = catalystSources;
    await savePickJson(pick, now);
    await saveEchoXSignalsFile(pick, now);
  } else {
    const fallbackPick = extractPickFromNarrativeFallback(
      narrative,
      thesis,
      dateStr,
    );
    if (fallbackPick) {
      fallbackPick.catalystSources = catalystSources;
      await savePickJson(fallbackPick, now);
      await saveEchoXSignalsFile(fallbackPick, now);
      pick = fallbackPick;
      logger.info(
        "[ECHO WhatstheTrade] Saved pick from fallback (paper bot will use it)",
      );
    } else {
      logger.warn(
        "[ECHO WhatstheTrade] No structured pick and fallback found no ticker; paper bot will not have a WTT pick for today",
      );
    }
  }
  const fullReport = buildWttReportMarkdown({
    dateLabel,
    thesis,
    narrative,
    pick,
  });
  const filepath = await saveReport(fullReport, now);
  if (!pick && filepath) {
    const mdFallback = parseStructuredPickFromMarkdown(fullReport, dateStr);
    if (mdFallback) {
      mdFallback.catalystSources = catalystSources;
      await savePickJson(mdFallback, now);
      await saveEchoXSignalsFile(mdFallback, now);
      pick = mdFallback;
      logger.info(
        "[ECHO WhatstheTrade] Saved pick from markdown fallback (paper bot will use it)",
      );
    }
  }
  return { filepath, report: fullReport, pick };
}

export async function registerWhatsTheTradeDailyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  if (process.env.ECHO_WHATS_THE_TRADE_ENABLED === "false") {
    logger.info(
      "[ECHO WhatstheTrade] Task disabled (ECHO_WHATS_THE_TRADE_ENABLED=false)",
    );
    return;
  }

  const hourUtc =
    parseInt(
      process.env.ECHO_WHATS_THE_TRADE_HOUR ?? String(DEFAULT_HOUR_UTC),
      10,
    ) || DEFAULT_HOUR_UTC;
  const worldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "ECHO_WHATS_THE_TRADE_DAILY",
    validate: async () => true,
    execute: async (rt, _opts, task) => {
      const now = new Date();
      if (now.getUTCHours() !== hourUtc) {
        return;
      }

      const todayStr = now.toISOString().slice(0, 10);
      const lastRanDate = task.metadata?.lastRanDate as string | undefined;
      if (lastRanDate === todayStr) {
        return;
      }

      logger.info(
        "[ECHO WhatstheTrade] Building daily what's-the-trade report...",
      );

      try {
        await runWhatsTheTradeReport(rt);
      } catch (error) {
        logger.error(
          "[ECHO WhatstheTrade] Failed: " + (error as Error).message,
        );
      }

      if (task.id) {
        await rt.updateTask(task.id, {
          metadata: {
            ...task.metadata,
            updatedAt: Date.now(),
            lastRanDate: todayStr,
          },
        });
      }
    },
  });

  const existing = await runtime.getTasksByName("ECHO_WHATS_THE_TRADE_DAILY");
  if (existing.length > 0) {
    logger.info(
      `[ECHO WhatstheTrade] Task already exists (${existing.length} found), skipping create`,
    );
  } else {
    await runtime.createTask({
      name: "ECHO_WHATS_THE_TRADE_DAILY",
      description:
        "Daily belief-router report: one thesis, live adapters, ALOHA-style narrative → docs/standup/whats-the-trade/",
      roomId: worldId,
      worldId,
      tags: ["echo", "whats-the-trade", "queue", "repeat"],
      metadata: {
        updatedAt: Date.now(),
        updateInterval: TASK_INTERVAL_MS,
      },
    });
  }

  logger.info(
    `[ECHO WhatstheTrade] Task registered (runs at ${hourUtc}:00 UTC, output: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.md)`,
  );
}
