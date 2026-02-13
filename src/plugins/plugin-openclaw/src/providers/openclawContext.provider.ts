/**
 * OpenClaw context provider.
 * Injects a short paragraph about OpenClaw (what it is, in-process vs Gateway, setup/status) only when
 * the recent message or state mention OpenClaw, setup, gateway, or claw. Does not run on every turn.
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { isGatewayConfigured } from "../services/gatewayClient.service";

const OPENCLAW_CONTEXT_KEYWORDS = [
  "openclaw",
  "open claw",
  "claw",
  "gateway",
  "setup",
  "install",
  "configure",
  "clawdbot",
  "moltbot",
  "research agent",
];

function hasOpenClawContext(text: string): boolean {
  const lower = text.toLowerCase();
  return OPENCLAW_CONTEXT_KEYWORDS.some((k) => lower.includes(k));
}

export const openclawContextProvider: Provider = {
  name: "openclawContext",
  description: "Short OpenClaw context when the user talks about OpenClaw, gateway, or setup.",
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<{ text?: string; values?: Record<string, unknown> }> => {
    const msgText = (message?.content?.text ?? "") as string;
    const stateText = (state?.text ?? "") as string;
    const combined = `${msgText} ${stateText}`;
    if (!hasOpenClawContext(combined)) {
      return {};
    }
    const gatewaySet = isGatewayConfigured();
    const paragraph =
      "OpenClaw is a self-hosted gateway (default port 18789) that connects chat apps to AI agents. " +
      "This plugin can run crypto research in-process (no Gateway required) or use the OpenClaw Gateway when OPENCLAW_GATEWAY_URL is set. " +
      (gatewaySet ? "Gateway URL is set; you can ask for \"gateway status\" to check health. " : "Gateway URL is not set. ") +
      "Ask for \"OpenClaw setup\" or \"OpenClaw setup guide\" for step-by-step install and configuration.";
    return {
      text: paragraph,
      values: { openclawContext: paragraph, openclawGatewayConfigured: gatewaySet },
    };
  },
};
