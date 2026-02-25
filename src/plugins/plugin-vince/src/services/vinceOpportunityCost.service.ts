/**
 * VINCE Opportunity Cost Reallocator (#67)
 *
 * Compares a new trade's expected value to the weakest open position.
 * Suggests closing the weakest position to fund the new one when EV is
 * strictly higher by more than the reallocation threshold (default 15%).
 */

// ==========================================
// Types
// ==========================================

export interface OpportunityCostAssessment {
  newTradeExpectedValue: number; // confidence * signalStrength / 100, normalized 0–100
  weakestPosition: {
    tradeId: string;
    asset: string;
    expectedValue: number;
    unrealizedPnl: number;
  } | null;
  shouldReallocate: boolean; // true if newTrade EV > weakest by > threshold%
  reallocationNote: string;
}

// ==========================================
// Service
// ==========================================

export class VinceOpportunityCostService {
  /**
   * Assess whether to reallocate capital from the weakest position to a new trade.
   */
  assess(
    newTradeSignal: {
      asset: string;
      confidence: number;
      strength: number;
    },
    openPositions: {
      tradeId: string;
      asset: string;
      confidence: number;
      strength: number;
      unrealizedPnl: number;
    }[],
  ): OpportunityCostAssessment {
    const newEV = (newTradeSignal.confidence * newTradeSignal.strength) / 100;

    if (openPositions.length === 0) {
      return {
        newTradeExpectedValue: newEV,
        weakestPosition: null,
        shouldReallocate: false,
        reallocationNote: "No open positions to compare against",
      };
    }

    // Find weakest position by EV
    let weakest = openPositions[0];
    let weakestEV = (weakest.confidence * weakest.strength) / 100;

    for (const pos of openPositions) {
      const ev = (pos.confidence * pos.strength) / 100;
      if (ev < weakestEV) {
        weakest = pos;
        weakestEV = ev;
      }
    }

    const threshold = this.getReallocationThreshold();
    const evDifferencePct =
      weakestEV > 0 ? ((newEV - weakestEV) / weakestEV) * 100 : Infinity;
    const shouldReallocate = newEV > weakestEV * (1 + threshold / 100);

    const weakestPosition = {
      tradeId: weakest.tradeId,
      asset: weakest.asset,
      expectedValue: weakestEV,
      unrealizedPnl: weakest.unrealizedPnl,
    };

    let reallocationNote: string;
    if (shouldReallocate) {
      reallocationNote =
        `Consider closing ${weakest.asset} (EV=${weakestEV.toFixed(2)}) ` +
        `to fund ${newTradeSignal.asset} (EV=${newEV.toFixed(2)}, ` +
        `+${evDifferencePct === Infinity ? "∞" : evDifferencePct.toFixed(1)}% higher)`;
    } else {
      reallocationNote =
        `No reallocation needed — ${newTradeSignal.asset} (EV=${newEV.toFixed(2)}) ` +
        `does not exceed ${weakest.asset} (EV=${weakestEV.toFixed(2)}) by >${threshold}%`;
    }

    return {
      newTradeExpectedValue: newEV,
      weakestPosition,
      shouldReallocate,
      reallocationNote,
    };
  }

  /**
   * Reallocation threshold — default 15%.
   * Genome-evolvable via env OPPORTUNITY_COST_THRESHOLD.
   */
  getReallocationThreshold(): number {
    const env = process.env.OPPORTUNITY_COST_THRESHOLD;
    if (env) {
      const parsed = parseFloat(env);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return 15;
  }
}
