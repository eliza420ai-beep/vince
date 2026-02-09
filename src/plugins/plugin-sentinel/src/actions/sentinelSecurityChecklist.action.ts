/**
 * SENTINEL_SECURITY_CHECKLIST — Short checklist from SECURITY-HYGIENE; points to full list in knowledge.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const SECURITY_TRIGGERS = [
  "security checklist",
  "env hygiene",
  "secrets",
  "who has access",
  "security hygiene",
  "env and secrets",
];

function wantsSecurityChecklist(text: string): boolean {
  const lower = text.toLowerCase();
  return SECURITY_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelSecurityChecklistAction: Action = {
  name: "SENTINEL_SECURITY_CHECKLIST",
  similes: ["SECURITY_CHECKLIST", "ENV_HYGIENE"],
  description:
    "Returns a short security checklist (env, secrets, who can do what) and points to SECURITY-HYGIENE in knowledge for the full list.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSecurityChecklist(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_SECURITY_CHECKLIST] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";

      const prompt = `You are Sentinel. From the context below (especially SECURITY-HYGIENE), produce a short security checklist: env/secrets (no keys in repo, use .env, rotation), who can do what (deploy, DB, API keys). Keep it to 4–6 bullets. End with: "Check SECURITY-HYGIENE in knowledge (sentinel-docs) for the full list." Do not invent—use only the provided context.\n\nContext:\n${contextBlock}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text = (typeof response === "string"
        ? response
        : (response as { text?: string })?.text ?? String(response)
      ).trim();
      await callback({
        text: text.endsWith("full list.")
          ? text
          : `${text}\n\nCheck SECURITY-HYGIENE in knowledge (sentinel-docs) for the full list.`,
      });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_SECURITY_CHECKLIST] Failed:", error);
      await callback({
        text: "Security checklist couldn't be generated. Check knowledge/sentinel-docs/SECURITY-HYGIENE.md for env, secrets, and who can do what.",
      });
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What's our security checklist?" },
      },
      {
        name: "Sentinel",
        content: {
          text: "• No keys in repo; use .env. • Rotate keys if exposed. • Deploy/DB/API keys: document who. Check SECURITY-HYGIENE in knowledge for the full list.",
        },
      },
    ],
  ],
};
