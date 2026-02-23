/**
 * ORACLE_REGIME — Injects Oracle's Polymarket-derived regime (risk-on / risk-off / uncertain) into Vince state.
 * Used by signal aggregator / sentiment gate for position sizing. PRD: One Dream (§5.1, §5.3).
 * Dynamic provider; include when evaluating trades.
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

const CACHE_KEY = "vince:oracle_regime";
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

function normalizeRegime(reply: string): "risk-on" | "risk-off" | "uncertain" {
  const lower = reply.toLowerCase();
  if (
    lower.includes("risk-off") ||
    lower.includes("risk off") ||
    lower.includes("cautious")
  )
    return "risk-off";
  if (
    lower.includes("risk-on") ||
    lower.includes("risk on") ||
    lower.includes("bullish")
  )
    return "risk-on";
  return "uncertain";
}

async function fetchOracleRegime(
  runtime: IAgentRuntime,
  roomId: string,
  entityId: string,
): Promise<string> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgentByName || !eliza.handleMessage) return "uncertain";

  const oracle = eliza.getAgentByName("Oracle");
  if (!oracle?.agentId) return "uncertain";

  const content =
    "[To Oracle — you are being asked. Answer directly as yourself.][From Vince, on behalf of the system]: From Polymarket and prediction markets right now, is the regime risk-on, risk-off, or uncertain? Reply with only one of those three words (or a short phrase containing one).";
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "vince_oracle_regime" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("uncertain");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(normalizeRegime(reply));
      }
    };

    eliza
      .handleMessage(oracle.agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("uncertain");
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("uncertain");
        }
      });
  });
}

export const oracleRegimeProvider: Provider = {
  name: "ORACLE_REGIME",
  description:
    "Oracle's Polymarket-derived regime: risk-on, risk-off, or uncertain. For Vince risk sizing. Cached 15 min.",
  dynamic: true,
  position: -6,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const cacheEntry = await runtime.getCache<{ regime: string; ts: number }>(
      CACHE_KEY,
    );
    if (cacheEntry && Date.now() - cacheEntry.ts < CACHE_TTL_MS) {
      return {
        text: `[Oracle regime] ${cacheEntry.regime}`,
        values: { oracleRegime: cacheEntry.regime },
      };
    }

    try {
      const roomId = message.roomId;
      const entityId = message.entityId ?? runtime.agentId;
      const regime = await fetchOracleRegime(runtime, roomId, entityId);
      await runtime.setCache(CACHE_KEY, { regime, ts: Date.now() });
      return {
        text: `[Oracle regime] ${regime}`,
        values: { oracleRegime: regime },
      };
    } catch (error) {
      logger.debug(
        "[Vince] Oracle regime provider failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {
        values: { oracleRegime: "uncertain" },
      };
    }
  },
};
