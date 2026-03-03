/**
 * VINCE_SENTIMENT_CHECK — Summarize what Echo and Oracle say for the next trade.
 * Reads cached Echo sentiment and Oracle regime (same inputs as the sentiment gate).
 * PRD: One Dream — Agent Synergy (§5.3, Phase 2).
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import {
  getSentimentGateInput,
  getSentimentGateAdjustment,
} from "../services/vinceSentimentGate";

export const vinceSentimentCheckAction: Action = {
  name: "VINCE_SENTIMENT_CHECK",
  similes: ["SENTIMENT_CHECK", "ECHO_ORACLE_CHECK", "SENTIMENT_GATE"],
  description:
    "Report what Echo (CT sentiment) and Oracle (Polymarket regime) currently say about taking a trade. Use when the user asks what Echo and Oracle say about the next trade, or whether sentiment supports going long/short.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      (text.includes("echo") &&
        (text.includes("oracle") || text.includes("sentiment"))) ||
      text.includes("what does echo and oracle say") ||
      (text.includes("sentiment") && text.includes("next trade")) ||
      text.includes("feed vince") ||
      text.includes("sentiment check")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const input = await getSentimentGateInput(runtime);
    const adjLong = getSentimentGateAdjustment(input, "long");
    const adjShort = getSentimentGateAdjustment(input, "short");

    const lines: string[] = [];
    lines.push(
      `**Echo (CT sentiment):** ${input.sentimentLabel} (score ${input.sentimentScore}/10). **Oracle (regime):** ${input.regime}.`,
    );
    lines.push("");
    lines.push(
      `For **longs**: ${adjLong.skipLongs ? "⚠️ New longs skipped (bearish/risk-off)." : "✓ Allowed."} Size multiplier ${adjLong.sizeMultiplier}x. ${adjLong.adjustmentApplied}`,
    );
    lines.push(
      `For **shorts**: ${adjShort.skipShorts ? "⚠️ New shorts skipped." : "✓ Allowed."} Size multiplier ${adjShort.sizeMultiplier}x.`,
    );
    lines.push("");
    lines.push(
      "The paper bot uses this automatically when evaluating signals. To refresh Echo/Oracle views, ask them directly (e.g. “What’s the vibe?” to Echo, “Regime?” to Oracle), then ask me again.",
    );

    await callback?.({
      text: lines.join("\n"),
      actions: ["VINCE_SENTIMENT_CHECK"],
    });
    return undefined;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What does Echo and Oracle say about my next trade?" },
      },
      {
        name: "VINCE",
        content: {
          text: "**Echo (CT sentiment):** bearish (score 3/10). **Oracle (regime):** risk-off. For **longs**: ⚠️ New longs skipped. For **shorts**: ✓ Allowed. The paper bot uses this automatically.",
          actions: ["VINCE_SENTIMENT_CHECK"],
        },
      },
    ],
  ],
};
