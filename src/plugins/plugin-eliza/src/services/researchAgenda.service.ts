/**
 * Research Agenda Service
 *
 * Manages Eliza's autonomous knowledge expansion:
 * - Tracks knowledge gaps and research priorities
 * - Maintains a research queue with progress
 * - Schedules and tracks research sessions
 * - Learns from what content performs well
 *
 * The agenda persists across sessions and guides
 * Eliza's proactive knowledge work.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import { getKnowledgeRoot } from "../config/paths";

const AGENDA_PATH = path.join(process.cwd(), ".openclaw-cache", "research-agenda.json");

/**
 * Map coverage framework category names to actual knowledge folder names.
 * This aligns the audit with the same directories Eliza's character.knowledge uses.
 */
const FRAMEWORK_CATEGORY_TO_FOLDERS: Record<string, string[]> = {
  "crypto-fundamentals": ["bitcoin-maxi", "macro-economy", "altcoins", "solana", "privacy", "security", "commodities"],
  defi: ["defi-metrics", "stablecoins", "rwa", "airdrops", "bankr"],
  trading: ["options", "perps-trading", "grinding-the-trenches", "trading", "stocks"],
  layer2: ["substack-essays", "internal-docs"],
  nft: ["art-collections"],
  governance: ["regulation", "legal-compliance", "teammate"],
  "ai-agents": ["prompt-templates", "internal-docs", "substack-essays", "setup-guides", "clawdbot", "sentinel-docs"],
  "lifestyle-and-gtm": ["the-good-life", "marketing-gtm"],
  emerging: ["substack-essays", "venture-capital", "altcoins", "brand", "kelly-btc", "uncategorized"],
};

export interface ResearchTopic {
  id: string;
  topic: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "queued" | "researching" | "completed" | "blocked";
  reason: string; // Why this topic was added
  sources: string[]; // Suggested sources to research
  depth: "overview" | "intermediate" | "deep"; // How deep to go
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  filesAdded?: string[]; // Files created from this research
  notes?: string;
}

export interface KnowledgeGap {
  category: string;
  gapType: "missing" | "shallow" | "stale" | "emerging" | "subtopics";
  description: string;
  suggestedTopics: string[];
  priority: "critical" | "high" | "medium" | "low";
  detectedAt: string;
}

export interface ResearchSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  topicsResearched: string[];
  filesCreated: string[];
  sourcesUsed: string[];
  notes?: string;
}

export interface ResearchAgenda {
  version: string;
  lastUpdated: string;
  lastAudit?: string;
  lastResearchSession?: string;
  
  // Core framework: what knowledge should we have?
  coverageFramework: {
    categories: Array<{
      name: string;
      description: string;
      targetDepth: "overview" | "intermediate" | "deep";
      priority: "critical" | "high" | "medium" | "low";
      subtopics: string[];
    }>;
  };
  
  // Current state
  gaps: KnowledgeGap[];
  topics: ResearchTopic[];
  sessions: ResearchSession[];
  
  // Stats
  stats: {
    totalTopicsResearched: number;
    totalFilesCreated: number;
    avgTopicsPerSession: number;
    lastSessionDuration?: number;
  };
}

