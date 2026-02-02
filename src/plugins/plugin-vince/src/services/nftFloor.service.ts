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
import type { NFTCollection, CuratedCollection, IOpenSeaService } from "../types/index";
import { getOrCreateOpenSeaService } from "./fallbacks";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (match OpenSeaService cache)

// Curated collections - Bluechips, Art Blocks, XCOPY, Photography
const CURATED_COLLECTIONS: CuratedCollection[] = [
  // Tier 1 Bluechips
  { slug: "cryptopunks", name: "CryptoPunks", category: "blue_chip", priority: 1 },
  { slug: "official-v1-punks", name: "V1 Punks", category: "blue_chip", priority: 2 },
  { slug: "meebits", name: "Meebits", category: "blue_chip", priority: 4 },
  { slug: "beeple-everydays", name: "Beeple Everydays", category: "blue_chip", priority: 5 },
  { slug: "terraforms", name: "Terraforms", category: "blue_chip", priority: 11 },
  // Art Blocks Curated
  { slug: "chromie-squiggle-by-snowfro", name: "Chromie Squiggle", category: "generative", priority: 12 },
  { slug: "ringers-by-dmitri-cherniak", name: "Ringers", category: "generative", priority: 13 },
  { slug: "fidenza-by-tyler-hobbs", name: "Fidenza", category: "generative", priority: 14 },
  { slug: "meridian-by-matt-deslauriers", name: "Meridian", category: "generative", priority: 15 },
  // XCOPY
  { slug: "xcopy-editions", name: "XCOPY Editions", category: "blue_chip", priority: 16 },
  { slug: "max-pain-and-frens-by-xcopy", name: "MAX PAIN AND FRENS", category: "blue_chip", priority: 17 },
  // Photography
  { slug: "drip-drop-by-dave-krugman", name: "DRIP DROP", category: "photography", priority: 20 },
  { slug: "drive-dave-krugman", name: "DRIVE", category: "photography", priority: 21 },
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
    
    // Fetch data in background and print dashboard with live data
    // Give OpenSeaService a moment to initialize
    setTimeout(async () => {
      try {
        await service.refreshData();
        service.printDashboardWithData();
      } catch (err) {
        logger.warn(`[VinceNFTFloor] Failed to load floor data: ${err}`);
      }
    }, 3000); // Wait 3s for OpenSeaService to be ready
    
    logger.debug("[VinceNFTFloor] Service started (loading floor data...)");
    return service;
  }

  /**
   * Print dashboard with live data and actionable TLDR
   */
  private printDashboardWithData(): void {
    const floors = this.getAllFloors();
    
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  🎨 NFT FLOOR DASHBOARD                                         │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    
    if (floors.length === 0) {
      console.log("  │  ⚠️ No floor data - set OPENSEA_API_KEY for NFT floors          │");
      console.log("  └─────────────────────────────────────────────────────────────────┘");
      console.log("");
      return;
    }
    
    // Blue Chips
    console.log("  │  💎 BLUE CHIPS:                                                 │");
    const bluechips = this.getBlueChips().slice(0, 3);
    for (const nft of bluechips) {
      const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
      const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
      const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
      const thicknessEmoji = nft.floorThickness === "thick" ? "🟢" : nft.floorThickness === "thin" ? "🔴" : "⚪";
      console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr.padEnd(8)} ${thicknessEmoji}`.padEnd(66) + "│");
    }
    
    // Art Blocks
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  🖼️  ART BLOCKS:                                                 │");
    const art = this.getGenerativeArt().slice(0, 4); // Include Meridian
    for (const nft of art) {
      const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
      const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
      const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
      console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr}`.padEnd(66) + "│");
    }
    
    // Photography
    const photos = this.getPhotography().slice(0, 3);
    if (photos.length > 0) {
      console.log("  ├─────────────────────────────────────────────────────────────────┤");
      console.log("  │  📷 PHOTOGRAPHY:                                                │");
      for (const nft of photos) {
        const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
        const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
        const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
        console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr}`.padEnd(66) + "│");
      }
    }
    
    // Actionable TLDR
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    const tldr = this.getTLDR();
    console.log(`  │  💡 ${tldr}`.padEnd(66) + "│");
    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");
    
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
    const bigMover = movers.find(m => Math.abs(m.floorPriceChange24h) > 5);
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
      const punks = bluechips.find(b => b.slug === "cryptopunks");
      if (punks) {
        return `PUNKS: ${punks.floorPrice.toFixed(1)} ETH, ${punks.floorThickness} floor`;
      }
    }
    
    // Default
    return "NFT: Stable floors across curated collections";
  }

  /**
   * Print live NFT floor dashboard with data
   */
  async printLiveDashboard(): Promise<void> {
    await this.refreshData();
    const floors = this.getAllFloors();
    
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  🎨 NFT FLOOR DASHBOARD (LIVE)                                  │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    
    // Blue Chips
    console.log("  │  💎 BLUE CHIPS:                                                 │");
    const bluechips = this.getBlueChips().slice(0, 3);
    for (const nft of bluechips) {
      const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
      const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
      const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
      const thicknessEmoji = nft.floorThickness === "thick" ? "🟢" : nft.floorThickness === "thin" ? "🔴" : "⚪";
      console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr.padEnd(8)} ${thicknessEmoji}`.padEnd(66) + "│");
    }
    
    // Art Blocks
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  🖼️ ART BLOCKS:                                                 │");
    const art = this.getGenerativeArt().slice(0, 4); // Include Meridian
    for (const nft of art) {
      const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
      const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
      const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
      console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr}`.padEnd(66) + "│");
    }
    
    // Photography
    const photos = this.getPhotography().slice(0, 3);
    if (photos.length > 0) {
      console.log("  ├─────────────────────────────────────────────────────────────────┤");
      console.log("  │  📷 PHOTOGRAPHY:                                                │");
      for (const nft of photos) {
        const priceStr = `${nft.floorPrice.toFixed(2)} ETH`;
        const changeEmoji = nft.floorPriceChange24h > 0 ? "📈" : nft.floorPriceChange24h < 0 ? "📉" : "➡️";
        const changeStr = `${nft.floorPriceChange24h > 0 ? "+" : ""}${nft.floorPriceChange24h.toFixed(1)}%`;
        console.log(`  │     ${nft.name.padEnd(15)} ${priceStr.padEnd(12)} ${changeEmoji}${changeStr}`.padEnd(66) + "│");
      }
    }
    
    // TLDR
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    const tldr = this.getTLDR();
    const tldrEmoji = tldr.includes("UP") || tldr.includes("momentum") ? "💡" :
                      tldr.includes("DOWN") || tldr.includes("THIN") || tldr.includes("risk") ? "⚠️" : "📋";
    console.log(`  │  ${tldrEmoji} ${tldr.padEnd(62)}│`);
    
    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");
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
    
    logger.info("[VinceNFTFloor] ✅ Connected to OpenSeaService from plugin-nft-collections");
    logger.info(`[VinceNFTFloor] Tracking ${CURATED_COLLECTIONS.length} curated collections`);
    this.initialized = true;
    return true;
  }

  async refreshData(): Promise<void> {
    // Lazy initialization on first use
    if (!this.ensureInitialized()) {
      logger.warn("[VinceNFTFloor] Cannot refresh - waiting for OpenSeaService to become available");
      return;
    }

    const now = Date.now();
    if (now - this.lastUpdate < CACHE_TTL_MS) {
      logger.debug(`[VinceNFTFloor] Using cached data (${Math.round((now - this.lastUpdate) / 1000)}s old)`);
      return;
    }

    const opensea = this.getOpenSeaService();
    if (!opensea) {
      logger.warn("[VinceNFTFloor] Cannot refresh - OpenSeaService not available");
      return;
    }

    logger.info(`[VinceNFTFloor] Refreshing ${CURATED_COLLECTIONS.length} collections via OpenSeaService...`);

    for (const collection of CURATED_COLLECTIONS) {
      try {
        await this.fetchCollectionFloor(opensea, collection);
        // Rate limit: wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`[VinceNFTFloor] Error fetching ${collection.slug}: ${errorMsg}`);
      }
    }

    this.lastUpdate = now;
    if (this.floorCache.size > 0) {
      logger.info(`[VinceNFTFloor] Cached ${this.floorCache.size} collections`);
    } else {
      logger.debug("[VinceNFTFloor] No collections cached (set OPENSEA_API_KEY for NFT floor data)");
    }
  }

  private async fetchCollectionFloor(opensea: IOpenSeaService, collection: CuratedCollection): Promise<void> {
    try {
      // Use analyzeFloorOpportunities() for REAL floor thickness with actual listing gaps
      const analysis = await opensea.analyzeFloorOpportunities(collection.slug, {
        maxListings: 20, // Fetch enough listings to calculate gaps
      });
      
      if (!analysis) {
        logger.warn(`[VinceNFTFloor] No analysis returned for ${collection.slug}`);
        return;
      }
      
      // Check for empty data (expected when OpenSea API key is missing / 401)
      if (analysis.floorPrice === 0) {
        logger.debug(`[VinceNFTFloor] No floor data for ${collection.slug} (OpenSea key may be unset)`);
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
      
      const nftCollection: NFTCollection = {
        slug: collection.slug,
        name: collection.name,
        floorPrice: analysis.floorPrice,
        floorPriceChange24h: 0, // Not available in floor analysis
        totalVolume: analysis.volumeMetrics.volume7d,
        numOwners: 0,
        totalSupply: 0,
        // Real floor thickness data
        floorThickness: thicknessType,
        floorThicknessScore: thickness.score,
        gaps: {
          to2nd: thickness.gaps.to2nd,
          to5th: thickness.gaps.to5th,
          to10th: thickness.gaps.to10th,
        },
        nftsNearFloor: thickness.nftsNearFloor,
        timestamp: Date.now(),
      };

      this.floorCache.set(collection.slug, nftCollection);
      
      // Log with real gap data
      logger.info(`[VinceNFTFloor] ✅ ${collection.slug}: ${analysis.floorPrice.toFixed(2)} ETH | ${thickness.description} (score: ${thickness.score}) | Gap to 2nd: ${thickness.gaps.to2nd.toFixed(3)} ETH`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`[VinceNFTFloor] Failed to fetch ${collection.slug}: ${errorMsg}`);
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
    return Array.from(this.floorCache.values())
      .sort((a, b) => {
        // Sort by priority from curated list
        const aPriority = CURATED_COLLECTIONS.find(c => c.slug === a.slug)?.priority || 99;
        const bPriority = CURATED_COLLECTIONS.find(c => c.slug === b.slug)?.priority || 99;
        return aPriority - bPriority;
      });
  }

  getBlueChips(): NFTCollection[] {
    const bluechipSlugs = CURATED_COLLECTIONS
      .filter(c => c.category === "blue_chip")
      .map(c => c.slug);
    
    return this.getAllFloors().filter(c => bluechipSlugs.includes(c.slug));
  }

  getGenerativeArt(): NFTCollection[] {
    const artSlugs = CURATED_COLLECTIONS
      .filter(c => c.category === "generative")
      .map(c => c.slug);
    
    return this.getAllFloors().filter(c => artSlugs.includes(c.slug));
  }

  getPhotography(): NFTCollection[] {
    const photoSlugs = CURATED_COLLECTIONS
      .filter(c => c.category === "photography")
      .map(c => c.slug);
    
    return this.getAllFloors().filter(c => photoSlugs.includes(c.slug));
  }

  getThinFloors(): NFTCollection[] {
    return this.getAllFloors().filter(c => c.floorThickness === "thin");
  }

  getThickFloors(): NFTCollection[] {
    return this.getAllFloors().filter(c => c.floorThickness === "thick");
  }

  getTopMovers(): NFTCollection[] {
    return this.getAllFloors()
      .sort((a, b) => Math.abs(b.floorPriceChange24h) - Math.abs(a.floorPriceChange24h))
      .slice(0, 5);
  }
}
