interface BTCCoveredCallParams {
  spotPrice: number;
  strikePrice: number;
  premium: number;
  expiration: Date;
  btcAmount: number;
}

interface CoveredCallPosition {
  id: string;
  btcHeld: number;
  callSold: {
    strike: number;
    premium: number;
    expiration: Date;
  };
  maxProfit: number;
  breakeven: number;
  status: 'active' | 'assigned' | 'expired' | 'closed';
}

class BTCCoveredCallExecutor {
  private positions: Map<string, CoveredCallPosition> = new Map();

  execute(params: BTCCoveredCallParams): CoveredCallPosition {
    const { spotPrice, strikePrice, premium, expiration, btcAmount } = params;
    
    // Validation
    if (btcAmount <= 0) throw new Error('BTC amount must be positive');
    if (strikePrice <= spotPrice) throw new Error('Strike should be above spot for covered call');
    if (premium <= 0) throw new Error('Premium must be positive');

    const position: CoveredCallPosition = {
      id: this.generateId(),
      btcHeld: btcAmount,
      callSold: {
        strike: strikePrice,
        premium,
        expiration
      },
      maxProfit: (strikePrice - spotPrice) * btcAmount + premium,
      breakeven: spotPrice - premium / btcAmount,
      status: 'active'
    };

    this.positions.set(position.id, position);
    return position;
  }

  evaluatePosition(positionId: string, currentSpotPrice: number): {
    position: CoveredCallPosition;
    pnl: number;
    recommendation: string;
  } {
    const position = this.positions.get(positionId);
    if (!position) throw new Error('Position not found');

    const intrinsicValue = Math.max(0, currentSpotPrice - position.callSold.strike);
    const btcValue = currentSpotPrice * position.btcHeld;
    const totalPnl = btcValue - intrinsicValue * position.btcHeld + position.callSold.premium;

    let recommendation: string;
    if (currentSpotPrice > position.callSold.strike) {
      recommendation = 'Call likely to be assigned. Consider rolling up/out or prepare for assignment.';
    } else if (currentSpotPrice < position.breakeven) {
      recommendation = 'Position underwater. Monitor for roll down opportunity.';
    } else {
      recommendation = 'Position profitable. Let theta decay work.';
    }

    return {
      position,
      pnl: totalPnl,
      recommendation
    };
  }

  rollPosition(positionId: string, newStrike: number, newPremium: number, newExpiration: Date): CoveredCallPosition {
    const position = this.positions.get(positionId);
    if (!position) throw new Error('Position not found');

    position.callSold.strike = newStrike;
    position.callSold.premium += newPremium;
    position.callSold.expiration = newExpiration;
    position.maxProfit = (newStrike - position.breakeven) * position.btcHeld + position.callSold.premium;

    return position;
  }

  closePosition(positionId: string, buybackPremium: number): number {
    const position = this.positions.get(positionId);
    if (!position) throw new Error('Position not found');

    position.status = 'closed';
    const netPremium = position.callSold.premium - buybackPremium;
    
    this.positions.delete(positionId);
    return netPremium;
  }

  getAllPositions(): CoveredCallPosition[] {
    return Array.from(this.positions.values());
  }

  private generateId(): string {
    return `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { BTCCoveredCallExecutor, BTCCoveredCallParams, CoveredCallPosition };