/**
 * Multi-strategy edge engine: runs Overreaction, ModelFairValue, SynthForecast
 * on their intervals and emits signals to the desk pipeline.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { ContractMeta } from "../types";
import type {
  EdgeStrategy,
  EdgeSignal,
  TickContext,
} from "../strategies/types";
import {
  EDGE_SERVICE_TYPES,
  CONTRACT_DISCOVERY_INTERVAL_MS,
  ENV_EDGE_STRATEGIES_ENABLED,
  DEFAULT_OVERREACTION_WINDOW_MS,
} from "../constants";
import { emitSignal } from "./signalEmitter";
import { PriceVelocityTracker } from "./priceVelocity";
import { modelFairValueStrategy } from "../strategies/modelFairValue";
import { overreactionStrategy } from "../strategies/overreaction";
import { synthForecastStrategy } from "../strategies/synthForecast";
import {
  makerRebateStrategy,
  is5MinBtcMarket,
} from "../strategies/makerRebate";

const BINANCE_WS = EDGE_SERVICE_TYPES.BINANCE_WS;
const CLOB_WS = EDGE_SERVICE_TYPES.CLOB_WS;

const VELOCITY_TICK_MS = 2000; // update velocity tracker every 2s

function getEnabledStrategies(): EdgeStrategy[] {
  const env = process.env[ENV_EDGE_STRATEGIES_ENABLED];
  const all: EdgeStrategy[] = [
    modelFairValueStrategy,
    overreactionStrategy,
    synthForecastStrategy,
    makerRebateStrategy,
  ];
  if (!env?.trim()) return all;
  const enabled = new Set(
    env
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  if (enabled.size === 0) return all;
  return all.filter((s) => enabled.has(s.name.toLowerCase()));
}

export class EdgeEngineService extends Service {
  static serviceType = EDGE_SERVICE_TYPES.EDGE_ENGINE;
  capabilityDescription =
    "Multi-strategy edge engine: overreaction, model fair value, Synth forecast. Feeds signals to desk pipeline.";

  declare protected runtime: IAgentRuntime;
  private contracts: ContractMeta[] = [];
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private velocityTickInterval: ReturnType<typeof setInterval> | null = null;
  private strategyIntervals: Array<ReturnType<typeof setInterval>> = [];
  private readonly velocityTracker: PriceVelocityTracker;
  private paused = false;
  private strategyStats: Record<
    string,
    { lastSignalAt?: number; signalCount: number }
  > = {};

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.velocityTracker = new PriceVelocityTracker(
      DEFAULT_OVERREACTION_WINDOW_MS,
    );
  }

  static async start(runtime: IAgentRuntime): Promise<EdgeEngineService> {
    const engine = new EdgeEngineService(runtime);
    await engine.ensureTables();
    await engine.runDiscovery();

    engine.discoveryInterval = setInterval(() => {
      engine
        .runDiscovery()
        .catch((e) =>
          logger.warn(
            "[EdgeEngine] Discovery: " +
              (e instanceof Error ? e.message : String(e)),
          ),
        );
    }, CONTRACT_DISCOVERY_INTERVAL_MS);

    // Update velocity tracker from CLOB every 2s
    engine.velocityTickInterval = setInterval(() => {
      engine.updateVelocityTracker();
    }, VELOCITY_TICK_MS);

    const strategies = getEnabledStrategies();
    for (const strategy of strategies) {
      engine.strategyStats[strategy.name] = { signalCount: 0 };
      const iv = setInterval(() => {
        if (engine.paused) return;
        engine
          .runStrategy(strategy)
          .catch((e) =>
            logger.debug(
              "[EdgeEngine] Strategy " +
                strategy.name +
                ": " +
                (e instanceof Error ? e.message : String(e)),
            ),
          );
      }, strategy.tickIntervalMs);
      engine.strategyIntervals.push(iv);
    }

    logger.info(
      "[EdgeEngine] Started with strategies: " +
        strategies.map((s) => s.name).join(", "),
    );
    return engine;
  }

  async stop(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    if (this.velocityTickInterval) {
      clearInterval(this.velocityTickInterval);
      this.velocityTickInterval = null;
    }
    for (const iv of this.strategyIntervals) clearInterval(iv);
    this.strategyIntervals = [];
    logger.info("[EdgeEngine] Stopped");
  }

  getStatus(): Record<string, unknown> {
    const binance = this.runtime.getService(BINANCE_WS) as {
      getPriceState?: () => { lastPrice: number; lastUpdateMs: number };
      getVolatility?: () => number;
    } | null;
    const btcLast = binance?.getPriceState?.()?.lastPrice ?? 0;
    const vol = binance?.getVolatility?.() ?? 0;
    const now = Date.now();
    const entryWindowSec = 10;
    const contractsWithStrike = this.contracts.filter(
      (c) => c.strikeUsd > 0,
    ).length;
    const fiveMinInWindow = this.contracts.filter((c) => {
      if (!is5MinBtcMarket(c.question)) return false;
      const secs = (c.expiryMs - now) / 1000;
      return secs > 0 && secs <= entryWindowSec;
    }).length;
    const synthApiKeySet = !!process.env.SYNTH_API_KEY?.trim();
    return {
      paused: this.paused,
      contractsWatched: this.contracts.length,
      btcLastPrice: btcLast,
      volatility: vol,
      strategies: this.strategyStats,
      whyOnlySomeStrategies: {
        model_fair_value: `needs BTC threshold markets (strikeUsd>0): ${contractsWithStrike} of ${this.contracts.length} watched`,
        synth: synthApiKeySet
          ? "SYNTH_API_KEY set — can signal"
          : "SYNTH_API_KEY not set — no signals",
        maker_rebate: `needs 5-min BTC markets with expiry in 0–${entryWindowSec}s: ${fiveMinInWindow} right now`,
      },
    };
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  getContracts(): ContractMeta[] {
    return [...this.contracts];
  }

  async emit(signal: EdgeSignal): Promise<string | null> {
    const id = await emitSignal(this.runtime, signal);
    if (id && this.strategyStats[signal.strategy]) {
      this.strategyStats[signal.strategy].signalCount++;
      this.strategyStats[signal.strategy].lastSignalAt = Date.now();
    }
    return id;
  }

  private updateVelocityTracker(): void {
    const poly = this.runtime.getService(CLOB_WS) as {
      getBookState?: (tokenId: string) => {
        midPrice: number;
        lastUpdateMs: number;
      } | null;
    } | null;
    if (!poly?.getBookState) return;
    const now = Date.now();
    for (const c of this.contracts) {
      const yesState = poly.getBookState(c.yesTokenId);
      const noState = poly.getBookState(c.noTokenId);
      if (yesState?.lastUpdateMs)
        this.velocityTracker.pushPrice(c.yesTokenId, yesState.midPrice, now);
      if (noState?.lastUpdateMs)
        this.velocityTracker.pushPrice(c.noTokenId, noState.midPrice, now);
    }
  }

  private buildContext(): TickContext | null {
    const binance = this.runtime.getService(BINANCE_WS) as {
      getPriceState?: () => { lastPrice: number; lastUpdateMs: number };
      getVolatility?: () => number;
    } | null;
    const poly = this.runtime.getService(CLOB_WS) as {
      getBookState?: (
        tokenId: string,
      ) => import("../types").ContractBookState | null;
    } | null;
    if (!binance?.getPriceState || !poly?.getBookState) return null;
    const priceState = binance.getPriceState();
    const spot = priceState.lastPrice;
    const volatility = binance.getVolatility?.() ?? 0.5;
    const now = Date.now();

    return {
      spot,
      volatility,
      contracts: this.contracts,
      getBookState: (tokenId: string) => poly.getBookState!(tokenId) ?? null,
      getPriceVelocity: (tokenId: string) => {
        const state = poly.getBookState!(tokenId);
        if (!state) return null;
        return this.velocityTracker.getPriceVelocity(
          tokenId,
          state.midPrice,
          now,
        );
      },
      now,
    };
  }

  private async runStrategy(strategy: EdgeStrategy): Promise<void> {
    const ctx = this.buildContext();
    if (!ctx || ctx.contracts.length === 0) return;
    const signal = await strategy.tick(ctx);
    if (signal) {
      if (!signal.question) {
        const contract = this.contracts.find(
          (c) => c.conditionId === signal.market_id,
        );
        if (contract?.question) signal.question = contract.question;
      }
      await this.emit(signal);
    }
  }

  private async ensureTables(): Promise<void> {
    const conn = await (
      this.runtime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();
    if (
      !conn ||
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
        .query !== "function"
    ) {
      logger.debug("[EdgeEngine] No DB connection; tables may not exist.");
      return;
    }
    const client = conn as {
      query: (text: string, values?: unknown[]) => Promise<unknown>;
    };
    try {
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS plugin_polymarket_edge;
        CREATE TABLE IF NOT EXISTS plugin_polymarket_edge.edge_signals (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          strategy TEXT NOT NULL,
          source TEXT NOT NULL,
          market_id TEXT NOT NULL,
          side TEXT NOT NULL,
          confidence REAL,
          edge_bps REAL,
          forecast_prob REAL,
          market_price REAL,
          desk_signal_id TEXT,
          question TEXT
        );
      `);
      // Add question column if table already exists without it
      await client
        .query(
          `
        ALTER TABLE plugin_polymarket_edge.edge_signals
        ADD COLUMN IF NOT EXISTS question TEXT;
      `,
        )
        .catch(() => {});
    } catch (e) {
      logger.warn(
        "[EdgeEngine] Failed to ensure tables: " +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  private async runDiscovery(): Promise<void> {
    const { discoverContracts } = await import("./contractDiscovery");
    const list = await discoverContracts();
    this.contracts = list;
    const poly = this.runtime.getService(CLOB_WS) as {
      setSubscribedTokenIds?: (ids: string[]) => void;
    } | null;
    if (poly?.setSubscribedTokenIds && list.length > 0) {
      const tokenIds = list.flatMap((c) => [c.yesTokenId, c.noTokenId]);
      poly.setSubscribedTokenIds(tokenIds);
    }
  }
}
