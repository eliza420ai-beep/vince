import type { Plugin } from "@elizaos/core";
import { BankrAgentService, BankrOrdersService } from "./services";
import {
  bankrAgentPromptAction,
  bankrAgentCancelJobAction,
  bankrAgentSignAction,
  bankrAgentSubmitAction,
  bankrUserInfoAction,
  bankrJobStatusAction,
  bankrOrderQuoteAction,
  bankrOrderListAction,
  bankrOrderStatusAction,
  bankrOrderCancelAction,
} from "./actions";

/**
 * Bankr plugin: Agent API + External Orders API.
 * - BANKR_AGENT_PROMPT: send natural-language prompts (portfolio, transfers, swaps, limit/stop/DCA/TWAP, leveraged, token launch).
 * - BANKR_USER_INFO: get account wallets, Bankr Club, leaderboard.
 * - BANKR_JOB_STATUS / BANKR_AGENT_CANCEL_JOB: get status or cancel a prompt job.
 * - BANKR_AGENT_SIGN / BANKR_AGENT_SUBMIT: synchronous sign (EIP-712, personal_sign, signTx) and submit raw tx.
 * - BANKR_ORDER_QUOTE / LIST / STATUS / CANCEL: quote, list, status, and cancel External Orders.
 * Requires BANKR_API_KEY. Optional: BANKR_AGENT_URL, BANKR_ORDER_URL.
 * @see https://bankr.bot/api
 * @see https://github.com/BankrBot/bankr-api-examples
 * @see https://github.com/BankrBot/trading-engine-api-example
 */
export const bankrPlugin: Plugin = {
  name: "bankr",
  description:
    "Bankr Agent API and External Orders API: prompt chat, user info, job status/cancel, sign/submit, and quote/list/status/cancel for limit, stop, DCA, TWAP orders.",
  services: [BankrAgentService, BankrOrdersService],
  actions: [
    bankrAgentPromptAction,
    bankrUserInfoAction,
    bankrJobStatusAction,
    bankrAgentCancelJobAction,
    bankrAgentSignAction,
    bankrAgentSubmitAction,
    bankrOrderQuoteAction,
    bankrOrderListAction,
    bankrOrderStatusAction,
    bankrOrderCancelAction,
  ],
  evaluators: [],
  providers: [],
};

export default bankrPlugin;
export { BankrAgentService, BankrOrdersService } from "./services";
export * from "./types";
