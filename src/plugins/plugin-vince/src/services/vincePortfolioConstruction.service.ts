/**
 * VINCE Portfolio Construction Service
 *
 * Portfolio-level risk management:
 * - Rolling correlation matrix across open positions
 * - Total portfolio heat (sum of position risk as % of equity)
 * - Kelly criterion sizing from per-source win rate
 * - Opportunity cost check (new trade vs weakest position)
 * - Max simultaneous positions by regime
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";

// ==========================================
// Types
// ==========================================

export interface PositionSnapshot {
  asset: string;
  direction: "long" | "short";
  sizeUsd: number;
  leverage: number;
  unrealizedPnlPct: number;
  entryPrice: number;
  currentPrice: number;
  riskPct: number;
}

export interface CorrelationEntry {
  assetA: string;
  assetB: string;
  correlation: number;
}

export interface PortfolioConstraints {
  maxHeatPct: number;
  maxSimultaneous: number;
  maxCorrelation: number;
  minDiversification: number;
}

export interface PortfolioState {
  totalHeatPct: number;
  positionCount: number;
  correlations: CorrelationEntry[];
  highCorrelationPairs: CorrelationEntry[];
  weakestPosition: PositionSnapshot | null;
  canAddPosition: boolean;
  rejectReason: string | null;
}

export interface OpportunityCost {
  newTradeExpectedSharpe: number;
  weakestPositionSharpe: number;
  shouldReplace: boolean;
  weakestAsset: string | null;
}

const DEFAULT_CONSTRAINTS: PortfolioConstraints = {
  maxHeatPct: 30,
  maxSimultaneous: 5,
  maxCorrelation: 0.8,
  minDiversification: 0.3,
};

// ==========================================
// Price Return Tracking (for correlation)
// ==========================================

interface PriceReturn {
  asset: string;
  timestamp: number;
  returnPct: number;
}

const RETURN_WINDOW_HOURS = 24;
const RETURN_INTERVAL_MINUTES = 30;
const MAX_RETURNS_PER_ASSET =
  (RETURN_WINDOW_HOURS * 60) / RETURN_INTERVAL_MINUTES;

// ==========================================
// Service
// ==========================================

export class VincePortfolioConstructionService extends Service {
  static serviceType = "VINCE_PORTFOLIO_CONSTRUCTION_SERVICE";
  capabilityDescription =
    "Portfolio-level risk: correlation, heat, Kelly sizing, opportunity cost";

  private returnHistory: Map<string, PriceReturn[]> = new Map();
  private lastPrices: Map<string, number> = new Map();
  private constraints: PortfolioConstraints;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.constraints = { ...DEFAULT_CONSTRAINTS };
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VincePortfolioConstructionService> {
    const svc = new VincePortfolioConstructionService(runtime);
    const maxPos = runtime.getSetting("VINCE_MAX_SIMULTANEOUS_POSITIONS");
    if (typeof maxPos === "number") svc.constraints.maxSimultaneous = maxPos;
    const maxHeat = runtime.getSetting("VINCE_MAX_HEAT_PCT");
    if (typeof maxHeat === "number") svc.constraints.maxHeatPct = maxHeat;
    logger.info(
      `[PortfolioConstruction] Ready (maxHeat=${svc.constraints.maxHeatPct}%, maxPos=${svc.constraints.maxSimultaneous})`,
    );
    return svc;
  }

  async stop(): Promise<void> {}

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record a price tick for correlation tracking.
   */
  recordPrice(asset: string, price: number): void {
    const prev = this.lastPrices.get(asset);
    this.lastPrices.set(asset, price);
    if (prev == null || prev <= 0) return;

    const returnPct = ((price - prev) / prev) * 100;
    const returns = this.returnHistory.get(asset) ?? [];
    returns.push({ asset, timestamp: Date.now(), returnPct });

    if (returns.length > MAX_RETURNS_PER_ASSET) {
      returns.splice(0, returns.length - MAX_RETURNS_PER_ASSET);
    }
    this.returnHistory.set(asset, returns);
  }

  /**
   * Evaluate whether a new position can be opened given current portfolio state.
   */
  evaluate(
    positions: PositionSnapshot[],
    newAsset: string,
    newSizeUsd: number,
    equity: number,
  ): PortfolioState {
    const totalHeatPct = this.computeHeat(positions, equity);
    const newHeat = totalHeatPct + (newSizeUsd / equity) * 100;
    const correlations = this.computeCorrelations(
      positions.map((p) => p.asset),
    );
    const highCorr = correlations.filter(
      (c) => Math.abs(c.correlation) >= this.constraints.maxCorrelation,
    );

    // Check correlation of new asset with existing positions
    const newCorrelations = positions.map((p) => ({
      assetA: newAsset,
      assetB: p.asset,
      correlation: this.pairCorrelation(newAsset, p.asset),
    }));
    const highCorrWithNew = newCorrelations.filter(
      (c) => Math.abs(c.correlation) >= this.constraints.maxCorrelation,
    );

    const weakest = this.findWeakest(positions);

    let canAdd = true;
    let rejectReason: string | null = null;

    if (positions.length >= this.constraints.maxSimultaneous) {
      canAdd = false;
      rejectReason = `Max ${this.constraints.maxSimultaneous} simultaneous positions reached`;
    } else if (newHeat > this.constraints.maxHeatPct) {
      canAdd = false;
      rejectReason = `Portfolio heat would reach ${newHeat.toFixed(1)}% (max ${this.constraints.maxHeatPct}%)`;
    } else if (highCorrWithNew.length > 0) {
      const worst = highCorrWithNew.sort(
        (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation),
      )[0];
      canAdd = false;
      rejectReason = `${newAsset} has ${(worst.correlation * 100).toFixed(0)}% correlation with ${worst.assetB} (max ${this.constraints.maxCorrelation * 100}%)`;
    }

    return {
      totalHeatPct,
      positionCount: positions.length,
      correlations: [...correlations, ...newCorrelations],
      highCorrelationPairs: [...highCorr, ...highCorrWithNew],
      weakestPosition: weakest,
      canAddPosition: canAdd,
      rejectReason,
    };
  }

  /**
   * Kelly criterion sizing: optimal fraction = (W * R - L) / R
   * where W = win rate, L = loss rate, R = avg win / avg loss
   */
  kellySize(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    fraction = 0.5,
  ): number {
    if (avgLoss <= 0 || winRate <= 0) return 0;
    const W = winRate / 100;
    const L = 1 - W;
    const R = avgWin / Math.abs(avgLoss);
    const kelly = (W * R - L) / R;
    return Math.max(0, Math.min(1, kelly * fraction));
  }

  /**
   * Opportunity cost: should we replace weakest position with new trade?
   */
  opportunityCost(
    newExpectedSharpe: number,
    positions: PositionSnapshot[],
  ): OpportunityCost {
    const weakest = this.findWeakest(positions);
    if (!weakest) {
      return {
        newTradeExpectedSharpe: newExpectedSharpe,
        weakestPositionSharpe: 0,
        shouldReplace: false,
        weakestAsset: null,
      };
    }

    // Approximate weakest position's Sharpe from unrealized PnL
    const weakestSharpe = weakest.unrealizedPnlPct;

    return {
      newTradeExpectedSharpe: newExpectedSharpe,
      weakestPositionSharpe: weakestSharpe,
      shouldReplace:
        newExpectedSharpe > weakestSharpe * 1.5 && weakestSharpe < 0,
      weakestAsset: weakest.asset,
    };
  }

  setConstraints(c: Partial<PortfolioConstraints>): void {
    this.constraints = { ...this.constraints, ...c };
  }

  getConstraints(): PortfolioConstraints {
    return { ...this.constraints };
  }

  // ==========================================
  // Internal
  // ==========================================

  private computeHeat(positions: PositionSnapshot[], equity: number): number {
    if (equity <= 0) return 0;
    return positions.reduce((sum, p) => sum + p.riskPct, 0);
  }

  private findWeakest(positions: PositionSnapshot[]): PositionSnapshot | null {
    if (positions.length === 0) return null;
    return positions.reduce((worst, p) =>
      p.unrealizedPnlPct < worst.unrealizedPnlPct ? p : worst,
    );
  }

  private computeCorrelations(assets: string[]): CorrelationEntry[] {
    const entries: CorrelationEntry[] = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        entries.push({
          assetA: assets[i],
          assetB: assets[j],
          correlation: this.pairCorrelation(assets[i], assets[j]),
        });
      }
    }
    return entries;
  }

  private pairCorrelation(a: string, b: string): number {
    const ra = this.returnHistory.get(a);
    const rb = this.returnHistory.get(b);
    if (!ra || !rb || ra.length < 5 || rb.length < 5) return 0;

    // Align by timestamp (nearest within 5 min)
    const aligned: Array<[number, number]> = [];
    for (const retA of ra) {
      const closest = rb.reduce((best, retB) =>
        Math.abs(retB.timestamp - retA.timestamp) <
        Math.abs(best.timestamp - retA.timestamp)
          ? retB
          : best,
      );
      if (Math.abs(closest.timestamp - retA.timestamp) < 5 * 60 * 1000) {
        aligned.push([retA.returnPct, closest.returnPct]);
      }
    }

    if (aligned.length < 5) return 0;
    return this.pearson(aligned);
  }

  private pearson(pairs: Array<[number, number]>): number {
    const n = pairs.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;

    for (const [x, y] of pairs) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return den === 0 ? 0 : num / den;
  }
}
