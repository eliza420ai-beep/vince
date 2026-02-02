/**
 * Trench Knowledge Provider
 *
 * RAG integration with knowledge/grinding-the-trenches/ for:
 * - Meme trading methodologies
 * - Pump.fun strategies
 * - LP DCA frameworks
 * - Market analysis approaches
 *
 * Injects relevant frameworks into MEMES action context
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

interface KnowledgeChunk {
  filename: string;
  title: string;
  section: string;
  content: string;
  keywords: string[];
}

interface TrenchFramework {
  name: string;
  description: string;
  relevance: number;
  keyPoints: string[];
}

// ==========================================
// Knowledge Keywords Mapping
// ==========================================

const FRAMEWORK_KEYWORDS: Record<string, string[]> = {
  "meteora.md": ["lp", "liquidity", "dlmm", "dca", "impermanent", "fees", "volatility", "pool"],
  "pumpdotfun.md": ["pump", "launch", "fair", "bonding", "curve", "graduation", "raydium"],
  "ten-ten.md": ["10-10", "framework", "screening", "criteria", "evaluation"],
  "fair-launch.md": ["fair", "launch", "distribution", "allocation"],
  "eternal-casino.md": ["casino", "gambling", "odds", "risk", "management"],
  "absolutely-rekt.md": ["rekt", "loss", "risk", "management", "psychology"],
  "grind-of-hxxi.md": ["grind", "methodology", "approach", "systematic"],
  "stop-coping.md": ["cope", "psychology", "mindset", "discipline"],
  "the-throne.md": ["throne", "competition", "positioning", "market"],
  "biggest-fish.md": ["whale", "fish", "size", "accumulation"],
  "crypto-bandits.md": ["bandit", "strategy", "tactics", "edge"],
  "the-memetics-era.md": ["meme", "memetics", "narrative", "culture", "virality"],
  "the-reckoning.md": ["reckoning", "cycle", "market", "correction"],
  "treadfi-optimization-framework.md": ["tread", "optimization", "framework", "yield"],
  "patronage.md": ["patron", "support", "community", "ecosystem"],
  "the-poly-strat.md": ["poly", "polymarket", "prediction", "betting"],
};

// ==========================================
// Provider Implementation
// ==========================================

export const trenchKnowledgeProvider: Provider = {
  name: "TRENCH_KNOWLEDGE",
  description: "Methodology frameworks from grinding-the-trenches knowledge",
  dynamic: true, // Only load when explicitly requested

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const contextParts: string[] = [];
    const values: Record<string, unknown> = {};
    const data: Record<string, unknown> = {};

    try {
      const knowledgePath = path.join(process.cwd(), "knowledge", "grinding-the-trenches");
      
      if (!fs.existsSync(knowledgePath)) {
        logger.debug("[TrenchKnowledge] Knowledge directory not found");
        return { text: "", values: {}, data: {} };
      }

      // Analyze message to determine relevant frameworks
      const messageText = message.content?.text?.toLowerCase() || "";
      const relevantFiles = findRelevantFiles(messageText);

      if (relevantFiles.length === 0) {
        // Default to core frameworks when no specific match
        relevantFiles.push("meteora.md", "the-memetics-era.md");
      }

      const frameworks: TrenchFramework[] = [];

      for (const filename of relevantFiles.slice(0, 3)) {
        const filePath = path.join(knowledgePath, filename);
        if (!fs.existsSync(filePath)) continue;

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const framework = extractFramework(filename, content);
          if (framework) {
            frameworks.push(framework);
          }
        } catch (error) {
          logger.debug(`[TrenchKnowledge] Error reading ${filename}: ${error}`);
        }
      }

      if (frameworks.length > 0) {
        contextParts.push("**Trench Frameworks Available**");
        contextParts.push("");

        for (const framework of frameworks) {
          contextParts.push(`📚 **${framework.name}**`);
          contextParts.push(`${framework.description}`);
          if (framework.keyPoints.length > 0) {
            contextParts.push("Key points:");
            for (const point of framework.keyPoints.slice(0, 3)) {
              contextParts.push(`• ${point}`);
            }
          }
          contextParts.push("");
        }

        values.hasFrameworks = true;
        values.frameworkCount = frameworks.length;
        values.frameworkNames = frameworks.map(f => f.name);
        data.frameworks = frameworks;
      }

      // Check if LP strategy is relevant
      const lpKeywords = ["lp", "liquidity", "pool", "meteora", "dlmm", "provide"];
      const isLpRelevant = lpKeywords.some(kw => messageText.includes(kw));
      
      if (isLpRelevant) {
        const lpSummary = getLpDcaSummary();
        if (lpSummary) {
          contextParts.push("**💧 LP DCA Strategy Available**");
          contextParts.push(lpSummary);
          contextParts.push("");
          values.lpStrategyAvailable = true;
        }
      }

      // Add reminder about knowledge updates
      const reminder = await getKnowledgeReminder(knowledgePath);
      if (reminder) {
        data.knowledgeReminder = reminder;
      }

    } catch (error) {
      logger.debug(`[TrenchKnowledge] Error: ${error}`);
    }

    return {
      text: contextParts.join("\n"),
      values,
      data,
    };
  },
};

// ==========================================
// Helper Functions
// ==========================================

function findRelevantFiles(messageText: string): string[] {
  const scores: { file: string; score: number }[] = [];

  for (const [filename, keywords] of Object.entries(FRAMEWORK_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (messageText.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores.push({ file: filename, score });
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .map(s => s.file);
}

function extractFramework(filename: string, content: string): TrenchFramework | null {
  try {
    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename.replace(".md", "");

    // Extract methodology section
    const methodologyMatch = content.match(/## Methodology & Framework\s*\n([\s\S]*?)(?=\n##|\n---|\*\*Important)/);
    const methodology = methodologyMatch ? methodologyMatch[1].trim() : "";

    // Extract key concepts
    const keyConceptsMatch = methodology.match(/\*\*Key Concepts:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n\n)/);
    const keyConcepts = keyConceptsMatch ? keyConceptsMatch[1].trim() : "";

    // Parse key points
    const keyPoints: string[] = [];
    const bulletPoints = keyConcepts.match(/-\s+\*\*([^*]+)\*\*:?\s*([^-\n]+)?/g);
    if (bulletPoints) {
      for (const point of bulletPoints.slice(0, 5)) {
        const cleaned = point.replace(/^-\s+/, "").replace(/\*\*/g, "").trim();
        if (cleaned) keyPoints.push(cleaned);
      }
    }

    // Create short description
    let description = "";
    if (methodology) {
      // Get first paragraph or first 200 chars
      const firstParagraph = methodology.split("\n\n")[0];
      description = firstParagraph.slice(0, 200);
      if (firstParagraph.length > 200) description += "...";
    }

    return {
      name: title,
      description: description || `Framework from ${filename}`,
      relevance: keyPoints.length > 0 ? 0.8 : 0.5,
      keyPoints,
    };
  } catch (error) {
    logger.debug(`[TrenchKnowledge] Error extracting framework from ${filename}: ${error}`);
    return null;
  }
}

