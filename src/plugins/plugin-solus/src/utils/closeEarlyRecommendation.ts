import type { State } from "@elizaos/core";
import type {
  SolusSizingEntry,
  SolusSizingState,
} from "../providers/solusSizingState.provider";
import type { SolusMarketContext } from "../providers/solusMarketContext.provider";

export type CloseEarlyAction =
  | "CLOSE_EARLY_NOW"
  | "WATCH_CLOSE_WINDOW"
  | "HOLD_TO_EXPIRY"
  | "ROLL_NEXT_WEEK";

export type CloseEarlyReasonCode =
  | "NEAR_STRIKE"
  | "IN_THE_MONEY"
  | "BULLISH_MOMENTUM"
  | "BEARISH_MOMENTUM"
  | "EXPIRY_URGENT"
  | "USDT0_INSUFFICIENT"
  | "DEBIT_HIGH"
  | "THETA_FAVORABLE"
  | "OUTSIDE_CLOSE_WINDOW";

export interface CloseEarlyRecommendation {
  asset: string;
  positionType: "covered_calls" | "secured_puts";
  action: CloseEarlyAction;
  confidence: number;
  reasons: CloseEarlyReasonCode[];
  summary: string;
  strikeUsd: number;
  spotUsd: number;
  distanceToStrikePct: number;
  hoursToExpiry: number | null;
  premiumCostToCloseUsd?: number;
  hasEnoughUsdt0?: boolean;
  usdtShortfallUsd?: number;
  bridgeNeeded: boolean;
}

export interface CloseEarlyInput {
  asset: string;
  positionType: "covered_calls" | "secured_puts";
  strikeUsd: number;
  spotUsd: number;
  change24hPct?: number | null;
  marketRegime?: string | null;
  fundingRate?: number | null;
  atmIvPct?: number | null;
  expiryUtc?: string | null;
  premiumCostToCloseUsd?: number;
  hasEnoughUsdt0?: boolean;
  usdtShortfallUsd?: number;
}

interface StateHints {
  premiumCostToCloseUsd?: number;
  hasEnoughUsdt0?: boolean;
  usdtShortfallUsd?: number;
}

const ACTION_PRIORITY: Record<CloseEarlyAction, number> = {
  CLOSE_EARLY_NOW: 4,
  ROLL_NEXT_WEEK: 3,
  WATCH_CLOSE_WINDOW: 2,
  HOLD_TO_EXPIRY: 1,
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseCloseEarlyHintsFromText(text: string): StateHints {
  const lower = text.toLowerCase();
  const hints: StateHints = {};
  if (!lower.trim()) return hints;

  if (lower.includes("not enough usdt0")) {
    hints.hasEnoughUsdt0 = false;
  }
  if (lower.includes("enough usdt0") && !lower.includes("not enough usdt0")) {
    hints.hasEnoughUsdt0 = true;
  }

  const premiumCostMatch = text.match(
    /premium cost[^-\d$]*(-?\s*\$?\s*[\d,]+(?:\.\d+)?)/i,
  );
  if (premiumCostMatch?.[1]) {
    const parsed = parseNumber(premiumCostMatch[1]);
    if (parsed != null) {
      hints.premiumCostToCloseUsd = Math.abs(parsed);
    }
  }

  const needMoreMatch = text.match(/need\s+\$?\s*([\d,]+(?:\.\d+)?)\s+more/i);
  if (needMoreMatch?.[1]) {
    const parsed = parseNumber(needMoreMatch[1]);
    if (parsed != null) {
      hints.usdtShortfallUsd = parsed;
      hints.hasEnoughUsdt0 = false;
    }
  }

  return hints;
}

function getHoursToExpiry(expiryUtc?: string | null): number | null {
  if (!expiryUtc) return null;
  const ts = Date.parse(expiryUtc);
  if (!Number.isFinite(ts)) return null;
  return (ts - Date.now()) / (1000 * 60 * 60);
}

function bullishMomentum(input: CloseEarlyInput): boolean {
  const change = input.change24hPct ?? 0;
  const regime = (input.marketRegime ?? "").toLowerCase();
  const funding = input.fundingRate ?? 0;
  return change >= 1.25 || regime.includes("bull") || funding > 0.0002;
}

function bearishMomentum(input: CloseEarlyInput): boolean {
  const change = input.change24hPct ?? 0;
  const regime = (input.marketRegime ?? "").toLowerCase();
  const funding = input.fundingRate ?? 0;
  return change <= -1.25 || regime.includes("bear") || funding < -0.0002;
}

function safeDistancePct(
  positionType: "covered_calls" | "secured_puts",
  spot: number,
  strike: number,
): number {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || strike <= 0)
    return 0;
  if (positionType === "covered_calls") {
    return ((strike - spot) / strike) * 100;
  }
  return ((spot - strike) / strike) * 100;
}

