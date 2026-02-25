/**
 * VINCE Narrative Shelf-Life Decay (#68)
 *
 * Narratives lose signal value over time. Each narrative phase has a typical
 * shelf life; signals from stale narratives should be discounted.
 *
 * Exponential decay: multiplier = exp(-ln2 * hoursElapsed / halfLife)
 */

// ==========================================
// Types
// ==========================================

export interface NarrativeDecayConfig {
  narrativePhase: "inception" | "growth" | "peak" | "decline";
  halfLifeHours: number; // hours after which signal value halves
}

const DEFAULT_DECAY_CONFIG: NarrativeDecayConfig[] = [
  { narrativePhase: "inception", halfLifeHours: 72 }, // fresh narratives fade fast
  { narrativePhase: "growth", halfLifeHours: 168 }, // growth lasts ~1 week
  { narrativePhase: "peak", halfLifeHours: 24 }, // peaks are short-lived
  { narrativePhase: "decline", halfLifeHours: 48 }, // declines take a couple days
];

const DEFAULT_STALE_THRESHOLD = 0.2;

// ==========================================
// Service
// ==========================================

export class VinceNarrativeDecayService {
  private readonly config: Map<string, number>; // phase → halfLifeHours

  constructor(decayConfig?: NarrativeDecayConfig[]) {
    const cfg = decayConfig ?? DEFAULT_DECAY_CONFIG;
    this.config = new Map(cfg.map((c) => [c.narrativePhase, c.halfLifeHours]));
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Compute the decay multiplier for a narrative phase since transitionAt.
   * Returns a value between 0 and 1.
   * Uses exponential decay: exp(-ln2 * hoursElapsed / halfLife)
   */
  getDecayMultiplier(narrativePhase: string, transitionAt: string): number {
    const halfLife = this.getHalfLife(narrativePhase);
    if (halfLife <= 0) return 1;

    const transitionMs = new Date(transitionAt).getTime();
    if (Number.isNaN(transitionMs)) return 1;

    const hoursElapsed = (Date.now() - transitionMs) / (1000 * 60 * 60);
    if (hoursElapsed < 0) return 1; // future date = no decay

    const multiplier = Math.exp((-Math.LN2 * hoursElapsed) / halfLife);
    return Math.max(0, Math.min(1, multiplier));
  }

  /**
   * Apply decay to a confidence score.
   * Returns confidence * decayMultiplier, floored at confidence * 0.1.
   */
  applyDecayToConfidence(
    confidence: number,
    narrativePhase: string,
    transitionAt: string,
  ): number {
    const multiplier = this.getDecayMultiplier(narrativePhase, transitionAt);
    const decayed = confidence * multiplier;
    const floor = confidence * 0.1;
    return Math.max(floor, decayed);
  }

  /**
   * Returns true if the narrative is stale (decay < staleThreshold).
   * Default staleThreshold = 0.2 (configurable).
   */
  isNarrativeStale(
    narrativePhase: string,
    transitionAt: string,
    staleThresholdMultiplier = DEFAULT_STALE_THRESHOLD,
  ): boolean {
    const multiplier = this.getDecayMultiplier(narrativePhase, transitionAt);
    return multiplier < staleThresholdMultiplier;
  }

  getDecayConfig(): NarrativeDecayConfig[] {
    return Array.from(this.config.entries()).map(
      ([narrativePhase, halfLifeHours]) => ({
        narrativePhase: narrativePhase as NarrativeDecayConfig["narrativePhase"],
        halfLifeHours,
      }),
    );
  }

  // ==========================================
  // Private
  // ==========================================

  private getHalfLife(phase: string): number {
    return this.config.get(phase) ?? 72; // fallback to inception half-life
  }
}
