/**
 * REPURPOSE Action
 *
 * Transform content between formats:
 * - Essay → Thread (break down long-form into tweet thread)
 * - Thread → Essay (expand thread into full article)
 * - Essay → LinkedIn (professional summary)
 * - Any → Key Points (extract main takeaways)
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
import { DRAFTS_DIR } from "../config/paths";

type RepurposeFormat = "thread" | "essay" | "linkedin" | "keypoints" | "hooks";

interface RepurposeRequest {
  sourceContent: string;
  targetFormat: RepurposeFormat;
  sourcePath?: string;
}

const FORMAT_PROMPTS: Record<RepurposeFormat, string> = {
  thread: `Convert this content into a Twitter thread (8-12 tweets).

Rules:
- First tweet is the hook (most important - must stop the scroll)
- Each tweet numbered: 1/, 2/, 3/...
- Each tweet < 280 chars and can stand alone
- Build narrative momentum
- Last tweet: key takeaway + subtle CTA
- No hashtag spam, no engagement bait

Write the thread:`,

  essay: `Expand this into a full Substack essay (1500-2500 words).

Structure:
- Compelling title and subtitle
- Hook that challenges thinking
- Deep exploration with examples
- Nuanced analysis
- Actionable insights
- Strong close

Write with personality - confident, direct, no AI slop. Write the essay:`,

  linkedin: `Convert this into a LinkedIn post (150-300 words).

Rules:
- Professional but not boring
- Hook in first line (before "see more")
- Use line breaks for readability
- End with insight or question
- No hashtag spam (max 3)
- Substance over engagement bait

Write the LinkedIn post:`,

  keypoints: `Extract the key points from this content.

Format:
- 5-7 bullet points maximum
- Each point is a complete insight
- Actionable where possible
- Skip the fluff, keep the substance

Write the key points:`,

  hooks: `Generate 5 alternative hooks/openings for this content.

Each hook should:
- Stop the scroll
- Create curiosity or tension
- Be under 280 characters
- Take a different angle

Number them 1-5. Write the hooks:`,
};

function detectTargetFormat(text: string): RepurposeFormat {
  const lower = text.toLowerCase();
  if (lower.includes("thread") || lower.includes("tweets") || lower.includes("twitter")) {
    return "thread";
  }
  if (lower.includes("essay") || lower.includes("article") || lower.includes("substack") || lower.includes("expand")) {
    return "essay";
  }
  if (lower.includes("linkedin")) {
    return "linkedin";
  }
  if (lower.includes("key points") || lower.includes("keypoints") || lower.includes("takeaways") || lower.includes("summary")) {
    return "keypoints";
  }
  if (lower.includes("hook") || lower.includes("opening") || lower.includes("alternative")) {
    return "hooks";
  }
  return "thread"; // default
}

function findRecentDraft(type?: string): string | null {
  const searchDirs = type === "tweet" 
    ? [path.join(DRAFTS_DIR, "tweets")]
    : [DRAFTS_DIR, path.join(DRAFTS_DIR, "tweets")];
  
  let newestFile: { path: string; mtime: number } | null = null;
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        return { path: fullPath, mtime: stat.mtime.getTime() };
      });
    
    for (const file of files) {
      if (!newestFile || file.mtime > newestFile.mtime) {
        newestFile = file;
      }
    }
  }
  
  return newestFile?.path || null;
}

function extractContentFromDraft(filepath: string): string {
  const content = fs.readFileSync(filepath, "utf-8");
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/m, "");
  return withoutFrontmatter.trim();
}

function saveDraft(content: string, format: RepurposeFormat, originalTopic: string): string {
  const subdir = format === "thread" ? path.join(DRAFTS_DIR, "tweets") : DRAFTS_DIR;
  if (!fs.existsSync(subdir)) {
    fs.mkdirSync(subdir, { recursive: true });
  }
  
  const slug = originalTopic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const timestamp = Date.now();
  const filename = `repurposed-${format}-${slug}-${timestamp}.md`;
  const filepath = path.join(subdir, filename);
  
  const frontmatter = `---
type: repurposed
format: ${format}
source: ${originalTopic}
created: ${new Date().toISOString()}
status: draft
---

`;
  
  fs.writeFileSync(filepath, frontmatter + content, "utf-8");
  return filepath;
}

export const repurposeAction: Action = {
  name: "REPURPOSE",
  similes: [
    "REPURPOSE_CONTENT",
    "TURN_INTO",
    "CONVERT_TO",
    "TRANSFORM",
  ],
  description: `Repurpose content between formats.

TRIGGERS:
- "turn that essay into a thread"
- "expand this thread into an essay"
- "repurpose for LinkedIn"
- "extract key points"
- "give me 5 hooks for this"
- "convert to thread"

FORMATS:
- thread: Essay → Twitter thread
- essay: Thread/notes → Full essay
- linkedin: Any → LinkedIn post
- keypoints: Any → Bullet point summary
- hooks: Any → 5 alternative openings`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      text.includes("repurpose") ||
      text.includes("turn into") ||
      text.includes("convert to") ||
      text.includes("turn that") ||
      text.includes("turn this") ||
      (text.includes("into a") && (text.includes("thread") || text.includes("essay") || text.includes("linkedin"))) ||
      (text.includes("expand") && text.includes("essay")) ||
      text.includes("key points") ||
      text.includes("give me") && text.includes("hooks")
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
      const targetFormat = detectTargetFormat(text);
      
      // Find source content
      let sourceContent: string | null = null;
      let sourcePath: string | null = null;
      
      // Check if there's content in the message itself (pasted)
      const contentMatch = text.match(/```([\s\S]*?)```/);
      if (contentMatch) {
        sourceContent = contentMatch[1].trim();
      }
      
      // Otherwise, look for recent draft
      if (!sourceContent) {
        // Check for specific file reference
        const fileMatch = text.match(/draft[s]?\/[\w\-\/]+\.md/i);
        if (fileMatch) {
          sourcePath = fileMatch[0].startsWith("knowledge/") ? fileMatch[0] : `knowledge/${fileMatch[0]}`;
        } else {
          // Find most recent draft
          sourcePath = findRecentDraft(text.includes("thread") || text.includes("tweet") ? "tweet" : undefined);
        }
        
        if (sourcePath && fs.existsSync(sourcePath)) {
          sourceContent = extractContentFromDraft(sourcePath);
        }
      }
      
      if (!sourceContent || sourceContent.length < 50) {
        if (callback) {
          await callback({
            text: `⚠️ **No content to repurpose**

I need source content. Either:
1. Paste the content in your message with \`\`\`content\`\`\`
2. First create content with WRITE_ESSAY or DRAFT_TWEETS
3. Reference a specific draft: "repurpose knowledge/drafts/my-draft.md into a thread"

Recent draft: ${sourcePath ? `\`${sourcePath}\`` : "none found"}`,
            actions: ["REPURPOSE"],
          });
        }
        return;
      }

      logger.info({ targetFormat, sourceLength: sourceContent.length }, "[REPURPOSE] Transforming content...");

      if (callback) {
        await callback({
          text: `🔄 **Repurposing content**\n\n**To:** ${targetFormat}\n**From:** ${sourcePath || "pasted content"}\n**Source length:** ${sourceContent.length} chars\n\n_Transforming..._`,
          actions: ["REPURPOSE"],
        });
      }

      const prompt = `${FORMAT_PROMPTS[targetFormat]}

SOURCE CONTENT:
${sourceContent}`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
        system: `You are a content strategist for Ikigai Studio. Transform content between formats while maintaining the core message and voice. Be sharp, confident, no AI slop.`,
      });

      const result = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";

      if (!result || result.length < 50) {
        if (callback) {
          await callback({
            text: `❌ Repurpose failed. Try again or provide different content.`,
            actions: ["REPURPOSE"],
          });
        }
        return;
      }

      // Save the repurposed content
      const topic = sourcePath ? path.basename(sourcePath, ".md") : "content";
      const savedPath = saveDraft(result.trim(), targetFormat, topic);

      // Format output based on type
      let displayContent = result.trim();
      if (targetFormat === "thread") {
        displayContent = displayContent.replace(/(\d+\/)/g, "\n---\n\n$1");
      }

      if (callback) {
        await callback({
          text: `✅ **Repurposed to ${targetFormat}**

**Saved:** \`${savedPath}\`

---

${displayContent}

---

**Next:**
• Edit in \`${savedPath}\`
• Repurpose again: "turn this into [format]"
• Different hooks: "give me 5 hooks for this"`,
          actions: ["REPURPOSE"],
        });
      }
    } catch (error) {
      logger.error({ error }, "[REPURPOSE] Error");
      if (callback) {
        await callback({
          text: `❌ Error repurposing: ${String(error)}`,
          actions: ["REPURPOSE"],
        });
      }
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "turn that essay into a thread" } },
      {
        name: "Eliza",
        content: {
          text: "🔄 **Repurposing content**\n\n**To:** thread...",
          actions: ["REPURPOSE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "expand this into an essay" } },
      {
        name: "Eliza",
        content: {
          text: "🔄 **Repurposing content**\n\n**To:** essay...",
          actions: ["REPURPOSE"],
        },
      },
    ],
  ],
};

export default repurposeAction;
