/**
 * VinceForecastMerge Service
 *
 * Merges counterfactual signals (what happened when we didn't trade) with
 * forecast signals (what should happen next) into a unified trade conviction score.
 *
 * PRD: One Dream Phase 12 — Task #76
 */

export interface AvoidedTrade {
  asset: string;
  direction: string;
  priceDeltaPct: number;
}

export interface MergedConviction {
  asset: string;
  counterfactualSignal: number; // -1 to 1 (positive = right to skip, negative = missed winner)
  forecastSignal: number; // -1 to 1 (from narrative lag + regime transition forecaster)
  mergedConviction: number; // weighted average, -1 to 1
  conviction:
    | "strong-long"
    | "lean-long"
    | "neutral"
    | "lean-short"
    | "strong-short";
  rationale: string;
}

const COUNTERFACTUAL_WEIGHT = 0.4;
const FORECAST_WEIGHT = 0.6;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function mapToConviction(score: number): MergedConviction["conviction"] {
  if (score > 0.5) return "strong-long";
  if (score > 0.2) return "lean-long";
  if (score >= -0.2) return "neutral";
  if (score >= -0.5) return "lean-short";
  return "strong-short";
}

export class VinceForecastMergeService {
  /**
   * Compute counterfactual signal for an asset from avoided trades.
   *
   * If we avoided a long and price went UP → negative (missed winner, regret)
   * If we avoided a long and price went DOWN → positive (right to avoid)
   * Inverse logic for avoided shorts.
   * Returns clamped -1 to 1.
   */
  computeCounterfactualSignal(
    asset: string,
    avoidedTrades: AvoidedTrade[],
  ): number {
    const assetTrades = avoidedTrades.filter((t) => t.asset === asset);
    if (assetTrades.length === 0) return 0;

    let signalSum = 0;
    for (const trade of assetTrades) {
      if (trade.direction === "long") {
        // avoided long: price up → negative (missed), price down → positive (right)
        signalSum +=
          -Math.sign(trade.priceDeltaPct) *
          Math.min(1, Math.abs(trade.priceDeltaPct) / 10);
      } else if (trade.direction === "short") {
        // avoided short: price down → negative (missed), price up → positive (right)
        signalSum +=
          Math.sign(trade.priceDeltaPct) *
          Math.min(1, Math.abs(trade.priceDeltaPct) / 10);
      }
    }

    const avg = signalSum / assetTrades.length;
    return clamp(avg, -1, 1);
  }

  /**
   * Compute forecast signal based on narrative phase and regime transition risk.
   *
   * inception + low transition risk → +0.7
   * growth + low transition risk → +0.9
   * peak + high transition risk → -0.7
   * decline → -0.9
   * Else → 0
   */
  computeForecastSignal(
    _asset: string,
    narrativePhase: string,
    regimeTransitionRisk: number,
  ): number {
    const phase = narrativePhase.toLowerCase();
    const highRisk = regimeTransitionRisk > 0.5;
    const lowRisk = regimeTransitionRisk <= 0.5;

    if (phase === "inception" && lowRisk) return 0.7;
    if (phase === "growth" && lowRisk) return 0.9;
    if (phase === "peak" && highRisk) return -0.7;
    if (phase === "decline") return -0.9;

    return 0;
  }

  /**
   * Merge counterfactual + forecast into a unified conviction score.
   */
  merge(
    asset: string,
    avoidedTrades: AvoidedTrade[],
    narrativePhase: string,
    regimeTransitionRisk: number,
  ): MergedConviction {
    const counterfactualSignal = this.computeCounterfactualSignal(
      asset,
      avoidedTrades,
    );
    const forecastSignal = this.computeForecastSignal(
      asset,
      narrativePhase,
      regimeTransitionRisk,
    );

    const mergedConviction = clamp(
      COUNTERFACTUAL_WEIGHT * counterfactualSignal +
        FORECAST_WEIGHT * forecastSignal,
      -1,
      1,
    );

    const conviction = mapToConviction(mergedConviction);

    const rationale = [
      `counterfactual=${counterfactualSignal.toFixed(2)} (w=0.4)`,
      `forecast=${forecastSignal.toFixed(2)} (phase=${narrativePhase}, risk=${regimeTransitionRisk.toFixed(2)}, w=0.6)`,
      `merged=${mergedConviction.toFixed(2)} → ${conviction}`,
    ].join(" | ");

    return {
      asset,
      counterfactualSignal,
      forecastSignal,
      mergedConviction,
      conviction,
      rationale,
    };
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  private static _instance: VinceForecastMergeService | null = null;

  static getInstance(): VinceForecastMergeService {
    if (!VinceForecastMergeService._instance) {
      VinceForecastMergeService._instance = new VinceForecastMergeService();
    }
    return VinceForecastMergeService._instance;
  }

  static setInstance(instance: VinceForecastMergeService): void {
    VinceForecastMergeService._instance = instance;
  }
}