// Default coverage framework for crypto/trading knowledge base
const DEFAULT_COVERAGE_FRAMEWORK: ResearchAgenda["coverageFramework"] = {
  categories: [
    {
      name: "crypto-fundamentals",
      description: "Core blockchain and crypto concepts",
      targetDepth: "deep",
      priority: "critical",
      subtopics: [
        "Bitcoin fundamentals",
        "Ethereum fundamentals", 
        "Consensus mechanisms",
        "Cryptographic primitives",
        "Wallet security",
        "Key management",
      ],
    },
    {
      name: "defi",
      description: "Decentralized finance protocols and concepts",
      targetDepth: "deep",
      priority: "critical",
      subtopics: [
        "AMM mechanics",
        "Lending protocols",
        "Yield strategies",
        "Stablecoins",
        "Derivatives/Perps",
        "MEV and arbitrage",
        "Protocol risks",
        "TVL analysis",
      ],
    },
    {
      name: "trading",
      description: "Trading strategies and market analysis",
      targetDepth: "deep",
      priority: "high",
      subtopics: [
        "Technical analysis",
        "On-chain analysis",
        "Market microstructure",
        "Risk management",
        "Position sizing",
        "Portfolio construction",
        "Market psychology",
      ],
    },
    {
      name: "layer2",
      description: "L2 scaling solutions",
      targetDepth: "intermediate",
      priority: "high",
      subtopics: [
        "Rollup types (optimistic vs ZK)",
        "Major L2s (Arbitrum, Optimism, Base, zkSync)",
        "Bridging and security",
        "L2 economics",
      ],
    },
    {
      name: "nft",
      description: "NFT technology and markets",
      targetDepth: "intermediate",
      priority: "medium",
      subtopics: [
        "NFT standards",
        "Marketplaces",
        "Valuation frameworks",
        "Creator economics",
      ],
    },
    {
      name: "governance",
      description: "DAO governance and token economics",
      targetDepth: "intermediate",
      priority: "medium",
      subtopics: [
        "Governance models",
        "Token design",
        "Vote delegation",
        "Treasury management",
      ],
    },
    {
      name: "ai-agents",
      description: "AI agents in crypto",
      targetDepth: "deep",
      priority: "high",
      subtopics: [
        "Agent frameworks",
        "Agent tokens",
        "Autonomous trading",
        "Agent infrastructure",
      ],
    },
    {
      name: "lifestyle-and-gtm",
      description: "Lifestyle, marketing, GTM, and positioning",
      targetDepth: "intermediate",
      priority: "high",
      subtopics: [
        "The good life",
        "Michelin and travel",
        "Marketing and positioning",
        "GTM and narrative",
        "Substack and content",
      ],
    },
    {
      name: "emerging",
      description: "Emerging trends and narratives",
      targetDepth: "overview",
      priority: "medium",
      subtopics: [
        "Current narratives",
        "New protocols",
        "Regulatory developments",
        "Institutional adoption",
      ],
    },
  ],
};

/**
 * Get all .md file paths under dir (recursive). Returns full paths.
 */
function getMdFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".")) {
      out.push(...getMdFilesRecursive(full));
    } else if (e.isFile() && e.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Get the list of knowledge folder names to scan for a framework category.
 */
function getFoldersForCategory(categoryName: string): string[] {
  const mapped = FRAMEWORK_CATEGORY_TO_FOLDERS[categoryName];
  return mapped ?? [categoryName];
}

/**
 * Load or initialize research agenda
 */
export function loadAgenda(): ResearchAgenda {
  try {
    if (fs.existsSync(AGENDA_PATH)) {
      const data = JSON.parse(fs.readFileSync(AGENDA_PATH, "utf-8"));
      return data as ResearchAgenda;
    }
  } catch (e) {
    logger.debug("[ResearchAgenda] No existing agenda, creating new");
  }
  
  const agenda: ResearchAgenda = {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    coverageFramework: DEFAULT_COVERAGE_FRAMEWORK,
    gaps: [],
    topics: [],
    sessions: [],
    stats: {
      totalTopicsResearched: 0,
      totalFilesCreated: 0,
      avgTopicsPerSession: 0,
    },
  };
  
  saveAgenda(agenda);
  return agenda;
}

/**
 * Save research agenda
 */
export function saveAgenda(agenda: ResearchAgenda): void {
  const dir = path.dirname(AGENDA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  agenda.lastUpdated = new Date().toISOString();
  fs.writeFileSync(AGENDA_PATH, JSON.stringify(agenda, null, 2));
}

/**
 * Analyze knowledge folder against coverage framework.
 * Uses FRAMEWORK_CATEGORY_TO_FOLDERS to map framework categories to actual
 * knowledge dirs (same as Eliza's character.knowledge) and counts .md files recursively.
 */
export function auditKnowledge(): { gaps: KnowledgeGap[]; coverage: Record<string, number> } {
  const agenda = loadAgenda();
  const gaps: KnowledgeGap[] = [];
  const coverage: Record<string, number> = {};

  for (const category of agenda.coverageFramework.categories) {
    const folderNames = getFoldersForCategory(category.name);
    const allFilePaths: string[] = [];
    let hasAnyFolder = false;

    for (const folderName of folderNames) {
      const categoryPath = path.join(getKnowledgeRoot(), folderName);
      if (!fs.existsSync(categoryPath)) continue;
      hasAnyFolder = true;
      allFilePaths.push(...getMdFilesRecursive(categoryPath));
    }

    if (!hasAnyFolder) {
      gaps.push({
        category: category.name,
        gapType: "missing",
        description: `No mapped folders exist for "${category.name}" (checked: ${folderNames.join(", ")})`,
        suggestedTopics: category.subtopics,
        priority: category.priority,
        detectedAt: new Date().toISOString(),
      });
      coverage[category.name] = 0;
      continue;
    }

    const fileCount = allFilePaths.length;
    const expectedFiles = category.subtopics.length * (category.targetDepth === "deep" ? 2 : 1);
    const coveragePercent = Math.min(100, Math.round((fileCount / expectedFiles) * 100));
    coverage[category.name] = coveragePercent;

    if (fileCount < category.subtopics.length / 2) {
      gaps.push({
        category: category.name,
        gapType: "shallow",
        description: `Only ${fileCount} files for ${category.subtopics.length} expected subtopics (folders: ${folderNames.join(", ")})`,
        suggestedTopics: findMissingSubtopicsFromFiles(allFilePaths, category.subtopics),
        priority: category.priority,
        detectedAt: new Date().toISOString(),
      });
    }

    // Always check content for missing subtopics (even when file count is high)
    const missingSubtopics = findMissingSubtopicsFromFiles(allFilePaths, category.subtopics);
    if (missingSubtopics.length > 0) {
      gaps.push({
        category: category.name,
        gapType: "subtopics",
        description: `${missingSubtopics.length} subtopics not covered in content (${fileCount} files)`,
        suggestedTopics: missingSubtopics,
        priority: category.priority,
        detectedAt: new Date().toISOString(),
      });
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let staleCount = 0;
    for (const filePath of allFilePaths) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < thirtyDaysAgo) staleCount++;
      } catch {
        // skip unreadable
      }
    }
    if (staleCount > fileCount / 2 && fileCount > 0) {
      gaps.push({
        category: category.name,
        gapType: "stale",
        description: `${staleCount}/${fileCount} files are over 30 days old`,
        suggestedTopics: ["Review and update existing content"],
        priority: "medium",
        detectedAt: new Date().toISOString(),
      });
    }
  }

  agenda.gaps = gaps;
  agenda.lastAudit = new Date().toISOString();
  saveAgenda(agenda);

  return { gaps, coverage };
}

