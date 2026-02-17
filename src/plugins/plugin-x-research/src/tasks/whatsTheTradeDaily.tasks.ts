/**
 * ECHO What's the Trade — Daily Task
 *
 * Belief-router style report: one thesis (vibe-friendly), live adapters from
 * the whats-the-trade skill (Kalshi, Robinhood, Hyperliquid), then one
 * ALOHA-style narrative. Fits ECHO's lane: sentiment/vibe → one trade expression.
 *
 * Output: docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.md
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

async function suggestThesis(runtime: IAgentRuntime, dateStr: string): Promise<string> {
  const prompt = `Today is ${dateStr}. Suggest exactly one short tradeable thesis (one sentence) that fits a sentiment/vibe lens: what narrative could CT or macro be pricing that we can express in one trade? Examples: "Fed holds in March", "AI defense spending will accelerate", "SOL outperforms ETH on relative strength". Reply with only that one sentence, no quotes or preamble.`;
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
  thesis: string
): Promise<string> {
  const lines: string[] = [];
  const keywords = thesis.split(/\s+/).slice(0, 4).join(" ");

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

  try {
    const rh = await runBunScript(
      skillDir,
      "scripts/adapters/robinhood/instruments.ts",
      ["NVDA,AAPL,HIMS,TSLA"]
    );
    if (rh.json && typeof rh.json === "object" && "validated_instruments" in rh.json) {
      const arr = (rh.json as { validated_instruments?: unknown[] }).validated_instruments ?? [];
      lines.push("\n=== ROBINHOOD (sample) ===");
      arr.slice(0, 4).forEach((i: Record<string, unknown>) => {
        lines.push(`  ${i.ticker ?? ""}: $${i.price ?? ""} (${i.day_change_pct ?? ""}%)`);
      });
    }
  } catch (e) {
    logger.debug("[ECHO WhatstheTrade] Robinhood adapter skip: " + (e as Error).message);
  }

  try {
    const hl = await runBunScript(
      skillDir,
      "scripts/adapters/hyperliquid/instruments.ts",
      ["SOL BTC ETH"]
    );
    if (hl.json && typeof hl.json === "object" && "validated_instruments" in hl.json) {
      const arr = (hl.json as { validated_instruments?: unknown[] }).validated_instruments ?? [];
      lines.push("\n=== HYPERLIQUID ===");
      arr.slice(0, 3).forEach((i: Record<string, unknown>) => {
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
  dateLabel: string
): Promise<string> {
  const prompt = `You are ECHO, writing your daily "What's the trade" for ${dateLabel}. Vibe and sentiment lead; you pick the single best expression across markets.

Today's thesis: ${thesis}

Live data from prediction markets, stocks, and perps:

${dataContext}

Write a short narrative (150–250 words) that:
1. States the single best way to express this thesis (one instrument: stock, option, Kalshi contract, or perp) and why it beats the obvious play.
2. Weaves in specific numbers from the data above.
3. Includes the downside: what you risk and what would kill the trade.
4. Ends with one minimal trade card in this format (≤6 lines):

[TICKER] · [INSTRUMENT] · [DIRECTION]
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

/**
 * Run the full "what's the trade" report once (thesis → adapters → narrative → save).
 * Used by the daily task and by the on-demand ECHO_WHATS_THE_TRADE action.
 */
export async function runWhatsTheTradeReport(
  runtime: IAgentRuntime
): Promise<{ filepath: string | null; report: string }> {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const skillDir = getSkillDir();
  const thesis = await suggestThesis(runtime, dateLabel);
  const dataContext = await fetchAdapterData(skillDir, thesis);
  const narrative = await generateNarrative(runtime, thesis, dataContext, dateLabel);
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
  return { filepath, report: fullReport };
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
