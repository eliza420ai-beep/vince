/**
 * Clawterm Day Report Action
 *
 * Full day report for OpenClaw/AI/AGI sourced from X (plugin-x-research) and optional
 * web search (Tavily). Style matches Vince ALOHA: same rules as plugin-vince
 * aloha.action.ts generateHumanBriefing (friend-over-coffee, no bullets, take positions,
 * ~200–300 words). Clawterm NO AI SLOP list applied.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
  logger,
} from "@elizaos/core";
import { getXSearchService } from "../services/xSearch.service";
import { initXClientFromEnv } from "../services/xClient.service";
import type { XTweet } from "../types/tweet.types";
import { tavilySearch } from "../utils/tavilySearch";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { sendActionResponse } from "./helpers/actionResponse";

const X_SNIPPET_LEN = 120;
const MAX_TWEETS_PER_QUERY = 15;
const HOURS_BACK = 24;
const MAX_SELECTED_TWEETS = 18;

const TRIGGERS = [
  "what's hot",
  "whats hot",
  "what's hot today",
  "day report",
  "full day report",
  "openclaw news today",
  "openclaw vibe",
  "openclaw what's hot",
  "clawterm day report",
];

const OPENCLAW_RELEVANCE_TERMS = [
  "openclaw",
  "clawterm",
  "research agent",
  "research agents",
  "ai agent",
  "agents",
  "agi",
  "alignment",
  "gateway",
  "model",
];

interface XContextResult {
  text: string;
  candidates: number;
  selected: number;
  dropped: number;
  reason: "ok" | "no_token" | "no_recent_data" | "api_limited";
}

function getXBearerToken(runtime: IAgentRuntime): string | null {
  const fromRuntime = runtime.getSetting?.("X_BEARER_TOKEN");
  if (typeof fromRuntime === "string" && fromRuntime.trim())
    return fromRuntime.trim();
  const fromEnv = process.env.X_BEARER_TOKEN;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return null;
}

function formatTweetForContext(t: XTweet): string {
  const handle = t.author?.username ?? "unknown";
  const snippet =
    t.text.length > X_SNIPPET_LEN
      ? t.text.slice(0, X_SNIPPET_LEN) + "…"
      : t.text;
  const likes = t.metrics?.likeCount ?? 0;
  return `@${handle}: ${snippet} (${likes} likes)`;
}

function normalizeTweetText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function relevanceHits(text: string): number {
  const lowered = text.toLowerCase();
  if (
    lowered.includes("unrelated") ||
    lowered.includes("not about") ||
    lowered.includes("offtopic")
  ) {
    return 0;
  }
  return OPENCLAW_RELEVANCE_TERMS.filter((term) => lowered.includes(term))
    .length;
}

function recencyScore(createdAt?: string): number {
  if (!createdAt) return 0;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  const ageHours = ageMs / (1000 * 60 * 60);
  return Math.max(0, 24 - ageHours);
}

function rankContextTweets(tweets: XTweet[]): XTweet[] {
  const dedupe = new Map<string, XTweet>();
  for (const tweet of tweets) {
    const key = normalizeTweetText(tweet.text);
    if (!key) continue;
    if (!dedupe.has(key)) dedupe.set(key, tweet);
  }
  const unique = Array.from(dedupe.values());
  return unique
    .filter((tweet) => relevanceHits(tweet.text) > 0)
    .sort((a, b) => {
      const aScore =
        relevanceHits(a.text) * 50 +
        (a.metrics?.likeCount ?? 0) * 0.5 +
        recencyScore(a.createdAt);
      const bScore =
        relevanceHits(b.text) * 50 +
        (b.metrics?.likeCount ?? 0) * 0.5 +
        recencyScore(b.createdAt);
      return bScore - aScore;
    })
    .slice(0, MAX_SELECTED_TWEETS);
}

async function fetchXContext(runtime: IAgentRuntime): Promise<XContextResult> {
  const token = getXBearerToken(runtime);
  if (!token) {
    return {
      text: "No X data (set X_BEARER_TOKEN to include X).",
      candidates: 0,
      selected: 0,
      dropped: 0,
      reason: "no_token",
    };
  }

  try {
    initXClientFromEnv(runtime);
    const searchService = getXSearchService();

    const [openclawTweets, agiTweets] = await Promise.all([
      searchService.searchQuery({
        query: "OpenClaw",
        maxResults: MAX_TWEETS_PER_QUERY,
        hoursBack: HOURS_BACK,
        cacheTtlMs: 60 * 60 * 1000,
      }),
      searchService.searchQuery({
        query: "AGI AI research agents",
        maxResults: MAX_TWEETS_PER_QUERY,
        hoursBack: HOURS_BACK,
        cacheTtlMs: 60 * 60 * 1000,
      }),
    ]);

    const combined = [...openclawTweets, ...agiTweets];
    const byId = new Map(combined.map((t) => [t.id, t]));
    const candidates = Array.from(byId.values());
    const ranked = rankContextTweets(candidates);

    if (ranked.length === 0) {
      return {
        text: "No recent X posts found for OpenClaw/AGI in the last 24h.",
        candidates: candidates.length,
        selected: 0,
        dropped: candidates.length,
        reason: "no_recent_data",
      };
    }

    return {
      text: ranked.map(formatTweetForContext).join("\n"),
      candidates: candidates.length,
      selected: ranked.length,
      dropped: Math.max(0, candidates.length - ranked.length),
      reason: "ok",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, "[CLAWTERM_DAY_REPORT] X search failed");
    return {
      text: `X search failed: ${msg}. Proceed with web data only if available.`,
      candidates: 0,
      selected: 0,
      dropped: 0,
      reason: "api_limited",
    };
  }
}

async function fetchWebContext(runtime: IAgentRuntime): Promise<string> {
  const snippets = await tavilySearch(
    "OpenClaw AI AGI research agents news",
    runtime,
    3,
  );
  if (snippets.length === 0)
    return "No web snippets (set TAVILY_API_KEY for web-sourced report).";
  return snippets.join("\n\n");
}

async function generateReport(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are Clawterm, writing your daily OpenClaw/AI/AGI report for ${date}. You're texting this to a friend who cares about AI and research agents — be real, be specific, have opinions.

Here's the data (X and/or web):

${dataContext}

Write a single day report that:
1. Starts with the overall vibe — what's the mood today on OpenClaw, AGI, research agents? Give your gut take.
2. Weaves in what's actually being said (from the data above). Connect the dots. If something is going viral or everyone is talking about one thing, say so. If it's quiet, say it's quiet.
3. Ends with your actual take — what would you watch or do?

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write the report (no "Here is your report" wrapper — start with the report itself):`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[CLAWTERM_DAY_REPORT] LLM failed: ${error}`);
    return "Couldn't generate the report right now. Data was gathered but the narrative step failed. Try again in a moment.";
  }
}

export const clawtermDayReportAction: Action = {
  name: "CLAWTERM_DAY_REPORT",
  description:
    "Full day report on OpenClaw/AI/AGI from X and web. Use when asked 'what's hot today', 'day report', 'openclaw news today', 'full day report'.",
  similes: [
    "OPENCLAW_WHATS_HOT",
    "CLAWTERM_WHATS_HOT",
    "DAY_REPORT",
    "OPENCLAW_DAY_REPORT",
  ],
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What's hot today?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "OpenClaw chatter is up after the latest gateway release — a few builders are threading how they're running agents locally. AGI timeline debates same as ever; one viral take on superhuman coding by EOY. On X it's mostly steady. I'd keep an eye on the repo activity and the next steipete stream.",
          action: "CLAWTERM_DAY_REPORT",
        },
      },
    ],
  ],
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return TRIGGERS.some((t) => text.includes(t));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const hasX = !!getXBearerToken(runtime);
    const hasTavily = !!(
      runtime.getSetting?.("TAVILY_API_KEY") || process.env.TAVILY_API_KEY
    );

    if (!hasX && !hasTavily) {
      await sendActionResponse(callback, "CLAWTERM_DAY_REPORT", {
        text: "Set X_BEARER_TOKEN for an X-sourced report. Web-only report is possible if TAVILY_API_KEY is set.",
        reason: "no_data_sources",
      });
      return { success: true };
    }

    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const xContext = await fetchXContext(runtime);
    const webBlock = await fetchWebContext(runtime);

    const dataContext = `=== X (last 24h) ===\n${xContext.text}\n\n=== Web ===\n${webBlock}`;

    const report = await generateReport(runtime, dataContext, date);

    await sendActionResponse(callback, "CLAWTERM_DAY_REPORT", {
      text: report,
      sourceStats: {
        xCandidates: xContext.candidates,
        xSelected: xContext.selected,
        xDropped: xContext.dropped,
        xReason: xContext.reason,
        webSnippets: webBlock.startsWith("No web snippets") ? 0 : 1,
      },
    });
    return { success: true };
  },
};
