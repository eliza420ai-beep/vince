import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { getHealth, isGatewayConfigured } from "../services/gatewayClient.service";

export const openclawGatewayStatusAction: Action = {
  name: "OPENCLAW_GATEWAY_STATUS",
  similes: ["OPENCLAW_STATUS", "GATEWAY_STATUS", "GATEWAY_HEALTH", "OPENCLAW_HEALTH"],
  description: "Check OpenClaw Gateway health/status. Returns data from OpenClaw Gateway health endpoint when OPENCLAW_GATEWAY_URL is set; otherwise explains that Gateway URL is optional for in-process research.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+(status|health|gateway)/i.test(text) ||
      /gateway\s+(status|health|running)/i.test(text) ||
      /is\s+(the\s+)?gateway\s+(up|running)/i.test(text) ||
      /openclaw\s+status/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (!isGatewayConfigured()) {
      const text =
        "Gateway URL is not set. Set OPENCLAW_GATEWAY_URL to check Gateway status. For in-process research you don't need a Gateway.";
      if (callback) await callback({ text, actions: ["OPENCLAW_GATEWAY_STATUS"] });
      return { success: true, text };
    }
    const health = await getHealth();
    const line = health.ok
      ? "Gateway: ok."
      : `Gateway: ${health.status} — ${health.message ?? "Is \`openclaw gateway\` running?"} Check that \`openclaw gateway\` is running and OPENCLAW_GATEWAY_URL is correct.`;
    if (callback) await callback({ text: line, actions: ["OPENCLAW_GATEWAY_STATUS"] });
    return { success: true, text: line };
  },
  examples: [
    [
      { name: "user", content: { text: "Is the OpenClaw gateway running?" } },
      {
        name: "assistant",
        content: {
          text: "Gateway: ok.",
          actions: ["OPENCLAW_GATEWAY_STATUS"],
        },
      },
    ],
    [
      { name: "user", content: { text: "openclaw status" } },
      {
        name: "assistant",
        content: {
          text: "Gateway: unreachable — fetch failed. Is `openclaw gateway` running?",
          actions: ["OPENCLAW_GATEWAY_STATUS"],
        },
      },
    ],
  ],
};
