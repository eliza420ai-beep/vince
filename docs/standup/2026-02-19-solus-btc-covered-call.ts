interface BTCCoveredCallParams {
  spotPrice: number;
  strikePrice: number;
  premium: number;
  expirationDays: number;
  volatility: number;
  riskFreeRate: number;
}

interface BTCCoveredCallResult {
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  probabilityITM: number;
  timeDecay: number;
  delta: number;
  theta: number;
  roi: number;
}

class BTCCoveredCall {
  private params: BTCCoveredCallParams;

  constructor(params: BTCCoveredCallParams) {
    this.params = params;
  }

  private blackScholes(S: number, K: number, T: number, r: number, sigma: number): number {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateDelta(): number {
    const { spotPrice, strikePrice, expirationDays, riskFreeRate, volatility } = this.params;
    const T = expirationDays / 365;
    const d1 = (Math.log(spotPrice / strikePrice) + (riskFreeRate + 0.5 * volatility * volatility) * T) / 
               (volatility * Math.sqrt(T));
    return this.normalCDF(d1);
  }

  private calculateTheta(): number {
    const { spotPrice, strikePrice, expirationDays, riskFreeRate, volatility } = this.params;
    const T = expirationDays / 365;
    const d1 = (Math.log(spotPrice / strikePrice) + (riskFreeRate + 0.5 * volatility * volatility) * T) / 
               (volatility * Math.sqrt(T));
    const d2 = d1 - volatility * Math.sqrt(T);
    
    const theta = -(spotPrice * this.normalPDF(d1) * volatility) / (2 * Math.sqrt(T)) -
                  riskFreeRate * strikePrice * Math.exp(-riskFreeRate * T) * this.normalCDF(d2);
    
    return theta / 365; // Daily theta
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  analyze(): BTCCoveredCallResult {
    const { spotPrice, strikePrice, premium, expirationDays, volatility, riskFreeRate } = this.params;
    const T = expirationDays / 365;

    // Max profit: premium + (strike - spot) if called away
    const maxProfit = strikePrice > spotPrice ? 
      premium + (strikePrice - spotPrice) : 
      premium;

    // Max loss: unlimited downside minus premium collected
    const maxLoss = spotPrice - premium;

    // Breakeven: spot price minus premium
    const breakeven = spotPrice - premium;

    // Probability ITM using Black-Scholes
    const d2 = (Math.log(spotPrice / strikePrice) + (riskFreeRate - 0.5 * volatility * volatility) * T) / 
               (volatility * Math.sqrt(T));
    const probabilityITM = this.normalCDF(d2);

    // Time decay (theta)
    const theta = this.calculateTheta();
    const timeDecay = Math.abs(theta);

    // Delta (position delta = stock delta - call delta)
    const callDelta = this.calculateDelta();
    const delta = 1 - callDelta; // Net position delta

    // ROI calculation
    const roi = (maxProfit / spotPrice) * 100;

    return {
      maxProfit,
      maxLoss,
      breakeven,
      probabilityITM,
      timeDecay,
      delta,
      theta,
      roi
    };
  }

  getRecommendation(): string {
    const result = this.analyze();
    const { spotPrice, strikePrice, premium } = this.params;

    if (result.probabilityITM < 0.3 && result.roi > 2) {
      return "STRONG BUY - Low assignment risk, good premium";
    } else if (result.probabilityITM < 0.5 && result.roi > 1) {
      return "BUY - Decent risk/reward profile";
    } else if (result.probabilityITM > 0.7) {
      return "CAUTION - High assignment probability";
    } else {
      return "NEUTRAL - Standard covered call metrics";
    }
  }
}

export { BTCCoveredCall, BTCCoveredCallParams, BTCCoveredCallResult };