/**
 * KELLY_RESEARCH_QUEUE Action (#71)
 *
 * Displays the prioritized research queue for Echo and Vince.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  ResearchQueueService,
  type ResearchQueueItem,
} from "../services/researchQueue.service";

function formatItem(item: ResearchQueueItem): string {
  const assignee =
    item.assignedTo === "both" ? "Echo + Vince" : item.assignedTo;
  const asset = item.asset ? ` [${item.asset}]` : "";
  const source = item.source;
  return `- ${item.topic}${asset} (${assignee}, source: ${source})`;
}

export const kellyResearchQueueAction: Action = {
  name: "KELLY_RESEARCH_QUEUE",
  similes: [
    "research queue",
    "what to research next",
    "research backlog",
    "top research priorities",
  ],
  description:
    "Show the prioritized research queue for Echo and Vince agents, grouped by priority.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("research queue") ||
      text.includes("what to research") ||
      text.includes("research backlog") ||
      text.includes("research priorities")
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.info("[KellyResearchQueue] Loading priority queue");

    try {
      const svc = new ResearchQueueService();
      const queue = svc.getPriorityQueue();

      if (queue.length === 0) {
        await callback({
          text: "## Research Queue\n\nQueue is empty — nothing to research right now.",
          actions: ["KELLY_RESEARCH_QUEUE"],
        });
        return undefined;
      }

      const high = queue.filter((i) => i.priority === "high");
      const medium = queue.filter((i) => i.priority === "medium");
      const low = queue.filter((i) => i.priority === "low");

      const sections: string[] = ["## Research Queue"];

      if (high.length > 0) {
        sections.push("\n### High Priority");
        sections.push(...high.map(formatItem));
      }
      if (medium.length > 0) {
        sections.push("\n### Medium Priority");
        sections.push(...medium.map(formatItem));
      }
      if (low.length > 0) {
        sections.push("\n### Low Priority");
        sections.push(...low.map(formatItem));
      }

      sections.push(`\n_${queue.length} items in queue_`);

      await callback({
        text: sections.join("\n"),
        actions: ["KELLY_RESEARCH_QUEUE"],
      });
      return undefined;
    } catch (e) {
      logger.error(`[KellyResearchQueue] Error: ${e}`);
      await callback({
        text: `Error loading research queue: ${e instanceof Error ? e.message : String(e)}`,
        actions: ["REPLY"],
      });
      return undefined;
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "What's the research queue?" },
      },
      {
        name: "{{name2}}",
        content: {
          text: "## Research Queue\n\n### High Priority\n- Research BTC narrative after loss on trade-123 [BTC] (Echo + Vince, source: post-mortem)\n\n_1 items in queue_",
          actions: ["KELLY_RESEARCH_QUEUE"],
        },
      },
    ],
  ],
};
