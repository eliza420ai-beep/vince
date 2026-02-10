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
import type { SignSignatureType } from "../types";

function getSignParams(state?: State): {
  signatureType: SignSignatureType;
  payload: Record<string, unknown> | string;
} | null {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const signatureType = params.signatureType as string | undefined;
  const payload = params.payload;
  if (
    !signatureType ||
    !["personal_sign", "eth_signTypedData_v4", "eth_signTransaction"].includes(signatureType)
  ) {
    return null;
  }
  if (payload === undefined || payload === null) return null;
  if (typeof payload === "string") return { signatureType: signatureType as SignSignatureType, payload };
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return { signatureType: signatureType as SignSignatureType, payload: payload as Record<string, unknown> };
  }
  return null;
}

export const bankrAgentSignAction: Action = {
  name: "BANKR_AGENT_SIGN",
  description:
    "Sign a message or transaction using the Bankr custodial wallet (synchronous, no job polling). Use for personal_sign (hex message), eth_signTypedData_v4 (EIP-712 typed data e.g. permits, order signatures, cancel signatures), or eth_signTransaction (transaction object). Requires actionParams: signatureType, payload.",
  similes: ["BANKR_SIGN", "BANKR_SIGN_MESSAGE", "BANKR_SIGN_TYPED_DATA", "BANKR_SIGN_TX"],

  validate: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service?.isConfigured()) return false;
    return !!getSignParams(state);
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

    const signParams = getSignParams(state);
    if (!signParams) {
      const err =
        "Missing or invalid sign params: need actionParams.signatureType (personal_sign | eth_signTypedData_v4 | eth_signTransaction) and actionParams.payload.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      const result = await service.sign({
        signatureType: signParams.signatureType,
        payload: signParams.payload,
      });
      if (!result.success || result.signature == null) {
        const msg = result.error || result.message || "Sign returned no signature.";
        callback?.({ text: msg, actions: ["BANKR_AGENT_SIGN"] });
        return { success: false, text: msg };
      }
      const reply = `Signed. Signature: \`${result.signature}\``;
      callback?.({
        text: reply,
        actions: ["BANKR_AGENT_SIGN"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { signature: result.signature } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_AGENT_SIGN] " + msg);
      callback?.({ text: `Bankr sign failed: ${msg}`, actions: ["BANKR_AGENT_SIGN"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Sign this EIP-712 cancel order data" } },
      { name: "Otaku", content: { text: "Signed. Signature: `0x…`", actions: ["BANKR_AGENT_SIGN"] } },
    ],
  ],
};
