import {
  type Action,
  type IAgentRuntime,
  logger,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
} from "@elizaos/core";
import { BankrAgentService } from "../services/bankr-agent.service";

export const bankrUserInfoAction: Action = {
  name: "BANKR_USER_INFO",
  description:
    "Get the authenticated Bankr account info: wallet addresses (EVM, Solana), connected social accounts, Bankr Club status, referral code, and leaderboard score/rank. Use when the user asks what wallets they have, if they have Bankr Club, or their Bankr profile.",
  similes: ["BANKR_WHOAMI", "BANKR_ACCOUNT", "BANKR_PROFILE", "BANKR_WALLETS"],

  validate: async (runtime: IAgentRuntime) => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    return !!service?.isConfigured();
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service) {
      const err = "Bankr Agent service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      const info = await service.getAccountInfo();
      const parts: string[] = [];

      if (info.wallets?.length) {
        parts.push(
          "**Wallets:** " +
            info.wallets.map((w) => `${w.chain}: \`${w.address}\``).join(", ")
        );
      }
      if (info.socialAccounts?.length) {
        parts.push(
          "**Socials:** " +
            info.socialAccounts
              .map((s) => `${s.platform}${s.username ? ` @${s.username}` : ""}`)
              .join(", ")
        );
      }
      if (info.bankrClub) {
        const club = info.bankrClub;
        parts.push(
          `**Bankr Club:** ${club.active ? "Active" : "Inactive"}${club.subscriptionType ? ` (${club.subscriptionType})` : ""}`
        );
      }
      if (info.refCode) {
        parts.push(`**Ref code:** ${info.refCode}`);
      }
      if (info.leaderboard) {
        parts.push(
          `**Score:** ${info.leaderboard.score}${info.leaderboard.rank != null ? `, rank ${info.leaderboard.rank}` : ""}`
        );
      }

      const reply = parts.length ? parts.join("\n") : "No profile data returned.";
      callback?.({
        text: reply,
        actions: ["BANKR_USER_INFO"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { userInfo: info } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_USER_INFO] " + msg);
      callback?.({ text: `Bankr user info failed: ${msg}`, actions: ["BANKR_USER_INFO"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "What wallets do I have on Bankr?" } },
      { name: "Otaku", content: { text: "Wallets: evm: `0x…`, …", actions: ["BANKR_USER_INFO"] } },
    ],
    [
      { name: "user", content: { text: "Am I in Bankr Club?" } },
      { name: "Otaku", content: { text: "Bankr Club: Active (monthly)", actions: ["BANKR_USER_INFO"] } },
    ],
  ],
};
