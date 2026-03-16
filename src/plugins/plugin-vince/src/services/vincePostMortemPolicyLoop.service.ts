import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import {
  PERSISTENCE_DIR,
  getAssetClassMaxLeverage,
} from "../constants/paperTradingDefaults";

type PtqgAssetClass = "crypto" | "equity" | "commodity" | "other";

interface PolicyOverlay {
  maxLeverageByAssetClass?: Partial<Record<PtqgAssetClass, number>>;
  stopToAtrMin?: number;
  maxSingleTradeUsd?: number;
  enforcePreTradeRiskCheck?: boolean;
}

interface CandidatePolicyState {
  id: string;
  policyVersion: string;
  createdAt: number;
  sourceFile: string;
  expiresAtUtc: string;
  overlay: PolicyOverlay;
  windowTrades: number;
  targetMetrics: {
    maxBudgetBreachRate?: number;
    minExpectancyUsd?: number;
    maxDrawdownPct?: number;
  };
  rollbackTriggers: string[];
  baseline?: {
    expectancyUsd: number;
    budgetBreachRate: number;
    sampleSize: number;
  };
  stats: {
    tradesObserved: number;
    sumPnlUsd: number;
    budgetBreaches: number;
  };
}

interface AppliedPolicyState {
  policyVersion: string;
  promotedAt: number;
  overlay: PolicyOverlay;
}

interface TradeOutcomeRow {
  ts: number;
  realizedPnlUsd: number;
  budgetBreach: boolean;
}

interface PolicyLoopState {
  version: number;
  lastProcessedPostMortemKey?: string;
  candidate?: CandidatePolicyState;
  applied?: AppliedPolicyState;
  tradeOutcomes: TradeOutcomeRow[];
  history: Array<{
    ts: number;
    event:
      | "candidate_created"
      | "candidate_promoted"
      | "candidate_rolled_back"
      | "delta_ignored";
    policyVersion?: string;
    reason?: string;
    sourceFile?: string;
  }>;
}

interface IngestedPostMortemRow {
  date?: string;
  file?: string;
  asset?: string;
  assetClass?: PtqgAssetClass;
  primaryCause?:
    | "thesis_invalid"
    | "regime_conflict"
    | "sizing_too_aggressive"
    | "stop_too_tight_for_vol"
    | "agent_lane_mismatch"
    | "missing_pretrade_data"
    | "execution_or_slippage"
    | "unknown_insufficient_evidence";
  adaptationEligible?: boolean;
  proposedPolicyDelta?: {
    confidence?: number;
    maxStepChangePct?: number;
    expiresAtUtc?: string;
    riskIntent?: {
      stopToAtrMin?: number;
      maxLeverageByAssetClass?: Partial<Record<PtqgAssetClass, number>>;
      maxSingleTradeUsd?: number;
      enforcePreTradeRiskCheck?: boolean;
    };
    validationPlan?: {
      windowTrades?: number;
      targetMetrics?: {
        maxBudgetBreachRate?: number;
        minExpectancyUsd?: number;
        maxDrawdownPct?: number;
      };
      rollbackTriggers?: string[];
    };
  } | null;
}

const ASSET_CLASSES: PtqgAssetClass[] = [
  "crypto",
  "equity",
  "commodity",
  "other",
];

export class VincePostMortemPolicyLoopService extends Service {
  static serviceType = "VINCE_POST_MORTEM_POLICY_LOOP_SERVICE";
  capabilityDescription =
    "Applies bounded recursive policy deltas from ingested post-mortems";

  private readonly postmortemsPath: string;
  private readonly statePath: string;
  private state: PolicyLoopState;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.postmortemsPath = path.join(
      process.cwd(),
      ".elizadb",
      PERSISTENCE_DIR,
      "postmortems",
      "postmortems.jsonl",
    );
    this.statePath = path.join(
      process.cwd(),
      ".elizadb",
      PERSISTENCE_DIR,
      "postmortems",
      "policy-loop-state.json",
    );
    this.state = this.loadState();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VincePostMortemPolicyLoopService> {
    return new VincePostMortemPolicyLoopService(runtime);
  }

  async stop(): Promise<void> {}

  getEffectiveOverlay(): PolicyOverlay {
    return this.state.candidate?.overlay ?? this.state.applied?.overlay ?? {};
  }

