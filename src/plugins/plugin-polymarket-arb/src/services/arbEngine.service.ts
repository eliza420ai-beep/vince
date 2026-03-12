/**
 * Arb Engine Service
 *
 * Wires Binance spot + Polymarket CLOB feeds; runs discovery every 5 min;
 * on each tick, recomputes implied prob per contract, detects edge >= threshold,
 * sizes with Kelly, paper-logs always, optionally executes live via CLOB client.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  ContractMeta,
  ArbEngineConfig,
  ArbSignal,
  ArbSide,
  ArbTradeStatus,
  ExitReason,
} from "../types";
import {
  DEFAULT_ARB_CONFIG,
  ENV_KEYS,
  CONTRACT_DISCOVERY_INTERVAL_MS,
} from "../constants";
import { discoverBtcContracts } from "./contractDiscovery";
import { impliedProbabilityAbove, clampVol } from "./impliedProbability";
import {
  simulateOrderbookImpact,
  checkImpactEatsEdge,
} from "../../../plugin-polymarket-discovery/src/utils/lmsr";

const BINANCE_WS = "POLYMARKET_ARB_BINANCE_SPOT_WS";
const POLY_WS = "POLYMARKET_ARB_CLOB_WS";
const ARB_TRADES_TABLE = "plugin_polymarket_arb.arb_trades";
const ARB_SESSIONS_TABLE = "plugin_polymarket_arb.arb_sessions";

/** SQL to create schema and arb tables (PGLite or Postgres). Run once at startup. */
const ARB_TABLES_SQL = `
CREATE SCHEMA IF NOT EXISTS plugin_polymarket_arb;
CREATE TABLE IF NOT EXISTS plugin_polymarket_arb.arb_trades (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  condition_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  side TEXT NOT NULL,
  btc_spot_price REAL NOT NULL,
  contract_price REAL NOT NULL,
  implied_prob REAL NOT NULL,
  edge_pct REAL NOT NULL,
  size_usd REAL NOT NULL,
  fill_price REAL,
  pnl_usd REAL,
  status TEXT NOT NULL,
  clob_order_id TEXT,
  exit_price REAL,
  exit_reason TEXT,
  latency_ms INTEGER
);
CREATE TABLE IF NOT EXISTS plugin_polymarket_arb.arb_sessions (
  date TEXT PRIMARY KEY,
  trades_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  total_pnl_usd REAL NOT NULL DEFAULT 0,
  avg_edge_pct REAL,
  bankroll_start REAL,
  bankroll_end REAL
);
`;

function getConfigFromEnv(): ArbEngineConfig {
  const num = (key: string, def: number): number => {
    const v = process.env[key];
    if (v == null || v === "") return def;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  };
  const bool = (key: string, def: boolean): boolean => {
    const v = process.env[key];
    if (v == null || v === "") return def;
    return v.trim().toLowerCase() === "true" || v === "1";
  };
  return {
    bankrollUsd: num(ENV_KEYS.BANKROLL, DEFAULT_ARB_CONFIG.bankrollUsd),
    minEdgePct: num(ENV_KEYS.MIN_EDGE_PCT, DEFAULT_ARB_CONFIG.minEdgePct),
    kellyFraction: num(
      ENV_KEYS.KELLY_FRACTION,
      DEFAULT_ARB_CONFIG.kellyFraction,
    ),
    maxPositionUsd: num(
      ENV_KEYS.MAX_POSITION_USD,
      DEFAULT_ARB_CONFIG.maxPositionUsd,
    ),
    maxDailyTrades: num(
      ENV_KEYS.MAX_DAILY_TRADES,
      DEFAULT_ARB_CONFIG.maxDailyTrades,
    ),
    liveExecution: bool(ENV_KEYS.LIVE, DEFAULT_ARB_CONFIG.liveExecution),
    minLiquidityUsd: num(
      ENV_KEYS.MIN_LIQUIDITY_USD,
      DEFAULT_ARB_CONFIG.minLiquidityUsd,
    ),
    maxSpreadPct: num(ENV_KEYS.MAX_SPREAD_PCT, DEFAULT_ARB_CONFIG.maxSpreadPct),
    convergenceTakeProfitPct: num(
      ENV_KEYS.CONVERGENCE_TAKE_PROFIT_PCT,
      DEFAULT_ARB_CONFIG.convergenceTakeProfitPct,
    ),
    stopLossPct: num(ENV_KEYS.STOP_LOSS_PCT, DEFAULT_ARB_CONFIG.stopLossPct),
    staleDataThresholdMs: num(
      ENV_KEYS.STALE_DATA_THRESHOLD_MS,
      DEFAULT_ARB_CONFIG.staleDataThresholdMs,
    ),
    circuitBreakerConsecutiveLosses: num(
      ENV_KEYS.CIRCUIT_BREAKER_CONSECUTIVE_LOSSES,
      DEFAULT_ARB_CONFIG.circuitBreakerConsecutiveLosses,
    ),
    circuitBreakerDailyDrawdownPct: num(
      ENV_KEYS.CIRCUIT_BREAKER_DAILY_DRAWDOWN_PCT,
      DEFAULT_ARB_CONFIG.circuitBreakerDailyDrawdownPct,
    ),
  };
}

