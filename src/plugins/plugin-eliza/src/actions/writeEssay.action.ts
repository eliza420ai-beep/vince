/**
 * WRITE_ESSAY Action
 *
 * Generate long-form Substack essays from the knowledge base.
 * Uses RAG to pull relevant knowledge and synthesize into publishable content.
 *
 * Target: https://ikigaistudio.substack.com/
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { getVoicePromptAddition } from "../services/voice.service";
import { DRAFTS_DIR } from "../config/paths";

const SUBSTACK_URL = "https://ikigaistudio.substack.com/";

// Essay styles/formats
type EssayStyle =
  | "deep-dive"
  | "framework"
  | "contrarian"
  | "synthesis"
  | "playbook";

interface EssayRequest {
  topic: string;
  style: EssayStyle;
  targetWords: number;
  angle?: string;
}

const STYLE_PROMPTS: Record<EssayStyle, string> = {
  "deep-dive": `Write a comprehensive deep-dive essay. Structure:
- Hook that challenges conventional thinking
- Context: why this matters now
- Deep exploration with examples and data
- Nuanced analysis of tradeoffs
- Actionable insights
- Strong closing that ties back to the hook`,

  framework: `Write a framework essay that gives readers a mental model. Structure:
- Problem statement: what's broken or misunderstood
- The framework: name it, explain the components
- How to apply it: concrete examples
- Edge cases and when it doesn't work
- Summary: the one-liner they'll remember`,

  contrarian: `Write a contrarian essay that challenges popular opinion. Structure:
- The consensus view (steelman it)
- Why the consensus is wrong or incomplete
- Your thesis: the uncomfortable truth
- Evidence and reasoning
- What this means for the reader
- Call to action or mindset shift`,

  synthesis: `Write a synthesis essay connecting multiple domains. Structure:
- The surprising connection between X and Y
- Deep dive into each domain
- Where they intersect: the insight
- Why this matters
- How to use this cross-domain thinking`,

  playbook: `Write a tactical playbook essay. Structure:
- What we're optimizing for
- The strategy (high-level)
- The tactics (step-by-step)
- Common mistakes to avoid
- How to know it's working
- Advanced moves for the sophisticated`,
};

const ESSAY_SYSTEM_PROMPT = `You are the lead writer for Ikigai Studio's Substack (${SUBSTACK_URL}).

VOICE & STYLE:
- Write like you're explaining to a smart friend, not presenting to a board
- Confident but not arrogant. Take positions.
- No AI slop: banned words include "delve", "landscape", "certainly", "it's important to note", "at the end of the day"
- Paragraphs, not bullet lists (unless truly needed for a list)
- Vary sentence length. Short punchy. Then longer, more nuanced explanations.
- Use specific numbers and examples, not vague generalities
- Have a personality. If something is boring, say it. If something excites you, show it.

FORMATTING:
- Title: compelling, specific, not clickbait
- Subtitle: one sentence that promises the value
- Use ## for major sections, ### for subsections
- Pull quotes or callouts for key insights
- End with a thought that lingers

CONTENT PHILOSOPHY:
- Trade well, live well. Edge and equilibrium.
- Crypto as a game, not a jail
- Lifestyle over spreadsheet
- Frameworks over hot takes
- Long-term thinking with short-term tactics

Draw from the knowledge base when relevant. Cite frameworks by name. Make it publishable.`;

function detectStyle(text: string): EssayStyle {
  const lower = text.toLowerCase();
  if (
    lower.includes("deep dive") ||
    lower.includes("deep-dive") ||
    lower.includes("comprehensive")
  ) {
    return "deep-dive";
  }
  if (
    lower.includes("framework") ||
    lower.includes("mental model") ||
    lower.includes("how to think")
  ) {
    return "framework";
  }
  if (
    lower.includes("contrarian") ||
    lower.includes("unpopular") ||
    lower.includes("against")
  ) {
    return "contrarian";
  }
  if (
    lower.includes("synthesis") ||
    lower.includes("connect") ||
    lower.includes("cross-domain")
  ) {
    return "synthesis";
  }
  if (
    lower.includes("playbook") ||
    lower.includes("tactical") ||
    lower.includes("step by step") ||
    lower.includes("how to")
  ) {
    return "playbook";
  }
  return "deep-dive"; // default
}

function extractTopic(text: string): string {
  // Remove common prefixes
  const cleaned = text
    .replace(
      /^(write|draft|create|generate)\s+(an?\s+)?(essay|article|piece|post|substack)\s+(about|on|for|covering)?\s*/i,
      "",
    )
    .replace(/^(essay|article)\s+(about|on)?\s*/i, "")
    .trim();

  return cleaned || "crypto market dynamics";
}

