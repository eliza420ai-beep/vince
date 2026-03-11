/**
 * TRADING_PERFORMANCE — Injects Vince paper bot P&L and Solus premium income into Eliza state.
 * Used by WRITE_ESSAY and DRAFT_TWEETS so content can include real numbers. PRD: One Dream (§5.1, §5.5).
 * Dynamic provider; include when composing for essay or tweet actions.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const CACHE_KEY = "eliza:trading_performance";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hr
const TIMEOUT_MS = 25_000;

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

function readVerifiedClaimsForContent(): string {
  try {
    const claimsPath = path.join(
      process.cwd(),
      ".elizadb",
      "vince-paper-bot",
      "verified-claims.json",
    );
    if (!fs.existsSync(claimsPath)) return "";
    const minConfidence = Number(
      process.env.ELIZA_VERIFIED_CLAIMS_MIN_CONFIDENCE ?? "0.6",
    );
    const parsed = JSON.parse(fs.readFileSync(claimsPath, "utf-8")) as {
      claims?: Array<{
        label?: string;
        confidence?: number;
        effectLowerBound?: number;
      }>;
    };
    const claims = (parsed.claims ?? []).filter(
      (c) => typeof c.confidence === "number" && c.confidence >= minConfidence,
    );
    if (claims.length === 0) return "";
    const lines = claims.slice(0, 4).map((c) => {
      const conf = Math.round((c.confidence ?? 0) * 100);
      const lb =
        typeof c.effectLowerBound === "number"
          ? `${(c.effectLowerBound * 100).toFixed(1)}%`
          : "n/a";
      return `- ${c.label ?? "proof_claim"} (confidence ${conf}%, lower-bound uplift ${lb})`;
    });
    return `Verified proof claims (confidence-gated):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

async function askAgent(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  agentName: string,
  question: string,
  roomId: string,
  entityId: string,
): Promise<string> {
  const content = `[To ${agentName} — you are being asked. Answer directly as yourself.][From Eliza, on behalf of the system]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "eliza_trading_performance" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(reply);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      });
  });
}

export const tradingPerformanceProvider: Provider = {
  name: "TRADING_PERFORMANCE",
  description:
    "Vince paper bot P&L and Solus weekly premium income for content (essays, tweets). Use real numbers when available. Cached 1 hr.",
  dynamic: true,
  position: -5,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const cacheEntry = await runtime.getCache<{ text: string; ts: number }>(
      CACHE_KEY,
    );
    if (
      cacheEntry &&
      cacheEntry.text &&
      Date.now() - cacheEntry.ts < CACHE_TTL_MS
    ) {
      return {
        text: `[Trading performance — use these numbers in content if relevant]\n${cacheEntry.text}`,
        values: { tradingPerformanceSummary: cacheEntry.text },
      };
    }

    const eliza = getElizaOS(runtime);
    if (!eliza?.getAgents || !eliza.getAgentByName || !eliza.handleMessage) {
      return {};
    }

    const agents = eliza.getAgents();
    const byName = new Map(
      agents.map((a) => [
        (a.character?.name ?? "").trim().toLowerCase(),
        a.agentId,
      ]),
    );
    const roomId = message.roomId;
    const entityId = message.entityId ?? runtime.agentId;

    const [vinceId, solusId] = [byName.get("vince"), byName.get("solus")];

    const parts: string[] = [];

    if (vinceId) {
      try {
        const reply = await askAgent(
          eliza,
          vinceId,
          "Vince",
          "In 2–3 sentences: What's the paper bot's realized P&L and win rate this week? (dollar P&L, win count, loss count, win %.)",
          roomId,
          entityId,
        );
        if (reply) parts.push(`Vince (paper bot): ${reply}`);
      } catch (e) {
        logger.debug(
          "[Eliza] Trading performance Vince fetch failed: " +
            (e instanceof Error ? e.message : String(e)),
        );
      }
    }

    if (solusId) {
      try {
        const reply = await askAgent(
          eliza,
          solusId,
          "Solus",
          "In 1–2 sentences: What's the weekly premium income collected this week and YTD pace toward $100K if available?",
          roomId,
          entityId,
        );
        if (reply) parts.push(`Solus (premium): ${reply}`);
      } catch (e) {
        logger.debug(
          "[Eliza] Trading performance Solus fetch failed: " +
            (e instanceof Error ? e.message : String(e)),
        );
      }
    }

    const text = parts.length > 0 ? parts.join("\n") : "";
    const verifiedClaims = readVerifiedClaimsForContent();
    const mergedText = [text, verifiedClaims].filter(Boolean).join("\n\n");
    if (mergedText)
      await runtime.setCache(CACHE_KEY, { text: mergedText, ts: Date.now() });

    if (!mergedText) return {};

    return {
      text: `[Trading performance — use these numbers in content if relevant]\n${mergedText}`,
      values: { tradingPerformanceSummary: mergedText },
    };
  },
};
