/**
 * VINCE HIP-3 Action
 *
 * Human-style daily narrative for HIP-3 assets that reads like a friend
 * explaining what's moving in commodities, stocks, and indices.
 * Uses LLM to generate conversational narrative about TradFi on Hyperliquid.
 *
 * Features:
 * - Commodities pulse (GOLD, SILVER, OIL, etc.)
 * - Tech stocks and crypto-related equities
 * - Index tracking (MAG7, US500, XYZ100)
 * - AI companies (OPENAI, ANTHROPIC, SPACEX)
 * - TradFi vs Crypto rotation signals
 *
 * Uses VinceHIP3Service for direct Hyperliquid API integration.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type {
  VinceHIP3Service,
  HIP3Pulse,
  HIP3AssetPrice,
} from "../services/hip3.service";

// ==========================================
// Build data context for LLM
// ==========================================

// Helper to format USD amounts
function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

// Helper to format funding rate
function formatFunding(rate: number): string {
  const pct = (rate * 100).toFixed(4);
  if (rate > 0.0001) return `${pct}% (longs paying)`;
  if (rate < -0.0001) return `${pct}% (shorts paying)`;
  return `${pct}% (neutral)`;
}

function buildHIP3DataContext(pulse: HIP3Pulse): string {
  const lines: string[] = [];

  // ============ OVERVIEW ============
  lines.push("=== HIP-3 MARKET OVERVIEW ===");
  lines.push(`Overall bias: ${pulse.summary.overallBias.toUpperCase()}`);
  lines.push(
    `Rotation signal: ${pulse.summary.tradFiVsCrypto.replace(/_/g, " ")}`,
  );
  lines.push(
    `Hottest sector: ${pulse.sectorStats.hottestSector.toUpperCase()}`,
  );
  lines.push("");

  // ============ GOLD vs BTC ============
  const { goldVsBtc } = pulse.summary;
  lines.push("GOLD vs BTC (risk appetite indicator):");
  lines.push(
    `  GOLD: ${goldVsBtc.goldChange >= 0 ? "+" : ""}${goldVsBtc.goldChange.toFixed(2)}%`,
  );
  lines.push(
    `  BTC: ${goldVsBtc.btcChange >= 0 ? "+" : ""}${goldVsBtc.btcChange.toFixed(2)}%`,
  );
  lines.push(`  Winner today: ${goldVsBtc.winner.toUpperCase()}`);
  lines.push("");

  // ============ TOP & WORST ============
  if (pulse.summary.topPerformer) {
    lines.push(
      `TOP PERFORMER: ${pulse.summary.topPerformer.symbol} at +${pulse.summary.topPerformer.change.toFixed(2)}%`,
    );
  }
  if (pulse.summary.worstPerformer) {
    lines.push(
      `WORST PERFORMER: ${pulse.summary.worstPerformer.symbol} at ${pulse.summary.worstPerformer.change.toFixed(2)}%`,
    );
  }
  lines.push("");

  // ============ SECTOR ANALYSIS ============
  lines.push("=== SECTOR ANALYSIS ===");
  const { sectorStats } = pulse;
  lines.push(
    `Commodities: avg ${sectorStats.commodities.avgChange >= 0 ? "+" : ""}${sectorStats.commodities.avgChange.toFixed(2)}%, Vol ${formatUSD(sectorStats.commodities.totalVolume)}, OI ${formatUSD(sectorStats.commodities.totalOI)}`,
  );
  lines.push(
    `Indices: avg ${sectorStats.indices.avgChange >= 0 ? "+" : ""}${sectorStats.indices.avgChange.toFixed(2)}%, Vol ${formatUSD(sectorStats.indices.totalVolume)}, OI ${formatUSD(sectorStats.indices.totalOI)}`,
  );
  lines.push(
    `Stocks: avg ${sectorStats.stocks.avgChange >= 0 ? "+" : ""}${sectorStats.stocks.avgChange.toFixed(2)}%, Vol ${formatUSD(sectorStats.stocks.totalVolume)}, OI ${formatUSD(sectorStats.stocks.totalOI)}`,
  );
  lines.push(
    `AI Plays: avg ${sectorStats.aiPlays.avgChange >= 0 ? "+" : ""}${sectorStats.aiPlays.avgChange.toFixed(2)}%, Vol ${formatUSD(sectorStats.aiPlays.totalVolume)}, OI ${formatUSD(sectorStats.aiPlays.totalOI)}`,
  );
  lines.push("");

  // ============ FUNDING RATES ============
  lines.push("=== FUNDING RATES (8h) ===");
  const { fundingExtremes } = pulse;
  if (fundingExtremes.highest) {
    lines.push(
      `Highest: ${fundingExtremes.highest.symbol} at ${formatFunding(fundingExtremes.highest.rate)}`,
    );
  }
  if (fundingExtremes.lowest) {
    lines.push(
      `Lowest: ${fundingExtremes.lowest.symbol} at ${formatFunding(fundingExtremes.lowest.rate)}`,
    );
  }
  if (fundingExtremes.crowdedLongs.length > 0) {
    lines.push(
      `Crowded longs (longs paying premium): ${fundingExtremes.crowdedLongs.join(", ")}`,
    );
  }
  if (fundingExtremes.crowdedShorts.length > 0) {
    lines.push(
      `Crowded shorts (shorts paying premium): ${fundingExtremes.crowdedShorts.join(", ")}`,
    );
  }
  if (!fundingExtremes.highest && !fundingExtremes.lowest) {
    lines.push("No significant funding imbalances");
  }
  lines.push("");

  // ============ LIQUIDITY LEADERS ============
  lines.push("=== LIQUIDITY (Volume & OI Leaders) ===");
  if (pulse.leaders.volumeLeaders.length > 0) {
    const volLeadersStr = pulse.leaders.volumeLeaders
      .slice(0, 3)
      .map((l) => `${l.symbol} (${formatUSD(l.volume)})`)
      .join(", ");
    lines.push(`Volume leaders: ${volLeadersStr}`);
  }
  if (pulse.leaders.oiLeaders.length > 0) {
    const oiLeadersStr = pulse.leaders.oiLeaders
      .slice(0, 3)
      .map((l) => `${l.symbol} (${formatUSD(l.oi)})`)
      .join(", ");
    lines.push(`OI leaders: ${oiLeadersStr}`);
  }
  lines.push("");

  // ============ DETAILED ASSET DATA ============
  // Helper to format asset with all data
  const formatAssetFull = (a: HIP3AssetPrice): string => {
    const change =
      a.change24h >= 0
        ? `+${a.change24h.toFixed(2)}%`
        : `${a.change24h.toFixed(2)}%`;
    const vol = formatUSD(a.volume24h);
    const oi = formatUSD(a.openInterest);
    const fundingNote =
      a.funding8h > 0.0001
        ? " | funding: longs crowded"
        : a.funding8h < -0.0001
          ? " | funding: shorts crowded"
          : "";
    return `${a.symbol}: $${a.price.toFixed(2)} | ${change} | Vol: ${vol} | OI: ${oi}${fundingNote}`;
  };

  // Commodities
  lines.push("=== COMMODITIES ===");
  if (pulse.commodities.length > 0) {
    for (const c of pulse.commodities) {
      lines.push(formatAssetFull(c));
    }
  } else {
    lines.push("No commodity data available");
  }
  lines.push("");

  // Indices
  lines.push("=== INDICES ===");
  if (pulse.indices.length > 0) {
    for (const i of pulse.indices) {
      lines.push(formatAssetFull(i));
    }
  } else {
    lines.push("No index data available");
  }
  lines.push("");

  // Stocks - show all with full data
  lines.push("=== TECH STOCKS ===");
  if (pulse.stocks.length > 0) {
    for (const s of pulse.stocks.slice(0, 10)) {
      lines.push(formatAssetFull(s));
    }
    if (pulse.stocks.length > 10) {
      lines.push(`...and ${pulse.stocks.length - 10} more stocks`);
    }
  } else {
    lines.push("No stock data available");
  }
  lines.push("");

  // AI Plays
  lines.push("=== AI / FUTURE PLAYS ===");
  if (pulse.aiPlays.length > 0) {
    for (const a of pulse.aiPlays) {
      lines.push(formatAssetFull(a));
    }
  } else {
    lines.push("No AI/future play data available");
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

async function generateHIP3HumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are VINCE, giving a HIP-3 assets briefing. You're explaining what's happening in commodities, stocks, and indices on Hyperliquid to a trader friend who cares about these TradFi-on-chain plays.

Here's the data:

${dataContext}

Write a HIP-3 briefing that covers:
1. Start with the overall vibe - is TradFi looking strong or weak today? Mention the hottest sector.
2. The GOLD vs BTC comparison is important - this tells you about risk appetite. If GOLD is winning, it's a risk-off day. If BTC wins, risk-on.
3. Highlight the biggest movers naturally. Don't just list - explain why it might matter. "NVDA up 3% while everything else is flat means AI trade is back" is better than just listing.
4. Use the SECTOR ANALYSIS to compare performance. Which sector is seeing the most action (volume/OI)?
5. FUNDING RATES matter - if longs are crowded on a specific asset, mention it as a warning. Crowded trades often reverse. Highlight any extreme funding.
6. The AI plays (OPENAI, ANTHROPIC, SPACEX) are unique to Hyperliquid - mention them if they're moving significantly.
7. Open interest tells you conviction - high OI + price move = real flow. Low OI moves can be noise.
8. End with your take - is HIP-3 worth watching today or is it dead? If there's a crowded trade to fade or a clean setup, mention it.

STYLE RULES:
- Write like explaining this to a friend who trades both crypto and TradFi
- Short punchy sentences mixed with context
- Use specific numbers but weave them naturally - "GOLD at 2650 and climbing" not "GOLD: $2650.00"
- Mention volume/OI when it adds to the story (high volume confirms a move, low volume means skepticism)
- Call out crowded funding as a potential reversal signal
- No bullet points - flow naturally
- Have opinions. If commodities look better than tech, say it. If a trade looks crowded, warn about it.
- Around 200-300 words. Dense insight, no padding.

CONTEXT:
- HIP-3 = traditional assets (stocks, commodities, indices) on Hyperliquid perps
- These trade 24/7 which is unique (most TradFi closes at night)
- GOLD has been outperforming BTC YTD - this is a recurring theme
- Funding rate > 0.01% = longs paying shorts, suggesting long-heavy positioning (potential squeeze short)
- Funding rate < -0.01% = shorts paying longs, suggesting short-heavy positioning (potential squeeze long)
- OI = Open Interest, represents total outstanding contracts (conviction indicator)

AVOID:
- "Interestingly", "notably", "it's worth noting"
- Starting every sentence with the asset name
- Generic takes that could apply to any day
- Overexplaining what HIP-3 is (the reader knows)
- Ignoring the funding and OI data - use it!

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_HIP3] Failed to generate briefing: ${error}`);
    return "HIP-3 data's loading but can't get the narrative together right now. Give it another shot in a minute.";
  }
}

// ==========================================
// Action Definition
// ==========================================

export const vinceHIP3Action: Action = {
  name: "VINCE_HIP3",
  similes: [
    "HIP3",
    "HIP-3",
    "STOCKS",
    "COMMODITIES",
    "GOLD",
    "SILVER",
    "NVDA",
    "TSLA",
    "MAG7",
    "EQUITIES",
    "TRADFI",
    "INDICES",
    "SPACEX",
    "ANTHROPIC",
    "OPENAI",
  ],
  description:
    "Human-style HIP-3 narrative covering commodities, stocks, indices, and AI plays on Hyperliquid",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("hip3") ||
      text.includes("hip-3") ||
      text.includes("stocks") ||
      text.includes("commodities") ||
      text.includes("gold price") ||
      text.includes("silver price") ||
      text.includes("nvda") ||
      text.includes("nvidia") ||
      text.includes("tesla") ||
      text.includes("mag7") ||
      text.includes("equities") ||
      text.includes("tradfi") ||
      text.includes("indices") ||
      text.includes("spacex") ||
      text.includes("anthropic") ||
      text.includes("openai") ||
      (text.includes("traditional") && text.includes("assets"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      // Get VinceHIP3Service (local service, no external dependency)
      const hip3Service = runtime.getService(
        "VINCE_HIP3_SERVICE",
      ) as VinceHIP3Service | null;

      if (!hip3Service) {
        await callback({
          text: "HIP-3 service isn't available right now. Services might still be starting up.",
          actions: ["VINCE_HIP3"],
        });
        return;
      }

      logger.info("[VINCE_HIP3] Fetching HIP-3 pulse...");

      // Fetch HIP-3 pulse from local service
      const pulse = await hip3Service.getHIP3Pulse();

      if (!pulse) {
        await callback({
          text: "Can't get HIP-3 data from Hyperliquid right now. Markets might be loading or there's a connection issue. Try again in a minute.",
          actions: ["VINCE_HIP3"],
        });
        return;
      }

      // Count total assets
      const totalAssets =
        pulse.commodities.length +
        pulse.indices.length +
        pulse.stocks.length +
        pulse.aiPlays.length;

      if (totalAssets === 0) {
        await callback({
          text: "HIP-3 data came back empty. Hyperliquid API might be having issues. Try again shortly.",
          actions: ["VINCE_HIP3"],
        });
        return;
      }

      // Generate briefing
      const dataContext = buildHIP3DataContext(pulse);
      logger.info(
        `[VINCE_HIP3] Generating briefing for ${totalAssets} assets...`,
      );
      const briefing = await generateHIP3HumanBriefing(runtime, dataContext);

      const output = [
        "**HIP-3 Pulse**",
        "",
        briefing,
        "",
        `*Source: Hyperliquid (${totalAssets} assets across xyz, flx, vntl, km)*`,
        "",
        "---",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3*",
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_HIP3"],
      });

      logger.info("[VINCE_HIP3] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_HIP3] Error: ${error}`);
      await callback({
        text: "HIP-3 scan failed. Hyperliquid might be rate limiting or the connection dropped. Try again in a minute.",
        actions: ["VINCE_HIP3"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What's happening with HIP-3?" } },
      {
        name: "VINCE",
        content: {
          text: "**HIP-3 Pulse**\n\nTradFi is looking strong today - commodities leading the charge while crypto catches its breath.\n\nGOLD at 2680 and climbing, up 1.2% on the session while BTC sits flat around 84k. That's the tell - risk-off flows are real. When GOLD outpaces BTC on a day like this, institutional money is rotating defensive. SILVER following the same playbook at +0.8%.\n\nMAG7 index quietly putting in work at +0.6%. NVDA the standout at +2.3% - AI trade never really dies, it just takes breaks. TSLA flat, META barely moving. The momentum is concentrated, not broad.\n\nThe AI plays are interesting today. ANTHROPIC up 1.8% while OPENAI sits at +0.5%. After last week's model announcements, seeing Anthropic outperform OpenAI on HIP-3 is notable. SPACEX doing its own thing at +1.1%.\n\nOil and natgas both red, small moves. Energy weakness while metals shine usually means growth fears, not demand problems.\n\nMy take: HIP-3 is the place to watch today. If you're looking for exposure, commodities over tech. GOLD's been outperforming BTC for months and today's no different. The 24/7 trading on Hyperliquid means you can play these moves while TradFi sleeps.\n\n*Source: Hyperliquid (34 assets across xyz, flx, vntl, km)*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3*",
          actions: ["VINCE_HIP3"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "How are the stocks looking?" } },
      {
        name: "VINCE",
        content: {
          text: "**HIP-3 Pulse**\n\nMixed bag on stocks today. No clear direction but some individual names moving.\n\nNVDA the clear winner at +3.1% - earnings run-up energy. When NVDA moves and nothing else does, it's GPU thesis, not broad risk-on. COIN and HOOD both up around 2% which makes sense given crypto's little bounce overnight. PLTR doing its usual 1% nothing move.\n\nTSLA red at -0.8%, META down half a percent. The mega caps are heavy while the story stocks run. That's not a great sign for market breadth.\n\nIndices tell the story better - MAG7 flat at +0.1% while US500 is barely green. When your index of the biggest tech names can't outperform the broader market, momentum is fading.\n\nGOLD winning again at +0.9% vs BTC's +0.3%. Seventh day in a row GOLD outperforms. That's not noise, that's a regime.\n\nThe AI pre-IPO plays are quiet. ANTHROPIC and OPENAI both sub-0.5% moves. SPACEX unchanged. Nothing happening there.\n\nHonest take: If you're trading HIP-3 stocks today, it's NVDA or nothing. The rest is chop. Commodities are the cleaner trade if you need to be in something.\n\n*Source: Hyperliquid (34 assets across xyz, flx, vntl, km)*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3*",
          actions: ["VINCE_HIP3"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "How is GOLD doing?" } },
      {
        name: "VINCE",
        content: {
          text: "**HIP-3 Pulse**\n\nGOLD is the story right now. Sitting at 2695, up 1.5% on the day and looking like it wants 2700.\n\nThis isn't just a daily move - GOLD has been methodically outperforming BTC for months. Today BTC is up 0.4% while GOLD runs. That spread compounds over time. If you've been long GOLD on HIP-3 instead of BTC, you're significantly outperforming.\n\nSILVER following at +1.1%, which is the usual correlation. When GOLD moves, SILVER moves slightly less. COPPER flat, so this isn't a broad commodities bid - it's precious metals specifically.\n\nThe macro read: Tariff uncertainty, inflation stickier than expected, Fed not cutting as fast as hoped. That's the GOLD thesis. Real rates staying high means nothing when the alternative is currency debasement fears.\n\nMeanwhile the indices are dead. MAG7 at +0.2%, US500 similar. Tech stocks not participating in the risk rotation.\n\nMy take: GOLD is the trade on HIP-3 right now. The 24/7 access means you can play the overnight moves when TradFi is closed. If you believe the macro setup, this has more room to run. 2700 is psychological but 2750 is the real target.\n\n*Source: Hyperliquid (34 assets across xyz, flx, vntl, km)*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3*",
          actions: ["VINCE_HIP3"],
        },
      },
    ],
  ],
};
