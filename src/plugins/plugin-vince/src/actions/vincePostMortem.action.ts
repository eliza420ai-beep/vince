/**
 * VINCE_POST_MORTEM — Run a post-mortem on the last closed losing trade.
 * Asks Echo, Oracle, Solus via in-process ASK_AGENT and writes docs/standup/post-mortems/.
 * PRD: One Dream — Agent Synergy (§5.4, Phase 2).
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import { runPostMortem } from "../utils/postMortem";

export const vincePostMortemAction: Action = {
  name: "VINCE_POST_MORTEM",
  similes: ["POST_MORTEM", "POSTMORTEM", "LAST_LOSS_POST_MORTEM"],
  description:
    "Run a post-mortem on the most recent closed losing paper trade. Asks Echo, Oracle, and Solus for feedback and writes a markdown file to docs/standup/post-mortems/. Use when the user asks for a post-mortem on the last loss or to analyze a losing trade.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("post-mortem") ||
      text.includes("postmortem") ||
      text.includes("post mortem") ||
      (text.includes("last") &&
        text.includes("losing") &&
        text.includes("trade")) ||
      (text.includes("analyze") && text.includes("loss"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const paper = runtime.getService(
      "VINCE_PAPER_TRADING_SERVICE",
    ) as VincePaperTradingService | null;
    const last = paper?.getLastClosedLosingPosition?.() ?? null;
    if (!last) {
      await callback?.({
        text: "There’s no recent closed losing trade to post-mortem. The next time the paper bot closes a position at a loss, a post-mortem will run automatically and I’ll write it to docs/standup/post-mortems/.",
        actions: ["VINCE_POST_MORTEM"],
      });
      return;
    }
    try {
      await runPostMortem(runtime, last);
      const date = new Date().toISOString().slice(0, 10);
      const safeAsset = last.asset.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${date}-${safeAsset}-post-mortem.md`;
      await callback?.({
        text: `Post-mortem written to **docs/standup/post-mortems/${filename}**. I asked Echo (CT sentiment), Oracle (regime), and Solus (sizing/mechanics) for feedback on the ${last.asset} ${last.direction} loss. Open that file for the full write-up.`,
        actions: ["VINCE_POST_MORTEM"],
      });
    } catch (e) {
      logger.warn(`[VINCE_POST_MORTEM] Error: ${e}`);
      await callback?.({
        text: "Post-mortem failed to run or write the file. Check logs.",
        actions: ["VINCE_POST_MORTEM"],
      });
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Post-mortem on the last losing trade" },
      },
      {
        name: "VINCE",
        content: {
          text: "Post-mortem written to **docs/standup/post-mortems/2026-02-24-BTC-post-mortem.md**. I asked Echo, Oracle, and Solus for feedback on the BTC long loss.",
          actions: ["VINCE_POST_MORTEM"],
        },
      },
    ],
  ],
};
