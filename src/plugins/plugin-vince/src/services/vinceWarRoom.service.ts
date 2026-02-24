/**
 * VINCE War Room (Phase 6 #31)
 *
 * Monte Carlo forward simulation over replay-like feature history.
 * Uses bootstrap resampling of observed returns to evaluate tail outcomes.
 */

import { Service, type IAgentRuntime } from "@elizaos/core";

export interface WarRoomGenomeParams {
  minStrength: number;
  minConfidence: number;
  minConfirmingSources: number;
}

export interface WarRoomFeature {
  strength: number;
  confidence: number;
  sourceCount: number;
  pnlPct: number | null;
}

export interface WarRoomTailResult {
  p01: number;
  p05: number;
  median: number;
  sampleSize: number;
  runs: number;
}

export interface WarRoomComparison {
  pass: boolean;
  incumbentP05: number;
  candidateP05: number;
  incumbent: WarRoomTailResult;
  candidate: WarRoomTailResult;
  rationale: string;
}

const DEFAULT_RUNS = 1000;

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1))),
  );
  return sorted[idx];
}

export class VinceWarRoomService extends Service {
  static serviceType = "VINCE_WAR_ROOM_SERVICE";
  capabilityDescription =
    "Monte Carlo tail-risk simulation for genome promotion safety";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceWarRoomService> {
    return new VinceWarRoomService(runtime);
  }

  async stop(): Promise<void> {}

  simulateTail(
    params: WarRoomGenomeParams,
    history: WarRoomFeature[],
    runs = DEFAULT_RUNS,
  ): WarRoomTailResult {
    const returns = this.collectEligibleReturns(params, history);
    if (returns.length === 0) {
      return { p01: 0, p05: 0, median: 0, sampleSize: 0, runs };
    }
    const n = returns.length;
    const totals: number[] = [];
    for (let i = 0; i < runs; i++) {
      let total = 0;
      for (let j = 0; j < n; j++) {
        const idx = Math.floor(Math.random() * returns.length);
        total += returns[idx];
      }
      totals.push(total);
    }
    totals.sort((a, b) => a - b);
    return {
      p01: percentile(totals, 0.01),
      p05: percentile(totals, 0.05),
      median: percentile(totals, 0.5),
      sampleSize: n,
      runs,
    };
  }

  compareIncumbentVsCandidate(
    incumbent: WarRoomGenomeParams,
    candidate: WarRoomGenomeParams,
    history: WarRoomFeature[],
    runs = DEFAULT_RUNS,
  ): WarRoomComparison {
    const inc = this.simulateTail(incumbent, history, runs);
    const cand = this.simulateTail(candidate, history, runs);
    const pass = cand.p05 >= inc.p05;
    return {
      pass,
      incumbentP05: inc.p05,
      candidateP05: cand.p05,
      incumbent: inc,
      candidate: cand,
      rationale: pass
        ? `candidate p05 ${cand.p05.toFixed(2)} >= incumbent p05 ${inc.p05.toFixed(2)}`
        : `candidate p05 ${cand.p05.toFixed(2)} < incumbent p05 ${inc.p05.toFixed(2)}`,
    };
  }

  private collectEligibleReturns(
    params: WarRoomGenomeParams,
    history: WarRoomFeature[],
  ): number[] {
    const out: number[] = [];
    for (const row of history) {
      const wouldTrade =
        row.strength >= params.minStrength &&
        row.confidence >= params.minConfidence &&
        row.sourceCount >= params.minConfirmingSources;
      if (!wouldTrade || row.pnlPct == null) continue;
      out.push(row.pnlPct);
    }
    return out;
  }
}
