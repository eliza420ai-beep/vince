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
 * Reads like a quick update you'd send the team in chat — scannable but human, not a formal log.
 */
export function buildDayReportPrompt(conversationContext: string): string {
  const essentialQ = getEssentialStandupQuestion();
  const date = formatReportDate();
  return `You are Kelly, writing the team's Day Report for ${date}. Write it like a quick update you'd send the team in chat — scannable but human, not a formal report or log. Put the takeaway first so readers get it in 10 seconds.

${ALOHA_STYLE_BLOCK}

STANDUP TRANSCRIPT:
${conversationContext}

TEAM PRIORITIES (assign TODO items that move these forward; pick 5-7 specific tasks):
- BTC macro, Solus/Hypersurface options, VINCE paper bot, Otaku wallet, Sentinel repo, Eliza content/knowledge, Clawterm AI agents, Oracle Polymarket, ECHO X alpha, Kelly/Naval live the life.

OUTPUT FORMAT — use this exact order. Do not add extra sections.

## Day Report — ${date}

**Essential question:** ${essentialQ}

**Solus's call:** [Above/Below/Uncertain] — [one sentence from Solus, something you'd say out loud]

**TL;DR:** [ONE sentence you'd text a friend: asset + direction + what we're doing. No jargon.]

### Daily TODO

| WHAT | HOW | WHY | OWNER |
|------|-----|-----|-------|
| [task] | [step] | [why today] | @Agent |
| ... 5-7 rows total ... |

### Risks
[One line or "Clear"]

---
*One team, one dream. Ship it.*

### In brief
[3-5 short lines you'd actually text a friend. What happened today, one cross-agent link, one thing to watch. No bullet jargon, no corporate speak. 60 words max.]

RULES:
- Structured block (Essential Q through Risks) comes FIRST. "In brief" comes LAST and reads like a voice note or text, not a bullet list from a slide.
- TL;DR and Solus's call = one sentence each, something you'd say out loud.
- Daily TODO = 5-7 rows. Each row: specific @Owner. No generic "monitor" items.
- In brief = lines you'd send in chat. No "leverage", "utilize", "streamline", "paradigm", "holistic", "delve", "landscape", "circle back", "touch base", "at the end of the day", "notably", "interestingly".`;
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
    maxTokens: 1200,
    temperature: 0.7,
  });
  const reportText = String(dayReport).trim();
  const savedPath = await saveDayReport(reportText);
  if (savedPath) {
    const tldrMatch = reportText.match(
      /(?:\*\*TL;DR:\*\*\s*|### TL;DR\n)([^\n#]+)/,
    );
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
