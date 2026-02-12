/**
 * ERC8004_REPUTATION - Check agent reputation on-chain
 *
 * Queries the ERC-8004 Reputation Registry for an agent's
 * trust score and feedback history.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { ERC8004Service } from "../services";

export const erc8004ReputationAction: Action = {
  name: "ERC8004_REPUTATION",
  description:
    "Check an agent's reputation score on the ERC-8004 Reputation Registry. Returns average score, total ratings, and top tags.",
  similes: [
    "CHECK_REPUTATION",
    "AGENT_REPUTATION",
    "TRUST_SCORE",
    "AGENT_RATING",
  ],
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Check reputation for agent #42" },
      },
      {
        name: "Otaku",
        content: {
          text: "**Agent #42 Reputation:**\n- Score: 87/100\n- Ratings: 156\n- Top tags: reliable, fast, accurate",
          actions: ["ERC8004_REPUTATION"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      (text.includes("reputation") || text.includes("trust") || text.includes("rating")) &&
      (text.includes("agent") || text.includes("erc-8004") || text.includes("erc8004") || text.includes("#"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    const erc8004 = runtime.getService("erc8004") as ERC8004Service;

    if (!erc8004) {
      await callback?.({
        text: "ERC-8004 service not available.",
      });
      return false;
    }

    // Extract agent ID from message
    const text = message.content?.text ?? "";
    const idMatch = text.match(/#(\d+)|agent\s+(\d+)|id\s+(\d+)/i);
    let agentId: bigint;

    if (idMatch) {
      agentId = BigInt(idMatch[1] || idMatch[2] || idMatch[3]);
    } else {
      // Check own reputation
      const ownId = await erc8004.getOwnAgentId();
      if (!ownId) {
        await callback?.({
          text: "Please specify an agent ID (e.g., \"reputation for agent #42\") or register first.",
        });
        return false;
      }
      agentId = ownId;
    }

    const reputation = await erc8004.getReputation(agentId);

    if (!reputation) {
      await callback?.({
        text: `Could not find reputation for agent #${agentId}. The agent may not be registered or have no ratings yet.`,
      });
      return false;
    }

    const scoreEmoji =
      reputation.averageScore >= 80
        ? "🟢"
        : reputation.averageScore >= 50
        ? "🟡"
        : "🔴";

    const lines = [
      `**Agent #${agentId} Reputation:**`,
      ``,
      `${scoreEmoji} **Score:** ${reputation.averageScore}/100`,
      `📊 **Total Ratings:** ${reputation.totalRatings}`,
    ];

    if (reputation.topTags.length > 0) {
      lines.push(`🏷️ **Top Tags:** ${reputation.topTags.join(", ")}`);
    }

    if (reputation.percentile) {
      lines.push(`📈 **Percentile:** Top ${100 - reputation.percentile}%`);
    }

    await callback?.({ text: lines.join("\n") });
    return true;
  },
};

export default erc8004ReputationAction;
