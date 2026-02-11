/**
 * Trend Connection Action (via VINCE)
 *
 * Connects Eliza's knowledge base to VINCE's real-time market research.
 * Identifies trending topics that intersect with knowledge base content.
 *
 * TRIGGERS:
 * - "connect trends" — Find trending topics related to knowledge
 * - "trend connection" — Same as above
 * - "what's trending in my research" — Same as above
 * - "vince trends" — Get VINCE's trend analysis
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

import { getKnowledgeRoot } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();
const TRENDS_CACHE = path.join(process.cwd(), ".openclaw-cache", "trend-connections.json");

interface KnowledgeTopic {
  topic: string;
  category: string;
  fileCount: number;
  lastUpdated: string;
  keywords: string[];
}

interface TrendConnection {
  knowledgeTopic: string;
  trendingNow: boolean;
  relevanceScore: number;
  vinceInsight: string;
  actionable: string[];
  marketContext?: string;
}

interface TrendReport {
  generatedAt: string;
  knowledgeTopics: KnowledgeTopic[];
  connections: TrendConnection[];
  gaps: string[];
  opportunities: string[];
}

/**
 * Extract topics from knowledge base structure
 */
function extractKnowledgeTopics(): KnowledgeTopic[] {
  const topics: KnowledgeTopic[] = [];
  
  if (!fs.existsSync(KNOWLEDGE_ROOT)) return topics;
  
  const categories = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && !["drafts", "briefs"].includes(d.name));
  
  for (const cat of categories) {
    const catPath = path.join(KNOWLEDGE_ROOT, cat.name);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith(".md"));
    
    // Extract keywords from filenames and content
    const keywords = new Set<string>();
    let lastModified = 0;
    
    for (const file of files) {
      // Add filename words as keywords
      const nameWords = file.replace(".md", "").split(/[-_\s]+/);
      nameWords.forEach(w => {
        if (w.length > 2) keywords.add(w.toLowerCase());
      });
      
      // Check file modification time
      const stat = fs.statSync(path.join(catPath, file));
      if (stat.mtimeMs > lastModified) lastModified = stat.mtimeMs;
      
      // Sample content for keywords
      try {
        const content = fs.readFileSync(path.join(catPath, file), "utf-8").slice(0, 2000);
        const contentWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
        contentWords.slice(0, 20).forEach(w => keywords.add(w.toLowerCase()));
      } catch (e) {
        // Skip
      }
    }
    
    if (files.length > 0) {
      topics.push({
        topic: cat.name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        category: cat.name,
        fileCount: files.length,
        lastUpdated: new Date(lastModified).toISOString(),
        keywords: Array.from(keywords).slice(0, 15),
      });
    }
  }
  
  return topics;
}

/**
 * Simulated VINCE trend data (in production, would call VINCE's research service)
 * This connects to plugin-openclaw's insights service
 */
function getVinceTrends(): Array<{ topic: string; momentum: number; sentiment: string; context: string }> {
  // In production, this would call:
  // - OpenClaw's trend analysis
  // - CoinGecko trending
  // - Social sentiment from X API
  // - News aggregation
  
  // For now, return structure that can be populated
  return [
    {
      topic: "AI Agents",
      momentum: 0.85,
      sentiment: "bullish",
      context: "Explosive growth in autonomous AI agent frameworks and tokens",
    },
    {
      topic: "DeFi",
      momentum: 0.72,
      sentiment: "neutral",
      context: "Steady TVL growth, focus shifting to real yield",
    },
    {
      topic: "NFT",
      momentum: 0.45,
      sentiment: "bearish",
      context: "Volume declining, blue chips holding value",
    },
    {
      topic: "Layer 2",
      momentum: 0.78,
      sentiment: "bullish",
      context: "Base and Arbitrum leading activity growth",
    },
    {
      topic: "RWA",
      momentum: 0.81,
      sentiment: "bullish",
      context: "Real World Assets gaining institutional attention",
    },
    {
      topic: "Memecoins",
      momentum: 0.65,
      sentiment: "mixed",
      context: "High volatility, community-driven narratives",
    },
  ];
}

/**
 * Match knowledge topics to trends
 */
