interface PredictionMarketData {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  marketCap: number;
  expense_ratio: number;
  inception_date: string;
  underlying_assets: string[];
  aum: number;
  nav: number;
  premium_discount: number;
}

interface MarketEvent {
  event_id: string;
  description: string;
  category: string;
  expiration: string;
  yes_price: number;
  no_price: number;
  volume_24h: number;
  liquidity: number;
}

class BitwisePredictionETFResearcher {
  private baseUrl = 'https://api.bitwiseinvestments.com';
  
  async fetchETFData(symbol: string): Promise<PredictionMarketData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/etf/${symbol}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ETF data for ${symbol}:`, error);
      return null;
    }
  }

  async fetchPredictionMarkets(): Promise<MarketEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/prediction-markets`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.markets || [];
    } catch (error) {
      console.error('Failed to fetch prediction markets:', error);
      return [];
    }
  }

  async analyzePredictionETF(symbol: string = 'BPRD'): Promise<{
    etf: PredictionMarketData | null;
    markets: MarketEvent[];
    analysis: {
      liquidity_score: number;
      diversification_score: number;
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
      recommendation: string;
    };
  }> {
    const [etf, markets] = await Promise.all([
      this.fetchETFData(symbol),
      this.fetchPredictionMarkets()
    ]);

    const analysis = this.generateAnalysis(etf, markets);

    return {
      etf,
      markets: markets.slice(0, 10), // Top 10 markets
      analysis
    };
  }

  private generateAnalysis(etf: PredictionMarketData | null, markets: MarketEvent[]) {
    if (!etf) {
      return {
        liquidity_score: 0,
        diversification_score: 0,
        risk_level: 'HIGH' as const,
        recommendation: 'ETF data unavailable - proceed with caution'
      };
    }

    const liquidity_score = Math.min(100, (etf.volume * etf.aum) / 1000000);
    const diversification_score = Math.min(100, etf.underlying_assets.length * 10);
    
    let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (etf.expense_ratio > 0.75 || liquidity_score < 30) risk_level = 'HIGH';
    if (etf.expense_ratio < 0.35 && liquidity_score > 70) risk_level = 'LOW';

    const recommendation = this.generateRecommendation(etf, liquidity_score, diversification_score, risk_level);

    return {
      liquidity_score: Math.round(liquidity_score),
      diversification_score: Math.round(diversification_score),
      risk_level,
      recommendation
    };
  }

  private generateRecommendation(
    etf: PredictionMarketData, 
    liquidity: number, 
    diversification: number, 
    risk: string
  ): string {
    if (risk === 'HIGH') {
      return `High risk due to ${etf.expense_ratio > 0.75 ? 'high fees' : 'low liquidity'}. Consider alternatives.`;
    }
    
    if (liquidity > 70 && diversification > 50) {
      return `Strong fundamentals with ${etf.expense_ratio}% expense ratio. Good for prediction market exposure.`;
    }
    
    return `Moderate option for prediction market exposure. Monitor liquidity and performance.`;
  }

  async getTopPredictionMarkets(limit: number = 5): Promise<MarketEvent[]> {
    const markets = await this.fetchPredictionMarkets();
    return markets
      .sort((a, b) => b.volume_24h - a.volume_24h)
      .slice(0, limit);
  }
}

export { BitwisePredictionETFResearcher, type PredictionMarketData, type MarketEvent };