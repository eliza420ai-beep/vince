/**
 * VINCE Meme Deep Dive Action
 *
 * Provides comprehensive analysis of a specific AI meme token.
 * Uses lifecycle stage analysis, entry guidance, holder analysis, and enhanced verdicts.
 *
 * Trigger: "deep dive [token]", "analyze [token]", "dd [token]", "[token address]"
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
  VinceDexScreenerService,
  TokenDeepDive,
} from "../services/dexscreener.service";
import {
  formatVolume,
  isSolanaAddress,
  isEvmAddress,
  getMomentumSignal,
} from "../constants/memes.constants";

// ==========================================
// Build deep dive context for LLM
// ==========================================

function buildDeepDiveContext(token: TokenDeepDive): string {
  const lines: string[] = [];

  // Token identity
  lines.push("=== TOKEN IDENTITY ===");
  lines.push(`Name: ${token.name} (${token.symbol})`);
  lines.push(`Chain: ${token.chain.toUpperCase()}`);
  lines.push(`Address: ${token.address}`);
  lines.push("");

  // Market data
  lines.push("=== MARKET DATA ===");
  lines.push(`Price: $${token.price.toFixed(6)}`);
  lines.push(
    `Market Cap: ${token.marketCap ? formatVolume(token.marketCap) : "Unknown"}`,
  );
  lines.push(`Liquidity: ${formatVolume(token.liquidity)}`);
  lines.push(`24h Volume: ${formatVolume(token.volume24h)}`);
  lines.push(`Vol/Liq Ratio: ${token.volumeLiquidityRatio.toFixed(1)}x`);
  lines.push(
    `24h Change: ${token.priceChange24h >= 0 ? "+" : ""}${token.priceChange24h.toFixed(1)}%`,
  );
  lines.push(`Momentum: ${token.momentumSignal}`);
  if (token.retracementFromAth) {
    lines.push(`From ATH: ${token.retracementFromAth.toFixed(0)}%`);
  }
  lines.push("");

  // Lifecycle stage
  lines.push("=== LIFECYCLE STAGE ===");
  lines.push(`Stage: ${token.lifecycleStage.toUpperCase()}`);
  lines.push(`Reason: ${token.entryGuidance.stageReason}`);
  lines.push(`Hours Old: ${token.hoursOld}h (estimated)`);
  lines.push("");

  // Entry guidance
  lines.push("=== ENTRY GUIDANCE ===");
  lines.push(`Timing: ${token.entryGuidance.timing.toUpperCase()}`);
  lines.push(
    `Suggested Action: ${token.entryGuidance.suggestedAction.replace(/_/g, " ").toUpperCase()}`,
  );
  lines.push(`Rationale: ${token.entryGuidance.rationale}`);
  if (token.entryGuidance.expectedRetracement) {
    lines.push(
      `Expected Retracement: ${token.entryGuidance.expectedRetracement}`,
    );
  }
  lines.push("");

  // Holder analysis
  lines.push("=== HOLDER ANALYSIS (ESTIMATED) ===");
  lines.push(`Top 10 Holders: ~${token.holderAnalysis.top10Pct}% of supply`);
  lines.push(`Top 1 Holder: ~${token.holderAnalysis.top1Pct}% of supply`);
  lines.push(`Holder Count: ~${token.holderAnalysis.holderCount}`);
  lines.push(
    `Distribution: ${token.holderAnalysis.isHealthy ? "HEALTHY" : "CONCERNING"}`,
  );
  if (token.holderAnalysis.warnings.length > 0) {
    lines.push(`Warnings: ${token.holderAnalysis.warnings.join("; ")}`);
  }
  lines.push("");

  // Verdict
  lines.push("=== VERDICT ===");
  lines.push(`Recommendation: ${token.verdict.recommendation.toUpperCase()}`);
  lines.push(`Confidence: ${token.verdict.confidence.toUpperCase()}`);
  lines.push(`Bull Case: ${token.verdict.bullCase}`);
  lines.push(`Bear Case: ${token.verdict.bearCase}`);
  lines.push("");

  // Classification
  lines.push("=== CLASSIFICATION ===");
  lines.push(`AI Related: ${token.isAiRelated ? "YES" : "NO"}`);
  lines.push(`Viral Potential: ${token.hasViralPotential ? "YES" : "NO"}`);
  lines.push(`Traction Level: ${token.tractionLevel.toUpperCase()}`);
  lines.push(`Risk Level: ${token.riskLevel.toUpperCase()}`);
  lines.push("");

  // Trading links
  lines.push("=== TRADING LINKS ===");
  if (token.gmgnUrl) lines.push(`GMGN (SL/TP): ${token.gmgnUrl}`);
  if (token.dexscreenerUrl) lines.push(`DexScreener: ${token.dexscreenerUrl}`);
  if (token.birdeyeUrl) lines.push(`Birdeye: ${token.birdeyeUrl}`);

  return lines.join("\n");
}

// ==========================================
// Generate deep dive briefing via LLM
// ==========================================

async function generateDeepDiveBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are VINCE, providing a comprehensive deep dive on a specific token.

Here's the analysis data:

${dataContext}

Write a deep dive analysis that covers:

1. TLDR - One sentence: Is this token worth touching right now?
2. LIFECYCLE - What stage is this token in and what does that mean for entry?
3. ENTRY STRATEGY - Based on the stage, what's the smart play? When to enter, where to set stops, what to expect
4. RISK ASSESSMENT - What could go wrong? Be specific about the bear case
5. BULL CASE - If everything goes right, what's the upside?
6. ACTION - Your clear recommendation with specific guidance

STYLE RULES:
- Write like a trader explaining a setup to another trader
- Be specific with numbers: mcap targets, retracement expectations, stop-loss levels
- Have conviction - if it's a play, say so. If it's not, say that too
- Around 200-300 words. Dense, actionable insight
- Include the trading links at the end if available

AVOID:
- Wishy-washy language
- "Could go either way" - have a thesis
- Being overly cautious if the setup is good
- Being reckless if there are clear red flags

Write the deep dive:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(
      `[VINCE_MEME_DEEP_DIVE] Failed to generate briefing: ${error}`,
    );
    return "Couldn't generate the deep dive analysis. The model's having issues. Try again.";
  }
}

// ==========================================
// Extract token identifier from message
// ==========================================

function extractTokenIdentifier(text: string): string | null {
  // Try to find a token address
  const solanaMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (solanaMatch && isSolanaAddress(solanaMatch[0])) {
    return solanaMatch[0];
  }

  const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch && isEvmAddress(evmMatch[0])) {
    return evmMatch[0];
  }

  // Try to find a symbol after keywords
  const patterns = [
    /(?:deep\s*dive|dd|analyze|check)\s+(?:on\s+)?(?:\$)?([A-Za-z0-9]+)/i,
    /(?:what['']?s?|how['']?s?|give\s+me)\s+(?:the\s+)?(?:deal\s+with|scoop\s+on|take\s+on)\s+(?:\$)?([A-Za-z0-9]+)/i,
    /(?:\$)([A-Z0-9]{2,10})/i, // $SYMBOL format
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

export const vinceMemeDeepDiveAction: Action = {
  name: "VINCE_MEME_DEEP_DIVE",
  similes: [
    "DEEP_DIVE",
    "DD",
    "TOKEN_ANALYSIS",
    "ANALYZE_TOKEN",
    "CHECK_TOKEN",
  ],
  description:
    "Deep dive analysis of a specific meme token with lifecycle stage, entry guidance, and enhanced verdict",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";

    // Check for deep dive keywords with a token reference
    const hasDeepDiveKeyword =
      text.includes("deep dive") ||
      text.includes("dd ") ||
      text.includes("analyze ") ||
      text.includes("check ") ||
      text.includes("scoop on") ||
      text.includes("deal with") ||
      text.includes("take on");

    // Check for token address patterns
    const hasTokenAddress =
      /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(message.content.text || "") ||
      /0x[a-fA-F0-9]{40}/.test(message.content.text || "");

    // Check for $SYMBOL pattern
    const hasSymbolPattern = /\$[A-Z0-9]{2,10}/i.test(
      message.content.text || "",
    );

    return hasDeepDiveKeyword || hasTokenAddress || hasSymbolPattern;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const dexService = runtime.getService(
        "VINCE_DEXSCREENER_SERVICE",
      ) as VinceDexScreenerService | null;

      if (!dexService) {
        await callback({
          text: "DexScreener service is down. Can't do the deep dive right now.",
          actions: ["VINCE_MEME_DEEP_DIVE"],
        });
        return;
      }

      // Extract token identifier from message
      const tokenId = extractTokenIdentifier(message.content.text || "");

      if (!tokenId) {
        await callback({
          text: "Need a token to analyze. Give me a symbol like $MOLT or paste the contract address.",
          actions: ["VINCE_MEME_DEEP_DIVE"],
        });
        return;
      }

      logger.info(`[VINCE_MEME_DEEP_DIVE] Analyzing token: ${tokenId}`);

      // Refresh data first
      await dexService.refreshData();

      // Get deep dive
      const deepDive = await dexService.getTokenDeepDive(tokenId);

      if (!deepDive) {
        await callback({
          text: `Couldn't find "${tokenId}" on DexScreener. Make sure the symbol or address is correct. Try searching on DexScreener first to verify.`,
          actions: ["VINCE_MEME_DEEP_DIVE"],
        });
        return;
      }

      // Build context and generate briefing
      const dataContext = buildDeepDiveContext(deepDive);
      logger.info("[VINCE_MEME_DEEP_DIVE] Generating deep dive briefing...");
      const briefing = await generateDeepDiveBriefing(runtime, dataContext);

      // Build output
      const output = [
        `**Deep Dive: ${deepDive.symbol}**`,
        "",
        briefing,
        "",
        "---",
        "",
        `**Quick Links:**`,
        deepDive.dexscreenerUrl
          ? `• [DexScreener](${deepDive.dexscreenerUrl})`
          : "",
        deepDive.gmgnUrl ? `• [GMGN (SL/TP)](${deepDive.gmgnUrl})` : "",
        deepDive.birdeyeUrl ? `• [Birdeye](${deepDive.birdeyeUrl})` : "",
        "",
        "*Commands: MEMES, DD [token], OPTIONS, PERPS, NEWS*",
      ]
        .filter((line) => line !== "")
        .join("\n");

      await callback({
        text: output,
        actions: ["VINCE_MEME_DEEP_DIVE"],
      });

      logger.info("[VINCE_MEME_DEEP_DIVE] Deep dive complete");
    } catch (error) {
      logger.error(`[VINCE_MEME_DEEP_DIVE] Error: ${error}`);
      await callback({
        text: "Deep dive failed. Something went wrong with the analysis. Try again.",
        actions: ["VINCE_MEME_DEEP_DIVE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Deep dive on $MOLT" } },
      {
        name: "VINCE",
        content: {
          text: "**Deep Dive: MOLT**\n\n**TLDR:** MOLT at $2.1M mcap is a valid entry - in retracement zone after the initial pump, smart money has been accumulating.\n\n**LIFECYCLE:**\nMOLT is in the RETRACEMENT stage, down about 45% from its ATH of ~$4M. This is classic Stage 3 in the GMGN framework - the PVP phase is over, weak hands have been shaken out, and we're in the smart money accumulation zone.\n\n**ENTRY STRATEGY:**\n- This is the zone where you want to enter, not during the PVP pump\n- Set stop-loss at -20% ($1.7M mcap equivalent)\n- First target: reclaim of $3M mcap (43% from here)\n- Moonshot target: $10M+ if AI narrative catches second wind\n- LP on Meteora is viable here - 180% APY and you get exposure to the rebound\n\n**RISK ASSESSMENT:**\n- Top 10 holders estimated at ~15% - decent but watch for coordinated dumps\n- Liquidity at $180K is workable but you're not getting size out quickly\n- If Bitcoin dumps, memes dump harder - macro matters\n\n**BULL CASE:**\nAI meme narrative is still heating up. MOLT has brand recognition from the initial run. If it catches a second wave with the Anthropic/OpenAI news cycle, $10M mcap is achievable - that's a 5x from here.\n\n**ACTION:** This is an APE with medium confidence. The retracement entry is textbook. Size appropriately and use the SL.\n\n---\n\n**Quick Links:**\n• [DexScreener](https://dexscreener.com/solana/molt)\n• [GMGN (SL/TP)](https://gmgn.ai/sol/token/molt)\n• [Birdeye](https://birdeye.so/token/molt)\n\n*Commands: MEMES, DD [token], OPTIONS, PERPS, NEWS*",
          actions: ["VINCE_MEME_DEEP_DIVE"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Analyze 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        },
      },
      {
        name: "VINCE",
        content: {
          text: "**Deep Dive: AGENT**\n\n**TLDR:** Skip this one. AGENT is mid-PVP with a 280% gain today - you're late and the retracement is coming.\n\n**LIFECYCLE:**\nAGENT is in full PVP mode. Only 18 hours old and already up 280%. This is Stage 2 - volatile, dangerous, and about to retrace. Vol/liq ratio at 22x confirms active PVP trading.\n\n**ENTRY STRATEGY:**\n- DO NOT enter now unless you're ready for a 50-80% drawdown\n- If you must, use GMGN with a tight -25% stop-loss\n- Better play: Wait for the retracement to $800K-$1.2M mcap range\n- That's where the second wave opportunity exists\n\n**RISK ASSESSMENT:**\n- Estimated top 10 holders at 25%+ - high concentration, likely coordinated\n- New + big pump pattern = typical pump and dump setup\n- Liquidity at $60K is thin - you're not getting size out\n- Very high probability of 50%+ dump when PVP phase ends\n\n**BULL CASE:**\nIf AGENT has a real community forming and isn't just a pump and dump, it could stabilize in the $1M-$2M mcap range after retracement. The AI agent narrative is hot right now.\n\n**ACTION:** AVOID at current prices. Set an alert for $1M mcap and reassess. The PVP is obvious and you're not early enough to justify the risk.\n\n---\n\n**Quick Links:**\n• [DexScreener](https://dexscreener.com/solana/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr)\n• [GMGN (SL/TP)](https://gmgn.ai/sol/token/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr)\n• [Birdeye](https://birdeye.so/token/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr)\n\n*Commands: MEMES, DD [token], OPTIONS, PERPS, NEWS*",
          actions: ["VINCE_MEME_DEEP_DIVE"],
        },
      },
    ],
  ],
};
