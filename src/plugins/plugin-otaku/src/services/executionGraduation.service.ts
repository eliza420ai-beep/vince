/**
 * Execution Graduation Service (#27)
 *
 * Four trust levels earned through sustained performance:
 * L0 PAPER_ONLY → L1 NOTIFY → L2 CONFIRM_EXECUTE → L3 AUTO_EXECUTE
 *
 * Promotion: based on rolling window metrics (win rate, Sharpe, drawdown).
 * Demotion: automatic when live performance degrades.
 * Circuit breaker: single-day loss > 5% → drop to L0.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export type TrustLevel =
  | "PAPER_ONLY"
  | "NOTIFY"
  | "CONFIRM_EXECUTE"
  | "AUTO_EXECUTE";

export const TRUST_LEVELS: TrustLevel[] = [
  "PAPER_ONLY",
  "NOTIFY",
  "CONFIRM_EXECUTE",
  "AUTO_EXECUTE",
];

export interface PromotionCriteria {
  minWinRate: number;
  minSharpe: number;
  maxDrawdownPct: number;
  minConsecutiveWeeks: number;
}

export interface WeeklySnapshot {
  weekStart: number;
  winRate: number;
  sharpe: number;
  maxDrawdownPct: number;
  trades: number;
  pnl: number;
}

export interface GraduationState {
  currentLevel: TrustLevel;
  levelSince: number;
  weeksAtLevel: number;
  weeklySnapshots: WeeklySnapshot[];
  transitionHistory: Array<{
    from: TrustLevel;
    to: TrustLevel;
    timestamp: number;
    reason: string;
  }>;
  circuitBreakerTripped: boolean;
  circuitBreakerAt: number | null;
}

// ==========================================
// Criteria per level
// ==========================================

const PROMOTION_CRITERIA: Record<TrustLevel, PromotionCriteria | null> = {
  PAPER_ONLY: null,
  NOTIFY: {
    minWinRate: 50,
    minSharpe: 0,
    maxDrawdownPct: 20,
    minConsecutiveWeeks: 2,
  },
  CONFIRM_EXECUTE: {
    minWinRate: 55,
    minSharpe: 0.5,
    maxDrawdownPct: 15,
    minConsecutiveWeeks: 4,
  },
  AUTO_EXECUTE: {
    minWinRate: 58,
    minSharpe: 1.0,
    maxDrawdownPct: 10,
    minConsecutiveWeeks: 8,
  },
};

const DEMOTION_WIN_RATE = 45;
const DEMOTION_CONSECUTIVE_WEEKS = 2;
const CIRCUIT_BREAKER_DAILY_LOSS_PCT = 5;
const STATE_FILE = "execution-graduation.json";
const MAX_SNAPSHOTS = 52;
const MAX_TRANSITIONS = 100;

// ==========================================
// Service
// ==========================================

export class ExecutionGraduationService extends Service {
  static serviceType = "EXECUTION_GRADUATION_SERVICE";
  capabilityDescription =
    "Trust-based execution levels earned through sustained trading performance";

  private state: GraduationState;
  private statePath: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.statePath = path.join(process.cwd(), ".elizadb", "otaku", STATE_FILE);
    this.state = this.defaultState();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<ExecutionGraduationService> {
    const svc = new ExecutionGraduationService(runtime);
    await svc.load();
    logger.info(
      `[Graduation] Level: ${svc.state.currentLevel} (${svc.state.weeksAtLevel} weeks)`,
    );
    return svc;
  }

  async stop(): Promise<void> {
    await this.save();
  }

  // ==========================================
  // Public API
  // ==========================================

  getCurrentLevel(): TrustLevel {
    return this.state.currentLevel;
  }

  /** Alias used by external services (e.g., Vince risk coupling). */
  getTrustLevel(): TrustLevel {
    return this.state.currentLevel;
  }

  getLevelIndex(): number {
    return TRUST_LEVELS.indexOf(this.state.currentLevel);
  }

  canAutoExecute(): boolean {
    return (
      this.state.currentLevel === "AUTO_EXECUTE" &&
      !this.state.circuitBreakerTripped
    );
  }

  canConfirmExecute(): boolean {
    return this.getLevelIndex() >= 2 && !this.state.circuitBreakerTripped;
  }

  canNotify(): boolean {
    return this.getLevelIndex() >= 1;
  }

  isCircuitBroken(): boolean {
    return this.state.circuitBreakerTripped;
  }

  /**
   * Record a weekly performance snapshot and evaluate promotion/demotion.
   */
  async recordWeek(snapshot: WeeklySnapshot): Promise<TrustLevel> {
    this.state.weeklySnapshots.push(snapshot);
    if (this.state.weeklySnapshots.length > MAX_SNAPSHOTS) {
      this.state.weeklySnapshots =
        this.state.weeklySnapshots.slice(-MAX_SNAPSHOTS);
    }
    this.state.weeksAtLevel++;

    this.evaluateTransition();
    await this.save();
    return this.state.currentLevel;
  }

  /**
   * Check for circuit breaker (single-day loss > threshold).
   */
  async checkCircuitBreaker(dailyLossPct: number): Promise<boolean> {
    if (dailyLossPct >= CIRCUIT_BREAKER_DAILY_LOSS_PCT) {
      logger.warn(
        `[Graduation] CIRCUIT BREAKER: ${dailyLossPct.toFixed(1)}% daily loss`,
      );
      this.state.circuitBreakerTripped = true;
      this.state.circuitBreakerAt = Date.now();
      this.transition(
        "PAPER_ONLY",
        `Circuit breaker: ${dailyLossPct.toFixed(1)}% daily loss`,
      );
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * Reset circuit breaker after manual review.
   */
  async resetCircuitBreaker(): Promise<void> {
    this.state.circuitBreakerTripped = false;
    this.state.circuitBreakerAt = null;
    await this.save();
  }

  getState(): GraduationState {
    return JSON.parse(JSON.stringify(this.state));
  }

  getStatusSummary(): string {
    const level = this.state.currentLevel;
    const idx = this.getLevelIndex();
    const weeks = this.state.weeksAtLevel;
    const cb = this.state.circuitBreakerTripped ? " [CIRCUIT BREAKER]" : "";

    const nextLevel =
      idx < TRUST_LEVELS.length - 1 ? TRUST_LEVELS[idx + 1] : null;
    const nextCriteria = nextLevel ? PROMOTION_CRITERIA[nextLevel] : null;

    let progress = "";
    if (nextCriteria) {
      const recent = this.state.weeklySnapshots.slice(
        -nextCriteria.minConsecutiveWeeks,
      );
      const qualifying = recent.filter(
        (s) =>
          s.winRate >= nextCriteria.minWinRate &&
          s.sharpe >= nextCriteria.minSharpe &&
          s.maxDrawdownPct <= nextCriteria.maxDrawdownPct,
      );
      progress = ` | Progress to ${nextLevel}: ${qualifying.length}/${nextCriteria.minConsecutiveWeeks} qualifying weeks`;
    }

    return `L${idx} ${level} (${weeks}w)${cb}${progress}`;
  }

  // ==========================================
  // Internal
  // ==========================================

  private evaluateTransition(): void {
    const currentIdx = this.getLevelIndex();

    // Check demotion first
    if (currentIdx > 0) {
      const recent = this.state.weeklySnapshots.slice(
        -DEMOTION_CONSECUTIVE_WEEKS,
      );
      if (
        recent.length >= DEMOTION_CONSECUTIVE_WEEKS &&
        recent.every((s) => s.winRate < DEMOTION_WIN_RATE)
      ) {
        const prevLevel = TRUST_LEVELS[currentIdx - 1];
        this.transition(
          prevLevel,
          `Demotion: WR < ${DEMOTION_WIN_RATE}% for ${DEMOTION_CONSECUTIVE_WEEKS} consecutive weeks`,
        );
        return;
      }
    }

    // Check promotion
    if (currentIdx < TRUST_LEVELS.length - 1) {
      const nextLevel = TRUST_LEVELS[currentIdx + 1];
      const criteria = PROMOTION_CRITERIA[nextLevel];
      if (!criteria) return;

      const recent = this.state.weeklySnapshots.slice(
        -criteria.minConsecutiveWeeks,
      );
      if (recent.length < criteria.minConsecutiveWeeks) return;

      const allQualify = recent.every(
        (s) =>
          s.winRate >= criteria.minWinRate &&
          s.sharpe >= criteria.minSharpe &&
          s.maxDrawdownPct <= criteria.maxDrawdownPct,
      );

      if (allQualify) {
        this.transition(
          nextLevel,
          `Promotion: ${criteria.minConsecutiveWeeks} weeks of WR≥${criteria.minWinRate}%, Sharpe≥${criteria.minSharpe}, DD≤${criteria.maxDrawdownPct}%`,
        );
      }
    }
  }

  private transition(to: TrustLevel, reason: string): void {
    const from = this.state.currentLevel;
    if (from === to) return;

    logger.info(`[Graduation] ${from} → ${to}: ${reason}`);

    this.state.transitionHistory.push({
      from,
      to,
      timestamp: Date.now(),
      reason,
    });
    if (this.state.transitionHistory.length > MAX_TRANSITIONS) {
      this.state.transitionHistory =
        this.state.transitionHistory.slice(-MAX_TRANSITIONS);
    }

    this.state.currentLevel = to;
    this.state.levelSince = Date.now();
    this.state.weeksAtLevel = 0;
  }

  private defaultState(): GraduationState {
    return {
      currentLevel: "PAPER_ONLY",
      levelSince: Date.now(),
      weeksAtLevel: 0,
      weeklySnapshots: [],
      transitionHistory: [],
      circuitBreakerTripped: false,
      circuitBreakerAt: null,
    };
  }

  private async load(): Promise<void> {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.statePath)) {
        const raw = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
        this.state = { ...this.defaultState(), ...raw };
      }
    } catch (e) {
      logger.warn(`[Graduation] Load failed: ${e}`);
    }
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (e) {
      logger.error(`[Graduation] Save failed: ${e}`);
    }
  }
}