export class ArbEngineService extends Service {
  static serviceType = "POLYMARKET_ARB_ENGINE_SERVICE";
  capabilityDescription =
    "Latency arb engine: edge detection, Kelly sizing, paper/live execution";

  declare protected runtime: IAgentRuntime;
  private engineConfig: ArbEngineConfig = getConfigFromEnv();
  private contracts: ContractMeta[] = [];
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private exitTickInterval: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private tradesToday = 0;
  private winCountToday = 0;
  private todayPnlUsd = 0;
  private consecutiveLosses = 0;
  private dayStartBankroll = 0;
  private lastTradeDay = "";
  /** Cooldown per condition (ms) to avoid duplicate signals on same move */
  private lastSignalByCondition = new Map<string, number>();
  private readonly signalCooldownMs = 60_000;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<ArbEngineService> {
    const engine = new ArbEngineService(runtime);
    engine.engineConfig = getConfigFromEnv();
    engine.dayStartBankroll = engine.engineConfig.bankrollUsd;
    engine.lastTradeDay = engine.getToday();
    await engine.ensureArbTables();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await engine.upsertArbSession(yesterday.toISOString().slice(0, 10));
    await engine.runDiscovery();
    engine.discoveryInterval = setInterval(() => {
      engine
        .runDiscovery()
        .catch((e) => logger.warn("[ArbEngine] Discovery: " + e));
    }, CONTRACT_DISCOVERY_INTERVAL_MS);
    engine.tickInterval = setInterval(() => {
      engine.tick().catch((e) => logger.debug("[ArbEngine] Tick: " + e));
    }, 300);
    engine.exitTickInterval = setInterval(() => {
      engine
        .runExitTick()
        .catch((e) => logger.debug("[ArbEngine] ExitTick: " + e));
    }, 5000);
    logger.info(
      "[ArbEngine] Started (paper=" + !engine.engineConfig.liveExecution + ")",
    );
    return engine;
  }

