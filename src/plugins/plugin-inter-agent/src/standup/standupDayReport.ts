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
import { parseActionItemsFromReport, addActionItem, type ActionItem } from "./actionItemTracker";

/**
 * Build the core Day Report prompt from conversation context.
 * Single source of truth for the Day Report format. Opens with ALOHA-style narrative, then structured block.
 */
export function buildDayReportPrompt(conversationContext: string): string {
  const essentialQ = getEssentialStandupQuestion();
  return `You are Kelly. Synthesize the standup into a Day Report. Write like a smart friend over coffee — one flowing narrative first, then a short structured block.

CONVERSATION:
${conversationContext}

${ALOHA_STYLE_BLOCK}

OUTPUT STRUCTURE:

1) OPENING NARRATIVE (ALOHA style, ~150–200 words)
   One flowing paragraph that synthesizes what the team said and leads to a clear take. No bullet lists in this paragraph. No "In conclusion" or "Overall". Take positions. Use the conversation above to be specific (VINCE's data, Solus's call, Oracle's odds, etc.). This is the main value of the report — readable, impactful, human.

2) STRUCTURED BLOCK (keep short)
   ## 📋 Day Report — ${formatReportDate()}

   **Essential question:** ${essentialQ}

   **Solus's call:** [Above/Below/Uncertain] — [one sentence from Solus's answer]

   **TL;DR:** [ONE sentence: Asset + Direction + Action]

   ### Actions (max 3, each with @Owner)
   1. **[ACTION]** — @Owner — [specific entry/size/invalidation]
   2. **[ACTION]** — @Owner — [specific entry/size/invalidation]
   3. **[ACTION]** — @Owner — [specific entry/size/invalidation]

   ### Risks
   [One line or "Clear"]

   ---
   *Ship it.*

RULES:
- Opening narrative = flowing prose only, ~150–200 words, no bullets there
- TL;DR = ONE sentence
- Max 3 actions, each with @Owner
- No fluff, no "consider", no "monitor" — specific trades only
- Total output under 350 words`;
}

export interface GenerateDayReportOptions {
  /** Extra prompt content (e.g. action items context, recent reports, validation). */
  extraPrompt?: string;
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
  const prompt =
    buildDayReportPrompt(transcriptOrContext) + (options?.extraPrompt ? `\n\n${options.extraPrompt}` : "");
  const dayReport = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt,
    maxTokens: 1200,
    temperature: 0.7,
  });
  const reportText = String(dayReport).trim();
  const savedPath = await saveDayReport(reportText);
  if (savedPath) {
    const tldrMatch = reportText.match(/### TL;DR\n([^\n#]+)/);
    await updateDayReportManifest(savedPath, tldrMatch?.[1]?.trim() || "Day report generated");
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
  return { reportText, savedPath, parsedItems };
}
