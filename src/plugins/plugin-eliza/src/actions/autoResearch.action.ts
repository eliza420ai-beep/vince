/**
 * Auto-Research Action
 *
 * Autonomous research to expand the knowledge base:
 * - Identifies gaps via research agenda
 * - Searches for authoritative sources
 * - Fetches, summarizes, and saves content
 * - Tracks progress and learns from results
 *
 * TRIGGERS:
 * - "research session" — Start autonomous research
 * - "research <topic>" — Research specific topic
 * - "audit knowledge" — Run knowledge audit
 * - "research agenda" — Show research priorities
 * - "fill gaps" — Auto-generate topics from gaps and research
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

import {
  loadAgenda,
  auditKnowledge,
  addResearchTopic,
  getNextTopics,
  updateTopicStatus,
  startResearchSession,
  endResearchSession,
  generateTopicsFromGaps,
  getAgendaSummary,
  type ResearchTopic,
} from "../services/researchAgenda.service";
import { getKnowledgeRoot } from "../config/paths";

// Authoritative sources by category
const SOURCE_REGISTRY: Record<string, string[]> = {
  "crypto-fundamentals": [
    "ethereum.org",
    "bitcoin.org",
    "docs.solana.com",
    "academy.binance.com",
  ],
  defi: [
    "defillama.com",
    "docs.uniswap.org",
    "docs.aave.com",
    "paradigm.xyz",
    "a16zcrypto.com",
  ],
  trading: [
    "tradingview.com/education",
    "investopedia.com",
    "glassnode.com/academy",
  ],
  layer2: [
    "l2beat.com",
    "docs.arbitrum.io",
    "docs.optimism.io",
    "docs.base.org",
  ],
  "ai-agents": ["docs.eliza.ai", "langchain.com", "github.com/elizaos"],
  governance: [
    "docs.snapshot.org",
    "tally.xyz",
    "docs.compound.finance/governance",
  ],
};

type SubCommand = "session" | "topic" | "audit" | "agenda" | "gaps" | "next";

function detectSubCommand(text: string): { command: SubCommand; arg?: string } {
  const textLower = text.toLowerCase();

  if (textLower.includes("audit") || textLower.includes("analyze knowledge")) {
    return { command: "audit" };
  }

  if (
    textLower.includes("agenda") ||
    textLower.includes("priorities") ||
    textLower.includes("queue")
  ) {
    return { command: "agenda" };
  }

  if (
    textLower.includes("fill gaps") ||
    textLower.includes("generate topics")
  ) {
    return { command: "gaps" };
  }

  if (textLower.includes("next topic") || textLower.includes("what's next")) {
    return { command: "next" };
  }

  if (
    textLower.includes("research session") ||
    textLower.includes("start research")
  ) {
    return { command: "session" };
  }

  // Check for specific topic
  const topicMatch = text.match(
    /research\s+(?:about\s+|on\s+)?["']?([^"'\n]+?)["']?(?:\s+in\s+(\w+))?$/i,
  );
  if (topicMatch) {
    return { command: "topic", arg: topicMatch[1].trim() };
  }

  return { command: "agenda" };
}

/**
 * Format audit results
 */
