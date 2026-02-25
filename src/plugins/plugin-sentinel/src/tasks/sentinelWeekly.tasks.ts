/**
 * Sentinel weekly suggestions task.
 * Runs on an interval (default 7 days); composes state, generates suggestions and investor update, optionally pushes to Discord channels named "sentinel" or "ops".
 * Includes recent post-mortems (docs/standup/post-mortems/) when present. PRD: One Dream — Agent Synergy (§Phase 2).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type IAgentRuntime,
  type Memory,
  type UUID,
  logger,
  ModelType,
} from "@elizaos/core";
import { generateInvestorBlock } from "../actions/sentinelInvestorReport.action";
import {
  buildTaskFromSuggestionLine,
  writeTaskToQueue,
} from "../services/openclawTaskBrief.service";
import { SkillTelemetryService } from "../services/skillTelemetry.service";

const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

type PostMortemMetrics = {
  file: string;
  qualityScore?: number;
  qualityEscalate?: boolean;
  primaryCause?: string;
  secondaryCauses?: string[];
  ptqgComplete?: boolean;
  pmevCompletenessPct?: number;
  missingDataCount?: number;
};

function syntheticMessage(text: string, runtime: IAgentRuntime): Memory {
  return {
    id: "" as UUID,
    content: { text },
    roomId: ZERO_UUID,
    entityId: runtime.agentId,
    agentId: runtime.agentId,
    createdAt: Date.now(),
  };
}

async function generateWeeklySuggestions(
  runtime: IAgentRuntime,
): Promise<string> {
  const state = await runtime.composeState(
    syntheticMessage("Weekly suggestions", runtime),
    undefined,
  );
  const contextBlock = typeof state.text === "string" ? state.text : "";
  const prompt = `You are Sentinel. North star: 24/7 coding, self-improving, ML/ONNX obsessed, ART, openclaw, best settings. You use all .md in knowledge and are responsible for doc improvements and consolidating progress. Using the context below, produce a short prioritized list of improvement suggestions. Categories: **24/7 market research (top priority):** Vince push, X research, signals, knowledge pipeline—ensure this is running and improving before other work; architecture/ops, ONNX/feature-store health (run train_models if 90+ rows), openclaw spin-up, ART gems from elizaOS examples (especially art), best-settings nudge, benchmarks alignment (use ELIZAOS_BENCHMARKS in sentinel-docs for run commands: context_bench, agentbench, solana, gauntlet), relevant plugins (openclaw-adapter—OPENCLAW_ADAPTER; plugin-elevenlabs—PLUGIN_ELEVENLABS; plugin-mcp—PLUGIN_MCP; plugin-xai for Grok/xAI—PLUGIN_XAI; we underuse Grok), tech debt, doc improvements (outdated sections, missing refs), progress consolidation (PROGRESS-CONSOLIDATED, run sync-sentinel-docs.sh). Number each item; one line per item with a short ref. No intro—just the numbered list.\n\nContext:\n${contextBlock}`;
  const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return typeof response === "string"
    ? response
    : ((response as { text?: string })?.text ?? String(response));
}

const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;

function getElizaOS(runtime: IAgentRuntime): any {
  return (runtime as any).elizaOS ?? null;
}

async function askAgent(
  runtime: IAgentRuntime,
  agentName: string,
  question: string,
  timeoutMs = 20000,
): Promise<string> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents) return "";
  const agents = await eliza.getAgents();
  const target = agents?.find(
    (a: any) =>
      (a.character?.name ?? "").toUpperCase() === agentName.toUpperCase(),
  );
  if (!target) return "";
  return new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve(""), timeoutMs);
    try {
      eliza.handleMessage(
        target.agentId,
        {
          id: crypto.randomUUID(),
          entityId: runtime.agentId,
          roomId: target.agentId,
          content: {
            text: `[To ${agentName}] ${question}`,
            source: "sentinel_weekly",
          },
          createdAt: Date.now(),
        },
        {
          onResponse: (resp: any) => {
            clearTimeout(timer);
            resolve(resp?.content?.text ?? resp?.text ?? "");
          },
          onComplete: () => {},
          onError: () => {
            clearTimeout(timer);
            resolve("");
          },
        },
      );
    } catch {
      clearTimeout(timer);
      resolve("");
    }
  });
}

/** Build a short pattern summary and suggested PRD from recent post-mortem files. PRD: One Dream Phase 3 (#13). */
async function buildPostMortemPatternSummary(
  runtime: IAgentRuntime,
  postMortemsDir: string,
): Promise<string> {
  if (!fs.existsSync(postMortemsDir)) return "";
  const files = fs
    .readdirSync(postMortemsDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(postMortemsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5);
  if (files.length === 0) return "";
  const contents: string[] = [];
  for (const f of files) {
    try {
      const body = fs.readFileSync(path.join(postMortemsDir, f.name), "utf-8");
      contents.push(`## ${f.name}\n${body}`);
    } catch {
      // skip
    }
  }
  if (contents.length === 0) return "";
  const combined = contents.join("\n\n");
  const prompt = `You are Sentinel. Below are post-mortem notes from losing paper trades (Echo, Oracle, Solus feedback). From these, extract 1–3 recurring patterns in one short sentence each (e.g. "Bearish sentiment ignored", "Position sizing too large"). Then suggest one PRD title that would address the main pattern. Reply in this exact format, no other text:\nPatterns: <sentence1>; <sentence2>; ...\nSuggested PRD: <title>\n\nPost-mortems:\n${combined.slice(0, 12000)}`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    const text =
      typeof response === "string"
        ? response
        : ((response as { text?: string })?.text ?? String(response));
    const trimmed = text.trim();
    if (!trimmed) return "";
    const writePrd = process.env.SENTINEL_POST_MORTEM_PRD_WRITE === "true";
    if (writePrd) {
      const prdsDir = path.join(process.cwd(), "docs", "standup", "prds");
      const date = new Date().toISOString().slice(0, 10);
      const stubPath = path.join(
        prdsDir,
        `PRD_POST_MORTEM_PATTERNS_${date}.md`,
      );
      try {
        if (!fs.existsSync(prdsDir)) fs.mkdirSync(prdsDir, { recursive: true });
        fs.writeFileSync(
          stubPath,
          `# Post-mortem patterns (auto-generated)\n\nGenerated: ${new Date().toISOString()}\n\n${trimmed}\n`,
          "utf-8",
        );
        logger.debug(`[SentinelWeekly] Wrote PRD stub: ${stubPath}`);
      } catch (e) {
        logger.warn("[SentinelWeekly] Failed to write PRD stub:", e);
      }
    }
    return trimmed;
  } catch (e) {
    logger.debug("[SentinelWeekly] Post-mortem pattern summary failed:", e);
    return "";
  }
}

