/**
 * KNOWLEDGE_STATUS Action
 *
 * Reports on the health and coverage of the knowledge base.
 * Shows category stats, recent additions, gaps, and suggestions.
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
import { getKnowledgeRoot } from "../config/paths";

interface CategoryStats {
  name: string;
  fileCount: number;
  totalWords: number;
  lastUpdated: Date | null;
  recentFiles: string[];
}

interface KnowledgeReport {
  totalFiles: number;
  totalWords: number;
  categories: CategoryStats[];
  recentAdditions: { file: string; category: string; date: Date }[];
  oldestCategory: string | null;
  suggestions: string[];
}

function getFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      files.push(...getFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function countWords(content: string): number {
  return content.split(/\s+/).filter((w) => w.length > 0).length;
}

function analyzeKnowledgeBase(): KnowledgeReport {
  const categories: CategoryStats[] = [];
  const allFiles: { file: string; category: string; date: Date; words: number }[] = [];

  const knowledgeBase = getKnowledgeRoot();
  if (!fs.existsSync(knowledgeBase)) {
    return {
      totalFiles: 0,
      totalWords: 0,
      categories: [],
      recentAdditions: [],
      oldestCategory: null,
      suggestions: [`Knowledge base directory not found. Create ${knowledgeBase}/`],
    };
  }

  const topLevelDirs = fs.readdirSync(knowledgeBase, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  for (const dir of topLevelDirs) {
    const categoryPath = path.join(knowledgeBase, dir.name);
    const files = getFilesRecursive(categoryPath);
    
    let totalWords = 0;
    let lastUpdated: Date | null = null;
    const recentFiles: string[] = [];

    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        const content = fs.readFileSync(file, "utf-8");
        const words = countWords(content);
        totalWords += words;

        if (!lastUpdated || stat.mtime > lastUpdated) {
          lastUpdated = stat.mtime;
        }

        allFiles.push({
          file: path.basename(file),
          category: dir.name,
          date: stat.mtime,
          words,
        });

        if (recentFiles.length < 3) {
          recentFiles.push(path.basename(file));
        }
      } catch (e) {
        // Skip files we can't read
      }
    }

    categories.push({
      name: dir.name,
      fileCount: files.length,
      totalWords,
      lastUpdated,
      recentFiles,
    });
  }

  // Sort by file count
  categories.sort((a, b) => b.fileCount - a.fileCount);

  // Recent additions (last 10)
  allFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentAdditions = allFiles.slice(0, 10).map((f) => ({
    file: f.file,
    category: f.category,
    date: f.date,
  }));

  // Find oldest category (might need updates)
  const categoriesWithDates = categories.filter((c) => c.lastUpdated);
  categoriesWithDates.sort((a, b) => 
    (a.lastUpdated?.getTime() || 0) - (b.lastUpdated?.getTime() || 0)
  );
  const oldestCategory = categoriesWithDates[0]?.name || null;

  // Generate suggestions
  const suggestions: string[] = [];
  
  // Check for small categories
  const smallCategories = categories.filter((c) => c.fileCount < 5 && c.fileCount > 0);
  if (smallCategories.length > 0) {
    suggestions.push(`Expand: ${smallCategories.map((c) => c.name).join(", ")} (< 5 files each)`);
  }

  // Check for stale categories (> 30 days old)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleCategories = categories.filter(
    (c) => c.lastUpdated && c.lastUpdated < thirtyDaysAgo
  );
  if (staleCategories.length > 0) {
    suggestions.push(`Refresh: ${staleCategories.slice(0, 3).map((c) => c.name).join(", ")} (> 30 days stale)`);
  }

  // Empty categories
  const emptyCategories = categories.filter((c) => c.fileCount === 0);
  if (emptyCategories.length > 0) {
    suggestions.push(`Empty folders: ${emptyCategories.map((c) => c.name).join(", ")}`);
  }

  if (suggestions.length === 0) {
    suggestions.push("Knowledge base looks healthy! Keep adding quality content.");
  }

  return {
    totalFiles: allFiles.length,
    totalWords: categories.reduce((sum, c) => sum + c.totalWords, 0),
    categories,
    recentAdditions,
    oldestCategory,
    suggestions,
  };
}

function formatReport(report: KnowledgeReport): string {
  const totalWordsK = (report.totalWords / 1000).toFixed(1);
  
  // Top categories
  const topCategories = report.categories.slice(0, 10).map((c) => {
    const wordsK = (c.totalWords / 1000).toFixed(1);
    const age = c.lastUpdated 
      ? `${Math.floor((Date.now() - c.lastUpdated.getTime()) / (24 * 60 * 60 * 1000))}d ago`
      : "never";
    return `• **${c.name}**: ${c.fileCount} files, ${wordsK}k words (${age})`;
  }).join("\n");

  // Recent additions
  const recent = report.recentAdditions.slice(0, 5).map((r) => {
    const daysAgo = Math.floor((Date.now() - r.date.getTime()) / (24 * 60 * 60 * 1000));
    return `• \`${r.category}/${r.file}\` (${daysAgo}d ago)`;
  }).join("\n");

  // Suggestions
  const suggestions = report.suggestions.map((s) => `• ${s}`).join("\n");

  return `📚 **Knowledge Base Status**

**Overview:**
• Total Files: ${report.totalFiles}
• Total Words: ~${totalWordsK}k
• Categories: ${report.categories.length}

**Top Categories:**
${topCategories}

**Recent Additions:**
${recent || "• None yet"}

**Suggestions:**
${suggestions}

---
*Upload more: paste content, YouTube links, or article URLs*`;
}

export const knowledgeStatusAction: Action = {
  name: "KNOWLEDGE_STATUS",
  similes: [
    "KNOWLEDGE_HEALTH",
    "KB_STATUS",
    "CORPUS_STATUS",
    "CHECK_KNOWLEDGE",
    "KNOWLEDGE_REPORT",
  ],
  description: `Quick stats on the knowledge base: file counts per category, word counts, recent additions, and high-level suggestions (e.g. expand small categories, refresh stale). For gap analysis against the coverage framework (missing subtopics, shallow/stale, research queue), use "audit knowledge" instead.

TRIGGERS:
- "knowledge status"
- "how's the knowledge base"
- "corpus health"
- "what's in our knowledge"
- "kb status"`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      text.includes("knowledge status") ||
      text.includes("knowledge health") ||
      text.includes("kb status") ||
      text.includes("corpus status") ||
      text.includes("corpus health") ||
      (text.includes("knowledge") && text.includes("check")) ||
      (text.includes("knowledge") && text.includes("how")) ||
      text.includes("knowledge report")
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
      logger.info("[KNOWLEDGE_STATUS] Analyzing knowledge base...");
      
      const report = analyzeKnowledgeBase();
      const formatted = formatReport(report);

      if (callback) {
        const out = "Here's the knowledge status—\n\n" + formatted;
        await callback({
          text: out,
          actions: ["KNOWLEDGE_STATUS"],
        });
      }
    } catch (error) {
      logger.error({ error }, "[KNOWLEDGE_STATUS] Error");
      if (callback) {
        await callback({
          text: `❌ Error checking knowledge base: ${String(error)}`,
          actions: ["KNOWLEDGE_STATUS"],
        });
      }
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "knowledge status" } },
      {
        name: "{{agent}}",
        content: {
          text: "📚 **Knowledge Base Status**\n\n**Overview:**\n• Total Files: 245\n• Total Words: ~180k...",
          actions: ["KNOWLEDGE_STATUS"],
        },
      },
    ],
  ],
};

export default knowledgeStatusAction;
