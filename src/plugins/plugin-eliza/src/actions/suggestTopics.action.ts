/**
 * SUGGEST_TOPICS Action
 *
 * Intelligent topic suggestions based on:
 * - Knowledge base gaps (what's underrepresented)
 * - Stale content (what needs refreshing)
 * - Market context (trend-aware via VINCE)
 * - Content patterns (what performs well)
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_BASE = "./knowledge";
const SUBSTACK_DIR = "./knowledge/substack-essays";

interface CategoryAnalysis {
  name: string;
  fileCount: number;
  lastUpdated: Date | null;
  daysStale: number;
  coverage: "strong" | "moderate" | "weak";
}

interface TopicSuggestion {
  topic: string;
  reason: string;
  type: "gap" | "refresh" | "trend" | "synthesis";
  priority: "high" | "medium" | "low";
  relatedKnowledge: string[];
}

function analyzeKnowledgeGaps(): CategoryAnalysis[] {
  const categories: CategoryAnalysis[] = [];
  
  if (!fs.existsSync(KNOWLEDGE_BASE)) return categories;

  const dirs = fs.readdirSync(KNOWLEDGE_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  for (const dir of dirs) {
    const categoryPath = path.join(KNOWLEDGE_BASE, dir.name);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".md"));
    
    let lastUpdated: Date | null = null;
    for (const file of files.slice(0, 20)) { // Sample for performance
      try {
        const stat = fs.statSync(path.join(categoryPath, file));
        if (!lastUpdated || stat.mtime > lastUpdated) {
          lastUpdated = stat.mtime;
        }
      } catch {}
    }

    const daysStale = lastUpdated 
      ? Math.floor((Date.now() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    const coverage = files.length >= 20 ? "strong" : files.length >= 10 ? "moderate" : "weak";

    categories.push({
      name: dir.name,
      fileCount: files.length,
      lastUpdated,
      daysStale,
      coverage,
    });
  }

  return categories.sort((a, b) => a.fileCount - b.fileCount);
}

function getExistingEssayTopics(): string[] {
  const topics: string[] = [];
  
  if (!fs.existsSync(SUBSTACK_DIR)) return topics;

  const files = fs.readdirSync(SUBSTACK_DIR).filter((f) => f.endsWith(".md"));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(SUBSTACK_DIR, file), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*"?([^"\n]+)"?/i);
      if (titleMatch) {
        topics.push(titleMatch[1].trim());
      }
    } catch {}
  }

  return topics;
}

function generateGapBasedSuggestions(categories: CategoryAnalysis[]): TopicSuggestion[] {
  const suggestions: TopicSuggestion[] = [];
  
  // Weak coverage categories
  const weakCategories = categories.filter((c) => c.coverage === "weak");
  for (const cat of weakCategories.slice(0, 3)) {
    suggestions.push({
      topic: `Deep dive into ${cat.name.replace(/-/g, " ")} fundamentals`,
      reason: `Only ${cat.fileCount} files in ${cat.name} - needs expansion`,
      type: "gap",
      priority: "high",
      relatedKnowledge: [cat.name],
    });
  }

  // Stale categories (> 30 days)
  const staleCategories = categories.filter((c) => c.daysStale > 30 && c.fileCount > 5);
  for (const cat of staleCategories.slice(0, 2)) {
    suggestions.push({
      topic: `${cat.name.replace(/-/g, " ")} - 2024/2025 update`,
      reason: `${cat.daysStale} days since last update`,
      type: "refresh",
      priority: "medium",
      relatedKnowledge: [cat.name],
    });
  }

  return suggestions;
}

function generateSynthesisSuggestions(categories: CategoryAnalysis[]): TopicSuggestion[] {
  // Cross-domain synthesis opportunities
  const synthesisPairs = [
    { a: "options", b: "perps-trading", topic: "Options vs Perps: When to use each" },
    { a: "bitcoin-maxi", b: "defi-metrics", topic: "Bitcoin DeFi: The emerging landscape" },
    { a: "the-good-life", b: "grinding-the-trenches", topic: "The trader's lifestyle balance" },
    { a: "macro-economy", b: "bitcoin-maxi", topic: "Macro cycles and Bitcoin correlation" },
    { a: "solana", b: "grinding-the-trenches", topic: "Solana memecoin alpha strategies" },
    { a: "art-collections", b: "the-good-life", topic: "Art as lifestyle investment" },
  ];

  const categoryNames = new Set(categories.map((c) => c.name));
  const suggestions: TopicSuggestion[] = [];

  for (const pair of synthesisPairs) {
    if (categoryNames.has(pair.a) && categoryNames.has(pair.b)) {
      suggestions.push({
        topic: pair.topic,
        reason: `Synthesis of ${pair.a} and ${pair.b}`,
        type: "synthesis",
        priority: "medium",
        relatedKnowledge: [pair.a, pair.b],
      });
    }
  }

  return suggestions.slice(0, 3);
}

function generateTrendSuggestions(): TopicSuggestion[] {
  // These would ideally come from VINCE/market data
  // For now, evergreen trend topics
  return [
    {
      topic: "ETF flows and their impact on crypto cycles",
      reason: "High relevance to current market structure",
      type: "trend",
      priority: "high",
      relatedKnowledge: ["bitcoin-maxi", "macro-economy"],
    },
    {
      topic: "Airdrop meta: What's working in 2025",
      reason: "Constantly evolving, needs fresh take",
      type: "trend",
      priority: "high",
      relatedKnowledge: ["grinding-the-trenches", "airdrops"],
    },
    {
      topic: "The AI x Crypto convergence thesis",
      reason: "Major narrative, underexplored in corpus",
      type: "trend",
      priority: "medium",
      relatedKnowledge: ["altcoins", "venture-capital"],
    },
  ];
}

function formatSuggestions(
  suggestions: TopicSuggestion[],
  categories: CategoryAnalysis[],
  existingTopics: string[]
): string {
  const typeIcons: Record<string, string> = {
    gap: "📭",
    refresh: "🔄",
    trend: "📈",
    synthesis: "🔗",
  };

  const priorityIcons: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };

  // Group by type
  const byType: Record<string, TopicSuggestion[]> = {};
  for (const s of suggestions) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s);
  }

  let output = `💡 **Topic Suggestions**\n\n`;

  // Gap-filling
  if (byType.gap?.length) {
    output += `**📭 Fill Knowledge Gaps:**\n`;
    for (const s of byType.gap) {
      output += `${priorityIcons[s.priority]} **${s.topic}**\n   ${s.reason}\n\n`;
    }
  }

  // Trend-aware
  if (byType.trend?.length) {
    output += `**📈 Trend-Aware:**\n`;
    for (const s of byType.trend) {
      output += `${priorityIcons[s.priority]} **${s.topic}**\n   ${s.reason}\n\n`;
    }
  }

  // Synthesis
  if (byType.synthesis?.length) {
    output += `**🔗 Cross-Domain Synthesis:**\n`;
    for (const s of byType.synthesis) {
      output += `${priorityIcons[s.priority]} **${s.topic}**\n   ${s.reason}\n\n`;
    }
  }

  // Refresh
  if (byType.refresh?.length) {
    output += `**🔄 Needs Refresh:**\n`;
    for (const s of byType.refresh) {
      output += `${priorityIcons[s.priority]} **${s.topic}**\n   ${s.reason}\n\n`;
    }
  }

  // Knowledge stats
  const weakCount = categories.filter((c) => c.coverage === "weak").length;
  const staleCount = categories.filter((c) => c.daysStale > 30).length;
  
  output += `---\n**Corpus Stats:**\n`;
  output += `• ${categories.length} categories\n`;
  output += `• ${weakCount} need expansion (< 10 files)\n`;
  output += `• ${staleCount} are stale (> 30 days)\n`;
  output += `• ${existingTopics.length} existing essays\n\n`;

  output += `**Actions:**\n`;
  output += `• \`write essay about [topic]\` - Generate essay\n`;
  output += `• \`draft tweets about [topic]\` - Create tweets\n`;
  output += `• \`knowledge status\` - Full corpus report`;

  return output;
}

export const suggestTopicsAction: Action = {
  name: "SUGGEST_TOPICS",
  similes: [
    "TOPIC_IDEAS",
    "WHAT_TO_WRITE",
    "CONTENT_IDEAS",
    "SUGGEST_CONTENT",
  ],
  description: `Suggest content topics based on knowledge gaps, trends, and synthesis opportunities.

TRIGGERS:
- "suggest topics"
- "what should I write about"
- "content ideas"
- "topic suggestions"
- "what's missing in knowledge"
- "what needs writing"

Analyzes the knowledge base and suggests:
- Gap-filling topics (weak coverage)
- Refresh topics (stale content)
- Trend-aware topics (timely)
- Synthesis topics (cross-domain)`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      text.includes("suggest topic") ||
      text.includes("topic idea") ||
      text.includes("content idea") ||
      text.includes("what to write") ||
      text.includes("what should i write") ||
      text.includes("what should we write") ||
      text.includes("suggest content") ||
      (text.includes("what") && text.includes("missing") && text.includes("knowledge")) ||
      text.includes("what needs writing")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    try {
      logger.info("[SUGGEST_TOPICS] Analyzing knowledge base for suggestions...");

      if (callback) {
        await callback({
          text: `🔍 **Analyzing knowledge base...**\n\n_Checking gaps, staleness, and synthesis opportunities..._`,
          actions: ["SUGGEST_TOPICS"],
        });
      }

      const categories = analyzeKnowledgeGaps();
      const existingTopics = getExistingEssayTopics();

      // Generate suggestions from different sources
      const gapSuggestions = generateGapBasedSuggestions(categories);
      const synthesisSuggestions = generateSynthesisSuggestions(categories);
      const trendSuggestions = generateTrendSuggestions();

      // Combine and dedupe
      const allSuggestions = [
        ...gapSuggestions,
        ...trendSuggestions,
        ...synthesisSuggestions,
      ];

      // Sort by priority
      allSuggestions.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });

      const formatted = formatSuggestions(allSuggestions, categories, existingTopics);

      if (callback) {
        await callback({
          text: formatted,
          actions: ["SUGGEST_TOPICS"],
        });
      }

    } catch (error) {
      logger.error({ error }, "[SUGGEST_TOPICS] Error");
      if (callback) {
        await callback({
          text: `❌ Error analyzing topics: ${String(error)}`,
          actions: ["SUGGEST_TOPICS"],
        });
      }
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "suggest topics" } },
      {
        name: "Eliza",
        content: {
          text: "💡 **Topic Suggestions**\n\n**📭 Fill Knowledge Gaps:**...",
          actions: ["SUGGEST_TOPICS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "what should I write about" } },
      {
        name: "Eliza",
        content: {
          text: "💡 **Topic Suggestions**\n\n**📈 Trend-Aware:**...",
          actions: ["SUGGEST_TOPICS"],
        },
      },
    ],
  ],
};

export default suggestTopicsAction;
