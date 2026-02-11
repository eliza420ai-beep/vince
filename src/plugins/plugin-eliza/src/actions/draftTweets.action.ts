/**
 * DRAFT_TWEETS Action
 *
 * Generate tweet suggestions for @ikigaistudioxyz
 * Can create single tweets, threads, or a batch of tweet ideas.
 *
 * Target: https://x.com/ikigaistudioxyz
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

const DRAFTS_DIR = "./knowledge/drafts/tweets";
const X_HANDLE = "@ikigaistudioxyz";
const X_URL = "https://x.com/ikigaistudioxyz";

type TweetFormat = "single" | "thread" | "batch";

interface TweetDraft {
  content: string;
  format: TweetFormat;
  topic: string;
  timestamp: number;
}

const TWEET_SYSTEM_PROMPT = `You are the social media voice for Ikigai Studio (${X_HANDLE}).

VOICE & STYLE:
- Sharp, confident, slightly provocative
- No engagement bait ("What do you think?", "Agree?", "RT if...")
- No hashtag spam (max 1-2 if truly relevant)
- Substance over virality
- Take positions. Be memorable.

CONTENT THEMES:
- Trading frameworks and mental models
- Crypto market observations (not predictions)
- Lifestyle optimization, living well
- Contrarian takes on popular narratives
- Quick tactical insights
- Art, culture, good taste

FORMATTING:
- Single tweets: punchy, under 280 chars, stands alone
- Threads: each tweet stands alone but builds a narrative, number them 1/, 2/, etc.
- Never start with "I" or "We"
- Use line breaks for rhythm
- Occasional emoji for emphasis, not decoration

BANNED:
- "gm" / "gn" / "wagmi" / "ngmi" / "ser" (unless ironic)
- "This is the way" / "LFG" / "bullish" as standalone
- Asking for engagement
- Generic motivational content
- Humble bragging

The goal: tweets that make smart people want to follow ${X_HANDLE}.`;

function detectFormat(text: string): TweetFormat {
  const lower = text.toLowerCase();
  if (lower.includes("thread")) return "thread";
  if (lower.includes("batch") || lower.includes("ideas") || lower.includes("multiple") || lower.includes("several")) {
    return "batch";
  }
  return "single";
}

function extractTopic(text: string): string {
  const cleaned = text
    .replace(/^(draft|write|create|generate|suggest)\s+(a\s+)?(tweet|thread|tweets?)\s+(about|on|for|covering)?\s*/i, "")
    .replace(/^(tweet|thread)\s+(about|on)?\s*/i, "")
    .replace(/for\s+@\w+\s*/i, "")
    .trim();
  
  return cleaned || "current market dynamics";
}

