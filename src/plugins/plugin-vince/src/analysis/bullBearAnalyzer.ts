/**
 * VINCE Bull/Bear Case Analyzer
 * 
 * Core analysis engine that aggregates data from all VINCE services
 * to build coherent bull and bear cases, then generates a final
 * conclusion with conviction score.
 * 
 * Data Sources:
 * - CoinGlass: Funding rates, L/S ratio, Fear/Greed, OI
 * - Deribit: IV surface, options skew, DVOL
 * - Sanbase: Exchange flows, network activity, whale activity
 * - Nansen: Smart money flows, accumulation signals
 * - TopTraders: Whale positioning on Hyperliquid
 * - News Sentiment: Market sentiment from news
 * - CoinGecko: Price data
 */

import type { IAgentRuntime } from "@elizaos/core";
import type {
  CaseFactor,
  MarketCase,
  DailyConclusion,
  MarketDataSnapshot,
  AnalysisResult,
  DataSource,
  IndicatorType,
  MarketDirection,
  RecommendedAction,
  AnalysisWeights,
  SignalThresholds,
} from "../types/analysis";
import {
  DEFAULT_ANALYSIS_WEIGHTS,
  DEFAULT_THRESHOLDS,
} from "../types/analysis";

// Service type imports
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceSanbaseService } from "../services/sanbase.service";
import type { VinceNansenService } from "../services/nansen.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceCoinGeckoService } from "../services/coingecko.service";

// ==========================================
// Bull/Bear Case Analyzer Class
// ==========================================

export class BullBearAnalyzer {
  private weights: AnalysisWeights;
  private thresholds: SignalThresholds;

  constructor(
    weights: AnalysisWeights = DEFAULT_ANALYSIS_WEIGHTS,
    thresholds: SignalThresholds = DEFAULT_THRESHOLDS
  ) {
    this.weights = weights;
    this.thresholds = thresholds;
  }

