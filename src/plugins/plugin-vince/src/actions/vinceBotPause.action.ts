/**
 * VINCE Bot Pause/Resume Action
 *
 * Controls paper trading bot state:
 * - Pause trading
 * - Resume trading
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import { BOT_FOOTER } from "../constants/botFormat";

export const vinceBotPauseAction: Action = {
  name: "VINCE_BOT_PAUSE",
  similes: [
    "PAUSE_BOT",
    "PAUSE BOT",
    "RESUME_BOT",
    "RESUME BOT",
    "STOP_BOT",
    "START_BOT",
  ],
  description: "Pause or resume the paper trading bot",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      (text.includes("pause") && text.includes("bot")) ||
      (text.includes("resume") && text.includes("bot")) ||
      (text.includes("stop") && text.includes("bot")) ||
      (text.includes("start") && text.includes("bot"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const paperTrading = runtime.getService(
        "VINCE_PAPER_TRADING_SERVICE",
      ) as VincePaperTradingService | null;

      if (!paperTrading) {
        await callback({
          text: "Paper trading bot is not active. Services still initializing.",
          actions: ["VINCE_BOT_PAUSE"],
        });
        return;
      }

      const text = message.content.text?.toLowerCase() || "";
      const shouldPause = text.includes("pause") || text.includes("stop");
      const shouldResume = text.includes("resume") || text.includes("start");

      if (shouldPause && !shouldResume) {
        const wasPaused = paperTrading.isPaused();

        if (wasPaused) {
          await callback({
            text: "Bot is already paused. Use `resume bot` to start trading again.",
            actions: ["VINCE_BOT_PAUSE"],
          });
          return;
        }

        paperTrading.pause("Manual pause requested");

        await callback({
          text:
            "⏸️ **Bot Paused**\n\nPaper trading paused. No new positions until you resume.\nExisting positions still monitored for SL/TP." +
            BOT_FOOTER,
          actions: ["VINCE_BOT_PAUSE"],
        });

        logger.info("[VINCE_BOT_PAUSE] Bot paused by user");
        return;
      }

      if (shouldResume && !shouldPause) {
        const wasPaused = paperTrading.isPaused();

        if (!wasPaused) {
          await callback({
            text: "Bot is already active. Use `pause bot` to stop trading.",
            actions: ["VINCE_BOT_PAUSE"],
          });
          return;
        }

        paperTrading.resume();

        await callback({
          text:
            "🟢 **Bot Resumed**\n\nPaper trading active. Evaluating signals and opening positions when conditions are met." +
            BOT_FOOTER,
          actions: ["VINCE_BOT_PAUSE"],
        });

        logger.info("[VINCE_BOT_PAUSE] Bot resumed by user");
        return;
      }

      // Unclear intent
      await callback({
        text: "I'm not sure what you want to do. Try:\n\n- `pause bot` - Stop opening new positions\n- `resume bot` - Start trading again",
        actions: ["VINCE_BOT_PAUSE"],
      });
    } catch (error) {
      logger.error(`[VINCE_BOT_PAUSE] Error: ${error}`);
      await callback({
        text: "Unable to change bot state right now. Try again in a moment.",
        actions: ["VINCE_BOT_PAUSE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "pause bot" } },
      {
        name: "VINCE",
        content: {
          text: "⏸️ **Bot Paused**\n\nPaper trading paused. No new positions until you resume.\nExisting positions still monitored for SL/TP.\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_BOT_PAUSE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "resume bot" } },
      {
        name: "VINCE",
        content: {
          text: "🟢 **Bot Resumed**\n\nPaper trading active. Evaluating signals and opening positions when conditions are met.\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_BOT_PAUSE"],
        },
      },
    ],
  ],
};
