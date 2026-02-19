/**
 * Impact Scorer Service
 *
 * Evaluates potential work items by:
 * - Revenue potential (will this make money?)
 * - User value (does this help users?)
 * - Strategic alignment (does this advance the vision?)
 * - Effort required (how hard is this?)
 * - Dependencies (what's blocking this?)
 *
 * Uses RICE-style scoring: (Reach × Impact × Confidence) / Effort
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

const CACHE_PATH = path.join(
  process.cwd(),
  ".openclaw-cache",
  "impact-scores.json",
);

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  category: "feature" | "fix" | "infra" | "content" | "research" | "ops";
  plugin?: string;
  suggestedBy?: string;
  createdAt: string;
}

export interface ImpactScore {
  workItemId: string;

  // RICE components (1-10 scale)
  reach: number; // How many users/use-cases does this affect?
  impact: number; // How much does it improve things?
  confidence: number; // How sure are we about reach/impact?
  effort: number; // How many days/sprints?

  // Strategic factors
  revenueAlignment: number; // Does this lead to revenue? (1-10)
  northStarAlignment: number; // Does this advance north star? (1-10)
  techDebtReduction: number; // Does this reduce tech debt? (1-10)

  // Computed
  riceScore: number; // (reach × impact × confidence) / effort
  strategicScore: number; // weighted strategic factors
  totalScore: number; // combined score

  // Metadata
  scoredAt: string;
  scoredBy: string;
  notes?: string;
}

export interface SuggestionHistory {
  suggestion: string;
  category: string;
  suggestedAt: string;
  outcome: "accepted" | "rejected" | "deferred" | "pending";
  outcomeAt?: string;
  outcomeNotes?: string;
  impactAfter?: string; // What happened after acceptance?
}

interface ScoreCache {
  scores: Record<string, ImpactScore>;
  history: SuggestionHistory[];
  lastUpdated: string;
}

// Category weights for strategic alignment
const CATEGORY_WEIGHTS = {
  "24/7-market-research": 2.0, // TOP PRIORITY per Sentinel's north star
  revenue: 1.8,
  "user-value": 1.5,
  "north-star": 1.4,
  "tech-debt": 1.0,
  "nice-to-have": 0.5,
};

// Keywords that indicate high impact
const HIGH_IMPACT_KEYWORDS = [
  "revenue",
  "money",
  "profit",
  "alpha",
  "edge",
  "signal",
  "24/7",
  "market research",
  "vince push",
  "x research",
  "paper trading",
  "real trading",
  "live",
  "user",
  "customer",
  "adoption",
  "blocked",
  "critical",
  "urgent",
];

// Keywords that indicate lower priority
const LOW_PRIORITY_KEYWORDS = [
  "nice to have",
  "later",
  "maybe",
  "consider",
  "cleanup",
  "refactor",
  "style",
  "docs",
];

/**
 * Load score cache
 */
