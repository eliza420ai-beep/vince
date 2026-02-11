import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import {
  getDeFiOverview,
  formatDeFiOverview,
  getNFTOverview,
  formatNFTOverview,
  getGasPrices,
  formatGasPrices,
  getSocialMetrics,
  formatSocialMetrics,
  getExchangeFlows,
  formatExchangeFlows,
  getTokenUnlocks,
  formatTokenUnlocks,
} from "../services/advanced.service";
import { checkRateLimit, getDailyCost, formatCost, calculateCost } from "../services/openclaw.service";

interface AdvancedActionParams {
  action?: "defi" | "nft" | "gas" | "social" | "flows" | "unlocks";
  token?: string;
  collection?: string;
}

export const advancedAction: Action = {
  name: "VIEW_ADVANCED",
  similes: [
    "DEFI",
    "DEFI_ANALYTICS",
    "TVL",
    "YIELDS",
    "NFT",
    "NFTS",
    "NFT_RESEARCH",
    "FLOOR",
    "GAS",
    "GAS_TRACKER",
    "GWEI",
    "SOCIAL",
    "TWITTER",
    "FOLLOWERS",
    "FLOWS",
    "EXCHANGE_FLOWS",
    "INFLOW",
    "OUTFLOW",
    "UNLOCKS",
    "TOKEN_UNLOCKS",
    "VESTING",
  ],
  description: `Advanced analytics: DeFi, NFT, Gas, Social, Exchange Flows, Token Unlocks.

Commands:
- defi - DeFi overview (TVL, protocols, yields)
- nft - NFT overview (collections, floors)
- nft CryptoPunks - Specific collection
- gas - Gas prices across chains
- social SOL - Social metrics for token
- flows - Exchange flows
- flows BTC - Flows for token
- unlocks - Upcoming token unlocks`,

  parameters: {
    action: {
      type: "string",
      description: "Action: defi, nft, gas, social, flows, unlocks",
      required: false,
    },
    token: {
      type: "string",
      description: "Token for social/flows",
      required: false,
    },
    collection: {
      type: "string",
      description: "NFT collection name",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: AdvancedActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as AdvancedActionParams;

      const action = params.action || "defi";
      const token = params.token?.toUpperCase();
      const collection = params.collection;

      // Rate limit
      const userId = message.content?.id || "unknown";
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const text = `⏰ Rate limited. Try again in ${rateLimit.retryAfter}s.`;
        if (callback) await callback({ text, content: { error: "rate_limited" } });
        return { text, success: false, error: "rate_limited" };
      }

      let text = "";
      const cost = calculateCost(400, 150);

      switch (action) {
        case "defi": {
          const data = getDeFiOverview();
          text = formatDeFiOverview(data);
          break;
        }

        case "nft": {
          const data = getNFTOverview(collection);
          text = formatNFTOverview(data);
          break;
        }

        case "gas": {
          const prices = getGasPrices();
          text = formatGasPrices(prices);
          break;
        }

        case "social": {
          if (!token) {
            text = `❌ **Specify a token**

Example: \`@VINCE social SOL\``;
            break;
          }
          const metrics = getSocialMetrics(token);
          text = formatSocialMetrics(metrics);
          break;
        }

        case "flows": {
          const flows = getExchangeFlows(token);
          text = formatExchangeFlows(flows);
          if (token) {
            text = text.replace("**Exchange Flows**", `**Exchange Flows: ${token}**`);
          }
          break;
        }

        case "unlocks": {
          const unlocks = getTokenUnlocks();
          text = formatTokenUnlocks(unlocks);
          break;
        }

        default: {
          const data = getDeFiOverview();
          text = formatDeFiOverview(data);
          break;
        }
      }

      // Add footer
      const daily = getDailyCost();
      text += `\n\n💰 ${formatCost(cost)} • ${rateLimit.remaining}/5 req/min`;

      if (callback) {
        await callback({
          text,
          content: { action, token, cost },
          actions: ["VIEW_ADVANCED"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, token, cost } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[VIEW_ADVANCED] Failed: ${msg}`);

      const errorText = `❌ Advanced analytics error: ${msg}`;
      if (callback) await callback({ text: errorText, content: { error: msg } });
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Show DeFi analytics" } },
      { name: "{{agent}}", content: { text: "🏦 **DeFi Analytics**\n\n💰 **Total TVL:** $95.2B...", actions: ["VIEW_ADVANCED"] } },
    ],
    [
      { name: "{{user}}", content: { text: "NFT floor prices" } },
      { name: "{{agent}}", content: { text: "🖼️ **NFT Research**\n\n**Top Collections:**...", actions: ["VIEW_ADVANCED"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Gas prices" } },
      { name: "{{agent}}", content: { text: "⛽ **Gas Tracker**\n\n**Ethereum:**...", actions: ["VIEW_ADVANCED"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Social metrics for SOL" } },
      { name: "{{agent}}", content: { text: "📱 **Social Metrics: SOL**\n\n**Twitter:**...", actions: ["VIEW_ADVANCED"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Exchange flows for BTC" } },
      { name: "{{agent}}", content: { text: "🏛️ **Exchange Flows: BTC**\n\n📥 In: 1500 BTC...", actions: ["VIEW_ADVANCED"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Upcoming token unlocks" } },
      { name: "{{agent}}", content: { text: "🔓 **Token Unlocks**\n\n🔴 **ARB** - 2024-02-14...", actions: ["VIEW_ADVANCED"] } },
    ],
  ],
};
