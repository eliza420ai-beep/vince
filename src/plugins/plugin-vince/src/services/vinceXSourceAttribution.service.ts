/**
 * VINCE Proof Attribution Store
 *
 * Phase 8 introduced source attribution; Phase 14 extends this file into the
 * shared proof ledger used by uplift, sufficiency, source quality, and
 * proof-to-capital allocation.
 *
 * Primary persistence: JSONL.
 * Optional DB mirror: best-effort write through runtime database adapter.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface AttributionRecord {
  tradeId: string;
  asset: string;
  direction: string;
  openedAt: string;
  openedAtMs: number;
  sourceClusters: string[];
  sourceLineage?: string[];
  confidence: number;
  strength?: number;
  regime?: string;
  sleeve?: string;
  gateStack?: {
    ruleBased: boolean;
    onnxEnabled: boolean;
    swarmEnabled: boolean;
    adversaryEnabled: boolean;
  };
  decisionImpact?: "better" | "worse" | "neutral";
  closedAt?: string;
  closedAtMs?: number;
  pnl?: number;
  pnlPct?: number;
  outcome?: "win" | "loss" | "scratch";
}

const FILE_NAME = "trade-attribution.jsonl";
const DB_TABLE = "plugin_vince.proof_attribution";
const STAGE_LABELS = [
  "baseline_rule_based",
  "onnx_enabled",
  "onnx_plus_swarm",
  "onnx_plus_swarm_plus_adversary",
] as const;

export type UpliftStage = (typeof STAGE_LABELS)[number];

export interface StageSnapshot {
  stage: UpliftStage;
  count: number;
  winRate: number;
  avgPnl: number;
  avgPnlPct: number;
}

export interface UpliftSnapshot {
  windowDays: number;
  generatedAt: number;
  totalClosed: number;
  byStage: StageSnapshot[];
  byRegime: Array<{
    regime: string;
    count: number;
    winRate: number;
    avgPnl: number;
  }>;
  proofScore?: number;
}

export interface SufficiencySnapshot {
  generatedAt: number;
  sampleCount: number;
  uniqueAssets: number;
  uniqueRegimes: number;
  timeCoverageDays: number;
  pnlStdDev: number;
  minRegimeSampleCount: number;
  windowDays: number;
  grade: "LOW" | "MEDIUM" | "HIGH";
  blockingReasons: string[];
  blockersByDimension?: Record<string, string>;
}

export interface SourceQualitySnapshot {
  generatedAt: number;
  windowDays: number;
  sources: Array<{
    source: string;
    tradeCount: number;
    winRate: number;
    avgPnl: number;
    qualityScore: number;
    recommendedWeightMultiplier: number;
    lagPenalty: number;
    dominantRegime?: string;
  }>;
}

export interface CausalPairSnapshot {
  label: string;
  controlStage: UpliftStage;
  treatmentStage: UpliftStage;
  controlCount: number;
  treatmentCount: number;
  controlWinRate: number;
  treatmentWinRate: number;
  upliftDelta: number;
  ciLower: number;
  ciUpper: number;
  smoothedUpliftDelta?: number;
  smoothedCiLower?: number;
  confidenceScore: number;
  smoothedConfidenceScore?: number;
  passed: boolean;
  failureReason?: string;
}

export interface CausalUpliftSnapshot {
  generatedAt: number;
  windowDays: number;
  minimumEffect: number;
  minimumSamplesPerArm: number;
  pairs: CausalPairSnapshot[];
  promotionEligible: boolean;
  promotionReasons: string[];
}

export interface CausalStageDepthSummary {
  generatedAt: number;
  windowDays: number;
  minimumSamplesPerArm: number;
  perStage: Array<{
    stage: UpliftStage;
    count: number;
    deficitToMin: number;
  }>;
  pairDepth: Array<{
    label: string;
    controlStage: UpliftStage;
    treatmentStage: UpliftStage;
    controlCount: number;
    treatmentCount: number;
    minArmSamples: number;
    deficitToMin: number;
  }>;
  allStagesReady: boolean;
}

interface DbAdapterLike {
  db?: {
    execute?: (query: string, params?: unknown[]) => unknown;
  };
}

// ==========================================
// Service
// ==========================================

export class VinceXSourceAttributionService {
  private readonly filePath: string;
  private readonly runtime?: { databaseAdapter?: DbAdapterLike } | any;

  constructor(
    dataDir?: string,
    runtime?: { databaseAdapter?: DbAdapterLike } | null | any,
  ) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
    this.runtime = runtime ?? undefined;
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): AttributionRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: AttributionRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as AttributionRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private saveAll(records: AttributionRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private appendRecord(record: AttributionRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
    void this.persistToDb(record);
  }

  private async persistToDb(record: AttributionRecord): Promise<void> {
    try {
      const adapter = this.runtime?.databaseAdapter;
      const execute = adapter?.db?.execute;
      if (typeof execute !== "function") return;
      await Promise.resolve(
        execute(`INSERT INTO ${DB_TABLE} (payload, created_at) VALUES (?, ?)`, [
          JSON.stringify(record),
          Date.now(),
        ]),
      );
    } catch {
      // DB mirror is best effort; JSONL is source of truth.
    }
  }

  private stageOf(record: AttributionRecord): UpliftStage {
    const gate = record.gateStack;
    if (!gate?.onnxEnabled) return "baseline_rule_based";
    if (gate.onnxEnabled && !gate.swarmEnabled) return "onnx_enabled";
    if (gate.onnxEnabled && gate.swarmEnabled && !gate.adversaryEnabled) {
      return "onnx_plus_swarm";
    }
    return "onnx_plus_swarm_plus_adversary";
  }

  private scoreSource(winRate: number, avgPnl: number, count: number): number {
    // Reliability + edge + sample confidence.
    const reliability = Math.max(0, Math.min(100, winRate * 100));
    const pnlComponent = Math.max(-20, Math.min(20, avgPnl / 25));
    const sampleComponent = Math.max(
      0,
      Math.min(20, Math.log10(count + 1) * 8),
    );
    return Math.max(
      0,
      Math.min(100, reliability * 0.7 + pnlComponent + sampleComponent),
    );
  }

  private wilsonLowerBound(successes: number, total: number, z = 1.96): number {
    if (total <= 0) return 0;
    const p = successes / total;
    const denom = 1 + (z * z) / total;
    const center = p + (z * z) / (2 * total);
    const margin =
      z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
    return Math.max(0, (center - margin) / denom);
  }

  private std(values: number[]): number {
    if (values.length <= 1) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(Math.max(0, variance));
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record the opening of a trade with its source clusters.
   */
  recordOpen(
    tradeId: string,
    asset: string,
    direction: string,
    sourceClusters: string[],
    confidence: number,
    details?: {
      sourceLineage?: string[];
      strength?: number;
      regime?: string;
      sleeve?: string;
      gateStack?: AttributionRecord["gateStack"];
    },
  ): void {
    const now = Date.now();
    const record: AttributionRecord = {
      tradeId,
      asset,
      direction,
      openedAt: new Date().toISOString(),
      openedAtMs: now,
      sourceClusters,
      confidence,
      sourceLineage: details?.sourceLineage,
      strength: details?.strength,
      regime: details?.regime,
      sleeve: details?.sleeve ?? "paper",
      gateStack: details?.gateStack,
    };
    this.appendRecord(record);
  }

  /**
   * Update a trade with close details, rewriting the file.
   */
  recordClose(
    tradeId: string,
    pnl: number,
    outcome: "win" | "loss" | "scratch",
    details?: {
      pnlPct?: number;
      decisionImpact?: "better" | "worse" | "neutral";
    },
  ): void {
    const all = this.loadAll();
    let found = false;
    const now = Date.now();
    for (const record of all) {
      if (record.tradeId === tradeId) {
        record.closedAt = new Date().toISOString();
        record.closedAtMs = now;
        record.pnl = pnl;
        record.pnlPct = details?.pnlPct;
        record.outcome = outcome;
        record.decisionImpact = details?.decisionImpact;
        found = true;
        break;
      }
    }
    if (found) {
      this.saveAll(all);
    }
  }

  /**
   * Get attribution stats per source cluster, sorted by winRate desc.
   */
  getAttributionStats(): {
    source: string;
    winRate: number;
    avgPnl: number;
    tradeCount: number;
  }[] {
    const closed = this.loadAll().filter((r) => r.outcome !== undefined);

    // Build per-source stats
    const sourceMap = new Map<
      string,
      { wins: number; total: number; totalPnl: number }
    >();

    for (const record of closed) {
      for (const source of record.sourceClusters) {
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { wins: 0, total: 0, totalPnl: 0 });
        }
        const stats = sourceMap.get(source)!;
        stats.total += 1;
        stats.totalPnl += record.pnl ?? 0;
        if (record.outcome === "win") {
          stats.wins += 1;
        }
      }
    }

    return Array.from(sourceMap.entries())
      .map(([source, stats]) => ({
        source,
        winRate: stats.total > 0 ? stats.wins / stats.total : 0,
        avgPnl: stats.total > 0 ? stats.totalPnl / stats.total : 0,
        tradeCount: stats.total,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }

  getRecords(windowDays?: number): AttributionRecord[] {
    const all = this.loadAll();
    if (typeof windowDays !== "number" || windowDays <= 0) return all;
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return all.filter((r) => (r.closedAtMs ?? r.openedAtMs) >= cutoff);
  }

  getUpliftSnapshot(windowDays = 30): UpliftSnapshot {
    const closed = this.getRecords(windowDays).filter((r) => r.outcome);
    const byStage: StageSnapshot[] = STAGE_LABELS.map((stage) => {
      const rows = closed.filter((r) => this.stageOf(r) === stage);
      const wins = rows.filter((r) => r.outcome === "win").length;
      const pnlSum = rows.reduce((sum, r) => sum + (r.pnl ?? 0), 0);
      const pnlPctSum = rows.reduce((sum, r) => sum + (r.pnlPct ?? 0), 0);
      const count = rows.length;
      return {
        stage,
        count,
        winRate: count > 0 ? wins / count : 0,
        avgPnl: count > 0 ? pnlSum / count : 0,
        avgPnlPct: count > 0 ? pnlPctSum / count : 0,
      };
    });

    const regimeMap = new Map<
      string,
      { count: number; wins: number; pnl: number }
    >();
    for (const row of closed) {
      const regime = row.regime ?? "unknown";
      const bucket = regimeMap.get(regime) ?? { count: 0, wins: 0, pnl: 0 };
      bucket.count += 1;
      bucket.pnl += row.pnl ?? 0;
      if (row.outcome === "win") bucket.wins += 1;
      regimeMap.set(regime, bucket);
    }
    const byRegime = Array.from(regimeMap.entries()).map(([regime, value]) => ({
      regime,
      count: value.count,
      winRate: value.count > 0 ? value.wins / value.count : 0,
      avgPnl: value.count > 0 ? value.pnl / value.count : 0,
    }));

    const stageWeightedWinRate = byStage.reduce(
      (sum, s) => sum + s.winRate * s.count,
      0,
    );
    const proofScoreRaw =
      closed.length > 0 ? (stageWeightedWinRate / closed.length) * 100 : 0;

    return {
      windowDays,
      generatedAt: Date.now(),
      totalClosed: closed.length,
      byStage,
      byRegime,
      proofScore: Math.max(0, Math.min(100, proofScoreRaw)),
    };
  }

  getSufficiencySnapshot(windowDays = 30): SufficiencySnapshot {
    const closed = this.getRecords(windowDays).filter((r) => r.outcome);
    const assets = new Set(closed.map((r) => r.asset));
    const regimes = new Set(closed.map((r) => r.regime ?? "unknown"));
    const closedTimes = closed
      .map((r) => r.closedAtMs ?? r.openedAtMs)
      .filter((v): v is number => Number.isFinite(v));
    const minTs =
      closedTimes.length > 0 ? Math.min(...closedTimes) : Date.now();
    const maxTs =
      closedTimes.length > 0 ? Math.max(...closedTimes) : Date.now();
    const timeCoverageDays = Math.max(
      0,
      (maxTs - minTs) / (24 * 60 * 60 * 1000),
    );
    const pnlStdDev = this.std(closed.map((r) => r.pnl ?? 0));
    const regimeCountMap = new Map<string, number>();
    for (const r of closed) {
      const key = r.regime ?? "unknown";
      regimeCountMap.set(key, (regimeCountMap.get(key) ?? 0) + 1);
    }
    const minRegimeSampleCount =
      regimeCountMap.size > 0 ? Math.min(...regimeCountMap.values()) : 0;
    const blockingReasons: string[] = [];
    const blockersByDimension: Record<string, string> = {};
    if (closed.length < 20) blockingReasons.push("sample_count_below_20");
    if (closed.length < 20)
      blockersByDimension.sampleCount = "Need >=20 closed rows";
    if (assets.size < 3) blockingReasons.push("asset_coverage_below_3");
    if (assets.size < 3) blockersByDimension.assetCoverage = "Need >=3 assets";
    if (regimes.size < 2) blockingReasons.push("regime_coverage_below_2");
    if (regimes.size < 2)
      blockersByDimension.regimeCoverage = "Need >=2 regimes";
    if (timeCoverageDays < 7) blockingReasons.push("time_coverage_below_7d");
    if (timeCoverageDays < 7)
      blockersByDimension.timeCoverage = "Need >=7 days of closed outcomes";
    if (minRegimeSampleCount < 5) blockingReasons.push("regime_depth_below_5");
    if (minRegimeSampleCount < 5)
      blockersByDimension.regimeDepth = "Need >=5 rows in each active regime";

    let grade: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (
      closed.length >= 50 &&
      assets.size >= 5 &&
      regimes.size >= 3 &&
      timeCoverageDays >= 14 &&
      minRegimeSampleCount >= 8
    ) {
      grade = "HIGH";
    } else if (
      closed.length >= 20 &&
      assets.size >= 3 &&
      regimes.size >= 2 &&
      timeCoverageDays >= 7 &&
      minRegimeSampleCount >= 5
    ) {
      grade = "MEDIUM";
    }

    return {
      generatedAt: Date.now(),
      sampleCount: closed.length,
      uniqueAssets: assets.size,
      uniqueRegimes: regimes.size,
      timeCoverageDays,
      pnlStdDev,
      minRegimeSampleCount,
      windowDays,
      grade,
      blockingReasons,
      blockersByDimension,
    };
  }

  getSourceQualitySnapshot(windowDays = 30): SourceQualitySnapshot {
    const closed = this.getRecords(windowDays).filter((r) => r.outcome);
    const sourceMap = new Map<
      string,
      { wins: number; count: number; pnl: number }
    >();
    const regimeSourceMap = new Map<string, Map<string, number>>();
    for (const row of closed) {
      const sourceList =
        row.sourceLineage && row.sourceLineage.length > 0
          ? row.sourceLineage
          : row.sourceClusters;
      const rowRegime = row.regime ?? "unknown";
      const rs = regimeSourceMap.get(rowRegime) ?? new Map<string, number>();
      for (const source of sourceList) {
        const stats = sourceMap.get(source) ?? { wins: 0, count: 0, pnl: 0 };
        stats.count += 1;
        stats.pnl += row.pnl ?? 0;
        if (row.outcome === "win") stats.wins += 1;
        sourceMap.set(source, stats);
        rs.set(source, (rs.get(source) ?? 0) + 1);
      }
      regimeSourceMap.set(rowRegime, rs);
    }
    const sources = Array.from(sourceMap.entries())
      .map(([source, stats]) => {
        const winRate = stats.count > 0 ? stats.wins / stats.count : 0;
        const avgPnl = stats.count > 0 ? stats.pnl / stats.count : 0;
        const lagPenalty = stats.count < 10 ? 8 : stats.count < 20 ? 4 : 0;
        const qualityScore = Math.max(
          0,
          this.scoreSource(winRate, avgPnl, stats.count) - lagPenalty,
        );
        const recommendedWeightMultiplier =
          qualityScore >= 75 ? 1.12 : qualityScore <= 38 ? 0.9 : 1.0;
        let dominantRegime: string | undefined;
        let domCount = 0;
        for (const [regime, perRegimeSource] of regimeSourceMap.entries()) {
          const c = perRegimeSource.get(source) ?? 0;
          if (c > domCount) {
            domCount = c;
            dominantRegime = regime;
          }
        }
        return {
          source,
          tradeCount: stats.count,
          winRate,
          avgPnl,
          qualityScore,
          recommendedWeightMultiplier,
          lagPenalty,
          dominantRegime,
        };
      })
      .sort((a, b) => b.qualityScore - a.qualityScore);

    return {
      generatedAt: Date.now(),
      windowDays,
      sources,
    };
  }

  getCausalUpliftSnapshot(params?: {
    windowDays?: number;
    minimumEffect?: number;
    minimumSamplesPerArm?: number;
  }): CausalUpliftSnapshot {
    const windowDays = params?.windowDays ?? 30;
    const minimumEffect = params?.minimumEffect ?? 0.02;
    const minimumSamplesPerArm = params?.minimumSamplesPerArm ?? 12;
    const closed = this.getRecords(windowDays).filter((r) => r.outcome);

    const stagePairs: Array<{
      label: string;
      control: UpliftStage;
      treatment: UpliftStage;
    }> = [
      {
        label: "rule_vs_onnx",
        control: "baseline_rule_based",
        treatment: "onnx_enabled",
      },
      {
        label: "onnx_vs_swarm",
        control: "onnx_enabled",
        treatment: "onnx_plus_swarm",
      },
      {
        label: "swarm_vs_adversary",
        control: "onnx_plus_swarm",
        treatment: "onnx_plus_swarm_plus_adversary",
      },
    ];

    const computePairs = (
      rows: AttributionRecord[],
    ): Array<
      Omit<CausalPairSnapshot, "passed" | "failureReason"> & {
        passed: boolean;
        failureReason?: string;
      }
    > => {
      const byStage = new Map<UpliftStage, AttributionRecord[]>();
      for (const stage of STAGE_LABELS) byStage.set(stage, []);
      for (const row of rows) {
        const stage = this.stageOf(row);
        byStage.get(stage)?.push(row);
      }
      return stagePairs.map((pair) => {
        const controlRows = byStage.get(pair.control) ?? [];
        const treatmentRows = byStage.get(pair.treatment) ?? [];
        const controlCount = controlRows.length;
        const treatmentCount = treatmentRows.length;
        const controlWins = controlRows.filter(
          (r) => r.outcome === "win",
        ).length;
        const treatmentWins = treatmentRows.filter(
          (r) => r.outcome === "win",
        ).length;
        const controlWinRate =
          controlCount > 0 ? controlWins / controlCount : 0;
        const treatmentWinRate =
          treatmentCount > 0 ? treatmentWins / treatmentCount : 0;
        const upliftDelta = treatmentWinRate - controlWinRate;
        const controlLower = this.wilsonLowerBound(controlWins, controlCount);
        const treatmentLower = this.wilsonLowerBound(
          treatmentWins,
          treatmentCount,
        );
        const ciLower = treatmentLower - controlWinRate;
        const ciUpper = treatmentWinRate - controlLower;
        const confidenceScore = Math.max(
          0,
          Math.min(
            100,
            ((treatmentLower - controlLower + 1) / 2) * 100 +
              Math.min(20, Math.log10(treatmentCount + controlCount + 1) * 5),
          ),
        );
        let passed = true;
        let failureReason: string | undefined;
        if (
          controlCount < minimumSamplesPerArm ||
          treatmentCount < minimumSamplesPerArm
        ) {
          passed = false;
          failureReason = "insufficient_samples";
        } else if (ciLower < minimumEffect) {
          passed = false;
          failureReason = "effect_below_threshold";
        }
        return {
          label: pair.label,
          controlStage: pair.control,
          treatmentStage: pair.treatment,
          controlCount,
          treatmentCount,
          controlWinRate,
          treatmentWinRate,
          upliftDelta,
          ciLower,
          ciUpper,
          confidenceScore,
          passed,
          failureReason,
        };
      });
    };

    const shortWindowDays = Math.max(7, Math.min(windowDays, 14));
    const shortClosed = this.getRecords(shortWindowDays).filter(
      (r) => r.outcome,
    );
    const pairsNow = computePairs(closed);
    const shortPairs = computePairs(shortClosed);
    const shortPairByLabel = new Map(shortPairs.map((p) => [p.label, p]));

    const pairs: CausalPairSnapshot[] = pairsNow.map((pair) => {
      const short = shortPairByLabel.get(pair.label);
      const smoothedUpliftDelta = short
        ? pair.upliftDelta * 0.7 + short.upliftDelta * 0.3
        : pair.upliftDelta;
      const smoothedCiLower = short
        ? pair.ciLower * 0.7 + short.ciLower * 0.3
        : pair.ciLower;
      const smoothedConfidenceScore = short
        ? pair.confidenceScore * 0.7 + short.confidenceScore * 0.3
        : pair.confidenceScore;
      return {
        ...pair,
        smoothedUpliftDelta,
        smoothedCiLower,
        smoothedConfidenceScore,
      };
    });

    const failedPairs = pairs.filter((p) => !p.passed);
    return {
      generatedAt: Date.now(),
      windowDays,
      minimumEffect,
      minimumSamplesPerArm,
      pairs,
      promotionEligible: failedPairs.length === 0 && pairs.length > 0,
      promotionReasons:
        failedPairs.length === 0
          ? ["all_pairs_passed"]
          : failedPairs.map((p) => `${p.label}:${p.failureReason}`),
    };
  }

  getCausalStageDepthSummary(
    windowDays = 30,
    minimumSamplesPerArm = 12,
  ): CausalStageDepthSummary {
    const closed = this.getRecords(windowDays).filter((r) => r.outcome);
    const stageCount = new Map<UpliftStage, number>();
    for (const stage of STAGE_LABELS) stageCount.set(stage, 0);
    for (const row of closed) {
      const stage = this.stageOf(row);
      stageCount.set(stage, (stageCount.get(stage) ?? 0) + 1);
    }

    const perStage = STAGE_LABELS.map((stage) => {
      const count = stageCount.get(stage) ?? 0;
      return {
        stage,
        count,
        deficitToMin: Math.max(0, minimumSamplesPerArm - count),
      };
    });

    const pairDepth = [
      {
        label: "rule_vs_onnx",
        controlStage: "baseline_rule_based" as const,
        treatmentStage: "onnx_enabled" as const,
      },
      {
        label: "onnx_vs_swarm",
        controlStage: "onnx_enabled" as const,
        treatmentStage: "onnx_plus_swarm" as const,
      },
      {
        label: "swarm_vs_adversary",
        controlStage: "onnx_plus_swarm" as const,
        treatmentStage: "onnx_plus_swarm_plus_adversary" as const,
      },
    ].map((pair) => {
      const controlCount = stageCount.get(pair.controlStage) ?? 0;
      const treatmentCount = stageCount.get(pair.treatmentStage) ?? 0;
      const minArmSamples = Math.min(controlCount, treatmentCount);
      return {
        ...pair,
        controlCount,
        treatmentCount,
        minArmSamples,
        deficitToMin: Math.max(0, minimumSamplesPerArm - minArmSamples),
      };
    });

    return {
      generatedAt: Date.now(),
      windowDays,
      minimumSamplesPerArm,
      perStage,
      pairDepth,
      allStagesReady: perStage.every((row) => row.deficitToMin === 0),
    };
  }

  getSufficiencyTasks(windowDays = 30): Array<{
    id: string;
    title: string;
    blocker: string;
    action: string;
  }> {
    const snap = this.getSufficiencySnapshot(windowDays);
    return snap.blockingReasons.map((blocker) => ({
      id: `suff-${blocker}`,
      title: `Resolve sufficiency blocker: ${blocker}`,
      blocker,
      action: blocker.includes("asset")
        ? "Collect closed outcomes across more assets"
        : blocker.includes("regime")
          ? "Increase balanced sampling across regimes"
          : blocker.includes("time")
            ? "Increase time coverage before promotion"
            : "Increase closed-trade sample count",
    }));
  }
}