  getPolicyVersionTag(): string {
    if (this.state.candidate) return this.state.candidate.policyVersion;
    if (this.state.applied) return this.state.applied.policyVersion;
    return "baseline";
  }

  getStatus(): {
    hasCandidate: boolean;
    policyVersion: string;
    tradesObserved: number;
    windowTrades: number;
  } {
    const c = this.state.candidate;
    return {
      hasCandidate: !!c,
      policyVersion: this.getPolicyVersionTag(),
      tradesObserved: c?.stats.tradesObserved ?? 0,
      windowTrades: c?.windowTrades ?? 0,
    };
  }

  refreshFromPostMortems(): void {
    if (this.state.candidate) return;
    const rows = this.readPostMortemRows();
    if (rows.length === 0) return;
    const latest = rows[rows.length - 1];
    if (!latest.adaptationEligible || !latest.proposedPolicyDelta) return;
    const rowKey = `${latest.file ?? "unknown"}:${latest.date ?? "unknown"}`;
    if (rowKey === this.state.lastProcessedPostMortemKey) return;

    const overlay = this.buildBoundedOverlay(latest.proposedPolicyDelta);

    const recent = rows.slice(-10);
    const equitySizingCount = recent.filter(
      (r) =>
        r.assetClass === "equity" && r.primaryCause === "sizing_too_aggressive",
    ).length;
    const assetSizingCount = recent.filter(
      (r) =>
        r.asset &&
        latest.asset &&
        r.asset.toUpperCase() === latest.asset.toUpperCase() &&
        r.primaryCause === "sizing_too_aggressive",
    ).length;

    const needsExtraTightening =
      equitySizingCount >= 2 || assetSizingCount >= 2;

    if (needsExtraTightening) {
      const base = overlay.maxLeverageByAssetClass ?? {};
      const currentEquity =
        base.equity ?? getAssetClassMaxLeverage("equity", this.runtime);
      const tightenedEquity = Math.max(
        1,
        Number((currentEquity * 0.8).toFixed(2)),
      );
      overlay.maxLeverageByAssetClass = {
        ...base,
        equity: tightenedEquity,
      };
      const baseMax = overlay.maxSingleTradeUsd;
      if (typeof baseMax === "number" && Number.isFinite(baseMax)) {
        overlay.maxSingleTradeUsd = Math.round(Math.max(100, baseMax * 0.9));
      }
      const baseStop = overlay.stopToAtrMin ?? 0;
      if (baseStop > 0) {
        overlay.stopToAtrMin = Number(
          Math.max(baseStop, Math.min(3, baseStop * 1.1)).toFixed(2),
        );
      }
    }
    if (
      !overlay.maxLeverageByAssetClass &&
      overlay.stopToAtrMin === undefined &&
      overlay.maxSingleTradeUsd === undefined &&
      overlay.enforcePreTradeRiskCheck !== true
    ) {
      this.state.lastProcessedPostMortemKey = rowKey;
      this.state.history.push({
        ts: Date.now(),
        event: "delta_ignored",
        reason: "bounded_overlay_empty",
        sourceFile: latest.file,
      });
      this.saveState();
      return;
    }

    const validation = latest.proposedPolicyDelta.validationPlan ?? {};
    const windowTrades = Math.max(
      5,
      Math.min(50, validation.windowTrades ?? 20),
    );
    const baseline = this.computeBaseline(windowTrades);
    const id = `${Date.now()}`;
    const policyVersion = `pm-loop-${id}`;
    this.state.candidate = {
      id,
      policyVersion,
      createdAt: Date.now(),
      sourceFile: latest.file ?? "unknown",
      expiresAtUtc:
        latest.proposedPolicyDelta.expiresAtUtc ??
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      overlay,
      windowTrades,
      targetMetrics: validation.targetMetrics ?? {},
      rollbackTriggers: validation.rollbackTriggers ?? [],
      baseline,
      stats: {
        tradesObserved: 0,
        sumPnlUsd: 0,
        budgetBreaches: 0,
      },
    };
    this.state.lastProcessedPostMortemKey = rowKey;
    this.state.history.push({
      ts: Date.now(),
      event: "candidate_created",
      policyVersion,
      sourceFile: latest.file,
    });
    this.saveState();
    logger.info(
      `[VincePolicyLoop] Candidate ${policyVersion} created from ${latest.file ?? "postmortems.jsonl"}`,
    );
  }

