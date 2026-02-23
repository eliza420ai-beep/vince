/**
 * VINCE_STRIKE_SUGGESTION — Injects Vince's strike suggestion from cache into Solus state.
 * PRD: One Dream Phase 4 (#17). When Vince (report or options flow) writes vince:strike_suggestion,
 * Solus strike ritual / optimal strike see "Vince suggests …" without copy/paste.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";

const CACHE_KEY = "vince:strike_suggestion";

export interface VinceStrikeSuggestion {
  underlying?: string;
  direction?: "call" | "put" | "covered_call" | "secured_put";
  expiryHint?: string;
  strikeHint?: string;
  note?: string;
  updatedAt?: number;
}

export const vinceStrikeSuggestionProvider: Provider = {
  name: "VINCE_STRIKE_SUGGESTION",
  description:
    "Vince's suggested strike/underlying from cache (no copy/paste). Include for strike ritual and optimal strike.",
  dynamic: true,
  position: -6,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    try {
      const raw = await runtime.getCache<VinceStrikeSuggestion>(CACHE_KEY);
      if (!raw || typeof raw !== "object") return {};

      const parts: string[] = ["[Vince strike suggestion]"];
      if (raw.underlying) parts.push(`Underlying: ${raw.underlying}`);
      if (raw.direction) parts.push(`Direction: ${raw.direction}`);
      if (raw.expiryHint) parts.push(`Expiry: ${raw.expiryHint}`);
      if (raw.strikeHint) parts.push(`Strike hint: ${raw.strikeHint}`);
      if (raw.note) parts.push(`Note: ${raw.note}`);

      if (parts.length <= 1) return {};

      const text = parts.join("\n");
      return {
        text: `\n${text}\n`,
        values: { vinceStrikeSuggestion: raw },
      };
    } catch {
      return {};
    }
  },
};
