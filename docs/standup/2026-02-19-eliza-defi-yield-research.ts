import axios from 'axios';

interface YieldOpportunity {
  protocol: string;
  pool: string;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  chain: string;
  token: string;
  category: 'lending' | 'staking' | 'liquidity' | 'farming';
}

class DeFiYieldResearcher {
  private readonly MIN_TVL = 1000000; // $1M minimum TVL
  private readonly MAX_RISK = 'medium';

  async getAaveYields(): Promise<YieldOpportunity[]> {
    try {
      const response = await axios.get('https://api.aave.com/data/liquidity/v2');
      return response.data.reserves.map((reserve: any) => ({
        protocol: 'Aave',
        pool: `${reserve.symbol} Supply`,
        apy: parseFloat(reserve.liquidityRate) * 100,
        tvl: parseFloat(reserve.totalLiquidity),
        risk: 'low' as const,
        chain: 'Ethereum',
        token: reserve.symbol,
        category: 'lending' as const
      }));
    } catch {
      return [];
    }
  }

  async getCompoundYields(): Promise<YieldOpportunity[]> {
    try {
      const response = await axios.get('https://api.compound.finance/api/v2/ctoken');
      return response.data.cToken.map((token: any) => ({
        protocol: 'Compound',
        pool: `${token.underlying_symbol} Supply`,
        apy: parseFloat(token.supply_rate.value) * 100,
        tvl: parseFloat(token.total_supply.value),
        risk: 'low' as const,
        chain: 'Ethereum',
        token: token.underlying_symbol,
        category: 'lending' as const
      }));
    } catch {
      return [];
    }
  }

  async getUniswapV3Yields(): Promise<YieldOpportunity[]> {
    // Simplified - would need The Graph API integration
    return [
      {
        protocol: 'Uniswap V3',
        pool: 'USDC/ETH 0.05%',
        apy: 12.5,
        tvl: 45000000,
        risk: 'medium' as const,
        chain: 'Ethereum',
        token: 'USDC-ETH',
        category: 'liquidity' as const
      }
    ];
  }

  async getLidoStaking(): Promise<YieldOpportunity[]> {
    try {
      const response = await axios.get('https://stake.lido.fi/api/sma-steth-apr');
      return [{
        protocol: 'Lido',
        pool: 'stETH Staking',
        apy: parseFloat(response.data.smaApr),
        tvl: 32000000000, // Approximate
        risk: 'low' as const,
        chain: 'Ethereum',
        token: 'ETH',
        category: 'staking' as const
      }];
    } catch {
      return [];
    }
  }

  filterOpportunities(opportunities: YieldOpportunity[]): YieldOpportunity[] {
    return opportunities
      .filter(opp => opp.tvl >= this.MIN_TVL)
      .filter(opp => opp.risk === 'low' || opp.risk === 'medium')
      .sort((a, b) => b.apy - a.apy);
  }

  async researchYields(): Promise<{
    opportunities: YieldOpportunity[];
    summary: {
      topYield: YieldOpportunity | null;
      averageApy: number;
      totalOpportunities: number;
      byCategory: Record<string, number>;
    }
  }> {
    const [aave, compound, uniswap, lido] = await Promise.all([
      this.getAaveYields(),
      this.getCompoundYields(),
      this.getUniswapV3Yields(),
      this.getLidoStaking()
    ]);

    const allOpportunities = [...aave, ...compound, ...uniswap, ...lido];
    const filtered = this.filterOpportunities(allOpportunities);

    const byCategory = filtered.reduce((acc, opp) => {
      acc[opp.category] = (acc[opp.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      opportunities: filtered,
      summary: {
        topYield: filtered[0] || null,
        averageApy: filtered.reduce((sum, opp) => sum + opp.apy, 0) / filtered.length || 0,
        totalOpportunities: filtered.length,
        byCategory
      }
    };
  }
}

export const yieldResearcher = new DeFiYieldResearcher();
export type { YieldOpportunity };