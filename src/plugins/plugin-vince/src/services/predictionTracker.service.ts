/**
 * VINCE Internal Prediction Tracker (Phase 6 #32)
 *
 * Registers, resolves, and scores predictions with Brier calibration.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { VinceMarketDataService } from "./marketData.service";
import type { VinceGenomeService } from "./vinceGenome.service";

export type PredictionKind = "trade" | "genome_promotion";
export type PredictionDirection = "long" | "short" | "up" | "down";

export interface PredictionRecord {
  id: string;
  agent: string;
  kind: PredictionKind;
  asset?: string;
  direction: PredictionDirection;
  confidenceProb: number;
  horizonHours: number;
  createdAt: number;
  dueAt: number;
  resolvedAt?: number;
  status: "open" | "resolved";
  outcome?: 0 | 1;
  brier?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PredictionSummary {
  resolved: number;
  correct: number;
  incorrect: number;
}

export interface PredictionCalibrationSnapshot {
  windowDays: number;
  overallMeanBrier: number | null;
  overallCount: number;
  byAgent: Array<{
    agent: string;
    count: number;
    meanBrier: number;
  }>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class PredictionTrackerService extends Service {
  static serviceType = "VINCE_PREDICTION_TRACKER_SERVICE";
  capabilityDescription =
    "Internal prediction market with Brier-score calibration tracking";

  private readonly predictionsFile: string;
  private predictions: PredictionRecord[] = [];

  constructor(protected runtime: IAgentRuntime) {
    super();
    const base = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
    this.predictionsFile = path.join(base, "predictions.jsonl");
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<PredictionTrackerService> {
    const svc = new PredictionTrackerService(runtime);
    await svc.load();
    return svc;
  }

  async stop(): Promise<void> {
    await this.save();
  }

  async registerPrediction(input: {
    agent: string;
    kind: PredictionKind;
    direction: PredictionDirection;
    confidenceProb: number;
    horizonHours: number;
    asset?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const now = Date.now();
    const record: PredictionRecord = {
      id: `pred-${now}-${Math.random().toString(36).slice(2, 10)}`,
      agent: input.agent,
      kind: input.kind,
      asset: input.asset,
      direction: input.direction,
      confidenceProb: clamp(input.confidenceProb, 0.01, 0.99),
      horizonHours: Math.max(1, Math.floor(input.horizonHours)),
      createdAt: now,
      dueAt: now + Math.max(1, Math.floor(input.horizonHours)) * 60 * 60 * 1000,
      status: "open",
      metadata: input.metadata,
    };
    this.predictions.push(record);
    await this.save();
    return record.id;
  }

  async resolvePrediction(
    id: string,
    outcome: 0 | 1,
    reason = "manual",
  ): Promise<boolean> {
    const p = this.predictions.find((x) => x.id === id && x.status === "open");
    if (!p) return false;
    p.outcome = outcome;
    p.resolvedAt = Date.now();
    p.status = "resolved";
    p.reason = reason;
    p.brier = (p.confidenceProb - outcome) ** 2;
    await this.save();
    return true;
  }

  async resolveDuePredictions(): Promise<PredictionSummary> {
    const now = Date.now();
    let resolved = 0;
    let correct = 0;
    let incorrect = 0;
    for (const p of this.predictions) {
      if (p.status !== "open" || p.dueAt > now) continue;
      const outcome = await this.resolveViaContext(p);
      if (outcome == null) continue;
      p.outcome = outcome;
      p.resolvedAt = now;
      p.status = "resolved";
      p.reason = "due_validation";
      p.brier = (p.confidenceProb - outcome) ** 2;
      resolved++;
      if (outcome === 1) correct++;
      else incorrect++;
    }
    if (resolved > 0) {
      await this.save();
    }
    return { resolved, correct, incorrect };
  }

  getBrierByAgent(windowDays = 30): Array<{
    agent: string;
    count: number;
    meanBrier: number;
  }> {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const buckets = new Map<string, number[]>();
    for (const p of this.predictions) {
      if (
        p.status !== "resolved" ||
        p.resolvedAt == null ||
        p.resolvedAt < cutoff
      )
        continue;
      const brier = p.brier;
      if (typeof brier !== "number") continue;
      const arr = buckets.get(p.agent) ?? [];
      arr.push(brier);
      buckets.set(p.agent, arr);
    }
    return Array.from(buckets.entries()).map(([agent, values]) => ({
      agent,
      count: values.length,
      meanBrier:
        values.length > 0
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0,
    }));
  }

  getCalibrationSnapshot(windowDays = 30): PredictionCalibrationSnapshot {
    const byAgent = this.getBrierByAgent(windowDays);
    const totalCount = byAgent.reduce((sum, row) => sum + row.count, 0);
    if (totalCount <= 0) {
      return {
        windowDays,
        overallMeanBrier: null,
        overallCount: 0,
        byAgent,
      };
    }
    const weightedSum = byAgent.reduce(
      (sum, row) => sum + row.meanBrier * row.count,
      0,
    );
    return {
      windowDays,
      overallMeanBrier: weightedSum / totalCount,
      overallCount: totalCount,
      byAgent,
    };
  }

  getOpenPredictions(): PredictionRecord[] {
    return this.predictions.filter((p) => p.status === "open");
  }

  private async resolveViaContext(
    prediction: PredictionRecord,
  ): Promise<0 | 1 | null> {
    if (prediction.kind === "trade") {
      const asset = prediction.asset;
      const entryPrice = Number(prediction.metadata?.entryPrice);
      if (!asset || !Number.isFinite(entryPrice) || entryPrice <= 0)
        return null;
      const market = this.runtime.getService<VinceMarketDataService>(
        "VINCE_MARKET_DATA_SERVICE",
      );
      const ctx = await market?.getEnrichedContext(asset);
      const currentPrice = ctx?.currentPrice ?? 0;
      if (!(currentPrice > 0)) return null;
      const move = (currentPrice - entryPrice) / entryPrice;
      if (prediction.direction === "long") return move > 0 ? 1 : 0;
      if (prediction.direction === "short") return move < 0 ? 1 : 0;
      return null;
    }

    if (prediction.kind === "genome_promotion") {
      const genome = this.runtime.getService<VinceGenomeService>(
        "VINCE_GENOME_SERVICE",
      );
      const history = genome?.getHistory?.() ?? [];
      const baselineFitness = Number(prediction.metadata?.baselineFitness);
      const promotedGenomeId = String(
        prediction.metadata?.promotedGenomeId ?? "",
      );
      if (!Number.isFinite(baselineFitness) || !promotedGenomeId) return null;
      const post = history.filter((h) => h.timestamp >= prediction.createdAt);
      if (post.length === 0) return null;
      const maxBest = Math.max(...post.map((h) => h.bestFitness ?? 0));
      const seenPromotion = post.some(
        (h) => h.promotedGenomeId === promotedGenomeId,
      );
      const improved = maxBest > baselineFitness;
      return seenPromotion && improved ? 1 : 0;
    }

    return null;
  }

  private async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.predictionsFile)) {
        this.predictions = [];
        return;
      }
      const content = fs.readFileSync(this.predictionsFile, "utf-8");
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      this.predictions = lines
        .map((line) => {
          try {
            return JSON.parse(line) as PredictionRecord;
          } catch {
            return null;
          }
        })
        .filter((x): x is PredictionRecord => Boolean(x));
    } catch (e) {
      logger.warn(`[PredictionTracker] Load failed: ${e}`);
      this.predictions = [];
    }
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.predictionsFile);
      fs.mkdirSync(dir, { recursive: true });
      const body = this.predictions.map((p) => JSON.stringify(p)).join("\n");
      fs.writeFileSync(this.predictionsFile, body + (body ? "\n" : ""));
    } catch (e) {
      logger.warn(`[PredictionTracker] Save failed: ${e}`);
    }
  }
}