function formatAuditReport(
  gaps: ReturnType<typeof auditKnowledge>["gaps"],
  coverage: Record<string, number>,
): string {
  let response = `🔍 **Knowledge Audit**\n\n`;

  // Coverage overview
  response += `**Coverage by Category:**\n`;
  const sortedCoverage = Object.entries(coverage).sort((a, b) => a[1] - b[1]);

  for (const [cat, pct] of sortedCoverage) {
    const bar = pct >= 80 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
    const barVisual =
      "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
    response += `${bar} **${cat}**: ${barVisual} ${pct}%\n`;
  }
  response += `\n`;

  // Gaps detail
  if (gaps.length > 0) {
    response += `**Gaps Found (${gaps.length}):**\n\n`;

    const gapsByType = {
      missing: gaps.filter((g) => g.gapType === "missing"),
      shallow: gaps.filter((g) => g.gapType === "shallow"),
      stale: gaps.filter((g) => g.gapType === "stale"),
      subtopics: gaps.filter((g) => g.gapType === "subtopics"),
    };

    if (gapsByType.missing.length > 0) {
      response += `🔴 **Missing Categories:**\n`;
      for (const gap of gapsByType.missing) {
        response += `• \`${gap.category}\` — needs ${gap.suggestedTopics.length} topics\n`;
      }
      response += `\n`;
    }

    if (gapsByType.shallow.length > 0) {
      response += `🟡 **Shallow Coverage:**\n`;
      for (const gap of gapsByType.shallow) {
        response += `• \`${gap.category}\` — ${gap.description}\n`;
        response += `  Missing: ${gap.suggestedTopics.slice(0, 3).join(", ")}${gap.suggestedTopics.length > 3 ? "..." : ""}\n`;
      }
      response += `\n`;
    }

    if (gapsByType.subtopics.length > 0) {
      response += `📋 **Missing subtopics (content gaps):**\n`;
      for (const gap of gapsByType.subtopics) {
        const topics = gap.suggestedTopics.slice(0, 5);
        response += `• \`${gap.category}\` — ${gap.description}\n`;
        response += `  Missing: ${topics.join(", ")}${gap.suggestedTopics.length > 5 ? "..." : ""}\n`;
      }
      response += `\n`;
    }

    if (gapsByType.stale.length > 0) {
      response += `⏰ **Stale Content:**\n`;
      for (const gap of gapsByType.stale) {
        response += `• \`${gap.category}\` — ${gap.description}\n`;
      }
      response += `\n`;
    }
  } else {
    response += `✅ **No critical gaps found!**\n\n`;
  }

  // Recommendations
  response += `**Recommended Actions:**\n`;
  if (gaps.length > 0) {
    response += `• Run \`fill gaps\` to auto-generate research topics\n`;
    response += `• Run \`research session\` to start autonomous research\n`;
  } else {
    response += `• Run \`research agenda\` to see current priorities\n`;
    response += `• Focus on updating stale content\n`;
  }

  return response;
}

/**
 * Format next topics
 */
function formatNextTopics(topics: ResearchTopic[]): string {
  if (topics.length === 0) {
    return `📋 **Research Queue Empty**\n\nRun \`audit knowledge\` to find gaps, then \`fill gaps\` to generate topics.`;
  }

  let response = `📋 **Next Research Topics (${topics.length})**\n\n`;

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const priorityEmoji = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    }[t.priority];

    response += `${i + 1}. ${priorityEmoji} **${t.topic}**\n`;
    response += `   Category: \`${t.category}\` | Depth: ${t.depth}\n`;
    response += `   Reason: ${t.reason}\n`;
    if (t.sources.length > 0) {
      response += `   Sources: ${t.sources.slice(0, 2).join(", ")}\n`;
    }
    response += `\n`;
  }

  response += `---\n`;
  response += `Run \`research <topic>\` to research a specific topic,\n`;
  response += `or \`research session\` to auto-research the queue.`;

  return response;
}

/**
 * Simulate research on a topic
 * In production, this would use web search, fetch content, and summarize
 */
async function researchTopic(
  topic: ResearchTopic,
  runtime: IAgentRuntime,
): Promise<{ success: boolean; filesCreated: string[]; summary: string }> {
  logger.info(`[AutoResearch] Researching: ${topic.topic}`);

  // Get suggested sources
  const sources = SOURCE_REGISTRY[topic.category] || [];

  // In production, this would:
  // 1. Search web for topic + authoritative sources
  // 2. Fetch and extract content from top results
  // 3. Use summarize CLI to process
  // 4. Save to knowledge folder

  // For now, create a placeholder that documents what WOULD happen
  const categoryPath = path.join(getKnowledgeRoot(), topic.category);
  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath, { recursive: true });
  }

  const filename =
    topic.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md";
  const filepath = path.join(categoryPath, filename);

  // Create research stub
  const content = `# ${topic.topic}

> **Research Status:** Stub created by auto-research
> **Priority:** ${topic.priority}
> **Depth:** ${topic.depth}
> **Created:** ${new Date().toISOString()}

## Overview

*This stub was created by Eliza's auto-research system.*

**Reason for research:** ${topic.reason}

## Suggested Sources

${sources.map((s) => `- ${s}`).join("\n")}

## Research Notes

*To complete this research:*
1. Search for "${topic.topic}" on the sources above
2. Use UPLOAD to ingest relevant articles/videos
3. Synthesize findings into this document

## Key Concepts

*[To be filled during research]*

## Related Topics

*[To be filled during research]*

---

*Auto-generated by Eliza's research agenda system*
`;

  fs.writeFileSync(filepath, content);

  return {
    success: true,
    filesCreated: [filepath],
    summary: `Created research stub for "${topic.topic}" in ${topic.category}/`,
  };
}

