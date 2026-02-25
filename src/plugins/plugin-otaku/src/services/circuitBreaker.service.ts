/**
 * Circuit Breaker Stack (#59)
 *
 * Multi-layer circuit breaker. Any breaker tripped = all live execution halted
 * until manually (or auto) reset.
 *
 * ⚠️ SAFETY: isHalted() must be checked before any live execution.
 *
 * Config env vars (with defaults):
 *   CB_DAILY_LOSS_LIMIT_USD    — trip daily-loss-limit if daily loss > this (default: 200)
 *   CB_CONSECUTIVE_LOSSES      — trip consecutive-losses after N in a row (default: 5)
 *   CB_MAX_DRAWDOWN_PCT        — trip max-drawdown if portfolio drawdown > this % (default: 15)
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export type BreakerName =
  | "daily-loss-limit"
  | "consecutive-losses"
  | "max-drawdown"
  | "drift-halt"
  | "manual";

export interface CircuitBreakerState {
  name: BreakerName;
  tripped: boolean;
  trippedAt?: string;
  reason?: string;
  autoReset: boolean; // true = resets at midnight UTC; false = manual only
}

// ==========================================
// Defaults
// ==========================================

const DEFAULT_BREAKERS: CircuitBreakerState[] = [
  { name: "daily-loss-limit", tripped: false, autoReset: true },
  { name: "consecutive-losses", tripped: false, autoReset: true },
  { name: "max-drawdown", tripped: false, autoReset: false },
  { name: "drift-halt", tripped: false, autoReset: false },
  { name: "manual", tripped: false, autoReset: false },
];

const DATA_FILE = "circuit-breakers.json";

// ==========================================
// Service
// ==========================================

export class CircuitBreakerService {
  private breakers: Map<BreakerName, CircuitBreakerState>;
  private dataPath: string;
  private dailyLossLimitUsd: number;
  private consecutiveLossesLimit: number;
  private maxDrawdownPct: number;
  private static _instance: CircuitBreakerService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    this.dataPath = path.join(dir, DATA_FILE);
    this.dailyLossLimitUsd = Number(process.env.CB_DAILY_LOSS_LIMIT_USD ?? 200);
    this.consecutiveLossesLimit = Number(
      process.env.CB_CONSECUTIVE_LOSSES ?? 5,
    );
    this.maxDrawdownPct = Number(process.env.CB_MAX_DRAWDOWN_PCT ?? 15);
    this.breakers = new Map();
    this.load();
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService._instance) {
      CircuitBreakerService._instance = new CircuitBreakerService();
    }
    return CircuitBreakerService._instance;
  }

  static setInstance(instance: CircuitBreakerService): void {
    CircuitBreakerService._instance = instance;
  }

  // ==========================================
  // Core API
  // ==========================================

  isHalted(): boolean {
    return Array.from(this.breakers.values()).some((b) => b.tripped);
  }

  trip(name: BreakerName, reason: string): void {
    const b = this.breakers.get(name);
    if (!b) return;
    b.tripped = true;
    b.trippedAt = new Date().toISOString();
    b.reason = reason;
    this.persist();
  }

  reset(name: BreakerName): void {
    const b = this.breakers.get(name);
    if (!b) return;
    b.tripped = false;
    b.trippedAt = undefined;
    b.reason = undefined;
    this.persist();
  }

  resetAutoBreakers(): void {
    for (const b of this.breakers.values()) {
      if (b.autoReset && b.tripped) {
        b.tripped = false;
        b.trippedAt = undefined;
        b.reason = undefined;
      }
    }
    this.persist();
  }

  getState(): CircuitBreakerState[] {
    return Array.from(this.breakers.values()).map((b) => ({ ...b }));
  }

  // ==========================================
  // Auto-check helpers
  // ==========================================

  checkDailyLoss(dailyLossSoFarUsd: number): void {
    if (dailyLossSoFarUsd > this.dailyLossLimitUsd) {
      this.trip(
        "daily-loss-limit",
        `Daily loss $${dailyLossSoFarUsd.toFixed(2)} exceeds limit $${this.dailyLossLimitUsd}`,
      );
    }
  }

  checkConsecutiveLosses(recentOutcomes: ("win" | "loss" | "scratch")[]): void {
    if (recentOutcomes.length < this.consecutiveLossesLimit) return;
    const tail = recentOutcomes.slice(-this.consecutiveLossesLimit);
    if (tail.every((o) => o === "loss")) {
      this.trip(
        "consecutive-losses",
        `${this.consecutiveLossesLimit} consecutive losses`,
      );
    }
  }

  checkMaxDrawdown(portfolioDrawdownPct: number): void {
    if (portfolioDrawdownPct > this.maxDrawdownPct) {
      this.trip(
        "max-drawdown",
        `Portfolio drawdown ${portfolioDrawdownPct.toFixed(2)}% exceeds limit ${this.maxDrawdownPct}%`,
      );
    }
  }

  // ==========================================
  // Persistence
  // ==========================================

  private load(): void {
    // Seed defaults
    for (const def of DEFAULT_BREAKERS) {
      this.breakers.set(def.name, { ...def });
    }

    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.dataPath)) {
        const saved: CircuitBreakerState[] = JSON.parse(
          fs.readFileSync(this.dataPath, "utf-8"),
        );
        for (const b of saved) {
          if (this.breakers.has(b.name)) {
            this.breakers.set(b.name, { ...b });
          }
        }
      }
    } catch {
      // Use defaults
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.dataPath,
        JSON.stringify(Array.from(this.breakers.values()), null, 2),
      );
    } catch {
      // Non-fatal
    }
  }
}
