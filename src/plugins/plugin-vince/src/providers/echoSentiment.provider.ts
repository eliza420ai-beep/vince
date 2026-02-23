/**
 * ECHO_SENTIMENT — Injects Echo's CT sentiment score (1–10) and label into Vince state.
 * Used by signal aggregator / sentiment gate to adjust position sizing. PRD: One Dream (§5.1, §5.3).
 * Dynamic provider; include when evaluating trades or composing signal context.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const CACHE_KEY = "vince:echo_sentiment";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const TIMEOUT_MS = 20_000;

function extractReply(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const text =
    typeof c.text === "string"
      ? c.text
      : typeof c.message === "string"
        ? c.message
        : "";
  if (text.trim()) return text.trim();
  if (typeof c.thought === "string" && c.thought.trim())
    return c.thought.trim();
  return "";
}

/** Parse a number 1–10 and optional label from Echo's reply. */
function parseSentiment(reply: string): { score: number; label: string } {
  const numMatch = reply.match(/\b([1-9]|10)\s*(\/\s*10)?\b/);
  const score = numMatch
    ? Math.min(10, Math.max(1, parseInt(numMatch[1], 10)))
    : 5;
  const lower = reply.toLowerCase();
  let label = "neutral";
  if (lower.includes("bullish") || lower.includes("bull") || score >= 7)
    label = "bullish";
  else if (lower.includes("bearish") || lower.includes("bear") || score <= 4)
    label = "bearish";
  return { score, label };
}

async function fetchEchoSentiment(
  runtime: IAgentRuntime,
  roomId: string,
  entityId: string,
): Promise<{ score: number; label: string }> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgentByName || !eliza.handleMessage) {
    return { score: 5, label: "neutral" };
  }

  const echo = eliza.getAgentByName("Echo");
  if (!echo?.agentId) return { score: 5, label: "neutral" };

  const content =
    "[To Echo — you are being asked. Answer directly as yourself.][From Vince, on behalf of the system]: What's the current CT (crypto Twitter) sentiment for BTC/ETH/SOL? Reply with ONLY: a number 1–10 (1=bearish, 10=bullish) and one word: bullish, bearish, or mixed. Example: 7 bullish.";
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "vince_echo_sentiment" },
    createdAt: Date.now(),
  };

  return new Promise<{ score: number; label: string }>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ score: 5, label: "neutral" });
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(parseSentiment(reply));
      }
    };

    eliza
      .handleMessage(echo.agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve({ score: 5, label: "neutral" });
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve({ score: 5, label: "neutral" });
        }
      });
  });
}

export const echoSentimentProvider: Provider = {
  name: "ECHO_SENTIMENT",
  description:
    "Echo's CT sentiment score (1–10) and bullish/bearish/mixed. For Vince signal aggregator and risk sizing. Cached 15 min.",
  dynamic: true,
  position: -6,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const cacheEntry = await runtime.getCache<{
      score: number;
      label: string;
      ts: number;
    }>(CACHE_KEY);
    if (cacheEntry && Date.now() - cacheEntry.ts < CACHE_TTL_MS) {
      return {
        text: `[Echo CT sentiment] ${cacheEntry.score}/10 (${cacheEntry.label})`,
        values: {
          echoSentimentScore: cacheEntry.score,
          echoSentimentLabel: cacheEntry.label,
        },
      };
    }

    try {
      const roomId = message.roomId;
      const entityId = message.entityId ?? runtime.agentId;
      const { score, label } = await fetchEchoSentiment(
        runtime,
        roomId,
        entityId,
      );
      await runtime.setCache(CACHE_KEY, { score, label, ts: Date.now() });
      return {
        text: `[Echo CT sentiment] ${score}/10 (${label})`,
        values: {
          echoSentimentScore: score,
          echoSentimentLabel: label,
        },
      };
    } catch (error) {
      logger.debug(
        "[Vince] Echo sentiment provider failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {
        values: { echoSentimentScore: 5, echoSentimentLabel: "neutral" },
      };
    }
  },
};
