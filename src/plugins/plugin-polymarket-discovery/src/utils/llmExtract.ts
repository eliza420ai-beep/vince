/**
 * LLM + regex parameter extraction for Polymarket actions
 *
 * When ACTION_STATE does not provide actionParams (or they are incomplete),
 * we try to extract query, category, conditionId, tokenId, walletAddress from
 * the user message via a small LLM call and optional regex fallback.
 */

import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";

export interface PolymarketExtractedParams {
  query?: string;
  category?: string;
  conditionId?: string;
  condition_id?: string;
  tokenId?: string;
  walletAddress?: string;
  limit?: number;
}

const CONDITION_ID_REGEX = /0x[a-fA-F0-9]{40,64}\b/g;
const ETH_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}\b/g;
const SEARCH_PATTERNS = [
  /search\s+(?:for\s+)?["']?([^"'\n]+)["']?/i,
  /find\s+(?:markets?\s+)?(?:for\s+)?["']?([^"'\n]+)["']?/i,
  /(?:show|get|look\s+for)\s+(?:me\s+)?(?:markets?\s+)?(?:about|for)\s+["']?([^"'\n]+)["']?/i,
  /(?:markets?|predictions?)\s+(?:about|for)\s+["']?([^"'\n]+)["']?/i,
  /(?:category|browse)\s+["']?([^"'\n]+)["']?/i,
];

/**
 * Regex fallback: extract condition ID, wallet address, and rough query/category from message text.
 */
function regexExtract(text: string): Partial<PolymarketExtractedParams> {
  const out: Partial<PolymarketExtractedParams> = {};
  const t = text?.trim() || "";
  const conditionIds = t.match(CONDITION_ID_REGEX);
  if (conditionIds && conditionIds[0].length >= 42 && conditionIds[0].length <= 66) {
    out.conditionId = conditionIds[0];
    out.condition_id = conditionIds[0];
  }
  const wallets = t.match(ETH_ADDRESS_REGEX);
  if (wallets && wallets[0].length === 42) {
    out.walletAddress = wallets[0];
  }
  for (const re of SEARCH_PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      const val = m[1].trim();
      if (val.length > 0 && val.length < 200) {
        if (/^(crypto|politics|sports|science|other)$/i.test(val)) {
          out.category = val;
        } else {
          out.query = val;
        }
        break;
      }
    }
  }
  return out;
}

/**
 * Extract Polymarket action parameters from message and state.
 * 1) Prefer actionParams from composeState(..., ["ACTION_STATE"], true).
 * 2) If missing or incomplete, optionally call LLM to extract JSON.
 * 3) Merge with regex fallback from message.content.text.
 */
export async function extractPolymarketParams(
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: {
    /** Keys that must be present to skip LLM (e.g. ["conditionId"] for detail action) */
    requiredKeys?: (keyof PolymarketExtractedParams)[];
    /** Whether to call LLM when params are incomplete (default true) */
    useLlm?: boolean;
  }
): Promise<PolymarketExtractedParams> {
  const useLlm = options?.useLlm !== false;
  const requiredKeys = options?.requiredKeys ?? [];

  let params: PolymarketExtractedParams = {};
  try {
    const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
    const fromState = (composedState?.data?.actionParams ?? {}) as Record<string, unknown>;
    if (fromState && typeof fromState === "object") {
      if (fromState.query != null) params.query = String(fromState.query).trim();
      if (fromState.category != null) params.category = String(fromState.category).trim();
      if (fromState.conditionId != null) params.conditionId = String(fromState.conditionId).trim();
      if (fromState.condition_id != null) params.condition_id = String(fromState.condition_id).trim();
      if (fromState.tokenId != null) params.tokenId = String(fromState.tokenId).trim();
      if (fromState.walletAddress != null) params.walletAddress = String(fromState.walletAddress).trim();
      if (fromState.limit != null) {
        const n = typeof fromState.limit === "string" ? parseInt(fromState.limit, 10) : Number(fromState.limit);
        if (!isNaN(n)) params.limit = n;
      }
    }
  } catch (e) {
    logger.debug("[extractPolymarketParams] composeState failed: " + (e instanceof Error ? e.message : String(e)));
  }

  const hasRequired = requiredKeys.length === 0 || requiredKeys.every((k) => {
    const v = params[k];
    return v != null && String(v).trim() !== "";
  });
  if (hasRequired && (params.conditionId ?? params.condition_id ?? params.query ?? params.category ?? params.walletAddress)) {
    const regex = regexExtract(message?.content?.text ?? "");
    return { ...regex, ...params };
  }

  const text = message?.content?.text ?? "";
  const regex = regexExtract(text);
  params = { ...regex, ...params };

  if (useLlm && text.length > 0) {
    try {
      const prompt = `You are extracting structured parameters for a Polymarket prediction market bot.
User message: "${text.slice(0, 500)}"
Return a single JSON object with only these keys (use null for missing): query, category, conditionId, tokenId, walletAddress, limit.
- query: search keywords (e.g. "bitcoin", "election")
- category: market category (e.g. "crypto", "politics")
- conditionId: market condition ID (hex 0x...)
- tokenId: token ID if user referred to a token
- walletAddress: Ethereum address (0x...) if user asked about their portfolio/positions
- limit: number for "top N" or "first N" (default 10)
Reply with only the JSON object, no markdown or explanation.`;
      const raw = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const jsonStr = (raw && typeof raw === "string" ? raw : String(raw)).replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1");
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      if (parsed.query != null && parsed.query !== null) params.query = String(parsed.query).trim();
      if (parsed.category != null && parsed.category !== null) params.category = String(parsed.category).trim();
      if (parsed.conditionId != null && parsed.conditionId !== null) {
        params.conditionId = String(parsed.conditionId).trim();
        params.condition_id = params.conditionId;
      }
      if (parsed.tokenId != null && parsed.tokenId !== null) params.tokenId = String(parsed.tokenId).trim();
      if (parsed.walletAddress != null && parsed.walletAddress !== null) params.walletAddress = String(parsed.walletAddress).trim();
      if (parsed.limit != null && parsed.limit !== null) {
        const n = typeof parsed.limit === "number" ? parsed.limit : parseInt(String(parsed.limit), 10);
        if (!isNaN(n)) params.limit = n;
      }
    } catch (e) {
      logger.debug("[extractPolymarketParams] LLM extract failed: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return params;
}
