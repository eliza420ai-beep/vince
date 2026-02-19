import { ethers } from 'ethers';

interface PendleMarket {
  address: string;
  pt: string;
  yt: string;
  sy: string;
  underlyingAsset: string;
  maturity: number;
  impliedAPY: number;
  fixedAPY: number;
}

interface PendlePosition {
  market: string;
  ptBalance: number;
  ytBalance: number;
  lpBalance: number;
  unrealizedPnL: number;
}

class PendleProtocolResearch {
  private provider: ethers.Provider;
  private readonly PENDLE_ROUTER = '0x888888888889758F76e7103c6CbF23ABbF58F946';
  private readonly PENDLE_API = 'https://api-v2.pendle.finance';

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async getActiveMarkets(): Promise<PendleMarket[]> {
    try {
      const response = await fetch(`${this.PENDLE_API}/core/v1/1/markets`);
      const data = await response.json();
      
      return data.results.map((market: any) => ({
        address: market.address,
        pt: market.pt.address,
        yt: market.yt.address,
        sy: market.sy.address,
        underlyingAsset: market.underlyingAsset.symbol,
        maturity: market.expiry,
        impliedAPY: market.impliedApy,
        fixedAPY: market.fixedApy
      }));
    } catch (error) {
      console.error('Failed to fetch Pendle markets:', error);
      return [];
    }
  }

  async getUserPositions(userAddress: string): Promise<PendlePosition[]> {
    try {
      const response = await fetch(
        `${this.PENDLE_API}/core/v1/1/users/${userAddress}/positions`
      );
      const data = await response.json();
      
      return data.positions.map((pos: any) => ({
        market: pos.market.address,
        ptBalance: parseFloat(pos.ptBalance),
        ytBalance: parseFloat(pos.ytBalance),
        lpBalance: parseFloat(pos.lpBalance),
        unrealizedPnL: parseFloat(pos.unrealizedPnl)
      }));
    } catch (error) {
      console.error('Failed to fetch user positions:', error);
      return [];
    }
  }

  async calculateYieldStripping(
    underlyingAmount: number,
    marketAddress: string
  ): Promise<{ ptReceived: number; ytReceived: number; breakEvenYield: number }> {
    try {
      const response = await fetch(
        `${this.PENDLE_API}/core/v1/1/markets/${marketAddress}/mint-py-from-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiver: '0x0000000000000000000000000000000000000000',
            tokenIn: underlyingAmount.toString(),
            slippage: 0.005
          })
        }
      );
      
      const data = await response.json();
      
      return {
        ptReceived: parseFloat(data.data.netPtOut),
        ytReceived: parseFloat(data.data.netYtOut),
        breakEvenYield: parseFloat(data.data.priceImpact)
      };
    } catch (error) {
      console.error('Failed to calculate yield stripping:', error);
      return { ptReceived: 0, ytReceived: 0, breakEvenYield: 0 };
    }
  }

  async getMarketAnalytics(marketAddress: string) {
    try {
      const [marketData, volumeData] = await Promise.all([
        fetch(`${this.PENDLE_API}/core/v1/1/markets/${marketAddress}`).then(r => r.json()),
        fetch(`${this.PENDLE_API}/core/v1/1/markets/${marketAddress}/volume`).then(r => r.json())
      ]);

      return {
        tvl: parseFloat(marketData.totalPt) + parseFloat(marketData.totalSy),
        volume24h: volumeData.volume24h,
        utilization: parseFloat(marketData.totalPt) / parseFloat(marketData.totalSy),
        timeToMaturity: (marketData.expiry - Date.now() / 1000) / (24 * 3600),
        impliedVolatility: marketData.impliedApy - marketData.underlyingApy
      };
    } catch (error) {
      console.error('Failed to get market analytics:', error);
      return null;
    }
  }

  async findArbitrageOpportunities(): Promise<any[]> {
    const markets = await this.getActiveMarkets();
    const opportunities = [];

    for (const market of markets) {
      const analytics = await this.getMarketAnalytics(market.address);
      if (!analytics) continue;

      // Look for mispriced PT vs underlying yield
      const yieldDifferential = market.impliedAPY - market.fixedAPY;
      
      if (Math.abs(yieldDifferential) > 0.02) { // 2% threshold
        opportunities.push({
          market: market.address,
          asset: market.underlyingAsset,
          strategy: yieldDifferential > 0 ? 'buy_pt_sell_yt' : 'sell_pt_buy_yt',
          expectedReturn: Math.abs(yieldDifferential),
          timeToMaturity: analytics.timeToMaturity,
          risk: analytics.impliedVolatility
        });
      }
    }

    return opportunities.sort((a, b) => b.expectedReturn - a.expectedReturn);
  }
}

export { PendleProtocolResearch, type PendleMarket, type PendlePosition };