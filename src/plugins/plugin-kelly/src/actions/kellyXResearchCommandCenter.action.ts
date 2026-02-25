/**
 * KELLY_X_RESEARCH_COMMAND_CENTER — X-Research Command Center
 *
 * Loads top predictive X sources, asks Echo for narrative phases,
 * and builds a structured status report.
 *
 * PRD Phase 8, Task #48.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const TIMEOUT_MS = 28_000;
const CACHE_KEY = "kelly:x_research_command_center";
const CACHE_TTL_MS = 120_000; // 2 min

// ==========================================
// Types (inline to avoid cross-plugin imports)
// ==========================================

interface SourceQualityRecord {
  handle: string;
  precision: number;
  recall: number;
  calibration: number;
  timeToResolutionHrs: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: string;
}

// ==========================================
// Helpers
// ==========================================

function loadTopSources(n: number): SourceQualityRecord[] {
  try {
    const filePath = path.join(process.cwd(), "data", "x-source-quality.jsonl");
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: SourceQualityRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as SourceQualityRecord);
      } catch {
        // skip
      }
    }
    return records.sort((a, b) => b.precision - a.precision).slice(0, n);
  } catch {
    return [];
  }
}

function precisionGrade(precision: number): string {
  if (precision >= 0.7) return "A";
  if (precision >= 0.55) return "B";
  if (precision >= 0.4) return "C";
  return "D";
}

function extractReply(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const text =
    typeof c.text === "string"
      ? c.text
      : typeof c.message === "string"
        ? c.message
        : "";
  if (text.trim()) return text.trim();
  if (typeof c.thought === "string" && c.thought.trim())
    return c.thought.trim();
  return "";
}

async function askAgentEcho(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  roomId: string,
  entityId: string,
): Promise<string> {
  const question =
    "Current narrative phase for BTC, SOL, ETH, HYPE — inception/growth/peak/decline";
  const content = `[To Echo — you are being asked. Answer directly as yourself.][From Kelly, on behalf of the user]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "kelly_x_research_command_center" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(reply);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      });
  });
}

const PHASE_ACTION: Record<string, string> = {
  inception: "Monitor",
  growth: "Trade Now",
  peak: "Reduce",
  decline: "Avoid",
};

function detectPhaseFromText(
  echoReply: string,
  asset: string,
): { phase: string; action: string } {
  const lower = echoReply.toLowerCase();
  const assetLower = asset.toLowerCase();

  // Find section mentioning the asset
  const assetIdx = lower.indexOf(assetLower);
  if (assetIdx === -1) return { phase: "unknown", action: "Monitor" };

  const snippet = lower.slice(assetIdx, assetIdx + 200);
  for (const phase of ["inception", "growth", "peak", "decline"]) {
    if (snippet.includes(phase)) {
      return { phase, action: PHASE_ACTION[phase] ?? "Monitor" };
    }
  }
  return { phase: "unknown", action: "Monitor" };
}

function formatReport(
  sources: SourceQualityRecord[],
  echoReply: string,
): string {
  // Sources table
  const sourcesSection =
    sources.length > 0
      ? sources
          .map(
            (s) =>
              `| ${s.handle} | ${(s.precision * 100).toFixed(0)}% | ${precisionGrade(s.precision)} |`,
          )
          .join("\n")
      : "No source data yet";

  // Narrative table
  const assets = ["BTC", "SOL", "ETH", "HYPE"];
  const narrativeRows = assets.map((asset) => {
    const { phase, action } = detectPhaseFromText(echoReply, asset);
    return `| ${asset} | ${phase} | ${action} |`;
  });
  const narrativeSection = narrativeRows.join("\n");

  return `## X-Research Command Center

### Top Predictive Sources
| Account | Precision | Grade |
|---------|-----------|-------|
${sourcesSection}

### Narrative Status
| Asset | Phase | Action |
|-------|-------|--------|
${narrativeSection}

### Echo Intelligence
${echoReply || "— Echo unavailable"}`;
}

// ==========================================
// Action
// ==========================================

export const kellyXResearchCommandCenterAction: Action = {
  name: "KELLY_X_RESEARCH_COMMAND_CENTER",
  similes: [
    "X_RESEARCH_COMMAND_CENTER",
    "X_RESEARCH_STATUS",
    "RESEARCH_COMMAND_CENTER",
    "TOP_SOURCES",
    "X_RESEARCH_HUB",
  ],
  description:
    "X-Research Command Center: top predictive sources, narrative phase per asset, Echo intelligence — one view.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("x research command center") ||
      text.includes("x research status") ||
      text.includes("research command center") ||
      text.includes("top sources") ||
      text.includes("x research hub")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_X_RESEARCH_COMMAND_CENTER] Building command center");

    // Check cache
    const cached = await runtime.getCache<{ markdown: string; ts: number }>(
      CACHE_KEY,
    );
    if (cached && cached.markdown && Date.now() - cached.ts < CACHE_TTL_MS) {
      await callback({
        text: cached.markdown,
        actions: ["KELLY_X_RESEARCH_COMMAND_CENTER"],
      });
      return;
    }

    // Load top 5 sources
    const sources = loadTopSources(5);

    // Ask Echo for narrative phases
    let echoReply = "";
    try {
      const eliza = getElizaOS(runtime);
      if (eliza?.getAgents) {
        const agents = eliza.getAgents();
        const echoAgent = agents.find(
          (a) => (a.character?.name ?? "").trim().toLowerCase() === "echo",
        );
        if (echoAgent) {
          echoReply = await askAgentEcho(
            eliza,
            echoAgent.agentId,
            message.roomId,
            message.entityId ?? runtime.agentId,
          );
        }
      }
    } catch (e) {
      logger.debug(`[KELLY_X_RESEARCH_COMMAND_CENTER] Echo call failed: ${e}`);
    }

    const markdown = formatReport(sources, echoReply);
    await runtime.setCache(CACHE_KEY, { markdown, ts: Date.now() });

    await callback({
      text: markdown,
      actions: ["KELLY_X_RESEARCH_COMMAND_CENTER"],
    });
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "X research command center status" },
      },
      {
        name: "Kelly",
        content: {
          text: "## X-Research Command Center\n\n### Top Predictive Sources\n...",
          actions: ["KELLY_X_RESEARCH_COMMAND_CENTER"],
        },
      },
    ],
  ],
};
