/**
 * VINCE NFT Floor Service
 *
 * Floor tracking for curated collections using DUAL-SOURCE analysis:
 * - Listings (60% weight): What sellers are asking - detects thin floors
 * - Sales (40% weight): What buyers paid - shows price support
 *
 * Tier 1 Bluechips + Art Blocks Curated collections.
 * Uses the OpenSeaService from plugin-nft-collections for reliable API access.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  NFTCollection,
  CuratedCollection,
  IOpenSeaService,
} from "../types/index";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { getOrCreateOpenSeaService } from "./fallbacks";
import { isVinceAgent } from "../utils/dashboard";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (match OpenSeaService cache)
const MIN_GAP_TO_2ND_ETH = 0.21; // Dashboard only shows collections with gap to 2nd listing above this
/** Thin floor with zero recent sales = illiquid, NOT a real opportunity */
const MIN_VOLUME_7D_ETH = 0.001; // At least some 7d volume (implies recent sales)

// Curated collections - Bluechips, Art Blocks, XCOPY, Photography
const CURATED_COLLECTIONS: CuratedCollection[] = [
  // Tier 1 Bluechips
  {
    slug: "cryptopunks",
    name: "CryptoPunks",
    category: "blue_chip",
    priority: 1,
  },
  {
    slug: "official-v1-punks",
    name: "V1 Punks",
    category: "blue_chip",
    priority: 2,
  },
  { slug: "meebits", name: "Meebits", category: "blue_chip", priority: 4 },
  {
    slug: "beeple-everydays",
    name: "Beeple Everydays",
    category: "blue_chip",
    priority: 5,
  },
  {
    slug: "terraforms",
    name: "Terraforms",
    category: "blue_chip",
    priority: 11,
  },
  // Art Blocks Curated
  {
    slug: "chromie-squiggle-by-snowfro",
    name: "Chromie Squiggle",
    category: "generative",
    priority: 12,
  },
  {
    slug: "ringers-by-dmitri-cherniak",
    name: "Ringers",
    category: "generative",
    priority: 13,
  },
  {
    slug: "fidenza-by-tyler-hobbs",
    name: "Fidenza",
    category: "generative",
    priority: 14,
  },
  {
    slug: "meridian-by-matt-deslauriers",
    name: "Meridian",
    category: "generative",
    priority: 15,
  },
  // XCOPY
  {
    slug: "xcopy-editions",
    name: "XCOPY Editions",
    category: "blue_chip",
    priority: 16,
  },
  // Photography
  {
    slug: "drive-dave-krugman",
    name: "DRIVE",
    category: "photography",
    priority: 21,
  },
];

export class VinceNFTFloorService extends Service {
  static serviceType = "VINCE_NFT_FLOOR_SERVICE";
  capabilityDescription = "NFT floor tracking for curated collections";

  private floorCache: Map<string, NFTCollection> = new Map();
  private lastUpdate = 0;
  private initialized = false;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceNFTFloorService> {
    const service = new VinceNFTFloorService(runtime);
    if (isVinceAgent(runtime)) {
      setTimeout(async () => {
        try {
          await service.refreshData();
          service.printDashboardWithData();
        } catch (err) {
          logger.warn(`[VinceNFTFloor] Failed to load floor data: ${err}`);
        }
      }, 3000); // Wait 3s for OpenSeaService to be ready
    }
    logger.debug("[VinceNFTFloor] Service started (loading floor data...)");
    return service;
  }

