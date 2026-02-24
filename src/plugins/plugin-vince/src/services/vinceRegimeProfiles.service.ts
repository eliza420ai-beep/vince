/**
 * VINCE Regime Profiles Service
 *
 * Five named strategy profiles auto-selected by market conditions.
 * Each profile defines parameter overrides for signal thresholds,
 * risk limits, TP/SL ratios, and position sizing multipliers.
 *
 * Profiles: TRENDING_BULL, CHOPPY, CAPITULATION, EUPHORIA, RECOVERY
 *
 * Selection uses Oracle regime + Echo sentiment + technical regime.
 * Per-profile performance is tracked so the genome (#23) can evolve
 * regime-specific parameter sets independently.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

// ==========================================
// Profile Types
// ==========================================

export type RegimeProfileName =
  | "TRENDING_BULL"
  | "CHOPPY"
  | "CAPITULATION"
  | "EUPHORIA"
  | "RECOVERY";

export interface RegimeProfileParams {
  minStrengthDelta: number;
  minConfidenceDelta: number;
  sizeMultiplier: number;
  tpMultiplier: number;
  slMultiplier: number;
  maxLeverageOverride: number | null;
  favorDirection: "long" | "short" | null;
  maxSimultaneousPositions: number;
  cooldownMultiplier: number;
}

export interface RegimeProfile {
  name: RegimeProfileName;
  description: string;
  params: RegimeProfileParams;
}

export interface RegimeSignals {
  oracleRegime: "risk-on" | "risk-off" | "uncertain";
  echoSentimentScore: number;
  echoSentimentLabel: "bullish" | "bearish" | "neutral";
  technicalRegime: "trending" | "ranging" | "neutral" | "volatile";
  dvol?: number | null;
}

interface ProfilePerformance {
  trades: number;
  wins: number;
  totalPnl: number;
  avgPnl: number;
  lastActive: number;
}

interface ProfileState {
  activeProfile: RegimeProfileName;
  activeSince: number;
  transitionCount: number;
  performance: Record<RegimeProfileName, ProfilePerformance>;
  history: Array<{
    from: RegimeProfileName;
    to: RegimeProfileName;
    timestamp: number;
    reason: string;
  }>;
}

// ==========================================
// Profile Definitions
// ==========================================

const PROFILES: Record<RegimeProfileName, RegimeProfile> = {
  TRENDING_BULL: {
    name: "TRENDING_BULL",
    description: "Full size, wider TP, favor longs",
    params: {
      minStrengthDelta: -5,
      minConfidenceDelta: -5,
      sizeMultiplier: 1.2,
      tpMultiplier: 1.3,
      slMultiplier: 1.1,
      maxLeverageOverride: null,
      favorDirection: "long",
      maxSimultaneousPositions: 5,
      cooldownMultiplier: 0.5,
    },
  },
  CHOPPY: {
    name: "CHOPPY",
    description: "Half size, tight TP, mean-reversion",
    params: {
      minStrengthDelta: 10,
      minConfidenceDelta: 10,
      sizeMultiplier: 0.5,
      tpMultiplier: 0.7,
      slMultiplier: 0.8,
      maxLeverageOverride: 3,
      favorDirection: null,
      maxSimultaneousPositions: 3,
      cooldownMultiplier: 2.0,
    },
  },
  CAPITULATION: {
    name: "CAPITULATION",
    description: "Pause longs, accumulation mode",
    params: {
      minStrengthDelta: 15,
      minConfidenceDelta: 15,
      sizeMultiplier: 0.3,
      tpMultiplier: 0.5,
      slMultiplier: 0.6,
      maxLeverageOverride: 2,
      favorDirection: "short",
      maxSimultaneousPositions: 2,
      cooldownMultiplier: 3.0,
    },
  },
  EUPHORIA: {
    name: "EUPHORIA",
    description: "Contrarian: reduce longs, prepare shorts",
    params: {
      minStrengthDelta: 5,
      minConfidenceDelta: 5,
      sizeMultiplier: 0.6,
      tpMultiplier: 0.8,
      slMultiplier: 0.7,
      maxLeverageOverride: 3,
      favorDirection: "short",
      maxSimultaneousPositions: 3,
      cooldownMultiplier: 1.5,
    },
  },
  RECOVERY: {
    name: "RECOVERY",
    description: "Gradual re-entry, conservative",
    params: {
      minStrengthDelta: 5,
      minConfidenceDelta: 5,
      sizeMultiplier: 0.7,
      tpMultiplier: 1.0,
      slMultiplier: 1.0,
      maxLeverageOverride: 4,
      favorDirection: "long",
      maxSimultaneousPositions: 4,
      cooldownMultiplier: 1.0,
    },
  },
};

const ALL_PROFILE_NAMES: RegimeProfileName[] = [
  "TRENDING_BULL",
  "CHOPPY",
  "CAPITULATION",
  "EUPHORIA",
  "RECOVERY",
];

const STATE_FILE = "regime-profiles.json";
const MAX_HISTORY = 200;

// ==========================================
// Service
// ==========================================

export class VinceRegimeProfilesService extends Service {
  static serviceType = "VINCE_REGIME_PROFILES_SERVICE";
  capabilityDescription =
    "Auto-selects trading strategy profiles based on market regime";

  private state: ProfileState;
  private statePath: string | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.state = this.defaultState();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceRegimeProfilesService> {
    const svc = new VinceRegimeProfilesService(runtime);
    await svc.load();
    logger.info(
      `[RegimeProfiles] Active: ${svc.state.activeProfile} (${svc.state.transitionCount} transitions)`,
    );
    return svc;
  }

  async stop(): Promise<void> {
    await this.save();
  }

  // ==========================================
  // Public API
  // ==========================================

  getActiveProfile(): RegimeProfile {
    return PROFILES[this.state.activeProfile];
  }

  getActiveProfileName(): RegimeProfileName {
    return this.state.activeProfile;
  }

  getActiveParams(): RegimeProfileParams {
    return { ...PROFILES[this.state.activeProfile].params };
  }

  /**
   * Evaluate market signals and switch profile if warranted.
   * Returns the (possibly new) active profile name.
   */
  async evaluate(signals: RegimeSignals): Promise<RegimeProfileName> {
    const candidate = this.classify(signals);
    if (candidate !== this.state.activeProfile) {
      const reason = this.buildReason(signals, candidate);
      this.transition(candidate, reason);
      await this.save();
    }
    return this.state.activeProfile;
  }

  /**
   * Record a closed trade's outcome for the active profile.
   */
  recordOutcome(pnl: number, won: boolean): void {
    const perf = this.state.performance[this.state.activeProfile];
    perf.trades++;
    if (won) perf.wins++;
    perf.totalPnl += pnl;
    perf.avgPnl = perf.trades > 0 ? perf.totalPnl / perf.trades : 0;
    perf.lastActive = Date.now();
  }

  getPerformance(): Record<RegimeProfileName, ProfilePerformance> {
    return { ...this.state.performance };
  }

  getTransitionCount(): number {
    return this.state.transitionCount;
  }

  getStateSnapshot(): ProfileState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // ==========================================
  // Classification
  // ==========================================

  private classify(s: RegimeSignals): RegimeProfileName {
    const { oracleRegime, echoSentimentScore, technicalRegime, dvol } = s;

    // CAPITULATION: risk-off + bearish sentiment + high vol
    if (
      oracleRegime === "risk-off" &&
      echoSentimentScore <= 3 &&
      (technicalRegime === "volatile" || (dvol != null && dvol > 80))
    ) {
      return "CAPITULATION";
    }

    // EUPHORIA: risk-on + extreme bullish + trending
    if (
      oracleRegime === "risk-on" &&
      echoSentimentScore >= 9 &&
      technicalRegime === "trending"
    ) {
      return "EUPHORIA";
    }

    // TRENDING_BULL: risk-on + bullish + trending
    if (
      oracleRegime === "risk-on" &&
      echoSentimentScore >= 6 &&
      (technicalRegime === "trending" || technicalRegime === "neutral")
    ) {
      return "TRENDING_BULL";
    }

    // CHOPPY: ranging or uncertain regime
    if (
      technicalRegime === "ranging" ||
      (oracleRegime === "uncertain" &&
        echoSentimentScore >= 4 &&
        echoSentimentScore <= 7)
    ) {
      return "CHOPPY";
    }

    // RECOVERY: risk-off improving (sentiment recovering from bearish)
    if (
      oracleRegime === "risk-off" &&
      echoSentimentScore >= 4 &&
      echoSentimentScore <= 6
    ) {
      return "RECOVERY";
    }

    // RECOVERY: coming out of volatile period with neutral sentiment
    if (
      technicalRegime === "volatile" &&
      echoSentimentScore >= 5 &&
      echoSentimentScore <= 7 &&
      oracleRegime !== "risk-off"
    ) {
      return "RECOVERY";
    }

    // Default: CHOPPY (conservative fallback)
    return "CHOPPY";
  }

  private buildReason(s: RegimeSignals, to: RegimeProfileName): string {
    return (
      `oracle=${s.oracleRegime} echo=${s.echoSentimentScore}/10(${s.echoSentimentLabel}) ` +
      `tech=${s.technicalRegime}${s.dvol != null ? ` dvol=${s.dvol}` : ""} → ${to}`
    );
  }

  private transition(to: RegimeProfileName, reason: string): void {
    const from = this.state.activeProfile;
    logger.info(`[RegimeProfiles] ${from} → ${to}: ${reason}`);

    this.state.history.push({
      from,
      to,
      timestamp: Date.now(),
      reason,
    });
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_HISTORY);
    }

    this.state.activeProfile = to;
    this.state.activeSince = Date.now();
    this.state.transitionCount++;
  }

  // ==========================================
  // Persistence
  // ==========================================

  private defaultState(): ProfileState {
    const emptyPerf = (): ProfilePerformance => ({
      trades: 0,
      wins: 0,
      totalPnl: 0,
      avgPnl: 0,
      lastActive: 0,
    });
    const performance = {} as Record<RegimeProfileName, ProfilePerformance>;
    for (const n of ALL_PROFILE_NAMES) performance[n] = emptyPerf();

    return {
      activeProfile: "CHOPPY",
      activeSince: Date.now(),
      transitionCount: 0,
      performance,
      history: [],
    };
  }

  private async load(): Promise<void> {
    try {
      const dir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.statePath = path.join(dir, STATE_FILE);

      if (fs.existsSync(this.statePath)) {
        const raw = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
        this.state = { ...this.defaultState(), ...raw };
        for (const n of ALL_PROFILE_NAMES) {
          if (!this.state.performance[n]) {
            this.state.performance[n] = {
              trades: 0,
              wins: 0,
              totalPnl: 0,
              avgPnl: 0,
              lastActive: 0,
            };
          }
        }
      }
    } catch (e) {
      logger.warn(`[RegimeProfiles] Load failed, using defaults: ${e}`);
    }
  }

  private async save(): Promise<void> {
    if (!this.statePath) return;
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (e) {
      logger.error(`[RegimeProfiles] Save failed: ${e}`);
    }
  }
}
