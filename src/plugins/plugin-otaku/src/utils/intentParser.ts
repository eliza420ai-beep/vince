/**
 * LLM-powered intent parsing for Otaku actions.
 * When regex parsing fails, use the runtime model to extract structured intent from natural language.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";

/** Swap intent from free-form text */
export interface SwapIntent {
  amount: string;
  sellToken: string;
  buyToken: string;
  chain?: string;
}

/** Bridge intent from free-form text */
export interface BridgeIntent {
  amount: string;
  token: string;
  fromChain: string;
  toChain: string;
}

function parseJsonFromResponse(
  response: string,
): Record<string, unknown> | null {
  const trimmed = response.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}") + 1;
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Use the runtime LLM to parse swap intent from natural language.
 * Returns null if model unavailable or parsing fails.
 */
export async function parseSwapIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<SwapIntent | null> {
  if (!runtime.useModel || text.length < 10) return null;
  try {
    const prompt = `Extract token swap intent from this message. Reply with ONLY a JSON object, no other text.
Use keys: amount (string, e.g. "1" or "100"), sellToken (uppercase symbol), buyToken (uppercase symbol), chain (optional: base, ethereum, arbitrum, polygon, solana).

Message: "${text}"

Example output: {"amount":"0.5","sellToken":"ETH","buyToken":"USDC","chain":"base"}`;

    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 150,
      temperature: 0.1,
    });
    const out =
      typeof response === "string" ? response : String(response ?? "");
    const obj = parseJsonFromResponse(out);
    if (
      !obj ||
      typeof obj.amount !== "string" ||
      typeof obj.sellToken !== "string" ||
      typeof obj.buyToken !== "string"
    )
      return null;
    return {
      amount: String(obj.amount),
      sellToken: String(obj.sellToken).toUpperCase(),
      buyToken: String(obj.buyToken).toUpperCase(),
      chain: obj.chain ? String(obj.chain).toLowerCase() : undefined,
    };
  } catch (err) {
    logger.debug(`[Otaku] LLM swap intent parse failed: ${err}`);
    return null;
  }
}

/**
 * Use the runtime LLM to parse bridge intent from natural language.
 */
export async function parseBridgeIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<BridgeIntent | null> {
  if (!runtime.useModel || text.length < 10) return null;
  try {
    const prompt = `Extract cross-chain bridge intent from this message. Reply with ONLY a JSON object.
Use keys: amount (string), token (uppercase symbol, e.g. ETH, USDC), fromChain (base, ethereum, arbitrum, polygon, etc.), toChain (same options).

Message: "${text}"

Example: {"amount":"0.1","token":"ETH","fromChain":"base","toChain":"arbitrum"}`;

    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 150,
      temperature: 0.1,
    });
    const out =
      typeof response === "string" ? response : String(response ?? "");
    const obj = parseJsonFromResponse(out);
    if (
      !obj ||
      typeof obj.amount !== "string" ||
      typeof obj.token !== "string" ||
      typeof obj.fromChain !== "string" ||
      typeof obj.toChain !== "string"
    )
      return null;
    return {
      amount: String(obj.amount),
      token: String(obj.token).toUpperCase(),
      fromChain: String(obj.fromChain).toLowerCase(),
      toChain: String(obj.toChain).toLowerCase(),
    };
  } catch (err) {
    logger.debug(`[Otaku] LLM bridge intent parse failed: ${err}`);
    return null;
  }
}

/** Morpho supply/withdraw intent */
export interface MorphoIntent {
  intent: "supply" | "withdraw";
  asset: string;
  amount: string;
  vault?: string;
  chain?: string;
}

export async function parseMorphoIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<MorphoIntent | null> {
  if (!runtime.useModel || text.length < 8) return null;
  try {
    const prompt = `Extract Morpho vault intent. Reply with ONLY a JSON object.
Keys: intent ("supply" or "withdraw"), asset (uppercase, e.g. USDC, ETH), amount (string), vault (optional), chain (optional: base, ethereum).

Message: "${text}"`;
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 120,
      temperature: 0.1,
    });
    const obj = parseJsonFromResponse(
      typeof response === "string" ? response : String(response ?? ""),
    );
    if (
      !obj ||
      (obj.intent !== "supply" && obj.intent !== "withdraw") ||
      typeof obj.asset !== "string" ||
      typeof obj.amount !== "string"
    )
      return null;
    return {
      intent: obj.intent as "supply" | "withdraw",
      asset: String(obj.asset).toUpperCase(),
      amount: String(obj.amount),
      vault: obj.vault ? String(obj.vault) : undefined,
      chain: obj.chain ? String(obj.chain).toLowerCase() : undefined,
    };
  } catch (err) {
    logger.debug(`[Otaku] LLM morpho intent parse failed: ${err}`);
    return null;
  }
}