function ensureDraftsDir(): void {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

function saveTweetDraft(draft: TweetDraft): string {
  ensureDraftsDir();
  const slug = draft.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const filename = `tweet-${draft.format}-${slug}-${draft.timestamp}.md`;
  const filepath = path.join(DRAFTS_DIR, filename);
  
  const content = `---
format: ${draft.format}
topic: "${draft.topic}"
created: ${new Date(draft.timestamp).toISOString()}
target: ${X_HANDLE}
status: draft
---

${draft.content}
`;
  
  fs.writeFileSync(filepath, content, "utf-8");
  return filepath;
}

function formatTweetForDisplay(content: string, format: TweetFormat): string {
  if (format === "thread") {
    // Add visual separator between thread tweets
    return content.replace(/(\d+\/)/g, "\n---\n\n$1");
  }
  if (format === "batch") {
    // Number the batch items
    const tweets = content.split(/\n{2,}/).filter((t) => t.trim());
    return tweets.map((t, i) => `**Option ${i + 1}:**\n${t.trim()}`).join("\n\n---\n\n");
  }
  return content;
}

export const draftTweetsAction: Action = {
  name: "DRAFT_TWEETS",
  similes: [
    "TWEET",
    "SUGGEST_TWEET",
    "WRITE_TWEET",
    "TWITTER",
    "X_POST",
    "DRAFT_THREAD",
  ],
  description: `Generate tweet suggestions for ${X_HANDLE}.

TRIGGERS:
- "draft a tweet about [topic]"
- "suggest tweets about [topic]"
- "write a thread on [topic]"
- "tweet ideas for [topic]"
- "batch of tweets about [topic]"

FORMATS:
- single: one punchy tweet
- thread: multi-tweet narrative (1/, 2/, 3/...)
- batch: 3-5 standalone tweet options

Target: ${X_URL}`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      (text.includes("tweet") && (text.includes("draft") || text.includes("write") || text.includes("suggest") || text.includes("create"))) ||
      (text.includes("thread") && (text.includes("draft") || text.includes("write"))) ||
      text.includes("tweet about") ||
      text.includes("tweet on") ||
      (text.includes("x post") || text.includes("x.com")) && text.includes("draft")
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
      const format = detectFormat(text);

      logger.info({ topic, format }, "[DRAFT_TWEETS] Generating tweets...");

      if (callback) {
        await callback({
          text: `🐦 **Drafting ${format === "thread" ? "thread" : format === "batch" ? "tweet batch" : "tweet"}**\n\n**Topic:** ${topic}\n**Format:** ${format}\n**Account:** ${X_HANDLE}\n\n_Generating..._`,
          actions: ["DRAFT_TWEETS"],
        });
      }

      // Build the prompt based on format
      let userPrompt: string;
      switch (format) {
        case "thread":
          userPrompt = `Write a Twitter thread (5-8 tweets) about: ${topic}

Format each tweet as "1/ [content]", "2/ [content]", etc.
Each tweet must stand alone but build the narrative.
First tweet is the hook. Last tweet is the call to action or key takeaway.
Keep each under 280 characters.`;
          break;
        
        case "batch":
          userPrompt = `Generate 5 different standalone tweet options about: ${topic}

Each tweet should:
- Be under 280 characters
- Take a different angle or approach
- Stand completely alone
- Be ready to post

Separate each tweet with a blank line.`;
          break;
        
        default: // single
          userPrompt = `Write one punchy tweet about: ${topic}

Requirements:
- Under 280 characters
- Stands alone, no context needed
- Sharp take, not generic observation
- No engagement bait`;
      }

      // Get voice profile for brand consistency
      const voiceAddition = getVoicePromptAddition();

      // Generate with LLM, including voice profile
      const response = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: userPrompt,
        system: TWEET_SYSTEM_PROMPT + "\n\n" + voiceAddition,
      });

      const content = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";

      if (!content || content.length < 20) {
        if (callback) {
          await callback({
            text: `❌ Tweet generation failed. Try again with a different topic.`,
            actions: ["DRAFT_TWEETS"],
          });
        }
        return;
      }

      // Save draft
      const draft: TweetDraft = {
        content: content.trim(),
        format,
        topic,
        timestamp: Date.now(),
      };
      const filepath = saveTweetDraft(draft);

      // Format for display
      const displayContent = formatTweetForDisplay(content.trim(), format);

      if (callback) {
        await callback({
          text: `✅ **Tweet Draft${format === "batch" ? "s" : ""} Ready**

**Topic:** ${topic}
**Format:** ${format}
**Saved:** \`${filepath}\`

---

${displayContent}

---

**Next steps:**
• Copy and post to [${X_HANDLE}](${X_URL})
• Want variations? Ask for a different angle.
• Want a thread? Say "write a thread on ${topic}"`,
          actions: ["DRAFT_TWEETS"],
        });
      }
    } catch (error) {
      logger.error({ error }, "[DRAFT_TWEETS] Error");
      if (callback) {
        await callback({
          text: `❌ Error generating tweets: ${String(error)}`,
          actions: ["DRAFT_TWEETS"],
        });
      }
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "draft a tweet about Bitcoin ETF flows" },
      },
      {
        name: "Eliza",
        content: {
          text: "🐦 **Drafting tweet**\n\n**Topic:** Bitcoin ETF flows...",
          actions: ["DRAFT_TWEETS"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "write a thread on why most traders fail" },
      },
      {
        name: "Eliza",
        content: {
          text: "🐦 **Drafting thread**\n\n**Topic:** why most traders fail...",
          actions: ["DRAFT_TWEETS"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "suggest batch of tweets about lifestyle optimization" },
      },
      {
        name: "Eliza",
        content: {
          text: "🐦 **Drafting tweet batch**\n\n**Topic:** lifestyle optimization...",
          actions: ["DRAFT_TWEETS"],
        },
      },
    ],
  ],
};

export default draftTweetsAction;
