/**
 * ECHO What's the Trade — Daily Task
 *
 * Belief-router style report: one thesis (vibe-friendly), live adapters from
 * the whats-the-trade skill (Kalshi, Robinhood, Hyperliquid), then one
 * ALOHA-style narrative. Fits ECHO's lane: sentiment/vibe → one trade expression.
 *
 * Output: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.md
 * Sidecar: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json (for paper bot).
 *
 * Set ECHO_WHATS_THE_TRADE_ENABLED=false to disable.
 * Set ECHO_WHATS_THE_TRADE_HOUR=9 (UTC) to run at 9:00 UTC (default).
 * Skill path: WHATS_THE_TRADE_SKILL_DIR or cwd/skills/whats-the-trade
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
// HIP-3 + core perp universe (mirrored from plugin-vince/constants/targetAssets.ts).
// Kept in sync manually; add new HIP-3 assets here when they go live on Hyperliquid.
const WTT_UNIVERSE_TICKERS = [
  // Core
  "BTC", "ETH", "SOL", "HYPE",
  // HIP-3 Commodities
  "GOLD", "SILVER", "COPPER", "NATGAS", "OIL", "USOIL",
  // HIP-3 Indices
  "XYZ100", "US500", "SMALL2000", "MAG7", "SEMIS", "INFOTECH", "ROBOT",
  // HIP-3 Stocks
  "NVDA", "TSLA", "AAPL", "AMZN", "GOOGL", "META", "MSFT", "PLTR",
  "COIN", "HOOD", "NFLX", "MSTR", "AMD", "INTC", "ORCL", "MU", "SNDK", "CRCL",
  // HIP-3 AI/Tech
  "OPENAI", "ANTHROPIC", "SPACEX",
] as const;
const WTT_UNIVERSE_LABEL = WTT_UNIVERSE_TICKERS.join(", ");
const WTT_UNIVERSE_SET = new Set<string>(WTT_UNIVERSE_TICKERS);

/** Check if a WTT ticker is in the onchain-tradeable universe (core + HIP-3). */
function isWttUniverseTicker(ticker: string): boolean {
  return WTT_UNIVERSE_SET.has(ticker.trim().toUpperCase());
}

/** Structured pick for paper bot and ML (saved as JSON sidecar). */
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
    timingForgiveness: "very_forgiving" | "forgiving" | "punishing" | "very_punishing";
  };
  evThresholdPct?: number;
  killConditions: string[];
}

const DEFAULT_HOUR_UTC = 9;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const SCRIPT_TIMEOUT_MS = 25_000;

function getSkillDir(): string {
  const envDir = process.env.WHATS_THE_TRADE_SKILL_DIR?.trim();
  if (envDir) return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
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

function runBunScript(
  skillDir: string,
  scriptPath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; json: unknown }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", scriptPath, ...args], {
      cwd: skillDir,
      timeout: SCRIPT_TIMEOUT_MS,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      const json = jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return null; } })() : null;
      if (code !== 0 && !json) {
        reject(new Error(`Script exited ${code}: ${stderr.slice(0, 200)}`));
      } else {
        resolve({ stdout, stderr, json: json ?? {} });
      }
    });
  });
}

