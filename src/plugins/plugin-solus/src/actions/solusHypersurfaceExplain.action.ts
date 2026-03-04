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
  "secured puts vs covered calls",
  "when do i sell secured puts",
  "settlement time",
  "when does settlement happen",
  "settle all",
  "exercise window",
  "can i be exercised early",
  "sell probability",
  "is sell probability guaranteed",
  "wrapped assets",
  "api wallet",
  "cannot find my collateral after expiry",
  "can't find my collateral after expiry",
  "what should i do after expiry",
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
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SOLUS_HYPERSURFACE_EXPLAIN] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. The user wants an explanation of Hypersurface. We don't have funding/IV/sentiment; for where price lands by Friday, that's VINCE or pasted context.

Using the context below, explain in plain language:
- Expiry Friday 08:00 UTC and post-expiry settlement can take up to ~2 hours
- Covered calls vs cash-secured puts and wheel
- ITM early exercise in final ~24h
- Close-early path (and USDT0 needed for close debit)
- Sell probability is an estimate, not guaranteed
- Wrapped asset / wallet caveat (uBTC/uETH/uHYPE, main Hyperliquid account)

If user asks about missing collateral after expiry, include: Portfolio -> Expired -> Settle All.
End with: for live IV and strike data (and for a pulse on where price lands by Friday), say "options" to VINCE and paste his answer here for the strike call.
Reply in flowing prose; no bullet lists.

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
      const sections = [
        "**Hypersurface Mechanics**",
        "",
        text.trim(),
        "",
        "*Source: Hypersurface mechanics, knowledge/options*",
        "",
        "---",
        "_Next steps_: `STRIKE RITUAL` (Friday process) · `OPTIMAL STRIKE` (strike call) · `OPTIONS` → VINCE (IV data)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_HYPERSURFACE_EXPLAIN"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_HYPERSURFACE_EXPLAIN] Failed:", error);
      await callback({
        text: "Hypersurface: weekly options, Friday 08:00 UTC expiry. Settlement can take up to around 2 hours after expiry in busy periods. Covered calls = own asset, sell call, premium; above strike you're assigned. Secured puts = hold stablecoins, sell put, premium; below strike you're assigned (premium cuts cost basis). ITM exercise can happen in the final ~24h, so Thursday checks matter. Sell probability is an estimate, not a guarantee. If collateral looks missing after expiry, go to Portfolio -> Expired -> Settle All. For live IV and strikes, say 'options' to VINCE and paste here.",
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
