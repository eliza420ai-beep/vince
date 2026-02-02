/**
 * VINCE ALOHA Action
 *
 * Human-style daily market briefing that reads like a friend texting you.
 * Uses LLM to generate the entire narrative so it doesn't feel robotic.
 *
 * Triggered by "aloha", "bull bear", "market analysis", etc.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { BullBearAnalyzer } from "../analysis/bullBearAnalyzer";
import type { AnalysisResult } from "../types/analysis";
import { CORE_ASSETS, HIP3_INDICES } from "../constants/targetAssets";

// Core assets to analyze in detail
const DETAILED_ANALYSIS_ASSETS = [...CORE_ASSETS]; // BTC, ETH, SOL, HYPE

// HIP-3 assets for quick scan
const HIP3_SCAN_ASSETS = [
  ...HIP3_INDICES.slice(0, 3),
  "NVDA", "TSLA", "COIN",
] as const;

// ==========================================
// Build comprehensive data context for LLM
// ==========================================

function buildDataContext(
  coreResults: Map<string, AnalysisResult>,
  hip3Results: { asset: string; result: AnalysisResult }[]
): string {
  const lines: string[] = [];
  
  lines.push("=== CORE ASSETS ===");
  const coreEntries = Array.from(coreResults.entries());
  for (const [asset, result] of coreEntries) {
    const s = result.snapshot;
    const c = result.conclusion;
    
    lines.push(`\n${asset}:`);
    if (s.spotPrice) lines.push(`  Price: $${s.spotPrice.toLocaleString()}`);
    if (s.priceChange24h !== null) lines.push(`  24h Change: ${s.priceChange24h >= 0 ? "+" : ""}${s.priceChange24h.toFixed(2)}%`);
    lines.push(`  Direction: ${c.direction.toUpperCase()} (${c.conviction.toFixed(0)}% conviction)`);
    lines.push(`  Recommendation: ${c.recommendation}`);
    
    // Key factors
    if (c.bullCase.keyFactors.length > 0) {
      lines.push(`  Bull factors: ${c.bullCase.keyFactors.slice(0, 2).map(f => f.explanation).join("; ")}`);
    }
    if (c.bearCase.keyFactors.length > 0) {
      lines.push(`  Bear factors: ${c.bearCase.keyFactors.slice(0, 2).map(f => f.explanation).join("; ")}`);
    }
  }
  
  // Market-wide context from BTC
  const btc = coreResults.get("BTC");
  if (btc) {
    const s = btc.snapshot;
    lines.push("\n=== MARKET CONTEXT ===");
    if (s.fearGreedValue !== null) lines.push(`Fear/Greed Index: ${s.fearGreedValue} (${s.fearGreedLabel})`);
    if (s.fundingRate !== null) lines.push(`BTC Funding Rate: ${(s.fundingRate * 100).toFixed(4)}%`);
    if (s.longShortRatio !== null) lines.push(`BTC Long/Short Ratio: ${s.longShortRatio.toFixed(2)}`);
    if (s.dvol !== null) lines.push(`BTC DVOL (Implied Vol): ${s.dvol.toFixed(1)}`);
    if (s.openInterestChange !== null) lines.push(`OI Change 24h: ${s.openInterestChange >= 0 ? "+" : ""}${s.openInterestChange.toFixed(1)}%`);
    if (s.hasRiskEvents) lines.push(`⚠️ ACTIVE RISK EVENTS IN NEWS`);
  }
  
  // HIP-3 summary
  if (hip3Results.length > 0) {
    lines.push("\n=== HIP-3 EQUITIES/INDICES ===");
    for (const h of hip3Results) {
      const dir = h.result.conclusion.direction;
      const conv = h.result.conclusion.conviction.toFixed(0);
      lines.push(`${h.asset}: ${dir} (${conv}%)`);
    }
  }
  
  return lines.join("\n");
}

// ==========================================
// Generate the full human briefing via LLM
// ==========================================

async function generateHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string
): Promise<string> {
  const prompt = `You are VINCE, writing your daily market briefing for ${date}. You're texting this to a friend who trades - be real, be specific, have opinions.

Here's the data:

${dataContext}

Write a market briefing that covers:
1. The overall vibe - what's the mood today? Start with your gut take.
2. Walk through the majors (BTC, ETH, SOL, HYPE) - but don't just list them mechanically. Connect the dots. If they're all doing the same thing, say that. If one is diverging, highlight why that's interesting.
3. Mention HIP-3 only if something stands out. Otherwise one sentence is fine.
4. End with your actual opinion - what would you do?

STYLE RULES:
- Write like you're explaining this to a smart friend over coffee, not presenting to a board
- Vary your sentence length. Mix short punchy takes with longer explanations when you need to unpack something.
- Use specific numbers but weave them in naturally - "BTC sitting at 81k" not "BTC: $81,121.38"
- Don't bullet point anything. Flow naturally between thoughts.
- Skip the formal structure. No headers, no "In conclusion", no "Overall".
- Have a personality. If the market is boring, say it's boring. If something seems off, say it seems off.
- Don't be sycophantic or hedge everything. Take positions.
- Around 200-300 words is good. Don't pad it.

AVOID:
- Starting every sentence with the asset name
- "Interestingly", "notably", "it's worth noting"
- Generic observations that could apply to any day
- Phrases like "the market is showing signs of..." - just say what it's doing
- Repeating the same sentence structure over and over

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_ALOHA] Failed to generate briefing: ${error}`);
    return "Having trouble getting my thoughts together on the market right now. Data's loading but the analysis isn't clicking. Try again in a sec.";
  }
}

// ==========================================
// Generate tweet
// ==========================================

async function generateTweet(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string
): Promise<string> {
  const prompt = `You are VINCE. Based on today's market data, write a single tweet.

${dataContext}

RULES:
- Max 280 characters
- NO emojis, NO hashtags
- NO crypto slang (WAGMI, NFA, LFG, etc)
- Write like a trader in a group chat - direct, specific, opinionated
- Reference actual numbers naturally
- One clear take

GOOD EXAMPLES:
- "BTC at 83k, fear at 20, funding positive. Longs not capitulating. SOL leading, HYPE lagging. Wait for the flush."
- "ETH down 7% while BTC barely moves. L/S at 3.2 still crowded. Either this cascades or it's the bottom. Leaning cascade."
- "Four straight days of chop. DVOL crushed to 42. Everyone waiting for direction but no one wants to commit. Same."

Write the tweet:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    let tweet = String(response).trim();
    
    // Clean quotes
    if ((tweet.startsWith('"') && tweet.endsWith('"')) || 
        (tweet.startsWith("'") && tweet.endsWith("'"))) {
      tweet = tweet.slice(1, -1);
    }
    
    if (tweet.length > 280) {
      tweet = tweet.substring(0, 277) + "...";
    }
    
    return tweet;
  } catch (error) {
    logger.error(`[VINCE_ALOHA] Failed to generate tweet: ${error}`);
    return "Markets doing market things. Check back later for the real take.";
  }
}

// ==========================================
// ALOHA Action
// ==========================================

export const vinceAlohaAction: Action = {
  name: "VINCE_ALOHA",
  similes: [
    "ALOHA",
    "BULL_BEAR",
    "MARKET_ANALYSIS",
    "DAILY_ANALYSIS",
    "BULL_BEAR_CASE",
    "MARKET_OUTLOOK",
  ],
  description: "Generate a human-style daily market briefing that reads like a friend texting you about the market",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("aloha") ||
      (text.includes("bull") && text.includes("bear")) ||
      text.includes("market analysis") ||
      text.includes("daily analysis") ||
      text.includes("market outlook") ||
      text.includes("what do you think") ||
      text.includes("should i buy") ||
      text.includes("should i sell")
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
      const day = now.toLocaleDateString("en-US", { weekday: "long" });
      const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      // Initialize analyzer
      const analyzer = new BullBearAnalyzer();

      // Analyze all assets
      logger.info("[VINCE_ALOHA] Analyzing core assets...");
      const coreResults: Map<string, AnalysisResult> = new Map();
      
      for (const asset of DETAILED_ANALYSIS_ASSETS) {
        try {
          const result = await analyzer.analyze(runtime, asset);
          coreResults.set(asset, result);
        } catch (error) {
          logger.warn(`[VINCE_ALOHA] Failed to analyze ${asset}: ${error}`);
        }
      }

      // HIP-3 quick scan
      logger.info("[VINCE_ALOHA] Scanning HIP-3...");
      const hip3Results: { asset: string; result: AnalysisResult }[] = [];
      for (const asset of HIP3_SCAN_ASSETS) {
        try {
          const result = await analyzer.analyze(runtime, asset);
          hip3Results.push({ asset, result });
        } catch {
          // Skip failed assets silently
        }
      }

      // Build data context
      const dataContext = buildDataContext(coreResults, hip3Results);

      // Generate the human briefing
      logger.info("[VINCE_ALOHA] Generating briefing...");
      const briefing = await generateHumanBriefing(runtime, dataContext, `${day}, ${date}`);

      // Generate tweet
      logger.info("[VINCE_ALOHA] Generating tweet...");
      const tweet = await generateTweet(runtime, dataContext, date);

      // Compose output
      const sections: string[] = [];
      sections.push(`**Aloha!** _${day}, ${date}_`);
      sections.push("");
      sections.push(briefing);
      sections.push("");
      sections.push("---");
      sections.push("");
      sections.push("**Tweet of the day**");
      sections.push("");
      sections.push(`> ${tweet}`);
      sections.push("");
      sections.push(`_${tweet.length}/280 chars_`);
      sections.push("");
      sections.push("---");
      sections.push("*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*");

      await callback({
        text: sections.join("\n"),
        actions: ["VINCE_ALOHA"],
      });

      logger.info(`[VINCE_ALOHA] Briefing complete`);
    } catch (error) {
      logger.error(`[VINCE_ALOHA] Error: ${error}`);
      await callback({
        text: "Aloha. Having trouble pulling data right now. Try again in a moment, or use: OPTIONS, PERPS, MEMES.",
        actions: ["VINCE_ALOHA"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "aloha" } },
      {
        name: "VINCE",
        content: {
          text: "**Aloha!** _Saturday, Jan 31_\n\nNot gonna sugarcoat it - this is ugly. All four majors are bleeding and the fear index is sitting at 20, which normally screams \"buy the dip\" except nobody's actually selling. That's the weird part. L/S ratio is still at 2.7, meaning longs are crowded and stubborn. BTC's down to 81k, about 2.5% on the day, and ETH is getting absolutely hammered at -7%. SOL following the same playbook down 7%, while HYPE just kind of exists at neutral.\n\nThe thing that bugs me is the DVOL. It's crushed to 45, which usually means complacency, but we're also in extreme fear territory. Those two things don't usually go together. Either the options market knows something the spot market doesn't, or we're about to see a volatility expansion that catches everyone off guard.\n\nHIP-3 equities are a flatline of neutral across the board. NVDA, TSLA, COIN - nothing's moving with conviction.\n\nHonestly? I'm not touching anything today. The setup screams \"wait for the flush\" but longs aren't capitulating, which means either they're right and we bounce, or we get a cascade when they finally give up. I'd rather miss the first 5% of a move than catch a falling knife here.\n\n---\n\n**Tweet of the day**\n\n> All four majors bearish, fear at 20, but longs still crowded at 2.7x L/S. DVOL crushed to 45. Market wants to flush but nobody's capitulating yet. Waiting.\n\n_168/280 chars_",
          actions: ["VINCE_ALOHA"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "market analysis" } },
      {
        name: "VINCE",
        content: {
          text: "**Aloha!** _Monday, Feb 3_\n\nOkay now we're talking. SOL woke up and chose violence - up 8% while everything else is still figuring out what direction to go. ETH finally catching a bid after getting destroyed last week, sitting around +4.5%. BTC doing its thing at 85k, up a modest 2% but honestly it feels like it's just along for the ride rather than leading.\n\nThe funding flip is what got my attention. We went from shorts paying longs to longs paying shorts overnight, which usually means the squeeze already happened or is about to accelerate. Fear is still elevated at 25 but the L/S ratio has come way down to 1.8, suggesting the crowded long trade has unwound a bit.\n\nHYPE still being HYPE - slightly bullish at 55% but nothing to write home about. NVDA standing out in HIP-3 at 72% bullish, which is interesting given how risk-off crypto was last week. Feels like there's a rotation happening - money moving back into risk assets but selectively.\n\nI'm cautiously optimistic here. The funding flip is real, fear is still elevated enough to provide a wall of worry, and SOL leading usually means risk appetite is coming back. Not going all in but definitely not sitting this out either.\n\n---\n\n**Tweet of the day**\n\n> SOL up 8% leading the charge. Funding flipped negative overnight. Fear at 25, L/S unwinding. This looks like the squeeze starting, not ending.\n\n_156/280 chars_",
          actions: ["VINCE_ALOHA"],
        },
      },
    ],
  ],
};
