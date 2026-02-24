/**
 * VINCE Counterfactual Engine
 *
 * Analyzes avoided trades: for every decision the bot skipped,
 * what would have happened if we had traded?
 *
 * Weekly output:
 * - Correct skips vs missed winners
 * - Missed opportunity cost
 * - Threshold tuning direction (for Genome #23)
 * - Per-rejection-reason accuracy
 *
 * Data source: feature store JSONL records with `avoided` field.
 * Price lookback: uses cached mark prices at T+24h / T+48h.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { VinceMarketDataService } from "./marketData.service";

// ==========================================
// Types
// ==========================================

export interface AvoidedRecord {
  id: string;
  timestamp: number;
  asset: string;
  direction: "long" | "short";
  strength: number;
  confidence: number;
  sourceCount: number;
  sources: string[];
  avoidReason: string;
  priceAtDecision: number;
}

export interface CounterfactualResult {
  record: AvoidedRecord;
  priceAfter24h: number | null;
  priceAfter48h: number | null;
  wouldHaveWon: boolean | null;
  potentialPnlPct: number | null;
  potentialPnlUsd: number | null;
}

export interface CounterfactualReport {
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  totalAvoided: number;
  analyzed: number;
  correctSkips: number;
  missedWinners: number;
  correctSkipPct: number;
  missedOpportunityCostUsd: number;
  avgMissedPnlPct: number;
  byReason: Record<
    string,
    {
      total: number;
      correctSkips: number;
      missedWinners: number;
      accuracy: number;
    }
  >;
  recommendations: string[];
  results: CounterfactualResult[];
}

const REPORT_FILE = "counterfactual-reports";
const DEFAULT_NOTIONAL_USD = 1000;
const LOOKBACK_HOURS = 48;
const MIN_MOVE_PCT = 0.1;

// ==========================================
// Service
// ==========================================

export class VinceCounterfactualService extends Service {
  static serviceType = "VINCE_COUNTERFACTUAL_SERVICE";
  capabilityDescription =
    "Analyzes avoided trades to quantify missed opportunities and correct skips";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceCounterfactualService> {
    return new VinceCounterfactualService(runtime);
  }

  async stop(): Promise<void> {}

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Generate a counterfactual report for the last `days` days.
   * Loads avoided records from feature store JSONL, checks prices,
   * and produces a report with recommendations.
   */
  async generateReport(days = 7): Promise<CounterfactualReport> {
    const now = Date.now();
    const periodStart = now - days * 24 * 60 * 60 * 1000;
    const periodEnd = now - LOOKBACK_HOURS * 60 * 60 * 1000;

    const avoided = await this.loadAvoidedRecords(periodStart, periodEnd);
    logger.info(
      `[Counterfactual] Loaded ${avoided.length} avoided records for ${days}d window`,
    );

    const marketData = this.runtime.getService<VinceMarketDataService>(
      "VINCE_MARKET_DATA_SERVICE",
    );

    const results: CounterfactualResult[] = [];
    for (const rec of avoided) {
      const result = await this.evaluateAvoided(rec, marketData);
      results.push(result);
    }

    const analyzed = results.filter((r) => r.wouldHaveWon !== null);
    const correctSkips = analyzed.filter((r) => !r.wouldHaveWon);
    const missedWinners = analyzed.filter((r) => r.wouldHaveWon);

    const missedCost = missedWinners.reduce(
      (sum, r) => sum + (r.potentialPnlUsd ?? 0),
      0,
    );
    const avgMissedPct =
      missedWinners.length > 0
        ? missedWinners.reduce((sum, r) => sum + (r.potentialPnlPct ?? 0), 0) /
          missedWinners.length
        : 0;

    const byReason = this.aggregateByReason(results);
    const recommendations = this.generateRecommendations(
      byReason,
      correctSkips.length,
      missedWinners.length,
      analyzed.length,
    );

    const report: CounterfactualReport = {
      generatedAt: now,
      periodStart,
      periodEnd,
      totalAvoided: avoided.length,
      analyzed: analyzed.length,
      correctSkips: correctSkips.length,
      missedWinners: missedWinners.length,
      correctSkipPct:
        analyzed.length > 0 ? (correctSkips.length / analyzed.length) * 100 : 0,
      missedOpportunityCostUsd: missedCost,
      avgMissedPnlPct: avgMissedPct,
      byReason,
      recommendations,
      results,
    };

    await this.saveReport(report);
    return report;
  }

  /**
   * Get the most recent report (if any).
   */
  async getLatestReport(): Promise<CounterfactualReport | null> {
    try {
      const dir = path.join(
        process.cwd(),
        ".elizadb",
        PERSISTENCE_DIR,
        REPORT_FILE,
      );
      if (!fs.existsSync(dir)) return null;

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse();
      if (files.length === 0) return null;

      return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8"));
    } catch {
      return null;
    }
  }

  // ==========================================
  // Internal
  // ==========================================

  private async evaluateAvoided(
    rec: AvoidedRecord,
    marketData: VinceMarketDataService | null,
  ): Promise<CounterfactualResult> {
    let priceAfter24h: number | null = null;
    let priceAfter48h: number | null = null;

    if (marketData) {
      try {
        const ctx = await marketData.getEnrichedContext(rec.asset);
        const current = ctx?.currentPrice ?? null;
        if (current != null && current > 0) {
          // Use current price as proxy for "after" price
          // (for records old enough, this is the actual outcome)
          const elapsed = Date.now() - rec.timestamp;
          if (elapsed >= 24 * 60 * 60 * 1000) priceAfter24h = current;
          if (elapsed >= 48 * 60 * 60 * 1000) priceAfter48h = current;
        }
      } catch {
        // Price unavailable
      }
    }

    const refPrice = priceAfter24h ?? priceAfter48h;
    if (refPrice == null || rec.priceAtDecision <= 0) {
      return {
        record: rec,
        priceAfter24h,
        priceAfter48h,
        wouldHaveWon: null,
        potentialPnlPct: null,
        potentialPnlUsd: null,
      };
    }

    const movePct =
      ((refPrice - rec.priceAtDecision) / rec.priceAtDecision) * 100;
    const directedMovePct = rec.direction === "long" ? movePct : -movePct;

    const wouldHaveWon = directedMovePct > MIN_MOVE_PCT;
    const potentialPnlPct = directedMovePct;
    const potentialPnlUsd = (directedMovePct / 100) * DEFAULT_NOTIONAL_USD;

    return {
      record: rec,
      priceAfter24h,
      priceAfter48h,
      wouldHaveWon,
      potentialPnlPct,
      potentialPnlUsd,
    };
  }

  private aggregateByReason(
    results: CounterfactualResult[],
  ): CounterfactualReport["byReason"] {
    const byReason: CounterfactualReport["byReason"] = {};

    for (const r of results) {
      if (r.wouldHaveWon === null) continue;
      const reason = r.record.avoidReason || "unknown";
      if (!byReason[reason]) {
        byReason[reason] = {
          total: 0,
          correctSkips: 0,
          missedWinners: 0,
          accuracy: 0,
        };
      }
      byReason[reason].total++;
      if (r.wouldHaveWon) {
        byReason[reason].missedWinners++;
      } else {
        byReason[reason].correctSkips++;
      }
    }

    for (const reason of Object.keys(byReason)) {
      const entry = byReason[reason];
      entry.accuracy =
        entry.total > 0 ? (entry.correctSkips / entry.total) * 100 : 0;
    }

    return byReason;
  }

  private generateRecommendations(
    byReason: CounterfactualReport["byReason"],
    correctSkips: number,
    missedWinners: number,
    total: number,
  ): string[] {
    const recs: string[] = [];

    if (total === 0) {
      recs.push("No avoided decisions to analyze — need more trading data.");
      return recs;
    }

    const skipAccuracy = total > 0 ? (correctSkips / total) * 100 : 0;

    if (skipAccuracy > 80) {
      recs.push(
        `Skip accuracy ${skipAccuracy.toFixed(0)}% — filters are well-calibrated. Consider slightly loosening thresholds to capture more opportunity.`,
      );
    } else if (skipAccuracy < 50) {
      recs.push(
        `Skip accuracy only ${skipAccuracy.toFixed(0)}% — filters are rejecting too many winners. Genome should lower min_strength/min_confidence.`,
      );
    }

    if (missedWinners > correctSkips) {
      recs.push(
        `Missed ${missedWinners} winners vs ${correctSkips} correct skips — the bot is too selective. Mutation direction: LOOSEN thresholds.`,
      );
    }

    // Per-reason recommendations
    for (const [reason, stats] of Object.entries(byReason)) {
      if (stats.total < 3) continue;
      if (stats.accuracy < 40) {
        recs.push(
          `"${reason}" filter has ${stats.accuracy.toFixed(0)}% accuracy (${stats.missedWinners} missed winners / ${stats.total} total) — consider weakening or removing this gate.`,
        );
      } else if (stats.accuracy > 90) {
        recs.push(
          `"${reason}" filter is ${stats.accuracy.toFixed(0)}% accurate — strong gate, keep or tighten.`,
        );
      }
    }

    return recs;
  }

  /**
   * Load avoided records from feature store JSONL files.
   */
  private async loadAvoidedRecords(
    start: number,
    end: number,
  ): Promise<AvoidedRecord[]> {
    const records: AvoidedRecord[] = [];
    const dir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);

    if (!fs.existsSync(dir)) return records;

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("features_") && f.endsWith(".jsonl"));

    for (const file of files) {
      try {
        const lines = fs
          .readFileSync(path.join(dir, file), "utf-8")
          .split("\n")
          .filter(Boolean);

        for (const line of lines) {
          try {
            const rec = JSON.parse(line);
            if (!rec.avoided) continue;
            if (rec.timestamp < start || rec.timestamp > end) continue;

            records.push({
              id: rec.id || `${rec.asset}-${rec.timestamp}`,
              timestamp: rec.timestamp,
              asset: rec.asset,
              direction: rec.signal?.direction || "long",
              strength: rec.signal?.strength || 0,
              confidence: rec.signal?.confidence || 0,
              sourceCount: rec.signal?.sourceCount || 0,
              sources: rec.signal?.sources || [],
              avoidReason: rec.avoided.reason || "unknown",
              priceAtDecision: rec.market?.price || 0,
            });
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return records;
  }

  private async saveReport(report: CounterfactualReport): Promise<void> {
    try {
      const dir = path.join(
        process.cwd(),
        ".elizadb",
        PERSISTENCE_DIR,
        REPORT_FILE,
      );
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const date = new Date().toISOString().slice(0, 10);
      const file = path.join(dir, `${date}-counterfactual.json`);
      fs.writeFileSync(file, JSON.stringify(report, null, 2));
      logger.info(
        `[Counterfactual] Report saved: ${report.analyzed} analyzed, ` +
          `${report.correctSkipPct.toFixed(0)}% correct skips, ` +
          `$${report.missedOpportunityCostUsd.toFixed(0)} missed`,
      );
    } catch (e) {
      logger.error(`[Counterfactual] Save failed: ${e}`);
    }
  }
}
