/**
 * SENTINEL_MEMORY_QUERY Action
 *
 * Queries the institutional memory graph for lessons learned about a
 * given asset or topic.
 *
 * PRD: One Dream Phase 12 — Task #77
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
import { MemoryGraphService } from "../services/memoryGraph.service";

const MEMORY_TRIGGERS = [
  "what have we learned about",
  "memory query",
  "lessons from",
  "knowledge graph",
  "what do we know about",
];

function wantsMemoryQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return MEMORY_TRIGGERS.some((t) => lower.includes(t));
}

/**
 * Parse an asset or tag hint from the user message.
 * e.g. "what have we learned about BTC" → "BTC"
 */
function parseQueryHint(text: string): {
  asset?: string;
  tags?: string[];
} {
  const lower = text.toLowerCase();

  // Try to extract "about X" pattern
  const aboutMatch = lower.match(/about\s+([a-z0-9_-]+)/i);
  const fromMatch = lower.match(/from\s+([a-z0-9_-]+)/i);
  const knowMatch = lower.match(/know about\s+([a-z0-9_-]+)/i);

  const token =
    knowMatch?.[1] ?? aboutMatch?.[1] ?? fromMatch?.[1] ?? undefined;

  if (!token) return {};

  // Heuristic: short uppercase or known crypto ticker → asset; else → tag
  const isAsset = /^[A-Z]{2,6}$/.test(token.toUpperCase()) || token.length <= 6;
  if (isAsset) {
    return { asset: token.toUpperCase() };
  }
  return { tags: [token.toLowerCase()] };
}

export const sentinelMemoryQueryAction: Action = {
  name: "SENTINEL_MEMORY_QUERY",
  similes: [
    "MEMORY_QUERY",
    "LESSONS_FROM",
    "KNOWLEDGE_GRAPH",
    "WHAT_HAVE_WE_LEARNED",
    "WHAT_DO_WE_KNOW",
  ],
  description:
    "Queries the institutional memory graph for lessons learned about an asset or topic. Answers 'what have we learned about X?'",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsMemoryQuery(text);
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SENTINEL_MEMORY_QUERY] Action fired");

    try {
      const text = message.content?.text ?? "";
      const hint = parseQueryHint(text);

      const memoryGraph = new MemoryGraphService();
      const nodes = memoryGraph.query({
        asset: hint.asset,
        tags: hint.tags,
        minWeight: 0.05,
      });

      if (nodes.length === 0) {
        const subject = hint.asset ?? hint.tags?.[0] ?? "that topic";
        await callback({
          text: `No memory nodes found for **${subject}** yet. As the system learns from post-mortems and weekly briefs, lessons will accumulate here.`,
        });
        return { success: true };
      }

      const subject = hint.asset ?? hint.tags?.[0] ?? "the requested topic";
      const lines: string[] = [
        `## Memory Graph — Lessons on **${subject}**`,
        "",
        `_${nodes.length} node(s) found, sorted by recency weight:_`,
        "",
      ];

      for (const node of nodes.slice(0, 10)) {
        lines.push(
          `### [${node.type}] ${node.label} _(w=${node.weight.toFixed(2)})_`,
        );
        lines.push(`> ${node.content}`);
        lines.push(
          `_Source: ${node.sourceAgent} | ${node.learnedAt.slice(0, 10)} | tags: ${node.tags.join(", ") || "none"}_`,
        );
        lines.push("");
      }

      await callback({ text: lines.join("\n") });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_MEMORY_QUERY] Failed:", error);
      await callback({
        text: "Memory query failed. Check data/memory-graph.jsonl.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "What have we learned about BTC?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Memory Graph — Lessons on **BTC**\n\n_3 node(s) found..._",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Lessons from sentiment" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Memory Graph — Lessons on **sentiment**\n\n_2 node(s) found..._",
        },
      },
    ],
  ],
};