  /**
   * Print dashboard with live data: only collections with thin floor (gap to 2nd > 0.21 ETH).
   */
  private printDashboardWithData(): void {
    const floors = this.getAllFloors();
    const thinOnly = floors.filter((c) => {
      if ((c.gaps?.to2nd ?? 0) <= MIN_GAP_TO_2ND_ETH) return false;
      const volume7d = c.totalVolume ?? c.volume24h ?? 0;
      return volume7d >= MIN_VOLUME_7D_ETH; // Exclude illiquid (e.g. DRIVE)
    });
    startBox();
    logLine("🎨 NFT FLOOR DASHBOARD");
    logEmpty();
    sep();
    logEmpty();
    if (floors.length === 0) {
      logLine("⚠️ No floor data - set OPENSEA_API_KEY for NFT floors");
      endBox();
      return;
    }
    if (thinOnly.length === 0) {
      logLine("No thin floors (gap to 2nd listing > 0.21 ETH) right now.");
      logEmpty();
      const tldr = this.getTLDR();
      logLine(`💡 ${tldr}`);
      endBox();
      logger.info(`[VinceNFTFloor] ✅ Dashboard loaded - ${tldr}`);
      return;
    }
    logLine("💡 THIN FLOOR (gap to 2nd > 0.21 ETH):");
    logEmpty();
    for (const nft of thinOnly) {
      const gap = (nft.gaps?.to2nd ?? 0).toFixed(2);
      logLine(
        `   ${nft.name.padEnd(20)} ${nft.floorPrice.toFixed(2)} ETH    gap to 2nd: ${gap} ETH`,
      );
    }
    logEmpty();
    const tldr = this.getTLDR();
    logLine(`💡 ${tldr}`);
    endBox();
    logger.info(`[VinceNFTFloor] ✅ Dashboard loaded - ${tldr}`);
  }

  /**
   * Generate actionable TLDR from NFT floor data
   */
  getTLDR(): string {
    const floors = this.getAllFloors();
    if (floors.length === 0) {
      return "NFT: No data yet - refresh to load floors";
    }

    // Check for top movers
    const movers = this.getTopMovers();
    const bigMover = movers.find((m) => Math.abs(m.floorPriceChange24h) > 5);
    if (bigMover) {
      const dir = bigMover.floorPriceChange24h > 0 ? "UP" : "DOWN";
      const pct = Math.abs(bigMover.floorPriceChange24h).toFixed(1);
      return `${bigMover.name} ${dir} ${pct}% - ${dir === "UP" ? "momentum" : "watch floor"}`;
    }

    // Check for thin floors (risk)
    const thinFloors = this.getThinFloors();
    if (thinFloors.length > 0) {
      return `THIN FLOOR: ${thinFloors[0].name} - gap down risk if sold`;
    }

    // Check bluechips
    const bluechips = this.getBlueChips();
    if (bluechips.length > 0) {
      const punks = bluechips.find((b) => b.slug === "cryptopunks");
      if (punks) {
        return `PUNKS: ${punks.floorPrice.toFixed(1)} ETH, ${punks.floorThickness} floor`;
      }
    }

    // Default
    return "NFT: Stable floors across curated collections";
  }

