/**
 * Alias services so runtime.getService("DERIBIT_SERVICE") and
 * runtime.getService("HYPERLIQUID_SERVICE") return our fallbacks when
 * external plugins are not loaded. This prevents "Service not found" log
 * spam from the core when fallback factories are used.
 *
 * Each alias extends Service (runtime, stop, capabilityDescription) and
 * delegates IDeribitService/IHyperliquidService methods to the built-in fallback.
 */
import { Service, type IAgentRuntime } from "@elizaos/core";
import { DeribitFallbackService } from "./deribit.fallback";
import { HyperliquidFallbackService } from "./hyperliquid.fallback";
import type {
  IDeribitService,
  IDeribitVolatilityIndex,
  IDeribitComprehensiveData,
} from "../../types/external-services";
import type {
  IHyperliquidService,
  IHyperliquidOptionsPulse,
  IHyperliquidCrossVenueFunding,
  IHyperliquidCryptoPulse,
} from "../../types/external-services";

/** Registers as DERIBIT_SERVICE; returns a Service that delegates to the built-in fallback. */
export class DeribitServiceAlias extends Service implements IDeribitService {
  static serviceType = "DERIBIT_SERVICE";
  capabilityDescription =
    "Deribit options data (fallback when plugin-deribit not loaded)";

  private readonly fallback = new DeribitFallbackService();

  static override async start(runtime: IAgentRuntime): Promise<Service> {
    return new DeribitServiceAlias(runtime);
  }

  override async stop(): Promise<void> {
    // Fallback is stateless; no cleanup required
  }

  getVolatilityIndex(asset: "BTC" | "ETH"): Promise<IDeribitVolatilityIndex | null> {
    return this.fallback.getVolatilityIndex(asset);
  }

  getComprehensiveData(currency: "BTC" | "ETH" | "SOL"): Promise<IDeribitComprehensiveData | null> {
    return this.fallback.getComprehensiveData(currency);
  }
}

/** Registers as HYPERLIQUID_SERVICE; returns a Service that delegates to the built-in fallback. */
export class HyperliquidServiceAlias extends Service implements IHyperliquidService {
  static serviceType = "HYPERLIQUID_SERVICE";
  capabilityDescription =
    "Hyperliquid funding/pulse (fallback when plugin-hyperliquid not loaded)";

  private readonly fallback = new HyperliquidFallbackService();

  static override async start(runtime: IAgentRuntime): Promise<Service> {
    return new HyperliquidServiceAlias(runtime);
  }

  override async stop(): Promise<void> {
    this.fallback.clearCache?.();
  }

  getOptionsPulse(): Promise<IHyperliquidOptionsPulse | null> {
    return this.fallback.getOptionsPulse();
  }

  getCrossVenueFunding(): Promise<IHyperliquidCrossVenueFunding | null> {
    return this.fallback.getCrossVenueFunding();
  }

  getAllCryptoPulse(): Promise<IHyperliquidCryptoPulse | null> {
    return this.fallback.getAllCryptoPulse?.() ?? Promise.resolve(null);
  }

  getMarkPrice(symbol: string): Promise<number | null> {
    return this.fallback.getMarkPrice?.(symbol) ?? Promise.resolve(null);
  }

  getMarkPriceAndChange(symbol: string): Promise<{ price: number; change24h: number } | null> {
    return this.fallback.getMarkPriceAndChange?.(symbol) ?? Promise.resolve(null);
  }

  isRateLimited(): boolean {
    return this.fallback.isRateLimited?.() ?? false;
  }

  getRateLimitStatus(): { isLimited: boolean; backoffUntil: number; circuitOpen?: boolean } {
    return this.fallback.getRateLimitStatus?.() ?? { isLimited: false, backoffUntil: 0 };
  }

  getPerpsAtOpenInterestCap(): Promise<string[] | null> {
    return this.fallback.getPerpsAtOpenInterestCap?.() ?? Promise.resolve(null);
  }

  getFundingRegime(
    coin: string,
    currentFunding8h: number,
    lookbackSamples?: number
  ): Promise<{ percentile: number; isExtremeLong: boolean; isExtremeShort: boolean } | null> {
    return this.fallback.getFundingRegime?.(coin, currentFunding8h, lookbackSamples) ?? Promise.resolve(null);
  }

  clearCache(): void {
    this.fallback.clearCache?.();
  }

  testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
    return this.fallback.testConnection?.() ?? Promise.resolve({ success: false, message: "Not implemented" });
  }
}
