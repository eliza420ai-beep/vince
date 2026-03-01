/**
 * SOLUS_OPTIONS_CONTEXT — Options expert's own data: spot, DVOL, IV, strike context from Deribit.
 * Solus uses the same Deribit service as VINCE (public API, no auth) so he can answer basic options
 * questions (e.g. "what about our SOL") without leaning on another agent. No ASK_AGENT, no timeouts.
 * When spot and ATM IV are present, assignment probability (GBM, risk-neutral) is computed for best CC/CSP strikes.
 * When assignment_calibrator.onnx is present, options context uses ML-calibrated P(assign) for those strikes.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  assignmentProbabilityGBM,
  getTYearsToNextFriday,
} from "../utils/assignmentProbability";
import { tailRiskClosedForm } from "../utils/tailRisk";
import {
  jointAssignmentProbs,
  correlationMatrixForAssets,
} from "../utils/portfolioCopula";
import { getActivePositionsForPortfolio } from "./solusSizingState.provider";
import type { SolusMlInferenceService } from "../services/solusMlInference.service";

const TAIL_RISK_CRASH_PCT = 15; // P(spot down 15% by expiry)

const DERIBIT_ASSETS = ["BTC", "ETH", "SOL"] as const;
const FETCH_TIMEOUT_MS = 10_000;

export interface OptionsContextLike {
  currency: string;
  spotPrice: number | null;
  dvol: number | null;
  ivSurface?: {
    atmIV: number;
    skew: number;
    skewInterpretation?: string;
  } | null;
  bestCoveredCalls?: Array<{
    strike: number;
    delta: number;
    yield7Day: number;
  }>;
  bestCashSecuredPuts?: Array<{
    strike: number;
    delta: number;
    yield7Day: number;
  }>;
  /** Perp funding rate (decimal); options-relevant for strike width. */
  fundingRate?: number | null;
}

interface FormatContextOptions {
  TYears: number;
  /** When assignment_calibrator.onnx is loaded, ML-calibrated P(assign) for best CC and CSP. */
  mlCalibrated?: { cc?: number; csp?: number };
}

