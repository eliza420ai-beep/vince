/**
 * Tail risk: P(spot < K by expiry) via importance sampling (skills/quant/3.py).
 * Used for CSP "size or skip" and position assess (e.g. "P(BTC down 15% in 7d)").
 */

import { normalCDF } from "./assignmentProbability";

/** Box-Muller transform: two standard normals from uniform [0,1). */
function boxMuller(u1: number, u2: number): { z1: number; z2: number } {
  const r = Math.sqrt(-2 * Math.log(Math.max(1e-10, u1)));
  const t = 2 * Math.PI * u2;
  return { z1: r * Math.cos(t), z2: r * Math.sin(t) };
}

/**
 * P(spot < K at expiry) under GBM with risk-neutral drift, via importance sampling.
 * K_crash: e.g. 0.15 for "down 15%" => K = S0 * (1 - 0.15).
 * sigma: annual vol as decimal (e.g. 0.55 for 55%).
 * T: time to expiry in years (e.g. 7/365).
 * N_paths: number of MC paths (default 50_000 for runtime; use higher for tests if needed).
 */
export function tailRiskImportanceSampling(
  S0: number,
  K_crash: number,
  sigma: number,
  T: number,
  N_paths: number = 50_000,
): { p: number; se: number } {
  if (S0 <= 0 || sigma <= 0 || T <= 0 || K_crash <= 0 || K_crash >= 1) {
    return { p: 0, se: 0 };
  }
  const K = S0 * (1 - K_crash);
  const mu_original = -0.5 * sigma * sigma;
  const log_threshold = Math.log(K / S0);
  const mu_tilt = log_threshold / T;
  const sigmaSqrtT = sigma * Math.sqrt(T);

  const estimates: number[] = [];
  let n = 0;
  while (n < N_paths) {
    const u1 = Math.random();
    const u2 = Math.random();
    const { z1, z2 } = boxMuller(u1, u2);
    for (const Z of [z1, z2]) {
      if (n >= N_paths) break;
      const logReturnTilted = mu_tilt * T + sigmaSqrtT * Z;
      const S_T = S0 * Math.exp(logReturnTilted);
      const payoff = S_T < K ? 1 : 0;
      const logLR =
        -0.5 * Math.pow((logReturnTilted - mu_original * T) / sigmaSqrtT, 2) +
        0.5 * Math.pow((logReturnTilted - mu_tilt * T) / sigmaSqrtT, 2);
      const LR = Math.exp(logLR);
      estimates.push(payoff * LR);
      n++;
    }
  }

  const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  const variance =
    estimates.reduce((s, x) => s + (x - mean) ** 2, 0) / estimates.length;
  const se = Math.sqrt(variance / estimates.length);
  const p = Math.max(0, Math.min(1, mean));
  return { p, se };
}

/**
 * P(spot < K) using closed-form lognormal (alternative to IS; exact for GBM).
 * P(S_T < K) = N(-d2) where d2 = (ln(S0/K) - 0.5*sigma^2*T) / (sigma*sqrt(T)).
 * Use when tail is not too extreme; IS is better for very rare events.
 */
export function tailRiskClosedForm(
  S0: number,
  K_crash: number,
  sigma: number,
  T: number,
): number {
  if (S0 <= 0 || sigma <= 0 || T <= 0 || K_crash <= 0 || K_crash >= 1) {
    return 0;
  }
  const K = S0 * (1 - K_crash);
  const d2 =
    (Math.log(S0 / K) - 0.5 * sigma * sigma * T) / (sigma * Math.sqrt(T));
  return normalCDF(-d2);
}

/**
 * Tail risk for one asset: P(spot down by crashPct by expiry).
 * Uses closed-form by default (faster); set useImportanceSampling=true for very low probabilities.
 */
export function tailRisk(
  spot: number,
  atmIvPct: number,
  TYears: number,
  crashPct: number,
  useImportanceSampling: boolean = false,
): { p: number; se?: number } {
  const sigma = atmIvPct / 100;
  const K_crash = crashPct / 100;
  if (useImportanceSampling) {
    const { p, se } = tailRiskImportanceSampling(
      spot,
      K_crash,
      sigma,
      TYears,
      50_000,
    );
    return { p, se };
  }
  return { p: tailRiskClosedForm(spot, K_crash, sigma, TYears) };
}
