import { ethers } from 'ethers';

interface PendleMarket {
  address: string;
  name: string;
  underlyingAsset: string;
  maturity: string;
  impliedAPY: number;
  fixedAPY: number;
  totalLiquidity: number;
  utilization: number;
}

interface MeridianVault {
  address: string;
  name: string;
  asset: string;
  totalAssets: number;
  apy: number;
  tvl: number;
  strategy: string;
}

class YieldResearcher {
  private provider: ethers.Provider;
  
  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getPendleMarkets(): Promise<PendleMarket[]> {
    // Mock data - replace with actual Pendle API calls
    return [
      {
        address: '0x1234...abcd',
        name: 'PT-stETH-26DEC2024',
        underlyingAsset: 'stETH',
        maturity: '2024-12-26',
        impliedAPY: 8.5,
        fixedAPY: 7.2,
        totalLiquidity: 15000000,
        utilization: 0.78
      },
      {
        address: '0x5678...efgh',
        name: 'PT-USDC-27JUN2025',
        underlyingAsset: 'USDC',
        maturity: '2025-06-27',
        impliedAPY: 12.3,
        fixedAPY: 10.8,
        totalLiquidity: 8500000,
        utilization: 0.92
      }
    ];
  }

  async getMeridianVaults(): Promise<MeridianVault[]> {
    // Mock data - replace with actual Meridian API calls
    return [
      {
        address: '0xabcd...1234',
        name: 'Meridian ETH Vault',
        asset: 'ETH',
        totalAssets: 2500,
        apy: 9.8,
        tvl: 6250000,
        strategy: 'Liquid Staking + DeFi'
      },
      {
        address: '0xefgh...5678',
        name: 'Meridian USDC Vault',
        asset: 'USDC',
        totalAssets: 3200000,
        apy: 11.5,
        tvl: 3200000,
        strategy: 'Money Markets + Yield Farming'
      }
    ];
  }

  async analyzeYieldOpportunities() {
    const [pendleMarkets, meridianVaults] = await Promise.all([
      this.getPendleMarkets(),
      this.getMeridianVaults()
    ]);

    const analysis = {
      pendle: {
        avgImpliedAPY: this.calculateAverage(pendleMarkets, 'impliedAPY'),
        avgFixedAPY: this.calculateAverage(pendleMarkets, 'fixedAPY'),
        totalTVL: pendleMarkets.reduce((sum, m) => sum + m.totalLiquidity, 0),
        highestYield: Math.max(...pendleMarkets.map(m => m.impliedAPY)),
        markets: pendleMarkets
      },
      meridian: {
        avgAPY: this.calculateAverage(meridianVaults, 'apy'),
        totalTVL: meridianVaults.reduce((sum, v) => sum + v.tvl, 0),
        highestYield: Math.max(...meridianVaults.map(v => v.apy)),
        vaults: meridianVaults
      },
      comparison: this.compareProtocols(pendleMarkets, meridianVaults)
    };

    return analysis;
  }

  private calculateAverage(items: any[], field: string): number {
    return items.reduce((sum, item) => sum + item[field], 0) / items.length;
  }

  private compareProtocols(pendleMarkets: PendleMarket[], meridianVaults: MeridianVault[]) {
    const pendleMax = Math.max(...pendleMarkets.map(m => m.impliedAPY));
    const meridianMax = Math.max(...meridianVaults.map(v => v.apy));
    
    return {
      higherYieldProtocol: pendleMax > meridianMax ? 'Pendle' : 'Meridian',
      yieldDifference: Math.abs(pendleMax - meridianMax),
      recommendation: pendleMax > meridianMax 
        ? `Pendle offers ${(pendleMax - meridianMax).toFixed(2)}% higher max yield`
        : `Meridian offers ${(meridianMax - pendleMax).toFixed(2)}% higher max yield`
    };
  }

  async getTopOpportunities(limit: number = 5) {
    const analysis = await this.analyzeYieldOpportunities();
    
    const allOpportunities = [
      ...analysis.pendle.markets.map(m => ({
        protocol: 'Pendle',
        name: m.name,
        yield: m.impliedAPY,
        tvl: m.totalLiquidity,
        risk: m.utilization > 0.9 ? 'High' : m.utilization > 0.7 ? 'Medium' : 'Low'
      })),
      ...analysis.meridian.vaults.map(v => ({
        protocol: 'Meridian',
        name: v.name,
        yield: v.apy,
        tvl: v.tvl,
        risk: 'Medium'
      }))
    ];

    return allOpportunities
      .sort((a, b) => b.yield - a.yield)
      .slice(0, limit);
  }
}

export { YieldResearcher, PendleMarket, MeridianVault };