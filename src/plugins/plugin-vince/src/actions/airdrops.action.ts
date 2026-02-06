/**
 * VINCE Airdrops Action
 *
 * Human-style airdrop farming status that reads like a degen friend explaining the meta.
 * Uses LLM to generate conversational narrative about airdrop opportunities.
 *
 * Features:
 * - treadfi priority (MM & DN strategies)
 * - Active airdrop opportunities
 * - Strategy guidance
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { AirdropProtocol } from "../types/index";

// Key airdrop protocols we track
const TRACKED_PROTOCOLS: AirdropProtocol[] = [
  {
    name: "treadfi",
    category: "mm",
    status: "active",
    priority: 1,
    notes:
      "MM & DN strategies across Hyperliquid, Paradex, Extended, Nado, Pacifica",
  },
  {
    name: "Hyperliquid",
    category: "defi",
    status: "confirmed",
    priority: 2,
    notes: "Points program active, HYPE token live",
  },
  {
    name: "Paradex",
    category: "defi",
    status: "active",
    priority: 3,
    notes: "Trading rewards, maker rebates",
  },
  {
    name: "Extended",
    category: "defi",
    status: "speculated",
    priority: 4,
    notes: "Early stage, watch for announcements",
  },
  {
    name: "Nado",
    category: "defi",
    status: "speculated",
    priority: 5,
    notes: "Privacy-focused, potential airdrop",
  },
  {
    name: "Pacifica",
    category: "defi",
    status: "speculated",
    priority: 6,
    notes: "New entrant, monitor activity",
  },
];

// ==========================================
// Build data context for LLM
// ==========================================

interface AirdropsDataContext {
  priority: { name: string; status: string; notes: string; venues: string[] };
  active: { name: string; category: string; status: string; notes: string }[];
  speculated: { name: string; notes: string }[];
}

function buildAirdropsDataContext(ctx: AirdropsDataContext): string {
  const lines: string[] = [];

  lines.push("=== AIRDROP FARMING STATUS ===");
  lines.push("");

  lines.push("PRIORITY PROTOCOL:");
  lines.push(`${ctx.priority.name} (${ctx.priority.status})`);
  lines.push(`Strategy: ${ctx.priority.notes}`);
  lines.push(`Venues: ${ctx.priority.venues.join(", ")}`);
  lines.push("");

  lines.push("ACTIVE/CONFIRMED OPPORTUNITIES:");
  for (const p of ctx.active) {
    lines.push(`${p.name} (${p.category}) - ${p.status}`);
    lines.push(`  ${p.notes}`);
  }
  lines.push("");

  lines.push("SPECULATED (Not Confirmed):");
  for (const p of ctx.speculated) {
    lines.push(`${p.name}: ${p.notes}`);
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

async function generateAirdropsHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are VINCE, giving an airdrop farming update to a degen friend. You know the meta and you're sharing what's worth grinding.

Here's the data:

${dataContext}

Write an airdrop status update that:
1. Lead with the priority - what should they be focusing most time on?
2. Explain WHY something is priority - treadfi is about MM and DN strategies across multiple venues which compounds
3. Cover the active opportunities with practical guidance - not just "it's active" but what to actually do
4. Mention speculated ones briefly - these are bets, not confirmed plays
5. Give honest strategy advice - don't spread too thin, focus on what's proven
6. End with the key takeaway

CONTEXT ON PROTOCOLS:
- treadfi: Running market making (MM) and delta-neutral (DN) strategies across perp DEXs
- Hyperliquid: HYPE token is live, points still active for future seasons
- Paradex: Maker rebates make it profitable to provide liquidity
- Extended, Nado, Pacifica: Early/speculated, worth watching but not confirmed

STYLE RULES:
- Write like explaining the meta to a fellow degen
- Short punchy takes with practical advice
- No bullet points - flow naturally
- Have opinions. If something is overhyped, say it.
- Around 150-200 words. Dense insight, no padding.

AVOID:
- "Interestingly", "notably"
- Generic "do your own research" disclaimers
- Treating all protocols as equally important

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_AIRDROPS] Failed to generate briefing: ${error}`);
    return "Airdrop status is glitching. Check the knowledge base directly at grinding-the-trenches/airdrop-farming.md for the current meta.";
  }
}

export const vinceAirdropsAction: Action = {
  name: "VINCE_AIRDROPS",
  similes: ["AIRDROPS", "AIRDROP", "FARMING", "TREADFI", "POINTS"],
  description: "Human-style airdrop farming status with strategy guidance",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("airdrop") ||
      text.includes("farming") ||
      text.includes("treadfi") ||
      text.includes("tread") ||
      text.includes("points") ||
      text.includes("drop")
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
      logger.info("[VINCE_AIRDROPS] Building airdrop status...");

      const treadfi = TRACKED_PROTOCOLS.find((p) => p.name === "treadfi");
      const activeProtocols = TRACKED_PROTOCOLS.filter(
        (p) => p.status === "active" || p.status === "confirmed",
      );
      const speculatedProtocols = TRACKED_PROTOCOLS.filter(
        (p) => p.status === "speculated",
      );

      const ctx: AirdropsDataContext = {
        priority: {
          name: treadfi?.name || "treadfi",
          status: treadfi?.status || "active",
          notes: treadfi?.notes || "MM & DN strategies",
          venues: ["Hyperliquid", "Paradex", "Extended", "Nado", "Pacifica"],
        },
        active: activeProtocols.map((p) => ({
          name: p.name,
          category: p.category,
          status: p.status,
          notes: p.notes,
        })),
        speculated: speculatedProtocols.map((p) => ({
          name: p.name,
          notes: p.notes,
        })),
      };

      // Generate briefing
      const dataContext = buildAirdropsDataContext(ctx);
      logger.info("[VINCE_AIRDROPS] Generating briefing...");
      const briefing = await generateAirdropsHumanBriefing(
        runtime,
        dataContext,
      );

      const output = [
        "**Airdrop Status**",
        "",
        briefing,
        "",
        "---",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_AIRDROPS"],
      });

      logger.info("[VINCE_AIRDROPS] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_AIRDROPS] Error: ${error}`);
      await callback({
        text: "Airdrop status failed to load. Check the knowledge base directly for the current meta.",
        actions: ["VINCE_AIRDROPS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What's the airdrop status?" } },
      {
        name: "VINCE",
        content: {
          text: "**Airdrop Status**\n\nAirdrop season is heating up. Focus is still treadfi - running MM and DN strategies across 5 venues. The compounding effect across Hyperliquid, Paradex, Extended, Nado, and Pacifica is the meta right now. More venues = more points = bigger potential drop.\n\nHyperliquid already confirmed with HYPE live. Points program still running for season 2 so it's not too late to accumulate. The thesis is validated. Paradex is active with maker rebates - you're literally getting paid to provide liquidity while farming the potential drop. Double dipping.\n\nExtended, Nado, and Pacifica are all speculated. Early stage protocols where early usage could pay off but nothing confirmed. These are lotto tickets, not guaranteed plays. I'd allocate maybe 10-15% of airdrop farming time here, rest goes to the confirmed stuff.\n\nHonest strategy: Don't spread too thin. Quality over quantity. Better to be a whale on 3 protocols than a minnow on 10. Track everything in a spreadsheet - the compounding only works if you're consistent.\n\nThe play: treadfi strategies on Hyperliquid and Paradex are the priority. The rest is gravy.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_AIRDROPS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Tell me about treadfi" } },
      {
        name: "VINCE",
        content: {
          text: "**Airdrop Status**\n\ntreadfi is the priority play right now. Here's why.\n\nThe strategy is running market making and delta-neutral positions across multiple perp DEXs. Hyperliquid is the primary venue since they've confirmed with HYPE and the points program is still live. But the real alpha is spreading across Paradex, Extended, Nado, and Pacifica simultaneously. Each protocol you're active on is another potential airdrop.\n\nParadex is particularly nice because maker rebates mean you're getting paid while farming. That's the sweet spot - positive carry while waiting for the drop. Extended and Nado are earlier but the playbook is the same.\n\nThe compounding math is simple: if each protocol drops 4 figures, being active on 5 is potentially 5x what you'd get grinding just one. But the catch is you need to actually be consistent. Set it up properly, track in a spreadsheet, don't just do it for a week and forget.\n\nMost people spread too thin or give up too early. The ones who make real money from airdrops treat it like a job. Consistent activity, multiple venues, proper tracking.\n\nPriority: Hyperliquid (confirmed) → Paradex (maker rebates) → Extended/Nado/Pacifica (speculation).\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_AIRDROPS"],
        },
      },
    ],
  ],
};
