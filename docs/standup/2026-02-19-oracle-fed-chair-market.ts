interface FedChairEvent {
  date: string;
  time: string;
  event: string;
  chair: string;
  significance: 'high' | 'medium' | 'low';
  marketImpact: string[];
}

interface MarketResponse {
  asset: string;
  preEvent: number;
  postEvent: number;
  volatility: number;
  direction: 'up' | 'down' | 'neutral';
}

class FedChairMarket {
  private events: FedChairEvent[] = [];
  private responses: Map<string, MarketResponse[]> = new Map();

  addEvent(event: FedChairEvent): void {
    this.events.push(event);
  }

  addMarketResponse(eventDate: string, responses: MarketResponse[]): void {
    this.responses.set(eventDate, responses);
  }

  getUpcomingEvents(days: number = 30): FedChairEvent[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    
    return this.events
      .filter(event => new Date(event.date) <= cutoff && new Date(event.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  getHighImpactEvents(): FedChairEvent[] {
    return this.events.filter(event => event.significance === 'high');
  }

  getMarketResponseByEvent(eventDate: string): MarketResponse[] | undefined {
    return this.responses.get(eventDate);
  }

  analyzeVolatilityPattern(asset: string): {
    avgVolatility: number;
    maxVolatility: number;
    events: number;
  } {
    let totalVolatility = 0;
    let maxVol = 0;
    let count = 0;

    this.responses.forEach(responses => {
      const assetResponse = responses.find(r => r.asset === asset);
      if (assetResponse) {
        totalVolatility += assetResponse.volatility;
        maxVol = Math.max(maxVol, assetResponse.volatility);
        count++;
      }
    });

    return {
      avgVolatility: count > 0 ? totalVolatility / count : 0,
      maxVolatility: maxVol,
      events: count
    };
  }

  getEventsByChair(chair: string): FedChairEvent[] {
    return this.events.filter(event => event.chair.toLowerCase().includes(chair.toLowerCase()));
  }

  predictMarketImpact(event: FedChairEvent): string[] {
    const baseImpacts = event.marketImpact;
    
    if (event.significance === 'high') {
      return [...baseImpacts, 'increased_options_activity', 'cross_asset_correlation'];
    }
    
    return baseImpacts;
  }

  exportCalendar(): string {
    return this.events
      .map(event => `${event.date} ${event.time} - ${event.event} (${event.chair}) - ${event.significance.toUpperCase()}`)
      .join('\n');
  }

  getRiskMetrics(eventDate: string): {
    totalAssets: number;
    avgVolatility: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const responses = this.responses.get(eventDate) || [];
    const totalAssets = responses.length;
    const avgVolatility = responses.reduce((sum, r) => sum + r.volatility, 0) / totalAssets || 0;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgVolatility > 0.05) riskLevel = 'high';
    else if (avgVolatility > 0.02) riskLevel = 'medium';
    
    return { totalAssets, avgVolatility, riskLevel };
  }
}

export { FedChairMarket, FedChairEvent, MarketResponse };