/**
 * VinceShadowChallenger Service
 *
 * Runs "shadow" alternative strategies in parallel with the live genome.
 * Tracks hypothetical performance and surfaces promotion candidates.
 *
 * PRD: One Dream Phase 12 — Task #75
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";

export interface ShadowTrade {
  asset: string;
  direction: string;
  confidence: number;
  outcome?: "win" | "loss" | "scratch";
  pnl?: number;
}

export interface ShadowStrategy {
  id: string;
  label: string;
  parameters: Record<string, number>; // parameter overrides vs current genome
  createdAt: string;
  trades: ShadowTrade[];
  fitness: number; // rolling Sharpe-equivalent
  vsCurrentGenome: number; // fitness delta (positive = challenger winning)
  promotionReady: boolean; // true if vsCurrentGenome > 0.05 for 4+ consecutive weeks
  consecutiveOutperformWeeks: number; // internal counter
}

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const CHALLENGERS_FILE = "shadow-challengers.jsonl";
const PROMOTION_THRESHOLD = 0.05;
const PROMOTION_MIN_WEEKS = 4;

export class VinceShadowChallengerService {
  private readonly challengersPath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.challengersPath = path.join(dir, CHALLENGERS_FILE);
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private readAll(): ShadowStrategy[] {
    if (!fs.existsSync(this.challengersPath)) return [];
    const content = fs.readFileSync(this.challengersPath, "utf-8");
    const challengers: ShadowStrategy[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        challengers.push(JSON.parse(trimmed) as ShadowStrategy);
      } catch {
        // skip malformed
      }
    }
    return challengers;
  }

  private writeAll(challengers: ShadowStrategy[]): void {
    const lines = challengers.map((c) => JSON.stringify(c)).join("\n");
    fs.writeFileSync(
      this.challengersPath,
      lines + (lines ? "\n" : ""),
      "utf-8",
    );
  }

  private save(challenger: ShadowStrategy): void {
    const all = this.readAll();
    const idx = all.findIndex((c) => c.id === challenger.id);
    if (idx >= 0) {
      all[idx] = challenger;
    } else {
      all.push(challenger);
    }
    this.writeAll(all);
  }

  // ── Fitness computation ────────────────────────────────────────────────────

  /**
   * Compute a rolling Sharpe-equivalent fitness from trade history.
   * Uses PnL values when available, else win/loss/scratch outcomes.
   */
  private computeFitness(trades: ShadowTrade[]): number {
    if (trades.length === 0) return 0;

    const returns: number[] = trades.map((t) => {
      if (typeof t.pnl === "number") return t.pnl;
      if (t.outcome === "win") return 1;
      if (t.outcome === "loss") return -1;
      return 0;
    });

    if (returns.length === 0) return 0;

    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    if (returns.length === 1) return mean;

    const variance =
      returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return mean > 0 ? 1 : mean < 0 ? -1 : 0;

    return mean / stdDev;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Create a new shadow challenger with the given parameter overrides.
   */
  createChallenger(parameters: Record<string, number>): ShadowStrategy {
    const id = uuidv4();
    const paramSummary = Object.entries(parameters)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    const label = `challenger-${id.slice(0, 6)}${paramSummary ? ` [${paramSummary}]` : ""}`;

    const challenger: ShadowStrategy = {
      id,
      label,
      parameters,
      createdAt: new Date().toISOString(),
      trades: [],
      fitness: 0,
      vsCurrentGenome: 0,
      promotionReady: false,
      consecutiveOutperformWeeks: 0,
    };
    this.save(challenger);
    return challenger;
  }

  /**
   * Record a shadow trade result for a specific challenger.
   */
  recordTrade(challengerId: string, trade: ShadowTrade): void {
    const all = this.readAll();
    const challenger = all.find((c) => c.id === challengerId);
    if (!challenger) return;
    challenger.trades.push(trade);
    this.save(challenger);
  }

  /**
   * Recompute fitness from trades and update vsCurrentGenome.
   * Increment consecutiveOutperformWeeks if outperforming.
   */
  updateFitness(challengerId: string, currentGenomeFitness: number): void {
    const all = this.readAll();
    const challenger = all.find((c) => c.id === challengerId);
    if (!challenger) return;

    challenger.fitness = this.computeFitness(challenger.trades);
    challenger.vsCurrentGenome = challenger.fitness - currentGenomeFitness;

    if (challenger.vsCurrentGenome > PROMOTION_THRESHOLD) {
      challenger.consecutiveOutperformWeeks += 1;
    } else {
      challenger.consecutiveOutperformWeeks = 0;
    }

    challenger.promotionReady =
      challenger.consecutiveOutperformWeeks >= PROMOTION_MIN_WEEKS;

    this.save(challenger);
  }

  /**
   * Return challengers that are ready for promotion (promotionReady=true).
   */
  getPromotionCandidates(): ShadowStrategy[] {
    return this.readAll().filter((c) => c.promotionReady);
  }

  /**
   * Summary of all active challengers for reporting.
   */
  getActiveChallengersSummary(): {
    id: string;
    label: string;
    fitness: number;
    vsCurrentGenome: number;
    tradeCount: number;
  }[] {
    return this.readAll().map((c) => ({
      id: c.id,
      label: c.label,
      fitness: c.fitness,
      vsCurrentGenome: c.vsCurrentGenome,
      tradeCount: c.trades.length,
    }));
  }

  /**
   * Remove challengers with fewer than minTrades and negative fitness.
   * Returns count removed.
   */
  pruneUnderperformers(minTrades: number): number {
    const all = this.readAll();
    const before = all.length;
    const surviving = all.filter(
      (c) => !(c.trades.length < minTrades && c.fitness < 0),
    );
    this.writeAll(surviving);
    return before - surviving.length;
  }

  /**
   * Ensure at least one default challenger exists. Called on startup.
   */
  ensureDefaultChallenger(): void {
    const all = this.readAll();
    if (all.length === 0) {
      this.createChallenger({ confidenceBoost: 5, sizeMultiplier: 1.1 });
    }
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  private static _instance: VinceShadowChallengerService | null = null;

  static getInstance(): VinceShadowChallengerService {
    if (!VinceShadowChallengerService._instance) {
      VinceShadowChallengerService._instance =
        new VinceShadowChallengerService();
    }
    return VinceShadowChallengerService._instance;
  }

  static setInstance(instance: VinceShadowChallengerService): void {
    VinceShadowChallengerService._instance = instance;
  }
}
