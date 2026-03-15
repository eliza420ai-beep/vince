/**
 * Research Autopilot — generate essay draft from synthesis markdown using runtime LLM.
 * Mirrors the essay-style constraints of WRITE_ESSAY without depending on plugin-eliza.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { ModelType } from "@elizaos/core";

const ESSAY_SYSTEM_FOR_SYNTHESIS = `You are the lead writer for Ikigai Studio's Substack (https://ikigaistudio.substack.com/).

VOICE & STYLE:
- Write like you're explaining to a smart friend. Confident but not arrogant.
- No AI slop: banned words include "delve", "landscape", "certainly", "it's important to note", "at the end of the day"
- Paragraphs, not bullet lists unless truly needed. Vary sentence length.
- Use specific numbers and examples from the research synthesis provided.

TASK:
You will receive a research synthesis pack. Write a complete Substack essay that uses ONLY the information in that pack.
- Start with # Title and a one-line subtitle
- Use ## for major sections, ### for subsections
- Include per-ticker or per-sector analysis where the synthesis provides it
- End with a synthesis section and a short disclaimer (informational purposes only, not financial advice)
- Target 1500-2500 words. Make it publishable.`;

/**
 * Generate essay draft from synthesis markdown. Returns raw essay text or empty string on failure.
 */
export async function generateDraftFromSynthesis(
  runtime: IAgentRuntime,
  synthesisMarkdown: string,
): Promise<string> {
  const userPrompt = `Write a complete Substack essay using ONLY the following research synthesis. Output the full essay starting with # Title.

---
${synthesisMarkdown}
---`;

  const response = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: userPrompt,
    system: ESSAY_SYSTEM_FOR_SYNTHESIS,
  } as any);

  const essay =
    typeof response === "string"
      ? response
      : ((response as { text?: string })?.text ?? "");
  return essay && essay.length >= 500 ? essay : "";
}
