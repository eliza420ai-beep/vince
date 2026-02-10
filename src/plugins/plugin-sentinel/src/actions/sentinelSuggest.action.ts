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
  "prd for cursor",
  "product requirements",
  "milaidy",
  "openclaw",
  "integration instructions",
  "how to run milaidy",
  "how to run openclaw",
];

function wantsSuggest(text: string): boolean {
  const lower = text.toLowerCase();
  return SUGGEST_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelSuggestAction: Action = {
  name: "SENTINEL_SUGGEST",
  similes: ["SUGGEST_IMPROVEMENTS", "CORE_DEV_SUGGEST", "TASK_BRIEF"],
  description:
    "Returns prioritized improvement suggestions (architecture, ops, ONNX/feature-store, ART gems, clawdbot, settings, benchmarks, plugins), a task brief for Claude 4.6 / Claude Code, a PRD for Cursor, or Milaidy/OpenClaw integration instructions.",

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
      const isPRD = /prd for cursor|product requirements|spec for cursor/i.test(userText);
      const isIntegration =
        /milaidy|openclaw|integration instructions|how to run milaidy|how to run openclaw/i.test(
          userText,
        );

      let prompt: string;
      if (isTaskBrief) {
        prompt = `The user asked for a task brief for Claude 4.6 or Claude Code. Context from internal-docs:\n${contextBlock}\n\nOutput a single block of text they can paste into the Claude Code controller or Cursor. Include: (1) the task they described or a placeholder, (2) architecture rules (plugin boundaries, agents thin, no duplicate lanes), (3) "Keep the architecture as good as it gets." (4) Mindset: coding 24/7—work never stalls. No preamble—just the pasteable block.`;
      } else if (isPRD) {
        prompt = `The user asked for a PRD (Product Requirements Document) for Cursor. Context:\n${contextBlock}\n\nProduce a markdown PRD they can paste or save and use in Cursor when implementing. Include: (1) goal and scope, (2) user/caller story, (3) acceptance criteria (bullets), (4) technical constraints (plugin boundaries, agents thin, no duplicate lanes), (5) architecture rules and "keep the architecture as good as it gets", (6) optional out-of-scope. Use the user's topic if they gave one; otherwise pick the next high-value area from context. No preamble—just the PRD markdown.`;
      } else if (isIntegration) {
        prompt = `The user asked for Milaidy and/or OpenClaw integration instructions. You have sentinel-docs (e.g. OPENCLAW_ADAPTER, PRD_AND_MILAIDY_OPENCLAW). Output markdown: (1) Milaidy (https://github.com/milady-ai/milaidy): what it is (personal AI on ElizaOS, Gateway localhost:18789), install/run (npx milaidy, milaidy start), how VINCE connects (MILAIDY_GATEWAY_URL, POST /api/standup-action for standup build items—see STANDUP_DELIVERABLES). (2) OpenClaw (https://github.com/openclaw/openclaw): what it is (personal AI, multi-channel), install/run (npm install -g openclaw, openclaw onboard), how we integrate (openclaw-adapter for Eliza plugins in OpenClaw). Include links to both repos. No preamble—just the instructions.`;
      } else {
        prompt = `You are Sentinel. North star: 24/7 coding, self-improving, ML/ONNX obsessed, ART (elizaOS examples/art), clawdbot for knowledge research, best settings. Using the context below (internal-docs, sentinel-docs including ELIZAOS_BENCHMARKS for benchmark run commands, examples, elizaos-plugins), produce a short prioritized list of improvement suggestions. Categories: **24/7 market research (top priority):** Vince push, X research, signals, knowledge pipeline—ensure this is running and improving before other work; architecture/ops, ONNX/feature-store health, clawdbot spin-up, ART gems from examples, best-settings nudge, benchmarks alignment (use ELIZAOS_BENCHMARKS for context_bench, agentbench, solana, gauntlet, etc.), relevant plugins (openclaw-adapter—OPENCLAW_ADAPTER; plugin-elevenlabs—PLUGIN_ELEVENLABS; plugin-mcp—PLUGIN_MCP; plugin-xai for Grok/xAI—PLUGIN_XAI; we underuse Grok), tech debt. Number each item; one line per item with a short ref (doc or URL). No intro—just the numbered list.\n\nContext:\n${contextBlock}`;
      }

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
