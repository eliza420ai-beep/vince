/**
 * Alias services so runtime.getService("DERIBIT_SERVICE") and
 * runtime.getService("HYPERLIQUID_SERVICE") return our fallbacks when
 * external plugins are not loaded. This prevents "Service not found" log
 * spam from the core when fallback factories are used.
 */
import { Service, type IAgentRuntime } from "@elizaos/core";
import { DeribitFallbackService } from "./deribit.fallback";
import { HyperliquidFallbackService } from "./hyperliquid.fallback";

/** Registers as DERIBIT_SERVICE; returns built-in fallback so getService never misses. */
export class DeribitServiceAlias extends Service {
  static serviceType = "DERIBIT_SERVICE";
  capabilityDescription =
    "Deribit options data (fallback when plugin-deribit not loaded)";

  static async start(_runtime: IAgentRuntime): Promise<Service> {
    return new DeribitFallbackService() as unknown as Service;
  }

  async stop(): Promise<void> {
    // Alias delegates to fallback; no-op stop
  }
}

/** Registers as HYPERLIQUID_SERVICE; returns built-in fallback so getService never misses. */
export class HyperliquidServiceAlias extends Service {
  static serviceType = "HYPERLIQUID_SERVICE";
  capabilityDescription =
    "Hyperliquid funding/pulse (fallback when plugin-hyperliquid not loaded)";

  static async start(_runtime: IAgentRuntime): Promise<Service> {
    return new HyperliquidFallbackService() as unknown as Service;
  }

  async stop(): Promise<void> {
    // Alias delegates to fallback; no-op stop
  }
}