/** Stop-loss / take-profit intent */
export interface StopLossIntent {
  token: string;
  amount: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  trailingPercent?: number;
  chain?: string;
}

export async function parseStopLossIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<StopLossIntent | null> {
  if (!runtime.useModel || text.length < 8) return null;
  try {
    const prompt = `Extract stop-loss or take-profit intent. Reply with ONLY a JSON object.
Keys: token (uppercase), amount (string), stopLossPrice (optional string), takeProfitPrice (optional string), trailingPercent (optional number), chain (optional).

Message: "${text}"`;
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 120,
      temperature: 0.1,
    });
    const obj = parseJsonFromResponse(
      typeof response === "string" ? response : String(response ?? ""),
    );
    if (!obj || typeof obj.token !== "string" || typeof obj.amount !== "string")
      return null;
    const out: StopLossIntent = {
      token: String(obj.token).toUpperCase(),
      amount: String(obj.amount),
    };
    if (obj.stopLossPrice != null)
      out.stopLossPrice = String(obj.stopLossPrice);
    if (obj.takeProfitPrice != null)
      out.takeProfitPrice = String(obj.takeProfitPrice);
    if (typeof obj.trailingPercent === "number")
      out.trailingPercent = obj.trailingPercent;
    if (obj.chain) out.chain = String(obj.chain).toLowerCase();
    if (out.stopLossPrice || out.takeProfitPrice || out.trailingPercent)
      return out;
    return null;
  } catch (err) {
    logger.debug(`[Otaku] LLM stop-loss intent parse failed: ${err}`);
    return null;
  }
}

/** Token approval intent */
export interface ApproveIntent {
  intent: "approve" | "revoke" | "check";
  token: string;
  spender?: string;
  amount?: string;
  chain?: string;
}

export async function parseApproveIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<ApproveIntent | null> {
  if (!runtime.useModel || text.length < 6) return null;
  try {
    const prompt = `Extract token approval intent. Reply with ONLY a JSON object.
Keys: intent ("approve", "revoke", or "check"), token (uppercase), spender (optional protocol name or 0x address), amount (optional, use "unlimited" for max), chain (optional).

Message: "${text}"`;
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 120,
      temperature: 0.1,
    });
    const obj = parseJsonFromResponse(
      typeof response === "string" ? response : String(response ?? ""),
    );
    if (
      !obj ||
      (obj.intent !== "approve" &&
        obj.intent !== "revoke" &&
        obj.intent !== "check") ||
      typeof obj.token !== "string"
    )
      return null;
    return {
      intent: obj.intent as "approve" | "revoke" | "check",
      token: String(obj.token).toUpperCase(),
      spender: obj.spender ? String(obj.spender) : undefined,
      amount: obj.amount ? String(obj.amount) : undefined,
      chain: obj.chain ? String(obj.chain).toLowerCase() : undefined,
    };
  } catch (err) {
    logger.debug(`[Otaku] LLM approve intent parse failed: ${err}`);
    return null;
  }
}

/** NFT mint intent */
export interface NftMintIntent {
  collection?: string;
  quantity: number;
  chain?: string;
  isGenArt?: boolean;
  artPrompt?: string;
}

export async function parseNftMintIntentWithLLM(
  runtime: IAgentRuntime,
  text: string,
): Promise<NftMintIntent | null> {
  if (!runtime.useModel || text.length < 6) return null;
  try {
    const prompt = `Extract NFT mint intent. Reply with ONLY a JSON object.
Keys: collection (optional name e.g. zorb), quantity (number, default 1), chain (optional), isGenArt (boolean), artPrompt (optional string if gen art).

Message: "${text}"`;
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      maxTokens: 120,
      temperature: 0.1,
    });
    const obj = parseJsonFromResponse(
      typeof response === "string" ? response : String(response ?? ""),
    );
    if (!obj) return null;
    const quantity =
      typeof obj.quantity === "number"
        ? obj.quantity
        : parseInt(String(obj.quantity ?? "1"), 10);
    if (Number.isNaN(quantity) || quantity < 1) return null;
    return {
      collection: obj.collection ? String(obj.collection) : undefined,
      quantity,
      chain: obj.chain ? String(obj.chain).toLowerCase() : undefined,
      isGenArt: Boolean(obj.isGenArt),
      artPrompt: obj.artPrompt ? String(obj.artPrompt) : undefined,
    };
  } catch (err) {
    logger.debug(`[Otaku] LLM NFT mint intent parse failed: ${err}`);
    return null;
  }
}