function formatContext(
  ctx: OptionsContextLike,
  options?: FormatContextOptions,
): string {
  const lines: string[] = [];
  const spot =
    ctx.spotPrice != null
      ? `$${ctx.spotPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "—";
  const dvol = ctx.dvol != null ? `${ctx.dvol.toFixed(1)}%` : "—";
  const atm =
    ctx.ivSurface?.atmIV != null ? `${ctx.ivSurface.atmIV.toFixed(1)}%` : "—";
  const skew =
    ctx.ivSurface?.skew != null
      ? `${ctx.ivSurface.skew > 0 ? "+" : ""}${ctx.ivSurface.skew.toFixed(1)}%`
      : "—";
  const fundingStr =
    ctx.fundingRate != null
      ? ` | perp F:${(ctx.fundingRate * 100).toFixed(4)}% (≈${(ctx.fundingRate * 3 * 365 * 100).toFixed(0)}% APR)`
      : "";
  lines.push(
    `${ctx.currency}: spot ${spot} | DVOL ${dvol} | ATM IV ${atm} | skew ${skew}${fundingStr}`,
  );
  const sigmaAnnual =
    ctx.ivSurface?.atmIV != null ? ctx.ivSurface.atmIV / 100 : null;
  const tYears =
    options?.TYears != null && options.TYears > 0 ? options.TYears : null;
  const canComputeAssign =
    tYears != null &&
    ctx.spotPrice != null &&
    ctx.spotPrice > 0 &&
    sigmaAnnual != null &&
    sigmaAnnual > 0;

  if (ctx.bestCoveredCalls?.[0]) {
    const cc = ctx.bestCoveredCalls[0];
    let ccLine = `  Best CC: ${cc.delta.toFixed(0)}Δ @ $${cc.strike.toLocaleString()} (~${cc.yield7Day.toFixed(2)}%/wk)`;
    if (canComputeAssign && cc.strike > 0 && tYears != null) {
      const mlProb = options?.mlCalibrated?.cc;
      if (mlProb != null) {
        ccLine += ` — ML-calibrated P(assign) ~${(mlProb * 100).toFixed(0)}%`;
      } else {
        const { probability, ci95 } = assignmentProbabilityGBM({
          spot: ctx.spotPrice!,
          strike: cc.strike,
          sigmaAnnual: sigmaAnnual!,
          TYears: tYears!,
        });
        ccLine += ` — assignment prob ~${(probability * 100).toFixed(0)}% (95% CI ${(ci95[0] * 100).toFixed(0)}–${(ci95[1] * 100).toFixed(0)}%)`;
      }
    }
    lines.push(ccLine);
  }
  if (ctx.bestCashSecuredPuts?.[0]) {
    const csp = ctx.bestCashSecuredPuts[0];
    let cspLine = `  Best CSP: ${csp.delta.toFixed(0)}Δ @ $${csp.strike.toLocaleString()} (~${csp.yield7Day.toFixed(2)}%/wk)`;
    if (canComputeAssign && csp.strike > 0 && tYears != null) {
      const mlProb = options?.mlCalibrated?.csp;
      if (mlProb != null) {
        cspLine += ` — ML-calibrated P(assign) ~${(mlProb * 100).toFixed(0)}%`;
      } else {
        const { probability, ci95 } = assignmentProbabilityGBM({
          spot: ctx.spotPrice!,
          strike: csp.strike,
          sigmaAnnual: sigmaAnnual!,
          TYears: tYears!,
        });
        const assignProb = 1 - probability;
        const ciLower = 1 - ci95[1];
        const ciUpper = 1 - ci95[0];
        cspLine += ` — assignment prob ~${(assignProb * 100).toFixed(0)}% (95% CI ${(ciLower * 100).toFixed(0)}–${(ciUpper * 100).toFixed(0)}%)`;
      }
    }
    lines.push(cspLine);
  }
  return lines.join("\n");
}

export type OptionsContextResult = {
  text: string;
  optionsByAsset: Record<string, { spot: number; atmIV: number }>;
};

/**
 * Fetch from Deribit and build options context (shared by provider and SOLUS_OPTIONS_REFRESH task).
 */
export async function fetchAndBuildOptionsContext(
  runtime: IAgentRuntime,
): Promise<OptionsContextResult | null> {
  const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as
    | { getOptionsContext: (c: string) => Promise<OptionsContextLike> }
    | undefined
    | null;
  if (!deribit?.getOptionsContext) return null;

  const withTimeout = <T>(
    ms: number,
    label: string,
    p: Promise<T>,
  ): Promise<T | null> =>
    Promise.race([
      p,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          logger.debug(`[Solus] SOLUS_OPTIONS_CONTEXT ${label} timed out`);
          resolve(null);
        }, ms),
      ),
    ]);

  const perAsset = Math.max(
    2000,
    Math.floor(FETCH_TIMEOUT_MS / DERIBIT_ASSETS.length),
  );
  const results = await Promise.all(
    DERIBIT_ASSETS.map((asset) =>
      withTimeout(
        perAsset,
        asset,
        deribit.getOptionsContext(asset).catch((err) => {
          logger.debug(
            `[Solus] Deribit ${asset} failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        }),
      ),
    ),
  );

  const TYears = getTYearsToNextFriday();
  const valid = results.filter((r): r is OptionsContextLike =>
    Boolean(r != null && r.currency),
  );
  if (valid.length === 0) return null;

  const mlService = runtime.getService("SOLUS_ML_INFERENCE_SERVICE") as
    | SolusMlInferenceService
    | null
    | undefined;
  const blocks: string[] = [];
  for (const r of valid) {
    let mlCalibrated: { cc?: number; csp?: number } | undefined;
    if (
      mlService?.isModelLoaded?.() &&
      r.spotPrice != null &&
      r.spotPrice > 0 &&
      r.ivSurface?.atmIV != null
    ) {
      const atmIv = r.ivSurface.atmIV;
      if (r.bestCoveredCalls?.[0]) {
        const cc = r.bestCoveredCalls[0];
        const { probability } = assignmentProbabilityGBM({
          spot: r.spotPrice,
          strike: cc.strike,
          sigmaAnnual: atmIv / 100,
          TYears,
        });
        const mlCc = await mlService.predictAssignmentProbability({
          asset: r.currency,
          strike: cc.strike,
          spot: r.spotPrice,
          atmIv,
          TYears,
          gbmProb: probability,
        });
        if (mlCc != null) mlCalibrated = { ...mlCalibrated, cc: mlCc };
      }
      if (r.bestCashSecuredPuts?.[0]) {
        const csp = r.bestCashSecuredPuts[0];
        const { probability } = assignmentProbabilityGBM({
          spot: r.spotPrice,
          strike: csp.strike,
          sigmaAnnual: atmIv / 100,
          TYears,
        });
        const assignProb = 1 - probability;
        const mlCsp = await mlService.predictAssignmentProbability({
          asset: r.currency,
          strike: csp.strike,
          spot: r.spotPrice,
          atmIv,
          TYears,
          gbmProb: assignProb,
        });
        if (mlCsp != null) {
          mlCalibrated = { ...mlCalibrated, csp: mlCsp };
        }
      }
    }
    blocks.push(formatContext(r, { TYears, mlCalibrated }));
  }

  const optionsByAsset: Record<string, { spot: number; atmIV: number }> = {};
  for (const r of valid) {
    if (r.spotPrice != null && r.spotPrice > 0 && r.ivSurface?.atmIV != null) {
      optionsByAsset[r.currency] = {
        spot: r.spotPrice,
        atmIV: r.ivSurface.atmIV,
      };
    }
  }

  const tailRiskParts: string[] = [];
  for (const r of valid) {
    if (r.spotPrice != null && r.spotPrice > 0 && r.ivSurface?.atmIV != null) {
      const p = tailRiskClosedForm(
        r.spotPrice,
        TAIL_RISK_CRASH_PCT / 100,
        r.ivSurface.atmIV / 100,
        TYears,
      );
      tailRiskParts.push(
        `P(${r.currency} down ${TAIL_RISK_CRASH_PCT}%) ~${(p * 100).toFixed(0)}%`,
      );
    }
  }
  const tailLine =
    tailRiskParts.length > 0
      ? `\nTail risk (7d): ${tailRiskParts.join("; ")}`
      : "";

  let portfolioLine = "";
  const positions = getActivePositionsForPortfolio();
  if (positions.length >= 2) {
    const probs: number[] = [];
    const assets: string[] = [];
    for (const pos of positions) {
      const o = optionsByAsset[pos.asset];
      if (!o || o.spot <= 0 || o.atmIV <= 0) continue;
      const sigma = o.atmIV / 100;
      const { probability } = assignmentProbabilityGBM({
        spot: o.spot,
        strike: pos.strike,
        sigmaAnnual: sigma,
        TYears,
      });
      probs.push(pos.type === "csp" ? 1 - probability : probability);
      assets.push(pos.asset);
    }
    if (probs.length >= 2) {
      const corr = correlationMatrixForAssets(assets);
      const joint = jointAssignmentProbs(probs, corr, 30_000);
      portfolioLine = `\nPortfolio: P(at least one assigned) ~${(joint.pAtLeastOne * 100).toFixed(0)}%, P(all assigned) ~${(joint.pAll * 100).toFixed(0)}%, P(none) ~${(joint.pNone * 100).toFixed(0)}%`;
    }
  }

  const text = `[Solus options context — Deribit]\n${blocks.join("\n\n")}${tailLine}${portfolioLine}`;
  return { text, optionsByAsset };
}

