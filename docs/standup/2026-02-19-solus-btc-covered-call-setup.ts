interface CoveredCallSetup {
  spotPrice: number;
  strikePrice: number;
  expiration: string;
  premium: number;
  btcHolding: number;
  maxLoss: number;
  maxGain: number;
  breakeven: number;
  roi: number;
}

class BTCCoveredCallCalculator {
  private spotPrice: number;
  private btcHolding: number;

  constructor(spotPrice: number, btcHolding: number) {
    this.spotPrice = spotPrice;
    this.btcHolding = btcHolding;
  }

  calculateSetup(
    strikePrice: number,
    premium: number,
    daysToExpiration: number
  ): CoveredCallSetup {
    const totalPremium = premium * this.btcHolding;
    const maxLoss = (this.spotPrice - premium) * this.btcHolding;
    const maxGain = (strikePrice - this.spotPrice + premium) * this.btcHolding;
    const breakeven = this.spotPrice - premium;
    const roi = (totalPremium / (this.spotPrice * this.btcHolding)) * 100;
    
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + daysToExpiration);

    return {
      spotPrice: this.spotPrice,
      strikePrice,
      expiration: expiration.toISOString().split('T')[0],
      premium,
      btcHolding: this.btcHolding,
      maxLoss,
      maxGain,
      breakeven,
      roi
    };
  }

  findOptimalStrike(
    premiumData: Array<{strike: number, premium: number}>,
    targetROI: number = 2.0
  ): CoveredCallSetup | null {
    let bestSetup: CoveredCallSetup | null = null;
    let bestScore = 0;

    for (const data of premiumData) {
      if (data.strike <= this.spotPrice) continue;
      
      const setup = this.calculateSetup(data.strike, data.premium, 30);
      
      if (setup.roi >= targetROI) {
        const upside = (data.strike - this.spotPrice) / this.spotPrice;
        const score = setup.roi * upside;
        
        if (score > bestScore) {
          bestScore = score;
          bestSetup = setup;
        }
      }
    }

    return bestSetup;
  }

  analyzeRisk(setup: CoveredCallSetup): {
    assignmentProbability: number;
    timeDecayBenefit: number;
    volatilityRisk: string;
  } {
    const moneyness = setup.strikePrice / this.spotPrice;
    const assignmentProb = moneyness < 1.05 ? 0.7 : moneyness < 1.1 ? 0.4 : 0.2;
    const timeDecayBenefit = setup.premium / setup.strikePrice;
    
    let volatilityRisk = 'LOW';
    if (moneyness < 1.05) volatilityRisk = 'HIGH';
    else if (moneyness < 1.1) volatilityRisk = 'MEDIUM';

    return {
      assignmentProbability: assignmentProb,
      timeDecayBenefit,
      volatilityRisk
    };
  }

  printSetup(setup: CoveredCallSetup): void {
    console.log('=== BTC COVERED CALL SETUP ===');
    console.log(`Spot: $${setup.spotPrice.toLocaleString()}`);
    console.log(`Strike: $${setup.strikePrice.toLocaleString()}`);
    console.log(`Premium: $${setup.premium.toLocaleString()}`);
    console.log(`Expiration: ${setup.expiration}`);
    console.log(`BTC Holding: ${setup.btcHolding}`);
    console.log(`Max Gain: $${setup.maxGain.toLocaleString()}`);
    console.log(`Max Loss: $${setup.maxLoss.toLocaleString()}`);
    console.log(`Breakeven: $${setup.breakeven.toLocaleString()}`);
    console.log(`ROI: ${setup.roi.toFixed(2)}%`);
    
    const risk = this.analyzeRisk(setup);
    console.log(`Assignment Risk: ${(risk.assignmentProbability * 100).toFixed(0)}%`);
    console.log(`Volatility Risk: ${risk.volatilityRisk}`);
  }
}

export { BTCCoveredCallCalculator, CoveredCallSetup };