function loadCache(): ScoreCache {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    }
  } catch (e) {
    logger.debug("[ImpactScorer] No cache found");
  }

  return {
    scores: {},
    history: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save score cache
 */
function saveCache(cache: ScoreCache): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  cache.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * Auto-score a work item based on keywords and context
 */
export function autoScore(item: WorkItem): ImpactScore {
  const textLower = `${item.title} ${item.description}`.toLowerCase();

  // Base scores
  let reach = 5;
  let impact = 5;
  let confidence = 5;
  let effort = 5;
  let revenueAlignment = 3;
  let northStarAlignment = 5;
  let techDebtReduction = 3;

  // Boost for high-impact keywords
  for (const keyword of HIGH_IMPACT_KEYWORDS) {
    if (textLower.includes(keyword)) {
      impact += 1;
      reach += 0.5;
    }
  }

  // Reduce for low-priority keywords
  for (const keyword of LOW_PRIORITY_KEYWORDS) {
    if (textLower.includes(keyword)) {
      impact -= 1;
      confidence -= 1;
    }
  }

  // Category-specific adjustments
  if (
    textLower.includes("24/7") ||
    textLower.includes("market research") ||
    textLower.includes("vince")
  ) {
    revenueAlignment += 3;
    northStarAlignment += 3;
    impact += 2;
  }

  if (
    textLower.includes("trading") ||
    textLower.includes("signal") ||
    textLower.includes("alpha")
  ) {
    revenueAlignment += 2;
    impact += 1;
  }

  if (
    textLower.includes("user") ||
    textLower.includes("ux") ||
    textLower.includes("dashboard")
  ) {
    reach += 2;
  }

  if (
    textLower.includes("tech debt") ||
    textLower.includes("refactor") ||
    textLower.includes("cleanup")
  ) {
    techDebtReduction += 3;
    impact -= 1;
  }

  if (
    textLower.includes("blocked") ||
    textLower.includes("critical") ||
    textLower.includes("urgent")
  ) {
    impact += 2;
    confidence += 1;
  }

  // Estimate effort based on scope keywords
  if (
    textLower.includes("small") ||
    textLower.includes("quick") ||
    textLower.includes("minor")
  ) {
    effort -= 2;
  }
  if (
    textLower.includes("large") ||
    textLower.includes("major") ||
    textLower.includes("rewrite")
  ) {
    effort += 3;
  }
  if (textLower.includes("new plugin") || textLower.includes("new service")) {
    effort += 2;
  }

  // Clamp values to 1-10
  reach = Math.max(1, Math.min(10, Math.round(reach)));
  impact = Math.max(1, Math.min(10, Math.round(impact)));
  confidence = Math.max(1, Math.min(10, Math.round(confidence)));
  effort = Math.max(1, Math.min(10, Math.round(effort)));
  revenueAlignment = Math.max(1, Math.min(10, Math.round(revenueAlignment)));
  northStarAlignment = Math.max(
    1,
    Math.min(10, Math.round(northStarAlignment)),
  );
  techDebtReduction = Math.max(1, Math.min(10, Math.round(techDebtReduction)));

  // Calculate scores
  const riceScore = (reach * impact * confidence) / effort;
  const strategicScore =
    revenueAlignment * 0.4 + northStarAlignment * 0.4 + techDebtReduction * 0.2;
  const totalScore = riceScore * (strategicScore / 10);

  return {
    workItemId: item.id,
    reach,
    impact,
    confidence,
    effort,
    revenueAlignment,
    northStarAlignment,
    techDebtReduction,
    riceScore: Math.round(riceScore * 10) / 10,
    strategicScore: Math.round(strategicScore * 10) / 10,
    totalScore: Math.round(totalScore * 10) / 10,
    scoredAt: new Date().toISOString(),
    scoredBy: "auto",
  };
}

/**
 * Score and rank multiple work items
 */
export function rankWorkItems(
  items: WorkItem[],
): Array<WorkItem & { score: ImpactScore }> {
  const scored = items.map((item) => ({
    ...item,
    score: autoScore(item),
  }));

  return scored.sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * Record a suggestion and its outcome
 */
export function recordSuggestion(
  suggestion: string,
  category: string,
  outcome: SuggestionHistory["outcome"] = "pending",
): void {
  const cache = loadCache();

  cache.history.push({
    suggestion,
    category,
    suggestedAt: new Date().toISOString(),
    outcome,
  });

  // Keep last 100 suggestions
  if (cache.history.length > 100) {
    cache.history = cache.history.slice(-100);
  }

  saveCache(cache);
}

/**
 * Update suggestion outcome
 */
export function updateSuggestionOutcome(
  suggestion: string,
  outcome: SuggestionHistory["outcome"],
  notes?: string,
): void {
  const cache = loadCache();

  // Find most recent matching suggestion
  for (let i = cache.history.length - 1; i >= 0; i--) {
    if (cache.history[i].suggestion.includes(suggestion.slice(0, 50))) {
      cache.history[i].outcome = outcome;
      cache.history[i].outcomeAt = new Date().toISOString();
      cache.history[i].outcomeNotes = notes;
      break;
    }
  }

  saveCache(cache);
}

/**
 * Get suggestion acceptance rate by category
 */
export function getAcceptanceRates(): Record<
  string,
  { accepted: number; total: number; rate: number }
> {
  const cache = loadCache();
  const rates: Record<
    string,
    { accepted: number; total: number; rate: number }
  > = {};

  for (const h of cache.history) {
    if (!rates[h.category]) {
      rates[h.category] = { accepted: 0, total: 0, rate: 0 };
    }

    if (h.outcome !== "pending") {
      rates[h.category].total++;
      if (h.outcome === "accepted") {
        rates[h.category].accepted++;
      }
    }
  }

  for (const cat of Object.keys(rates)) {
    rates[cat].rate =
      rates[cat].total > 0
        ? Math.round((rates[cat].accepted / rates[cat].total) * 100)
        : 0;
  }

  return rates;
}

/**
 * Learn from history to adjust scoring
 */
export function getLearnings(): string[] {
  const rates = getAcceptanceRates();
  const learnings: string[] = [];

  for (const [category, stats] of Object.entries(rates)) {
    if (stats.total >= 3) {
      if (stats.rate >= 80) {
        learnings.push(
          `✅ ${category}: ${stats.rate}% acceptance — keep suggesting`,
        );
      } else if (stats.rate <= 30) {
        learnings.push(
          `⚠️ ${category}: ${stats.rate}% acceptance — reduce these suggestions`,
        );
      }
    }
  }

  const cache = loadCache();
  const recentRejections = cache.history
    .filter((h) => h.outcome === "rejected" && h.outcomeNotes)
    .slice(-5);

  if (recentRejections.length > 0) {
    learnings.push(
      `📝 Recent rejection notes: ${recentRejections.map((r) => r.outcomeNotes).join("; ")}`,
    );
  }

  return learnings;
}

/**
 * Format a score for display
 */
export function formatScore(score: ImpactScore): string {
  const emoji =
    score.totalScore >= 50
      ? "🔥"
      : score.totalScore >= 30
        ? "🟢"
        : score.totalScore >= 15
          ? "🟡"
          : "⚪";

  return `${emoji} **Score: ${score.totalScore}** (RICE: ${score.riceScore}, Strategic: ${score.strategicScore})
• Reach: ${score.reach}/10, Impact: ${score.impact}/10, Confidence: ${score.confidence}/10, Effort: ${score.effort}/10
• Revenue: ${score.revenueAlignment}/10, North Star: ${score.northStarAlignment}/10, Tech Debt: ${score.techDebtReduction}/10`;
}

export default {
  autoScore,
  rankWorkItems,
  recordSuggestion,
  updateSuggestionOutcome,
  getAcceptanceRates,
  getLearnings,
  formatScore,
};
