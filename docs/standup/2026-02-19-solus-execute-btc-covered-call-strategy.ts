interface CoveredCallPosition {
  btcAmount: number;
  strikePrice: number;
  premium: number;
  expiration: Date;
  entryPrice: number;
}

interface MarketData {
  btcPrice: number;
  impliedVolatility: number;
  daysToExpiration: number;
}

class BTCCoveredCallStrategy {
  private positions: CoveredCallPosition[] = [];
  private readonly maxPositions = 3;
  private readonly minDTE = 7;
  private readonly maxDTE = 45;
  private readonly targetDelta = 0.30;
  private readonly minPremium = 0.02; // 2% of BTC value

  calculateStrikePrice(currentPrice: number, targetDelta: number): number {
    // Approximate strike for target delta using simplified BSM
    const strikeMultiplier = 1 + (targetDelta * 0.5);
    return Math.round(currentPrice * strikeMultiplier / 1000) * 1000;
  }

  calculatePremium(spot: number, strike: number, dte: number, iv: number): number {
    // Simplified premium calculation
    const timeValue = Math.sqrt(dte / 365) * iv * spot * 0.4;
    const intrinsicValue = Math.max(0, spot - strike);
    return (intrinsicValue + timeValue) / spot;
  }

  shouldOpenPosition(marketData: MarketData): boolean {
    if (this.positions.length >= this.maxPositions) return false;
    if (marketData.daysToExpiration < this.minDTE || marketData.daysToExpiration > this.maxDTE) return false;
    if (marketData.impliedVolatility < 0.3) return false; // Low vol environment
    
    const strike = this.calculateStrikePrice(marketData.btcPrice, this.targetDelta);
    const premium = this.calculatePremium(marketData.btcPrice, strike, marketData.daysToExpiration, marketData.impliedVolatility);
    
    return premium >= this.minPremium;
  }

  openCoveredCall(btcAmount: number, marketData: MarketData): CoveredCallPosition | null {
    if (!this.shouldOpenPosition(marketData)) return null;

    const strike = this.calculateStrikePrice(marketData.btcPrice, this.targetDelta);
    const premium = this.calculatePremium(marketData.btcPrice, strike, marketData.daysToExpiration, marketData.impliedVolatility);
    
    const position: CoveredCallPosition = {
      btcAmount,
      strikePrice: strike,
      premium: premium * marketData.btcPrice * btcAmount,
      expiration: new Date(Date.now() + marketData.daysToExpiration * 24 * 60 * 60 * 1000),
      entryPrice: marketData.btcPrice
    };

    this.positions.push(position);
    return position;
  }

  shouldRoll(position: CoveredCallPosition, marketData: MarketData): boolean {
    const daysLeft = Math.ceil((position.expiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    
    // Roll if < 7 days and OTM
    if (daysLeft <= 7 && marketData.btcPrice < position.strikePrice) return true;
    
    // Roll if ITM and can collect more premium
    if (marketData.btcPrice > position.strikePrice * 1.05) {
      const newStrike = this.calculateStrikePrice(marketData.btcPrice, this.targetDelta);
      const newPremium = this.calculatePremium(marketData.btcPrice, newStrike, 30, marketData.impliedVolatility);
      return newPremium >= this.minPremium;
    }

    return false;
  }

  rollPosition(positionIndex: number, marketData: MarketData): CoveredCallPosition | null {
    if (positionIndex >= this.positions.length) return null;
    
    const oldPosition = this.positions[positionIndex];
    if (!this.shouldRoll(oldPosition, marketData)) return null;

    // Close old position and open new one
    this.positions.splice(positionIndex, 1);
    return this.openCoveredCall(oldPosition.btcAmount, marketData);
  }

  getPositionPnL(position: CoveredCallPosition, currentPrice: number): number {
    const stockPnL = (currentPrice - position.entryPrice) * position.btcAmount;
    const optionPnL = position.premium - Math.max(0, (currentPrice - position.strikePrice) * position.btcAmount);
    return stockPnL + optionPnL;
  }

  execute(btcHoldings: number, marketData: MarketData): {
    action: string;
    position?: CoveredCallPosition;
    totalPnL: number;
  } {
    // Check existing positions for rolls
    for (let i = 0; i < this.positions.length; i++) {
      if (this.shouldRoll(this.positions[i], marketData)) {
        const rolledPosition = this.rollPosition(i, marketData);
        if (rolledPosition) {
          return {
            action: `Rolled position: Strike ${rolledPosition.strikePrice}, Premium ${rolledPosition.premium.toFixed(4)} BTC`,
            position: rolledPosition,
            totalPnL: this.getTotalPnL(marketData.btcPrice)
          };
        }
      }
    }

    // Open new position if criteria met
    const availableBTC = btcHoldings - this.positions.reduce((sum, pos) => sum + pos.btcAmount, 0);
    if (availableBTC > 0 && this.shouldOpenPosition(marketData)) {
      const positionSize = Math.min(availableBTC, btcHoldings * 0.33); // Max 33% per position
      const newPosition = this.openCoveredCall(positionSize, marketData);
      
      if (newPosition) {
        return {
          action: `Opened covered call: ${positionSize} BTC @ Strike ${newPosition.strikePrice}, Premium ${newPosition.premium.toFixed(4)} BTC`,
          position: newPosition,
          totalPnL: this.getTotalPnL(marketData.btcPrice)
        };
      }
    }

    return {
      action: 'Hold - No favorable setups',
      totalPnL: this.getTotalPnL(marketData.btcPrice)
    };
  }

  private getTotalPnL(currentPrice: number): number {
    return this.positions.reduce((total, pos) => total + this.getPositionPnL(pos, currentPrice), 0);
  }
}

export { BTCCoveredCallStrategy, CoveredCallPosition, MarketData };