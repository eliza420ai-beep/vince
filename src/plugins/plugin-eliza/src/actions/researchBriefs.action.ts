/**
 * Research Briefs Action
 *
 * Generates concise research briefs from knowledge base content.
 * Briefs are structured summaries designed for quick consumption:
 * - Executive summary (1-2 sentences)
 * - Key findings (bullet points)
 * - Implications
 * - Recommended actions
 * - Sources
 *
 * TRIGGERS:
 * - "research brief on <topic>"
 * - "brief me on <topic>"
 * - "quick research: <topic>"
 * - "summarize research on <topic>"
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

import { getKnowledgeRoot, BRIEFS_DIR } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();

interface ResearchBrief {
  id: string;
  topic: string;
  createdAt: string;
  executive_summary: string;
  key_findings: string[];
  implications: string[];
  recommended_actions: string[];
  sources: Array<{
    file: string;
    relevance: "high" | "medium" | "low";
    excerpt: string;
  }>;
  confidence: "high" | "medium" | "low";
  gaps: string[];
}

/**
 * Search knowledge base for relevant content
 */
function searchKnowledge(
  topic: string,
): Array<{ file: string; content: string; relevance: number }> {
  const results: Array<{ file: string; content: string; relevance: number }> =
    [];
  const topicTerms = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "briefs"
      ) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const contentLower = content.toLowerCase();

          // Calculate relevance score
          let relevance = 0;
          for (const term of topicTerms) {
            const matches = (contentLower.match(new RegExp(term, "g")) || [])
              .length;
            relevance += matches;
          }

          // Boost for title/filename match
          if (entry.name.toLowerCase().includes(topicTerms[0])) {
            relevance += 10;
          }

          if (relevance > 0) {
            results.push({
              file: path.relative(KNOWLEDGE_ROOT, fullPath),
              content,
              relevance,
            });
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
    }
  }

  scanDir(KNOWLEDGE_ROOT);
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Extract key excerpts from content
 */
function extractExcerpts(
  content: string,
  topic: string,
  maxExcerpts = 3,
): string[] {
  const lines = content.split("\n").filter((l) => l.trim());
  const topicTerms = topic.toLowerCase().split(/\s+/);
  const excerpts: string[] = [];

  for (const line of lines) {
    if (excerpts.length >= maxExcerpts) break;
    const lineLower = line.toLowerCase();

    // Skip headers and very short lines
    if (line.startsWith("#") || line.length < 30) continue;

    // Check if line contains topic terms
    if (topicTerms.some((term) => lineLower.includes(term))) {
      excerpts.push(line.trim().slice(0, 200));
    }
  }

  return excerpts;
}

/**
 * Generate a research brief
 */
