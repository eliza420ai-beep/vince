interface SentimentData {
  timestamp: number;
  bullishPercent: number;
  bearishPercent: number;
  fearGreedIndex: number;
  source: string;
}

interface ContrarianSignal {
  type: 'EXTREME_GREED' | 'EXTREME_FEAR' | 'NEUTRAL';
  strength: number;
  timestamp: number;
  reasoning: string;
}

class CTSentimentContrarianMonitor {
  private sentimentHistory: SentimentData[] = [];
  private readonly EXTREME_GREED_THRESHOLD = 75;
  private readonly EXTREME_FEAR_THRESHOLD = 25;
  private readonly SIGNAL_STRENGTH_MULTIPLIER = 0.01;

  addSentimentData(data: SentimentData): void {
    this.sentimentHistory.push(data);
    this.sentimentHistory = this.sentimentHistory.slice(-100); // Keep last 100 readings
  }

  getCurrentSignal(): ContrarianSignal {
    if (this.sentimentHistory.length === 0) {
      return {
        type: 'NEUTRAL',
        strength: 0,
        timestamp: Date.now(),
        reasoning: 'No sentiment data available'
      };
    }

    const latest = this.sentimentHistory[this.sentimentHistory.length - 1];
    const recentAvg = this.getRecentAverage(5);
    
    if (latest.fearGreedIndex >= this.EXTREME_GREED_THRESHOLD) {
      return {
        type: 'EXTREME_GREED',
        strength: (latest.fearGreedIndex - this.EXTREME_GREED_THRESHOLD) * this.SIGNAL_STRENGTH_MULTIPLIER,
        timestamp: latest.timestamp,
        reasoning: `Fear & Greed at ${latest.fearGreedIndex} - contrarian bearish signal`
      };
    }

    if (latest.fearGreedIndex <= this.EXTREME_FEAR_THRESHOLD) {
      return {
        type: 'EXTREME_FEAR',
        strength: (this.EXTREME_FEAR_THRESHOLD - latest.fearGreedIndex) * this.SIGNAL_STRENGTH_MULTIPLIER,
        timestamp: latest.timestamp,
        reasoning: `Fear & Greed at ${latest.fearGreedIndex} - contrarian bullish signal`
      };
    }

    return {
      type: 'NEUTRAL',
      strength: 0,
      timestamp: latest.timestamp,
      reasoning: `Fear & Greed at ${latest.fearGreedIndex} - no contrarian signal`
    };
  }

  private getRecentAverage(periods: number): number {
    const recent = this.sentimentHistory.slice(-periods);
    return recent.reduce((sum, data) => sum + data.fearGreedIndex, 0) / recent.length;
  }

  getSentimentTrend(): 'IMPROVING' | 'DETERIORATING' | 'STABLE' {
    if (this.sentimentHistory.length < 3) return 'STABLE';
    
    const recent3 = this.sentimentHistory.slice(-3).map(d => d.fearGreedIndex);
    const trend = recent3[2] - recent3[0];
    
    if (trend > 5) return 'IMPROVING';
    if (trend < -5) return 'DETERIORATING';
    return 'STABLE';
  }

  getContrarianOpportunityScore(): number {
    const signal = this.getCurrentSignal();
    const trend = this.getSentimentTrend();
    
    let score = signal.strength;
    
    // Boost score if trend reinforces contrarian signal
    if (signal.type === 'EXTREME_FEAR' && trend === 'DETERIORATING') {
      score *= 1.5;
    }
    if (signal.type === 'EXTREME_GREED' && trend === 'IMPROVING') {
      score *= 1.5;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Mock data generator for testing
  generateMockSentiment(): SentimentData {
    return {
      timestamp: Date.now(),
      bullishPercent: Math.random() * 100,
      bearishPercent: Math.random() * 100,
      fearGreedIndex: Math.random() * 100,
      source: 'mock'
    };
  }
}

export { CTSentimentContrarianMonitor, SentimentData, ContrarianSignal };