async function suggestThesis(
  runtime: IAgentRuntime,
  dateStr: string,
  hip3Only: boolean
): Promise<string> {
  const base = `Today is ${dateStr}. Suggest exactly one short tradeable thesis (one sentence) that fits a sentiment/vibe lens: what narrative could CT or macro be pricing that we can express in one trade? Examples: "Fed holds in March", "AI defense spending will accelerate", "SOL outperforms ETH on relative strength".`;
  const constraint = hip3Only
    ? ` The trade MUST be expressible onchain via a Hyperliquid perp. Available tickers: ${WTT_UNIVERSE_LABEL}. Pick a thesis that maps to one of these assets.`
    : "";
  const prompt = base + constraint + " Reply with only that one sentence, no quotes or preamble.";
  try {
    const out = await runtime.useModel(ModelType.TEXT_LARGE, { prompt, maxTokens: 80 });
    return String(out).trim().replace(/^["']|["']$/g, "");
  } catch (e) {
    logger.warn("[ECHO WhatstheTrade] Thesis suggestion failed, using fallback");
    return "Risk-on rotation; crypto and risk assets may outperform on the week.";
  }
}

async function fetchAdapterData(
  skillDir: string,
  thesis: string,
  hip3Only: boolean,
  rhEnabled: boolean
): Promise<string> {
  const lines: string[] = [];
  const keywords = thesis.split(/\s+/).slice(0, 4).join(" ");

  // Kalshi: prediction market odds (useful context regardless of hip3Only)
  try {
    const kalshi = await runBunScript(
      skillDir,
      "scripts/adapters/kalshi/instruments.ts",
      [keywords]
    );
    if (kalshi.json && typeof kalshi.json === "object" && "instruments" in kalshi.json) {
      const arr = (kalshi.json as { instruments?: unknown[] }).instruments ?? [];
      lines.push("=== KALSHI ===");
      arr.slice(0, 5).forEach((i: Record<string, unknown>) => {
        lines.push(`  ${i.ticker ?? i.title ?? ""}: ${i.yes_ask ?? i.lastPrice ?? ""}`);
      });
    }
  } catch (e) {
    logger.debug("[ECHO WhatstheTrade] Kalshi adapter skip: " + (e as Error).message);
  }

  // Robinhood/Yahoo: offchain stock context (optional, labeled as context-only when hip3Only)
  if (rhEnabled) {
    try {
      const rh = await runBunScript(
        skillDir,
        "scripts/adapters/robinhood/instruments.ts",
        ["NVDA,AAPL,HIMS,TSLA"]
      );
      if (rh.json && typeof rh.json === "object" && "validated_instruments" in rh.json) {
        const arr = (rh.json as { validated_instruments?: unknown[] }).validated_instruments ?? [];
        const label = hip3Only
          ? "\n=== ROBINHOOD (offchain context only — do NOT use as primary pick) ==="
          : "\n=== ROBINHOOD (sample) ===";
        lines.push(label);
        arr.slice(0, 4).forEach((i: Record<string, unknown>) => {
          lines.push(`  ${i.ticker ?? ""}: $${i.price ?? ""} (${i.day_change_pct ?? ""}%)`);
        });
      }
    } catch (e) {
      logger.debug("[ECHO WhatstheTrade] Robinhood adapter skip: " + (e as Error).message);
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
      [hlTickers]
    );
    if (hl.json && typeof hl.json === "object" && "validated_instruments" in hl.json) {
      const arr = (hl.json as { validated_instruments?: unknown[] }).validated_instruments ?? [];
      const label = hip3Only
        ? "\n=== HYPERLIQUID (onchain tradeable — pick from these) ==="
        : "\n=== HYPERLIQUID ===";
      lines.push(label);
      arr.forEach((i: Record<string, unknown>) => {
        lines.push(`  ${i.ticker ?? ""}: $${i.mark_price ?? ""} funding ${i.funding_rate ?? ""}`);
      });
    }
  } catch (e) {
    logger.debug("[ECHO WhatstheTrade] Hyperliquid adapter skip: " + (e as Error).message);
  }

  return lines.length > 0 ? lines.join("\n") : "No live instrument data could be loaded.";
}

async function generateNarrative(
  runtime: IAgentRuntime,
  thesis: string,
  dataContext: string,
  dateLabel: string,
  hip3Only: boolean
): Promise<string> {
  const marketScope = hip3Only
    ? `you pick the single best onchain expression using Hyperliquid perps (core crypto or HIP-3 assets: stocks, indices, commodities all trade as perps on Hyperliquid). Your PRIMARY pick ticker must be from the Hyperliquid universe. You may reference offchain context (Robinhood stocks, Kalshi odds) to support your reasoning, but the trade card ticker must be a Hyperliquid perp from: ${WTT_UNIVERSE_LABEL}.`
    : "you pick the single best expression across markets.";

  const instrumentOptions = hip3Only
    ? "one Hyperliquid perp"
    : "one instrument: stock, option, Kalshi contract, or perp";

  const instrumentLabel = hip3Only ? "perp" : "[INSTRUMENT]";

  const prompt = `You are ECHO, writing your daily "What's the trade" for ${dateLabel}. Vibe and sentiment lead; ${marketScope}

Today's thesis: ${thesis}

Live data from prediction markets, stocks, and perps:

${dataContext}

Write a short narrative (150–250 words) that:
1. States the single best way to express this thesis (${instrumentOptions}) and why it beats the obvious play.
2. Weaves in specific numbers from the data above.
3. Includes the downside: what you risk and what would kill the trade.
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

async function extractStructuredPick(
  runtime: IAgentRuntime,
  thesis: string,
  narrative: string,
  dateStr: string,
  hip3Only: boolean
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
    const rubric = parsed.rubric as Record<string, string>;
    const pick: WttPick = {
      date: String(parsed.date ?? dateStr),
      thesis: String(parsed.thesis ?? thesis),
      primaryTicker: String(parsed.primaryTicker ?? "").toUpperCase(),
      primaryDirection: parsed.primaryDirection === "short" ? "short" : "long",
      primaryInstrument: String(parsed.primaryInstrument ?? "perp"),
      primaryEntryPrice: Number(parsed.primaryEntryPrice) || 0,
      primaryRiskUsd: Number(parsed.primaryRiskUsd) || 0,
      invalidateCondition: String(parsed.invalidateCondition ?? ""),
      killConditions: Array.isArray(parsed.killConditions) ? (parsed.killConditions as string[]) : [],
      rubric: {
        alignment: (rubric?.alignment as WttPick["rubric"]["alignment"]) ?? "partial",
        edge: (rubric?.edge as WttPick["rubric"]["edge"]) ?? "consensus",
        payoffShape: (rubric?.payoffShape as WttPick["rubric"]["payoffShape"]) ?? "moderate",
        timingForgiveness: (rubric?.timingForgiveness as WttPick["rubric"]["timingForgiveness"]) ?? "punishing",
      },
    };
    if (parsed.altTicker != null) pick.altTicker = String(parsed.altTicker).toUpperCase();
    if (parsed.altDirection === "short" || parsed.altDirection === "long") pick.altDirection = parsed.altDirection;
    if (parsed.altInstrument != null) pick.altInstrument = String(parsed.altInstrument);
    if (typeof parsed.evThresholdPct === "number" && !Number.isNaN(parsed.evThresholdPct)) pick.evThresholdPct = parsed.evThresholdPct;
    return pick;
  } catch (e) {
    logger.warn("[ECHO WhatstheTrade] Structured pick extraction failed: " + (e as Error).message);
    return null;
  }
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

/**
 * Run the full "what's the trade" report once (thesis → adapters → narrative → save).
 * Used by the daily task and by the on-demand ECHO_WHATS_THE_TRADE action.
 * Also produces a structured JSON sidecar for the paper bot when extraction succeeds.
 */
export async function runWhatsTheTradeReport(
  runtime: IAgentRuntime
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
    (runtime.getSetting("ECHO_WTT_HIP3_ONLY") ?? process.env.ECHO_WTT_HIP3_ONLY ?? "true") !== "false";
  // Robinhood adapter: default true (offchain color helps LLM find best onchain proxy)
  const rhEnabled =
    (runtime.getSetting("ECHO_WTT_ROBINHOOD_ENABLED") ?? process.env.ECHO_WTT_ROBINHOOD_ENABLED ?? "true") !== "false";

  if (hip3Only) {
    logger.info("[ECHO WhatstheTrade] HIP-3 only mode: primary pick must be a Hyperliquid perp");
  }

  const skillDir = getSkillDir();
  const thesis = await suggestThesis(runtime, dateLabel, hip3Only);
  const dataContext = await fetchAdapterData(skillDir, thesis, hip3Only, rhEnabled);
  const narrative = await generateNarrative(runtime, thesis, dataContext, dateLabel, hip3Only);
  const fullReport = [
    `**What's the trade** _${dateLabel}_`,
    "",
    thesis,
    "",
    "---",
    "",
    narrative,
    "",
    "---",
    "_Expressions, not advice. Do your own research._",
  ].join("\n");
  const filepath = await saveReport(fullReport, now);

  let pick = await extractStructuredPick(runtime, thesis, narrative, dateStr, hip3Only);

  // Hard gate: reject non-HIP-3 primary picks when hip3Only is enabled
  if (hip3Only && pick) {
    const onchain = isWttUniverseTicker(pick.primaryTicker);
    if (!onchain) {
      logger.warn(
        `[ECHO WhatstheTrade] Primary pick ${pick.primaryTicker} is not a HIP-3 asset, checking alt...`
      );
      const altOnchain = pick.altTicker ? isWttUniverseTicker(pick.altTicker) : false;
      if (altOnchain && pick.altTicker) {
        logger.info(
          `[ECHO WhatstheTrade] Swapping to alt ticker ${pick.altTicker} (HIP-3 asset)`
        );
        pick.primaryTicker = pick.altTicker;
        pick.primaryDirection = pick.altDirection ?? pick.primaryDirection;
        pick.primaryInstrument = "perp";
        pick.altTicker = undefined;
        pick.altDirection = undefined;
        pick.altInstrument = undefined;
      } else {
        logger.warn(
          `[ECHO WhatstheTrade] Neither primary (${pick.primaryTicker}) nor alt (${pick.altTicker ?? "none"}) is HIP-3. Pick rejected.`
        );
        pick = null;
      }
    }
  }

  if (pick) await savePickJson(pick, now);
  return { filepath, report: fullReport, pick };
}

export async function registerWhatsTheTradeDailyTask(
  runtime: IAgentRuntime
): Promise<void> {
  if (process.env.ECHO_WHATS_THE_TRADE_ENABLED === "false") {
    logger.info("[ECHO WhatstheTrade] Task disabled (ECHO_WHATS_THE_TRADE_ENABLED=false)");
    return;
  }

  const hourUtc =
    parseInt(process.env.ECHO_WHATS_THE_TRADE_HOUR ?? String(DEFAULT_HOUR_UTC), 10) || DEFAULT_HOUR_UTC;
  const worldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "ECHO_WHATS_THE_TRADE_DAILY",
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      if (now.getUTCHours() !== hourUtc) {
        logger.debug(
          `[ECHO WhatstheTrade] Skip: hour ${now.getUTCHours()} UTC, target ${hourUtc}`
        );
        return;
      }

      logger.info("[ECHO WhatstheTrade] Building daily what's-the-trade report...");

      try {
        await runWhatsTheTradeReport(rt);
      } catch (error) {
        logger.error("[ECHO WhatstheTrade] Failed: " + (error as Error).message);
      }
    },
  });

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

  logger.info(
    `[ECHO WhatstheTrade] Task registered (runs at ${hourUtc}:00 UTC, output: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.md)`
  );
}
