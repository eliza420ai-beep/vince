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
} from "../types";
import {
  DEFAULT_ARB_CONFIG,
  ENV_KEYS,
  CONTRACT_DISCOVERY_INTERVAL_MS,
} from "../constants";
import { discoverBtcContracts } from "./contractDiscovery";
import { impliedProbabilityAbove, clampVol } from "./impliedProbability";

const BINANCE_WS = "POLYMARKET_ARB_BINANCE_SPOT_WS";
const POLY_WS = "POLYMARKET_ARB_CLOB_WS";
const ARB_TRADES_TABLE = "plugin_polymarket_arb.arb_trades";

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
    convergenceTakeProfitPct: DEFAULT_ARB_CONFIG.convergenceTakeProfitPct,
    stopLossPct: DEFAULT_ARB_CONFIG.stopLossPct,
    staleDataThresholdMs: DEFAULT_ARB_CONFIG.staleDataThresholdMs,
    circuitBreakerConsecutiveLosses:
      DEFAULT_ARB_CONFIG.circuitBreakerConsecutiveLosses,
    circuitBreakerDailyDrawdownPct:
      DEFAULT_ARB_CONFIG.circuitBreakerDailyDrawdownPct,
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
    await engine.runDiscovery();
    engine.discoveryInterval = setInterval(() => {
      engine
        .runDiscovery()
        .catch((e) => logger.warn("[ArbEngine] Discovery: " + e));
    }, CONTRACT_DISCOVERY_INTERVAL_MS);
    engine.tickInterval = setInterval(() => {
      engine.tick().catch((e) => logger.debug("[ArbEngine] Tick: " + e));
    }, 300);
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
    logger.info("[ArbEngine] Stopped");
  }

  getToday(): string {
    return new Date().toISOString().slice(0, 10);
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

    const tradeId = crypto.randomUUID();
    const status: ArbTradeStatus = this.engineConfig.liveExecution
      ? "pending"
      : "paper";
    const fillPrice = this.engineConfig.liveExecution
      ? null
      : signal.contractPrice;
    let clobOrderId: string | null = null;

    if (this.engineConfig.liveExecution) {
      try {
        const result = await this.placeLiveOrder(
          signal.tokenId,
          signal.side,
          sizeUsd,
          signal.contractPrice,
        );
        clobOrderId = result?.orderID ?? null;
        if (result?.errorMsg) {
          logger.warn("[ArbEngine] Live order rejected: " + result.errorMsg);
          return;
        }
      } catch (err) {
        logger.error("[ArbEngine] Live order failed: " + err);
        return;
      }
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

  private async placeLiveOrder(
    tokenId: string,
    side: ArbSide,
    sizeUsd: number,
    price: number,
  ): Promise<{
    orderID?: string;
    avgPrice?: number;
    errorMsg?: string;
  } | null> {
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
      logger.warn(
        "[ArbEngine] Live execution skipped: missing CLOB credentials",
      );
      return null;
    }
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
    const resp = await clobClient.createAndPostMarketOrder(
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
    );
    return (resp as any) ?? null;
  }
}
