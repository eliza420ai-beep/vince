import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
} from "@elizaos/core";
import { BankrSdkService } from "../services/bankr-sdk.service";

function getPromptFromMessageOrState(
  message: Memory,
  state?: State,
): string | null {
  const text = message?.content?.text?.trim();
  if (text) return text;
  const actionParams = state?.data?.actionParams as
    | Record<string, unknown>
    | undefined;
  const prompt = actionParams?.prompt ?? actionParams?.text;
  if (typeof prompt === "string" && prompt.trim()) return prompt.trim();
  return null;
}

export const bankrSdkPromptAction: Action = {
  name: "BANKR_SDK_PROMPT",
  description:
    "Send a natural-language prompt to Bankr using the SDK (own wallet, x402 payment). Same kinds of prompts as BANKR_AGENT_PROMPT (portfolio, balances, transfers, swaps, limit/stop/DCA/TWAP, leveraged, token launch, NFTs, etc.), but executed via @bankr/sdk: you get the response and any transaction data; you must submit transactions to the chain yourself. Use when the user or agent is configured with BANKR_PRIVATE_KEY and wants SDK-based execution (e.g. own wallet, x402) instead of the Agent API.",
  similes: ["BANKR_SDK", "BANKR_SDK_EXECUTE", "BANKR_PROMPT_SDK"],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const service = runtime.getService<BankrSdkService>(
      BankrSdkService.serviceType,
    );
    if (!service?.isConfigured()) return false;
    const prompt = getPromptFromMessageOrState(message);
    return !!prompt;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const prompt = getPromptFromMessageOrState(message, state);
    if (!prompt) {
      const err = "No prompt text found for Bankr SDK.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const service = runtime.getService<BankrSdkService>(
      BankrSdkService.serviceType,
    );
    if (!service) {
      const err = "Bankr SDK service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      callback?.({
        text: "Bankr SDK: sending prompt…",
        actions: ["BANKR_SDK_PROMPT"],
      });

      const result = await service.promptAndWait({ prompt });

      if (result.status === "failed" && result.error) {
        const errMsg = result.error;
        callback?.({
          text: `Bankr SDK job failed: ${errMsg}`,
          actions: ["BANKR_SDK_PROMPT"],
        });
        return {
          success: false,
          text: errMsg,
          data: { status: result.status },
        };
      }

      if (result.status === "cancelled") {
        callback?.({
          text: "Bankr SDK job was cancelled.",
          actions: ["BANKR_SDK_PROMPT"],
        });
        return {
          success: true,
          text: "Job cancelled.",
          data: { status: result.status },
        };
      }

      const responseText =
        result.response ?? result.error ?? "No response from Bankr.";
      const txCount = result.transactions?.length ?? 0;
      const txNote =
        txCount > 0
          ? `\n\n**Note:** This response includes ${txCount} transaction(s) that you must submit to the blockchain yourself (e.g. with viem). The SDK returns transaction data; it does not execute them.`
          : "";

      const fullText = responseText + txNote;
      callback?.({ text: fullText, actions: ["BANKR_SDK_PROMPT"] });

      return {
        success: true,
        text: fullText,
        data: {
          response: result.response,
          status: result.status,
          transactionCount: txCount,
          transactions: result.transactions,
        },
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      const msg = err.includes("Payment required")
        ? "Bankr SDK: insufficient USDC on Base for x402 payment."
        : `Bankr SDK error: ${err}`;
      callback?.({ text: msg, actions: ["BANKR_SDK_PROMPT"] });
      return { success: false, text: msg };
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "What is the price of ETH? (use Bankr SDK)" },
      },
      {
        name: "Otaku",
        content: {
          text: "ETH is currently trading at $3,245.67.",
          actions: ["BANKR_SDK_PROMPT"],
        },
      },
    ],
  ],
};
