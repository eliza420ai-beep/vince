/**
 * VINCE DexScreener Service
 *
 * MOLT-tier AI meme scanner for SOLANA and BASE:
 * - Focuses on AI-related memes with $1M-$20M market cap
 * - Sweet spot: $1.5M-$5M mcap with 3x+ vol/liq ratio
 * - Traction analysis (volume/liquidity ratio)
 * - Lifecycle stage analysis (PVP, retracement, established)
 * - Entry guidance with actionable recommendations
 * - Holder analysis estimation
 * - APE / WATCH / AVOID verdicts with bull/bear cases
 * - Viral potential detection for 5-10x plays
 *
 * Uses DexScreener API (FREE)
 * Solana: token-boosts/top/v1. Base: token-boosts, community-takeovers, ads (best-effort; Solana unaffected if Base fails).
 * Includes circuit breaker and retry logic for resilience
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { MemeToken, TractionVerdict } from "../types/index";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import {
  SERVICE_CONFIG,
  CACHE_TTLS,
  TRACTION_THRESHOLDS,
  AI_MEME_CRITERIA,
  BASE_PRIORITY_PAIR_IDS,
  type LifecycleStage,
  type EntryAction,
  type MarketMood,
  getTractionLevel,
  getRiskLevel,
  getMomentumSignal,
  formatVolume,
  buildGmgnUrl,
  buildDexScreenerUrl,
  buildBirdeyeUrl,
  isSolanaAddress,
  determineMarketMood,
} from "../constants/memes.constants";
import { isVinceAgent } from "../utils/dashboard";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
// Dashboard "hot" tokens: only show tokens up at least this much (avoid showing -90% dumpers as "hot")
const MIN_HOT_PRICE_CHANGE_PCT = 21;

// AI-related keywords for detecting AI memes (MOLT-tier plays)
const AI_KEYWORDS = [
  // Core AI terms
  "ai",
  "artificial",
  "intelligence",
  "machine",
  "learning",
  // LLM providers/models
  "claude",
  "anthropic",
  "gpt",
  "openai",
  "llm",
  "gemini",
  "mistral",
  "llama",
  // AI agent ecosystem
  "agent",
  "eliza",
  "elizaos",
  "autonomous",
  "sentient",
  "agi",
  // Specific viral AI memes
  "molt",
  "neural",
  "brain",
  "cognitive",
  "deepmind",
  "chatbot",
  // AI narrative tokens
  "virtuals",
  "terminal",
  "swarm",
  "truth",
  "zerebro",
  "goat",
  // Additional AI-related terms
  "robot",
  "bot",
  "automate",
  "inference",
  "tensor",
  "model",
  // AI agents / research (e.g. ConwayResearch, OpenClaw)
  "conway",
  "openclaw",
  "claw",
];

// ============================================
// Extended Types for Deep Analysis
// ============================================

export interface HolderAnalysis {
  top10Pct: number;
  top1Pct: number;
  holderCount: number;
  isHealthy: boolean;
  warnings: string[];
}

export interface EntryGuidance {
  stage: LifecycleStage;
  stageReason: string;
  timing: "enter" | "wait" | "avoid";
  rationale: string;
  suggestedAction: EntryAction;
  expectedRetracement?: string;
}

export interface TokenVerdict {
  bullCase: string;
  bearCase: string;
  recommendation: "ape" | "watch" | "avoid";
  confidence: "high" | "medium" | "low";
}

export interface TokenDeepDive extends Omit<MemeToken, "verdict"> {
  lifecycleStage: LifecycleStage;
  hoursOld: number;
  retracementFromAth?: number;
  holderAnalysis: HolderAnalysis;
  entryGuidance: EntryGuidance;
  verdict: TokenVerdict;
  tractionLevel: string;
  riskLevel: string;
  momentumSignal: string;
  gmgnUrl?: string;
  dexscreenerUrl?: string;
  birdeyeUrl?: string;
}

export class VinceDexScreenerService extends Service {
  static serviceType = "VINCE_DEXSCREENER_SERVICE";
  capabilityDescription =
    "DexScreener meme scanner: traction analysis, lifecycle stages, entry guidance, APE/WATCH/AVOID verdicts";

  private tokenCache: Map<string, MemeToken> = new Map();
  /** Combined for backward compat (getMarketMood, getTrendingTokens, etc.) */
  private trendingTokens: MemeToken[] = [];
  private trendingTokensSolana: MemeToken[] = [];
  private trendingTokensBase: MemeToken[] = [];
  private lastUpdate = 0;

  // Circuit breaker state
  private consecutiveErrors = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;

  // Stats tracking
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    lastRequestTime: 0,
  };

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceDexScreenerService> {
    const service = new VinceDexScreenerService(runtime);
    try {
      await service.initialize();
    } catch (error) {
      logger.warn(
        `[VinceDexScreener] Initialization error (service still available): ${error}`,
      );
    }
    logger.info("[VinceDexScreener] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceDexScreener] Service stopped");
  }

  private async initialize(): Promise<void> {
    logger.debug("[VinceDexScreener] Service initialized (FREE API)");
    await this.refreshData();
    if (isVinceAgent(this.runtime)) this.printDexScreenerDashboard();
  }

  // ============================================
  // Dashboard Formatting
  // ============================================

  /**
   * Format number with K/M/B suffix
   */
  private formatVolume(num: number): string {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  }

  /**
   * Format change percentage with sign
   */
  private formatChange(change: number): string {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  }

  /**
   * Print Solana meme scanner dashboard only (Base abandoned).
   */
  private printDexScreenerDashboard(): void {
    this.printChainBox("SOLANA", this.trendingTokensSolana);
    const { mood, summary } = this.getMarketMood();
    const moodEmoji =
      mood === "pumping"
        ? "🚀"
        : mood === "dumping"
          ? "💀"
          : mood === "choppy"
            ? "🌊"
            : "😴";
    startBox();
    logLine(`${moodEmoji} MEME MOOD: ${summary}`);
    endBox();
    logger.info(
      `[VinceDexScreener] ✅ Dashboard loaded: SOL ${this.trendingTokensSolana.length} tokens`,
    );
  }

  private printChainBox(chainLabel: string, tokens: MemeToken[]): void {
    startBox();
    logLine(`🔍 DEXSCREENER ${chainLabel} MEME SCANNER`);
    logEmpty();
    sep();
    logEmpty();
    logLine(`📊 ${chainLabel}: ${tokens.length} tokens`);
    logEmpty();
    sep();
    logEmpty();
    logLine("🔥 HOT (by traction, up ≥21%)");
    const hot = tokens
      .filter((t) => t.priceChange24h >= MIN_HOT_PRICE_CHANGE_PCT)
      .slice(0, 3);
    if (hot.length === 0) {
      logLine("   (none up ≥21% right now - or data loading)");
    } else {
      for (const token of hot) {
        const verdictEmoji =
          token.verdict === "APE"
            ? "🦍"
            : token.verdict === "WATCH"
              ? "👀"
              : "⛔";
        const changeEmoji = token.priceChange24h >= 0 ? "🟢" : "🔴";
        const symbol = token.symbol.substring(0, 8);
        const volLiq = `V/L: ${token.volumeLiquidityRatio.toFixed(1)}x`;
        const mcap = token.marketCap
          ? this.formatVolume(token.marketCap)
          : "N/A";
        logLine(
          `   ${changeEmoji} ${symbol.padEnd(8)} │ ${volLiq} │ ${this.formatChange(token.priceChange24h)} │ ${mcap} ${verdictEmoji}`,
        );
      }
    }
    logEmpty();
    sep();
    logEmpty();
    const apeTokens = tokens.filter((t) => t.verdict === "APE");
    logLine("🦍 APE CANDIDATES");
    if (apeTokens.length === 0) {
      logLine("   (none)");
    } else {
      for (const token of apeTokens.slice(0, 3)) {
        const symbol = token.symbol.substring(0, 8);
        logLine(
          `   🔥 ${symbol} │ Liq: ${this.formatVolume(token.liquidity)} │ Vol: ${this.formatVolume(token.volume24h)} │ ${this.formatChange(token.priceChange24h)}`,
        );
      }
    }
    logEmpty();
    endBox();
  }

  // ============================================
  // Circuit Breaker Methods
  // ============================================

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;

    // Check if enough time has passed to try again
    if (Date.now() - this.circuitOpenedAt > SERVICE_CONFIG.CIRCUIT_RESET_MS) {
      logger.info(
        "[VinceDexScreener] Circuit breaker half-open, attempting request",
      );
      return false;
    }

    return true;
  }

  private recordSuccess(): void {
    if (this.circuitOpen) {
      logger.info(
        "[VinceDexScreener] Circuit breaker closed after successful request",
      );
    }
    this.consecutiveErrors = 0;
    this.circuitOpen = false;
  }

  private recordFailure(): void {
    this.consecutiveErrors++;
    this.stats.errors++;

    if (
      this.consecutiveErrors >= SERVICE_CONFIG.CIRCUIT_THRESHOLD &&
      !this.circuitOpen
    ) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      logger.warn(
        `[VinceDexScreener] Circuit breaker OPEN - ${this.consecutiveErrors} consecutive errors`,
      );
    }
  }

  // ============================================
  // Retry Logic with Exponential Backoff
  // ============================================

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < SERVICE_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const result = await operation();
        this.recordSuccess();
        return result;
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error (429)
        if (error.status === 429 || error.message?.includes("429")) {
          const retryAfter = 60;
          logger.warn(
            `[VinceDexScreener] Rate limited on ${operationName}, waiting ${retryAfter}s (attempt ${attempt + 1}/${SERVICE_CONFIG.MAX_RETRIES})`,
          );
          await this.delay(retryAfter * 1000);
          continue;
        }

        // Check if it's a retriable error (network, 5xx)
        const isRetriable = this.isRetriableError(error);

        if (!isRetriable) {
          logger.error(
            `[VinceDexScreener] Non-retriable error in ${operationName}: ${error.message}`,
          );
          throw error;
        }

        // Calculate exponential backoff with jitter
        const delay = Math.min(
          SERVICE_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt) +
            Math.random() * 1000,
          SERVICE_CONFIG.MAX_RETRY_DELAY_MS,
        );

        logger.warn(
          `[VinceDexScreener] Retriable error in ${operationName}, retrying in ${delay}ms (attempt ${attempt + 1}/${SERVICE_CONFIG.MAX_RETRIES})`,
        );
        await this.delay(delay);
      }
    }

    // All retries exhausted
    this.recordFailure();
    throw (
      lastError ||
      new Error(
        `${operationName} failed after ${SERVICE_CONFIG.MAX_RETRIES} retries`,
      )
    );
  }

  private isRetriableError(error: any): boolean {
    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND"
    ) {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    if (error.code === "ECONNABORTED") {
      return true;
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Supported chains for meme scanning
  private static readonly SUPPORTED_CHAINS = [
    "solana",
    "base",
    "hyperliquid",
  ] as const;

  async refreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < CACHE_TTL_MS) {
      return;
    }

    try {
      this.tokenCache.clear();
      this.trendingTokensSolana = [];
      this.trendingTokensBase = [];
      await this.fetchTrendingSolana();
      try {
        await this.fetchTrendingBase();
      } catch (e) {
        logger.debug(`[VinceDexScreener] Base fetch skipped: ${e}`);
      }
      this.mergeTrendingLists();
      this.lastUpdate = now;
    } catch (error) {
      logger.debug(`[VinceDexScreener] Refresh error: ${error}`);
    }
  }

  /** Merge chain-specific lists into combined trendingTokens for getMarketMood / public API */
  private mergeTrendingLists(): void {
    this.trendingTokens = [
      ...this.trendingTokensSolana,
      ...this.trendingTokensBase,
    ]
      .sort((a, b) => b.volumeLiquidityRatio - a.volumeLiquidityRatio)
      .slice(0, 30);
  }

  /**
   * Solana: token-boosts/top/v1, keep only chainId === "solana".
   */
  private async fetchTrendingSolana(): Promise<void> {
    try {
      const res = await fetch(
        "https://api.dexscreener.com/token-boosts/top/v1",
      );
      if (!res.ok) {
        logger.debug(`[VinceDexScreener] Solana API error: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const solanaOnly = data.filter(
        (t: { chainId?: string }) => (t.chainId as string) === "solana",
      );
      for (const token of solanaOnly) {
        await this.processToken(token, "solana");
      }
      this.trendingTokensSolana = this.getChainListFromCache("solana");
      logger.debug(
        `[VinceDexScreener] Solana: ${solanaOnly.length} from boosts → ${this.trendingTokensSolana.length} processed`,
      );
    } catch (error) {
      logger.debug(`[VinceDexScreener] Solana fetch error: ${error}`);
    }
  }

  /**
   * Base: three free DexScreener feeds (no GeckoTerminal — CoinGecko owns it, no free API).
   * 1) token-boosts/top/v1 — filter chainId === "base"
   * 2) community-takeovers/latest/v1 — filter base
   * 3) ads/latest/v1 — filter base (promoted tokens)
   */
  private async fetchTrendingBase(): Promise<void> {
    const feeds: [string, string][] = [
      ["https://api.dexscreener.com/token-boosts/top/v1", "boosts"],
      [
        "https://api.dexscreener.com/community-takeovers/latest/v1",
        "takeovers",
      ],
      ["https://api.dexscreener.com/ads/latest/v1", "ads"],
    ];
    try {
      for (const [url, label] of feeds) {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;
        const baseOnly = data.filter(
          (t: { chainId?: string }) => (t.chainId as string) === "base",
        );
        for (const token of baseOnly) {
          await this.processToken(token, "base");
        }
        logger.debug(
          `[VinceDexScreener] Base ${label}: ${baseOnly.length} tokens`,
        );
      }
      // Always include priority BASE pairs (AI memes we don't want to miss, e.g. CONWAY)
      for (const pairId of BASE_PRIORITY_PAIR_IDS) {
        try {
          const res = await fetch(
            `https://api.dexscreener.com/latest/dex/pairs/base/${pairId}`,
          );
          if (!res.ok) continue;
          const data = (await res.json()) as { pairs?: Array<{ baseToken?: { address?: string } }> };
          const pair = data.pairs?.[0];
          const tokenAddress = pair?.baseToken?.address;
          if (tokenAddress) {
            await this.processToken({ tokenAddress }, "base");
          }
        } catch (e) {
          logger.debug(`[VinceDexScreener] Base priority pair ${pairId.slice(0, 10)}…: ${e}`);
        }
      }

      this.trendingTokensBase = this.getChainListFromCache("base");
      logger.debug(
        `[VinceDexScreener] Base: ${this.trendingTokensBase.length} processed (cache deduped)`,
      );
    } catch (error) {
      logger.debug(`[VinceDexScreener] Base fetch error: ${error}`);
    }
  }

  private getChainListFromCache(chain: "solana" | "base"): MemeToken[] {
    return Array.from(this.tokenCache.values())
      .filter((t) => t.chain === chain)
      .sort((a, b) => b.volumeLiquidityRatio - a.volumeLiquidityRatio)
      .slice(0, 20);
  }

  private async processToken(
    tokenData: any,
    chain: "solana" | "base",
  ): Promise<void> {
    try {
      // Fetch detailed pair info
      const address = tokenData.tokenAddress;
      const pairRes = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      );

      if (!pairRes.ok) return;

      const pairData = await pairRes.json();
      const pair = pairData.pairs?.[0];
      if (!pair) return;

      const volume24h = parseFloat(pair.volume?.h24) || 0;
      const liquidity = parseFloat(pair.liquidity?.usd) || 1;
      const volumeLiquidityRatio = volume24h / liquidity;
      const priceChange24h = parseFloat(pair.priceChange?.h24) || 0;

      // Extract market cap data
      const marketCap = pair.marketCap || pair.fdv || 0;
      const fdv = pair.fdv || 0;

      // Check if AI-related
      const name = (pair.baseToken?.name || "").toLowerCase();
      const symbol = (pair.baseToken?.symbol || "").toLowerCase();
      const isAiRelated = AI_KEYWORDS.some(
        (kw) => name.includes(kw) || symbol.includes(kw),
      );

      // For AI tokens, filter by market cap criteria (MOLT-tier plays)
      if (isAiRelated && marketCap > 0) {
        if (
          marketCap < AI_MEME_CRITERIA.MIN_MCAP ||
          marketCap > AI_MEME_CRITERIA.MAX_MCAP
        ) {
          // Skip AI tokens outside $1M-$20M range
          return;
        }
        if (liquidity < AI_MEME_CRITERIA.MIN_LIQUIDITY) {
          // Skip AI tokens with insufficient liquidity
          return;
        }
      }

      // Determine if token has viral potential (MOLT-tier)
      const hasViralPotential =
        isAiRelated &&
        marketCap >= AI_MEME_CRITERIA.SWEET_SPOT_MIN &&
        marketCap <= AI_MEME_CRITERIA.SWEET_SPOT_MAX &&
        volumeLiquidityRatio >= AI_MEME_CRITERIA.MIN_VOL_LIQ_RATIO &&
        liquidity >= AI_MEME_CRITERIA.MIN_LIQUIDITY;

      // Determine market cap tier
      const mcapTier = this.getMcapTier(marketCap);

      // Determine verdict based on traction
      const verdict = this.calculateVerdict(
        volumeLiquidityRatio,
        liquidity,
        priceChange24h,
      );

      const memeToken: MemeToken = {
        address,
        symbol: pair.baseToken?.symbol || "UNKNOWN",
        name: pair.baseToken?.name || "Unknown Token",
        chain,
        price: parseFloat(pair.priceUsd) || 0,
        priceChange24h,
        volume24h,
        liquidity,
        volumeLiquidityRatio,
        verdict,
        isAiRelated,
        timestamp: Date.now(),
        marketCap,
        fdv,
        mcapTier,
        hasViralPotential,
      };

      this.tokenCache.set(address, memeToken);
    } catch (error) {
      logger.debug(`[VinceDexScreener] Token processing error: ${error}`);
    }
  }

  private getMcapTier(marketCap: number): "micro" | "small" | "mid" | "large" {
    if (marketCap < 1_000_000) return "micro";
    if (marketCap < 10_000_000) return "small";
    if (marketCap < 100_000_000) return "mid";
    return "large";
  }

  private calculateVerdict(
    volLiqRatio: number,
    liquidity: number,
    priceChange: number,
  ): TractionVerdict {
    // APE: High traction, good liquidity, positive momentum
    if (volLiqRatio >= 3 && liquidity >= 50000 && priceChange > 0) {
      return "APE";
    }

    // AVOID: Low traction, low liquidity, or negative momentum
    if (volLiqRatio < 0.5 || liquidity < 10000 || priceChange < -30) {
      return "AVOID";
    }

    // WATCH: Everything else
    return "WATCH";
  }

  private updateTrendingList(): void {
    this.trendingTokensSolana = this.getChainListFromCache("solana");
    this.trendingTokensBase = this.getChainListFromCache("base");
    this.mergeTrendingLists();
  }

  // ============================================
  // Lifecycle Stage Analysis (GMGN Framework)
  // ============================================

  /**
   * Determine lifecycle stage based on GMGN framework
   * Stage 1: Internal (pump.fun) - not applicable for DexScreener data
   * Stage 2: PVP Phase (0-48h after migration, volatile)
   * Stage 3: Retracement Zone (50-80% down from ATH)
   * Stage 4: Established (survived retracement, stable)
   */
  determineLifecycleStage(
    hoursOld: number,
    change24h: number,
    fromAth: number | undefined,
    volLiqRatio: number,
  ): { stage: LifecycleStage; reason: string } {
    // Very new token with high gains = PVP phase
    if (hoursOld < TRACTION_THRESHOLDS.PVP_MAX_HOURS && change24h > 100) {
      return {
        stage: "pvp",
        reason: `Only ${hoursOld.toFixed(0)}h old with ${change24h.toFixed(0)}% gain - active PVP`,
      };
    }

    // New-ish with high vol/liq = still PVP
    if (
      hoursOld < 72 &&
      volLiqRatio > TRACTION_THRESHOLDS.PVP_VOL_LIQ_THRESHOLD
    ) {
      return {
        stage: "pvp",
        reason: `Vol/Liq ratio ${volLiqRatio.toFixed(1)}x indicates active PVP trading`,
      };
    }

    // Significant retracement from ATH
    if (
      fromAth !== undefined &&
      fromAth < TRACTION_THRESHOLDS.RETRACEMENT_THRESHOLD
    ) {
      if (fromAth < TRACTION_THRESHOLDS.DEEP_RETRACEMENT) {
        return {
          stage: "retracement",
          reason: `Down ${Math.abs(fromAth).toFixed(0)}% from ATH - deep retracement zone (smart money entry)`,
        };
      }
      return {
        stage: "retracement",
        reason: `Down ${Math.abs(fromAth).toFixed(0)}% from ATH - retracement zone`,
      };
    }

    // Older token with stable metrics
    if (hoursOld > 72) {
      return {
        stage: "established",
        reason: `${hoursOld > 168 ? Math.floor(hoursOld / 24) + " days" : hoursOld.toFixed(0) + "h"} old with stable trading`,
      };
    }

    // Default to PVP for newer tokens
    if (hoursOld < TRACTION_THRESHOLDS.PVP_MAX_HOURS) {
      return {
        stage: "pvp",
        reason: `Only ${hoursOld.toFixed(0)}h old - assume PVP phase`,
      };
    }

    return { stage: "established", reason: "Token has matured past PVP phase" };
  }

  // ============================================
  // Entry Guidance System
  // ============================================

  /**
   * Generate entry guidance based on lifecycle stage and metrics
   */
  generateEntryGuidance(
    stage: LifecycleStage,
    stageReason: string,
    token: MemeToken,
    fromAth: number | undefined,
  ): EntryGuidance {
    switch (stage) {
      case "pvp":
        if (token.priceChange24h > 200) {
          return {
            stage,
            stageReason,
            timing: "wait",
            rationale: `This is mid-PVP with ${token.priceChange24h.toFixed(0)}% gain. After PVP ends, expect 50-80% retracement. Either use tight SL (-25%) or wait for the dip.`,
            suggestedAction: "wait_for_dip",
            expectedRetracement: "50-80% pullback typical after PVP",
          };
        }
        return {
          stage,
          stageReason,
          timing: "enter",
          rationale: `Early PVP phase. If entering, use tight stop-loss (-20% to -30%). Fast in/out strategy - sell on first red candle if momentum fades.`,
          suggestedAction: "gmgn_tight_sl",
          expectedRetracement: "If pump continues then fails: 50-80% drop",
        };

      case "retracement":
        if (
          fromAth !== undefined &&
          fromAth < TRACTION_THRESHOLDS.DEEP_RETRACEMENT
        ) {
          return {
            stage,
            stageReason,
            timing: "enter",
            rationale: `Down ${Math.abs(fromAth).toFixed(0)}% from ATH - this is smart money entry zone. Check holder distribution is healthy before sizing up. LP becomes viable here.`,
            suggestedAction: "lp_viable",
          };
        }
        return {
          stage,
          stageReason,
          timing: "wait",
          rationale: `In retracement but may go deeper. Wait for stabilization or deeper dip (60%+ from ATH) for better entry.`,
          suggestedAction: "wait_for_dip",
          expectedRetracement: "May retrace further to 60-80% from ATH",
        };

      case "established":
        if (token.liquidity > 100000 && token.volume24h > 500000) {
          return {
            stage,
            stageReason,
            timing: "enter",
            rationale: `Established token with good liquidity. LP is excellent for fee farming. Direct buy also viable with normal risk management.`,
            suggestedAction: "lp_viable",
          };
        }
        return {
          stage,
          stageReason,
          timing: "enter",
          rationale: `Established token. Standard entry with normal stop-loss (-15% to -20%).`,
          suggestedAction: "gmgn_normal",
        };

      default:
        return {
          stage,
          stageReason,
          timing: "avoid",
          rationale: `Insufficient data to determine stage. Proceed with caution.`,
          suggestedAction: "avoid",
        };
    }
  }

  // ============================================
  // Holder Analysis Estimation
  // ============================================

  /**
   * Estimate holder analysis based on available signals
   * In production, this would integrate with Birdeye or Helius for real holder data
   */
  estimateHolderAnalysis(token: MemeToken): HolderAnalysis {
    const warnings: string[] = [];

    // Estimate holders based on activity
    const txns24h = token.volume24h / (token.price || 1) / 100; // Rough estimate
    const estimatedHolders =
      txns24h > 10000
        ? 2000
        : txns24h > 5000
          ? 1000
          : txns24h > 1000
            ? 500
            : 200;

    // Estimate top holder concentration based on liquidity and volume patterns
    const volLiqRatio = token.volumeLiquidityRatio;
    const estimatedTop10Pct =
      volLiqRatio > 20 ? 25 : volLiqRatio > 10 ? 18 : volLiqRatio > 5 ? 12 : 8;
    const estimatedTop1Pct = estimatedTop10Pct / 3;

    // Warning checks
    if (estimatedTop10Pct > 20) {
      warnings.push("High top 10 concentration (estimated) - dump risk");
    }
    if (token.liquidity < TRACTION_THRESHOLDS.LIQ_DECENT) {
      warnings.push("Low liquidity - hard to exit size");
    }
    if (
      token.priceChange24h > 300 &&
      (!token.marketCap || token.marketCap < 2_000_000)
    ) {
      warnings.push("Very new + big pump - may have coordinated wallets");
    }

    const isHealthy = warnings.length === 0 && estimatedTop10Pct < 15;

    return {
      top10Pct: estimatedTop10Pct,
      top1Pct: estimatedTop1Pct,
      holderCount: estimatedHolders,
      isHealthy,
      warnings,
    };
  }

  // ============================================
  // Enhanced Verdict System
  // ============================================

  /**
   * Build comprehensive verdict with bull/bear cases
   */
  buildVerdict(token: MemeToken): TokenVerdict {
    const bullPoints: string[] = [];
    const bearPoints: string[] = [];

    // Bull case analysis
    if (token.volume24h >= TRACTION_THRESHOLDS.VOLUME_HOT) {
      bullPoints.push("High volume indicates strong interest");
    }
    if (token.priceChange24h > 0 && token.volumeLiquidityRatio > 5) {
      bullPoints.push("Volume/liq ratio shows active trading");
    }
    if (token.isAiRelated && token.hasViralPotential) {
      bullPoints.push("AI narrative with viral potential");
    }
    if (
      token.marketCap &&
      token.marketCap >= AI_MEME_CRITERIA.SWEET_SPOT_MIN &&
      token.marketCap <= AI_MEME_CRITERIA.SWEET_SPOT_MAX
    ) {
      bullPoints.push("In sweet spot mcap range for 5-10x");
    }

    // Bear case analysis
    if (token.liquidity < TRACTION_THRESHOLDS.LIQ_DECENT) {
      bearPoints.push("Low liquidity - hard to exit size");
    }
    if (token.priceChange24h > 200) {
      bearPoints.push("Already pumped significantly - late entry risk");
    }
    if (token.marketCap && token.marketCap > AI_MEME_CRITERIA.MAX_MCAP) {
      bearPoints.push("High mcap - limited upside potential");
    }

    // Determine recommendation
    let recommendation: "ape" | "watch" | "avoid";
    let confidence: "high" | "medium" | "low";

    const tractionLevel = getTractionLevel(token.volume24h);

    if (tractionLevel === "viral" && bearPoints.length <= 1) {
      recommendation = "ape";
      confidence = "high";
    } else if (
      tractionLevel === "hot" &&
      bearPoints.length <= 1 &&
      token.hasViralPotential
    ) {
      recommendation = "ape";
      confidence = "medium";
    } else if (
      tractionLevel === "growing" ||
      (tractionLevel === "hot" && bearPoints.length > 1)
    ) {
      recommendation = "watch";
      confidence = "medium";
    } else if (bearPoints.length >= 3) {
      recommendation = "avoid";
      confidence = "high";
    } else {
      recommendation = "watch";
      confidence = "low";
    }

    return {
      bullCase: bullPoints.join(". ") || "Early play with potential",
      bearCase: bearPoints.join(". ") || "Standard memecoin risks apply",
      recommendation,
      confidence,
    };
  }

  // ============================================
  // Market Mood Detection
  // ============================================

  /**
   * Get current market mood based on aggregate metrics
   */
  getMarketMood(): { mood: MarketMood; summary: string } {
    const tokens = this.trendingTokens;
    if (tokens.length === 0) {
      return { mood: "quiet", summary: "No data available" };
    }

    const avgChange =
      tokens.reduce((sum, t) => sum + t.priceChange24h, 0) / tokens.length;
    const hotCount = tokens.filter(
      (t) => t.volumeLiquidityRatio >= 5 || t.priceChange24h >= 50,
    ).length;

    const mood = determineMarketMood(avgChange, hotCount);

    let summary: string;
    switch (mood) {
      case "pumping":
        summary = `Market is PUMPING - ${hotCount} hot tokens, avg +${avgChange.toFixed(0)}%`;
        break;
      case "dumping":
        summary = `Market is DUMPING - avg ${avgChange.toFixed(0)}%`;
        break;
      case "choppy":
        summary = `Choppy market - ${hotCount} tokens with action`;
        break;
      default:
        summary = "Quiet market - waiting for catalysts";
    }

    return { mood, summary };
  }

  /**
   * Get market mood for a specific token list (e.g. BASE-only for leaderboard).
   */
  getMarketMoodForTokens(tokens: MemeToken[]): { mood: MarketMood; summary: string } {
    if (tokens.length === 0) {
      return { mood: "quiet", summary: "No data available" };
    }

    const avgChange =
      tokens.reduce((sum, t) => sum + t.priceChange24h, 0) / tokens.length;
    const hotCount = tokens.filter(
      (t) => t.volumeLiquidityRatio >= 5 || t.priceChange24h >= 50,
    ).length;

    const mood = determineMarketMood(avgChange, hotCount);

    let summary: string;
    switch (mood) {
      case "pumping":
        summary = `Market is PUMPING - ${hotCount} hot tokens, avg +${avgChange.toFixed(0)}%`;
        break;
      case "dumping":
        summary = `Market is DUMPING - avg ${avgChange.toFixed(0)}%`;
        break;
      case "choppy":
        summary = `Choppy market - ${hotCount} tokens with action`;
        break;
      default:
        summary = "Quiet market - waiting for catalysts";
    }

    return { mood, summary };
  }

  // ============================================
  // Token Deep Dive
  // ============================================

  /**
   * Get comprehensive deep dive on a specific token
   */
  async getTokenDeepDive(tokenAddress: string): Promise<TokenDeepDive | null> {
    // Check cache first
    let token = this.tokenCache.get(tokenAddress);

    // If not in cache, search for it
    if (!token) {
      token = (await this.searchToken(tokenAddress)) || undefined;
      if (!token) return null;
    }

    // Calculate hours old (estimate if no pairCreatedAt)
    const hoursOld = 72; // Default assumption if we don't have creation time

    // Estimate from ATH based on price change patterns
    const fromAth =
      token.priceChange24h > 50
        ? undefined
        : token.priceChange24h < -30
          ? token.priceChange24h * 1.5
          : undefined;

    // Determine lifecycle stage
    const { stage, reason } = this.determineLifecycleStage(
      hoursOld,
      token.priceChange24h,
      fromAth,
      token.volumeLiquidityRatio,
    );

    // Generate analysis
    const entryGuidance = this.generateEntryGuidance(
      stage,
      reason,
      token,
      fromAth,
    );
    const holderAnalysis = this.estimateHolderAnalysis(token);
    const verdict = this.buildVerdict(token);

    // Enhance verdict based on lifecycle stage
    if (stage === "pvp" && token.priceChange24h > 200) {
      verdict.bearCase =
        "PVP phase - 50-80% retracement likely. " + verdict.bearCase;
      if (verdict.recommendation === "ape") {
        verdict.recommendation = "watch";
        verdict.confidence = "medium";
      }
    }
    if (stage === "retracement" && fromAth && fromAth < -50) {
      verdict.bullCase =
        "In retracement zone - smart money entry. " + verdict.bullCase;
    }

    // Build URLs for Solana tokens
    const gmgnUrl =
      token.chain === "solana" ? buildGmgnUrl(token.address) : undefined;
    const dexscreenerUrl = buildDexScreenerUrl(token.address, token.chain);
    const birdeyeUrl =
      token.chain === "solana" ? buildBirdeyeUrl(token.address) : undefined;

    return {
      ...token,
      lifecycleStage: stage,
      hoursOld,
      retracementFromAth: fromAth,
      holderAnalysis,
      entryGuidance,
      verdict,
      tractionLevel: getTractionLevel(token.volume24h),
      riskLevel: getRiskLevel(token.liquidity),
      momentumSignal: getMomentumSignal(token.priceChange24h),
      gmgnUrl,
      dexscreenerUrl,
      birdeyeUrl,
    };
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { tokenCount: number; lastUpdate: number } {
    return {
      tokenCount: this.tokenCache.size,
      lastUpdate: this.lastUpdate,
    };
  }

  getTrendingTokens(limit: number = 10): MemeToken[] {
    return this.trendingTokens.slice(0, limit);
  }

  getTokensByChain(chain: "solana" | "base"): MemeToken[] {
    return this.trendingTokens.filter((t) => t.chain === chain);
  }

  getAiTokens(): MemeToken[] {
    return this.trendingTokens.filter((t) => t.isAiRelated);
  }

  getApeTokens(): MemeToken[] {
    return this.trendingTokens.filter((t) => t.verdict === "APE");
  }

  /**
   * Get hot AI memes with viral potential (MOLT-tier plays)
   * These are AI tokens in the $1.5M-$5M sweet spot with strong traction
   */
  getHotAiMemes(): MemeToken[] {
    return this.trendingTokens
      .filter((t) => t.isAiRelated && t.hasViralPotential)
      .sort((a, b) => b.volumeLiquidityRatio - a.volumeLiquidityRatio);
  }

  /**
   * Get AI memes within a specific market cap range
   */
  getAiMemesInRange(minMcap: number, maxMcap: number): MemeToken[] {
    return this.trendingTokens
      .filter(
        (t) =>
          t.isAiRelated &&
          t.marketCap &&
          t.marketCap >= minMcap &&
          t.marketCap <= maxMcap,
      )
      .sort((a, b) => b.volumeLiquidityRatio - a.volumeLiquidityRatio);
  }

  /**
   * Get all AI memes that meet minimum criteria (regardless of sweet spot)
   */
  getAllQualifiedAiMemes(): MemeToken[] {
    return this.trendingTokens
      .filter(
        (t) =>
          t.isAiRelated &&
          t.marketCap &&
          t.marketCap >= AI_MEME_CRITERIA.MIN_MCAP &&
          t.marketCap <= AI_MEME_CRITERIA.MAX_MCAP &&
          t.liquidity >= AI_MEME_CRITERIA.MIN_LIQUIDITY,
      )
      .sort((a, b) => b.volumeLiquidityRatio - a.volumeLiquidityRatio);
  }

  getToken(address: string): MemeToken | null {
    return this.tokenCache.get(address) || null;
  }

  /**
   * Search for a specific token
   */
  async searchToken(query: string): Promise<MemeToken | null> {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      );

      if (!res.ok) return null;

      const data = await res.json();
      const pair = data.pairs?.[0];
      if (!pair) return null;

      const chain = pair.chainId as "solana" | "base" | "ethereum";
      if (chain !== "solana" && chain !== "base") return null;

      const volume24h = parseFloat(pair.volume?.h24) || 0;
      const liquidity = parseFloat(pair.liquidity?.usd) || 1;
      const volumeLiquidityRatio = volume24h / liquidity;
      const priceChange24h = parseFloat(pair.priceChange?.h24) || 0;
      const verdict = this.calculateVerdict(
        volumeLiquidityRatio,
        liquidity,
        priceChange24h,
      );

      // Extract market cap data
      const marketCap = pair.marketCap || pair.fdv || 0;
      const fdv = pair.fdv || 0;

      const name = (pair.baseToken?.name || "").toLowerCase();
      const symbol = (pair.baseToken?.symbol || "").toLowerCase();
      const isAiRelated = AI_KEYWORDS.some(
        (kw) => name.includes(kw) || symbol.includes(kw),
      );

      // Determine viral potential
      const hasViralPotential =
        isAiRelated &&
        marketCap >= AI_MEME_CRITERIA.SWEET_SPOT_MIN &&
        marketCap <= AI_MEME_CRITERIA.SWEET_SPOT_MAX &&
        volumeLiquidityRatio >= AI_MEME_CRITERIA.MIN_VOL_LIQ_RATIO &&
        liquidity >= AI_MEME_CRITERIA.MIN_LIQUIDITY;

      return {
        address: pair.baseToken?.address || "",
        symbol: pair.baseToken?.symbol || "UNKNOWN",
        name: pair.baseToken?.name || "Unknown Token",
        chain,
        price: parseFloat(pair.priceUsd) || 0,
        priceChange24h,
        volume24h,
        liquidity,
        volumeLiquidityRatio,
        verdict,
        isAiRelated,
        timestamp: Date.now(),
        marketCap,
        fdv,
        mcapTier: this.getMcapTier(marketCap),
        hasViralPotential,
      };
    } catch (error) {
      logger.debug(`[VinceDexScreener] Search error: ${error}`);
      return null;
    }
  }
}