/**
 * Find subtopics not covered in the given files (by content).
 */
function findMissingSubtopicsFromFiles(filePaths: string[], subtopics: string[]): string[] {
  let fileContent = "";
  for (const filePath of filePaths) {
    try {
      fileContent += fs.readFileSync(filePath, "utf-8").toLowerCase() + " ";
    } catch {
      // skip
    }
  }

  const missing: string[] = [];
  for (const subtopic of subtopics) {
    const keywords = subtopic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const covered = keywords.length > 0 && keywords.some(kw => fileContent.includes(kw));
    if (!covered) {
      missing.push(subtopic);
    }
  }
  return missing;
}

/**
 * Add research topic to queue
 */
export function addResearchTopic(
  topic: string,
  category: string,
  options: {
    priority?: ResearchTopic["priority"];
    reason?: string;
    sources?: string[];
    depth?: ResearchTopic["depth"];
  } = {}
): ResearchTopic {
  const agenda = loadAgenda();
  
  // Check for duplicate
  const existing = agenda.topics.find(
    t => t.topic.toLowerCase() === topic.toLowerCase() && t.status !== "completed"
  );
  if (existing) {
    return existing;
  }
  
  const newTopic: ResearchTopic = {
    id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    topic,
    category,
    priority: options.priority || "medium",
    status: "queued",
    reason: options.reason || "Manually added",
    sources: options.sources || [],
    depth: options.depth || "intermediate",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  agenda.topics.push(newTopic);
  saveAgenda(agenda);
  
  logger.info(`[ResearchAgenda] Added topic: ${topic} (${category})`);
  return newTopic;
}

/**
 * Get next topics to research
 */
export function getNextTopics(limit = 5): ResearchTopic[] {
  const agenda = loadAgenda();
  
  const queued = agenda.topics
    .filter(t => t.status === "queued")
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  
  return queued.slice(0, limit);
}

/**
 * Update topic status
 */
export function updateTopicStatus(
  topicId: string,
  status: ResearchTopic["status"],
  updates: Partial<ResearchTopic> = {}
): void {
  const agenda = loadAgenda();
  const topic = agenda.topics.find(t => t.id === topicId);
  
  if (!topic) {
    logger.warn(`[ResearchAgenda] Topic not found: ${topicId}`);
    return;
  }
  
  topic.status = status;
  topic.updatedAt = new Date().toISOString();
  
  if (status === "completed") {
    topic.completedAt = new Date().toISOString();
    agenda.stats.totalTopicsResearched++;
  }
  
  Object.assign(topic, updates);
  saveAgenda(agenda);
}

/**
 * Start a research session
 */
export function startResearchSession(): ResearchSession {
  const agenda = loadAgenda();
  
  const session: ResearchSession = {
    id: `session-${Date.now()}`,
    startedAt: new Date().toISOString(),
    topicsResearched: [],
    filesCreated: [],
    sourcesUsed: [],
  };
  
  agenda.sessions.push(session);
  agenda.lastResearchSession = session.startedAt;
  saveAgenda(agenda);
  
  logger.info(`[ResearchAgenda] Started research session: ${session.id}`);
  return session;
}

/**
 * End research session
 */
export function endResearchSession(
  sessionId: string,
  results: { topicsResearched: string[]; filesCreated: string[]; sourcesUsed: string[]; notes?: string }
): void {
  const agenda = loadAgenda();
  const session = agenda.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    logger.warn(`[ResearchAgenda] Session not found: ${sessionId}`);
    return;
  }
  
  session.endedAt = new Date().toISOString();
  session.topicsResearched = results.topicsResearched;
  session.filesCreated = results.filesCreated;
  session.sourcesUsed = results.sourcesUsed;
  session.notes = results.notes;
  
  // Update stats
  agenda.stats.totalFilesCreated += results.filesCreated.length;
  const completedSessions = agenda.sessions.filter(s => s.endedAt);
  agenda.stats.avgTopicsPerSession = 
    completedSessions.reduce((sum, s) => sum + s.topicsResearched.length, 0) / completedSessions.length;
  
  saveAgenda(agenda);
  logger.info(`[ResearchAgenda] Ended session: ${results.filesCreated.length} files created`);
}