  /**
   * Run a full analysis for an asset using all available services
   */
  async analyze(
    runtime: IAgentRuntime,
    asset: string = "BTC"
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const availableServices: DataSource[] = [];
    const failedServices: DataSource[] = [];

    // Collect data from all services
    const snapshot = await this.collectData(
      runtime,
      asset,
      availableServices,
      failedServices
    );

    // Build bull and bear cases
    const bullCase = this.buildBullCase(snapshot);
    const bearCase = this.buildBearCase(snapshot);

    // Generate conclusion
    const conclusion = this.generateConclusion(asset, bullCase, bearCase);

    // Calculate data quality
    const dataQualityScore = this.calculateDataQuality(
      availableServices,
      failedServices
    );

    return {
      snapshot,
      conclusion,
      availableServices,
      failedServices,
      dataQualityScore,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Collect data from all available services
   */
  private async collectData(
    runtime: IAgentRuntime,
    asset: string,
    availableServices: DataSource[],
    failedServices: DataSource[]
  ): Promise<MarketDataSnapshot> {
    const snapshot: MarketDataSnapshot = {
      asset,
      timestamp: Date.now(),
      fundingRate: null,
      longShortRatio: null,
      fearGreedValue: null,
      fearGreedLabel: null,
      openInterestChange: null,
      spotPrice: null,
      dvol: null,
      ivSkew: null,
      skewInterpretation: null,
      exchangeNetFlow: null,
      exchangeSentiment: null,
      networkTrend: null,
      whaleSentiment: null,
      smartMoneyNetFlow: null,
      isSmartMoneyAccumulating: null,
      smartMoneyConfidence: null,
      whaleDirection: null,
      whaleStrength: null,
      newsSentiment: null,
      newsConfidence: null,
      hasRiskEvents: false,
      priceChange24h: null,
    };

    // CoinGlass
    try {
      const coinglassService = runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
      if (coinglassService) {
        // Refresh data if available (async)
        if (typeof coinglassService.refreshData === "function") {
          await coinglassService.refreshData();
        }
        
        // Get cached data (sync)
        const funding = coinglassService.getFunding(asset);
        const longShort = coinglassService.getLongShortRatio(asset);
        const fearGreed = coinglassService.getFearGreed();
        const oi = coinglassService.getOpenInterest(asset);

        if (funding) snapshot.fundingRate = funding.rate;
        if (longShort) snapshot.longShortRatio = longShort.ratio;
        if (fearGreed) {
          snapshot.fearGreedValue = fearGreed.value;
          snapshot.fearGreedLabel = fearGreed.classification;
        }
        if (oi) snapshot.openInterestChange = oi.change24h;

        availableServices.push("coinglass");
      }
    } catch {
      failedServices.push("coinglass");
    }

    // Deribit
    try {
      const deribitService = runtime.getService("VINCE_DERIBIT_SERVICE") as VinceDeribitService | null;
      if (deribitService) {
        const price = await deribitService.getIndexPrice(asset as any);
        const dvol = await deribitService.getDVOL(asset as any);
        const ivSurface = await deribitService.getIVSurface(asset as any);

        if (price) snapshot.spotPrice = price;
        if (dvol) snapshot.dvol = dvol;
        if (ivSurface) {
          snapshot.ivSkew = ivSurface.skew;
          snapshot.skewInterpretation = ivSurface.skewInterpretation;
        }

        availableServices.push("deribit");
      }
    } catch {
      failedServices.push("deribit");
    }

    // Sanbase
    try {
      const sanbaseService = runtime.getService("VINCE_SANBASE_SERVICE") as VinceSanbaseService | null;
      if (sanbaseService && sanbaseService.isConfigured()) {
        const exchangeFlows = await sanbaseService.getExchangeFlows(asset);
        const network = await sanbaseService.getNetworkActivity(asset);
        const whales = await sanbaseService.getWhaleActivity(asset);

        if (exchangeFlows) {
          snapshot.exchangeNetFlow = exchangeFlows.netFlow;
          snapshot.exchangeSentiment = exchangeFlows.sentiment;
        }
        if (network) snapshot.networkTrend = network.trend;
        if (whales) snapshot.whaleSentiment = whales.sentiment;

        availableServices.push("sanbase");
      }
    } catch {
      failedServices.push("sanbase");
    }

    // Nansen
    try {
      const nansenService = runtime.getService("VINCE_NANSEN_SERVICE") as VinceNansenService | null;
      if (nansenService && nansenService.isConfigured()) {
        const accumulation = await nansenService.isSmartMoneyAccumulating(asset);

        if (accumulation) {
          snapshot.smartMoneyNetFlow = accumulation.netFlow;
          snapshot.isSmartMoneyAccumulating = accumulation.accumulating;
          snapshot.smartMoneyConfidence = accumulation.confidence;
        }

        availableServices.push("nansen");
      }
    } catch {
      failedServices.push("nansen");
    }

    // TopTraders
    try {
      const topTradersService = runtime.getService("VINCE_TOP_TRADERS_SERVICE") as VinceTopTradersService | null;
      if (topTradersService) {
        const signal = await topTradersService.generateSignal(asset);

        if (signal) {
          snapshot.whaleDirection = signal.direction;
          snapshot.whaleStrength = signal.strength;
        }

        availableServices.push("top_traders");
      }
    } catch {
      failedServices.push("top_traders");
    }

    // News Sentiment
    try {
      const newsService = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
      if (newsService) {
        const sentiment = await newsService.getOverallSentiment();
        const riskEvents = await newsService.getActiveRiskEvents();

        if (sentiment) {
          snapshot.newsSentiment = sentiment.sentiment;
          snapshot.newsConfidence = sentiment.confidence;
        }
        snapshot.hasRiskEvents = riskEvents && riskEvents.length > 0;

        availableServices.push("news_sentiment");
      }
    } catch {
      failedServices.push("news_sentiment");
    }

    // CoinGecko
    try {
      const coingeckoService = runtime.getService("VINCE_COINGECKO_SERVICE") as VinceCoinGeckoService | null;
      if (coingeckoService) {
        // Refresh data if available (async)
        if (typeof coingeckoService.refreshData === "function") {
          await coingeckoService.refreshData();
        }
        
        // Get cached data (sync)
        const price = coingeckoService.getPrice(asset);

        if (price) {
          snapshot.priceChange24h = price.change24h;
        }

        availableServices.push("coingecko");
      }
    } catch {
      failedServices.push("coingecko");
    }

    return snapshot;
  }

  /**
   * Build the bull case from the data snapshot
   */
  buildBullCase(snapshot: MarketDataSnapshot): MarketCase {
    const factors: CaseFactor[] = [];
    const timestamp = Date.now();

    // CoinGlass: Negative funding = bullish
    if (snapshot.fundingRate !== null && snapshot.fundingRate < this.thresholds.fundingBullish) {
      factors.push({
        source: "coinglass",
        indicator: "funding_rate",
        value: `${(snapshot.fundingRate * 100).toFixed(3)}%`,
        rawValue: snapshot.fundingRate,
        weight: this.weights.coinglass * 0.35,
        explanation: "Negative funding indicates shorts are paying longs - squeeze potential",
        confidence: Math.min(90, Math.abs(snapshot.fundingRate) * 5000),
        timestamp,
      });
    }

    // CoinGlass: Low L/S ratio = bullish (shorts crowded)
    if (snapshot.longShortRatio !== null && snapshot.longShortRatio < this.thresholds.longShortBullish) {
      factors.push({
        source: "coinglass",
        indicator: "long_short_ratio",
        value: snapshot.longShortRatio.toFixed(2),
        rawValue: snapshot.longShortRatio,
        weight: this.weights.coinglass * 0.35,
        explanation: "Low L/S ratio shows shorts are crowded - contrarian bullish",
        confidence: Math.min(85, (1 - snapshot.longShortRatio) * 100),
        timestamp,
      });
    }

    // CoinGlass: Extreme fear = bullish (buy the fear)
    if (snapshot.fearGreedValue !== null && snapshot.fearGreedValue < this.thresholds.fearGreedBullish) {
      factors.push({
        source: "coinglass",
        indicator: "fear_greed",
        value: `${snapshot.fearGreedValue} (${snapshot.fearGreedLabel})`,
        rawValue: snapshot.fearGreedValue,
        weight: this.weights.coinglass * 0.3,
        explanation: "Extreme fear typically marks local bottoms - contrarian buy signal",
        confidence: Math.min(80, (25 - snapshot.fearGreedValue) * 3),
        timestamp,
      });
    }

    // Deribit: Call skew = bullish
    if (snapshot.skewInterpretation === "bullish") {
      factors.push({
        source: "deribit",
        indicator: "iv_skew",
        value: `${snapshot.ivSkew?.toFixed(1)}% (${snapshot.skewInterpretation})`,
        rawValue: snapshot.ivSkew || 0,
        weight: this.weights.deribit * 0.5,
        explanation: "Options skew favors calls - market expects upside",
        confidence: 70,
        timestamp,
      });
    }

    // Deribit: Low DVOL = bullish (complacency)
    if (snapshot.dvol !== null && snapshot.dvol < 50) {
      factors.push({
        source: "deribit",
        indicator: "dvol",
        value: `${snapshot.dvol.toFixed(1)}`,
        rawValue: snapshot.dvol,
        weight: this.weights.deribit * 0.5,
        explanation: "Low implied volatility suggests complacency - often precedes moves up",
        confidence: 60,
        timestamp,
      });
    }

    // Sanbase: Exchange outflows = bullish (accumulation)
    if (snapshot.exchangeSentiment === "accumulation") {
      factors.push({
        source: "sanbase",
        indicator: "exchange_flows",
        value: `Net ${(snapshot.exchangeNetFlow || 0).toLocaleString()} ${snapshot.asset}`,
        rawValue: snapshot.exchangeNetFlow || 0,
        weight: this.weights.sanbase * 0.4,
        explanation: "Net outflows from exchanges indicate accumulation by long-term holders",
        confidence: 75,
        timestamp,
      });
    }

    // Sanbase: Network growth = bullish
    if (snapshot.networkTrend === "increasing") {
      factors.push({
        source: "sanbase",
        indicator: "network_activity",
        value: "Increasing",
        rawValue: 1,
        weight: this.weights.sanbase * 0.3,
        explanation: "Growing network activity signals healthy adoption",
        confidence: 65,
        timestamp,
      });
    }

    // Sanbase: Bullish whale sentiment
    if (snapshot.whaleSentiment === "bullish") {
      factors.push({
        source: "sanbase",
        indicator: "whale_activity",
        value: "Bullish",
        rawValue: 1,
        weight: this.weights.sanbase * 0.3,
        explanation: "Whale activity indicates bullish positioning",
        confidence: 70,
        timestamp,
      });
    }

    // Nansen: Smart money accumulating = bullish
    if (snapshot.isSmartMoneyAccumulating === true) {
      factors.push({
        source: "nansen",
        indicator: "smart_money_flow",
        value: `Accumulating ($${((snapshot.smartMoneyNetFlow || 0) / 1000000).toFixed(1)}M)`,
        rawValue: snapshot.smartMoneyNetFlow || 0,
        weight: this.weights.nansen,
        explanation: "Smart money wallets are net buyers - follow the informed money",
        confidence: snapshot.smartMoneyConfidence === "high" ? 85 : snapshot.smartMoneyConfidence === "medium" ? 70 : 55,
        timestamp,
      });
    }

    // TopTraders: Whales long = bullish
    if (snapshot.whaleDirection === "long" && (snapshot.whaleStrength || 0) > 60) {
      factors.push({
        source: "top_traders",
        indicator: "whale_positioning",
        value: `Long (${snapshot.whaleStrength}% strength)`,
        rawValue: snapshot.whaleStrength || 0,
        weight: this.weights.topTraders,
        explanation: "Major Hyperliquid whales positioning long",
        confidence: snapshot.whaleStrength || 60,
        timestamp,
      });
    }

    // News: Bullish sentiment
    if (snapshot.newsSentiment === "bullish") {
      factors.push({
        source: "news_sentiment",
        indicator: "sentiment",
        value: `Bullish (${Math.round(snapshot.newsConfidence || 0)}% confidence)`,
        rawValue: snapshot.newsConfidence || 0,
        weight: this.weights.newsSentiment,
        explanation: "News flow is positive - supportive backdrop",
        confidence: Math.round(snapshot.newsConfidence || 60),
        timestamp,
      });
    }

    // Price: Strong momentum = bullish
    if (snapshot.priceChange24h !== null && snapshot.priceChange24h > this.thresholds.momentumBullish) {
      factors.push({
        source: "coingecko",
        indicator: "price_momentum",
        value: `+${snapshot.priceChange24h.toFixed(1)}%`,
        rawValue: snapshot.priceChange24h,
        weight: this.weights.priceAction,
        explanation: "Strong upward momentum - trend continuation likely",
        confidence: Math.min(75, snapshot.priceChange24h * 10),
        timestamp,
      });
    }

    // Calculate overall strength
    const strength = this.calculateCaseStrength(factors);
    const keyFactors = factors.sort((a, b) => b.weight * b.confidence - a.weight * a.confidence).slice(0, 3);
    const narrative = this.generateCaseNarrative("bull", factors, keyFactors);

    return {
      type: "bull",
      strength,
      factorCount: factors.length,
      factors,
      keyFactors,
      narrative,
      timestamp,
    };
  }

  /**
   * Build the bear case from the data snapshot
   */
  buildBearCase(snapshot: MarketDataSnapshot): MarketCase {
    const factors: CaseFactor[] = [];
    const timestamp = Date.now();

    // CoinGlass: High positive funding = bearish
    if (snapshot.fundingRate !== null && snapshot.fundingRate > this.thresholds.fundingBearish) {
      factors.push({
        source: "coinglass",
        indicator: "funding_rate",
        value: `+${(snapshot.fundingRate * 100).toFixed(3)}%`,
        rawValue: snapshot.fundingRate,
        weight: this.weights.coinglass * 0.35,
        explanation: "High positive funding indicates overleveraged longs - liquidation risk",
        confidence: Math.min(90, snapshot.fundingRate * 4000),
        timestamp,
      });
    }

    // CoinGlass: High L/S ratio = bearish (longs crowded)
    if (snapshot.longShortRatio !== null && snapshot.longShortRatio > this.thresholds.longShortBearish) {
      factors.push({
        source: "coinglass",
        indicator: "long_short_ratio",
        value: snapshot.longShortRatio.toFixed(2),
        rawValue: snapshot.longShortRatio,
        weight: this.weights.coinglass * 0.35,
        explanation: "High L/S ratio shows longs are crowded - contrarian bearish",
        confidence: Math.min(85, (snapshot.longShortRatio - 1) * 60),
        timestamp,
      });
    }

    // CoinGlass: Extreme greed = bearish (sell the greed)
    if (snapshot.fearGreedValue !== null && snapshot.fearGreedValue > this.thresholds.fearGreedBearish) {
      factors.push({
        source: "coinglass",
        indicator: "fear_greed",
        value: `${snapshot.fearGreedValue} (${snapshot.fearGreedLabel})`,
        rawValue: snapshot.fearGreedValue,
        weight: this.weights.coinglass * 0.3,
        explanation: "Extreme greed typically marks local tops - contrarian sell signal",
        confidence: Math.min(80, (snapshot.fearGreedValue - 75) * 3),
        timestamp,
      });
    }

    // Deribit: Put skew = bearish
    if (snapshot.skewInterpretation === "fearful") {
      factors.push({
        source: "deribit",
        indicator: "iv_skew",
        value: `${snapshot.ivSkew?.toFixed(1)}% (${snapshot.skewInterpretation})`,
        rawValue: snapshot.ivSkew || 0,
        weight: this.weights.deribit * 0.5,
        explanation: "Options skew favors puts - market hedging downside",
        confidence: 70,
        timestamp,
      });
    }

    // Deribit: High DVOL = bearish (fear)
    if (snapshot.dvol !== null && snapshot.dvol > 70) {
      factors.push({
        source: "deribit",
        indicator: "dvol",
        value: `${snapshot.dvol.toFixed(1)}`,
        rawValue: snapshot.dvol,
        weight: this.weights.deribit * 0.5,
        explanation: "Elevated implied volatility suggests fear - often precedes sell-offs",
        confidence: 65,
        timestamp,
      });
    }

    // Sanbase: Exchange inflows = bearish (distribution)
    if (snapshot.exchangeSentiment === "distribution") {
      factors.push({
        source: "sanbase",
        indicator: "exchange_flows",
        value: `Net +${(snapshot.exchangeNetFlow || 0).toLocaleString()} ${snapshot.asset}`,
        rawValue: snapshot.exchangeNetFlow || 0,
        weight: this.weights.sanbase * 0.4,
        explanation: "Net inflows to exchanges indicate distribution - selling pressure ahead",
        confidence: 75,
        timestamp,
      });
    }

    // Sanbase: Network decline = bearish
    if (snapshot.networkTrend === "decreasing") {
      factors.push({
        source: "sanbase",
        indicator: "network_activity",
        value: "Decreasing",
        rawValue: -1,
        weight: this.weights.sanbase * 0.3,
        explanation: "Declining network activity signals waning interest",
        confidence: 60,
        timestamp,
      });
    }

    // Sanbase: Bearish whale sentiment
    if (snapshot.whaleSentiment === "bearish") {
      factors.push({
        source: "sanbase",
        indicator: "whale_activity",
        value: "Bearish",
        rawValue: -1,
        weight: this.weights.sanbase * 0.3,
        explanation: "Whale activity indicates bearish positioning",
        confidence: 70,
        timestamp,
      });
    }

    // Nansen: Smart money selling = bearish
    if (snapshot.isSmartMoneyAccumulating === false && (snapshot.smartMoneyNetFlow || 0) < 0) {
      factors.push({
        source: "nansen",
        indicator: "smart_money_flow",
        value: `Distributing ($${((snapshot.smartMoneyNetFlow || 0) / 1000000).toFixed(1)}M)`,
        rawValue: snapshot.smartMoneyNetFlow || 0,
        weight: this.weights.nansen,
        explanation: "Smart money wallets are net sellers - follow the informed money",
        confidence: snapshot.smartMoneyConfidence === "high" ? 85 : snapshot.smartMoneyConfidence === "medium" ? 70 : 55,
        timestamp,
      });
    }

    // TopTraders: Whales short = bearish
    if (snapshot.whaleDirection === "short" && (snapshot.whaleStrength || 0) > 60) {
      factors.push({
        source: "top_traders",
        indicator: "whale_positioning",
        value: `Short (${snapshot.whaleStrength}% strength)`,
        rawValue: snapshot.whaleStrength || 0,
        weight: this.weights.topTraders,
        explanation: "Major Hyperliquid whales positioning short",
        confidence: snapshot.whaleStrength || 60,
        timestamp,
      });
    }

    // News: Bearish sentiment or risk events
    if (snapshot.newsSentiment === "bearish" || snapshot.hasRiskEvents) {
      factors.push({
        source: "news_sentiment",
        indicator: snapshot.hasRiskEvents ? "risk_events" : "sentiment",
        value: snapshot.hasRiskEvents ? "Active Risk Events" : `Bearish (${Math.round(snapshot.newsConfidence || 0)}% confidence)`,
        rawValue: snapshot.hasRiskEvents ? -100 : -(snapshot.newsConfidence || 0),
        weight: this.weights.newsSentiment * (snapshot.hasRiskEvents ? 1.5 : 1),
        explanation: snapshot.hasRiskEvents 
          ? "Active risk events require caution" 
          : "News flow is negative - headwinds ahead",
        confidence: snapshot.hasRiskEvents ? 80 : Math.round(snapshot.newsConfidence || 60),
        timestamp,
      });
    }

    // Price: Strong down momentum = bearish
    if (snapshot.priceChange24h !== null && snapshot.priceChange24h < this.thresholds.momentumBearish) {
      factors.push({
        source: "coingecko",
        indicator: "price_momentum",
        value: `${snapshot.priceChange24h.toFixed(1)}%`,
        rawValue: snapshot.priceChange24h,
        weight: this.weights.priceAction,
        explanation: "Strong downward momentum - trend continuation likely",
        confidence: Math.min(75, Math.abs(snapshot.priceChange24h) * 10),
        timestamp,
      });
    }

    // Calculate overall strength
    const strength = this.calculateCaseStrength(factors);
    const keyFactors = factors.sort((a, b) => b.weight * b.confidence - a.weight * a.confidence).slice(0, 3);
    const narrative = this.generateCaseNarrative("bear", factors, keyFactors);

    return {
      type: "bear",
      strength,
      factorCount: factors.length,
      factors,
      keyFactors,
      narrative,
      timestamp,
    };
  }

  /**
   * Generate the final conclusion from bull and bear cases
   */
  generateConclusion(
    asset: string,
    bullCase: MarketCase,
    bearCase: MarketCase
  ): DailyConclusion {
    const timestamp = Date.now();
    const date = new Date().toISOString().split("T")[0];

    // Determine direction
    const netStrength = bullCase.strength - bearCase.strength;
    let direction: MarketDirection;
    let conviction: number;

    if (Math.abs(netStrength) < 15) {
      direction = "neutral";
      conviction = 50 - Math.abs(netStrength);
    } else if (netStrength > 0) {
      direction = "bullish";
      conviction = Math.min(95, 50 + netStrength);
    } else {
      direction = "bearish";
      conviction = Math.min(95, 50 + Math.abs(netStrength));
    }

    // Determine recommendation
    let recommendation: RecommendedAction;
    let recommendationText: string;

    if (direction === "bullish" && conviction > 70) {
      recommendation = "accumulate";
      recommendationText = `Strong bullish setup - consider accumulating ${asset} on dips.`;
    } else if (direction === "bullish" && conviction > 55) {
      recommendation = "hold";
      recommendationText = `Moderately bullish - hold existing ${asset} positions.`;
    } else if (direction === "bearish" && conviction > 70) {
      recommendation = "reduce";
      recommendationText = `Strong bearish signals - consider reducing ${asset} exposure.`;
    } else if (direction === "bearish" && conviction > 55) {
      recommendation = "hedge";
      recommendationText = `Moderately bearish - consider hedging ${asset} positions.`;
    } else {
      recommendation = "wait_for_clarity";
      recommendationText = `Mixed signals - wait for clearer direction before acting on ${asset}.`;
    }

    // Extract key factors
    const allKeyFactors = [
      ...bullCase.keyFactors.map(f => `BULL: ${f.explanation}`),
      ...bearCase.keyFactors.map(f => `BEAR: ${f.explanation}`),
    ].slice(0, 5);

    // Generate summary
    const summary = this.generateSummary(
      asset,
      direction,
      conviction,
      bullCase,
      bearCase
    );

    return {
      date,
      asset,
      bullCase,
      bearCase,
      direction,
      conviction,
      keyFactors: allKeyFactors,
      recommendation,
      recommendationText,
      summary,
      timestamp,
    };
  }

  /**
   * Calculate the overall strength of a case
   */
  private calculateCaseStrength(factors: CaseFactor[]): number {
    if (factors.length === 0) return 0;

    const weightedSum = factors.reduce((sum, f) => sum + f.weight * (f.confidence / 100), 0);
    const maxPossible = Object.values(this.weights).reduce((a, b) => a + b, 0);
    
    return Math.min(100, (weightedSum / maxPossible) * 100 + factors.length * 5);
  }

  /**
   * Calculate data quality score based on available services
   */
  private calculateDataQuality(
    available: DataSource[],
    failed: DataSource[]
  ): number {
    const totalServices = available.length + failed.length;
    if (totalServices === 0) return 0;
    
    return Math.round((available.length / 7) * 100); // 7 main services
  }

  /**
   * Generate narrative for a case
   */
  private generateCaseNarrative(
    type: "bull" | "bear",
    factors: CaseFactor[],
    keyFactors: CaseFactor[]
  ): string {
    if (factors.length === 0) {
      return `No significant ${type}ish signals detected.`;
    }

    const strength = factors.length >= 5 ? "strong" : factors.length >= 3 ? "moderate" : "weak";
    const keyPoints = keyFactors.map(f => f.explanation).join(". ");

    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${type} case with ${factors.length} supporting factors. Key signals: ${keyPoints}`;
  }

  /**
   * Generate overall summary
   */
  private generateSummary(
    asset: string,
    direction: MarketDirection,
    conviction: number,
    bullCase: MarketCase,
    bearCase: MarketCase
  ): string {
    const convictionLabel = conviction > 75 ? "high" : conviction > 55 ? "moderate" : "low";
    
    if (direction === "neutral") {
      return `${asset} shows mixed signals with ${bullCase.factorCount} bullish and ${bearCase.factorCount} bearish factors. Conviction is ${convictionLabel} at ${conviction.toFixed(0)}%. Wait for clearer direction.`;
    }

    const winningCase = direction === "bullish" ? bullCase : bearCase;
    const losingCase = direction === "bullish" ? bearCase : bullCase;

    return `${asset} leans ${direction} with ${convictionLabel} conviction (${conviction.toFixed(0)}%). ` +
      `Bull case (${bullCase.strength.toFixed(0)}) vs Bear case (${bearCase.strength.toFixed(0)}). ` +
      `${winningCase.keyFactors[0]?.explanation || "Multiple factors"} outweigh ${losingCase.keyFactors[0]?.explanation || "opposing signals"}.`;
  }
}

// ==========================================
// Singleton instance for convenience
// ==========================================

let analyzerInstance: BullBearAnalyzer | null = null;

export function getBullBearAnalyzer(
  weights?: AnalysisWeights,
  thresholds?: SignalThresholds
): BullBearAnalyzer {
  if (!analyzerInstance || weights || thresholds) {
    analyzerInstance = new BullBearAnalyzer(weights, thresholds);
  }
  return analyzerInstance;
}

export default BullBearAnalyzer;
