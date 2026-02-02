/**
 * Fallback Services Factory
 *
 * Provides factory functions that return either:
 * 1. External plugin service (if available via runtime.getService())
 * 2. Built-in fallback service (if external not available)
 *
 * This ensures plugin-vince works standalone while leveraging
 * full plugin implementations when present.
 */

import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import type {
  IDeribitService,
  IHyperliquidService,
  IOpenSeaService,
  INansenService,
} from "../../types/external-services";
import { DeribitFallbackService } from "./deribit.fallback";
import { HyperliquidFallbackService } from "./hyperliquid.fallback";
import { OpenSeaFallbackService } from "./opensea.fallback";
import { NansenFallbackService } from "./nansen.fallback";
import { XAIFallbackService, type IXAIService } from "./xai.fallback";
import { BrowserFallbackService, type IBrowserService } from "./browser.fallback";

// Cached fallback instances (singleton per runtime)
const fallbackInstances = new WeakMap<IAgentRuntime, {
  deribit?: DeribitFallbackService;
  hyperliquid?: HyperliquidFallbackService;
  opensea?: OpenSeaFallbackService;
  nansen?: NansenFallbackService;
  xai?: XAIFallbackService;
  browser?: BrowserFallbackService;
}>();

/**
 * Get or create fallback instance cache for a runtime
 */
function getFallbackCache(runtime: IAgentRuntime): NonNullable<ReturnType<typeof fallbackInstances.get>> {
  let cache = fallbackInstances.get(runtime);
  if (!cache) {
    cache = {};
    fallbackInstances.set(runtime, cache);
  }
  return cache;
}

/**
 * Service source tracking for logging
 */
export interface ServiceSource {
  name: string;
  source: "external" | "fallback";
}

const serviceSources: ServiceSource[] = [];

/**
 * Get list of service sources (for logging/diagnostics)
 */
export function getServiceSources(): ServiceSource[] {
  return [...serviceSources];
}

/**
 * Clear service sources (for testing)
 */
export function clearServiceSources(): void {
  serviceSources.length = 0;
}

// ==========================================
// Deribit Service Factory
// ==========================================

/**
 * Get Deribit service - either external plugin or fallback
 *
 * @param runtime - Agent runtime
 * @returns Deribit service (external or fallback)
 */
