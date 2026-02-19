import axios from 'axios';

interface FedChairOdds {
  candidate: string;
  odds: number;
  impliedProbability: number;
  lastUpdated: Date;
}

interface PredictItMarket {
  id: number;
  shortName: string;
  name: string;
  contracts: Array<{
    id: number;
    name: string;
    shortName: string;
    lastTradePrice: number;
    bestBuyYesCost: number;
    bestBuyNoCost: number;
    bestSellYesCost: number;
    bestSellNoCost: number;
  }>;
}

class FedChairOddsTracker {
  private readonly PREDICTIT_API = 'https://www.predictit.org/api/marketdata/all/';
  private readonly FED_CHAIR_KEYWORDS = ['fed', 'chair', 'federal reserve', 'powell', 'yellen'];
  
  async fetchFedChairOdds(): Promise<FedChairOdds[]> {
    try {
      const response = await axios.get(this.PREDICTIT_API);
      const markets: PredictItMarket[] = response.data.markets;
      
      const fedChairMarkets = markets.filter(market => 
        this.FED_CHAIR_KEYWORDS.some(keyword => 
          market.name.toLowerCase().includes(keyword.toLowerCase()) ||
          market.shortName.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      const odds: FedChairOdds[] = [];
      
      for (const market of fedChairMarkets) {
        for (const contract of market.contracts) {
          const price = contract.lastTradePrice || contract.bestBuyYesCost || 0;
          if (price > 0) {
            odds.push({
              candidate: this.cleanCandidateName(contract.name),
              odds: this.priceToOdds(price),
              impliedProbability: price,
              lastUpdated: new Date()
            });
          }
        }
      }
      
      return odds.sort((a, b) => b.impliedProbability - a.impliedProbability);
    } catch (error) {
      console.error('Error fetching Fed chair odds:', error);
      return [];
    }
  }
  
  private cleanCandidateName(name: string): string {
    return name
      .replace(/Will\s+/i, '')
      .replace(/\s+be\s+.*/i, '')
      .replace(/\s+become\s+.*/i, '')
      .trim();
  }
  
  private priceToOdds(price: number): number {
    if (price === 0) return 0;
    const decimal = 1 / price;
    return Math.round((decimal - 1) * 100) / 100;
  }
  
  async trackWarshOdds(): Promise<FedChairOdds | null> {
    const allOdds = await this.fetchFedChairOdds();
    const warshOdds = allOdds.find(odds => 
      odds.candidate.toLowerCase().includes('warsh') ||
      odds.candidate.toLowerCase().includes('kevin warsh')
    );
    
    if (warshOdds) {
      console.log(`Warsh Fed Chair Odds: ${warshOdds.odds}:1 (${(warshOdds.impliedProbability * 100).toFixed(1)}%)`);
    } else {
      console.log('Warsh not found in current Fed chair markets');
    }
    
    return warshOdds || null;
  }
  
  async getTopCandidates(limit: number = 5): Promise<FedChairOdds[]> {
    const odds = await this.fetchFedChairOdds();
    return odds.slice(0, limit);
  }
}

export default FedChairOddsTracker;

// Usage example
const tracker = new FedChairOddsTracker();
tracker.trackWarshOdds();