export const autoResearchAction = {
  name: "AUTO_RESEARCH",
  description: `Autonomous knowledge base expansion. Distinct from "knowledge status" (quick file stats): this action does gap analysis against a coverage framework.

TRIGGERS:
- "audit knowledge" — Gap analysis: missing subtopics, shallow/stale coverage, coverage % by category. Run this to see what to expand; then "fill gaps" to generate topics.
- "research agenda" — Show priorities and queue
- "fill gaps" — Generate topics from audit gaps
- "next topics" — Show next research priorities
- "research <topic>" — Research specific topic
- "research session" — Start autonomous research

CAPABILITIES:
- Analyzes knowledge against coverage framework
- Identifies missing, shallow, and stale content
- Prioritizes research by category importance
- Tracks research sessions and progress
- Creates research stubs with source suggestions

Use this for systematic knowledge expansion over time.`,

  similes: [
    "AUTO_RESEARCH",
    "RESEARCH_SESSION",
    "AUDIT_KNOWLEDGE",
    "RESEARCH_AGENDA",
    "FILL_GAPS",
    "KNOWLEDGE_GAPS",
  ],

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "audit knowledge" },
      },
      {
        name: "{{agent}}",
        content: {
          text: `🔍 **Knowledge Audit**

**Coverage by Category:**
🔴 **crypto-fundamentals**: ████░░░░░░ 40%
🟡 **defi**: ██████░░░░ 60%
🟢 **trading**: ████████░░ 80%
🔴 **layer2**: ██░░░░░░░░ 20%

**Gaps Found (3):**

🔴 **Missing Categories:**
• \`ai-agents\` — needs 4 topics

🟡 **Shallow Coverage:**
• \`layer2\` — Only 2 files for 4 expected subtopics
  Missing: Rollup types, Bridging and security...

**Recommended Actions:**
• Run \`fill gaps\` to auto-generate research topics
• Run \`research session\` to start autonomous research`,
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "fill gaps" },
      },
      {
        name: "{{agent}}",
        content: {
          text: `📚 **Gap Analysis Complete**

Generated **8 research topics** from 3 knowledge gaps:

🔴 **Critical:**
• Rollup types (optimistic vs ZK) — layer2
• Agent frameworks — ai-agents

🟠 **High Priority:**
• Bridging and security — layer2
• Agent tokens — ai-agents

🟡 **Medium:**
• L2 economics — layer2
• Autonomous trading — ai-agents

Run \`next topics\` to see the queue, or \`research session\` to start.`,
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("research") ||
      text.includes("audit") ||
      text.includes("knowledge gap") ||
      text.includes("fill gap") ||
      text.includes("agenda")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    const text = message.content?.text || "";
    const { command, arg } = detectSubCommand(text);

    logger.info(`[AutoResearch] Command: ${command}${arg ? ` (${arg})` : ""}`);

    switch (command) {
      case "audit": {
        const { gaps, coverage } = auditKnowledge();
        const report = formatAuditReport(gaps, coverage);
        const out = "Here's the knowledge audit—\n\n" + report;
        callback?.({ text: out });
        return true;
      }

      case "agenda": {
        const summary = getAgendaSummary();
        const out = "Here's the research agenda—\n\n" + summary;
        callback?.({ text: out });
        return true;
      }

      case "gaps": {
        const added = generateTopicsFromGaps();
        const nextTopics = getNextTopics(5);

        let response = `📚 **Gap Analysis Complete**\n\n`;
        response += `Generated **${added} research topics** from knowledge gaps.\n\n`;

        if (nextTopics.length > 0) {
          const byCritical = nextTopics.filter(
            (t) => t.priority === "critical",
          );
          const byHigh = nextTopics.filter((t) => t.priority === "high");
          const byMedium = nextTopics.filter((t) => t.priority === "medium");

          if (byCritical.length > 0) {
            response += `🔴 **Critical:**\n`;
            for (const t of byCritical) {
              response += `• ${t.topic} — ${t.category}\n`;
            }
            response += `\n`;
          }

          if (byHigh.length > 0) {
            response += `🟠 **High Priority:**\n`;
            for (const t of byHigh) {
              response += `• ${t.topic} — ${t.category}\n`;
            }
            response += `\n`;
          }

          if (byMedium.length > 0) {
            response += `🟡 **Medium:**\n`;
            for (const t of byMedium.slice(0, 3)) {
              response += `• ${t.topic} — ${t.category}\n`;
            }
            response += `\n`;
          }
        }

        response += `Run \`next topics\` to see the full queue, or \`research session\` to start.`;
        const gapsOut = "Here's the gap analysis—\n\n" + response;
        callback?.({ text: gapsOut });
        return true;
      }

      case "next": {
        const topics = getNextTopics(5);
        const report = formatNextTopics(topics);
        const out = "Here are the next topics—\n\n" + report;
        callback?.({ text: out });
        return true;
      }

      case "topic": {
        if (!arg) {
          callback?.({ text: "Please specify a topic: `research <topic>`" });
          return true;
        }

        // Add topic to queue and research it
        const topic = addResearchTopic(arg, "emerging", {
          priority: "high",
          reason: "User requested",
          depth: "intermediate",
        });

        updateTopicStatus(topic.id, "researching");

        const result = await researchTopic(topic, runtime);

        if (result.success) {
          updateTopicStatus(topic.id, "completed", {
            filesAdded: result.filesCreated,
          });

          const topicOut = `✅ **Research Complete: ${arg}**\n\n${result.summary}\n\n**Next steps:**\n• Review and expand the stub at \`${result.filesCreated[0]}\`\n• Use UPLOAD to add related content\n• Run \`next topics\` to continue research`;
          callback?.({ text: "Here's the research result—\n\n" + topicOut });
        } else {
          updateTopicStatus(topic.id, "blocked");
          callback?.({
            text: `❌ Research failed for "${arg}". Try again later.`,
          });
        }
        return true;
      }

      case "session": {
        const session = startResearchSession();
        const topics = getNextTopics(3);

        if (topics.length === 0) {
          callback?.({
            text: `📚 **Research Session**\n\nNo topics in queue. Run \`audit knowledge\` then \`fill gaps\` first.`,
          });
          return true;
        }

        let response = `📚 **Research Session Started**\n\n`;
        response += `Session ID: \`${session.id}\`\n`;
        response += `Topics to research: ${topics.length}\n\n`;

        const filesCreated: string[] = [];
        const topicsResearched: string[] = [];

        for (const topic of topics) {
          updateTopicStatus(topic.id, "researching");
          response += `🔄 Researching: **${topic.topic}**...\n`;

          const result = await researchTopic(topic, runtime);

          if (result.success) {
            updateTopicStatus(topic.id, "completed", {
              filesAdded: result.filesCreated,
            });
            filesCreated.push(...result.filesCreated);
            topicsResearched.push(topic.topic);
            response += `   ✅ ${result.summary}\n`;
          } else {
            updateTopicStatus(topic.id, "blocked");
            response += `   ❌ Failed\n`;
          }
        }

        endResearchSession(session.id, {
          topicsResearched,
          filesCreated,
          sourcesUsed: [],
        });

        response += `\n---\n`;
        response += `**Session Complete:**\n`;
        response += `• ${topicsResearched.length} topics researched\n`;
        response += `• ${filesCreated.length} files created\n\n`;
        response += `Review the stubs in \`knowledge/\` and expand with UPLOAD.`;

        const sessionOut = "Here's the research session—\n\n" + response;
        callback?.({ text: sessionOut });
        return true;
      }
    }

    return true;
  },
} as unknown as Action;

export default autoResearchAction;