export function getOrCreateDeribitService(runtime: IAgentRuntime): IDeribitService | null {
  // Try external service first
  const externalService = runtime.getService("DERIBIT_SERVICE") as unknown as IDeribitService | null;

  if (externalService) {
    // Verify it has the methods we need
    if (typeof externalService.getVolatilityIndex === "function" &&
        typeof externalService.getComprehensiveData === "function") {
      logger.debug("[FallbackFactory] Using external Deribit service");

      // Track source (only once)
      if (!serviceSources.find((s) => s.name === "deribit")) {
        serviceSources.push({ name: "deribit", source: "external" });
      }

      return externalService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.deribit) {
    logger.info("[FallbackFactory] Creating Deribit fallback service");
    cache.deribit = new DeribitFallbackService();

    // Track source
    if (!serviceSources.find((s) => s.name === "deribit")) {
      serviceSources.push({ name: "deribit", source: "fallback" });
    }
  }

  return cache.deribit;
}

// ==========================================
// Hyperliquid Service Factory
// ==========================================

/**
 * Get Hyperliquid service - either external plugin or fallback
 *
 * @param runtime - Agent runtime
 * @returns Hyperliquid service (external or fallback)
 */
export function getOrCreateHyperliquidService(runtime: IAgentRuntime): IHyperliquidService | null {
  // Try external service first
  const externalService = runtime.getService("HYPERLIQUID_SERVICE") as unknown as IHyperliquidService | null;

  if (externalService) {
    // Verify it has the methods we need
    if (typeof externalService.getOptionsPulse === "function" &&
        typeof externalService.getCrossVenueFunding === "function") {
      logger.debug("[FallbackFactory] Using external Hyperliquid service");

      // Track source
      if (!serviceSources.find((s) => s.name === "hyperliquid")) {
        serviceSources.push({ name: "hyperliquid", source: "external" });
      }

      return externalService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.hyperliquid) {
    logger.info("[FallbackFactory] Creating Hyperliquid fallback service");
    cache.hyperliquid = new HyperliquidFallbackService();

    // Track source
    if (!serviceSources.find((s) => s.name === "hyperliquid")) {
      serviceSources.push({ name: "hyperliquid", source: "fallback" });
    }
  }

  return cache.hyperliquid;
}

// ==========================================
// OpenSea Service Factory
// ==========================================

/**
 * Get OpenSea service - either external plugin or fallback
 *
 * @param runtime - Agent runtime
 * @returns OpenSea service (external or fallback)
 */
export function getOrCreateOpenSeaService(runtime: IAgentRuntime): IOpenSeaService | null {
  // Try external service first
  const externalService = runtime.getService("opensea") as unknown as IOpenSeaService | null;

  if (externalService) {
    // Verify it has the methods we need
    if (typeof externalService.analyzeFloorOpportunities === "function") {
      logger.debug("[FallbackFactory] Using external OpenSea service");

      // Track source
      if (!serviceSources.find((s) => s.name === "opensea")) {
        serviceSources.push({ name: "opensea", source: "external" });
      }

      return externalService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.opensea) {
    logger.info("[FallbackFactory] Creating OpenSea fallback service");
    cache.opensea = new OpenSeaFallbackService(runtime);

    // Track source
    if (!serviceSources.find((s) => s.name === "opensea")) {
      serviceSources.push({ name: "opensea", source: "fallback" });
    }
  }

  return cache.opensea;
}

// ==========================================
// Nansen Service Factory
// ==========================================

/**
 * Get Nansen service - either the main service or fallback
 *
 * Unlike other fallbacks, this doesn't connect to an alternative API.
 * The fallback simply returns empty data to allow graceful degradation.
 *
 * @param runtime - Agent runtime
 * @returns Nansen service (main or fallback)
 */
export function getOrCreateNansenService(runtime: IAgentRuntime): INansenService {
  // Try the main Nansen service first
  const mainService = runtime.getService("VINCE_NANSEN_SERVICE") as unknown as INansenService | null;

  if (mainService) {
    // Verify it has the methods we need
    if (typeof mainService.getSmartMoneyTokens === "function" &&
        typeof mainService.getCreditUsage === "function") {
      logger.debug("[FallbackFactory] Using main Nansen service");

      // Track source
      if (!serviceSources.find((s) => s.name === "nansen")) {
        serviceSources.push({ name: "nansen", source: "external" });
      }

      return mainService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.nansen) {
    logger.info("[FallbackFactory] Creating Nansen fallback service (smart money data unavailable)");
    cache.nansen = new NansenFallbackService();

    // Track source
    if (!serviceSources.find((s) => s.name === "nansen")) {
      serviceSources.push({ name: "nansen", source: "fallback" });
    }
  }

  return cache.nansen;
}

// ==========================================
// XAI Service Factory
// ==========================================

/**
 * Get XAI service - either external plugin or fallback
 *
 * @param runtime - Agent runtime
 * @returns XAI service (external or fallback), or null if not configured
 */
export function getOrCreateXAIService(runtime: IAgentRuntime): IXAIService | null {
  // Try external service first
  const externalService = runtime.getService("XAI_SERVICE") as unknown as IXAIService | null;

  if (externalService) {
    // Verify it has the methods we need
    if (typeof externalService.isConfigured === "function" &&
        typeof externalService.generateText === "function") {
      logger.debug("[FallbackFactory] Using external XAI service");

      // Track source
      if (!serviceSources.find((s) => s.name === "xai")) {
        serviceSources.push({ name: "xai", source: "external" });
      }

      return externalService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.xai) {
    logger.info("[FallbackFactory] Creating XAI fallback service");
    cache.xai = new XAIFallbackService(runtime);

    // Track source
    if (!serviceSources.find((s) => s.name === "xai")) {
      serviceSources.push({ name: "xai", source: "fallback" });
    }
  }

  // Return null if not configured (no API key)
  if (!cache.xai.isConfigured()) {
    return null;
  }

  return cache.xai;
}

// ==========================================
// Browser Service Factory
// ==========================================

/**
 * Get Browser service - either external plugin or fallback
 *
 * @param runtime - Agent runtime
 * @returns Browser service (external or fallback)
 */
export function getOrCreateBrowserService(runtime: IAgentRuntime): IBrowserService | null {
  // Try external services first (multiple possible keys)
  const externalService = (
    runtime.getService("BROWSER_AUTOMATION") || 
    runtime.getService("browser")
  ) as unknown as IBrowserService | null;

  if (externalService) {
    // Verify it has the methods we need (navigate or fetchPage)
    if (typeof externalService.navigate === "function" || 
        typeof externalService.fetchPage === "function") {
      logger.debug("[FallbackFactory] Using external Browser service");

      // Track source
      if (!serviceSources.find((s) => s.name === "browser")) {
        serviceSources.push({ name: "browser", source: "external" });
      }

      return externalService;
    }
  }

  // Use fallback
  const cache = getFallbackCache(runtime);
  if (!cache.browser) {
    logger.info("[FallbackFactory] Creating Browser fallback service (simple fetch, no JS)");
    cache.browser = new BrowserFallbackService(runtime);

    // Track source
    if (!serviceSources.find((s) => s.name === "browser")) {
      serviceSources.push({ name: "browser", source: "fallback" });
    }
  }

  return cache.browser;
}

// ==========================================
// Convenience Exports
// ==========================================

export { DeribitFallbackService } from "./deribit.fallback";
export { HyperliquidFallbackService } from "./hyperliquid.fallback";
export { OpenSeaFallbackService } from "./opensea.fallback";
export { NansenFallbackService } from "./nansen.fallback";
export { XAIFallbackService, type IXAIService } from "./xai.fallback";
export { BrowserFallbackService, type IBrowserService } from "./browser.fallback";
export { PuppeteerBrowserService } from "./puppeteer.browser";

/**
 * Initialize all fallback services for a runtime
 * (useful for pre-warming caches or logging service sources)
 */
export function initializeFallbackServices(runtime: IAgentRuntime): void {
  getOrCreateDeribitService(runtime);
  getOrCreateHyperliquidService(runtime);
  getOrCreateOpenSeaService(runtime);
  getOrCreateNansenService(runtime);
  // getOrCreateXAIService(runtime); // Grok Expert commented out - low value
  getOrCreateBrowserService(runtime);

  const sources = getServiceSources();
  const external = sources.filter((s) => s.source === "external").map((s) => s.name);
  const fallback = sources.filter((s) => s.source === "fallback").map((s) => s.name);

  if (external.length > 0) {
    logger.info(`[FallbackFactory] External services: ${external.join(", ")}`);
  }
  if (fallback.length > 0) {
    logger.info(`[FallbackFactory] Fallback services: ${fallback.join(", ")}`);
  }
}
