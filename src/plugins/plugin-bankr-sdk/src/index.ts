import type { Plugin } from "@elizaos/core";
import { BankrSdkService } from "./services";
import { bankrSdkPromptAction } from "./actions";

/**
 * Bankr SDK plugin: @bankr/sdk with own wallet and x402 payment.
 * - BANKR_SDK_PROMPT: send prompt, get response and optional transaction data (you submit txs yourself).
 * Requires BANKR_PRIVATE_KEY. Optional: BANKR_AGENT_URL, BANKR_SDK_TIMEOUT, BANKR_SDK_WALLET_ADDRESS.
 * Not loaded by Otaku by default (Otaku uses plugin-bankr / Agent API).
 * @see knowledge/bankr/docs-sdk.md
 * @see https://docs.bankr.bot/sdk/installation
 */
export const bankrSdkPlugin: Plugin = {
  name: "bankr-sdk",
  description:
    "Bankr via @bankr/sdk: send prompts with own wallet and x402 payment; returns response and transaction data for you to submit.",
  services: [BankrSdkService],
  actions: [bankrSdkPromptAction],
  evaluators: [],
  providers: [],
};

export default bankrSdkPlugin;
export { BankrSdkService } from "./services";
export type { JobStatus, Transaction } from "./types";
