export type TrendRegime = "uptrend" | "downtrend" | "chop";
export type YesNoDecision = "YES" | "CAUTION" | "NO";
export type YesNoMode = "swing" | "day";

export function clampScore(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function movingAverageSMA(
  values: number[],
  period: number,
): number | null {
  if (!Array.isArray(values) || values.length < period || period <= 0) {
    return null;
  }
  const slice = values.slice(values.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

export function computeRSI(closes: number[], period = 14): number | null {
  if (!Array.isArray(closes) || closes.length < period + 1 || period <= 0) {
    return null;
  }

  let gains = 0;
  let losses = 0;
  const start = closes.length - period - 1;
  for (let i = start + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return rsi;
}

function linearRegressionSlope(values: number[]): number | null {
  if (!Array.isArray(values) || values.length < 2) return null;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return slope;
}

export function computeSlope5d(values: number[]): number | null {
  // Uses the last 5 points for stability; slope sign is what matters most.
  if (!Array.isArray(values) || values.length < 10) return null;
  const slice = values.slice(values.length - 5);
  return linearRegressionSlope(slice);
}

export function percentileRank(
  current: number,
  history: number[],
): number | null {
  if (
    !Number.isFinite(current) ||
    !Array.isArray(history) ||
    history.length < 2
  ) {
    return null;
  }
  const clean = history.filter((x) => Number.isFinite(x));
  if (clean.length < 2) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const n = sorted.length;
  const countLE = sorted.filter((x) => x <= current).length;
  const denom = Math.max(1, n - 1);
  return (countLE / denom) * 100;
}

export function classifyTrendRegime(params: {
  price: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}): TrendRegime {
  const { price, sma20, sma50, sma200 } = params;
  if (
    price == null ||
    sma20 == null ||
    sma50 == null ||
    sma200 == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(sma20) ||
    !Number.isFinite(sma50) ||
    !Number.isFinite(sma200)
  ) {
    return "chop";
  }

  const up = price > sma20 && sma20 > sma50 && sma50 > sma200;
  const down = price < sma20 && sma20 < sma50 && sma50 < sma200;

  if (up) return "uptrend";
  if (down) return "downtrend";
  return "chop";
}

export function marketQualityDecision(score: number): YesNoDecision {
  if (!Number.isFinite(score)) return "NO";
  if (score >= 80) return "YES";
  if (score >= 60) return "CAUTION";
  return "NO";
}

export function computeWeightedMarketQualityScore(params: {
  weights: Record<string, number>;
  categoryScores: Record<string, number>;
}): number {
  const { weights, categoryScores } = params;
  const keys = Object.keys(weights);
  let wSum = 0;
  let acc = 0;
  for (const k of keys) {
    const w = weights[k];
    if (!Number.isFinite(w) || w <= 0) continue;
    const s = categoryScores[k];
    const score = Number.isFinite(s) ? (s as number) : 50;
    acc += score * w;
    wSum += w;
  }
  if (wSum <= 0) return 0;
  return clampScore(acc / wSum);
}

export function scoreVolatility(params: {
  vixPercentile1y: number | null;
  vixSlope5d: number | null;
}): { score: number; direction: "up" | "down" | "flat" } {
  const { vixPercentile1y, vixSlope5d } = params;
  if (vixPercentile1y == null) {
    return { score: 50, direction: "flat" };
  }
  let s = 100 - vixPercentile1y; // higher VIX percentile -> worse quality
  let direction: "up" | "down" | "flat" = "flat";
  if (vixSlope5d != null) {
    if (vixSlope5d > 0) {
      s -= 10;
      direction = "down";
    } else if (vixSlope5d < 0) {
      s += 10;
      direction = "up";
    }
  }
  return { score: clampScore(s), direction };
}

export function scoreTrend(params: {
  regime: TrendRegime;
  rsi14: number | null;
}): { score: number; direction: "up" | "down" | "flat" } {
  const { regime, rsi14 } = params;
  let s = 50;
  let direction: "up" | "down" | "flat" = "flat";

  if (regime === "uptrend") {
    s = 80;
    direction = "up";
  } else if (regime === "downtrend") {
    s = 20;
    direction = "down";
  } else {
    s = 50;
    direction = "flat";
  }

  if (rsi14 != null) {
    if (rsi14 > 70) {
      s -= 8;
    } else if (rsi14 < 30) {
      s -= 6;
    }
  }
  return { score: clampScore(s), direction };
}

export function scoreBreadthProxy(params: { breadthPctProxy: number | null }): {
  score: number;
  direction: "up" | "down" | "flat";
} {
  const { breadthPctProxy } = params;
  if (breadthPctProxy == null) {
    return { score: 50, direction: "flat" };
  }
  const p = clampScore(breadthPctProxy);
  const direction: "up" | "down" | "flat" =
    p >= 60 ? "up" : p <= 40 ? "down" : "flat";
  return { score: p, direction };
}

export function scoreMomentumFromSpread(params: {
  topBottomReturnSpreadPct: number | null;
}): { score: number; direction: "up" | "down" | "flat" } {
  const { topBottomReturnSpreadPct } = params;
  if (topBottomReturnSpreadPct == null) return { score: 50, direction: "flat" };
  const spread = topBottomReturnSpreadPct;
  // -10% spread -> 10, +10% spread -> 90
  const normalized = clampScore(50 + (spread / 0.1) * 20);
  const direction: "up" | "down" | "flat" =
    normalized >= 60 ? "up" : normalized <= 40 ? "down" : "flat";
  return { score: normalized, direction };
}

export function scoreMacroFromTrends(params: {
  tnxSlope: number | null;
  dxySlope: number | null;
}): {
  score: number;
  direction: "up" | "down" | "flat";
  fedStance: "hawkish" | "neutral" | "dovish" | null;
} {
  const { tnxSlope, dxySlope } = params;
  if (tnxSlope == null || dxySlope == null) {
    return { score: 50, direction: "flat", fedStance: null };
  }

  const hawkish = tnxSlope > 0 && dxySlope > 0;
  const dovish = tnxSlope < 0 && dxySlope < 0;

  if (hawkish) {
    return { score: 20, direction: "down", fedStance: "hawkish" };
  }
  if (dovish) {
    return { score: 80, direction: "up", fedStance: "dovish" };
  }
  return { score: 50, direction: "flat", fedStance: "neutral" };
}

export function computeExecutionWindowScore(params: {
  mode: YesNoMode;
  breakoutsHolding: boolean;
  leadingFollowThrough: boolean;
  pullbacksBought: boolean;
}): number {
  const { breakoutsHolding, leadingFollowThrough, pullbacksBought } = params;
  const base = 20;
  let score = base;

  score += breakoutsHolding ? 35 : 0;
  score += leadingFollowThrough ? 35 : 0;
  score += pullbacksBought ? 20 : 0;

  // Day trading: require stronger near-term participation.
  if (params.mode === "day" && (!breakoutsHolding || !leadingFollowThrough)) {
    score -= 10;
  }

  return clampScore(score);
}