function buildSummary(
  action: CloseEarlyAction,
  asset: string,
  positionType: "covered_calls" | "secured_puts",
  reasons: CloseEarlyReasonCode[],
): string {
  const side =
    positionType === "covered_calls" ? "covered call" : "cash-secured put";
  const reasonText =
    reasons.length > 0 ? reasons.join(", ").toLowerCase() : "position context";
  if (action === "CLOSE_EARLY_NOW") {
    return `${asset} ${side}: close early now to avoid poor assignment terms (${reasonText}).`;
  }
  if (action === "ROLL_NEXT_WEEK") {
    return `${asset} ${side}: roll to next week to keep wheel control (${reasonText}).`;
  }
  if (action === "WATCH_CLOSE_WINDOW") {
    return `${asset} ${side}: monitor close window and fund USDT0 before expiry (${reasonText}).`;
  }
  return `${asset} ${side}: hold to expiry; current theta profile is still favorable (${reasonText}).`;
}

export function buildCloseEarlyRecommendation(
  input: CloseEarlyInput,
): CloseEarlyRecommendation {
  const hoursToExpiry = getHoursToExpiry(input.expiryUtc);
  const distanceToStrikePct = safeDistancePct(
    input.positionType,
    input.spotUsd,
    input.strikeUsd,
  );
  const nearStrike = distanceToStrikePct <= 0.8;
  const inTheMoney = distanceToStrikePct < 0;
  const expiryUrgent = hoursToExpiry != null && hoursToExpiry <= 48;
  const bullish = bullishMomentum(input);
  const bearish = bearishMomentum(input);
  const reasons: CloseEarlyReasonCode[] = [];

  if (nearStrike) reasons.push("NEAR_STRIKE");
  if (inTheMoney) reasons.push("IN_THE_MONEY");
  if (expiryUrgent) reasons.push("EXPIRY_URGENT");

  let action: CloseEarlyAction = "HOLD_TO_EXPIRY";
  let confidence = 0.45;

  if (input.positionType === "covered_calls") {
    if (bullish) reasons.push("BULLISH_MOMENTUM");
    if ((inTheMoney && bullish) || (nearStrike && bullish && expiryUrgent)) {
      action = "CLOSE_EARLY_NOW";
      confidence = inTheMoney ? 0.88 : 0.8;
    } else if (nearStrike && bullish) {
      action = "WATCH_CLOSE_WINDOW";
      confidence = 0.72;
    } else {
      reasons.push("THETA_FAVORABLE");
      action = "HOLD_TO_EXPIRY";
      confidence = 0.66;
    }
  } else {
    if (bearish) reasons.push("BEARISH_MOMENTUM");
    if (inTheMoney && bearish && expiryUrgent) {
      action = "ROLL_NEXT_WEEK";
      confidence = 0.84;
    } else if (inTheMoney && bearish) {
      action = "WATCH_CLOSE_WINDOW";
      confidence = 0.74;
    } else if (nearStrike && bearish) {
      action = "WATCH_CLOSE_WINDOW";
      confidence = 0.7;
    } else {
      reasons.push("THETA_FAVORABLE");
      action = "HOLD_TO_EXPIRY";
      confidence = 0.64;
    }
  }

  if (hoursToExpiry != null && hoursToExpiry > 72) {
    reasons.push("OUTSIDE_CLOSE_WINDOW");
    if (action === "CLOSE_EARLY_NOW") {
      action = "WATCH_CLOSE_WINDOW";
      confidence -= 0.1;
    }
  }

  const debitRatio =
    input.premiumCostToCloseUsd != null && input.strikeUsd > 0
      ? input.premiumCostToCloseUsd / input.strikeUsd
      : null;
  if (debitRatio != null && debitRatio >= 0.06) {
    reasons.push("DEBIT_HIGH");
    if (action === "CLOSE_EARLY_NOW" && !inTheMoney) {
      action = "WATCH_CLOSE_WINDOW";
      confidence -= 0.1;
    }
  }

  if (input.hasEnoughUsdt0 === false) {
    reasons.push("USDT0_INSUFFICIENT");
    if (action === "CLOSE_EARLY_NOW") {
      action = "WATCH_CLOSE_WINDOW";
      confidence -= 0.08;
    }
  }

  const bridgeNeeded = input.hasEnoughUsdt0 === false;
  const finalConfidence = clamp01(confidence);
  return {
    asset: input.asset,
    positionType: input.positionType,
    action,
    confidence: finalConfidence,
    reasons,
    summary: buildSummary(action, input.asset, input.positionType, reasons),
    strikeUsd: input.strikeUsd,
    spotUsd: input.spotUsd,
    distanceToStrikePct,
    hoursToExpiry,
    premiumCostToCloseUsd: input.premiumCostToCloseUsd,
    hasEnoughUsdt0: input.hasEnoughUsdt0,
    usdtShortfallUsd: input.usdtShortfallUsd,
    bridgeNeeded,
  };
}