  async stop(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.exitTickInterval) {
      clearInterval(this.exitTickInterval);
      this.exitTickInterval = null;
    }
    logger.info("[ArbEngine] Stopped");
  }

  getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async upsertArbSession(date: string): Promise<void> {
    const conn = await (
      this.runtime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();
    if (
      !conn ||
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
        .query !== "function"
    )
      return;
    const client = conn as {
      query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
    };
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    const { rows } = await client.query(
      `SELECT COUNT(*) as trades_count,
              SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END)::INTEGER as win_count,
              COALESCE(SUM(pnl_usd), 0) as total_pnl_usd,
              AVG(edge_pct) as avg_edge_pct
       FROM ${ARB_TRADES_TABLE}
       WHERE created_at >= $1 AND created_at <= $2 AND status = 'closed'`,
      [startOfDay, endOfDay],
    );
    const r = (rows[0] as Record<string, unknown>) ?? {};
    const tradesCount = Number(r.trades_count) ?? 0;
    const winCount = Number(r.win_count) ?? 0;
    const totalPnlUsd = Number(r.total_pnl_usd) ?? 0;
    const avgEdgePct = r.avg_edge_pct != null ? Number(r.avg_edge_pct) : null;
    const bankrollStart = null;
    const bankrollEnd = null;
    await client.query(
      `INSERT INTO ${ARB_SESSIONS_TABLE} (date, trades_count, win_count, total_pnl_usd, avg_edge_pct, bankroll_start, bankroll_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (date) DO UPDATE SET
         trades_count = EXCLUDED.trades_count,
         win_count = EXCLUDED.win_count,
         total_pnl_usd = EXCLUDED.total_pnl_usd,
         avg_edge_pct = EXCLUDED.avg_edge_pct,
         bankroll_start = EXCLUDED.bankroll_start,
         bankroll_end = EXCLUDED.bankroll_end`,
      [
        date,
        tradesCount,
        winCount,
        totalPnlUsd,
        avgEdgePct,
        bankrollStart,
        bankrollEnd,
      ],
    );
  }

  /** Create plugin_polymarket_arb schema and arb_trades table if missing (PGLite or Postgres). */
  private async ensureArbTables(): Promise<void> {
    const conn = await (
      this.runtime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();
    if (
      !conn ||
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
        .query !== "function"
    ) {
      logger.debug(
        "[ArbEngine] No DB connection; arb trades will not be persisted (use PGLite or set POSTGRES_URL).",
      );
      return;
    }
    try {
      const client = conn as {
        query: (text: string, values?: unknown[]) => Promise<unknown>;
      };
      await client.query(ARB_TABLES_SQL);
      logger.debug(
        "[ArbEngine] arb_trades table ready (plugin_polymarket_arb).",
      );
    } catch (e) {
      logger.warn(
        "[ArbEngine] Failed to ensure arb_trades table: " +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const binance = this.runtime.getService(BINANCE_WS) as {
      getPriceState?: () => { lastPrice: number; lastUpdateMs: number };
    } | null;
    const poly = this.runtime.getService(POLY_WS) as {
      getAllBookStates?: () => Map<string, unknown>;
    } | null;
    const btcLast = binance?.getPriceState?.()?.lastPrice ?? 0;
    return {
      liveExecution: this.engineConfig.liveExecution,
      paused: this.paused,
      tradesToday: this.tradesToday,
      winCountToday: this.winCountToday,
      todayPnlUsd: this.todayPnlUsd,
      bankrollUsd: this.engineConfig.bankrollUsd,
      contractsWatched: this.contracts.length,
      btcLastPrice: btcLast,
    };
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
  }

  getConfig(): Record<string, unknown> {
    return {
      minEdgePct: this.engineConfig.minEdgePct,
      kellyFraction: this.engineConfig.kellyFraction,
      maxPositionUsd: this.engineConfig.maxPositionUsd,
      maxDailyTrades: this.engineConfig.maxDailyTrades,
    };
  }

  private async runDiscovery(): Promise<void> {
    const list = await discoverBtcContracts();
    this.contracts = list;
    const poly = this.runtime.getService(POLY_WS) as {
      setSubscribedTokenIds?: (ids: string[]) => void;
    } | null;
    if (poly?.setSubscribedTokenIds) {
      const tokenIds = list.flatMap((c) => [c.yesTokenId, c.noTokenId]);
      poly.setSubscribedTokenIds(tokenIds);
    }
  }

  private async tick(): Promise<void> {
    if (this.paused || this.contracts.length === 0) return;
    const binance = this.runtime.getService(BINANCE_WS) as {
      getPriceState?: () => { lastPrice: number; lastUpdateMs: number };
      getVolatility?: () => number;
    } | null;
    const poly = this.runtime.getService(POLY_WS) as {
      getBookState?: (tokenId: string) => {
        midPrice: number;
        bestBid: number;
        bestAsk: number;
        lastUpdateMs: number;
        bidSizeUsd?: number;
        askSizeUsd?: number;
      } | null;
      getOrderbookLevels?: (
        tokenId: string,
        side: "bids" | "asks",
      ) => Array<{ price: number; size: number }>;
    } | null;
    if (!binance?.getPriceState || !poly?.getBookState) return;

    const priceState = binance.getPriceState();
    const vol = binance.getVolatility?.() ?? 0.5;
    const spot = priceState.lastPrice;
    const now = Date.now();
    if (spot <= 0) return;
    if (now - priceState.lastUpdateMs > this.engineConfig.staleDataThresholdMs)
      return;

    const sigma = clampVol(vol > 0 ? vol : 0.5);

    for (const c of this.contracts) {
      const yesState = poly.getBookState(c.yesTokenId);
      if (!yesState || yesState.lastUpdateMs === 0) continue;
      if (now - yesState.lastUpdateMs > this.engineConfig.staleDataThresholdMs)
        continue;

      const spreadPct = (yesState.bestAsk - yesState.bestBid) * 100;
      if (spreadPct > this.engineConfig.maxSpreadPct) continue;
      const liquidity = (yesState.bidSizeUsd ?? 0) + (yesState.askSizeUsd ?? 0);
      if (liquidity < this.engineConfig.minLiquidityUsd) continue;

      const implied = impliedProbabilityAbove(
        spot,
        c.strikeUsd,
        c.expiryMs,
        sigma,
      );
      const marketPrice = yesState.midPrice;
      const edgeYesPct = (implied - marketPrice) * 100;
      const edgeNoPct = (1 - implied - (1 - marketPrice)) * 100;

      if (
        Math.abs(edgeYesPct) >= this.engineConfig.minEdgePct ||
        Math.abs(edgeNoPct) >= this.engineConfig.minEdgePct
      ) {
        const useYes = Math.abs(edgeYesPct) >= Math.abs(edgeNoPct);
        const edgePct = useYes ? edgeYesPct : edgeNoPct;
        const side: ArbSide = useYes ? "BUY_YES" : "BUY_NO";
        const tokenId = useYes ? c.yesTokenId : c.noTokenId;
        const contractPrice = useYes ? marketPrice : 1 - marketPrice;
        const impliedForSide = useYes ? implied : 1 - implied;

        const signal: ArbSignal = {
          conditionId: c.conditionId,
          tokenId,
          side,
          impliedProb: impliedForSide,
          contractPrice,
          edgePct,
          btcSpotPrice: spot,
          strikeUsd: c.strikeUsd,
          expiryMs: c.expiryMs,
          question: c.question,
          timestamp: now,
        };
        await this.tryExecute(signal);
      }
    }
  }

  private async tryExecute(signal: ArbSignal): Promise<void> {
    const cooldownKey = signal.conditionId + "|" + signal.side;
    const last = this.lastSignalByCondition.get(cooldownKey) ?? 0;
    if (Date.now() - last < this.signalCooldownMs) return;
    this.lastSignalByCondition.set(cooldownKey, Date.now());

    const today = this.getToday();
    if (today !== this.lastTradeDay) {
      this.lastTradeDay = today;
      this.tradesToday = 0;
      this.winCountToday = 0;
      this.todayPnlUsd = 0;
      this.dayStartBankroll = this.engineConfig.bankrollUsd;
      this.consecutiveLosses = 0;
    }
    if (this.tradesToday >= this.engineConfig.maxDailyTrades) return;
    if (
      this.consecutiveLosses >=
      this.engineConfig.circuitBreakerConsecutiveLosses
    )
      return;
    const drawdownPct =
      ((this.dayStartBankroll - this.engineConfig.bankrollUsd) /
        this.dayStartBankroll) *
      100;
    if (drawdownPct >= this.engineConfig.circuitBreakerDailyDrawdownPct) return;

    const odds = signal.contractPrice <= 0 ? 1 : signal.contractPrice;
    const kellyF = signal.edgePct / 100 / odds;
    const f = Math.max(
      0,
      Math.min(0.25, this.engineConfig.kellyFraction * kellyF),
    );
    let sizeUsd = this.engineConfig.bankrollUsd * f;
    sizeUsd = Math.min(sizeUsd, this.engineConfig.maxPositionUsd);
    if (sizeUsd < 5) return;

    const poly = this.runtime.getService(POLY_WS) as {
      getOrderbookLevels?: (
        tokenId: string,
        side: "bids" | "asks",
      ) => Array<{ price: number; size: number }>;
    } | null;
    if (poly?.getOrderbookLevels) {
      const asks = poly.getOrderbookLevels(signal.tokenId, "asks");
      if (asks.length > 0) {
        const targetShares = sizeUsd / signal.contractPrice;
        const { avgFill } = simulateOrderbookImpact(asks, targetShares);
        const edgePerShare = signal.edgePct / 100;
        if (checkImpactEatsEdge(edgePerShare, avgFill, signal.contractPrice)) {
          sizeUsd = Math.max(5, sizeUsd / 2);
          if (sizeUsd < 5) return;
        }
      }
    }

    const tradeId = crypto.randomUUID();
    const status: ArbTradeStatus = this.engineConfig.liveExecution
      ? "pending"
      : "paper";
    const fillPrice = this.engineConfig.liveExecution
      ? null
      : signal.contractPrice;
    let clobOrderId: string | null = null;

    if (this.engineConfig.liveExecution) {
      const result = await this.placeLiveOrder(
        signal.tokenId,
        signal.side,
        sizeUsd,
        signal.contractPrice,
      );
      if (!result.success) {
        if (result.rejected) {
          logger.warn(
            "[ArbEngine] Live order rejected: " +
              (result.errorMsg ?? "unknown"),
          );
        } else {
          logger.error(
            "[ArbEngine] Live order failed: " + (result.errorMsg ?? "unknown"),
          );
        }
        return;
      }
      clobOrderId = result.orderID ?? null;
    }

    const conn = await (
      this.runtime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();
    if (
      conn &&
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
        .query === "function"
    ) {
      const client = conn as {
        query: (text: string, values?: unknown[]) => Promise<unknown>;
      };
      await client.query(
        `INSERT INTO ${ARB_TRADES_TABLE} (id, created_at, condition_id, token_id, side, btc_spot_price, contract_price, implied_prob, edge_pct, size_usd, fill_price, pnl_usd, status, clob_order_id, exit_price, exit_reason, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          tradeId,
          new Date(signal.timestamp).toISOString(),
          signal.conditionId,
          signal.tokenId,
          signal.side,
          signal.btcSpotPrice,
          signal.contractPrice,
          signal.impliedProb,
          signal.edgePct,
          sizeUsd,
          fillPrice ?? signal.contractPrice,
          null,
          status,
          clobOrderId,
          null,
          null,
          null,
        ],
      );
    }

    this.tradesToday++;
    logger.info(
      `[ArbEngine] ${status} ${signal.side} $${sizeUsd.toFixed(0)} edge=${signal.edgePct.toFixed(1)}%`,
    );
  }

  private async runExitTick(): Promise<void> {
    const today = this.getToday();
    if (today !== this.lastTradeDay) {
      const prevDay = this.lastTradeDay;
      this.lastTradeDay = today;
      this.tradesToday = 0;
      this.winCountToday = 0;
      this.todayPnlUsd = 0;
      this.dayStartBankroll = this.engineConfig.bankrollUsd;
      this.consecutiveLosses = 0;
      if (prevDay) await this.upsertArbSession(prevDay);
    }

    const conn = await (
      this.runtime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();
    if (
      !conn ||
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
        .query !== "function"
    )
      return;

    const poly = this.runtime.getService(POLY_WS) as {
      getBookState?: (tokenId: string) => {
        midPrice: number;
        lastUpdateMs: number;
      } | null;
    } | null;
    const binance = this.runtime.getService(BINANCE_WS) as {
      getPriceState?: () => { lastPrice: number };
    } | null;
    if (!poly?.getBookState) return;

    const client = conn as {
      query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
    };
    const { rows: openTrades } = await client.query(
      `SELECT id, condition_id, token_id, side, fill_price, size_usd, btc_spot_price
       FROM ${ARB_TRADES_TABLE}
       WHERE (status = 'paper' OR status = 'pending') AND exit_price IS NULL`,
    );
    const now = Date.now();
    for (const row of openTrades as Array<{
      id: string;
      condition_id: string;
      token_id: string;
      side: string;
      fill_price: number;
      size_usd: number;
      btc_spot_price: number;
    }>) {
      const contract = this.contracts.find(
        (c) => c.conditionId === row.condition_id,
      );
      const fillPrice = row.fill_price ?? 0;
      const sizeUsd = row.size_usd ?? 0;
      const shares = fillPrice > 0 ? sizeUsd / fillPrice : 0;

      let exitPrice: number | null = null;
      let exitReason: ExitReason | null = null;
      let pnlUsd: number | null = null;

      if (contract && now >= contract.expiryMs) {
        const btcSpot =
          binance?.getPriceState?.()?.lastPrice ?? row.btc_spot_price;
        const resolvedYes = btcSpot >= contract.strikeUsd ? 1 : 0;
        const resolvedNo = 1 - resolvedYes;
        const isYes = row.side === "BUY_YES";
        exitPrice = isYes ? resolvedYes : resolvedNo;
        exitReason = "resolution";
        pnlUsd = (exitPrice - fillPrice) * shares;
      } else {
        const bookState = poly.getBookState!(row.token_id);
        if (!bookState || bookState.lastUpdateMs === 0) continue;
        const mid = bookState.midPrice;
        const movePct = ((mid - fillPrice) / fillPrice) * 100;
        const isYes = row.side === "BUY_YES";
        const favorableMove = isYes ? movePct > 0 : movePct < 0;

        if (
          favorableMove &&
          Math.abs(movePct) >= this.engineConfig.convergenceTakeProfitPct
        ) {
          exitPrice = mid;
          exitReason = "convergence";
          pnlUsd = (exitPrice - fillPrice) * shares;
        } else if (
          !favorableMove &&
          Math.abs(movePct) >= this.engineConfig.stopLossPct
        ) {
          exitPrice = mid;
          exitReason = "stop_loss";
          pnlUsd = (exitPrice - fillPrice) * shares;
        }
      }

      if (exitPrice != null && exitReason != null && pnlUsd != null) {
        await client.query(
          `UPDATE ${ARB_TRADES_TABLE} SET exit_price = $1, exit_reason = $2, pnl_usd = $3, status = 'closed' WHERE id = $4`,
          [exitPrice, exitReason, pnlUsd, row.id],
        );
        this.todayPnlUsd += pnlUsd;
        if (pnlUsd > 0) {
          this.winCountToday++;
          this.consecutiveLosses = 0;
        } else {
          this.consecutiveLosses++;
        }
        logger.info(
          `[ArbEngine] Closed ${row.id} ${exitReason} pnl=$${pnlUsd.toFixed(2)}`,
        );
      }
    }
  }

  private async placeLiveOrder(
    tokenId: string,
    side: ArbSide,
    sizeUsd: number,
    price: number,
  ): Promise<{
    success: boolean;
    orderID?: string;
    avgPrice?: number;
    errorMsg?: string;
    rejected?: boolean;
  }> {
    const privateKey =
      this.runtime.getSetting("POLYMARKET_PRIVATE_KEY") ??
      this.runtime.getSetting("EVM_PRIVATE_KEY");
    const apiKey = this.runtime.getSetting("POLYMARKET_CLOB_API_KEY");
    const apiSecret = this.runtime.getSetting("POLYMARKET_CLOB_SECRET");
    const apiPassphrase = this.runtime.getSetting("POLYMARKET_CLOB_PASSPHRASE");
    const funder = this.runtime.getSetting("POLYMARKET_FUNDER_ADDRESS");
    const clobHost =
      (this.runtime.getSetting("POLYMARKET_CLOB_API_URL") as string) ||
      "https://clob.polymarket.com";
    if (!privateKey || !apiKey || !apiSecret || !apiPassphrase || !funder) {
      return {
        success: false,
        rejected: true,
        errorMsg: "missing credentials",
      };
    }
    try {
      const { ClobClient, Side, OrderType } =
        await import("@polymarket/clob-client");
      const { Wallet } = await import("@ethersproject/wallet");
      const signer = new Wallet(privateKey as string);
      const creds = {
        key: String(apiKey),
        secret: String(apiSecret),
        passphrase: String(apiPassphrase),
      };
      const clobClient = new ClobClient(
        clobHost,
        137,
        signer as any,
        creds,
        2,
        funder as string,
      );
      const sideEnum = side === "BUY_YES" ? Side.BUY : Side.SELL;
      const resp = (await clobClient.createAndPostMarketOrder(
        {
          side: sideEnum,
          tokenID: tokenId,
          amount: sizeUsd,
          feeRateBps: 0,
          nonce: Date.now(),
          price,
        },
        undefined,
        OrderType.FOK,
      )) as { orderID?: string; avgPrice?: number; errorMsg?: string } | null;
      if (resp?.errorMsg) {
        return {
          success: false,
          rejected: true,
          errorMsg: resp.errorMsg,
        };
      }
      return {
        success: true,
        orderID: resp?.orderID,
        avgPrice: resp?.avgPrice,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        rejected: false,
        errorMsg: msg,
      };
    }
  }
}