function ensureDraftsDir(): void {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

function saveDraft(title: string, content: string): string {
  ensureDraftsDir();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const timestamp = Date.now();
  const filename = `draft-${slug}-${timestamp}.md`;
  const filepath = path.join(DRAFTS_DIR, filename);

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
status: draft
created: ${new Date().toISOString()}
target: substack
url: ${SUBSTACK_URL}
---

`;

  fs.writeFileSync(filepath, frontmatter + content, "utf-8");
  return filepath;
}

export const writeEssayAction = {
  name: "WRITE_ESSAY",
  similes: [
    "DRAFT_ESSAY",
    "SUBSTACK",
    "WRITE_ARTICLE",
    "CREATE_ESSAY",
    "ESSAY",
  ],
  description: `Generate a long-form Substack essay from the knowledge base.

TRIGGERS:
- "write an essay about [topic]"
- "draft a substack on [topic]"
- "essay: [topic]"
- "write a deep-dive on [topic]"
- "create a framework essay about [topic]"

STYLES:
- deep-dive: comprehensive exploration
- framework: mental models and how to think
- contrarian: challenge popular opinion
- synthesis: connect multiple domains
- playbook: tactical step-by-step

Target: ${SUBSTACK_URL}`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      (text.includes("essay") &&
        (text.includes("write") ||
          text.includes("draft") ||
          text.includes("create"))) ||
      (text.includes("substack") &&
        (text.includes("write") || text.includes("draft"))) ||
      text.startsWith("essay:") ||
      text.startsWith("essay about") ||
      (text.includes("article") &&
        text.includes("write") &&
        !text.includes("upload"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text || "";

    try {
      const topic = extractTopic(text);
      const style = detectStyle(text);
      const stylePrompt = STYLE_PROMPTS[style];

      logger.info({ topic, style }, "[WRITE_ESSAY] Generating essay...");

      if (callback) {
        await callback({
          text: `✍️ **Drafting ${style} essay**\n\n**Topic:** ${topic}\n**Style:** ${style}\n**Target:** Ikigai Studio Substack\n\n_Generating... this takes 30-60 seconds for quality content._`,
          actions: ["WRITE_ESSAY"],
        });
      }

      // Get voice profile for brand consistency
      const voiceAddition = getVoicePromptAddition();

      // Build the prompt
      const userPrompt = `Write a ${style} essay about: ${topic}

${stylePrompt}

Target length: 1500-2500 words. Make it publishable on Substack.

Start with the title (# Title) and subtitle, then the essay.`;

      // Generate with LLM, including voice profile
      const response = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: userPrompt,
        system: ESSAY_SYSTEM_PROMPT + "\n\n" + voiceAddition,
      } as any);

      const essay =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? "");

      if (!essay || essay.length < 500) {
        if (callback) {
          await callback({
            text: `❌ Essay generation failed or was too short. Try again with a more specific topic.`,
            actions: ["WRITE_ESSAY"],
          });
        }
        return;
      }

      // Extract title from essay
      const titleMatch = essay.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] || topic;

      // Save draft
      const filepath = saveDraft(title, essay);
      const wordCount = essay.split(/\s+/).filter((w) => w.length > 0).length;

      if (callback) {
        const essayOut = `✅ **Essay Draft Complete**

**Title:** ${title}
**Style:** ${style}
**Words:** ~${wordCount}
**Saved:** \`${filepath}\`

---

${essay}

---

**Next steps:**
• Review and edit in \`${filepath}\`
• Publish to [Ikigai Studio Substack](${SUBSTACK_URL})
• Want changes? Tell me what to adjust.`;
        const out = "Here's your essay draft—\n\n" + essayOut;
        await callback({
          text: out,
          actions: ["WRITE_ESSAY"],
        });
      }
    } catch (error) {
      logger.error({ error }, "[WRITE_ESSAY] Error");
      if (callback) {
        await callback({
          text: `❌ Error generating essay: ${String(error)}`,
          actions: ["WRITE_ESSAY"],
        });
      }
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "write an essay about the Bitcoin halving cycle" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "✍️ **Drafting deep-dive essay**\n\n**Topic:** Bitcoin halving cycle...",
          actions: ["WRITE_ESSAY"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: {
          text: "draft a contrarian substack on why most traders fail",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "✍️ **Drafting contrarian essay**\n\n**Topic:** why most traders fail...",
          actions: ["WRITE_ESSAY"],
        },
      },
    ],
  ],
} as Action;

export default writeEssayAction;