  recordClosedTrade(outcome: {
    realizedPnlUsd: number;
    budgetBreach: boolean;
  }): void {
    this.state.tradeOutcomes.push({
      ts: Date.now(),
      realizedPnlUsd: outcome.realizedPnlUsd,
      budgetBreach: outcome.budgetBreach,
    });
    if (this.state.tradeOutcomes.length > 500) {
      this.state.tradeOutcomes = this.state.tradeOutcomes.slice(-500);
    }

    const c = this.state.candidate;
    if (c) {
      c.stats.tradesObserved += 1;
      c.stats.sumPnlUsd += outcome.realizedPnlUsd;
      if (outcome.budgetBreach) c.stats.budgetBreaches += 1;

      const expired = Date.now() > Date.parse(c.expiresAtUtc);
      if (c.stats.tradesObserved >= c.windowTrades || expired) {
        this.evaluateCandidate(expired ? "expired" : "window_complete");
      }
    }
    this.saveState();
  }

  private loadState(): PolicyLoopState {
    try {
      if (fs.existsSync(this.statePath)) {
        const parsed = JSON.parse(
          fs.readFileSync(this.statePath, "utf-8"),
        ) as PolicyLoopState;
        const tradeOutcomes = Array.isArray(parsed.tradeOutcomes)
          ? parsed.tradeOutcomes
          : [];
        const history = Array.isArray(parsed.history) ? parsed.history : [];
        return {
          version: Number.isFinite(parsed.version) ? parsed.version : 1,
          lastProcessedPostMortemKey: parsed.lastProcessedPostMortemKey,
          candidate: parsed.candidate,
          applied: parsed.applied,
          tradeOutcomes,
          history,
        };
      }
    } catch (e) {
      logger.debug(`[VincePolicyLoop] Failed to load state: ${e}`);
    }
    return { version: 1, tradeOutcomes: [], history: [] };
  }