function generateBrief(
  topic: string,
  sources: Array<{ file: string; content: string; relevance: number }>,
): ResearchBrief {
  const id = `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const topSources = sources.slice(0, 10);

  // Analyze sources to extract findings
  const allExcerpts: string[] = [];
  const briefSources: ResearchBrief["sources"] = [];

  for (const source of topSources) {
    const excerpts = extractExcerpts(source.content, topic);
    allExcerpts.push(...excerpts);

    if (excerpts.length > 0) {
      briefSources.push({
        file: source.file,
        relevance:
          source.relevance > 10
            ? "high"
            : source.relevance > 3
              ? "medium"
              : "low",
        excerpt: excerpts[0] || "",
      });
    }
  }

  // Determine confidence based on source quality and quantity
  const highRelevanceSources = briefSources.filter(
    (s) => s.relevance === "high",
  ).length;
  const confidence: "high" | "medium" | "low" =
    highRelevanceSources >= 3
      ? "high"
      : highRelevanceSources >= 1 || briefSources.length >= 3
        ? "medium"
        : "low";

  // Identify gaps
  const gaps: string[] = [];
  if (briefSources.length < 3) {
    gaps.push(
      `Limited sources (${briefSources.length}) — consider ingesting more content on ${topic}`,
    );
  }
  if (confidence === "low") {
    gaps.push("Low confidence — sources may be tangentially related");
  }

  // Generate placeholder findings (in production, this would use LLM)
  const keyFindings = allExcerpts.slice(0, 5).map((e) => e.slice(0, 150));

  return {
    id,
    topic,
    createdAt: new Date().toISOString(),
    executive_summary: `Research brief on "${topic}" compiled from ${briefSources.length} knowledge base sources.`,
    key_findings:
      keyFindings.length > 0
        ? keyFindings
        : ["Insufficient data — ingest more content on this topic"],
    implications: [
      "Analysis requires LLM synthesis — findings extracted from raw sources",
    ],
    recommended_actions: [
      briefSources.length < 5
        ? `Expand knowledge base with more ${topic} content`
        : `Review ${briefSources.length} sources for deeper insights`,
      "Use WRITE_ESSAY for comprehensive analysis",
    ],
    sources: briefSources,
    confidence,
    gaps,
  };
}

/**
 * Save brief to disk
 */
function saveBrief(brief: ResearchBrief): string {
  if (!fs.existsSync(BRIEFS_DIR)) {
    fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  }

  const filename = `${brief.id}.json`;
  const filepath = path.join(BRIEFS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(brief, null, 2));

  // Also save markdown version
  const mdContent = `# Research Brief: ${brief.topic}

> Generated: ${brief.createdAt}
> Confidence: ${brief.confidence}
> Sources: ${brief.sources.length}

## Executive Summary

${brief.executive_summary}

## Key Findings

${brief.key_findings.map((f) => `- ${f}`).join("\n")}

## Implications

${brief.implications.map((i) => `- ${i}`).join("\n")}

## Recommended Actions

${brief.recommended_actions.map((a) => `- ${a}`).join("\n")}

## Sources

${brief.sources.map((s) => `- **${s.file}** (${s.relevance} relevance)\n  > ${s.excerpt}`).join("\n\n")}

${brief.gaps.length > 0 ? `## Knowledge Gaps\n\n${brief.gaps.map((g) => `- ${g}`).join("\n")}` : ""}
`;

  fs.writeFileSync(filepath.replace(".json", ".md"), mdContent);

  return filepath;
}

/**
 * List existing briefs
 */
function listBriefs(): ResearchBrief[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];

  const briefs: ResearchBrief[] = [];
  const files = fs.readdirSync(BRIEFS_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(BRIEFS_DIR, file), "utf-8");
      briefs.push(JSON.parse(content));
    } catch (e) {
      // Skip invalid files
    }
  }

  return briefs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const researchBriefsAction = {
  name: "RESEARCH_BRIEF",
  description: `Generate concise research briefs from knowledge base.

TRIGGERS:
- "research brief on <topic>" — Generate new brief
- "brief me on <topic>" — Generate new brief
- "quick research: <topic>" — Generate new brief  
- "list briefs" — Show existing briefs
- "brief history" — Show existing briefs

OUTPUT:
- Executive summary
- Key findings (bullets)
- Implications
- Recommended actions
- Sources with relevance ratings
- Knowledge gaps identified

Briefs are saved to knowledge/briefs/ for reference.`,

  similes: [
    "BRIEF",
    "RESEARCH_BRIEF",
    "QUICK_RESEARCH",
    "SUMMARIZE_RESEARCH",
    "BRIEF_ME",
  ],

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "research brief on AI agents" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "📋 **Research Brief: AI agents**\n\n**Executive Summary:** Research brief compiled from 7 knowledge base sources with high confidence.\n\n**Key Findings:**\n- AI agents are autonomous systems that perceive, decide, and act\n- Multi-agent systems enable complex task decomposition\n- Agent frameworks include AutoGPT, LangChain, CrewAI\n\n**Confidence:** High (7 high-relevance sources)\n\nSaved to knowledge/briefs/brief-xxx.md",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "list briefs" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "📚 **Research Briefs (3 total)**\n\n1. **AI agents** — High confidence, 7 sources (2 hours ago)\n2. **DeFi protocols** — Medium confidence, 4 sources (yesterday)\n3. **NFT markets** — Low confidence, 2 sources (3 days ago)",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("brief") ||
      text.includes("quick research") ||
      text.includes("summarize research")
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
    const textLower = text.toLowerCase();

    // Check for list command
    if (
      textLower.includes("list brief") ||
      textLower.includes("brief history")
    ) {
      const briefs = listBriefs();

      if (briefs.length === 0) {
        callback?.({
          text: "📚 **No research briefs yet.**\n\nGenerate one with: `research brief on <topic>`",
        });
        return true;
      }

      const briefList = briefs
        .slice(0, 10)
        .map((b, i) => {
          const age = Date.now() - new Date(b.createdAt).getTime();
          const ageStr =
            age < 3600000
              ? `${Math.floor(age / 60000)} min ago`
              : age < 86400000
                ? `${Math.floor(age / 3600000)} hours ago`
                : `${Math.floor(age / 86400000)} days ago`;
          return `${i + 1}. **${b.topic}** — ${b.confidence} confidence, ${b.sources.length} sources (${ageStr})`;
        })
        .join("\n");

      callback?.({
        text: `📚 **Research Briefs (${briefs.length} total)**\n\n${briefList}`,
      });
      return true;
    }

    // Extract topic
    const topicMatch = text.match(
      /(?:brief(?:\s+(?:me\s+)?on)?|quick\s+research[:\s]+|summarize\s+research\s+on)\s+(.+)/i,
    );
    const topic =
      topicMatch?.[1]?.trim() ||
      text.replace(/research|brief|quick|summarize|on|me/gi, "").trim();

    if (!topic || topic.length < 2) {
      callback?.({
        text: "📋 **Research Brief**\n\nPlease specify a topic:\n- `research brief on <topic>`\n- `brief me on <topic>`\n- `list briefs` — See existing briefs",
      });
      return true;
    }

    logger.info(`[Research Brief] Generating brief on: ${topic}`);

    // Search knowledge base
    const sources = searchKnowledge(topic);

    if (sources.length === 0) {
      callback?.({
        text: `📋 **Research Brief: ${topic}**\n\n⚠️ **No relevant content found in knowledge base.**\n\nRecommended actions:\n- Use UPLOAD to ingest content about ${topic}\n- Add URLs, articles, or YouTube videos\n- Then retry the brief`,
      });
      return true;
    }

    // Generate and save brief
    const brief = generateBrief(topic, sources);
    const savedPath = saveBrief(brief);

    // Format response
    const confidenceEmoji =
      brief.confidence === "high"
        ? "🟢"
        : brief.confidence === "medium"
          ? "🟡"
          : "🔴";

    const response = `📋 **Research Brief: ${brief.topic}**

${confidenceEmoji} **Confidence:** ${brief.confidence} (${brief.sources.length} sources)

---

**Executive Summary:**
${brief.executive_summary}

**Key Findings:**
${brief.key_findings.map((f) => `• ${f}`).join("\n")}

**Implications:**
${brief.implications.map((i) => `• ${i}`).join("\n")}

**Recommended Actions:**
${brief.recommended_actions.map((a) => `• ${a}`).join("\n")}

**Top Sources:**
${brief.sources
  .slice(0, 5)
  .map((s) => `• \`${s.file}\` (${s.relevance})`)
  .join("\n")}

${brief.gaps.length > 0 ? `\n**Knowledge Gaps:**\n${brief.gaps.map((g) => `⚠️ ${g}`).join("\n")}` : ""}

---
📁 Saved to: \`${path.relative(process.cwd(), savedPath).replace(".json", ".md")}\``;

    const out = "Here's the research brief—\n\n" + response;
    callback?.({ text: out });
    logger.info(
      `[Research Brief] Generated brief ${brief.id} with ${brief.sources.length} sources`,
    );

    return true;
  },
} as unknown as Action;

export default researchBriefsAction;