function parsePostMortemMetrics(body: string, file: string): PostMortemMetrics {
  const metric: PostMortemMetrics = { file };
  const score = body.match(/PM_QUALITY_SCORE:\s*([0-9]+(?:\.[0-9]+)?)/);
  const escalate = body.match(/PM_QUALITY_ESCALATE:\s*(true|false)/i);
  const primary = body.match(/PM_PRIMARY_CAUSE:\s*([a-z_]+)/i);
  const secondary = body.match(/PM_SECONDARY_CAUSES:\s*([a-z_,]+|none)/i);
  const ptqg = body.match(/PM_PTQG_COMPLETE:\s*(true|false)/i);
  const pmev = body.match(/PM_PMEP_COMPLETENESS_PCT:\s*([0-9]+(?:\.[0-9]+)?)/i);
  const missing = body.match(/PM_MISSING_DATA_COUNT:\s*([0-9]+)/i);

  if (score) metric.qualityScore = Number(score[1]);
  if (escalate) metric.qualityEscalate = escalate[1].toLowerCase() === "true";
  if (primary) metric.primaryCause = primary[1];
  if (secondary) {
    metric.secondaryCauses =
      secondary[1] === "none"
        ? []
        : secondary[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
  }
  if (ptqg) metric.ptqgComplete = ptqg[1].toLowerCase() === "true";
  if (pmev) metric.pmevCompletenessPct = Number(pmev[1]);
  if (missing) metric.missingDataCount = Number(missing[1]);
  return metric;
}

function summarizePostMortemMetrics(metrics: PostMortemMetrics[]): string {
  if (metrics.length === 0) return "";
  const scored = metrics.filter((m) => typeof m.qualityScore === "number");
  const escalated = metrics.filter((m) => m.qualityEscalate === true);
  const ptqgTrue = metrics.filter((m) => m.ptqgComplete === true).length;
  const pmevValues = metrics
    .map((m) => m.pmevCompletenessPct)
    .filter((v): v is number => typeof v === "number");

  const avgScore =
    scored.length > 0
      ? scored.reduce((sum, m) => sum + (m.qualityScore ?? 0), 0) /
        scored.length
      : undefined;
  const avgPmev =
    pmevValues.length > 0
      ? pmevValues.reduce((sum, v) => sum + v, 0) / pmevValues.length
      : undefined;

  const causeCounts = new Map<string, number>();
  for (const m of metrics) {
    if (!m.primaryCause) continue;
    causeCounts.set(m.primaryCause, (causeCounts.get(m.primaryCause) ?? 0) + 1);
  }
  const topCauses = Array.from(causeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cause, count]) => `${cause} (${count})`);

  return [
    "",
    "**Post-mortem quality and KPI rollup:**",
    `- Files analyzed: ${metrics.length}`,
    `- Average quality score: ${avgScore !== undefined ? avgScore.toFixed(1) : "n/a"}`,
    `- Escalations (<75): ${escalated.length}`,
    `- PTQG complete rate: ${((ptqgTrue / metrics.length) * 100).toFixed(0)}%`,
    `- PMEP completeness avg: ${avgPmev !== undefined ? `${avgPmev.toFixed(1)}%` : "n/a"}`,
    `- Top primary causes: ${topCauses.length > 0 ? topCauses.join("; ") : "n/a"}`,
    ...(escalated.length > 0
      ? [
          "",
          "**Escalation queue (quality < 75):**",
          ...escalated.map(
            (m) =>
              `- \`${m.file}\` score=${m.qualityScore ?? "n/a"} cause=${m.primaryCause ?? "n/a"}`,
          ),
        ]
      : []),
  ].join("\n");
}

