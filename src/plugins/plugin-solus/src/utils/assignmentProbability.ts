/**
 * Assignment probability for options: P(spot > strike at expiry) under GBM.
 * Same quantity as skills/quant/1.py (binary contract). Risk-neutral: P = N(d2).
 * Used by Solus options context to show assignment prob for best CC/CSP strikes.
 */

/** Normal CDF (standard normal). Abramowitz & Stegun 26.2.17: Phi(x) = 1 - phi(x)*(b1*t+...+b5*t^5), t=1/(1+0.2316419*x). */
export function normalCDF(x: number): number {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const phi = (z: number) =>
    (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-(z * z) / 2);

  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
    return 1.0 - phi(x) * poly;
  }
  return 1.0 - normalCDF(-x);
}

export interface AssignmentProbabilityParams {
  spot: number;
  strike: number;
  /** Annual volatility as decimal (e.g. 0.55 for 55%). */
  sigmaAnnual: number;
  /** Time to expiry in years (e.g. 7/365 for one week). */
  TYears: number;
}

export interface AssignmentProbabilityResult {
  probability: number;
  ci95: [number, number];
}

/**
 * P(spot > strike at expiry) under GBM, risk-neutral (r=0).
 * Closed-form: P = N(d2), d2 = (ln(S0/K) - 0.5*sigma^2*T) / (sigma*sqrt(T)).
 * CI uses same SE as quant 1.py: se = sqrt(p*(1-p)/n) with n=10000.
 */
export function assignmentProbabilityGBM(
  params: AssignmentProbabilityParams,
): AssignmentProbabilityResult {
  const { spot, strike, sigmaAnnual, TYears } = params;
  if (spot <= 0 || strike <= 0 || sigmaAnnual <= 0 || TYears <= 0) {
    return { probability: 0.5, ci95: [0, 1] };
  }
  const sqrtT = Math.sqrt(TYears);
  const d2 =
    (Math.log(spot / strike) - 0.5 * sigmaAnnual * sigmaAnnual * TYears) /
    (sigmaAnnual * sqrtT);
  const p = normalCDF(d2);
  const pClamped = Math.max(0, Math.min(1, p));
  const n = 10_000;
  const se = Math.sqrt((pClamped * (1 - pClamped)) / n);
  const ciLower = Math.max(0, pClamped - 1.96 * se);
  const ciUpper = Math.min(1, pClamped + 1.96 * se);
  return {
    probability: pClamped,
    ci95: [ciLower, ciUpper],
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FRIDAY_DOW = 5;
const EXPIRY_HOUR_UTC = 8;

/**
 * Next Friday 08:00 UTC as timestamp (ms since epoch).
 * If today is Friday and before 08:00 UTC, returns today 08:00; else next Friday.
 */
export function getNextFriday0800UTC(fromDate: Date = new Date()): number {
  const utc = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
      fromDate.getUTCHours(),
      fromDate.getUTCMinutes(),
      fromDate.getUTCSeconds(),
    ),
  );
  const dow = utc.getUTCDay();
  const hour = utc.getUTCHours();
  let daysAhead = FRIDAY_DOW - dow;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && hour >= EXPIRY_HOUR_UTC) daysAhead = 7;
  const nextFriday = new Date(utc);
  nextFriday.setUTCDate(utc.getUTCDate() + daysAhead);
  nextFriday.setUTCHours(EXPIRY_HOUR_UTC, 0, 0, 0);
  return nextFriday.getTime();
}

/**
 * Time to next Friday 08:00 UTC in years (for use in assignmentProbabilityGBM).
 */
export function getTYearsToNextFriday(fromDate: Date = new Date()): number {
  const next = getNextFriday0800UTC(fromDate);
  const now = fromDate.getTime();
  const msDiff = Math.max(0, next - now);
  return msDiff / (365.25 * MS_PER_DAY);
}
