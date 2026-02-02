/**
 * VINCE Signal Similarity Service
 *
 * Uses embedding-based similarity to find historical trades with similar contexts.
 * This enables online learning without external ML training:
 *
 * 1. Generate embeddings for each trade context (signal sources + market conditions)
 * 2. When a new signal arrives, find K most similar historical trades
 * 3. Weight predictions by similarity: predicted_win_prob = Σ(similarity_i × outcome_i) / Σ(similarity_i)
 * 4. Use this to filter or boost signals
 *
 * Benefits:
 * - Leverages ElizaOS's existing embedding infrastructure
 * - No external training required
 * - Adapts to new patterns as they're observed
 * - Provides interpretable similar trade examples
 */

import { Service, type IAgentRuntime, ModelType, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { AggregatedSignal } from "./signalAggregator.service";

// ==========================================
// Types
// ==========================================

/**
 * A trade context for similarity matching
 */
interface TradeContext {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Asset traded */
  asset: string;
  /** Signal direction */
  direction: "long" | "short";
  /** Signal strength */
  strength: number;
  /** Signal confidence */
  confidence: number;
  /** Sources that contributed */
  sources: string[];
  /** Market regime */
  marketRegime: string;
  /** Funding rate bucket */
  fundingBucket: string;
  /** Session */
  session: string;
  /** Text representation for embedding */
  contextText: string;
  /** Pre-computed embedding */
  embedding?: number[];
  /** Trade outcome */
  outcome?: {
    profitable: boolean;
    pnlPct: number;
    exitReason: string;
  };
}

/**
 * Similar trade result
 */
interface SimilarTrade {
  context: TradeContext;
  similarity: number;
}

/**
 * Prediction from similar trades
 */
export interface SimilarityPrediction {
  /** Predicted win probability (0-1) */
  winProbability: number;
  /** Number of similar trades found */
  sampleCount: number;
  /** Average P&L of similar trades */
  avgPnlPct: number;
  /** Confidence in prediction (0-1) based on sample size and similarity */
  confidence: number;
  /** Top similar trades for reference */
  topSimilar: Array<{
    similarity: number;
    profitable: boolean;
    pnlPct: number;
    sources: string[];
    age: string;
  }>;
  /** Recommendation */
  recommendation: "proceed" | "caution" | "avoid";
  /** Reason for recommendation */
  reason: string;
}

// ==========================================
// Configuration
// ==========================================

const STATE_FILE_NAME = "signal-similarity-state.json";
const MAX_STORED_CONTEXTS = 500; // Keep last 500 trades
const MIN_SIMILARITY_THRESHOLD = 0.6; // Only consider trades with >60% similarity
const TOP_K_SIMILAR = 10; // Find top 10 most similar trades
const MIN_SAMPLES_FOR_PREDICTION = 3; // Need at least 3 similar trades

// ==========================================
// Signal Similarity Service
// ==========================================

export class VinceSignalSimilarityService extends Service {
  static serviceType = "VINCE_SIGNAL_SIMILARITY_SERVICE";
  capabilityDescription = "Finds similar historical trades using embeddings";

  private contexts: TradeContext[] = [];
  private statePath: string | null = null;
  private initialized = false;
  private embeddingDimension = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceSignalSimilarityService> {
    const service = new VinceSignalSimilarityService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }

      this.statePath = path.join(persistDir, STATE_FILE_NAME);

      // Load existing contexts
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
        this.contexts = data.contexts || [];
        logger.info(
          `[SignalSimilarity] Loaded ${this.contexts.length} historical trade contexts`
        );
      }

      this.initialized = true;
      logger.info("[SignalSimilarity] ✅ Embedding-based similarity initialized");
    } catch (error) {
      logger.error(`[SignalSimilarity] Initialization error: ${error}`);
    }
  }

  async stop(): Promise<void> {
    await this.saveState();
    logger.info("[SignalSimilarity] Stopped and state saved");
  }

  // ==========================================
  // Context Management
  // ==========================================

  /**
   * Build context text from signal for embedding
   */
  private buildContextText(params: {
    asset: string;
    signal: AggregatedSignal;
    marketRegime?: string;
    session?: string;
  }): string {
    const { asset, signal, marketRegime, session } = params;

    // Build a rich text representation of the trade context
    const parts: string[] = [
      `Asset: ${asset}`,
      `Direction: ${signal.direction}`,
      `Strength: ${signal.strength > 75 ? "strong" : signal.strength > 60 ? "moderate" : "weak"}`,
      `Confidence: ${signal.confidence > 70 ? "high" : signal.confidence > 55 ? "medium" : "low"}`,
      `Sources: ${signal.sources.join(", ")}`,
    ];

    if (marketRegime) {
      parts.push(`Market regime: ${marketRegime}`);
    }

    if (session) {
      parts.push(`Session: ${session}`);
    }

    // Add factor summary
    if (signal.factors && signal.factors.length > 0) {
      // Take top 3 factors
      const topFactors = signal.factors.slice(0, 3).map((f) => f.replace(/[^a-zA-Z0-9\s]/g, ""));
      parts.push(`Key factors: ${topFactors.join("; ")}`);
    }

    return parts.join(". ");
  }

  /**
   * Get embedding for text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.runtime.useModel(ModelType.TEXT_EMBEDDING, {
        text,
      });

      // Handle different embedding response formats
      if (Array.isArray(result)) {
        return result as number[];
      }
      if (result && typeof result === "object" && "embedding" in result) {
        return (result as { embedding: number[] }).embedding;
      }

      logger.debug("[SignalSimilarity] Could not extract embedding from result");
      return [];
    } catch (error) {
      logger.debug(`[SignalSimilarity] Embedding error: ${error}`);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // ==========================================
  // Recording Trades
  // ==========================================

  /**
   * Record a trade context (call when trade opens)
   */
  async recordTradeContext(params: {
    tradeId: string;
    asset: string;
    signal: AggregatedSignal;
    marketRegime?: string;
    session?: string;
  }): Promise<string> {
    const contextText = this.buildContextText(params);
    const embedding = await this.getEmbedding(contextText);

    // Determine funding bucket from signal factors
    let fundingBucket = "neutral";
    for (const factor of params.signal.factors || []) {
      if (factor.includes("longs paying") || factor.includes("long_paying")) {
        fundingBucket = "longs_paying";
        break;
      }
      if (factor.includes("shorts paying") || factor.includes("short_paying")) {
        fundingBucket = "shorts_paying";
        break;
      }
    }

    const context: TradeContext = {
      id: params.tradeId,
      timestamp: Date.now(),
      asset: params.asset,
      direction: params.signal.direction as "long" | "short",
      strength: params.signal.strength,
      confidence: params.signal.confidence,
      sources: params.signal.sources || [],
      marketRegime: params.marketRegime || "neutral",
      fundingBucket,
      session: params.session || "unknown",
      contextText,
      embedding: embedding.length > 0 ? embedding : undefined,
    };

    // Store embedding dimension for validation
    if (embedding.length > 0 && this.embeddingDimension === 0) {
      this.embeddingDimension = embedding.length;
    }

    this.contexts.push(context);

    // Trim to max size
    if (this.contexts.length > MAX_STORED_CONTEXTS) {
      this.contexts = this.contexts.slice(-MAX_STORED_CONTEXTS);
    }

    logger.debug(`[SignalSimilarity] Recorded context for ${params.asset} trade`);
    return context.id;
  }

  /**
   * Record trade outcome
   */
  async recordOutcome(params: {
    tradeId: string;
    profitable: boolean;
    pnlPct: number;
    exitReason: string;
  }): Promise<void> {
    const context = this.contexts.find((c) => c.id === params.tradeId);
    if (!context) {
      logger.debug(`[SignalSimilarity] Context not found for trade ${params.tradeId}`);
      return;
    }

    context.outcome = {
      profitable: params.profitable,
      pnlPct: params.pnlPct,
      exitReason: params.exitReason,
    };

    // Save periodically
    if (this.contexts.filter((c) => c.outcome).length % 10 === 0) {
      await this.saveState();
    }

    logger.debug(
      `[SignalSimilarity] Recorded outcome for ${context.asset}: ${params.profitable ? "WIN" : "LOSS"}`
    );
  }

  // ==========================================
  // Similarity Prediction
  // ==========================================

  /**
   * Find similar historical trades and predict outcome
   */
  async predict(params: {
    asset: string;
    signal: AggregatedSignal;
    marketRegime?: string;
    session?: string;
  }): Promise<SimilarityPrediction | null> {
    // Get contexts with outcomes for the same direction
    const completedContexts = this.contexts.filter(
      (c) =>
        c.outcome !== undefined &&
        c.direction === params.signal.direction &&
        c.embedding !== undefined
    );

    if (completedContexts.length < MIN_SAMPLES_FOR_PREDICTION) {
      logger.debug(
        `[SignalSimilarity] Not enough samples (${completedContexts.length}/${MIN_SAMPLES_FOR_PREDICTION})`
      );
      return null;
    }

    // Get embedding for current signal
    const contextText = this.buildContextText(params);
    const queryEmbedding = await this.getEmbedding(contextText);

    if (queryEmbedding.length === 0) {
      logger.debug("[SignalSimilarity] Could not generate query embedding");
      return null;
    }

    // Find similar trades
    const similarities: SimilarTrade[] = [];

    for (const context of completedContexts) {
      if (!context.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, context.embedding);

      if (similarity >= MIN_SIMILARITY_THRESHOLD) {
        similarities.push({ context, similarity });
      }
    }

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top K
    const topSimilar = similarities.slice(0, TOP_K_SIMILAR);

    if (topSimilar.length < MIN_SAMPLES_FOR_PREDICTION) {
      logger.debug(
        `[SignalSimilarity] Only ${topSimilar.length} similar trades found above threshold`
      );
      return null;
    }

    // Calculate weighted prediction
    let weightedWins = 0;
    let weightedPnl = 0;
    let totalWeight = 0;

    for (const { context, similarity } of topSimilar) {
      if (!context.outcome) continue;

      const weight = similarity;
      weightedWins += (context.outcome.profitable ? 1 : 0) * weight;
      weightedPnl += context.outcome.pnlPct * weight;
      totalWeight += weight;
    }

    const winProbability = totalWeight > 0 ? weightedWins / totalWeight : 0.5;
    const avgPnlPct = totalWeight > 0 ? weightedPnl / totalWeight : 0;

    // Calculate confidence based on sample size and similarity distribution
    const avgSimilarity =
      topSimilar.reduce((sum, t) => sum + t.similarity, 0) / topSimilar.length;
    const sampleConfidence = Math.min(1, topSimilar.length / TOP_K_SIMILAR);
    const confidence = avgSimilarity * sampleConfidence;

    // Format top similar for display
    const now = Date.now();
    const topSimilarDisplay = topSimilar.slice(0, 5).map(({ context, similarity }) => ({
      similarity: Math.round(similarity * 100) / 100,
      profitable: context.outcome!.profitable,
      pnlPct: Math.round(context.outcome!.pnlPct * 100) / 100,
      sources: context.sources.slice(0, 3),
      age: this.formatAge(now - context.timestamp),
    }));

    // Generate recommendation
    let recommendation: "proceed" | "caution" | "avoid";
    let reason: string;

    if (winProbability >= 0.6 && avgPnlPct > 0) {
      recommendation = "proceed";
      reason = `Similar trades have ${Math.round(winProbability * 100)}% win rate with avg +${avgPnlPct.toFixed(1)}% P&L`;
    } else if (winProbability >= 0.45 || confidence < 0.5) {
      recommendation = "caution";
      reason =
        confidence < 0.5
          ? "Low confidence - insufficient similar trades"
          : `Mixed results: ${Math.round(winProbability * 100)}% win rate`;
    } else {
      recommendation = "avoid";
      reason = `Similar trades show ${Math.round(winProbability * 100)}% win rate with avg ${avgPnlPct.toFixed(1)}% P&L`;
    }

    logger.debug(
      `[SignalSimilarity] Prediction: ${Math.round(winProbability * 100)}% win prob, ${topSimilar.length} similar trades`
    );

    return {
      winProbability,
      sampleCount: topSimilar.length,
      avgPnlPct,
      confidence,
      topSimilar: topSimilarDisplay,
      recommendation,
      reason,
    };
  }

  /**
   * Quick similarity check (lighter than full prediction)
   */
  async quickCheck(params: {
    asset: string;
    signal: AggregatedSignal;
  }): Promise<{ similarityScore: number; sampleCount: number } | null> {
    // Get contexts with outcomes
    const completedContexts = this.contexts.filter(
      (c) =>
        c.outcome !== undefined &&
        c.direction === params.signal.direction &&
        c.embedding !== undefined
    );

    if (completedContexts.length < MIN_SAMPLES_FOR_PREDICTION) {
      return null;
    }

    // Simple text-based similarity (faster than embedding)
    const sourceSet = new Set(params.signal.sources || []);
    let totalSimilarity = 0;
    let count = 0;

    for (const context of completedContexts) {
      // Jaccard similarity on sources
      const contextSet = new Set(context.sources);
      const intersection = new Set([...sourceSet].filter((x) => contextSet.has(x)));
      const union = new Set([...sourceSet, ...contextSet]);
      const jaccardSim = union.size > 0 ? intersection.size / union.size : 0;

      // Direction and strength match bonus
      const strengthDiff = Math.abs(params.signal.strength - context.strength) / 100;
      const strengthSim = 1 - strengthDiff;

      const similarity = (jaccardSim + strengthSim) / 2;

      if (similarity > 0.5) {
        totalSimilarity += similarity;
        count++;
      }
    }

    if (count === 0) {
      return null;
    }

    return {
      similarityScore: totalSimilarity / count,
      sampleCount: count,
    };
  }

  // ==========================================
  // Utilities
  // ==========================================

  private formatAge(ms: number): string {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(ms / (1000 * 60))}m ago`;
    if (hours < 24) return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalContexts: number;
    completedContexts: number;
    embeddingCoverage: number;
    winRate: number;
  } {
    const completed = this.contexts.filter((c) => c.outcome !== undefined);
    const withEmbedding = this.contexts.filter((c) => c.embedding !== undefined);
    const wins = completed.filter((c) => c.outcome!.profitable).length;

    return {
      totalContexts: this.contexts.length,
      completedContexts: completed.length,
      embeddingCoverage:
        this.contexts.length > 0 ? withEmbedding.length / this.contexts.length : 0,
      winRate: completed.length > 0 ? wins / completed.length : 0,
    };
  }

  // ==========================================
  // Persistence
  // ==========================================

  private async saveState(): Promise<void> {
    if (!this.statePath) return;

    try {
      // Don't save embeddings to reduce file size
      const contextsForSave = this.contexts.map((c) => ({
        ...c,
        embedding: undefined, // Will regenerate on next use
      }));

      fs.writeFileSync(
        this.statePath,
        JSON.stringify({ contexts: contextsForSave, version: "1.0.0" }, null, 2)
      );
      logger.debug("[SignalSimilarity] State saved");
    } catch (error) {
      logger.error(`[SignalSimilarity] Error saving state: ${error}`);
    }
  }

  /**
   * Regenerate embeddings for contexts that don't have them
   */
  async regenerateEmbeddings(): Promise<{ regenerated: number; failed: number }> {
    let regenerated = 0;
    let failed = 0;

    for (const context of this.contexts) {
      if (!context.embedding && context.contextText) {
        const embedding = await this.getEmbedding(context.contextText);
        if (embedding.length > 0) {
          context.embedding = embedding;
          regenerated++;
        } else {
          failed++;
        }
      }
    }

    await this.saveState();
    logger.info(
      `[SignalSimilarity] Regenerated ${regenerated} embeddings, ${failed} failed`
    );

    return { regenerated, failed };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

export default VinceSignalSimilarityService;
