/**
 * Flywheel Score Service (#29)
 *
 * One composite number (0-100) measuring system health:
 * - Signal quality trend (VinceBench) — 20%
 * - Trade performance (4-week rolling Sharpe) — 25%
 * - Sentiment accuracy (Echo/Oracle vs outcome) — 10%
 * - Content output (Eliza drafts/week) — 10%
 * - Knowledge growth (new items/week) — 10%
 * - Engineering velocity (Sentinel features) — 10%
 * - Genome improvement (gen-over-gen Sharpe delta) — 15%
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface FlywheelComponents {
  signalQuality: number;
  tradePerformance: number;
  sentimentAccuracy: number;
  contentOutput: number;
  knowledgeGrowth: number;
  engineeringVelocity: number;
  genomeImprovement: number;
}

export interface FlywheelSnapshot {
  timestamp: number;
  score: number;
  components: FlywheelComponents;
  delta: number;
  narrative: string;
}

const WEIGHTS: Record<keyof FlywheelComponents, number> = {
  signalQuality: 0.2,
  tradePerformance: 0.25,
  sentimentAccuracy: 0.1,
  contentOutput: 0.1,
  knowledgeGrowth: 0.1,
  engineeringVelocity: 0.1,
  genomeImprovement: 0.15,
};

const HISTORY_FILE = "flywheel-history.json";
const MAX_HISTORY = 52;

// ==========================================
// Service
// ==========================================

export class FlywheelScoreService extends Service {
  static serviceType = "FLYWHEEL_SCORE_SERVICE";
  capabilityDescription =
    "Composite 0-100 system health metric measuring self-improvement";

  private history: FlywheelSnapshot[] = [];
  private persistDir: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.persistDir = path.join(process.cwd(), ".elizadb", "kelly");
  }

  static async start(runtime: IAgentRuntime): Promise<FlywheelScoreService> {
    const svc = new FlywheelScoreService(runtime);
    await svc.load();
    logger.info(`[Flywheel] Ready (${svc.history.length} snapshots)`);
    return svc;
  }

  async stop(): Promise<void> {
    await this.save();
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Compute the current Flywheel Score by querying all agents.
   * Each component is normalized to 0-100 before weighting.
   */
  async compute(inputs: FlywheelInputs): Promise<FlywheelSnapshot> {
    const components = this.normalize(inputs);
    const score = this.weightedSum(components);
    const prev =
      this.history.length > 0
        ? this.history[this.history.length - 1].score
        : score;
    const delta = score - prev;
    const narrative = this.generateNarrative(components, score, delta);

    const snapshot: FlywheelSnapshot = {
      timestamp: Date.now(),
      score: Math.round(score * 10) / 10,
      components,
      delta: Math.round(delta * 10) / 10,
      narrative,
    };

    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
    await this.save();

    return snapshot;
  }

  getLatest(): FlywheelSnapshot | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }

  getHistory(): FlywheelSnapshot[] {
    return [...this.history];
  }

  getTrend(weeks = 4): number {
    if (this.history.length < 2) return 0;
    const recent = this.history.slice(-weeks);
    if (recent.length < 2) return 0;
    return recent[recent.length - 1].score - recent[0].score;
  }

  // ==========================================
  // Internal
  // ==========================================

  private normalize(inputs: FlywheelInputs): FlywheelComponents {
    return {
      signalQuality: this.clamp(inputs.vinceBenchScore ?? 50, 0, 100),
      tradePerformance: this.sharpeToScore(inputs.rollingSharpe ?? 0),
      sentimentAccuracy: this.clamp(inputs.sentimentAccuracyPct ?? 50, 0, 100),
      contentOutput: this.contentScore(inputs.contentPiecesPerWeek ?? 0),
      knowledgeGrowth: this.knowledgeScore(inputs.knowledgeItemsPerWeek ?? 0),
      engineeringVelocity: this.velocityScore(
        inputs.featuresShippedPerWeek ?? 0,
      ),
      genomeImprovement: this.genomeDeltaScore(
        inputs.genomeSharpeImprovement ?? 0,
      ),
    };
  }

  private sharpeToScore(sharpe: number): number {
    if (sharpe <= -1) return 0;
    if (sharpe >= 2) return 100;
    return this.clamp(((sharpe + 1) / 3) * 100, 0, 100);
  }

  private contentScore(piecesPerWeek: number): number {
    // Target: 6 pieces/week (1 Substack + 5 tweets) = 100
    return this.clamp((piecesPerWeek / 6) * 100, 0, 100);
  }

  private knowledgeScore(itemsPerWeek: number): number {
    // Target: 10 items/week = 100
    return this.clamp((itemsPerWeek / 10) * 100, 0, 100);
  }

  private velocityScore(features: number): number {
    // Target: 3 features/week = 100
    return this.clamp((features / 3) * 100, 0, 100);
  }

  private genomeDeltaScore(sharpeImprovement: number): number {
    // Target: 0.2 Sharpe improvement = 100
    if (sharpeImprovement <= -0.1) return 0;
    return this.clamp(((sharpeImprovement + 0.1) / 0.3) * 100, 0, 100);
  }

  private weightedSum(components: FlywheelComponents): number {
    let sum = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
      sum += (components[key as keyof FlywheelComponents] ?? 0) * weight;
    }
    return this.clamp(sum, 0, 100);
  }

  private generateNarrative(
    c: FlywheelComponents,
    score: number,
    delta: number,
  ): string {
    const sorted = (
      Object.entries(c) as Array<[keyof FlywheelComponents, number]>
    ).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    const direction = delta > 0 ? "+" : "";
    const trend =
      delta > 2 ? "strong upward trend" : delta < -2 ? "declining" : "stable";

    return (
      `Flywheel Score: ${score.toFixed(0)} (${direction}${delta.toFixed(0)}). ` +
      `${this.humanize(strongest[0])} driving gains (${strongest[1].toFixed(0)}); ` +
      `${this.humanize(weakest[0])} is the bottleneck (${weakest[1].toFixed(0)}). ` +
      `System is ${trend}.`
    );
  }

  private humanize(key: keyof FlywheelComponents): string {
    const map: Record<keyof FlywheelComponents, string> = {
      signalQuality: "Signal quality",
      tradePerformance: "Trade performance",
      sentimentAccuracy: "Sentiment accuracy",
      contentOutput: "Content output",
      knowledgeGrowth: "Knowledge growth",
      engineeringVelocity: "Engineering velocity",
      genomeImprovement: "Genome improvement",
    };
    return map[key] ?? key;
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  // ==========================================
  // Persistence
  // ==========================================

  private async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }
      const file = path.join(this.persistDir, HISTORY_FILE);
      if (fs.existsSync(file)) {
        this.history = JSON.parse(fs.readFileSync(file, "utf-8"));
      }
    } catch (e) {
      logger.warn(`[Flywheel] Load failed: ${e}`);
    }
  }

  private async save(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }
      const file = path.join(this.persistDir, HISTORY_FILE);
      fs.writeFileSync(file, JSON.stringify(this.history, null, 2));
    } catch (e) {
      logger.error(`[Flywheel] Save failed: ${e}`);
    }
  }
}

// ==========================================
// Input Types (raw values from agents)
// ==========================================

export interface FlywheelInputs {
  vinceBenchScore?: number;
  rollingSharpe?: number;
  sentimentAccuracyPct?: number;
  contentPiecesPerWeek?: number;
  knowledgeItemsPerWeek?: number;
  featuresShippedPerWeek?: number;
  genomeSharpeImprovement?: number;
}
