/**
 * OpenClaw context provider.
 * Injects context when the user talks about OpenClaw, gateway, setup, or AI (AI 2027, AGI, research agents).
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { isGatewayConfigured } from "../services/gatewayClient.service";

const OPENCLAW_KEYWORDS = [
  "openclaw", "open claw", "claw", "gateway", "setup", "install", "configure",
  "clawdbot", "moltbot",
];

const AI_KEYWORDS = [
  "ai 2027", "ai-2027", "agi", "alignment", "takeoff", "research agent",
  "openbrain", "superhuman ai", "coding agent",
];

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export const openclawContextProvider: Provider = {
  name: "openclawContext",
  description: "OpenClaw and AI context when the user talks about OpenClaw, gateway, setup, AI 2027, AGI, or research agents.",
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<{ text?: string; values?: Record<string, unknown> }> => {
    const msgText = (message?.content?.text ?? "") as string;
    const stateText = (state?.text ?? "") as string;
    const combined = `${msgText} ${stateText}`;
    const hasOpenClaw = hasKeyword(combined, OPENCLAW_KEYWORDS);
    const hasAi = hasKeyword(combined, AI_KEYWORDS);
    if (!hasOpenClaw && !hasAi) return {};
    const gatewaySet = isGatewayConfigured();
    let paragraph = "OpenClaw is a self-hosted gateway (default port 18789) that connects chat apps to AI agents. ";
    if (hasAi) {
      paragraph += "AI 2027 describes research agents that scour the Internet; OpenClaw + openclaw-agents enable that today. ";
    }
    if (hasOpenClaw) {
      paragraph += "When OPENCLAW_GATEWAY_URL is set, the plugin uses the OpenClaw Gateway. ";
      paragraph += gatewaySet ? "Gateway URL is set; ask for \"gateway status\" to check health. " : "Gateway URL is not set. ";
      paragraph += "Ask for \"OpenClaw setup\" or \"OpenClaw setup guide\" for step-by-step install. ";
    } else if (hasAi) {
      paragraph += "Ask for \"AI 2027\" or \"research agents\" for more. Ask for \"OpenClaw setup\" for install.";
    }
    paragraph += "Only report action output. Never invent Gateway status, prices, or search results.";
    return {
      text: paragraph,
      values: { openclawContext: paragraph, openclawGatewayConfigured: gatewaySet },
    };
  },
};