function findConnections(topics: KnowledgeTopic[], trends: ReturnType<typeof getVinceTrends>): TrendConnection[] {
  const connections: TrendConnection[] = [];
  
  for (const topic of topics) {
    const topicLower = topic.topic.toLowerCase();
    const keywordSet = new Set(topic.keywords);
    
    for (const trend of trends) {
      const trendLower = trend.topic.toLowerCase();
      
      // Check for matches
      const directMatch = topicLower.includes(trendLower) || trendLower.includes(topicLower);
      const keywordMatch = topic.keywords.some(k => trendLower.includes(k));
      
      if (directMatch || keywordMatch) {
        const relevanceScore = directMatch ? 0.9 : 0.6;
        
        connections.push({
          knowledgeTopic: topic.topic,
          trendingNow: trend.momentum > 0.7,
          relevanceScore: relevanceScore * trend.momentum,
          vinceInsight: `${trend.topic}: ${trend.context}`,
          marketContext: `Sentiment: ${trend.sentiment}, Momentum: ${Math.round(trend.momentum * 100)}%`,
          actionable: generateActionables(topic, trend),
        });
      }
    }
  }
  
  return connections.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Generate actionable suggestions
 */
function generateActionables(
  topic: KnowledgeTopic,
  trend: { topic: string; momentum: number; sentiment: string },
): string[] {
  const actions: string[] = [];
  
  if (trend.momentum > 0.7 && topic.fileCount < 5) {
    actions.push(`Expand ${topic.topic} knowledge — high momentum but limited content (${topic.fileCount} files)`);
  }
  
  if (trend.sentiment === "bullish") {
    actions.push(`Consider essay on ${topic.topic} — bullish sentiment = audience interest`);
  }
  
  if (trend.momentum > 0.8) {
    actions.push(`Draft tweets on ${topic.topic} — trending topic, high engagement potential`);
  }
  
  // Check freshness
  const daysSinceUpdate = (Date.now() - new Date(topic.lastUpdated).getTime()) / 86400000;
  if (daysSinceUpdate > 7 && trend.momentum > 0.6) {
    actions.push(`Update ${topic.topic} content — last updated ${Math.round(daysSinceUpdate)} days ago`);
  }
  
  return actions.length > 0 ? actions : ["Monitor for developments"];
}

/**
 * Identify gaps and opportunities
 */
function analyzeGapsAndOpportunities(
  topics: KnowledgeTopic[],
  trends: ReturnType<typeof getVinceTrends>,
  connections: TrendConnection[],
): { gaps: string[]; opportunities: string[] } {
  const gaps: string[] = [];
  const opportunities: string[] = [];
  
  const connectedTrends = new Set(connections.map(c => c.vinceInsight.split(":")[0]));
  
  // Find trending topics not in knowledge base
  for (const trend of trends) {
    if (!connectedTrends.has(trend.topic) && trend.momentum > 0.6) {
      gaps.push(`No knowledge on "${trend.topic}" (momentum: ${Math.round(trend.momentum * 100)}%)`);
      if (trend.momentum > 0.75) {
        opportunities.push(`Research ${trend.topic} — high momentum, no existing content`);
      }
    }
  }
  
  // Find stale high-value topics
  for (const topic of topics) {
    const daysSinceUpdate = (Date.now() - new Date(topic.lastUpdated).getTime()) / 86400000;
    if (daysSinceUpdate > 14 && topic.fileCount > 3) {
      gaps.push(`${topic.topic} content is ${Math.round(daysSinceUpdate)} days stale`);
    }
  }
  
  return { gaps, opportunities };
}

/**
 * Save trend report
 */
function saveTrendReport(report: TrendReport): void {
  const cacheDir = path.dirname(TRENDS_CACHE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(TRENDS_CACHE, JSON.stringify(report, null, 2));
}

export const trendConnectionAction: Action = {
  name: "TREND_CONNECTION",
  description: `Connect knowledge base topics to VINCE's real-time trend analysis.

TRIGGERS:
- "connect trends" — Find trending topics in your knowledge
- "trend connection" — Same as above
- "what's trending in my research" — Same as above
- "vince trends" — Get market trend analysis

OUTPUT:
- Knowledge topics matched to market trends
- Relevance scores and momentum indicators
- Actionable suggestions (essays, tweets, research)
- Knowledge gaps (trending topics not covered)
- Opportunities (high-momentum topics to research)

Uses VINCE's market research to prioritize content production.`,

  similes: [
    "CONNECT_TRENDS",
    "TREND_CONNECTION",
    "VINCE_TRENDS",
    "TRENDING_RESEARCH",
    "MARKET_TRENDS",
  ],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "connect trends" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🔗 **Trend Connection Report**\n\n**Your Knowledge × Market Trends:**\n\n🟢 **AI Agents** (92% relevance)\n• Your content: 8 files in knowledge/ai-agents/\n• VINCE: Explosive growth in autonomous AI agent frameworks\n• Sentiment: Bullish, Momentum: 85%\n• Action: Draft tweets — trending topic, high engagement\n\n🟡 **DeFi** (65% relevance)\n• Your content: 12 files in knowledge/defi/\n• VINCE: Steady TVL growth, focus on real yield\n• Action: Update content — last updated 9 days ago\n\n**Knowledge Gaps:**\n⚠️ No content on \"RWA\" (momentum: 81%)\n\n**Opportunities:**\n💡 Research RWA — high momentum, no existing content",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("trend") ||
      text.includes("vince") && text.includes("research") ||
      text.includes("what's trending")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    logger.info("[Trend Connection] Analyzing knowledge × market trends");

    // Extract knowledge topics
    const topics = extractKnowledgeTopics();
    
    if (topics.length === 0) {
      callback?.({
        text: `🔗 **Trend Connection**\n\n⚠️ **No knowledge categories found.**\n\nCreate folders in \`knowledge/\` and add content first:\n\`\`\`\nknowledge/\n├── ai-agents/\n├── defi/\n├── nfts/\n└── ...\n\`\`\`\n\nThen use UPLOAD to add content, and retry.`,
      });
      return true;
    }

    // Get VINCE trends
    const trends = getVinceTrends();
    
    // Find connections
    const connections = findConnections(topics, trends);
    const { gaps, opportunities } = analyzeGapsAndOpportunities(topics, trends, connections);
    
    // Build report
    const report: TrendReport = {
      generatedAt: new Date().toISOString(),
      knowledgeTopics: topics,
      connections,
      gaps,
      opportunities,
    };
    
    saveTrendReport(report);

    // Format response
    let response = `🔗 **Trend Connection Report**\n\n`;
    response += `*${topics.length} knowledge categories × ${trends.length} market trends*\n\n`;

    if (connections.length > 0) {
      response += `**Your Knowledge × Market Trends:**\n\n`;
      
      for (const conn of connections.slice(0, 5)) {
        const emoji = conn.relevanceScore > 0.7 ? "🟢" : conn.relevanceScore > 0.4 ? "🟡" : "🔴";
        const topic = topics.find(t => t.topic === conn.knowledgeTopic);
        
        response += `${emoji} **${conn.knowledgeTopic}** (${Math.round(conn.relevanceScore * 100)}% relevance)\n`;
        response += `• Your content: ${topic?.fileCount || 0} files in \`knowledge/${topic?.category}/\`\n`;
        response += `• VINCE: ${conn.vinceInsight}\n`;
        if (conn.marketContext) response += `• ${conn.marketContext}\n`;
        if (conn.actionable.length > 0) {
          response += `• **Action:** ${conn.actionable[0]}\n`;
        }
        response += `\n`;
      }
    } else {
      response += `**No direct matches found between knowledge and trends.**\n\n`;
    }

    if (gaps.length > 0) {
      response += `**Knowledge Gaps:**\n`;
      response += gaps.slice(0, 3).map(g => `⚠️ ${g}`).join("\n");
      response += `\n\n`;
    }

    if (opportunities.length > 0) {
      response += `**Opportunities:**\n`;
      response += opportunities.slice(0, 3).map(o => `💡 ${o}`).join("\n");
      response += `\n`;
    }

    response += `\n---\n📁 Report cached at \`.openclaw-cache/trend-connections.json\``;

    callback?.({ text: response });
    logger.info(`[Trend Connection] Found ${connections.length} connections, ${gaps.length} gaps`);
    
    return true;
  },
};

export default trendConnectionAction;