  private saveState(): void {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(
        this.statePath,
        JSON.stringify(this.state, null, 2),
        "utf-8",
      );
    } catch (e) {
      logger.debug(`[VincePolicyLoop] Failed to save state: ${e}`);
    }
  }

  private readPostMortemRows(): IngestedPostMortemRow[] {
    try {
      if (!fs.existsSync(this.postmortemsPath)) return [];
      return fs
        .readFileSync(this.postmortemsPath, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as IngestedPostMortemRow)
        .filter((row) => !!row && typeof row === "object");
    } catch (e) {
      logger.debug(`[VincePolicyLoop] Failed to read post-mortems: ${e}`);
      return [];
    }
  }

  private buildBoundedOverlay(
    proposed: NonNullable<IngestedPostMortemRow["proposedPolicyDelta"]>,
  ): PolicyOverlay {
    const current = this.state.applied?.overlay ?? {};
    const maxStep =
      Math.max(1, Math.min(50, proposed.maxStepChangePct ?? 20)) / 100;
    const riskIntent = proposed.riskIntent ?? {};
    const next: PolicyOverlay = {};

    if (riskIntent.maxLeverageByAssetClass) {
      const mapped: Partial<Record<PtqgAssetClass, number>> = {};
      for (const cls of ASSET_CLASSES) {
        const requested = riskIntent.maxLeverageByAssetClass[cls];
        if (typeof requested !== "number" || !Number.isFinite(requested))
          continue;
        const base =
          current.maxLeverageByAssetClass?.[cls] ??
          getAssetClassMaxLeverage(cls, this.runtime);
        const lowerBound = base * (1 - maxStep);
        const bounded = Math.max(
          1,
          Math.min(base, Math.max(requested, lowerBound)),
        );
        mapped[cls] = Number(bounded.toFixed(2));
      }
      if (Object.keys(mapped).length > 0) next.maxLeverageByAssetClass = mapped;
    }

    if (
      typeof riskIntent.stopToAtrMin === "number" &&
      Number.isFinite(riskIntent.stopToAtrMin)
    ) {
      const currentStop = current.stopToAtrMin ?? 0;
      const maxIncrease =
        currentStop > 0 ? currentStop * (1 + maxStep) : riskIntent.stopToAtrMin;
      const bounded = Math.max(
        currentStop,
        Math.min(riskIntent.stopToAtrMin, maxIncrease),
      );
      next.stopToAtrMin = Number(
        Math.max(0.5, Math.min(3, bounded)).toFixed(2),
      );
    }

    if (
      typeof riskIntent.maxSingleTradeUsd === "number" &&
      Number.isFinite(riskIntent.maxSingleTradeUsd)
    ) {
      const base = current.maxSingleTradeUsd ?? riskIntent.maxSingleTradeUsd;
      const lowerBound = base * (1 - maxStep);
      const bounded = Math.max(
        100,
        Math.min(base, Math.max(riskIntent.maxSingleTradeUsd, lowerBound)),
      );
      next.maxSingleTradeUsd = Math.round(bounded);
    }

    if (riskIntent.enforcePreTradeRiskCheck === true) {
      next.enforcePreTradeRiskCheck = true;
    }
    return next;
  }

  private computeBaseline(
    windowTrades: number,
  ): CandidatePolicyState["baseline"] | undefined {
    const sample = this.state.tradeOutcomes.slice(-Math.max(10, windowTrades));
    if (sample.length < 10) return undefined;
    const sum = sample.reduce((acc, r) => acc + r.realizedPnlUsd, 0);
    const breaches = sample.filter((r) => r.budgetBreach).length;
    return {
      expectancyUsd: Number((sum / sample.length).toFixed(2)),
      budgetBreachRate: Number((breaches / sample.length).toFixed(3)),
      sampleSize: sample.length,
    };
  }

  private computeMaxDrawdownPct(rows: TradeOutcomeRow[]): number {
    if (rows.length === 0) return 0;
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    for (const row of rows) {
      equity += row.realizedPnlUsd;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    if (peak <= 0) return 0;
    return Number(((maxDrawdown / peak) * 100).toFixed(2));
  }

  private evaluateCandidate(trigger: "window_complete" | "expired"): void {
    const c = this.state.candidate;
    if (!c || c.stats.tradesObserved === 0) return;

    const expectancy = c.stats.sumPnlUsd / c.stats.tradesObserved;
    const breachRate = c.stats.budgetBreaches / c.stats.tradesObserved;
    const candidateOutcomes = this.state.tradeOutcomes.slice(
      -c.stats.tradesObserved,
    );
    const drawdownPct = this.computeMaxDrawdownPct(candidateOutcomes);
    const reasons: string[] = [];

    if (c.baseline && breachRate > c.baseline.budgetBreachRate + 0.02) {
      reasons.push("budget_breach_rate_worse_than_baseline");
    }
    if (c.baseline && expectancy < c.baseline.expectancyUsd - 2) {
      reasons.push("expectancy_usd_degrades");
    }
    if (
      typeof c.targetMetrics.maxBudgetBreachRate === "number" &&
      breachRate > c.targetMetrics.maxBudgetBreachRate
    ) {
      reasons.push("budget_breach_rate_above_target");
    }
    if (
      typeof c.targetMetrics.minExpectancyUsd === "number" &&
      expectancy < c.targetMetrics.minExpectancyUsd
    ) {
      reasons.push("expectancy_below_target");
    }
    const maxDdCap = c.targetMetrics.maxDrawdownPct ?? 15;
    if (drawdownPct > maxDdCap) {
      reasons.push("drawdown_pct_exceeds_cap");
    }

    if (reasons.length === 0) {
      this.state.applied = {
        policyVersion: c.policyVersion,
        promotedAt: Date.now(),
        overlay: c.overlay,
      };
      this.state.history.push({
        ts: Date.now(),
        event: "candidate_promoted",
        policyVersion: c.policyVersion,
        reason: `trigger=${trigger}`,
        sourceFile: c.sourceFile,
      });
      logger.info(
        `[VincePolicyLoop] Promoted ${c.policyVersion} (expectancy=${expectancy.toFixed(2)}, breachRate=${(breachRate * 100).toFixed(1)}%)`,
      );
    } else {
      this.state.history.push({
        ts: Date.now(),
        event: "candidate_rolled_back",
        policyVersion: c.policyVersion,
        reason: reasons.join(","),
        sourceFile: c.sourceFile,
      });
      logger.info(
        `[VincePolicyLoop] Rolled back ${c.policyVersion}: ${reasons.join(", ")}`,
      );
    }
    delete this.state.candidate;
  }
}