function pickPriorityRecommendation(
  recs: CloseEarlyRecommendation[],
): CloseEarlyRecommendation | null {
  if (recs.length === 0) return null;
  return recs.sort((a, b) => {
    const p = ACTION_PRIORITY[b.action] - ACTION_PRIORITY[a.action];
    if (p !== 0) return p;
    return b.confidence - a.confidence;
  })[0]!;
}

function normalizePositionType(
  raw?: string,
): "covered_calls" | "secured_puts" | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "covered_calls") return "covered_calls";
  if (v === "secured_puts") return "secured_puts";
  return null;
}

function spotFromStateValues(
  values: Record<string, unknown>,
  asset: string,
): number | null {
  const optionsByAsset = values.optionsByAsset as
    | Record<string, { spot: number }>
    | undefined;
  const byOptions = optionsByAsset?.[asset]?.spot;
  if (typeof byOptions === "number" && byOptions > 0) return byOptions;

  const market = values.solusMarketContext as SolusMarketContext | undefined;
  const byMarket = market?.assets?.[asset]?.price;
  if (typeof byMarket === "number" && byMarket > 0) return byMarket;

  const spotMap = values.hypersurfaceSpotPrices as
    | Record<string, number>
    | undefined;
  const keyMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    HYPE: "hyperliquid",
  };
  const bySpotMap = spotMap?.[keyMap[asset] ?? ""];
  if (typeof bySpotMap === "number" && bySpotMap > 0) return bySpotMap;
  return null;
}

function atmIvFromStateValues(
  values: Record<string, unknown>,
  asset: string,
): number | null {
  const optionsByAsset = values.optionsByAsset as
    | Record<string, { atmIV: number }>
    | undefined;
  const iv = optionsByAsset?.[asset]?.atmIV;
  return typeof iv === "number" && iv > 0 ? iv : null;
}