/**
 * Generate topics from gaps
 */
export function generateTopicsFromGaps(): number {
  const { gaps } = auditKnowledge();
  let added = 0;
  
  for (const gap of gaps) {
    for (const topic of gap.suggestedTopics.slice(0, 3)) {
      addResearchTopic(topic, gap.category, {
        priority: gap.priority,
        reason: `Gap detected: ${gap.gapType} - ${gap.description}`,
        depth: gap.gapType === "shallow" ? "deep" : gap.gapType === "subtopics" ? "intermediate" : "intermediate",
      });
      added++;
    }
  }
  
  logger.info(`[ResearchAgenda] Generated ${added} topics from ${gaps.length} gaps`);
  return added;
}

/**
 * Get agenda summary
 */
export function getAgendaSummary(): string {
  const agenda = loadAgenda();
  const { gaps, coverage } = auditKnowledge();
  
  const queuedTopics = agenda.topics.filter(t => t.status === "queued");
  const criticalTopics = queuedTopics.filter(t => t.priority === "critical");
  const highTopics = queuedTopics.filter(t => t.priority === "high");
  
  let summary = `📚 **Research Agenda**\n\n`;
  
  // Coverage overview
  summary += `**Coverage by Category:**\n`;
  for (const [cat, pct] of Object.entries(coverage)) {
    const bar = pct >= 80 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
    summary += `${bar} ${cat}: ${pct}%\n`;
  }
  summary += `\n`;
  
  // Gaps
  if (gaps.length > 0) {
    summary += `**Knowledge Gaps (${gaps.length}):**\n`;
    for (const gap of gaps.slice(0, 5)) {
      summary += `• ${gap.category}: ${gap.description}\n`;
    }
    summary += `\n`;
  }
  
  // Queue
  summary += `**Research Queue:**\n`;
  summary += `• ${criticalTopics.length} critical\n`;
  summary += `• ${highTopics.length} high priority\n`;
  summary += `• ${queuedTopics.length} total queued\n\n`;
  
  // Stats
  summary += `**Stats:**\n`;
  summary += `• ${agenda.stats.totalTopicsResearched} topics researched\n`;
  summary += `• ${agenda.stats.totalFilesCreated} files created\n`;
  summary += `• ${agenda.sessions.length} research sessions\n`;
  
  if (agenda.lastAudit) {
    const auditAge = Date.now() - new Date(agenda.lastAudit).getTime();
    const auditDays = Math.floor(auditAge / 86400000);
    summary += `• Last audit: ${auditDays === 0 ? "today" : `${auditDays} days ago`}\n`;
  }
  
  return summary;
}

export default {
  loadAgenda,
  saveAgenda,
  auditKnowledge,
  addResearchTopic,
  getNextTopics,
  updateTopicStatus,
  startResearchSession,
  endResearchSession,
  generateTopicsFromGaps,
  getAgendaSummary,
};
