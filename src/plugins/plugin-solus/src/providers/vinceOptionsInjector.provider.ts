/**
 * VINCE_OPTIONS_INJECTOR — Injects Vince's current options view into Solus state.
 * Used when Solus composes state for strike ritual / optimal strike so the user doesn't copy/paste.
 * PRD: One Dream — Agent Synergy (§5.1). Dynamic provider; include explicitly for strike-related actions.
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

const CACHE_KEY = "solus:vince_options_view";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
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

async function fetchVinceOptionsView(
  runtime: IAgentRuntime,
  roomId: string,
  entityId: string,
): Promise<string> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgentByName || !eliza.handleMessage) return "";

  const vince = eliza.getAgentByName("Vince");
  if (!vince?.agentId) return "";

  const content =
    "[To Vince — you are being asked. Answer directly as yourself.][From Solus, on behalf of the user]: What's your current options view for Hypersurface (BTC, ETH, SOL, HYPE)? Reply with a short summary: IV/DVOL, best covered calls or secured puts, and any regime note. Keep it under 150 words.";
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "solus_vince_options" },
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
      .handleMessage(vince.agentId, userMsg, {
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

export const vinceOptionsInjectorProvider: Provider = {
  name: "VINCE_OPTIONS_INJECTOR",
  description:
    "Vince's current Hypersurface options view (IV, DVOL, best strikes). Injected when Solus needs options context for strike ritual or optimal strike. Cached 15 min.",
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
        text: `[Vince options view]\n${cacheEntry.text}`,
        values: { vinceOptionsView: cacheEntry.text },
      };
    }

    try {
      const roomId = message.roomId;
      const entityId = message.entityId ?? runtime.agentId;
      const view = await fetchVinceOptionsView(runtime, roomId, entityId);
      if (!view) {
        return {};
      }
      await runtime.setCache(CACHE_KEY, { text: view, ts: Date.now() });
      return {
        text: `[Vince options view]\n${view}`,
        values: { vinceOptionsView: view },
      };
    } catch (error) {
      logger.debug(
        "[Solus] Vince options injector failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {};
    }
  },
};