function getStateHints(state: State, userText?: string): StateHints {
  const fromStateText = parseCloseEarlyHintsFromText(state.text ?? "");
  const fromUserText = parseCloseEarlyHintsFromText(userText ?? "");
  return {
    premiumCostToCloseUsd:
      fromUserText.premiumCostToCloseUsd ?? fromStateText.premiumCostToCloseUsd,
    hasEnoughUsdt0: fromUserText.hasEnoughUsdt0 ?? fromStateText.hasEnoughUsdt0,
    usdtShortfallUsd:
      fromUserText.usdtShortfallUsd ?? fromStateText.usdtShortfallUsd,
  };
}

export function buildCloseEarlyRecommendationFromState(
  state: State,
  userText?: string,
): CloseEarlyRecommendation | null {
  const values = (state.values ?? {}) as Record<string, unknown>;
  const sizing = values.solusSizingState as SolusSizingState | undefined;
  const market = values.solusMarketContext as SolusMarketContext | undefined;
  const hints = getStateHints(state, userText);
  if (!sizing?.entries) return null;

  const recs: CloseEarlyRecommendation[] = [];
  const entries = Object.values(sizing.entries) as SolusSizingEntry[];
  for (const entry of entries) {
    const positionType = normalizePositionType(entry.positionType);
    if (!positionType) continue;
    if (entry.strikeUsd == null || entry.strikeUsd <= 0) continue;
    const asset = entry.asset.toUpperCase();
    const spot = spotFromStateValues(values, asset);
    if (spot == null || spot <= 0) continue;

    const marketAsset = market?.assets?.[asset];
    const rec = buildCloseEarlyRecommendation({
      asset,
      positionType,
      strikeUsd: entry.strikeUsd,
      spotUsd: spot,
      change24hPct: marketAsset?.change24h ?? null,
      marketRegime: marketAsset?.marketRegime ?? null,
      fundingRate: marketAsset?.fundingRate ?? null,
      atmIvPct: atmIvFromStateValues(values, asset),
      expiryUtc: entry.expiryUtc ?? null,
      premiumCostToCloseUsd: hints.premiumCostToCloseUsd,
      hasEnoughUsdt0: hints.hasEnoughUsdt0,
      usdtShortfallUsd: hints.usdtShortfallUsd,
    });
    recs.push(rec);
  }

  return pickPriorityRecommendation(recs);
}

export function formatCloseEarlyRecommendation(
  rec: CloseEarlyRecommendation | null,
): string {
  if (!rec) {
    return "[Close early recommendation]\nNo active CC/CSP position found in sizing state.";
  }
  const lines = [
    "[Close early recommendation]",
    `Asset: ${rec.asset}`,
    `Position: ${rec.positionType}`,
    `Action: ${rec.action}`,
    `Confidence: ${(rec.confidence * 100).toFixed(0)}%`,
    `Strike: $${rec.strikeUsd.toLocaleString()}`,
    `Spot: $${rec.spotUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Distance to strike: ${rec.distanceToStrikePct.toFixed(2)}%`,
    `Hours to expiry: ${rec.hoursToExpiry == null ? "unknown" : rec.hoursToExpiry.toFixed(1)}`,
    `Reasons: ${rec.reasons.join(", ") || "none"}`,
    `Summary: ${rec.summary}`,
  ];
  if (rec.premiumCostToCloseUsd != null) {
    lines.push(
      `Premium cost to close: $${rec.premiumCostToCloseUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    );
  }
  if (rec.hasEnoughUsdt0 != null) {
    lines.push(`USDT0 sufficient: ${rec.hasEnoughUsdt0 ? "yes" : "no"}`);
  }
  if (rec.usdtShortfallUsd != null) {
    lines.push(
      `USDT0 shortfall: $${rec.usdtShortfallUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    );
  }
  return lines.join("\n");
}
