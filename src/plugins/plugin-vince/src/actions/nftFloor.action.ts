/**
 * VINCE NFT Floor Action
 *
 * Shows ONLY thin floor buying opportunities with collection context.
 * Thick floors are not opportunities - we skip them.
 *
 * Knowledge sourced from:
 * - knowledge/art-collections/
 * - knowledge/the-good-life/art-collecting/
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceNFTFloorService } from "../services/nftFloor.service";

/**
 * Collection context from knowledge base - stories and why each matters
 */
const COLLECTION_CONTEXT: Record<string, { story: string; whyItMatters: string }> = {
  "cryptopunks": {
    story: "The original NFT PFP. 10,000 punks from 2017, predates ERC-721. Zombie, Ape, Alien = grails.",
    whyItMatters: "Cultural icon. Usually thick floor (100+ listed). Sub-40 ETH is the target entry."
  },
  "official-v1-punks": {
    story: "The 'wrapped' V1 Punks from the original buggy contract. OG collector territory.",
    whyItMatters: "Much smaller supply than V2. Historical artifact for serious collectors."
  },
  "autoglyphs": {
    story: "First on-chain generative art. Algorithm IS the contract. Centre Pompidou, Whitney own pieces.",
    whyItMatters: "Only 512 exist. VERY thin floor (<10 listed). Grail-tier, move fast when listed."
  },
  "meebits": {
    story: "3D voxel characters by Larva Labs. Airdropped to Punk holders. Now under Yuga.",
    whyItMatters: "Bridge between 2D PFP and metaverse. More accessible than Punks."
  },
  "beeple-everydays": {
    story: "Mike Winkelmann's daily art since 2007. 'First 5000 Days' sold for $69M at Christie's.",
    whyItMatters: "You're buying the streak, the discipline. Historical significance over single images."
  },
  "chromie-squiggle-by-snowfro": {
    story: "Art Blocks genesis. Snowfro's signature. MoMA acquired 8. LACMA has them too.",
    whyItMatters: "~10K supply. Entry-level blue chip. The 'soul of Art Blocks'."
  },
  "ringers-by-dmitri-cherniak": {
    story: "Strings wrapped around pegs. The Goose sold $6.2M at Sotheby's. LACMA acquired #962.",
    whyItMatters: "1,000 pieces. Art Blocks Curated flagship. Floor moves fast with thin liquidity."
  },
  "fidenza-by-tyler-hobbs": {
    story: "Tyler Hobbs' masterpiece. Flow fields that feel alive. Consensus best of Art Blocks.",
    whyItMatters: "999 pieces. Limited supply = thin floor. True collector territory."
  },
  "meridian-by-matt-deslauriers": {
    story: "Matt DesLauriers' flowing landscapes. Art Blocks Curated. Strong artist reputation.",
    whyItMatters: "Tier 1.5, could reach full blue chip. Watch for undervaluation."
  },
};

export const vinceNftFloorAction: Action = {
  name: "VINCE_NFT_FLOOR",
  similes: ["NFT_FLOOR", "NFT", "FLOOR", "FLOORS", "ART", "PUNKS", "CRYPTOPUNKS", "MERIDIAN", "FIDENZA", "RINGERS", "SQUIGGLES", "OPPORTUNITIES"],
  description: "Shows thin floor NFT buying opportunities with collection context",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("nft") ||
      text.includes("floor") ||
      text.includes("punk") ||
      text.includes("cryptopunk") ||
      text.includes("meridian") ||
      text.includes("opportunity") ||
      text.includes("opportunities") ||
      (text.includes("art") && (text.includes("price") || text.includes("check") || text.includes("buy")))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      const sections: string[] = [];

      const nftService = runtime.getService("VINCE_NFT_FLOOR_SERVICE") as VinceNFTFloorService | null;

      if (!nftService) {
        logger.error("[VINCE_NFT_FLOOR] Service not found");
        await callback({
          text: "NFT Floor service not available.",
          actions: ["VINCE_NFT_FLOOR"],
        });
        return;
      }

      // Refresh and get data
      logger.info("[VINCE_NFT_FLOOR] Refreshing...");
      await nftService.refreshData();
      const status = nftService.getStatus();
      const allFloors = nftService.getAllFloors();

      // Filter to ONLY thin floor opportunities
      // Requirements: score < 40, gap >= 5%, has real data
      const opportunities = allFloors.filter(c => {
        const gapPct = c.floorPrice > 0 ? (c.gaps.to2nd / c.floorPrice) * 100 : 0;
        const hasRealData = c.nftsNearFloor > 0 || c.gaps.to2nd > 0;
        const hasSignificantGap = gapPct >= 5;
        return c.floorThicknessScore < 40 && hasRealData && hasSignificantGap;
      });

      // Thick floors (not opportunities)
      const thickFloors = allFloors.filter(c => c.floorThicknessScore >= 40);

      if (opportunities.length === 0) {
        sections.push("**NFT FLOOR - No Thin Floors Right Now**\n");
        sections.push("All tracked collections have thick floors. No immediate buying opportunities.");
        sections.push("");
        sections.push(`_Tracking ${status.collectionCount} collections. Check back later._`);
        sections.push("");
        sections.push("---");
        sections.push("*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*");
      } else {
        sections.push("**NFT FLOOR - Thin Floor Opportunities**\n");

        // Show each opportunity with context
        for (const collection of opportunities) {
          const gapPct = ((collection.gaps.to2nd / collection.floorPrice) * 100).toFixed(0);
          const context = COLLECTION_CONTEXT[collection.slug];

          sections.push(`**${collection.name.toUpperCase()}** - ${collection.floorPrice.toFixed(2)} ETH`);
          sections.push(`${gapPct}% gap to next listing`);
          
          if (context) {
            sections.push(`_${context.story}_`);
            sections.push(`→ ${context.whyItMatters}`);
          }
          sections.push("");
        }

        // Summary footer
        sections.push("---");
        sections.push(`Tracking ${status.collectionCount} collections. ${opportunities.length} have thin floors.`);
        
        if (thickFloors.length > 0) {
          const thickNames = thickFloors.map(c => c.name).join(", ");
          sections.push(`Thick floors (no alert): ${thickNames}`);
        }
        sections.push("");
        sections.push("*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*");
      }

      await callback({
        text: sections.join("\n"),
        actions: ["VINCE_NFT_FLOOR"],
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[VINCE_NFT_FLOOR] Error: ${errorMsg}`);
      await callback({
        text: `Error getting NFT floor data: ${errorMsg}`,
        actions: ["VINCE_NFT_FLOOR"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What are the NFT opportunities?" } },
      { name: "VINCE", content: { text: "**NFT FLOOR - Thin Floor Opportunities**...", actions: ["VINCE_NFT_FLOOR"] } },
    ],
    [
      { name: "{{user1}}", content: { text: "Any thin floors right now?" } },
      { name: "VINCE", content: { text: "**NFT FLOOR - Thin Floor Opportunities**...", actions: ["VINCE_NFT_FLOOR"] } },
    ],
  ],
};
