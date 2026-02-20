/**
 * POLYMARKET_EDGE_CHECK Action
 *
 * Analyst (Oracle): compare Synth forecast to Polymarket price; if edge above threshold,
 * emit a structured signal to the desk (plugin_polymarket_desk.signals).
 * No execution; Risk and Executor consume signals separately.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
} from "@elizaos/core";
import { getSynthForecast } from "../services/synthClient";

const POLYMARKET_SERVICE_TYPE = "POLYMARKET_DISCOVERY_SERVICE";
const DEFAULT_EDGE_THRESHOLD_BPS = 200;
const SIGNALS_TABLE = "plugin_polymarket_desk.signals";

interface EdgeCheckParams {
  condition_id?: string;
  conditionId?: string;
  asset?: string;
  edge_threshold_bps?: number;
}

type EdgeCheckInput = EdgeCheckParams;
type EdgeCheckActionResult = ActionResult & {
  input?: EdgeCheckInput;
  signal_id?: string;
};

function parseFloatOrZero(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export const polymarketEdgeCheckAction: Action = {
  name: "POLYMARKET_EDGE_CHECK",
  similes: ["POLYMARKET_EDGE", "CHECK_EDGE", "SYNTH_VS_POLYMARKET"],
  description:
    "Compare Synth (or other) forecast probability to Polymarket price for a market. When edge (forecast minus market price) is above the threshold in basis points, emit a structured signal for the Risk agent. Requires condition_id and optional asset (e.g. BTC for Synth). No trading execution.",

  parameters: {
    condition_id: {
      type: "string",
      description: "Polymarket condition_id for the market",
      required: true,
    },
    asset: {
      type: "string",
      description:
        "Asset for Synth forecast (e.g. BTC, ETH, SOL). Default BTC.",
    },
    edge_threshold_bps: {
      type: "number",
      description:
        "Minimum edge in basis points to emit a signal. Default 200.",
    },
  },

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService(POLYMARKET_SERVICE_TYPE);
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(
        message,
        ["ACTION_STATE"],
        true,
      );
      const params = (composedState?.data?.actionParams ??
        {}) as Partial<EdgeCheckParams>;
      let conditionId = (params.condition_id ?? params.conditionId)?.trim();
      if (!conditionId && message?.content?.text) {
        const hexMatch = message.content.text.match(/0x[a-fA-F0-9]{64}/);
        if (hexMatch) conditionId = hexMatch[0];
      }
      if (!conditionId) {
        const text = " condition_id is required for POLYMARKET_EDGE_CHECK.";
        if (callback) await callback({ text });
        return { text, success: false };
      }

      const asset = (params.asset ?? "BTC").trim() || "BTC";
      const thresholdBps = Math.max(
        0,
        params.edge_threshold_bps ?? DEFAULT_EDGE_THRESHOLD_BPS,
      );

      const polymarketService = runtime.getService(POLYMARKET_SERVICE_TYPE) as {
        getMarketPrices: (
          conditionId: string,
        ) => Promise<{ yes_price: string; no_price: string }>;
      } | null;
      if (!polymarketService?.getMarketPrices) {
        const text = " Polymarket service not available.";
        if (callback) await callback({ text });
        return { text, success: false };
      }

      const [forecast, prices] = await Promise.all([
        getSynthForecast(asset),
        polymarketService.getMarketPrices(conditionId),
      ]);

      const yesPrice = parseFloatOrZero(prices.yes_price);
      const noPrice = parseFloatOrZero(prices.no_price);
      const prob = forecast.probability;

      const edgeYesBps = (prob - yesPrice) * 10000;
      const edgeNoBps = (1 - prob - noPrice) * 10000;
      const useYes = Math.abs(edgeYesBps) >= Math.abs(edgeNoBps);
      const edgeBps = useYes ? edgeYesBps : edgeNoBps;
      const side = useYes ? "YES" : "NO";
      const marketPrice = useYes ? yesPrice : noPrice;

      const aboveThreshold = Math.abs(edgeBps) >= thresholdBps;
      const signalId = crypto.randomUUID();
      const now = Date.now();

      if (aboveThreshold) {
        try {
          const conn = await (
            runtime as { getConnection?: () => Promise<unknown> }
          ).getConnection?.();
          if (
            conn &&
            typeof (
              conn as { query: (s: string, v?: unknown[]) => Promise<unknown> }
            ).query === "function"
          ) {
            const client = conn as {
              query: (
                text: string,
                values?: unknown[],
              ) => Promise<{ rows?: unknown[] }>;
            };
            const edgeDir = edgeBps > 0 ? "underpriced" : "overpriced";
            const rationale =
              `Edge check for ${asset}: Synth forecast ${(prob * 100).toFixed(1)}% vs market ${(marketPrice * 100).toFixed(1)}%. ` +
              `${Math.abs(edgeBps).toFixed(0)} bps ${edgeDir}. Buying ${side}.`;
            const metadataJson = JSON.stringify({
              rationale,
              source: "POLYMARKET_EDGE_CHECK",
              asset,
              conditionId,
            });
            await client.query(
              `INSERT INTO ${SIGNALS_TABLE} (id, created_at, source, market_id, side, suggested_size_usd, confidence, forecast_prob, market_price, edge_bps, status, metadata_json)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                signalId,
                new Date(now).toISOString(),
                forecast.source,
                conditionId,
                side,
                null,
                Math.min(1, Math.abs(edgeBps) / 1000),
                prob,
                marketPrice,
                edgeBps,
                "pending",
                metadataJson,
              ],
            );
            logger.info(
              `[POLYMARKET_EDGE_CHECK] Signal emitted: ${signalId} edge_bps=${edgeBps} side=${side}`,
            );
          }
        } catch (err) {
          logger.warn(
            `[POLYMARKET_EDGE_CHECK] Failed to write signal (table may not exist): ${err}`,
          );
        }
      }

      const summary =
        ` **Edge check** (${conditionId.slice(0, 10)}…)\n` +
        ` Synth ${asset}: ${(prob * 100).toFixed(1)}% | Polymarket YES: ${(yesPrice * 100).toFixed(1)}% NO: ${(noPrice * 100).toFixed(1)}%\n` +
        ` Edge: ${side} ${edgeBps > 0 ? "+" : ""}${edgeBps.toFixed(0)} bps (threshold ${thresholdBps} bps).\n` +
        (aboveThreshold
          ? ` Signal emitted for Risk (id: ${signalId}).`
          : ` Below threshold; no signal.`);

      const result: EdgeCheckActionResult = {
        text: summary,
        success: true,
        input: {
          condition_id: conditionId,
          asset,
          edge_threshold_bps: thresholdBps,
        },
        signal_id: aboveThreshold ? signalId : undefined,
      };
      if (callback) await callback({ text: summary });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[POLYMARKET_EDGE_CHECK] ${msg}`);
      const text = ` Edge check failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Check edge for this BTC market: 0xabc..." },
      },
      {
        name: "Oracle",
        content: {
          text: "Edge check: Synth BTC 52% vs Polymarket YES 48%. Edge +400 bps. Signal emitted for Risk.",
          actions: ["POLYMARKET_EDGE_CHECK"],
        },
      },
    ],
  ],
};

export default polymarketEdgeCheckAction;
