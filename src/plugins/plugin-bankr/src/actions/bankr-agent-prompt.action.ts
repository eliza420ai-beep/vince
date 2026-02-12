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

function getPromptFromMessageOrState(message: Memory, state?: State): string | null {
  const text = message?.content?.text?.trim();
  if (text) return text;
  const actionParams = state?.data?.actionParams as Record<string, unknown> | undefined;
  const prompt = actionParams?.prompt ?? actionParams?.text;
  if (typeof prompt === "string" && prompt.trim()) return prompt.trim();
  return null;
}

export const bankrAgentPromptAction: Action = {
  name: "BANKR_AGENT_PROMPT",
  description:
    "Send a natural-language prompt to the Bankr AI agent. The user's message is sent as the prompt; Bankr executes or answers. Covers: portfolio & balances (what are my balances?, show my portfolio, portfolio worth, token prices, charts); transfers (send ETH/SOL/tokens to address, ENS, or social handle); token swaps (swap/buy/sell by USD, amount, or %, chain-specific, cross-chain); limit/stop/DCA/TWAP order creation (buy/sell when price…, DCA $X into Y every…, TWAP sell…); leveraged trading via Avantis (long/short, commodities, forex, crypto); NFTs (show my NFTs, value); Polymarket (bets, positions); automations (show/cancel). Submit prompt, poll until complete, return response and any transaction details. Use when the user wants to ask Bankr, run something via Bankr, or execute any of the above.",
  similes: ["ASK_BANKR", "RUN_BANKR", "BANKR_EXECUTE", "BANKR_CHAT"],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service?.isConfigured()) return false;
    const prompt = getPromptFromMessageOrState(message);
    return !!prompt;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const prompt = getPromptFromMessageOrState(message, state);
    if (!prompt) {
      const err = "No prompt text found for Bankr.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service) {
      const err = "Bankr Agent service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      callback?.({ text: "Sending to Bankr…" });
      const { jobId } = await service.submitPrompt(prompt);

      let result = await service.getJobStatus(jobId);
      if (result.status !== "completed" && result.status !== "failed" && result.status !== "cancelled") {
        callback?.({
          text: `Bankr job \`${jobId}\` started. Waiting for result…`,
          actions: ["BANKR_AGENT_PROMPT"],
        });
        result = await service.pollJobUntilComplete(jobId, {
          intervalMs: 1500,
          maxAttempts: 120,
          onStatus: (status, msg) => {
            if (status === "pending" || status === "processing") {
              callback?.({ text: `Bankr: ${msg}`, actions: ["BANKR_AGENT_PROMPT"] });
            }
          },
        });
      }

      if (result.status === "cancelled") {
        callback?.({ text: "Bankr job was cancelled.", actions: ["BANKR_AGENT_PROMPT"] });
        return { success: true, text: "Cancelled" };
      }

      if (result.status === "failed") {
        const errMsg = result.error || "Bankr job failed.";
        callback?.({ text: `Bankr failed: ${errMsg}`, actions: ["BANKR_AGENT_PROMPT"] });
        return { success: false, text: errMsg };
      }

      let reply = result.response || "Bankr completed with no text response.";
      if (result.transactions?.length) {
        reply += "\n\n**Transactions:**";
        for (const tx of result.transactions) {
          const meta = tx.metadata;
          const human = meta?.humanReadableMessage;
          const inT = meta?.inputTokenTicker && meta?.inputTokenAmount ? ` ${meta.inputTokenAmount} ${meta.inputTokenTicker}` : "";
          const outT = meta?.outputTokenTicker && meta?.outputTokenAmount ? ` → ${meta.outputTokenAmount} ${meta.outputTokenTicker}` : "";
          reply += `\n- ${human || tx.type || "tx"}${inT}${outT}`;
        }
      }

      callback?.({
        text: reply,
        actions: ["BANKR_AGENT_PROMPT"],
        source: message.content?.source,
      });
      return { success: true, text: reply };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_AGENT_PROMPT] " + message);
      callback?.({ text: `Bankr error: ${message}`, actions: ["BANKR_AGENT_PROMPT"] });
      return { success: false, text: message, error: err instanceof Error ? err : new Error(message) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Ask Bankr what my Base balance is" } },
      { name: "Otaku", content: { text: "Checking with Bankr…", actions: ["BANKR_AGENT_PROMPT"] } },
    ],
    [
      { name: "user", content: { text: "Run a swap of 10 USDC for ETH on Base via Bankr" } },
      { name: "Otaku", content: { text: "Sending to Bankr…", actions: ["BANKR_AGENT_PROMPT"] } },
    ],
    [
      { name: "user", content: { text: "Show my portfolio" } },
      { name: "Otaku", content: { text: "Sending to Bankr…", actions: ["BANKR_AGENT_PROMPT"] } },
    ],
    [
      { name: "user", content: { text: "DCA $100 into BNKR every day" } },
      { name: "Otaku", content: { text: "Sending to Bankr…", actions: ["BANKR_AGENT_PROMPT"] } },
    ],
    [
      { name: "user", content: { text: "Send 0.1 ETH to vitalik.eth" } },
      { name: "Otaku", content: { text: "Sending to Bankr…", actions: ["BANKR_AGENT_PROMPT"] } },
    ],
  ],
};
