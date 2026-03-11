/**
 * Gaussian copula for correlated assignment outcomes (skills/quant/7.py).
 * Given per-position P(assigned), returns joint P(at least one), P(all), P(none).
 */

import { normalCDF } from "./assignmentProbability";

/** Box-Muller: two standard normals from U(0,1). */
function boxMuller(u1: number, u2: number): { z1: number; z2: number } {
  const r = Math.sqrt(-2 * Math.log(Math.max(1e-10, u1)));
  const t = 2 * Math.PI * u2;
  return { z1: r * Math.cos(t), z2: r * Math.sin(t) };
}

/**
 * In-place Cholesky L of A (symmetric positive definite). A is overwritten with L (lower triangle).
 * Returns false if not positive definite.
 */
function cholesky(A: number[][]): boolean {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = A[i]![j]!;
      for (let k = 0; k < i; k++) s -= (A[i]![k] ?? 0) * (A[j]![k] ?? 0);
      if (i === j) {
        if (s <= 0) return false;
        A[i]![i] = Math.sqrt(s);
      } else {
        A[j]![i] = s / (A[i]![i] ?? 1);
      }
    }
  }
  return true;
}

/**
 * Z is row of standard normals (length d). L is lower triangular d x d. Returns L * Z (as column, then as row).
 */
function multiplyLower(L: number[][], z: number[]): number[] {
  const d = L.length;
  const out: number[] = [];
  for (let i = 0; i < d; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) s += (L[i]![j] ?? 0) * (z[j] ?? 0);
    out.push(s);
  }
  return out;
}

/**
 * Gaussian copula: correlate uniforms via Cholesky of correlation matrix.
 * probs[i] = P(assigned for position i). corrMatrix must be symmetric PD.
 * Returns joint outcome matrix (N x d): each row is 0/1 per position.
 */
function gaussianCopulaOutcomes(
  probs: number[],
  corrMatrix: number[][],
  N: number,
): number[][] {
  const d = probs.length;
  if (d === 0) return [];
  const L = corrMatrix.map((row) => [...row]);
  if (!cholesky(L)) {
    return Array.from({ length: N }, () =>
      probs.map((p) => (Math.random() < p ? 1 : 0)),
    );
  }
  const outcomes: number[][] = [];
  for (let n = 0; n < N; n++) {
    const z: number[] = [];
    while (z.length < d) {
      const { z1, z2 } = boxMuller(Math.random(), Math.random());
      z.push(z1);
      if (z.length < d) z.push(z2);
    }
    const x = multiplyLower(L, z.slice(0, d));
    const u = x.map((xi) => normalCDF(xi));
    const row = u.map((ui, i) => (ui < (probs[i] ?? 0) ? 1 : 0));
    outcomes.push(row);
  }
  return outcomes;
}

export interface JointAssignmentResult {
  pAtLeastOne: number;
  pAll: number;
  pNone: number;
}

/**
 * Joint assignment probabilities from Gaussian copula.
 * probs: P(assigned) per position. corrMatrix: d x d symmetric (1 on diagonal).
 */
export function jointAssignmentProbs(
  probs: number[],
  corrMatrix: number[][],
  N: number = 50_000,
): JointAssignmentResult {
  if (probs.length < 2) {
    const p = probs[0] ?? 0;
    return {
      pAtLeastOne: p,
      pAll: p,
      pNone: 1 - p,
    };
  }
  const outcomes = gaussianCopulaOutcomes(probs, corrMatrix, N);
  let atLeastOne = 0;
  let all = 0;
  let none = 0;
  const d = probs.length;
  for (const row of outcomes) {
    const sum = row.reduce((a, b) => a + b, 0);
    if (sum >= 1) atLeastOne++;
    if (sum === d) all++;
    if (sum === 0) none++;
  }
  return {
    pAtLeastOne: atLeastOne / N,
    pAll: all / N,
    pNone: none / N,
  };
}

/** Default correlation matrix for assets [BTC, ETH, SOL, HYPE] - crypto pairs ~0.6. */
const DEFAULT_CRYPTO_CORR: Record<string, Record<string, number>> = {
  BTC: { BTC: 1, ETH: 0.65, SOL: 0.55, HYPE: 0.5 },
  ETH: { BTC: 0.65, ETH: 1, SOL: 0.6, HYPE: 0.5 },
  SOL: { BTC: 0.55, ETH: 0.6, SOL: 1, HYPE: 0.55 },
  HYPE: { BTC: 0.5, ETH: 0.5, SOL: 0.55, HYPE: 1 },
};

/**
 * Build correlation matrix for a list of assets (order matters).
 */
export function correlationMatrixForAssets(assets: string[]): number[][] {
  const n = assets.length;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([]);
    for (let j = 0; j < n; j++) {
      const a = assets[i] ?? "BTC";
      const b = assets[j] ?? "BTC";
      const row = DEFAULT_CRYPTO_CORR[a] ?? DEFAULT_CRYPTO_CORR.BTC!;
      M[i]!.push(row[b] ?? (i === j ? 1 : 0.5));
    }
  }
  return M;
}

export interface ActivePosition {
  asset: string;
  strike: number;
  type: "cc" | "csp";
}
