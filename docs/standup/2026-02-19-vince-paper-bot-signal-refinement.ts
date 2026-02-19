interface MarketSignal {
  type: 'momentum' | 'reversal' | 'breakout' | 'consolidation';
  strength: number; // 0-100
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  asset: string;
  price: number;
  timestamp: number;
  confidence: number; // 0-100
  metadata: Record<string, any>;
}

interface PaperBotConfig {
  minConfidence: number;
  minStrength: number;
  maxSignalsPerHour: number;
  cooldownMinutes: number;
  enabledTimeframes: string[];
  riskThreshold: number;
}

class PaperBotSignalRefinement {
  private config: PaperBotConfig;
  private recentSignals: Map<string, number> = new Map();
  private signalHistory: MarketSignal[] = [];

  constructor(config: Partial<PaperBotConfig> = {}) {
    this.config = {
      minConfidence: 70,
      minStrength: 60,
      maxSignalsPerHour: 5,
      cooldownMinutes: 15,
      enabledTimeframes: ['5m', '15m', '1h'],
      riskThreshold: 0.02,
      ...config
    };
  }

  refineSignal(rawSignal: MarketSignal): MarketSignal | null {
    // Basic validation
    if (!this.isValidSignal(rawSignal)) return null;
    
    // Apply confidence and strength filters
    if (rawSignal.confidence < this.config.minConfidence) return null;
    if (rawSignal.strength < this.config.minStrength) return null;
    
    // Check timeframe allowlist
    if (!this.config.enabledTimeframes.includes(rawSignal.timeframe)) return null;
    
    // Rate limiting
    if (!this.checkRateLimit(rawSignal.asset)) return null;
    
    // Cooldown check
    if (!this.checkCooldown(rawSignal.asset)) return null;
    
    // Signal confluence scoring
    const refinedSignal = this.applyConfluenceScoring(rawSignal);
    
    // Risk adjustment
    const riskAdjustedSignal = this.applyRiskAdjustment(refinedSignal);
    
    // Update tracking
    this.updateSignalTracking(riskAdjustedSignal);
    
    return riskAdjustedSignal;
  }

  private isValidSignal(signal: MarketSignal): boolean {
    return !!(
      signal.type &&
      signal.asset &&
      signal.price > 0 &&
      signal.timestamp &&
      signal.confidence >= 0 && signal.confidence <= 100 &&
      signal.strength >= 0 && signal.strength <= 100
    );
  }

  private checkRateLimit(asset: string): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const recentCount = this.signalHistory.filter(s => 
      s.asset === asset && s.timestamp > hourAgo
    ).length;
    
    return recentCount < this.config.maxSignalsPerHour;
  }

  private checkCooldown(asset: string): boolean {
    const lastSignalTime = this.recentSignals.get(asset);
    if (!lastSignalTime) return true;
    
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return Date.now() - lastSignalTime > cooldownMs;
  }

  private applyConfluenceScoring(signal: MarketSignal): MarketSignal {
    let confluenceBonus = 0;
    
    // Multiple timeframe confluence
    const sameTypeSignals = this.signalHistory.filter(s => 
      s.asset === signal.asset &&
      s.type === signal.type &&
      Date.now() - s.timestamp < 30 * 60 * 1000 // 30 min window
    );
    
    confluenceBonus += Math.min(sameTypeSignals.length * 5, 20);
    
    // Volume confluence (if available in metadata)
    if (signal.metadata.volume && signal.metadata.avgVolume) {
      const volumeRatio = signal.metadata.volume / signal.metadata.avgVolume;
      if (volumeRatio > 1.5) confluenceBonus += 10;
    }
    
    return {
      ...signal,
      confidence: Math.min(signal.confidence + confluenceBonus, 100),
      metadata: {
        ...signal.metadata,
        confluenceBonus
      }
    };
  }

  private applyRiskAdjustment(signal: MarketSignal): MarketSignal {
    let riskMultiplier = 1.0;
    
    // Volatility adjustment
    if (signal.metadata.volatility) {
      if (signal.metadata.volatility > this.config.riskThreshold * 2) {
        riskMultiplier *= 0.7; // Reduce strength in high vol
      }
    }
    
    // Market hours adjustment
    const hour = new Date(signal.timestamp).getUTCHours();
    const isMarketHours = hour >= 14 && hour <= 21; // UTC market hours
    if (!isMarketHours) riskMultiplier *= 0.8;
    
    return {
      ...signal,
      strength: Math.round(signal.strength * riskMultiplier),
      metadata: {
        ...signal.metadata,
        riskMultiplier,
        adjustedForRisk: true
      }
    };
  }

  private updateSignalTracking(signal: MarketSignal): void {
    this.recentSignals.set(signal.asset, signal.timestamp);
    this.signalHistory.push(signal);
    
    // Cleanup old signals (keep last 1000)
    if (this.signalHistory.length > 1000) {
      this.signalHistory = this.signalHistory.slice(-1000);
    }
  }

  getSignalStats(): Record<string, any> {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      totalSignals: this.signalHistory.length,
      signalsLastHour: this.signalHistory.filter(s => s.timestamp > hourAgo).length,
      signalsLastDay: this.signalHistory.filter(s => s.timestamp > dayAgo).length,
      avgConfidence: this.signalHistory.reduce((sum, s) => sum + s.confidence, 0) / this.signalHistory.length,
      avgStrength: this.signalHistory.reduce((sum, s) => sum + s.strength, 0) / this.signalHistory.length,
      typeDistribution: this.getTypeDistribution()
    };
  }

  private getTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    this.signalHistory.forEach(signal => {
      distribution[signal.type] = (distribution[signal.type] || 0) + 1;
    });
    return distribution;
  }
}

export { PaperBotSignalRefinement, MarketSignal, PaperBotConfig };