/**
 * Kelly Flywheel Score Action (#29)
 *
 * "Flywheel Score" — surfaces the composite 0-100 system health metric.
 * Queries agents for component data, computes score, reports trend.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import type {
  FlywheelScoreService,
  FlywheelInputs,
} from "../services/flywheelScore.service";

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
            source: "kelly_flywheel",
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

function extractNumber(text: string, fallback: number): number {
  const match = text.match(/[-+]?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : fallback;
}

export const kellyFlywheelScoreAction: Action = {
  name: "KELLY_FLYWHEEL_SCORE",
  similes: [
    "FLYWHEEL_SCORE",
    "FLYWHEEL",
    "SYSTEM_HEALTH",
    "SYSTEM_SCORE",
    "HOW_ARE_WE_DOING",
  ],
  description:
    "Compute and report the Flywheel Score — a composite 0-100 metric measuring system self-improvement across signal quality, trade performance, sentiment, content, knowledge, engineering, and genome evolution.",

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ) => {
    const svc = runtime.getService<FlywheelScoreService>(
      "FLYWHEEL_SCORE_SERVICE",
    );

    if (!svc) {
      await callback({
        text: "Flywheel Score service isn't active yet. It needs the Kelly plugin with the FlywheelScoreService registered.",
        actions: ["REPLY"],
      });
      return;
    }

    await callback({
      text: "Gathering data from the team to compute Flywheel Score...",
      actions: ["KELLY_FLYWHEEL_SCORE"],
    });

    // Query agents in parallel
    const [vinceReply, sentinelReply, elizaReply] = await Promise.all([
      askAgent(
        runtime,
        "VINCE",
        "Reply with numbers only: VinceBench score, 4-week rolling Sharpe, sentiment accuracy %, genome Sharpe improvement. Format: benchScore=X sharpe=X sentimentAcc=X genomeDelta=X",
      ),
      askAgent(
        runtime,
        "SENTINEL",
        "Reply with one number: features shipped this week.",
      ),
      askAgent(
        runtime,
        "ELIZA",
        "Reply with two numbers: content pieces this week, knowledge items uploaded this week. Format: content=X knowledge=X",
      ),
    ]);

    const inputs: FlywheelInputs = {
      vinceBenchScore: extractNumber(
        vinceReply.match(/benchScore=(\S+)/)?.[1] ?? "",
        50,
      ),
      rollingSharpe: extractNumber(
        vinceReply.match(/sharpe=(\S+)/)?.[1] ?? "",
        0,
      ),
      sentimentAccuracyPct: extractNumber(
        vinceReply.match(/sentimentAcc=(\S+)/)?.[1] ?? "",
        50,
      ),
      genomeSharpeImprovement: extractNumber(
        vinceReply.match(/genomeDelta=(\S+)/)?.[1] ?? "",
        0,
      ),
      featuresShippedPerWeek: extractNumber(sentinelReply, 0),
      contentPiecesPerWeek: extractNumber(
        elizaReply.match(/content=(\S+)/)?.[1] ?? "",
        0,
      ),
      knowledgeItemsPerWeek: extractNumber(
        elizaReply.match(/knowledge=(\S+)/)?.[1] ?? "",
        0,
      ),
    };

    try {
      const snapshot = await svc.compute(inputs);
      const trend = svc.getTrend(4);
      const trendDir = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

      const report = [
        `**Flywheel Score: ${snapshot.score.toFixed(0)} (${snapshot.delta >= 0 ? "+" : ""}${snapshot.delta.toFixed(0)}) ${trendDir}**`,
        ``,
        `| Component | Score |`,
        `|-----------|-------|`,
        `| Signal Quality | ${snapshot.components.signalQuality.toFixed(0)} |`,
        `| Trade Performance | ${snapshot.components.tradePerformance.toFixed(0)} |`,
        `| Sentiment Accuracy | ${snapshot.components.sentimentAccuracy.toFixed(0)} |`,
        `| Content Output | ${snapshot.components.contentOutput.toFixed(0)} |`,
        `| Knowledge Growth | ${snapshot.components.knowledgeGrowth.toFixed(0)} |`,
        `| Engineering Velocity | ${snapshot.components.engineeringVelocity.toFixed(0)} |`,
        `| Genome Improvement | ${snapshot.components.genomeImprovement.toFixed(0)} |`,
        ``,
        snapshot.narrative,
        ``,
        `4-week trend: ${trend >= 0 ? "+" : ""}${trend.toFixed(1)} points`,
      ].join("\n");

      await callback({
        text: report,
        actions: ["KELLY_FLYWHEEL_SCORE"],
      });
    } catch (e) {
      logger.error(`[FlywheelScore] Compute failed: ${e}`);
      await callback({
        text: "Had trouble computing the Flywheel Score. Some agents may not have responded.",
        actions: ["REPLY"],
      });
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "What's our flywheel score?" },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Flywheel Score: 72 (+4). Signal quality driving gains; content output is the bottleneck.",
          actions: ["KELLY_FLYWHEEL_SCORE"],
        },
      },
    ],
  ],
};
