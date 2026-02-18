/**
 * POLYMARKET_RISK_APPROVE Action
 *
 * Risk agent: consume a pending signal, check bankroll/exposure/limits,
 * apply Kelly (or config) sizing, write sized order for Executor. No wallet.
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

const POLYMARKET_SERVICE_TYPE = "POLYMARKET_DISCOVERY_SERVICE";
const SIGNALS_TABLE = "plugin_polymarket_desk.signals";
const SIZED_ORDERS_TABLE = "plugin_polymarket_desk.sized_orders";
const DEFAULT_KELLY_FRACTION = 0.25;
const DEFAULT_MAX_POSITION_PCT = 0.05;
const DEFAULT_MIN_SIZE_USD = 5;
const DEFAULT_MAX_SIZE_USD = 500;

interface RiskApproveParams {
  signal_id?: string;
  wallet_address?: string;
}

type RiskApproveActionResult = ActionResult & { sized_order_id?: string; signal_id?: string };

export const polymarketRiskApproveAction: Action = {
  name: "POLYMARKET_RISK_APPROVE",
  similes: ["POLYMARKET_APPROVE_SIGNAL", "RISK_APPROVE", "SIZE_AND_QUEUE"],
  description:
    "Risk agent: take a pending Polymarket desk signal (by signal_id or next in queue), check bankroll and limits, size the position (Kelly or config), and write a sized order for the Executor. Requires wallet_address for balance/positions. No execution.",

  parameters: {
    signal_id: {
      type: "string",
      description: "UUID of the signal to approve. If omitted, next pending signal is used.",
    },
    wallet_address: {
      type: "string",
      description: "Wallet address for Polymarket balance and exposure (optional if set in settings).",
    },
  },

  validate: async (runtime: IAgentRuntime) => {
    const conn = await (runtime as { getConnection?: () => Promise<unknown> }).getConnection?.();
    return !!conn && typeof (conn as { query: unknown }).query === "function";
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams ?? {}) as RiskApproveParams;
      let signalId = params.signal_id?.trim();
      const walletAddress =
        params.wallet_address?.trim() ||
        (runtime.getSetting?.("POLYMARKET_DESK_WALLET_ADDRESS") as string)?.trim();

      const conn = await (runtime as { getConnection?: () => Promise<unknown> }).getConnection?.();
      if (!conn || typeof (conn as { query: (s: string, v?: unknown[]) => Promise<{ rows: unknown[] }> }).query !== "function") {
        const text = " Database connection not available for risk approve.";
        if (callback) await callback({ text });
        return { text, success: false };
      }
      const client = conn as {
        query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
      };

      interface SignalRow {
        id: string;
        market_id: string;
        side: string;
        suggested_size_usd: number | null;
        confidence: number | null;
        edge_bps: number | null;
        forecast_prob: number | null;
        market_price: number | null;
      }

      let signal: SignalRow | null = null;

      if (signalId) {
        const r = await client.query(
          `SELECT id, market_id, side, suggested_size_usd, confidence, edge_bps, forecast_prob, market_price FROM ${SIGNALS_TABLE} WHERE id = $1 AND status = 'pending'`,
          [signalId],
        );
        signal = (r.rows[0] as SignalRow) ?? null;
      } else {
        const r = await client.query(
          `SELECT id, market_id, side, suggested_size_usd, confidence, edge_bps, forecast_prob, market_price FROM ${SIGNALS_TABLE} WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`,
          [],
        );
        signal = (r.rows[0] as SignalRow) ?? null;
        if (signal) signalId = signal.id;
      }

      if (!signal) {
        const text = " No pending signal found to approve.";
        if (callback) await callback({ text });
        return { text, success: true };
      }

      const bankrollUsd =
        Number(runtime.getSetting?.("POLYMARKET_DESK_BANKROLL_USD") ?? 0) || 1000;
      const kellyFraction =
        Number(runtime.getSetting?.("POLYMARKET_DESK_KELLY_FRACTION") ?? DEFAULT_KELLY_FRACTION) ||
        DEFAULT_KELLY_FRACTION;
      const maxPositionPct =
        Number(runtime.getSetting?.("POLYMARKET_DESK_MAX_POSITION_PCT") ?? DEFAULT_MAX_POSITION_PCT) ||
        DEFAULT_MAX_POSITION_PCT;
      const minSizeUsd =
        Number(runtime.getSetting?.("POLYMARKET_DESK_MIN_SIZE_USD") ?? DEFAULT_MIN_SIZE_USD) || DEFAULT_MIN_SIZE_USD;
      const maxSizeUsd =
        Number(runtime.getSetting?.("POLYMARKET_DESK_MAX_SIZE_USD") ?? DEFAULT_MAX_SIZE_USD) || DEFAULT_MAX_SIZE_USD;

      let sizeUsd = signal.suggested_size_usd ?? bankrollUsd * maxPositionPct;
      const edgeBps = signal.edge_bps ?? 0;
      const confidence = signal.confidence ?? 0.5;
      if (kellyFraction > 0 && Math.abs(edgeBps) > 0) {
        const edgePct = Math.abs(edgeBps) / 10000;
        const kellyPct = edgePct * kellyFraction * confidence;
        sizeUsd = Math.min(bankrollUsd * kellyPct, bankrollUsd * maxPositionPct);
      }
      sizeUsd = Math.max(minSizeUsd, Math.min(maxSizeUsd, sizeUsd));

      const sizedOrderId = crypto.randomUUID();
      const now = new Date().toISOString();

      await client.query(
        `INSERT INTO ${SIZED_ORDERS_TABLE} (id, created_at, signal_id, market_id, side, size_usd, max_price, slippage_bps, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [sizedOrderId, now, signal.id, signal.market_id, signal.side, sizeUsd, null, 50, "pending"],
      );
      await client.query(
        `UPDATE ${SIGNALS_TABLE} SET status = 'approved' WHERE id = $1`,
        [signal.id],
      );

      logger.info(
        `[POLYMARKET_RISK_APPROVE] Sized order ${sizedOrderId} for signal ${signal.id} size_usd=${sizeUsd}`,
      );

      const summary =
        ` **Risk approved** signal ${signal.id.slice(0, 8)}… → sized order ${sizedOrderId.slice(0, 8)}…\n` +
        ` Market: ${signal.market_id.slice(0, 14)}… | Side: ${signal.side} | Size: $${sizeUsd.toFixed(2)}\n` +
        ` Bankroll: $${bankrollUsd} | Executor can pick up this order.`;

      const result: RiskApproveActionResult = {
        text: summary,
        success: true,
        sized_order_id: sizedOrderId,
        signal_id: signal.id,
      };
      if (callback) await callback({ text: summary });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[POLYMARKET_RISK_APPROVE] ${msg}`);
      const text = ` Risk approve failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Approve pending Polymarket signals" },
      },
      {
        name: "Polymarket Risk",
        content: {
          text: "Risk approved signal abc… → sized order def… Market: 0x… Side: YES Size: $50. Executor can pick up.",
          actions: ["POLYMARKET_RISK_APPROVE"],
        },
      },
    ],
  ],
};

export default polymarketRiskApproveAction;