async function pushToSentinelChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<number> {
  const nameLower = (s: string) => (s ?? "").toLowerCase();
  const isSentinelChannel = (name: string) =>
    nameLower(name).includes("sentinel") || nameLower(name).includes("ops");

  const targets: Array<{
    source: string;
    roomId?: UUID;
    channelId?: string;
    serverId?: string;
  }> = [];

  try {
    const worlds = await runtime.getAllWorlds();
    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        const src = nameLower(room.source ?? "");
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!room.id) continue;
        if (!isSentinelChannel(room.name ?? "")) continue;
        targets.push({
          source: room.source ?? "discord",
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
    if (worlds.length === 0) {
      const fallbackRooms = await runtime.getRooms(ZERO_UUID);
      for (const room of fallbackRooms) {
        const src = nameLower(room.source ?? "");
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!isSentinelChannel(room.name ?? "")) continue;
        targets.push({
          source: room.source ?? "discord",
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
  } catch (err) {
    logger.debug("[SentinelWeekly] Could not get rooms:", err);
    return 0;
  }

  const isNoSendHandler = (e: unknown): boolean =>
    String(e).includes("No send handler") ||
    String(e).includes("Send handler not found");

  let sent = 0;
  for (const target of targets) {
    try {
      await runtime.sendMessageToTarget(target, { text: message });
      sent++;
    } catch (e) {
      if (!isNoSendHandler(e)) logger.warn("[SentinelWeekly] Send failed:", e);
    }
  }
  return sent;
}

export async function registerSentinelWeeklyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SENTINEL_WEEKLY_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SentinelWeekly] Task disabled (SENTINEL_WEEKLY_ENABLED=false)",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "SENTINEL_WEEKLY_SUGGESTIONS",
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.SENTINEL_WEEKLY_ENABLED === "false") return;
      logger.debug(
        "[SentinelWeekly] Building suggestions and investor update...",
      );
      try {
        const list = await generateWeeklySuggestions(rt);
        const listTrimmed = list.trim();
        const calibrationLine = await askAgent(
          rt,
          "VINCE",
          "Reply with prediction calibration only in this format: predictionBrier=X predictionCount=X",
        );

        if (process.env.SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK === "true") {
          try {
            const firstLine = listTrimmed
              .split("\n")
              .map((l) => l.trim())
              .find((l) => /^\d+\.\s+/.test(l));
            if (firstLine) {
              const task = buildTaskFromSuggestionLine(firstLine, "weekly");
              const writtenPath = writeTaskToQueue(task);
              logger.debug(
                `[SentinelWeekly] OpenClaw task brief written to ${writtenPath}`,
              );
            }
          } catch (err) {
            logger.warn(
              "[SentinelWeekly] Failed to write OpenClaw task brief:",
              err,
            );
          }
        }

        const postMortemsDir = path.join(
          process.cwd(),
          "docs",
          "standup",
          "post-mortems",
        );
        let postMortemsBlock = "";
        let patternSummary = "";
        let rollupBlock = "";
        try {
          if (fs.existsSync(postMortemsDir)) {
            const files = fs
              .readdirSync(postMortemsDir)
              .filter((f) => f.endsWith(".md") && f !== "README.md")
              .map((f) => ({
                name: f,
                mtime: fs.statSync(path.join(postMortemsDir, f)).mtimeMs,
              }))
              .sort((a, b) => b.mtime - a.mtime)
              .slice(0, 5);
            if (files.length > 0) {
              postMortemsBlock = [
                "",
                "**Recent post-mortems (losing trades):**",
                files.map((f) => `• \`${f.name}\``).join("\n"),
                "_Consider reviewing for recurring patterns (sentiment, regime, sizing)._",
              ].join("\n");
              const metrics: PostMortemMetrics[] = [];
              for (const f of files) {
                try {
                  const body = fs.readFileSync(
                    path.join(postMortemsDir, f.name),
                    "utf-8",
                  );
                  metrics.push(parsePostMortemMetrics(body, f.name));
                } catch {
                  // skip parse failure
                }
              }
              rollupBlock = summarizePostMortemMetrics(metrics);
              patternSummary = await buildPostMortemPatternSummary(
                rt,
                postMortemsDir,
              );
            }
          }
        } catch (_) {
          // ignore
        }

        const patternBlock = patternSummary
          ? [
              "",
              "**Patterns from post-mortems & suggested PRD:**",
              "```",
              patternSummary,
              "```",
            ].join("\n")
          : "";

        // Skill Scoreboard (Phase 9 — Skills OS)
        let skillScoreboardBlock = "";
        try {
          const skillTelemetry = new SkillTelemetryService();
          skillScoreboardBlock = skillTelemetry.buildWeeklyScoreboardSection();
        } catch (skillErr) {
          logger.debug("[SentinelWeekly] Skill scoreboard failed:", skillErr);
        }

        const suggestionsMessage = [
          "**Sentinel — weekly suggestions**",
          "",
          calibrationLine
            ? `Prediction calibration: ${calibrationLine}`
            : "Prediction calibration: predictionBrier=n/a predictionCount=0",
          "",
          listTrimmed,
          postMortemsBlock,
          rollupBlock,
          patternBlock,
          skillScoreboardBlock,
          "",
          "---",
          "_Ask me: suggest, what should we improve, task brief for Claude 4.6, ONNX status, openclaw guide, best settings, art gems._",
        ].join("\n");
        let sent = await pushToSentinelChannels(rt, suggestionsMessage);

        const investorBlock = await generateInvestorBlock(
          rt,
          syntheticMessage("Investor update", rt),
        );
        const investorMessage = [
          "**Investor update**",
          "",
          investorBlock.trim(),
        ].join("\n");
        sent += await pushToSentinelChannels(rt, investorMessage);

        if (sent > 0) {
          logger.debug(`[SentinelWeekly] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[SentinelWeekly] No channels matched (name contains 'sentinel' or 'ops').",
          );
        }
      } catch (error) {
        logger.error("[SentinelWeekly] Failed:", error);
      }
    },
  });

  await runtime.createTask({
    name: "SENTINEL_WEEKLY_SUGGESTIONS",
    description:
      "Weekly improvement suggestions (architecture, ops, benchmarks, examples, plugins) pushed to sentinel/ops channels",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["sentinel", "ops", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: WEEKLY_INTERVAL_MS,
    },
  });

  logger.debug(
    "[SentinelWeekly] Task registered (weekly; push to channels with 'sentinel' or 'ops' in name). Set SENTINEL_WEEKLY_ENABLED=false to disable.",
  );
}
