/**
 * Implied probability for binary threshold: P(BTC > K at T).
 * Black-Scholes lite: N(d2) with r=0, using spot, strike, time to expiry, and vol.
 */

/** Standard normal CDF (approximation) */
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * P(spot > strike at expiry) for binary option.
 * d2 = (ln(S/K) + (r - sigma^2/2)*T) / (sigma * sqrt(T)); r=0.
 * prob = N(d2).
 */
export function impliedProbabilityAbove(
  spot: number,
  strike: number,
  expiryMs: number,
  sigmaAnnual: number,
): number {
  if (spot <= 0 || strike <= 0) return 0.5;
  const now = Date.now();
  const T = (expiryMs - now) / (365 * 24 * 60 * 60 * 1000);
  if (T <= 0) return spot > strike ? 1 : 0;
  const sigma = Math.max(0.01, Math.min(2, sigmaAnnual));
  const sqrtT = Math.sqrt(T);
  const d2 =
    (Math.log(spot / strike) - 0.5 * sigma * sigma * T) / (sigma * sqrtT);
  return normCdf(d2);
}

const MIN_VOL = 0.2;
const MAX_VOL = 2.0;

export function clampVol(vol: number): number {
  return Math.max(MIN_VOL, Math.min(MAX_VOL, vol));
}
