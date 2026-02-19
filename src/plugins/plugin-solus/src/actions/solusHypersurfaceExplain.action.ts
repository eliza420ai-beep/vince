/**
 * SOLUS_HYPERSURFACE_EXPLAIN — Explain Hypersurface mechanics in plain language; point to VINCE for live data.
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
import { isSolus } from "../utils/solus";

const TRIGGERS = [
  "how does hypersurface work",
  "explain hypersurface",
  "explain secured puts",
  "explain covered calls",
  "what's the wheel",
  "how do covered calls work",
  "how do secured puts work",
  "hypersurface mechanics",
  "what happens if we get assigned",
  "what happens if i get assigned",
  "premium reduces cost basis",
  "underwater puts",
  "how do secured puts work",
];

function wantsExplain(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusHypersurfaceExplainAction: Action = {
  name: "SOLUS_HYPERSURFACE_EXPLAIN",
  similes: ["HYPERSURFACE_EXPLAIN", "EXPLAIN_OPTIONS"],
  description:
    "Explains Hypersurface mechanics: expiry, covered calls, CSP, wheel, early exercise. Points to VINCE for live IV/data.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsExplain(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SOLUS_HYPERSURFACE_EXPLAIN] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. The user wants an explanation of Hypersurface. We don't have funding/IV/sentiment; for where price lands by Friday, that's VINCE or pasted context. Using the context below, explain in plain language: expiry (Friday 08:00 UTC), covered calls vs cash-secured puts, the wheel, and early exercise. Keep it short and benefit-led. End with: for live IV and strike data (and for a pulse on where price lands by Friday), say "options" to VINCE and paste his answer here for the strike call. Reply in flowing prose; no bullet lists.

Context:
${contextBlock}

User: ${userText}

Reply with the explanation only.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      const out = "Here's how Hypersurface works—\n\n" + text.trim();
      await callback({ text: out, actions: ["SOLUS_HYPERSURFACE_EXPLAIN"] });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_HYPERSURFACE_EXPLAIN] Failed:", error);
      await callback({
        text: "Hypersurface: weekly options, Friday 08:00 UTC. Covered calls = own asset, sell call, premium; above strike you're assigned. Secured puts = hold stablecoins, sell put, premium; below strike you're assigned (premium cuts cost basis). Wheel: CC → assigned → CSP → assigned → repeat. For live IV and strikes, say 'options' to VINCE and paste here.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "How does Hypersurface work?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Hypersurface is where we execute—weekly options, Friday 08:00 UTC. Covered calls: own asset, sell call, earn premium; above strike = assigned. Secured puts: hold stablecoins, sell put, earn premium; below strike = assigned (premium reduces cost basis). For live data, say 'options' to VINCE and paste here.",
          actions: ["SOLUS_HYPERSURFACE_EXPLAIN"],
        },
      },
    ],
  ],
};