  /**
   * Print live NFT floor dashboard: only collections with thin floor (gap to 2nd > 0.21 ETH).
   */
  async printLiveDashboard(): Promise<void> {
    await this.refreshData();
    const floors = this.getAllFloors();
    const thinOnly = floors.filter((c) => {
      if ((c.gaps?.to2nd ?? 0) <= MIN_GAP_TO_2ND_ETH) return false;
      const volume7d = c.totalVolume ?? c.volume24h ?? 0;
      return volume7d >= MIN_VOLUME_7D_ETH;
    });
    startBox();
    logLine("🎨 NFT FLOOR DASHBOARD (LIVE)");
    logEmpty();
    sep();
    logEmpty();
    if (floors.length === 0) {
      logLine("⚠️ No floor data - set OPENSEA_API_KEY for NFT floors");
      endBox();
      return;
    }
    if (thinOnly.length === 0) {
      logLine("No thin floors (gap to 2nd listing > 0.21 ETH) right now.");
      logEmpty();
      const tldr = this.getTLDR();
      const tldrEmoji =
        tldr.includes("UP") || tldr.includes("momentum")
          ? "💡"
          : tldr.includes("DOWN") ||
              tldr.includes("THIN") ||
              tldr.includes("risk")
            ? "⚠️"
            : "📋";
      logLine(`${tldrEmoji} ${tldr}`);
      endBox();
      return;
    }
    logLine("💡 THIN FLOOR (gap to 2nd > 0.21 ETH):");
    logEmpty();
    for (const nft of thinOnly) {
      const gap = (nft.gaps?.to2nd ?? 0).toFixed(2);
      logLine(
        `   ${nft.name.padEnd(20)} ${nft.floorPrice.toFixed(2)} ETH    gap to 2nd: ${gap} ETH`,
      );
    }
    logEmpty();
    const tldr = this.getTLDR();
    const tldrEmoji =
      tldr.includes("UP") || tldr.includes("momentum")
        ? "💡"
        : tldr.includes("DOWN") ||
            tldr.includes("THIN") ||
            tldr.includes("risk")
          ? "⚠️"
          : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  async stop(): Promise<void> {
    logger.info("[VinceNFTFloor] Service stopped");
  }

  /**
   * Get the OpenSeaService (external plugin or fallback)
   */
  private getOpenSeaService(): IOpenSeaService | null {
    return getOrCreateOpenSeaService(this.runtime);
  }

  /**
   * Lazy initialization - called on first data access
   */
  private ensureInitialized(): boolean {
    if (this.initialized) return true;

    const opensea = this.getOpenSeaService();
    if (!opensea) {
      logger.warn("[VinceNFTFloor] OpenSeaService not available yet");
      return false;
    }

    logger.info(
      "[VinceNFTFloor] ✅ Connected to OpenSeaService from plugin-nft-collections",
    );
    logger.info(
      `[VinceNFTFloor] Tracking ${CURATED_COLLECTIONS.length} curated collections`,
    );
    this.initialized = true;
    return true;
  }

  async refreshData(): Promise<void> {
    // Lazy initialization on first use
    if (!this.ensureInitialized()) {
      logger.warn(
        "[VinceNFTFloor] Cannot refresh - waiting for OpenSeaService to become available",
      );
      return;
    }

    const now = Date.now();
    if (now - this.lastUpdate < CACHE_TTL_MS) {
      logger.debug(
        `[VinceNFTFloor] Using cached data (${Math.round((now - this.lastUpdate) / 1000)}s old)`,
      );
      return;
    }

    const opensea = this.getOpenSeaService();
    if (!opensea) {
      logger.warn(
        "[VinceNFTFloor] Cannot refresh - OpenSeaService not available",
      );
      return;
    }

    logger.info(
      `[VinceNFTFloor] Refreshing ${CURATED_COLLECTIONS.length} collections via OpenSeaService...`,
    );

    for (const collection of CURATED_COLLECTIONS) {
      try {
        await this.fetchCollectionFloor(opensea, collection);
        // Rate limit: wait between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(
          `[VinceNFTFloor] Error fetching ${collection.slug}: ${errorMsg}`,
        );
      }
    }

    this.lastUpdate = now;
    if (this.floorCache.size > 0) {
      logger.info(`[VinceNFTFloor] Cached ${this.floorCache.size} collections`);
    } else {
      logger.debug(
        "[VinceNFTFloor] No collections cached (set OPENSEA_API_KEY for NFT floor data)",
      );
    }
  }

