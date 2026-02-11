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
  getPortfolio,
  addHolding,
  removeHolding,
  formatPortfolio,
  getPortfolioTokens,
} from "../services/portfolio.service";

interface PortfolioActionParams {
  action?: "view" | "add" | "remove";
  token?: string;
  amount?: number;
  entryPrice?: number;
}

export const portfolioAction: Action = {
  name: "MANAGE_PORTFOLIO",
  similes: [
    "PORTFOLIO",
    "HOLDINGS",
    "MY_TOKENS",
    "ADD_HOLDING",
    "REMOVE_HOLDING",
    "BAG",
    "BAGS",
  ],
  description: `Manage your token portfolio for personalized research.

Commands:
- portfolio - View holdings
- add 10 SOL at 80 - Add holding with entry price
- remove SOL - Remove holding
- research portfolio - Research all holdings`,

  parameters: {
    action: {
      type: "string",
      description: "Action: view, add, remove",
      required: false,
    },
    token: {
      type: "string",
      description: "Token symbol",
      required: false,
    },
    amount: {
      type: "number",
      description: "Amount of tokens",
      required: false,
    },
    entryPrice: {
      type: "number",
      description: "Entry price in USD",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: PortfolioActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as PortfolioActionParams;

      const action = params.action || "view";
      const token = params.token?.toUpperCase();
      const amount = params.amount || 0;
      const entryPrice = params.entryPrice;

      let text = "";

      switch (action) {
        case "add":
          if (!token || amount <= 0) {
            text = `❌ **Specify token and amount**

Example: \`@VINCE add 10 SOL at 80\``;
            break;
          }
          
          const holding = addHolding(token, amount, entryPrice);
          text = `✅ **Added to portfolio**

💼 **${holding.token}:** ${holding.amount}
${entryPrice ? `💰 Entry: $${entryPrice}` : ""}

---
View: \`@VINCE portfolio\`
Research: \`@VINCE research portfolio\``;
          break;

        case "remove":
          if (!token) {
            text = `❌ **Specify token to remove**

Example: \`@VINCE remove SOL\``;
            break;
          }
          
          const removed = removeHolding(token);
          text = removed
            ? `✅ **Removed ${token} from portfolio**`
            : `❌ **${token} not in portfolio**`;
          break;

        case "view":
        default:
          const portfolio = getPortfolio();
          text = formatPortfolio(portfolio);
          break;
      }

      if (callback) {
        await callback({
          text,
          content: { action, token, amount },
          actions: ["MANAGE_PORTFOLIO"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, token, amount } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[MANAGE_PORTFOLIO] Failed: ${msg}`);

      const errorText = `❌ Portfolio error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Add 10 SOL at 80" } },
      { name: "{{agent}}", content: { text: "✅ **Added to portfolio**\n\n💼 **SOL:** 10...", actions: ["MANAGE_PORTFOLIO"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show my portfolio" } },
      { name: "{{agent}}", content: { text: "💼 **Portfolio** (3 tokens)...", actions: ["MANAGE_PORTFOLIO"] } },
    ],
  ],
};
