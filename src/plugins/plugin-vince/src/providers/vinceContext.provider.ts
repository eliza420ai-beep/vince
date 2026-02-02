/**
 * VINCE Context Provider
 *
 * Unified context injection for VINCE agent:
 * - Aggregates data from all services
 * - Provides current market context
 * - Injects lifestyle suggestions
 * - Supports RAG with knowledge base
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceLifestyleService } from "../services/lifestyle.service";
import type { VinceNFTFloorService } from "../services/nftFloor.service";

export const vinceContextProvider: Provider = {
  name: "VINCE_CONTEXT",
  description: "Unified context from all VINCE data sources",

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const contextParts: string[] = [];
    const values: Record<string, any> = {};
    const data: Record<string, any> = {};

    try {
      // Current time context
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
      const month = now.getMonth() + 1;
      const isPoolSeason = month >= 4 && month <= 11;
      const isFriday = dayOfWeek === "Friday";

      contextParts.push(`**Current Context**`);
      contextParts.push(`Day: ${dayOfWeek}`);
      contextParts.push(`Season: ${isPoolSeason ? "Pool (Apr-Nov)" : "Gym (Dec-Mar)"}`);
      if (isFriday) {
        contextParts.push(`⚡ FRIDAY SACRED - Strike selection day`);
      }
      contextParts.push("");

      values.dayOfWeek = dayOfWeek.toLowerCase();
      values.isPoolSeason = isPoolSeason;
      values.isFriday = isFriday;

      // Market context from CoinGlass
      const coinglassService = runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
      if (coinglassService) {
        await coinglassService.refreshData();
        
        const fg = coinglassService.getFearGreed();
        const btcFunding = coinglassService.getFunding("BTC");
        const btcLS = coinglassService.getLongShortRatio("BTC");

        if (fg || btcFunding || btcLS) {
          contextParts.push(`**Market Sentiment** (CoinGlass)`);
          
          if (fg) {
            contextParts.push(`Fear/Greed: ${fg.value} (${fg.classification})`);
            values.fearGreed = fg.value;
            values.fearGreedLabel = fg.classification;
          }
          
          if (btcFunding) {
            contextParts.push(`BTC Funding: ${(btcFunding.rate * 100).toFixed(4)}%`);
            values.btcFunding = btcFunding.rate;
          }
          
          if (btcLS) {
            contextParts.push(`BTC L/S: ${btcLS.ratio.toFixed(2)}`);
            values.btcLongShort = btcLS.ratio;
          }
          contextParts.push("");
        }

        data.coinglassStatus = coinglassService.getStatus();
      }

      // Market data
      const marketDataService = runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
      if (marketDataService) {
        const btcContext = await marketDataService.getEnrichedContext("BTC");
        if (btcContext) {
          values.btcPrice = btcContext.currentPrice;
          values.marketRegime = btcContext.marketRegime;
        }
      }

      // Meme context
      const dexService = runtime.getService("VINCE_DEXSCREENER_SERVICE") as VinceDexScreenerService | null;
      if (dexService) {
        const status = dexService.getStatus();
        const apeTokens = dexService.getApeTokens();
        const aiTokens = dexService.getAiTokens();

        if (apeTokens.length > 0 || aiTokens.length > 0) {
          contextParts.push(`**Memetics** (DexScreener)`);
          if (aiTokens.length > 0) {
            contextParts.push(`AI tokens with traction: ${aiTokens.length}`);
          }
          if (apeTokens.length > 0) {
            contextParts.push(`APE signals: ${apeTokens.length}`);
          }
          contextParts.push("");
        }

        values.apeTokenCount = apeTokens.length;
        values.aiTokenCount = aiTokens.length;
        data.dexscreenerStatus = status;
      }

      // Lifestyle context
      const lifestyleService = runtime.getService("VINCE_LIFESTYLE_SERVICE") as VinceLifestyleService | null;
      if (lifestyleService) {
        const briefing = lifestyleService.getDailyBriefing();
        const topSuggestions = lifestyleService.getTopSuggestions(2);

        if (topSuggestions.length > 0) {
          contextParts.push(`**Today's Suggestions**`);
          for (const s of topSuggestions) {
            contextParts.push(`• ${s.suggestion}`);
          }
          contextParts.push("");
        }

        data.lifestyleBriefing = briefing;
      }

      // NFT context
      const nftService = runtime.getService("VINCE_NFT_FLOOR_SERVICE") as VinceNFTFloorService | null;
      if (nftService) {
        const thinFloors = nftService.getThinFloors();
        
        if (thinFloors.length > 0) {
          contextParts.push(`**NFT Alerts**`);
          contextParts.push(`Thin floors: ${thinFloors.map(c => c.name).join(", ")}`);
          contextParts.push("");
        }

        values.nftThinFloorCount = thinFloors.length;
        data.nftStatus = nftService.getStatus();
      }

      // Service availability summary
      const availableServices: string[] = [];
      if (coinglassService) availableServices.push("CoinGlass");
      if (marketDataService) availableServices.push("MarketData");
      if (dexService) availableServices.push("DexScreener");
      if (lifestyleService) availableServices.push("Lifestyle");
      if (nftService) availableServices.push("NFTFloor");

      values.availableServices = availableServices;

    } catch (error) {
      logger.debug(`[VINCE_CONTEXT] Error gathering context: ${error}`);
    }

    return {
      text: contextParts.join("\n"),
      values,
      data,
    };
  },
};

export default vinceContextProvider;
