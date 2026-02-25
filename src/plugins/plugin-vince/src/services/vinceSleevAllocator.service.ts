/**
 * VINCE Strategy Sleeve Allocator Service (#65)
 *
 * Divides capital into strategy "sleeves" with explicit allocation targets
 * and rebalancing rules.
 *
 * Persists state to data/sleeve-allocations.json.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export type SleeveId =
  | "momentum"
  | "mean-reversion"
  | "options-premium"
  | "cash";

export interface StrategySleeve {
  id: SleeveId;
  label: string;
  targetPct: number; // target % of total capital
  currentPct: number; // actual current %
  minPct: number; // floor (don't go below)
  maxPct: number; // ceiling (don't go above)
  activeTrades: number; // count of open positions in this sleeve
  cumulativePnl: number;
  regime: string[]; // which regimes this sleeve is active in
}

const DEFAULT_SLEEVES: StrategySleeve[] = [
  {
    id: "momentum",
    label: "Momentum/Trend",
    targetPct: 40,
    currentPct: 40,
    minPct: 20,
    maxPct: 60,
    activeTrades: 0,
    cumulativePnl: 0,
    regime: ["TRENDING_BULL", "RECOVERY"],
  },
  {
    id: "mean-reversion",
    label: "Mean Reversion",
    targetPct: 30,
    currentPct: 30,
    minPct: 10,
    maxPct: 50,
    activeTrades: 0,
    cumulativePnl: 0,
    regime: ["CHOPPY", "EUPHORIA"],
  },
  {
    id: "options-premium",
    label: "Options Premium (Solus)",
    targetPct: 20,
    currentPct: 20,
    minPct: 10,
    maxPct: 40,
    activeTrades: 0,
    cumulativePnl: 0,
    regime: ["CHOPPY", "TRENDING_BULL", "CAPITULATION"],
  },
  {
    id: "cash",
    label: "Cash/Reserve",
    targetPct: 10,
    currentPct: 10,
    minPct: 5,
    maxPct: 50,
    activeTrades: 0,
    cumulativePnl: 0,
    regime: ["CAPITULATION"],
  },
];

const FILE_NAME = "sleeve-allocations.json";

// ==========================================
// Service
// ==========================================

export class VinceSleeveAllocatorService {
  private readonly filePath: string;
  private sleeves: Map<SleeveId, StrategySleeve>;

  private static _instance: VinceSleeveAllocatorService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
    this.sleeves = new Map();
    this.load();
  }

  static getInstance(): VinceSleeveAllocatorService {
    if (!VinceSleeveAllocatorService._instance) {
      VinceSleeveAllocatorService._instance = new VinceSleeveAllocatorService();
    }
    return VinceSleeveAllocatorService._instance;
  }

  static setInstance(instance: VinceSleeveAllocatorService): void {
    VinceSleeveAllocatorService._instance = instance;
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = JSON.parse(
          fs.readFileSync(this.filePath, "utf-8"),
        ) as StrategySleeve[];
        for (const s of raw) {
          this.sleeves.set(s.id, s);
        }
        return;
      } catch {
        // fall through to defaults
      }
    }
    // Initialize with defaults
    for (const s of DEFAULT_SLEEVES) {
      this.sleeves.set(s.id, { ...s });
    }
    this.save();
  }

  private save(): void {
    const arr = Array.from(this.sleeves.values());
    fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  getSleeves(): StrategySleeve[] {
    return Array.from(this.sleeves.values()).map((s) => ({ ...s }));
  }

  getSleeve(id: SleeveId): StrategySleeve {
    const s = this.sleeves.get(id);
    if (!s) throw new Error(`Unknown sleeve: ${id}`);
    return { ...s };
  }

  /**
   * Returns sleeve IDs active in the given market regime.
   */
  getActiveSleevesForRegime(regime: string): SleeveId[] {
    return Array.from(this.sleeves.values())
      .filter((s) => s.regime.includes(regime))
      .map((s) => s.id);
  }

  /**
   * Checks whether adding a new position to a sleeve is allowed
   * (respects maxPct ceiling).
   */
  canAddPosition(
    sleeveId: SleeveId,
    sizeUsd: number,
    totalCapitalUsd: number,
  ): { allowed: boolean; reason?: string } {
    const sleeve = this.sleeves.get(sleeveId);
    if (!sleeve)
      return { allowed: false, reason: `Unknown sleeve: ${sleeveId}` };
    if (totalCapitalUsd <= 0)
      return { allowed: false, reason: "Total capital must be > 0" };

    const newPct = sleeve.currentPct + (sizeUsd / totalCapitalUsd) * 100;
    if (newPct > sleeve.maxPct) {
      return {
        allowed: false,
        reason: `Adding $${sizeUsd.toFixed(0)} would push ${sleeveId} to ${newPct.toFixed(1)}% (max ${sleeve.maxPct}%)`,
      };
    }
    return { allowed: true };
  }

  /**
   * Record a trade open/close and update activeTrades + cumulativePnl.
   */
  recordTrade(sleeveId: SleeveId, pnl: number, open: boolean): void {
    const sleeve = this.sleeves.get(sleeveId);
    if (!sleeve) return;

    if (open) {
      sleeve.activeTrades = Math.max(0, sleeve.activeTrades + 1);
    } else {
      sleeve.activeTrades = Math.max(0, sleeve.activeTrades - 1);
      sleeve.cumulativePnl += pnl;
    }
    this.save();
  }

  /**
   * Returns rebalancing actions: which sleeves are out of band and need
   * to increase/decrease capital.
   */
  getRebalanceActions(
    totalCapitalUsd: number,
  ): { sleeve: SleeveId; action: "increase" | "decrease"; deltaUsd: number }[] {
    if (totalCapitalUsd <= 0) return [];
    const results: {
      sleeve: SleeveId;
      action: "increase" | "decrease";
      deltaUsd: number;
    }[] = [];

    for (const sleeve of this.sleeves.values()) {
      if (sleeve.currentPct > sleeve.maxPct) {
        const deltaUsd =
          ((sleeve.currentPct - sleeve.maxPct) / 100) * totalCapitalUsd;
        results.push({ sleeve: sleeve.id, action: "decrease", deltaUsd });
      } else if (sleeve.currentPct < sleeve.minPct) {
        const deltaUsd =
          ((sleeve.minPct - sleeve.currentPct) / 100) * totalCapitalUsd;
        results.push({ sleeve: sleeve.id, action: "increase", deltaUsd });
      }
    }
    return results;
  }

  /**
   * Update the currentPct for a sleeve (called after allocation changes).
   */
  updateCurrentPct(sleeveId: SleeveId, currentPct: number): void {
    const sleeve = this.sleeves.get(sleeveId);
    if (!sleeve) return;
    sleeve.currentPct = currentPct;
    this.save();
  }
}