function getLpDcaSummary(): string | null {
  return `Meteora DLMM LP as automated DCA: Instead of timing entries, provide liquidity across a price range. The market buys your tokens on pumps, sells them back on dumps. Works best with 20-100% daily volatility memes. High volume = high fees. "Let the market time you."`;
}

async function getKnowledgeReminder(knowledgePath: string): Promise<string | null> {
  try {
    const files = fs.readdirSync(knowledgePath);
    const mdFiles = files.filter(f => f.endsWith(".md") && f !== "README.md");
    
    if (mdFiles.length === 0) {
      return "Consider adding methodology frameworks to knowledge/grinding-the-trenches/";
    }

    // Check for staleness (if no files modified in 30 days)
    const stats = mdFiles.map(f => {
      try {
        return fs.statSync(path.join(knowledgePath, f)).mtime.getTime();
      } catch {
        return 0;
      }
    });
    
    const mostRecent = Math.max(...stats);
    const daysSinceUpdate = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 30) {
      return `Trench knowledge hasn't been updated in ${Math.floor(daysSinceUpdate)} days. Consider adding new frameworks.`;
    }

    return null;
  } catch {
    return null;
  }
}

// ==========================================
// Exported Utilities
// ==========================================

/**
 * Get a specific framework by keyword
 */
export async function getFrameworkForTopic(topic: string): Promise<TrenchFramework | null> {
  const knowledgePath = path.join(process.cwd(), "knowledge", "grinding-the-trenches");
  
  if (!fs.existsSync(knowledgePath)) {
    return null;
  }

  const relevantFiles = findRelevantFiles(topic.toLowerCase());
  if (relevantFiles.length === 0) return null;

  const filePath = path.join(knowledgePath, relevantFiles[0]);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  return extractFramework(relevantFiles[0], content);
}

/**
 * List all available frameworks
 */
export function listAvailableFrameworks(): string[] {
  const knowledgePath = path.join(process.cwd(), "knowledge", "grinding-the-trenches");
  
  if (!fs.existsSync(knowledgePath)) {
    return [];
  }

  const files = fs.readdirSync(knowledgePath);
  return files
    .filter(f => f.endsWith(".md") && f !== "README.md")
    .map(f => f.replace(".md", ""));
}

export default trenchKnowledgeProvider;
