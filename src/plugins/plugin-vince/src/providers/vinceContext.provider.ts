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
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import { formatPnL, formatPct, formatUsd } from "../utils/tradeExplainer";

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

      // Paper trading bot status — inject real data when user asks about bot/portfolio
      // so chat response matches dashboard (avoids LLM hallucinating numbers)
      const userText = (message.content?.text ?? "").toLowerCase();
      const isBotStatusQuery =
        userText.includes("bot") ||
        userText.includes("status") ||
        userText.includes("paper") ||
        userText.includes("portfolio") ||
        userText.includes("upnl") ||
        userText.includes("pnl");
      if (isBotStatusQuery) {
        const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as VincePaperTradingService | null;
        const positionManager = runtime.getService("VINCE_POSITION_MANAGER_SERVICE") as VincePositionManagerService | null;
        if (paperTrading && positionManager) {
          // Refresh mark prices so uPNL and P&L are current when user asks for status
          await paperTrading.refreshMarkPrices?.();
          const status = paperTrading.getStatus();
          const portfolio = positionManager.getPortfolio();
          const positions = positionManager.getOpenPositions();
          const returnStr = portfolio.returnPct >= 0 ? `+${portfolio.returnPct.toFixed(2)}%` : `${portfolio.returnPct.toFixed(2)}%`;
          const lines: string[] = [];
          lines.push("**Paper Trading Bot Status (use these exact numbers in your response — do not invent values)**");
          lines.push(`${status.isPaused ? "PAUSED" : "ACTIVE"}`);
          lines.push(`Total Value: ${formatUsd(portfolio.totalValue)} (${returnStr})`);
          lines.push(`Balance: ${formatUsd(portfolio.balance)}`);
          lines.push(`Realized P&L: ${formatPnL(portfolio.realizedPnl)}`);
          lines.push(`Unrealized P&L: ${formatPnL(portfolio.unrealizedPnl)}`);
          lines.push(`Trades: ${portfolio.tradeCount} (${portfolio.winCount}W / ${portfolio.lossCount}L)`);
          lines.push(`Win Rate: ${portfolio.winRate.toFixed(1)}%`);
          if (positions.length > 0) {
            lines.push("Open Positions:");
            for (const pos of positions) {
              const dir = pos.direction.toUpperCase();
              const pnlStr = formatPnL(pos.unrealizedPnl);
              const pnlPct = formatPct(pos.unrealizedPnlPct);
              lines.push(`  ${dir} ${pos.asset} @ $${pos.entryPrice.toLocaleString()} | P&L: ${pnlStr} (${pnlPct}) | SL: $${pos.stopLossPrice.toLocaleString()} | TP: $${(pos.takeProfitPrices?.[0] ?? 0).toLocaleString()}`);
            }
          } else {
            lines.push("Open Positions: none");
          }
          contextParts.push("");
          contextParts.push(lines.join("\n"));
          values.paperBotStatus = lines.join("\n");
        }
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
