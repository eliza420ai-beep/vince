import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";
import fs from "fs";
import path from "path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
const MAX_FILES = 3;
const MAX_SNIPPET_LENGTH = 600;

const STOPWORDS = new Set([
  "the",
  "and",
  "that",
  "with",
  "this",
  "from",
  "have",
  "about",
  "there",
  "their",
  "would",
  "could",
  "should",
  "where",
  "which",
  "what",
  "when",
  "been",
  "into",
  "your",
  "just",
  "they",
  "we",
  "you",
  "also",
  "over",
  "will",
  "more",
  "than",
  "for",
  "are",
  "utc",
  "http",
  "https",
]);

interface KnowledgeHit {
  title: string;
  path: string;
  snippet: string;
  score: number;
}

function extractQuery(text: string): string {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith("chat")) {
    return trimmed.replace(/^chat[:\s-]*/i, "").trim();
  }
  if (trimmed.toLowerCase().startsWith("talk")) {
    return trimmed.replace(/^talk[:\s-]*/i, "").trim();
  }
  return trimmed;
}

function gatherKnowledgeFiles(): string[] {
  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return [];
  }

  const results: string[] = [];
  const stack = [KNOWLEDGE_ROOT];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".txt"))) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+/]+/i)
    .filter((token) => token.length > 3 && !STOPWORDS.has(token));
}

function scoreFile(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const lower = content.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      score += 1;
    }
  }
  return score;
}

function buildSnippet(content: string, keywords: string[]): string {
  if (content.length <= MAX_SNIPPET_LENGTH) {
    return content.trim();
  }

  const lower = content.toLowerCase();
  let bestIndex = 0;
  let bestScore = -1;

  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword);
    if (idx >= 0 && lower.lastIndexOf(keyword) === idx) {
      // prefer the first unique occurrence
      const score = 2;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    } else if (idx >= 0) {
      if (bestScore < 1) {
        bestScore = 1;
        bestIndex = idx;
      }
    }
  }

  const start = Math.max(0, bestIndex - MAX_SNIPPET_LENGTH / 2);
  const end = Math.min(content.length, start + MAX_SNIPPET_LENGTH);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < content.length) snippet = `${snippet}…`;
  return snippet;
}

function loadKnowledgeContext(query: string): KnowledgeHit[] {
  try {
    const keywords = tokenize(query);
    if (keywords.length === 0) return [];

    const files = gatherKnowledgeFiles();
    const hits: KnowledgeHit[] = [];

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const score = scoreFile(content, keywords);
        if (score === 0) continue;

        const relative = path.relative(KNOWLEDGE_ROOT, filePath);
        const title = path.basename(filePath, path.extname(filePath));
        const snippet = buildSnippet(content, keywords);
        hits.push({
          title,
          path: relative,
          snippet,
          score,
        });
      } catch (error) {
        logger.debug(`[VINCE_CHAT] Failed reading knowledge file ${filePath}: ${error}`);
      }
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, MAX_FILES);
  } catch (error) {
    logger.error(`[VINCE_CHAT] Failed loading knowledge context: ${error}`);
    return [];
  }
}

export const vinceChatAction: Action = {
  name: "VINCE_CHAT",
  similes: ["CHAT", "TALK", "DISCUSS", "VINCE_CHAT"],
  description: "Have a free-form chat with VINCE using the knowledge/ corpus as primary context",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? "";
    if (text.length === 0) return false;
    return (
      text.startsWith("chat") ||
      text.startsWith("talk") ||
      text.startsWith("vince chat") ||
      text.startsWith("vince talk") ||
      text.includes("chat with vince")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    callback: HandlerCallback
  ): Promise<void> => {
    const rawText = message.content?.text ?? "";
    const userQuery = extractQuery(rawText);

    if (!userQuery) {
      await callback({
        text: "Say something like `chat: what's our playbook for LP farming right now?`",
        actions: ["VINCE_CHAT"],
      });
      return;
    }

    const knowledgeHits = loadKnowledgeContext(userQuery);

    const knowledgeSection =
      knowledgeHits.length > 0
        ? knowledgeHits
            .map(
              (hit, idx) =>
                `### Knowledge ${idx + 1}: ${hit.title}\n` +
                `Source: ${hit.path}\n\n` +
                `${hit.snippet}`
            )
            .join("\n\n")
        : "No direct matches in knowledge/. Rely on experience and be honest about gaps.";

    const prompt = `You are VINCE, a data-obsessed trading teammate. The user wants an opinionated answer based primarily on our knowledge base.

User message:
"""
${userQuery}
"""

Relevant knowledge:
"""
${knowledgeSection}
"""

Guidelines:
- Reference the knowledge snippets explicitly (quote or summarize) when answering.
- If the knowledge base is silent, say so and fall back to experience or ask for more detail.
- Tie everything back to paper trading improvements or actionable insights when possible.
- Tone: concise, friendly, confident. No fluff, no generic boilerplate.

Respond:`;

    try {
      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      await callback({
        text: String(response).trim(),
        actions: ["VINCE_CHAT"],
      });
    } catch (error) {
      logger.error(`[VINCE_CHAT] Model error: ${error}`);
      await callback({
        text: "Having trouble thinking right now. Try again in a moment or be more specific.",
        actions: ["VINCE_CHAT"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "chat: remind me of the hyperliquid MM plan" } },
      {
        name: "VINCE",
        content: {
          text: "We keep a DLMM band on Meteora as automated DCA. The framework in `grinding-the-trenches/meteora-dlmm.md` says to let the market buy our tokens on pumps and sell them back on dumps. That's still the play until we have better flow data.",
          actions: ["VINCE_CHAT"],
        },
      },
    ],
  ],
};

export default vinceChatAction;
