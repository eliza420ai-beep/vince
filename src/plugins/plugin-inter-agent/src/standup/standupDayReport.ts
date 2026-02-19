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
  return `You are Kelly. Write the Day Report for ${date} like you're texting the team a quick recap. Not a formal document. Not a slide. A message.

TRANSCRIPT:
${conversationContext}

FORMAT — this exact order, nothing extra:

Day Report — ${date}

Solus's call: [Above/Below/Uncertain] — [why, one sentence]
TL;DR: [One sentence you'd text a friend. What's happening, what we're doing.]

TODO
| WHAT | WHY | OWNER |
|------|-----|-------|
| [task] | [why today] | @Agent |
(5-7 rows. Specific tasks, specific owners. No "monitor X" filler.)

Risk: [One line or "Clear"]

Wrap-up
[3-4 sentences max. What mattered today, one cross-agent connection, one thing to watch. Write it like you'd say it out loud. 50 words max.]

---
One team, one dream.

HARD RULES:
- Total output under 300 words. If it's longer, you failed.
- No "Essential question" header. No "###" headers. No "In brief" header. Just the content.
- TL;DR = one sentence. Risk = one line.
- Wrap-up = a short paragraph, not bullets. Something you'd actually say.
- No: leverage, utilize, streamline, paradigm, holistic, delve, landscape, notably, interestingly, circle back, touch base.`;
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
    maxTokens: 800,
    temperature: 0.7,
  });
  const reportText = String(dayReport).trim();
  const savedPath = await saveDayReport(reportText);
  if (savedPath) {
    const tldrMatch = reportText.match(
      /(?:\*\*TL;DR:\*\*\s*|### TL;DR\n|TL;DR:\s*)([^\n#]+)/,
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
