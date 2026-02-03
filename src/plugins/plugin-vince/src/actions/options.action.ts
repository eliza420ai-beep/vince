/**
 * VINCE Options Action
 *
 * Human-style options briefing for HYPERSURFACE execution.
 * Uses Deribit data for IV surface insights, CoinGlass for sentiment,
 * and Hyperliquid perps for strike guidance.
 *
 * EXECUTION: HYPERSURFACE (weekly covered calls + CSPs)
 * INSIGHTS: Deribit (IV surface, DVOL, skew), CoinGlass (sentiment), Hyperliquid (funding)
 *
 * Features:
 * - BTC, ETH, SOL options context from Deribit (for pricing/IV insights)
 * - IV surface and skew analysis
 * - Best 20-30 delta strikes with premium yields
 * - Friday sacred - strike selection ritual
 * - Hyperliquid perps funding for strike width guidance
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceDeribitService, PremiumYield, IVSurface, OptionsContext } from "../services/deribit.service";
import type { VinceCoinGlassService } from "../services/coinglass.service";
// External service factories (with fallbacks)
import { getOrCreateHyperliquidService, getOrCreateDeribitService } from "../services/fallbacks";

// ==========================================
// Build comprehensive data context for LLM
// ==========================================

interface AssetOptionsData {
  currency: string;
  ctx: OptionsContext;
}

function buildOptionsDataContext(
  assetsData: AssetOptionsData[],
  fearGreed: { value: number; classification: string } | null,
  isFriday: boolean
): string {
  const lines: string[] = [];
  
  if (isFriday) {
    lines.push("=== FRIDAY - STRIKE SELECTION RITUAL ===");
    lines.push("Weekly 7-day options expiring next Friday. Time to roll and collect premium.\n");
  }
  
  for (const { currency, ctx } of assetsData) {
    lines.push(`=== ${currency} ===`);
    
    if (!ctx.spotPrice) {
      lines.push("No data available\n");
      continue;
    }
    
    // Core prices and volatility
    lines.push(`Spot Price: $${ctx.spotPrice.toLocaleString()}`);
    if (ctx.dvol !== null) {
      lines.push(`DVOL (Implied Vol): ${ctx.dvol.toFixed(1)}%`);
    }
    if (ctx.historicalVolatility !== null) {
      lines.push(`Historical Volatility: ${ctx.historicalVolatility.toFixed(1)}%`);
    }
    if (ctx.dvol !== null && ctx.historicalVolatility !== null) {
      const spread = ctx.dvol - ctx.historicalVolatility;
      lines.push(`IV/RV Spread: ${spread >= 0 ? "+" : ""}${spread.toFixed(1)}% (${spread > 0 ? "IV premium = good for sellers" : "IV discount = options cheap"})`);
    }
    if (ctx.fundingRate !== null) {
      const fundingAnnualized = (ctx.fundingRate * 3 * 365 * 100).toFixed(0);
      lines.push(`Perp Funding: ${(ctx.fundingRate * 100).toFixed(4)}% (${fundingAnnualized}% APR)`);
    }
    
    // IV Surface / Skew
    if (ctx.ivSurface) {
      const iv = ctx.ivSurface;
      lines.push(`\nIV Surface:`);
      lines.push(`  ATM IV: ${iv.atmIV.toFixed(1)}%`);
      lines.push(`  25-Delta Put IV: ${iv.put25DeltaIV.toFixed(1)}%`);
      lines.push(`  25-Delta Call IV: ${iv.call25DeltaIV.toFixed(1)}%`);
      lines.push(`  Skew: ${iv.skew.toFixed(1)}% (${iv.skewInterpretation})`);
    }
    
    // Best Covered Calls
    if (ctx.bestCoveredCalls.length > 0) {
      lines.push(`\nBest Covered Calls (20-30 delta):`);
      for (const cc of ctx.bestCoveredCalls.slice(0, 2)) {
        const distFromSpot = ((cc.strike - cc.spotPrice) / cc.spotPrice * 100).toFixed(1);
        lines.push(`  ${cc.instrumentName}`);
        lines.push(`    Strike: $${cc.strike.toLocaleString()} (${distFromSpot}% OTM)`);
        lines.push(`    Delta: ${Math.abs(cc.delta * 100).toFixed(0)}%`);
        lines.push(`    Premium: $${cc.premium.toFixed(2)}`);
        lines.push(`    7-Day Yield: ${cc.yield7Day.toFixed(2)}% | Annualized: ${cc.yieldAnnualized.toFixed(0)}% APR`);
        lines.push(`    IV: ${cc.iv.toFixed(1)}%`);
      }
    } else {
      lines.push(`\nNo 7-day calls in 20-30 delta range`);
    }
    
    // Best Cash-Secured Puts
    if (ctx.bestCashSecuredPuts.length > 0) {
      lines.push(`\nBest Cash-Secured Puts (20-30 delta):`);
      for (const sp of ctx.bestCashSecuredPuts.slice(0, 2)) {
        const distFromSpot = ((sp.spotPrice - sp.strike) / sp.spotPrice * 100).toFixed(1);
        lines.push(`  ${sp.instrumentName}`);
        lines.push(`    Strike: $${sp.strike.toLocaleString()} (${distFromSpot}% OTM)`);
        lines.push(`    Delta: ${Math.abs(sp.delta * 100).toFixed(0)}%`);
        lines.push(`    Premium: $${sp.premium.toFixed(2)}`);
        lines.push(`    7-Day Yield: ${sp.yield7Day.toFixed(2)}% | Annualized: ${sp.yieldAnnualized.toFixed(0)}% APR`);
        lines.push(`    IV: ${sp.iv.toFixed(1)}%`);
      }
    } else {
      lines.push(`\nNo 7-day puts in 20-30 delta range`);
    }
    
    lines.push("");
  }
  
  // Market context
  if (fearGreed) {
    lines.push(`=== MARKET SENTIMENT ===`);
    lines.push(`Fear/Greed Index: ${fearGreed.value} (${fearGreed.classification})`);
    if (fearGreed.value >= 75) {
      lines.push("Extreme greed - consider wider call strikes or tighter puts");
    } else if (fearGreed.value <= 25) {
      lines.push("Extreme fear - puts command higher premium, good time to sell them");
    }
  }
  
  return lines.join("\n");
}

// ==========================================
// Generate the full human briefing via LLM
// ==========================================

async function generateOptionsHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  dateStr: string,
  isFriday: boolean,
  hypeContext: string | null
): Promise<string> {
  const fridayContext = isFriday 
    ? "It's FRIDAY - strike selection day. Your reader is rolling their HYPERSURFACE options and needs guidance on which asset (BTC/ETH/SOL/HYPE) to write and at what strike width."
    : "Your reader trades weekly options on HYPERSURFACE and wants to know the vol environment and whether to adjust.";

  const prompt = `You are VINCE, writing your HYPERSURFACE options briefing for ${dateStr}. ${fridayContext}

IMPORTANT CONTEXT:
- Your reader trades weekly options on HYPERSURFACE (NOT Deribit)
- HYPERSURFACE assets: BTC, ETH, SOL, HYPE - weekly expiry every Friday, upfront premium
- Position size: ~$100K capital, targeting $1K-$2K weekly premium income (1-2% yield)
- The Deribit data below is MARKET INTELLIGENCE ONLY - use it to guide strike width and asset selection
- Your job: recommend which asset to write on HYPERSURFACE this week and approximate OTM distance

DERIBIT MARKET INTELLIGENCE:
${dataContext}
${hypeContext ? `\nHYPE CONTEXT (Hyperliquid funding as proxy):\n${hypeContext}` : ""}

Write an options analysis that covers:
1. Start with the overall vol environment - is IV rich or cheap relative to realized? Good week for premium sellers?
2. Walk through BTC, ETH, SOL naturally using Deribit IV data to inform strike width guidance (e.g., "7-8% OTM looks right")
3. Mention HYPE as an option - it's available on HYPERSURFACE even though we don't have Deribit IV data for it
4. Translate yields into dollar terms for a $100K position (e.g., "1.5% weekly = roughly $1,500")
5. End with your actual recommendation: which asset to write on HYPERSURFACE, calls or puts, and strike width

STYLE RULES:
- Write like you're at the options desk explaining this to a fellow trader
- Vary sentence length. Short punchy observations, then unpack the important stuff.
- Frame all recommendations as HYPERSURFACE trades - "I'd write BTC covered calls on HYPERSURFACE at 7% OTM"
- Use specific numbers but weave them naturally - "BTC at 84k with DVOL at 45" not "BTC: Spot $84,000, DVOL: 45%"
- Don't use bullet points or headers. Flow naturally between assets and concepts.
- Have opinions. If the premium is thin, say it's thin. If skew is screaming fear, call it out.
- Mention delta-to-strike distances - "25-delta = about 7% OTM, ~25% chance of assignment"
- Around 250-350 words. Dense with insight, no padding.

AVOID:
- Talking about "writing the 91k calls on Deribit" - Deribit is for data only
- Mentioning specific Deribit instrument names - focus on strike WIDTH (% OTM)
- Starting every paragraph with the asset name
- "Interestingly", "notably", "it's worth noting"
- Generic observations like "volatility is elevated"
- Ending with disclaimers or "not financial advice"

Write the HYPERSURFACE briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_OPTIONS] Failed to generate briefing: ${error}`);
    return "HYPERSURFACE options desk is having trouble pulling the analysis together. Data's there but can't get the narrative to click. Give it another shot.";
  }
}

export const vinceOptionsAction: Action = {
  name: "VINCE_OPTIONS",
  similes: ["OPTIONS", "STRIKES", "FRIDAY_STRIKES", "COVERED_CALL", "SECURED_PUT", "STRIKE_SELECTION", "HYPERSURFACE", "WEEKLY_OPTIONS", "DERIBIT"],
  description: "HYPERSURFACE options analysis for weekly covered calls and secured puts (BTC, ETH, SOL, HYPE) using Deribit IV data for strike guidance",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("option") ||
      text.includes("strike") ||
      text.includes("covered call") ||
      text.includes("secured put") ||
      text.includes("friday") ||
      text.includes("expir") ||
      text.includes("hypersurface") ||
      text.includes("deribit") ||
      text.includes("delta") ||
      text.includes("premium") ||
      text.includes("weekly")
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
      const now = new Date();
      const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const isFriday = dayName === "Friday";

      // Track data sources used
      const sources: string[] = [];

      const deribitService = runtime.getService("VINCE_DERIBIT_SERVICE") as VinceDeribitService | null;
      const coinglassService = runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
      // External services (with fallbacks)
      const hyperliquidService = getOrCreateHyperliquidService(runtime);
      const deribitPluginService = getOrCreateDeribitService(runtime);

      if (!deribitService) {
        await callback({
          text: "HYPERSURFACE options desk is offline - Deribit market intel service not available. Try again in a bit.",
          actions: ["VINCE_OPTIONS"],
        });
        return;
      }

      // Collect data for all assets
      logger.info("[VINCE_OPTIONS] Fetching options data...");
      const assets = ["BTC", "ETH", "SOL"] as const;
      const assetsData: AssetOptionsData[] = [];

      for (const asset of assets) {
        const ctx = await deribitService.getOptionsContext(asset);
        assetsData.push({ currency: asset, ctx });
        if (ctx.spotPrice) {
          if (!sources.includes("Deribit IV surface")) sources.push("Deribit IV surface");
        }
        if (ctx.dvol !== null && !sources.includes("Deribit DVOL")) {
          sources.push("Deribit DVOL");
        }
      }

      // Get fear/greed context
      let fearGreed: { value: number; classification: string } | null = null;
      if (coinglassService) {
        fearGreed = coinglassService.getFearGreed();
        if (fearGreed) {
          sources.push("CoinGlass sentiment");
        }
      }

      // Get Hyperliquid perps funding for strike guidance + HYPE context
      let hypeContext: string | null = null;
      if (hyperliquidService) {
        try {
          const optionsPulse = await hyperliquidService.getOptionsPulse();
          if (optionsPulse) {
            sources.push("Hyperliquid perps funding");
            // Build HYPE context from Hyperliquid data
            const hype = optionsPulse.assets?.hype;
            if (hype) {
              const lines: string[] = [];
              lines.push(`HYPE Funding: ${hype.fundingAnnualized?.toFixed(2) || "N/A"}% annualized`);
              lines.push(`Crowding: ${hype.crowdingLevel || "unknown"}`);
              if (hype.squeezeRisk) {
                lines.push(`Squeeze Risk: ${hype.squeezeRisk}`);
              }
              hypeContext = lines.join("\n");
            }
          }
        } catch (e) {
          // Skip if unavailable
        }
      }

      // Get Deribit put/call ratio
      if (deribitPluginService) {
        try {
          const btcData = await deribitPluginService.getComprehensiveData("BTC");
          if (btcData?.optionsSummary?.putCallRatio) {
            sources.push("Deribit Put/Call ratio");
          }
        } catch (e) {
          // Skip if unavailable
        }
      }

      // Build data context
      const dataContext = buildOptionsDataContext(assetsData, fearGreed, isFriday);

      // Generate human briefing via LLM
      logger.info("[VINCE_OPTIONS] Generating HYPERSURFACE briefing...");
      const briefing = await generateOptionsHumanBriefing(
        runtime,
        dataContext,
        `${dayName}, ${dateStr}`,
        isFriday,
        hypeContext
      );

      // Compose output
      const sections: string[] = [];
      if (isFriday) {
        sections.push(`**HYPERSURFACE Options** _${dayName}, ${dateStr}_ 🔔`);
      } else {
        sections.push(`**HYPERSURFACE Options** _${dayName}, ${dateStr}_`);
      }
      sections.push("");
      sections.push(briefing);
      sections.push("");
      
      // Add source attribution
      if (sources.length > 0) {
        sections.push(`*Source: ${sources.join(", ")}*`);
      }
      sections.push("");
      sections.push("---");
      sections.push("_Next steps_: `ALOHA` (macro vibe) · `PERPS` (execution plan) · `UPLOAD <url>` (stash research)");

      await callback({
        text: sections.join("\n"),
        actions: ["VINCE_OPTIONS"],
      });

      logger.info("[VINCE_OPTIONS] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_OPTIONS] Error: ${error}`);
      await callback({
        text: "HYPERSURFACE options desk hit a snag pulling market intel from Deribit. Give it another shot in a minute.",
        actions: ["VINCE_OPTIONS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Friday strikes?" } },
      {
        name: "VINCE",
        content: {
          text: "**HYPERSURFACE Options** _Friday, Jan 31_ 🔔\n\nAlright, it's Friday - time to roll and reload on HYPERSURFACE. Let me walk you through what the Deribit IV surface is telling us.\n\nBTC's sitting at 84k and the setup is clean for premium sellers. DVOL's at 47 but realized is only running 39, so you're getting paid for about 8 points of vol that hasn't materialized. The skew is fearful - puts at 25-delta are running 52% IV while calls are at 44%. Market's paying up for downside protection.\n\nFor covered calls on HYPERSURFACE, I'd target 7-8% OTM. That's roughly the 25-delta zone where you're collecting about 1.4% for the week - on $100K that's around $1,400 in premium. BTC would need to rally 8% to hit you, and with fear/greed still at 32, I don't see a face-ripper coming.\n\nOn the put side, this is where it gets interesting. The 25-delta puts (about 7% below spot) are paying 1.8% for the week. That's $1,800 on your $100K. Given the elevated skew, you're getting paid extra for downside protection that looks overpriced.\n\nETH's IV is actually cheap relative to realized - DVOL at 62, HV at 65. Not a great environment for selling premium there. Skip it this week. SOL's 25-delta range is paying about 2.1% weekly which is decent. HYPE is available on HYPERSURFACE too - funding is running slightly positive so longs aren't crowded, could be worth a look.\n\nMy take: I'd write BTC secured puts on HYPERSURFACE at 7% OTM this week. The skew is paying you a fear premium that looks overdone. You'll collect around $1,800 on $100K, and BTC would need to drop 7% for assignment. That's the cleanest trade.\n\n*Source: Deribit IV surface, Deribit DVOL, CoinGlass sentiment, Hyperliquid perps funding*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_OPTIONS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What's the best covered call for BTC?" } },
      {
        name: "VINCE",
        content: {
          text: "**HYPERSURFACE Options** _Tuesday, Feb 4_\n\nBTC covered calls on HYPERSURFACE - let me break down what the Deribit data says about strike width.\n\nWe're at 86k right now with DVOL sitting at 44, which is middle-of-the-road for crypto. Realized vol is tracking about 41, so you've got a slight IV premium but nothing crazy. You're getting paid market rate, not extracting fear premium.\n\nFor HYPERSURFACE, I'd target 7% OTM on BTC covered calls. That's the 25-delta zone based on Deribit pricing - paying about 1.4% for the week. On your $100K position that's roughly $1,400 in premium. BTC needs to rally 7% to hit you, and funding is mildly negative which tells me longs aren't crowded. Comfortable buffer.\n\nIf you want more premium, you could tighten to 5% OTM - that'd pay around 1.6%, so $1,600 on $100K. But you're getting closer to spot and the probability of assignment goes up meaningfully. I prefer the wider strike.\n\nThe skew is neutral right now - puts and calls at 25-delta are trading similar IV. Market isn't pricing in directional fear either way. Makes sense given we've been chopping sideways for a week.\n\nETH calls look slightly better in percentage terms because vol is higher, but BTC has the cleanest setup. SOL's 25-delta zone is paying about 2.2% weekly but liquidity on HYPERSURFACE is thinner. HYPE is an option too - no Deribit data but perp funding is neutral so no crowding signal either way.\n\nIf I'm writing calls on HYPERSURFACE this week, it's BTC at 7% OTM. Clean setup, decent $1,400 weekly premium on $100K, enough buffer to not get anxious about assignment.\n\n*Source: Deribit IV surface, Deribit DVOL, Hyperliquid perps funding*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_OPTIONS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "options" } },
      {
        name: "VINCE",
        content: {
          text: "**HYPERSURFACE Options** _Wednesday, Feb 5_\n\nQuick HYPERSURFACE options rundown for you.\n\nVol environment is tricky today. BTC DVOL crashed to 38 overnight - that's low. Realized is running hotter at 43, which means options are trading cheap relative to what the market's actually doing. Not ideal for premium sellers - you're not getting paid enough for the actual risk.\n\nBTC's at 85.5k. Looking at Deribit's 25-delta zone (about 6-7% OTM), premium is only paying around 1.1% for the week. On $100K that's just $1,100 - below my threshold for bothering with HYPERSURFACE capital lockup. Put side is similar at about 1.0%. Premium is thin across the board when IV is this crushed.\n\nETH is telling a different story. DVOL at 58, HV at 52, so you've got a 6-point IV premium. That's where the trade is right now. The 25-delta zone (roughly 8-9% OTM on ETH) is paying about 1.8% weekly. On $100K that's $1,800 in premium - much better. ETH would need to rally 9% to hit you, and given ETH/BTC ratio has been bleeding, I don't see that happening unless BTC absolutely rips.\n\nSOL's paying about 2.3% weekly in the 25-delta range but execution on HYPERSURFACE is clunkier. HYPE is available but without Deribit IV data I'm flying blind on fair premium - perp funding is neutral though.\n\nFear/greed is at 45, dead neutral. Nobody's positioned which is why vol is crushed.\n\nHonestly? For HYPERSURFACE this week, I'd write ETH covered calls at 8-9% OTM to capture that IV premium. That's $1,800 on $100K and a comfortable buffer. BTC premium isn't worth it until vol picks back up.\n\n*Source: Deribit IV surface, Deribit DVOL, CoinGlass sentiment, Hyperliquid perps funding*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_OPTIONS"],
        },
      },
    ],
  ],
};
