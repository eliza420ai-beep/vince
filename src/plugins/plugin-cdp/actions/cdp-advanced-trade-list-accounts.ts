/**
 * COINBASE_LIST_ACCOUNTS - List Coinbase Advanced Trade accounts (CEX).
 * For "normies" mode: show my Coinbase accounts/balances.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  getAdvancedTradeConfig,
  advancedTradeRequest,
  isAdvancedTradeConfigured,
} from "../utils/advancedTradeClient";

interface ListAccountsResponse {
  accounts?: Array<{
    uuid?: string;
    name?: string;
    currency?: string;
    available_balance?: { value?: string; currency?: string };
    type?: string;
    ready?: boolean;
  }>;
  has_next?: boolean;
  cursor?: string;
}

export const cdpAdvancedTradeListAccounts: Action = {
  name: "COINBASE_LIST_ACCOUNTS",
  similes: ["COINBASE_ACCOUNTS", "LIST_COINBASE_ACCOUNTS", "MY_COINBASE_ACCOUNTS"],
  description:
    "List your Coinbase (Advanced Trade) accounts and balances. Use when the user asks for their Coinbase accounts, CEX portfolio, or 'my Coinbase balance'. Requires COINBASE_ADVANCED_TRADE_KEY_NAME and COINBASE_ADVANCED_TRADE_KEY_SECRET.",

  validate: async (_runtime: IAgentRuntime) => isAdvancedTradeConfigured(),

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const config = getAdvancedTradeConfig();
    if (!config) {
      const text = "Coinbase Advanced Trade is not configured (set COINBASE_ADVANCED_TRADE_KEY_NAME and COINBASE_ADVANCED_TRADE_KEY_SECRET).";
      await callback?.({ text });
      return { success: false, text };
    }
    try {
      const path = "/api/v3/brokerage/accounts?limit=50";
      const data = await advancedTradeRequest<ListAccountsResponse>("GET", path, config);
      const accounts = data?.accounts ?? [];
      const lines = accounts.map(
        (a) =>
          `- **${a.name ?? a.currency ?? a.uuid}** (${a.currency ?? "?"}): ${a.available_balance?.value ?? "0"} ${a.available_balance?.currency ?? a.currency ?? ""}`
      );
      const text =
        lines.length > 0
          ? `**Coinbase accounts:**\n${lines.join("\n")}`
          : "No Coinbase accounts returned.";
      await callback?.({ text });
      return { success: true, text, data: { accounts } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[COINBASE_LIST_ACCOUNTS] ${msg}`);
      await callback?.({ text: `Could not list Coinbase accounts: ${msg}` });
      return { success: false, text: msg, error: msg };
    }
  },
  examples: [
    [
      { name: "user", content: { text: "What are my Coinbase accounts?" } },
      { name: "Otaku", content: { text: "Listing your Coinbase accounts…", actions: ["COINBASE_LIST_ACCOUNTS"] } },
    ],
  ],
};
