/**
 * VinceCapitalBuckets Service (#57)
 *
 * Isolated capital buckets: paper | pilot | main.
 * Live capital is strictly separated from paper/test capital.
 *
 * ⚠️ SAFETY: liveExecutionAllowed defaults to false for ALL buckets.
 * No code here autonomously moves real capital.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export type BucketId = "paper" | "pilot" | "main";

export interface CapitalBucket {
  id: BucketId;
  label: string;
  allocatedUsd: number; // max allowed capital
  currentUsd: number; // current value (updated on reconcile)
  maxSingleTradeUsd: number; // hard cap per trade
  maxDrawdownPct: number; // halt bucket if unrealized DD exceeds this
  enabled: boolean; // false = never execute real trades
  requiresConfirmation: boolean; // true = every trade needs human confirm
  liveExecutionAllowed: boolean; // explicit flag — default false for ALL buckets
}

// ==========================================
// Defaults — all live execution OFF
// ==========================================

const DEFAULT_BUCKETS: CapitalBucket[] = [
  {
    id: "paper",
    label: "Paper Trading",
    allocatedUsd: 100000,
    currentUsd: 100000,
    maxSingleTradeUsd: 10000,
    maxDrawdownPct: 50,
    enabled: true,
    requiresConfirmation: false,
    liveExecutionAllowed: false,
  },
  {
    id: "pilot",
    label: "Live Pilot",
    allocatedUsd: 1000,
    currentUsd: 1000,
    maxSingleTradeUsd: 100,
    maxDrawdownPct: 20,
    enabled: false,
    requiresConfirmation: true,
    liveExecutionAllowed: false,
  },
  {
    id: "main",
    label: "Main Capital",
    allocatedUsd: 10000,
    currentUsd: 10000,
    maxSingleTradeUsd: 500,
    maxDrawdownPct: 15,
    enabled: false,
    requiresConfirmation: true,
    liveExecutionAllowed: false,
  },
];

const DATA_FILE = "capital-buckets.json";

// ==========================================
// Drift Sentinel interface (lazy import to avoid circular dep)
// ==========================================

interface DriftSentinelLike {
  shouldHalt(asset?: string): boolean;
}

let _driftSentinel: DriftSentinelLike | null = null;

/** Wire in drift sentinel (called by sentinel service after both are initialised). */
export function setDriftSentinel(s: DriftSentinelLike): void {
  _driftSentinel = s;
}

// ==========================================
// Service
// ==========================================

export class VinceCapitalBucketsService {
  private buckets: Map<BucketId, CapitalBucket>;
  private dataPath: string;
  private static _instance: VinceCapitalBucketsService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    this.dataPath = path.join(dir, DATA_FILE);
    this.buckets = new Map();
    this.load();
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): VinceCapitalBucketsService {
    if (!VinceCapitalBucketsService._instance) {
      VinceCapitalBucketsService._instance = new VinceCapitalBucketsService();
    }
    return VinceCapitalBucketsService._instance;
  }

  static setInstance(instance: VinceCapitalBucketsService): void {
    VinceCapitalBucketsService._instance = instance;
  }

  // ==========================================
  // Read
  // ==========================================

  getBucket(id: BucketId): CapitalBucket {
    const b = this.buckets.get(id);
    if (!b) throw new Error(`Unknown bucket: ${id}`);
    return { ...b };
  }

  getBuckets(): CapitalBucket[] {
    return Array.from(this.buckets.values()).map((b) => ({ ...b }));
  }

  // ==========================================
  // Execution Gate
  // ==========================================

  canExecute(
    id: BucketId,
    tradeSizeUsd: number,
  ): { allowed: boolean; reason: string } {
    const b = this.getBucket(id);

    // Drift sentinel check first
    if (_driftSentinel?.shouldHalt()) {
      return { allowed: false, reason: "drift-halt" };
    }

    if (!b.enabled) {
      return { allowed: false, reason: "bucket-disabled" };
    }

    if (!b.liveExecutionAllowed) {
      return { allowed: false, reason: "live-execution-not-allowed" };
    }

    if (tradeSizeUsd > b.maxSingleTradeUsd) {
      return {
        allowed: false,
        reason: `trade-size-exceeds-max (${tradeSizeUsd} > ${b.maxSingleTradeUsd})`,
      };
    }

    if (this.isDrawdownBreached(id)) {
      return { allowed: false, reason: "drawdown-breached" };
    }

    return { allowed: true, reason: "ok" };
  }

  isDrawdownBreached(id: BucketId): boolean {
    const b = this.getBucket(id);
    if (b.allocatedUsd <= 0) return false;
    const dd = (b.allocatedUsd - b.currentUsd) / b.allocatedUsd;
    return dd > b.maxDrawdownPct / 100;
  }

  // ==========================================
  // Write
  // ==========================================

  updateBucketValue(id: BucketId, currentUsd: number): void {
    const b = this.buckets.get(id);
    if (!b) throw new Error(`Unknown bucket: ${id}`);
    b.currentUsd = currentUsd;
    this.persist();
  }

  updateBucketConfig(id: BucketId, patch: Partial<CapitalBucket>): void {
    const b = this.buckets.get(id);
    if (!b) throw new Error(`Unknown bucket: ${id}`);
    // Safety: never allow id to change
    const { id: _ignore, ...rest } = patch as Partial<CapitalBucket> & {
      id?: BucketId;
    };
    Object.assign(b, rest);
    this.persist();
  }

  // ==========================================
  // Persistence
  // ==========================================

  private load(): void {
    // Seed defaults first
    for (const def of DEFAULT_BUCKETS) {
      this.buckets.set(def.id, { ...def });
    }

    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.dataPath)) {
        const saved: CapitalBucket[] = JSON.parse(
          fs.readFileSync(this.dataPath, "utf-8"),
        );
        for (const b of saved) {
          if (this.buckets.has(b.id)) {
            this.buckets.set(b.id, { ...b });
          }
        }
      }
    } catch {
      // Use defaults on any parse error
    }

    // Env override for paper bucket max single trade (e.g. VINCE_PAPER_MAX_SINGLE_TRADE_USD=15000)
    const envCap = process.env.VINCE_PAPER_MAX_SINGLE_TRADE_USD?.trim();
    if (envCap) {
      const n = parseInt(envCap, 10);
      if (Number.isInteger(n) && n > 0) {
        const paper = this.buckets.get("paper");
        if (paper) paper.maxSingleTradeUsd = n;
      }
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.dataPath,
        JSON.stringify(Array.from(this.buckets.values()), null, 2),
      );
    } catch {
      // Non-fatal
    }
  }
}
