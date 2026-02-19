/**
 * Shared Day Report prompt and generation.
 * Used by STANDUP_FACILITATE (manual wrap-up and round-robin) and by the scheduled standup task.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getEssentialStandupQuestion } from "./standup.constants";
import { formatReportDate } from "./standupReports";
import { ALOHA_STYLE_BLOCK } from "./standupStyle";
import { saveDayReport, updateDayReportManifest } from "./dayReportPersistence";
import {
  parseActionItemsFromReport,
  addActionItem,
  type ActionItem,
} from "./actionItemTracker";
import type { ParsedStructuredBlock } from "./crossAgentValidation";
import {
  predictionFromStructuredCall,
  savePrediction,
  loadPredictions,
  getAccuracyStats,
} from "./predictionTracker";

/**
 * Build the core Day Report prompt from conversation context.
 * Single source of truth for the Day Report format.
 * Produces a VINCE Report-of-the-Day-style narrative (800-1200 words) followed by a
 * short structured block with a parseable Daily TODO table (| WHAT | HOW | WHY | OWNER |).
 */
export function buildDayReportPrompt(conversationContext: string): string {
  const essentialQ = getEssentialStandupQuestion();
  const date = formatReportDate();
  return `You are Kelly, writing the team's Day Report for ${date}. This is the single daily output that the whole team reads. It must feel like one cohesive article, not a patchwork of agent updates stitched together.

STANDUP TRANSCRIPT:
${conversationContext}

TEAM PRIORITIES (reference whichever are relevant today; assign TODO items that move these forward):
- BTC macro: Where will BTC be in the next bull market? How low can we drop during the current bear?
- Solus / options: Best strategies for our weekly BTC options on Hypersurface (strike, direction, premium, invalidation).
- VINCE / paper bot: How is the paper trading bot performing? What can we do to improve it (new signals, sizing, ML)?
- VINCE / data: How can VINCE get more onchain/offchain data? Higher API tiers? New sources (Nansen, Arkham, Glassnode, DefiLlama)?
- Otaku / web4 agent: How do we get Otaku operational with a real wallet that transacts onchain? Keys, balance check, first swap, DCA, stop-loss.
- Sentinel / repo: How can Sentinel improve the repo? Ship code, close PRDs, unblock others, proactive tech focus.
- Eliza / content + knowledge: How can Eliza produce better content (Substack, essays)? What knowledge should we expand or ingest?
- Clawterm / AI agents: How can Clawterm keep us current on AI agents (OpenClaw, Milaidy, ElizaOS, skills, new tools)?
- Oracle / Polymarket: Can Oracle get better insights from Polymarket? More markets, odds interpretation, portfolio tracking?
- ECHO / X alpha: Can ECHO deliver sharper insights and alpha from X? Better queries, narrative detection, contrarian flags?
- Kelly + Naval / live the life: How can we live well? Touch grass, founder lifestyle, balance, one team one dream.

Write a single flowing article (800-1200 words) that:

1. Opens with the overall vibe: what kind of day is it for the team? Risk-on, risk-off, chop, capitulation, greed? Use VINCE's data to back it.
2. Weave in what each agent reported: VINCE's market data, ECHO's CT sentiment, Oracle's Polymarket odds, Solus's options call, Sentinel's tech/repo status, Eliza's content/knowledge ideas, Clawterm's AI agent intel, Otaku's DeFi progress, Naval's closing thesis. Connect them across domains (e.g. "ECHO's bearish CT sentiment aligns with VINCE's negative funding, which makes Solus's put-selling strategy look well-timed"). This cross-referencing is the whole point: 1+1=3.
3. Give specific numbers from the transcript. Weave them in naturally ("BTC at 96.2k with funding at -0.012%", "Oracle has the Fed rate cut at 72% YES").
4. End the narrative with your take: what to do. One clear recommendation. Pick a side. No hedging.

STYLE:
- Flowing prose only in the narrative. No bullet points, no markdown headers, no "Section 1:".
- Write like a trading desk letter to a sharp friend. Specific numbers woven in naturally.
- Cross-reference data across agents (VINCE data + ECHO sentiment + Oracle odds + Solus call).
- Opinionated. Take positions. If an agent's take is weak, say so.
- Do not use: "Interestingly", "notably", "it's worth noting", "leverage", "utilize", "streamline", "robust", "cutting-edge", "paradigm", "holistic", "seamless", "delve", "landscape", "circle back", "touch base", "at the end of the day", "it's worth noting", "to be clear", "in essence", "let's dive in".
- Punctuation: Do not overuse em dashes. Use commas or short sentences instead; heavy em dashes read as AI slop.

After the narrative, add this structured block:

## Day Report — ${date}

**Essential question:** ${essentialQ}

**Solus's call:** [Above/Below/Uncertain] — [one sentence from Solus's answer]

**TL;DR:** [ONE sentence: Asset + Direction + Action]

### Daily TODO

| WHAT | HOW | WHY | OWNER |
|------|-----|-----|-------|
| [specific task from conversation or team priorities] | [concrete step] | [why it matters today] | @[Agent] |
| [specific task] | [concrete step] | [why now] | @[Agent] |
| [specific task] | [concrete step] | [why now] | @[Agent] |
| [specific task] | [concrete step] | [why now] | @[Agent] |
| [specific task] | [concrete step] | [why now] | @[Agent] |

### Risks
[One line or "Clear"]

---
*One team, one dream. Ship it.*

RULES:
- Narrative = 800-1200 words of flowing prose. Dense and readable. This is the main value.
- TL;DR = ONE sentence
- Daily TODO = 5-7 rows in the table. Each row must have a specific @Owner (one of: @VINCE, @Eliza, @ECHO, @Oracle, @Solus, @Otaku, @Kelly, @Sentinel, @Clawterm, @Naval). Tasks come from the conversation AND the team priorities above. No generic "monitor" or "consider" items. Specific, actionable, ship-today tasks.
- Risks = one line
- Do NOT pad the narrative. Every sentence should carry weight.`;
}

