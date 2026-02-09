/**
 * SENTINEL_SUGGEST — Proactive improvement suggestions (architecture, ops, benchmarks, examples, plugins).
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const SUGGEST_TRIGGERS = [
  "suggest",
  "suggestions",
  "what should we improve",
  "what to improve",
  "what should we do next",
  "what's next",
  "improve the project",
  "task brief for claude",
  "task brief for claude 4.6",
  "instructions for claude",
  "instructions for claude code",
  "brief for cursor",
  "claude code",
];

function wantsSuggest(text: string): boolean {
  const lower = text.toLowerCase();
  return SUGGEST_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelSuggestAction: Action = {
  name: "SENTINEL_SUGGEST",
  similes: ["SUGGEST_IMPROVEMENTS", "CORE_DEV_SUGGEST", "TASK_BRIEF"],
  description:
    "Returns prioritized improvement suggestions (architecture, ops, ONNX/feature-store, ART gems, clawdbot, settings, benchmarks, plugins) or a task brief for Claude 4.6 / Claude Code.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSuggest(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_SUGGEST] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();
      const isTaskBrief =
        /task brief|instructions for claude|claude code|brief for cursor/i.test(userText);

      const prompt = isTaskBrief
        ? `The user asked for a task brief for Claude 4.6 or Claude Code. Context from internal-docs:\n${contextBlock}\n\nOutput a single block of text they can paste into the Claude Code controller or Cursor. Include: (1) the task they described or a placeholder, (2) architecture rules (plugin boundaries, agents thin, no duplicate lanes), (3) "Keep the architecture as good as it gets." (4) Mindset: coding 24/7—work never stalls. No preamble—just the pasteable block.`
        : `You are Sentinel. North star: 24/7 coding, self-improving, ML/ONNX obsessed, ART (elizaOS examples/art), clawdbot for knowledge research, best settings. Using the context below (internal-docs, sentinel-docs including ELIZAOS_BENCHMARKS for benchmark run commands, examples, elizaos-plugins), produce a short prioritized list of improvement suggestions. Categories: **24/7 market research (top priority):** Vince push, X research, signals, knowledge pipeline—ensure this is running and improving before other work; architecture/ops, ONNX/feature-store health, clawdbot spin-up, ART gems from examples, best-settings nudge, benchmarks alignment (use ELIZAOS_BENCHMARKS for context_bench, agentbench, solana, gauntlet, etc.), relevant plugins (including openclaw-adapter for multi-runtime or wallet tooling—see OPENCLAW_ADAPTER), tech debt. Number each item; one line per item with a short ref (doc or URL). No intro—just the numbered list.\n\nContext:\n${contextBlock}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_SUGGEST] Failed:", error);
      await callback({
        text: "Suggestions couldn't be generated right now. Check internal-docs and try again, or ask for a specific area (e.g. ops, architecture, plugins).",
      });
      return false;
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What should we improve next?" } },
      {
        name: "Sentinel",
        content: {
          text: "1) Add ARCHITECTURE.md. 2) Ingest elizaos/examples/art. 3) If feature store 90+ rows run train_models.py. 4) Spin up clawdbot (PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH). 5) Check elizaos-plugins for paper-bot. Refs: internal-docs, FEATURE-STORE.md.",
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Task brief for Claude 4.6 to refactor the options action." } },
      {
        name: "Sentinel",
        content: {
          text: "Task: Refactor the options action in plugin-vince; handlers in dedicated file, action stays thin. Rules: plugin boundaries, agents thin, no duplicate lanes. Keep the architecture as good as it gets. Coding 24/7. Paste into controller or Cursor.",
        },
      },
    ],
  ],
};
