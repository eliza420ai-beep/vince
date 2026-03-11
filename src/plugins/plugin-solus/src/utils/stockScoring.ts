import type {
  SolusOffchainStock,
  SolusThesisRole,
} from "../constants/solusStockWatchlist";

export type SolusStockRecommendation = "accumulate" | "watch" | "avoid";

export interface StockScoreInputs {
  stock: SolusOffchainStock | null;
  quoteChangePct?: number | null;
  newsCount?: number;
  peRatio?: number | null;
  revenueGrowth?: number | null;
  profitMargin?: number | null;
  debtToEquity?: number | null;
  returnOnEquity?: number | null;
  beta?: number | null;
  hasUpcomingEarnings?: boolean;
}

export interface StockScorecard {
  thesisStrength: number;
  catalystDensity: number;
  valuationStretch: number;
  executionRisk: number;
  netEdgeScore: number;
  recommendation: SolusStockRecommendation;
}

function clamp01To100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function baseThemeStrength(theme?: string): number {
  switch (theme) {
    case "ai_power":
      return 80;
    case "hosting_conversion":
      return 76;
    case "grid_equipment":
      return 72;
    case "gpu_platform":
      return 68;
    case "outsourcing_disruption":
      return 64;
    default:
      return 55;
  }
}

function roleStrengthAdj(role?: SolusThesisRole): number {
  switch (role) {
    case "landlord":
      return 8;
    case "converter":
      return 6;
    case "supplier":
      return 4;
    case "at_risk_incumbent":
      return -10;
    default:
      return 0;
  }
}

function roleExecutionRisk(role?: SolusThesisRole): number {
  switch (role) {
    case "landlord":
      return 36;
    case "supplier":
      return 44;
    case "converter":
      return 58;
    case "at_risk_incumbent":
      return 72;
    default:
      return 55;
  }
}

function valuationStretchFromPe(peRatio?: number | null): number {
  if (!peRatio || peRatio <= 0) return 50;
  if (peRatio >= 70) return 90;
  if (peRatio >= 50) return 78;
  if (peRatio >= 35) return 66;
  if (peRatio >= 20) return 50;
  return 36;
}

function mapRecommendation(netEdgeScore: number): SolusStockRecommendation {
  if (netEdgeScore >= 70) return "accumulate";
  if (netEdgeScore >= 45) return "watch";
  return "avoid";
}

export function computeStockScorecard(input: StockScoreInputs): StockScorecard {
  const theme = input.stock?.theme;
  const role = input.stock?.thesisRole;

  const revGrowth = input.revenueGrowth ?? 0;
  const margin = input.profitMargin ?? 0;
  const roe = input.returnOnEquity ?? 0;
  const debtToEquity = input.debtToEquity ?? 0;
  const beta = input.beta ?? 1;
  const quoteChange = input.quoteChangePct ?? 0;

  const thesisStrength = clamp01To100(
    baseThemeStrength(theme) +
      roleStrengthAdj(role) +
      Math.min(20, Math.max(-20, revGrowth * 40)) +
      Math.min(12, Math.max(-12, margin * 20)) +
      Math.min(10, Math.max(-10, roe * 15)),
  );

  const catalystDensity = clamp01To100(
    (input.stock?.keyCatalysts.length ?? 1) * 22 +
      Math.min(16, (input.newsCount ?? 0) * 4) +
      (input.hasUpcomingEarnings ? 10 : 0) +
      (Math.abs(quoteChange) >= 4 ? 6 : 0),
  );

  const valuationStretch = clamp01To100(
    valuationStretchFromPe(input.peRatio) +
      (beta > 1.8 ? 8 : 0) -
      (revGrowth > 0.5 ? 10 : 0),
  );

  const executionRisk = clamp01To100(
    roleExecutionRisk(role) +
      Math.min(14, Math.max(0, debtToEquity * 8)) +
      (quoteChange <= -8 ? 8 : 0),
  );

  const netEdgeScore = clamp01To100(
    thesisStrength * 0.35 +
      catalystDensity * 0.25 +
      (100 - valuationStretch) * 0.25 +
      (100 - executionRisk) * 0.15,
  );

  return {
    thesisStrength,
    catalystDensity,
    valuationStretch,
    executionRisk,
    netEdgeScore,
    recommendation: mapRecommendation(netEdgeScore),
  };
}

export function defaultInvalidationForTheme(theme?: string): string {
  switch (theme) {
    case "ai_power":
      return "If utility/data-center power demand cools or permitting bottlenecks clear faster than expected.";
    case "hosting_conversion":
      return "If conversion timelines slip or AI hosting utilization weakens for two quarters.";
    case "grid_equipment":
      return "If grid capex is delayed and order backlog stops expanding.";
    case "outsourcing_disruption":
      return "If enterprise AI adoption stalls and legacy labor-arbitrage demand re-accelerates.";
    case "gpu_platform":
      return "If AI capex guidance is cut and hyperscaler demand slows materially.";
    default:
      return "If the catalyst path weakens and execution misses stack for two quarters.";
  }
}
