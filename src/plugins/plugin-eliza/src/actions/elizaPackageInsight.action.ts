/**
 * ELIZA_PACKAGE_INSIGHT Action (#70)
 *
 * Packages raw research and trade data into reusable insight formats.
 * Formats: thread | newsletter-section | short-form | data-table
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
  InsightPackagingService,
  type InsightFormat,
} from "../services/insightPackaging.service";

// ==========================================
// Format detection
// ==========================================

function detectFormat(text: string): InsightFormat {
  const lower = text.toLowerCase();
  if (lower.includes("thread") || lower.includes("format for thread")) {
    return "thread";
  }
  if (lower.includes("newsletter")) {
    return "newsletter-section";
  }
  if (lower.includes("data-table") || lower.includes("table")) {
    return "data-table";
  }
  // default
  return "short-form";
}

function extractTopic(text: string): string {
  // Try to extract topic after "package insight:" or "package this:" etc.
  const topicMatch = text.match(
    /(?:package insight|package this|format for (?:thread|newsletter)|newsletter section|format insight)[:\s]+(.+)/i,
  );
  if (topicMatch) return topicMatch[1].trim().slice(0, 120);
  // Fallback: first 80 chars
  return text.trim().slice(0, 80) || "Vince Research Insight";
}

// ==========================================
// Action
// ==========================================

export const elizaPackageInsightAction: Action = {
  name: "ELIZA_PACKAGE_INSIGHT",
  similes: [
    "package insight",
    "format for thread",
    "newsletter section",
    "package this",
    "format insight",
  ],
  description:
    "Package raw research or trade data into a reusable insight format (thread, newsletter-section, short-form, data-table).",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("package insight") ||
      text.includes("format for thread") ||
      text.includes("newsletter section") ||
      text.includes("package this") ||
      text.includes("format insight")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text ?? "";
    const format = detectFormat(text);
    const topic = extractTopic(text);

    logger.info(
      `[PackageInsight] format=${format} topic=${topic.slice(0, 50)}`,
    );

    try {
      const svc = new InsightPackagingService();
      const insight = svc.packageInsight({
        format,
        topic,
        rawContent: text,
        sourceAgents: ["echo", "vince"],
        metrics: {},
      });

      const formatLabel: Record<InsightFormat, string> = {
        thread: "🧵 Thread",
        "newsletter-section": "📰 Newsletter Section",
        "short-form": "✂️ Short-form",
        "data-table": "📊 Data Table",
      };

      const response = [
        `**${formatLabel[format]} Insight Packaged**`,
        ``,
        `**Headline:** ${insight.headline}`,
        ``,
        `**Body:**`,
        insight.body,
        ``,
        `_Insight ID \`${insight.id}\` saved to publish queue. Use \`markReadyToPublish\` when ready._`,
      ].join("\n");

      await callback({
        text: response,
        actions: ["ELIZA_PACKAGE_INSIGHT"],
      });
      return undefined;
    } catch (e) {
      logger.error(`[PackageInsight] Error: ${e}`);
      await callback({
        text: `Error packaging insight: ${e instanceof Error ? e.message : String(e)}`,
        actions: ["REPLY"],
      });
      return undefined;
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Package insight: BTC ETF flows reached ATH this week",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "✂️ Short-form Insight Packaged\n\n**Headline:** BTC ETF flows reached ATH this week\n\n**Body:**\nBTC ETF flows reached ATH this week",
          actions: ["ELIZA_PACKAGE_INSIGHT"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Format for thread: Solana DEX volume analysis" },
      },
      {
        name: "{{name2}}",
        content: {
          text: "🧵 Thread Insight Packaged\n\n**Headline:** Solana DEX volume analysis",
          actions: ["ELIZA_PACKAGE_INSIGHT"],
        },
      },
    ],
  ],
};
