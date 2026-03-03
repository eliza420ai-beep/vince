import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { IHyperliquidCryptoPulse } from "../types/external-services";
import { getOrCreateHyperliquidService } from "./fallbacks";
import { isVinceAgent } from "../utils/dashboard";

/**
 * Lightweight snapshot service for HL Crypto (perps) data.
 *
 * Responsibilities:
 * - Periodically refresh full crypto pulse from Hyperliquid (fallback or external plugin)
 * - Cache the latest successful pulse in-memory
 * - Expose cheap, cache-only accessors for HTTP routes (Markets / leaderboards)
 */
export class VinceHLCryptoSnapshotService extends Service {
  static serviceType = "VINCE_HLCRYPTO_SNAPSHOT_SERVICE";

  private pulse: IHyperliquidCryptoPulse | null = null;
  private lastUpdate = 0;
  private lastError: string | null = null;

  private refreshIntervalMs = 60_000;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceHLCryptoSnapshotService> {
    const service = new VinceHLCryptoSnapshotService(runtime);
    logger.debug("[VinceHLCryptoSnapshot] Service initialized");
    if (isVinceAgent(runtime)) {
      service.startBackgroundRefresh().catch((err) => {
        logger.debug(
          `[VinceHLCryptoSnapshot] Background refresh failed to start: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    }
    return service;
  }

  /**
   * Start periodic background refresh of the HL Crypto pulse.
   * Safe to call multiple times – only the first call registers a timer.
   */
  private async startBackgroundRefresh(): Promise<void> {
    if (this.refreshTimer) return;

    const envMs = Number(process.env.VINCE_HLCRYPTO_REFRESH_MS ?? "60000");
    if (Number.isFinite(envMs) && envMs >= 10_000 && envMs <= 10 * 60_000) {
      this.refreshIntervalMs = envMs;
    }

    const tick = async () => {
      try {
        const hyper = getOrCreateHyperliquidService(this.runtime);
        if (!hyper?.getAllCryptoPulse) return;
        const pulse = await hyper.getAllCryptoPulse();
        if (pulse && Array.isArray(pulse.assets) && pulse.assets.length > 0) {
          this.pulse = pulse;
          this.lastUpdate = Date.now();
          this.lastError = null;
        }
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        logger.debug(
          `[VinceHLCryptoSnapshot] Refresh error: ${this.lastError}`,
        );
      }
    };

    // Initial refresh without waiting for the first interval.
    void tick();

    this.refreshTimer = setInterval(() => {
      void tick();
    }, this.refreshIntervalMs);

    // Avoid keeping the Node process alive solely for this timer.
    (this.refreshTimer as any).unref?.();
  }

  /** Cached HL Crypto pulse (never triggers network). */
  getCachedPulse(): IHyperliquidCryptoPulse | null {
    return this.pulse;
  }

  getStatus(): {
    available: boolean;
    lastUpdate: number;
    error?: string | null;
  } {
    return {
      available: this.pulse != null,
      lastUpdate: this.lastUpdate,
      ...(this.lastError ? { error: this.lastError } : {}),
    };
  }
}
