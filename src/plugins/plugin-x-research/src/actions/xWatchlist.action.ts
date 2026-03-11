/**
 * X Watchlist Action
 *
 * Read-only check of the user's X watchlist (same file as skills/x-research CLI).
 * Add/remove accounts via CLI: cd skills/x-research && bun run x-search.ts watchlist add|remove <username>
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { initXClientFromEnv } from "../services/xClient.service";
import { getXAccountsService } from "../services/xAccounts.service";
import { formatCostFooterCombined } from "../constants/cost";
import type { XTweet } from "../types/tweet.types";
import { getWatchlistPath, loadWatchlist } from "../utils/watchlist";
import { sendActionResponse } from "./helpers/actionResponse";
import {
  formatTradingSignalBlock,
  inferTradingSignalFromTexts,
  scoreTweetForQuality,
} from "./helpers/signalScoring";

const MAX_ACCOUNTS = 10;
const TWEETS_PER_ACCOUNT = 3;

function formatTweet(t: XTweet): string {
  const text = t.text.slice(0, 200) + (t.text.length > 200 ? "…" : "");
  const likes = t.metrics?.likeCount ?? 0;
  return `  • ${text}\n    ${likes} likes`;
}

function rankWatchlistTweets(tweets: XTweet[]): XTweet[] {
  return [...tweets].sort(
    (a, b) => scoreTweetForQuality(b) - scoreTweetForQuality(a),
  );
}

export const xWatchlistAction: Action = {
  name: "X_WATCHLIST",
  description:
    'Check the user\'s X watchlist — recent tweets from accounts they follow for research. Use when asked "check my watchlist", "my x watchlist", "what did my watchlist post". Add/remove accounts via CLI only.',

  similes: ["X_WATCHLIST_CHECK", "WATCHLIST_CHECK", "MY_X_WATCHLIST"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Check my X watchlist" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "📋 **X Watchlist**\n\n**@user1** (note)\n  • Tweet text…\n    42 likes\n\n**@user2**\n  • Another tweet…\n    12 likes",
          action: "X_WATCHLIST",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    const triggers = [
      "watchlist",
      "check watchlist",
      "my x watchlist",
      "my twitter watchlist",
      "what did my watchlist",
      "watchlist check",
    ];
    return triggers.some((t) => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    try {
      initXClientFromEnv(runtime);
      const accounts = loadWatchlist();
      if (accounts.length === 0) {
        await sendActionResponse(callback, "X_WATCHLIST", {
          text: "📋 **X Watchlist**\n\nWatchlist is empty or not found (reason: no_target). Add accounts via CLI:\n`cd skills/x-research && bun run x-search.ts watchlist add <username>`",
        });
        return { success: true };
      }

      const accountsService = getXAccountsService();
      const toCheck = accounts.slice(0, MAX_ACCOUNTS);
      const lines: string[] = ["📋 **X Watchlist**\n"];
      let totalPosts = 0;
      const allScoredTexts: string[] = [];

      for (const acct of toCheck) {
        const label = acct.note
          ? `**@${acct.username}** (${acct.note})`
          : `**@${acct.username}**`;
        lines.push(label);
        try {
          const tweets = await accountsService.getRecentTakes(
            acct.username,
            TWEETS_PER_ACCOUNT,
          );
          const ranked = rankWatchlistTweets(tweets);
          totalPosts += ranked.length;
          allScoredTexts.push(...ranked.map((t) => t.text));
          if (ranked.length === 0) {
            lines.push("  No recent tweets.");
          } else {
            ranked.forEach((t) => lines.push(formatTweet(t)));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lines.push(`  Error: ${msg}`);
        }
        lines.push("");
      }

      if (accounts.length > MAX_ACCOUNTS) {
        lines.push(
          `_Showing first ${MAX_ACCOUNTS} of ${accounts.length} accounts._`,
        );
      }

      let body = lines.join("\n").trimEnd();
      const signal = inferTradingSignalFromTexts(
        allScoredTexts.slice(0, 25),
        3,
      );
      body += `\n\n${formatTradingSignalBlock(signal)}`;
      if (process.env.X_RESEARCH_SHOW_COST === "true") {
        body += `\n\n${formatCostFooterCombined({ userLookups: toCheck.length, postReads: totalPosts })}`;
      }

      await sendActionResponse(callback, "X_WATCHLIST", {
        text: body,
      });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("X_BEARER_TOKEN")) {
        await sendActionResponse(callback, "X_WATCHLIST", {
          text: "📋 **X Watchlist**\n\n⚠️ X API not configured (reason: api_limited). Set `X_BEARER_TOKEN` to enable watchlist check.",
        });
      } else {
        logger.warn({ err: error }, "[X_WATCHLIST] Error");
        await sendActionResponse(callback, "X_WATCHLIST", {
          text: `📋 **X Watchlist**\n\n❌ Error (reason: api_limited): ${errMsg}`,
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default xWatchlistAction;
