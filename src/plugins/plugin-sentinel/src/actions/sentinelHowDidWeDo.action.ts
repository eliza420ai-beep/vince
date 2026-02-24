/**
 * SENTINEL_HOW_DID_WE_DO — Single textual report: cost vs budget, paper bot pointer, main metrics, one-line takeaway.
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
import { NO_AI_SLOP } from "../utils/alohaStyle";

const HOW_DID_WE_DO_TRIGGERS = [
  "how did we do",
  "how are we doing",
  "exec summary",
  "executive summary",
  "weekly summary",
  "status report",
];

function wantsHowDidWeDo(text: string): boolean {
  const lower = text.toLowerCase();
  return HOW_DID_WE_DO_TRIGGERS.some((t) => lower.includes(t));
}

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
            source: "sentinel_how_did_we_do",
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

export const sentinelHowDidWeDoAction: Action = {
  name: "SENTINEL_HOW_DID_WE_DO",
  similes: ["SENTINEL_EXEC_SUMMARY", "HOW_DID_WE_DO"],
  description:
    "Produces a short 'How did we do?' report: cost vs budget/burn, paper bot (Leaderboard → Trading Bot), usage (Leaderboard → Usage tab), one-line takeaway.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsHowDidWeDo(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_HOW_DID_WE_DO] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const vinceCalibration = await askAgent(
        runtime,
        "VINCE",
        "Reply with prediction calibration only in this format: predictionBrier=X predictionCount=X",
      );

      const prompt = `You are Sentinel. From the context below, write a short **How did we do?** report in one paragraph (flowing prose, no bullet list): cost vs budget/burn, paper bot (Leaderboard → Trading Bot for PnL/trades), usage (Leaderboard → Usage tab), prediction calibration from Vince (Brier, lower is better), and one-line takeaway. Do not fabricate—use TREASURY and sentinel-docs only.

${NO_AI_SLOP}

Context:\n${contextBlock}

Vince prediction calibration reply:
${vinceCalibration || "predictionBrier=n/a predictionCount=0"}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text = (
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response))
      ).trim();
      const out = "Here's how we did—\n\n" + text;
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_HOW_DID_WE_DO] Failed:", error);
      await callback({
        text: "Report couldn't be generated. Check TREASURY for cost vs budget; Leaderboard → Trading Bot for paper PnL; Leaderboard → Usage for usage. Ask for cost status for details.",
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
        content: { text: "How did we do this week?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Cost vs budget: [from TREASURY]. Paper bot: Leaderboard → Trading Bot. Usage: Leaderboard → Usage. Takeaway: [one line].",
        },
      },
    ],
  ],
};
