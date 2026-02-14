/**
 * ERC8004_REGISTER - Register agent identity on-chain
 *
 * Mints an ERC-721 token representing the agent's identity
 * in the ERC-8004 Identity Registry.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { ERC8004Service } from "../services";
import type { AgentEndpoint, TrustModel } from "../types";

export const erc8004RegisterAction: Action = {
  name: "ERC8004_REGISTER",
  description:
    "Register this agent's identity on the ERC-8004 Identity Registry. Creates an on-chain NFT representing the agent.",
  similes: [
    "REGISTER_AGENT",
    "CREATE_AGENT_IDENTITY",
    "MINT_AGENT_NFT",
    "ONCHAIN_IDENTITY",
  ],
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Register Otaku on ERC-8004" },
      },
      {
        name: "Otaku",
        content: {
          text: "✅ Agent registered on ERC-8004 Identity Registry!\n\n**Agent ID:** 42\n**Name:** Otaku\n**TX:** 0x...",
          actions: ["ERC8004_REGISTER"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("register") &&
      (text.includes("erc-8004") ||
        text.includes("erc8004") ||
        text.includes("trustless") ||
        text.includes("identity"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const erc8004 = runtime.getService("erc8004") as ERC8004Service;

    if (!erc8004) {
      await callback?.({
        text: "ERC-8004 service not available. Check plugin configuration.",
      });
      return { success: false, error: new Error("ERC-8004 service not available") };
    }

    if (!erc8004.canWrite()) {
      await callback?.({
        text: "Cannot register: wallet not configured. Set ERC8004_PRIVATE_KEY or CDP_WALLET_SECRET.",
      });
      return { success: false, error: new Error("Wallet not configured") };
    }

    // Get agent info from runtime
    const agentName = runtime.character?.name || "Otaku";
    const agentDescription =
      runtime.character?.system?.slice(0, 200) ||
      "DeFi execution agent for the VINCE dream team";

    // Build endpoints
    const endpoints: AgentEndpoint[] = [
      {
        name: "A2A",
        endpoint: `https://api.vince.ai/agents/${runtime.agentId}/.well-known/agent-card.json`,
        version: "0.3.0",
      },
    ];

    // Add wallet endpoint if available
    const cdp = runtime.getService("cdp") as { getWalletAddress?: () => Promise<string> } | null;
    if (cdp?.getWalletAddress) {
      try {
        const address = await cdp.getWalletAddress();
        endpoints.push({
          name: "Wallet",
          endpoint: address,
        });
      } catch {
        // Ignore
      }
    }

    await callback?.({
      text: `Registering **${agentName}** on ERC-8004 Identity Registry...`,
    });

    const result = await erc8004.registerAgent({
      name: agentName,
      description: agentDescription,
      endpoints,
      supportedTrust: ["reputation", "crypto-economic"],
    });

    if (result.success) {
      await callback?.({
        text: [
          `✅ Agent registered on ERC-8004!`,
          ``,
          `**Agent ID:** ${result.agentId}`,
          `**Name:** ${agentName}`,
          `**TX:** ${result.txHash?.slice(0, 20)}...`,
          ``,
          `Your agent identity is now discoverable on-chain.`,
        ].join("\n"),
      });
      return { success: true };
    } else {
      await callback?.({
        text: `❌ Registration failed: ${result.error}`,
      });
      return { success: false, error: new Error(result.error ?? "Registration failed") };
    }
  },
};

export default erc8004RegisterAction;
