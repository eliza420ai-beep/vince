/**
 * SOLUS_OPTIONS_CONTEXT — Options expert's own data: spot, DVOL, IV, strike context from Deribit.
 * Solus uses the same Deribit service as VINCE (public API, no auth) so he can answer basic options
 * questions (e.g. "what about our SOL") without leaning on another agent. No ASK_AGENT, no timeouts.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

const DERIBIT_ASSETS = ["BTC", "ETH", "SOL"] as const;
const FETCH_TIMEOUT_MS = 10_000;

interface OptionsContextLike {
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

function formatContext(ctx: OptionsContextLike): string {
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
  if (ctx.bestCoveredCalls?.[0]) {
    const cc = ctx.bestCoveredCalls[0];
    lines.push(
      `  Best CC: ${cc.delta.toFixed(0)}Δ @ $${cc.strike.toLocaleString()} (~${cc.yield7Day.toFixed(2)}%/wk)`,
    );
  }
  if (ctx.bestCashSecuredPuts?.[0]) {
    const csp = ctx.bestCashSecuredPuts[0];
    lines.push(
      `  Best CSP: ${csp.delta.toFixed(0)}Δ @ $${csp.strike.toLocaleString()} (~${csp.yield7Day.toFixed(2)}%/wk)`,
    );
  }
  return lines.join("\n");
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
    const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as
      | { getOptionsContext: (c: string) => Promise<OptionsContextLike> }
      | undefined
      | null;
    if (!deribit?.getOptionsContext) {
      return {};
    }

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

    const blocks = results
      .filter((r): r is OptionsContextLike => Boolean(r != null && r.currency))
      .map(formatContext);
    if (blocks.length === 0) {
      return {};
    }

    const text = `[Solus options context — Deribit]\n${blocks.join("\n\n")}`;
    return {
      text,
      values: { solusOptionsContext: blocks.join("\n\n") },
    };
  },
};
