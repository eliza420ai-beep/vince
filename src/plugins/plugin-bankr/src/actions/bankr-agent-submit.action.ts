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

function getSubmitParams(state?: State): {
  transaction: Record<string, unknown> | string;
  waitForConfirmation?: boolean;
  description?: string;
} | null {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const transaction = params.transaction;
  if (transaction === undefined || transaction === null) return null;
  const description = typeof params.description === "string" ? params.description : undefined;
  const waitForConfirmation = params.waitForConfirmation === true;
  if (typeof transaction === "string") {
    return { transaction, waitForConfirmation, description };
  }
  if (typeof transaction === "object" && !Array.isArray(transaction)) {
    return { transaction: transaction as Record<string, unknown>, waitForConfirmation, description };
  }
  return null;
}

export const bankrAgentSubmitAction: Action = {
  name: "BANKR_AGENT_SUBMIT",
  description:
    "Submit a raw or signed transaction to the chain using Bankr (synchronous). Use when you have calldata or a signed transaction ready. Requires actionParams: transaction (hex or object). Optionally actionParams.waitForConfirmation (boolean) to wait for confirmation.",
  similes: ["BANKR_SUBMIT", "BANKR_SUBMIT_TX", "BANKR_BROADCAST"],

  validate: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service?.isConfigured()) return false;
    return !!getSubmitParams(state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service) {
      const err = "Bankr Agent service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const submitParams = getSubmitParams(state);
    if (!submitParams) {
      const err = "Missing actionParams.transaction (hex string or transaction object).";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      const result = await service.submitTransaction({
        transaction: submitParams.transaction,
        waitForConfirmation: submitParams.waitForConfirmation,
        ...(submitParams.description && { description: submitParams.description }),
      });
      if (!result.success) {
        const msg = result.error || result.message || "Submit failed.";
        callback?.({ text: msg, actions: ["BANKR_AGENT_SUBMIT"] });
        return { success: false, text: msg };
      }
      const reply = result.txHash
        ? `Submitted. TxHash: \`${result.txHash}\``
        : "Submitted.";
      callback?.({
        text: reply,
        actions: ["BANKR_AGENT_SUBMIT"],
        source: message.content?.source,
      });
      return {
        success: true,
        text: reply,
        data: { txHash: result.txHash },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_AGENT_SUBMIT] " + msg);
      callback?.({ text: `Bankr submit failed: ${msg}`, actions: ["BANKR_AGENT_SUBMIT"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Submit this signed transaction" } },
      { name: "Otaku", content: { text: "Submitted. TxHash: `0x…`", actions: ["BANKR_AGENT_SUBMIT"] } },
    ],
  ],
};
