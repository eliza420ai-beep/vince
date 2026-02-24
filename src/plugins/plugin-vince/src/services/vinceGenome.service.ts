/**
 * VINCE Strategy Genome Service
 *
 * Represents all tunable trading parameters as a JSON genome.
 * Weekly evolution cycle:
 * 1. Generate N mutations of current genome
 * 2. Replay each variant against feature store history
 * 3. Rank by composite fitness (Sharpe, win rate, drawdown)
 * 4. Promote top variant if it beats current by threshold
 * 5. Track generation history for transparency
 *
 * The genome includes per-regime overrides so each RegimeProfile
 * can evolve independently.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { RegimeProfileName } from "./vinceRegimeProfiles.service";
import type {
  VinceWarRoomService,
  WarRoomComparison,
} from "./vinceWarRoom.service";
import type { PredictionTrackerService } from "./predictionTracker.service";
import type { VinceDevilsAdvocateService } from "./vinceDevilsAdvocate.service";

// ==========================================
// Genome Types
// ==========================================

export interface GenomeParams {
  minStrength: number;
  minConfidence: number;
  minConfirmingSources: number;
  strongStrength: number;
  highConfidence: number;
  tpRatios: number[];
  slPct: number;
  sizeBasePct: number;
  maxLeverage: number;
  maxPositionSizePct: number;
  maxTotalExposurePct: number;
  cooldownAfterLossMs: number;
  sentimentBullishThreshold: number;
  sentimentBearishThreshold: number;
  maxSimultaneousPositions: number;
}

export interface Genome {
  id: string;
  generation: number;
  params: GenomeParams;
  regimeOverrides: Partial<Record<RegimeProfileName, Partial<GenomeParams>>>;
  parentId: string | null;
  mutationDescription: string;
  createdAt: number;
}

export interface ReplayResult {
  genomeId: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  avgHoldingMinutes: number;
  fitness: number;
}

export interface GenerationRecord {
  generation: number;
  timestamp: number;
  candidateCount: number;
  bestFitness: number;
  currentFitness: number;
  promoted: boolean;
  promotedGenomeId: string | null;
  promotionReason?: string;
  warRoom?: {
    enabled: boolean;
    pass: boolean;
    incumbentP05: number;
    candidateP05: number;
    rationale: string;
  };
  devilAdvocate?: {
    enabled: boolean;
    pass: boolean;
    robustnessScore: number;
    rationale: string;
  };
  topCandidates: Array<{
    genomeId: string;
    fitness: number;
    winRate: number;
    sharpe: number;
  }>;
}

interface GenomeState {
  currentGenome: Genome;
  generation: number;
  history: GenerationRecord[];
}

// ==========================================
// Constants
// ==========================================

const GENOME_FILE = "genome-state.json";
const HISTORY_FILE = "genome_history.jsonl";
const MUTATION_COUNT = 50;
const PROMOTION_THRESHOLD = 0.05;
const MIN_TRADES_FOR_EVAL = 10;
const MAX_GENERATIONS_HISTORY = 100;
const WAR_ROOM_RUNS = 1000;

const PARAM_BOUNDS: Record<keyof GenomeParams, [number, number]> = {
  minStrength: [20, 80],
  minConfidence: [20, 80],
  minConfirmingSources: [1, 6],
  strongStrength: [40, 80],
  highConfidence: [40, 80],
  tpRatios: [0.5, 8],
  slPct: [0.1, 5],
  sizeBasePct: [2, 25],
  maxLeverage: [1, 50],
  maxPositionSizePct: [5, 60],
  maxTotalExposurePct: [10, 80],
  cooldownAfterLossMs: [0, 120 * 60 * 1000],
  sentimentBullishThreshold: [5, 9],
  sentimentBearishThreshold: [1, 5],
  maxSimultaneousPositions: [1, 10],
};

const MUTATION_SCALE: Partial<Record<keyof GenomeParams, number>> = {
  minStrength: 5,
  minConfidence: 5,
  minConfirmingSources: 1,
  strongStrength: 5,
  highConfidence: 5,
  slPct: 0.3,
  sizeBasePct: 2,
  maxLeverage: 3,
  maxPositionSizePct: 5,
  maxTotalExposurePct: 5,
  cooldownAfterLossMs: 5 * 60 * 1000,
  sentimentBullishThreshold: 1,
  sentimentBearishThreshold: 1,
  maxSimultaneousPositions: 1,
};

// ==========================================
// Default Genome
// ==========================================

function defaultGenome(): Genome {
  return {
    id: "genesis",
    generation: 0,
    params: {
      minStrength: 40,
      minConfidence: 35,
      minConfirmingSources: 3,
      strongStrength: 55,
      highConfidence: 55,
      tpRatios: [1, 2, 3],
      slPct: 2,
      sizeBasePct: 10,
      maxLeverage: 40,
      maxPositionSizePct: 50,
      maxTotalExposurePct: 60,
      cooldownAfterLossMs: 0,
      sentimentBullishThreshold: 7,
      sentimentBearishThreshold: 4,
      maxSimultaneousPositions: 5,
    },
    regimeOverrides: {},
    parentId: null,
    mutationDescription: "Genesis genome from current paper bot defaults",
    createdAt: Date.now(),
  };
}

// ==========================================
// Service
// ==========================================

export class VinceGenomeService extends Service {
  static serviceType = "VINCE_GENOME_SERVICE";
  capabilityDescription =
    "Evolutionary optimization of trading parameters via mutation and replay";

  private state: GenomeState;
  private persistDir: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.persistDir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
    this.state = {
      currentGenome: defaultGenome(),
      generation: 0,
      history: [],
    };
  }

  static async start(runtime: IAgentRuntime): Promise<VinceGenomeService> {
    const svc = new VinceGenomeService(runtime);
    await svc.load();
    logger.info(
      `[Genome] Gen ${svc.state.generation}, genome: ${svc.state.currentGenome.id}`,
    );
    return svc;
  }

  async stop(): Promise<void> {
    await this.save();
  }

  // ==========================================
  // Public API
  // ==========================================

  getCurrentGenome(): Genome {
    return this.state.currentGenome;
  }

  getCurrentParams(): GenomeParams {
    return { ...this.state.currentGenome.params };
  }

  getParamsForRegime(regime: RegimeProfileName): GenomeParams {
    const base = { ...this.state.currentGenome.params };
    const overrides = this.state.currentGenome.regimeOverrides[regime];
    if (overrides) {
      return { ...base, ...overrides };
    }
    return base;
  }

  getGeneration(): number {
    return this.state.generation;
  }

  getHistory(): GenerationRecord[] {
    return [...this.state.history];
  }

  /**
   * Run one evolution cycle:
   * 1. Load feature store history
   * 2. Evaluate current genome
   * 3. Generate mutations
   * 4. Replay each
   * 5. Promote best if it beats current
   */
  async evolve(): Promise<GenerationRecord> {
    const nextGen = this.state.generation + 1;
    logger.info(`[Genome] Starting evolution cycle → Gen ${nextGen}`);

    const features = await this.loadFeatureHistory();
    if (features.length < MIN_TRADES_FOR_EVAL) {
      logger.warn(
        `[Genome] Only ${features.length} records (need ${MIN_TRADES_FOR_EVAL}), skipping evolution`,
      );
      return {
        generation: nextGen,
        timestamp: Date.now(),
        candidateCount: 0,
        bestFitness: 0,
        currentFitness: 0,
        promoted: false,
        promotedGenomeId: null,
        topCandidates: [],
      };
    }

    // Evaluate current genome
    const currentResult = this.replay(this.state.currentGenome, features);

    // Generate and evaluate mutations
    const candidates = this.generateMutations(
      this.state.currentGenome,
      MUTATION_COUNT,
      nextGen,
    );
    const results: Array<{ genome: Genome; result: ReplayResult }> = [];

    for (const candidate of candidates) {
      const result = this.replay(candidate, features);
      results.push({ genome: candidate, result });
    }

    // Rank by fitness
    results.sort((a, b) => b.result.fitness - a.result.fitness);
    const best = results[0];
    let warRoomComparison: WarRoomComparison | null = null;
    let devilComparison: {
      pass: boolean;
      robustnessScore: number;
      rationale: string;
    } | null = null;
    const warRoom = this.runtime.getService<VinceWarRoomService>(
      "VINCE_WAR_ROOM_SERVICE",
    );
    const devilsAdvocate = this.runtime.getService<VinceDevilsAdvocateService>(
      "VINCE_DEVILS_ADVOCATE_SERVICE",
    );
    if (best && warRoom) {
      warRoomComparison = warRoom.compareIncumbentVsCandidate(
        {
          minStrength: this.state.currentGenome.params.minStrength,
          minConfidence: this.state.currentGenome.params.minConfidence,
          minConfirmingSources:
            this.state.currentGenome.params.minConfirmingSources,
        },
        {
          minStrength: best.genome.params.minStrength,
          minConfidence: best.genome.params.minConfidence,
          minConfirmingSources: best.genome.params.minConfirmingSources,
        },
        features,
        WAR_ROOM_RUNS,
      );
    }
    if (best && devilsAdvocate) {
      devilComparison = devilsAdvocate.challengeGenome({
        candidateFitness: best.result.fitness,
        incumbentFitness: currentResult.fitness,
        candidateSharpe: best.result.sharpe,
        incumbentSharpe: currentResult.sharpe,
        candidateWinRate: best.result.winRate,
        incumbentWinRate: currentResult.winRate,
      });
    }

    const promoted =
      best &&
      best.result.fitness > currentResult.fitness * (1 + PROMOTION_THRESHOLD) &&
      best.result.totalTrades >= MIN_TRADES_FOR_EVAL &&
      (warRoomComparison ? warRoomComparison.pass : true) &&
      (devilComparison ? devilComparison.pass : true);

    if (promoted) {
      logger.info(
        `[Genome] Promoting ${best.genome.id} (fitness ${best.result.fitness.toFixed(3)} vs ${currentResult.fitness.toFixed(3)})`,
      );
      this.state.currentGenome = best.genome;
      const predictionTracker =
        this.runtime.getService<PredictionTrackerService>(
          "VINCE_PREDICTION_TRACKER_SERVICE",
        );
      if (predictionTracker) {
        await predictionTracker.registerPrediction({
          agent: "VINCE_GENOME",
          kind: "genome_promotion",
          direction: "up",
          confidenceProb: 0.7,
          horizonHours: 7 * 24,
          metadata: {
            promotedGenomeId: best.genome.id,
            baselineFitness: currentResult.fitness,
            candidateFitness: best.result.fitness,
          },
        });
      }
    } else {
      const warRoomReason = warRoomComparison
        ? `, war-room=${warRoomComparison.pass ? "pass" : "fail"} (${warRoomComparison.rationale})`
        : "";
      const devilReason = devilComparison
        ? `, devil=${devilComparison.pass ? "pass" : "fail"} (${devilComparison.rationale})`
        : "";
      logger.info(
        `[Genome] No promotion (best ${best?.result.fitness.toFixed(3) ?? 0} vs current ${currentResult.fitness.toFixed(3)}${warRoomReason}${devilReason})`,
      );
    }

    const promotionReason = promoted
      ? "fitness threshold met and antifragile gates passed"
      : warRoomComparison && !warRoomComparison.pass
        ? `war-room rejection: ${warRoomComparison.rationale}`
        : devilComparison && !devilComparison.pass
          ? `devil rejection: ${devilComparison.rationale}`
          : "fitness threshold not met";

    const record: GenerationRecord = {
      generation: nextGen,
      timestamp: Date.now(),
      candidateCount: candidates.length,
      bestFitness: best?.result.fitness ?? 0,
      currentFitness: currentResult.fitness,
      promoted,
      promotedGenomeId: promoted ? best.genome.id : null,
      promotionReason,
      ...(warRoomComparison
        ? {
            warRoom: {
              enabled: true,
              pass: warRoomComparison.pass,
              incumbentP05: warRoomComparison.incumbentP05,
              candidateP05: warRoomComparison.candidateP05,
              rationale: warRoomComparison.rationale,
            },
          }
        : {
            warRoom: {
              enabled: false,
              pass: true,
              incumbentP05: 0,
              candidateP05: 0,
              rationale: "war room service unavailable",
            },
          }),
      ...(devilComparison
        ? {
            devilAdvocate: {
              enabled: true,
              pass: devilComparison.pass,
              robustnessScore: devilComparison.robustnessScore,
              rationale: devilComparison.rationale,
            },
          }
        : {
            devilAdvocate: {
              enabled: false,
              pass: true,
              robustnessScore: 1,
              rationale: "devil advocate service unavailable",
            },
          }),
      topCandidates: results.slice(0, 5).map((r) => ({
        genomeId: r.genome.id,
        fitness: r.result.fitness,
        winRate: r.result.winRate,
        sharpe: r.result.sharpe,
      })),
    };

    this.state.generation = nextGen;
    this.state.history.push(record);
    if (this.state.history.length > MAX_GENERATIONS_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_GENERATIONS_HISTORY);
    }

    await this.save();
    await this.appendHistoryLine(record);

    return record;
  }

  // ==========================================
  // Mutation
  // ==========================================

  private generateMutations(
    parent: Genome,
    count: number,
    generation: number,
  ): Genome[] {
    const mutations: Genome[] = [];
    for (let i = 0; i < count; i++) {
      mutations.push(this.mutate(parent, generation, i));
    }
    return mutations;
  }

  private mutate(parent: Genome, generation: number, idx: number): Genome {
    const params = { ...parent.params };
    const changes: string[] = [];

    // Mutate 2-4 parameters randomly
    const keys = Object.keys(params).filter((k) => k !== "tpRatios") as Array<
      keyof Omit<GenomeParams, "tpRatios">
    >;
    const numMutations = 2 + Math.floor(Math.random() * 3);
    const selected = this.shuffle(keys).slice(0, numMutations);

    for (const key of selected) {
      const scale = MUTATION_SCALE[key] ?? 1;
      const [min, max] = PARAM_BOUNDS[key];
      const delta = (Math.random() * 2 - 1) * scale;
      const oldVal = params[key] as number;
      const newVal = Math.max(min, Math.min(max, oldVal + delta));
      (params as any)[key] = Math.round(newVal * 100) / 100;
      changes.push(`${key}: ${oldVal} → ${(params as any)[key]}`);
    }

    // Occasionally mutate TP ratios
    if (Math.random() < 0.3) {
      const tpIdx = Math.floor(Math.random() * params.tpRatios.length);
      const [tpMin, tpMax] = PARAM_BOUNDS.tpRatios;
      const oldTp = params.tpRatios[tpIdx];
      const newTp =
        Math.round(
          Math.max(
            tpMin,
            Math.min(tpMax, oldTp + (Math.random() * 2 - 1) * 0.5),
          ) * 10,
        ) / 10;
      params.tpRatios = [...params.tpRatios];
      params.tpRatios[tpIdx] = newTp;
      params.tpRatios.sort((a, b) => a - b);
      changes.push(`tpRatios[${tpIdx}]: ${oldTp} → ${newTp}`);
    }

    return {
      id: `gen${generation}-${idx}`,
      generation,
      params,
      regimeOverrides: { ...parent.regimeOverrides },
      parentId: parent.id,
      mutationDescription: changes.join("; "),
      createdAt: Date.now(),
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ==========================================
  // Replay
  // ==========================================

  private replay(genome: Genome, features: FeatureForReplay[]): ReplayResult {
    const p = genome.params;
    let trades = 0;
    let wins = 0;
    let totalPnlPct = 0;
    let totalDuration = 0;
    const pnlSeries: number[] = [];
    let peakEquity = 0;
    let maxDrawdown = 0;

    for (const f of features) {
      // Would this genome have taken the trade?
      const wouldTrade =
        f.strength >= p.minStrength &&
        f.confidence >= p.minConfidence &&
        f.sourceCount >= p.minConfirmingSources;

      if (!wouldTrade) continue;
      if (f.pnlPct == null) continue;

      trades++;
      const won = f.pnlPct > 0;
      if (won) wins++;
      totalPnlPct += f.pnlPct;
      totalDuration += f.holdingMinutes ?? 0;

      // Track drawdown
      pnlSeries.push(f.pnlPct);
      const cumulative = pnlSeries.reduce((s, v) => s + v, 0);
      peakEquity = Math.max(peakEquity, cumulative);
      maxDrawdown = Math.max(maxDrawdown, peakEquity - cumulative);
    }

    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    const avgPnl = trades > 0 ? totalPnlPct / trades : 0;
    const avgHolding = trades > 0 ? totalDuration / trades : 0;

    // Sharpe approximation: mean / std of per-trade returns
    const mean = avgPnl;
    const variance =
      trades > 1
        ? pnlSeries.reduce((s, v) => s + (v - mean) ** 2, 0) / (trades - 1)
        : 1;
    const std = Math.sqrt(variance) || 1;
    const sharpe = mean / std;

    // Composite fitness: weighted combination
    const fitness =
      sharpe * 0.4 +
      (winRate / 100) * 0.3 +
      Math.max(0, 1 - maxDrawdown / 20) * 0.2 +
      Math.min(1, trades / 50) * 0.1;

    return {
      genomeId: genome.id,
      totalTrades: trades,
      wins,
      losses: trades - wins,
      winRate,
      totalPnlPct,
      sharpe,
      maxDrawdownPct: maxDrawdown,
      avgHoldingMinutes: avgHolding,
      fitness,
    };
  }

  // ==========================================
  // Feature Loading
  // ==========================================

  private async loadFeatureHistory(): Promise<FeatureForReplay[]> {
    const records: FeatureForReplay[] = [];
    const dir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
    if (!fs.existsSync(dir)) return records;

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("features_") && f.endsWith(".jsonl"));

    for (const file of files) {
      try {
        const lines = fs
          .readFileSync(path.join(dir, file), "utf-8")
          .split("\n")
          .filter(Boolean);

        for (const line of lines) {
          try {
            const rec = JSON.parse(line);
            const strength = rec.signal?.strength ?? 0;
            const confidence = rec.signal?.confidence ?? 0;
            const sourceCount = rec.signal?.sourceCount ?? 0;
            const direction = rec.signal?.direction ?? "long";

            if (rec.outcome) {
              // Closed trade
              records.push({
                strength,
                confidence,
                sourceCount,
                direction,
                pnlPct: rec.outcome.realizedPnlPct ?? null,
                holdingMinutes: rec.outcome.holdingPeriodMinutes ?? null,
                avoided: false,
              });
            } else if (rec.avoided) {
              // Avoided trade — we can estimate directional PnL from price data
              // if we had the after-price, but for replay we mark as avoided
              records.push({
                strength,
                confidence,
                sourceCount,
                direction,
                pnlPct: null,
                holdingMinutes: null,
                avoided: true,
              });
            }
          } catch {
            // Skip malformed
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return records;
  }

  // ==========================================
  // Persistence
  // ==========================================

  private async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }
      const file = path.join(this.persistDir, GENOME_FILE);
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (raw.currentGenome) {
          this.state = {
            currentGenome: { ...defaultGenome(), ...raw.currentGenome },
            generation: raw.generation ?? 0,
            history: raw.history ?? [],
          };
        }
      }
    } catch (e) {
      logger.warn(`[Genome] Load failed, using defaults: ${e}`);
    }
  }

  private async save(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }
      const file = path.join(this.persistDir, GENOME_FILE);
      fs.writeFileSync(file, JSON.stringify(this.state, null, 2));
    } catch (e) {
      logger.error(`[Genome] Save failed: ${e}`);
    }
  }

  private async appendHistoryLine(record: GenerationRecord): Promise<void> {
    try {
      const file = path.join(this.persistDir, HISTORY_FILE);
      fs.appendFileSync(file, JSON.stringify(record) + "\n");
    } catch (e) {
      logger.warn(`[Genome] History append failed: ${e}`);
    }
  }
}

// ==========================================
// Internal Types
// ==========================================

interface FeatureForReplay {
  strength: number;
  confidence: number;
  sourceCount: number;
  direction: string;
  pnlPct: number | null;
  holdingMinutes: number | null;
  avoided: boolean;
}