  private async fetchCollectionFloor(
    opensea: IOpenSeaService,
    collection: CuratedCollection,
  ): Promise<void> {
    try {
      // Use analyzeFloorOpportunities() for REAL floor thickness with actual listing gaps
      const analysis = await opensea.analyzeFloorOpportunities(
        collection.slug,
        {
          maxListings: 50, // Enough to get 10+ unique tokens for gap calc
        },
      );

      if (!analysis) {
        logger.warn(
          `[VinceNFTFloor] No analysis returned for ${collection.slug}`,
        );
        return;
      }

      // Check for empty data (expected when OpenSea API key is missing / 401)
      if (analysis.floorPrice === 0) {
        logger.debug(
          `[VinceNFTFloor] No floor data for ${collection.slug} (OpenSea key may be unset)`,
        );
        return;
      }

      // Extract real floor thickness data
      const thickness = analysis.floorThickness;

      // Map description to our simplified type
      const desc = thickness.description.toLowerCase();
      let thicknessType: NFTCollection["floorThickness"] = "medium";
      if (desc.includes("thin")) {
        thicknessType = "thin";
      } else if (desc.includes("thick")) {
        thicknessType = "thick";
      }

      const recentSales = analysis.recentSales;

      const nftCollection: NFTCollection = {
        slug: collection.slug,
        name: collection.name,
        floorPrice: analysis.floorPrice,
        floorPriceUsd: analysis.floorPriceUsd,
        floorPriceChange24h: 0, // Not available in floor analysis
        totalVolume: analysis.volumeMetrics.volume7d,
        volume24h: analysis.volumeMetrics.volume24h,
        salesPerDay: analysis.volumeMetrics.salesPerDay,
        numOwners: 0,
        totalSupply: 0,
        category: collection.category,
        // Real floor thickness data
        floorThickness: thicknessType,
        floorThicknessScore: thickness.score,
        gaps: {
          to2nd: thickness.gaps.to2nd,
          to3rd: thickness.gaps.to3rd ?? 0,
          to4th: thickness.gaps.to4th ?? 0,
          to5th: thickness.gaps.to5th,
          to6th: thickness.gaps.to6th ?? 0,
          to10th: thickness.gaps.to10th,
        },
        nftsNearFloor: thickness.nftsNearFloor,
        recentSalesPrices: recentSales?.prices,
        allSalesBelowFloor: recentSales?.allBelowFloor,
        maxRecentSaleEth: recentSales?.maxSaleEth,
        timestamp: Date.now(),
      };

      this.floorCache.set(collection.slug, nftCollection);

      // Only log collections worth displaying: gap to 2nd listing > 0.21 ETH
      if (thickness.gaps.to2nd > MIN_GAP_TO_2ND_ETH) {
        logger.info(
          `[VinceNFTFloor] ✅ ${collection.slug}: ${analysis.floorPrice.toFixed(2)} ETH | ${thickness.description} (score: ${thickness.score}) | Gap to 2nd: ${thickness.gaps.to2nd.toFixed(3)} ETH`,
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[VinceNFTFloor] Failed to fetch ${collection.slug}: ${errorMsg}`,
      );
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { collectionCount: number; lastUpdate: number } {
    return {
      collectionCount: this.floorCache.size,
      lastUpdate: this.lastUpdate,
    };
  }

  getCuratedList(): CuratedCollection[] {
    return CURATED_COLLECTIONS;
  }

  getCollection(slug: string): NFTCollection | null {
    return this.floorCache.get(slug) || null;
  }

  getAllFloors(): NFTCollection[] {
    return Array.from(this.floorCache.values()).sort((a, b) => {
      // Sort by priority from curated list
      const aPriority =
        CURATED_COLLECTIONS.find((c) => c.slug === a.slug)?.priority || 99;
      const bPriority =
        CURATED_COLLECTIONS.find((c) => c.slug === b.slug)?.priority || 99;
      return aPriority - bPriority;
    });
  }

  getBlueChips(): NFTCollection[] {
    const bluechipSlugs = CURATED_COLLECTIONS.filter(
      (c) => c.category === "blue_chip",
    ).map((c) => c.slug);

    return this.getAllFloors().filter((c) => bluechipSlugs.includes(c.slug));
  }

  getGenerativeArt(): NFTCollection[] {
    const artSlugs = CURATED_COLLECTIONS.filter(
      (c) => c.category === "generative",
    ).map((c) => c.slug);

    return this.getAllFloors().filter((c) => artSlugs.includes(c.slug));
  }

  getPhotography(): NFTCollection[] {
    const photoSlugs = CURATED_COLLECTIONS.filter(
      (c) => c.category === "photography",
    ).map((c) => c.slug);

    return this.getAllFloors().filter((c) => photoSlugs.includes(c.slug));
  }

  /** Thin floors with recent liquidity (real opportunities). Excludes illiquid thin floors. */
  getThinFloors(): NFTCollection[] {
    return this.getAllFloors().filter((c) => {
      if (c.floorThickness !== "thin") return false;
      // Exclude illiquid: zero recent sales = not a real opportunity (e.g. DRIVE)
      const volume7d = c.totalVolume ?? c.volume24h ?? 0;
      if (volume7d < MIN_VOLUME_7D_ETH) return false;
      // Exclude when we have no real gap data (e.g. CryptoPunks API returns empty listings)
      const hasRealGapData = (c.gaps?.to2nd ?? 0) > 0 || (c.nftsNearFloor ?? 0) > 0;
      return hasRealGapData;
    });
  }

  getThickFloors(): NFTCollection[] {
    return this.getAllFloors().filter((c) => c.floorThickness === "thick");
  }

  getTopMovers(): NFTCollection[] {
    return this.getAllFloors()
      .sort(
        (a, b) =>
          Math.abs(b.floorPriceChange24h) - Math.abs(a.floorPriceChange24h),
      )
      .slice(0, 5);
  }
}
