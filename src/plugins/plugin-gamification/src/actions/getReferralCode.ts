import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from "@elizaos/core";
import { ReferralService } from "../services/ReferralService";

function getReferralBaseUrl(runtime: IAgentRuntime): string {
  const base =
    (runtime.getSetting("GAMIFICATION_REFERRAL_BASE_URL") as string) ||
    process.env.GAMIFICATION_REFERRAL_BASE_URL ||
    "https://otaku.so";
  return base.replace(/\/$/, "");
}

export const getReferralCodeAction: Action = {
  name: "GET_REFERRAL_CODE",
  description: "Your invite link and how it's doing.",
  similes: ["REFERRAL_CODE", "MY_REFERRAL", "INVITE_LINK", "SHARE_CODE"],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const referralService = runtime.getService("referral") as ReferralService;
      if (!referralService) {
        const errorText = "Referral service unavailable.";
        await callback?.({
          text: errorText,
        });
        return {
          text: errorText,
          success: false,
        };
      }

      const { code, stats } = await referralService.getOrCreateCode(
        message.entityId,
      );
      const baseUrl = getReferralBaseUrl(runtime);
      const link = `${baseUrl}?ref=${code}`;

      const text = `**Your invite link** \`${code}\`

${link}

Signups: ${stats.totalReferrals} · Activated: ${stats.activatedReferrals} · Points earned: ${stats.totalPointsEarned.toLocaleString()}`;

      const data = { code, stats, referralLink: link };

      await callback?.({
        text,
        data,
      });

      return {
        text,
        success: true,
        data,
      };
    } catch (error) {
      const errorText = "Could not load referral.";
      await callback?.({
        text: errorText,
      });
      return {
        text: errorText,
        success: false,
      };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "My referral link" } },
      {
        name: "agent",
        content: {
          text: "Here’s your invite link and stats.",
          actions: ["GET_REFERRAL_CODE"],
        },
      },
    ],
  ],
};
