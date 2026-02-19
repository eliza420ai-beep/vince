/**
 * Read-only Polymarket Discovery Provider
 *
 * Injects capability and optional recent-activity context when Polymarket is in context.
 * No wallet or account state; discovery-only.
 */

import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import type { Provider, ProviderResult } from "@elizaos/core";
import { PolymarketService } from "../services/polymarket.service";
import { shouldPolymarketPluginBeInContext } from "../../matcher";
import {
  DEFAULT_GAMMA_API_URL,
  DEFAULT_CLOB_API_URL,
  VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
  VINCE_POLYMARKET_PREFERRED_LABELS,
} from "../constants";

function buildPreferredTopicsSummary(): string {
  const byGroup = {
    crypto: [] as string[],
    finance: [] as string[],
    other: [] as string[],
  };
  const seen = new Set<string>();
  for (const { label, group } of VINCE_POLYMARKET_PREFERRED_LABELS) {
    if (seen.has(label)) continue;
    seen.add(label);
    byGroup[group].push(label);
  }
  const parts = [
    `crypto — ${byGroup.crypto.join(", ")}`,
    `finance — ${byGroup.finance.join(", ")}`,
    `other — ${byGroup.other.join(", ")}`,
  ];
  return parts.join("; ");
}

export const polymarketDiscoveryProvider: Provider = {
  name: "POLYMARKET_DISCOVERY",
  description:
    "Provides Polymarket discovery capability and recent activity context when the user is discussing prediction markets.",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<ProviderResult> => {
    if (!shouldPolymarketPluginBeInContext(state, message)) {
      return { text: "", values: {} };
    }

    const service = runtime.getService(
      PolymarketService.serviceType,
    ) as PolymarketService | null;

    const gammaApiUrl =
      (runtime.getSetting("POLYMARKET_GAMMA_API_URL") as string) ||
      DEFAULT_GAMMA_API_URL;
    const clobApiUrl =
      (runtime.getSetting("POLYMARKET_CLOB_API_URL") as string) ||
      DEFAULT_CLOB_API_URL;

    let text =
      "Polymarket discovery available (read-only). Features: market search, browse by category, market detail, prices, orderbooks, events, portfolio (with wallet address). For current odds use GET_POLYMARKET_PRICE with condition_id; list and search may show Gamma-derived odds.";
    const values: Record<string, unknown> = {
      polymarketDiscovery: !!service,
      readOnly: true,
      gammaApiUrl,
      clobApiUrl,
    };

    const preferredTopicsSummary = buildPreferredTopicsSummary();
    text += ` Preferred topics for this project (prioritize when relevant): ${preferredTopicsSummary}.`;
    const intentSummary =
      "These odds are a signal of what the market thinks; they inform the paper bot (perps, Hyperliquid), Hypersurface strike selection (weekly predictions most important), and macro vibe check.";
    text += ` ${intentSummary}`;
    values.preferredTagSlugs = [...VINCE_POLYMARKET_PREFERRED_TAG_SLUGS];
    values.preferredTopicsSummary = preferredTopicsSummary;
    values.polymarketIntentSummary = intentSummary;

    if (service && message?.roomId) {
      const activityContext = service.getCachedActivityContext(message.roomId);
      if (activityContext) {
        text += ` ${activityContext}`;
        values.recentActivity = activityContext;
      }
    }

    return { text, values };
  },
};

export default polymarketDiscoveryProvider;
