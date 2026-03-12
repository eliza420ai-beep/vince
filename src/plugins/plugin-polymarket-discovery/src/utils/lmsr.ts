/**
 * LMSR and EV Math Utilities
 *
 * Pure math for Polymarket: Expected Value, Kelly sizing, price impact,
 * and base rate warnings. Based on the Logarithmic Market Scoring Rule (LMSR)
 * and the mathematical trading framework.
 */

export interface OrderbookLevel {
  price: number;
  size: number;
}

/**
 * LMSR cost function: C(q) = b × ln(Σ e^(qi/b))
 * Used for educational context; Polymarket uses orderbook for actual pricing.
 */
export function lmsrCost(q: number[], b: number): number {
  const sum = q.reduce((acc, qi) => acc + Math.exp(qi / b), 0);
  return b * Math.log(sum);
}

/**
 * LMSR price for outcome k: p_k(q) = e^(qk/b) / Σ e^(qi/b)
 * Softmax - same math as neural network output probabilities.
 */
export function lmsrPrice(q: number[], b: number, outcome: number): number {
  const expQ = q.map((qi) => Math.exp(qi / b));
  const sum = expQ.reduce((a, x) => a + x, 0);
  return expQ[outcome] / sum;
}

/**
 * Expected Value per share for a binary market.
 * EV = yourProb × (1 - marketPrice) - (1 - yourProb) × marketPrice
 *
 * @param marketPrice - Current market price (0-1) for the outcome you're buying
 * @param yourProb - Your estimated true probability (0-1)
 * @returns EV per $1 share; positive = edge, negative = no trade
 */
export function calculateEV(marketPrice: number, yourProb: number): number {
  return yourProb * (1 - marketPrice) - (1 - yourProb) * marketPrice;
}

/**
 * Kelly criterion: f* = (p × b - q) / b
 * p = win prob, q = 1-p, b = payout multiple (net odds)
 *
 * @param winProb - Your estimated win probability (0-1)
 * @param payoutMultiple - Net payout multiple (e.g. 1:1 = 1, 2:1 = 2)
 * @returns Fraction of bankroll to bet (0-1); clamp to [0, 1]
 */
export function calculateKelly(
  winProb: number,
  payoutMultiple: number,
): number {
  const q = 1 - winProb;
  const kelly = (winProb * payoutMultiple - q) / payoutMultiple;
  return Math.max(0, Math.min(1, kelly));
}

/**
 * Walk the orderbook to compute average fill and total cost for target shares.
 * Uses real CLOB orderbook data (more accurate than theoretical LMSR).
 *
 * @param levels - Orderbook levels (asks for buying, bids for selling)
 * @param targetShares - Number of shares to simulate
 * @returns avgFill (weighted avg price), finalPrice (last fill), totalCost
 */
export function simulateOrderbookImpact(
  levels: OrderbookLevel[],
  targetShares: number,
): { avgFill: number; finalPrice: number; totalCost: number } {
  if (levels.length === 0 || targetShares <= 0) {
    return { avgFill: 0, finalPrice: 0, totalCost: 0 };
  }

  let remaining = targetShares;
  let totalCost = 0;
  let lastPrice = 0;

  for (const level of levels) {
    if (remaining <= 0) break;

    const fillSize = Math.min(remaining, level.size);
    const fillCost = fillSize * level.price;
    totalCost += fillCost;
    remaining -= fillSize;
    lastPrice = level.price;

    if (remaining <= 0) break;
  }

  const filledShares = targetShares - remaining;
  const avgFill = filledShares > 0 ? totalCost / filledShares : 0;

  return {
    avgFill,
    finalPrice: lastPrice,
    totalCost,
  };
}

/**
 * Convert OrderBookEntry[] (price/size strings) to OrderbookLevel[] (numbers)
 */
export function parseOrderbookLevels(
  entries: { price: string; size: string }[],
): OrderbookLevel[] {
  return entries.map((e) => ({
    price: parseFloat(e.price),
    size: parseFloat(e.size),
  }));
}

/**
 * Check if price impact eats more than 50% of edge.
 *
 * @param edge - Raw edge (EV per share)
 * @param avgFill - Average fill price from simulateOrderbookImpact
 * @param marketPrice - Starting market price for the outcome being bought
 */
export function checkImpactEatsEdge(
  edge: number,
  avgFill: number,
  marketPrice: number,
): boolean {
  if (Math.abs(edge) < 0.001) return false;

  const impact = Math.abs(avgFill - marketPrice);
  const edgeAbs = Math.abs(edge);
  return impact > edgeAbs * 0.5;
}

/**
 * Base rate warning for high-confidence markets.
 * "Contracts at 85¢+ resolve NO ~15% of the time — check your base rate"
 */
export function getBaseRateWarning(marketPrice: number): string | null {
  if (marketPrice >= 0.85) {
    return "Contracts at 85¢+ resolve NO ~15% of the time. Check your base rate before sizing large.";
  }
  if (marketPrice >= 0.75) {
    return "Markets at 75–85¢ resolve NO ~20% of the time. Base rate matters.";
  }
  if (marketPrice <= 0.15) {
    return "Markets at 15¢ or below resolve YES ~15% of the time. Don't overconfidently short.";
  }
  if (marketPrice <= 0.25) {
    return "Markets at 15–25¢ resolve YES ~20% of the time. Base rate matters.";
  }
  return null;
}