export const solusOptionsContextProvider: Provider = {
  name: "SOLUS_OPTIONS_CONTEXT",
  description:
    "Options context from Deribit (spot, DVOL, IV, best strikes) so Solus can answer options questions without asking VINCE.",
  position: -4,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const cacheService = runtime.getService("SOLUS_OPTIONS_CACHE_SERVICE") as
      | {
          getCached: () => {
            text: string;
            optionsByAsset: Record<string, { spot: number; atmIV: number }>;
          } | null;
          setCached: (d: {
            text: string;
            optionsByAsset: Record<string, { spot: number; atmIV: number }>;
          }) => void;
        }
      | undefined
      | null;

    const cached = cacheService?.getCached?.();
    if (cached) {
      const blocksPart = cached.text.startsWith(
        "[Solus options context — Deribit]\n",
      )
        ? cached.text.slice("[Solus options context — Deribit]\n".length)
        : cached.text;
      return {
        text: cached.text,
        values: {
          solusOptionsContext: blocksPart,
          optionsByAsset: cached.optionsByAsset,
        },
      };
    }

    const result = await fetchAndBuildOptionsContext(runtime);
    if (!result) return {};

    if (cacheService?.setCached) {
      cacheService.setCached({
        text: result.text,
        optionsByAsset: result.optionsByAsset,
      });
    }
    const blocksPart = result.text.startsWith(
      "[Solus options context — Deribit]\n",
    )
      ? result.text.slice("[Solus options context — Deribit]\n".length)
      : result.text;
    return {
      text: result.text,
      values: {
        solusOptionsContext: blocksPart,
        optionsByAsset: result.optionsByAsset,
      },
    };
  },
};