export interface GenerateDayReportOptions {
  /** Extra prompt content (e.g. action items context, recent reports, validation). */
  extraPrompt?: string;
  /** Round-robin replies with optional structured signals; used to extract Solus call for prediction tracker. */
  replies?: { agentName: string; structuredSignals?: ParsedStructuredBlock }[];
}

export interface GenerateDayReportResult {
  reportText: string;
  savedPath: string | null;
  parsedItems: Partial<ActionItem>[];
}

/**
 * Generate Day Report from transcript/context, save to disk, update manifest, and track action items.
 * Single place for Day Report generation used by wrap-up and round-robin.
 */
export async function generateAndSaveDayReport(
  runtime: IAgentRuntime,
  transcriptOrContext: string,
  options?: GenerateDayReportOptions,
): Promise<GenerateDayReportResult> {
  let accuracyPrompt = "";
  try {
    const predictions = await loadPredictions();
    const stats = getAccuracyStats(predictions, 10);
    if (stats.total > 0) {
      accuracyPrompt = `\n\nHistorical accuracy: ${stats.accuracyPct}%. If accuracy is below 50%, note that the team should be more conservative in confidence levels.`;
      if (stats.lastMiss) accuracyPrompt += ` Last miss: ${stats.lastMiss}.`;
    }
  } catch {
    /* non-fatal */
  }
  const prompt =
    buildDayReportPrompt(transcriptOrContext) +
    (options?.extraPrompt ? `\n\n${options.extraPrompt}` : "") +
    accuracyPrompt;
  const dayReport = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt,
    maxTokens: 2800,
    temperature: 0.7,
  });
  const reportText = String(dayReport).trim();
  const savedPath = await saveDayReport(reportText);
  if (savedPath) {
    const tldrMatch = reportText.match(/### TL;DR\n([^\n#]+)/);
    await updateDayReportManifest(
      savedPath,
      tldrMatch?.[1]?.trim() || "Day report generated",
    );
  }
  const date = formatReportDate();
  const parsedItems = parseActionItemsFromReport(reportText, date);
  for (const item of parsedItems) {
    if (item.what && item.owner) {
      await addActionItem({
        date,
        what: item.what,
        how: item.how ?? "",
        why: item.why ?? "",
        owner: item.owner,
        urgency: (item.urgency as ActionItem["urgency"]) ?? "today",
      });
    }
  }
  if (options?.replies) {
    const solusReply = options.replies.find(
      (r) => r.agentName.toLowerCase() === "solus",
    );
    const input = solusReply?.structuredSignals
      ? predictionFromStructuredCall(solusReply.structuredSignals, date)
      : null;
    if (input) {
      try {
        await savePrediction(input);
      } catch (e) {
        // non-fatal
      }
    }
  }
  return { reportText, savedPath, parsedItems };
}
