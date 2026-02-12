/**
 * GET /polymarket/priority-markets
 * Returns VINCE-priority Polymarket markets and "why we track" copy for the leaderboard tab.
 * Use Oracle agent ID: /api/agents/:oracleAgentId/plugins/polymarket-discovery/polymarket/priority-markets
 */

import type { IAgentRuntime } from "@elizaos/core";
import { PolymarketService } from "../services/polymarket.service";
import {
  VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
  POLYMARKET_TAG_SECTION_SLUGS,
  VINCE_POLYMARKET_PREFERRED_LABELS,
} from "../constants";
import type { PolymarketMarket } from "../types";

const WHY_WE_TRACK =
  "Priority markets are a palantir into what the market thinks. We use them for: (1) Paper bot — short-term perps on Hyperliquid. (2) Hypersurface strike selection — weekly predictions are the most important. (3) Macro vibe check.";

const INTENT_SUMMARY =
  "These odds are a signal of what the market thinks; they inform the paper bot (perps, Hyperliquid), Hypersurface strike selection (weekly predictions most important), and macro vibe check.";

/** Derive YES outcome probability (0–1) from market tokens or outcomePrices. */
function getYesPrice(m: PolymarketMarket & { outcomePrices?: string | string[] }): number | undefined {
  const yesToken = m.tokens?.find((t: { outcome?: string }) => t.outcome?.toLowerCase() === "yes");
  if (yesToken != null && typeof (yesToken as { price?: number }).price === "number") {
    return (yesToken as { price: number }).price;
  }
  try {
    const prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices;
    if (Array.isArray(prices) && prices.length > 0) {
      const p = parseFloat(prices[0]);
      if (!Number.isNaN(p)) return p;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export type PriorityMarketItem = {
  question: string;
  conditionId: string;
  volume?: string;
  liquidity?: string;
  yesTokenId?: string;
  noTokenId?: string;
  slug?: string;
  yesPrice?: number;
  category?: string;
  endDateIso?: string;
};

export interface PriorityMarketsResponse {
  whyWeTrack: string;
  intentSummary: string;
  markets: PriorityMarketItem[];
  updatedAt: number;
  weeklyCrypto?: {
    oneLiner: string;
    link: string;
    markets: PriorityMarketItem[];
    updatedAt: number;
  };
  cryptoEtf?: {
    oneLiner: string;
    link: string;
    markets: PriorityMarketItem[];
    updatedAt: number;
  };
  tagSections?: Record<string, { label: string; markets: PriorityMarketItem[] }>;
}

export function buildPriorityMarketsHandler() {
  return async (
    req: { params?: Record<string, string>; [k: string]: unknown },
    res: {
      status: (n: number) => { json: (o: object) => void };
      json: (o: object) => void;
    },
    runtime?: IAgentRuntime
  ): Promise<void> => {
    const agentRuntime =
      runtime ??
      (req as any).runtime ??
      (req as any).agentRuntime ??
      (req as any).agent?.runtime;

    if (!agentRuntime) {
      res.status(503).json({
        error: "Priority markets require agent context",
        hint: "Use /api/agents/:agentId/plugins/polymarket-discovery/polymarket/priority-markets with Oracle agent ID",
      });
      return;
    }

    const service = agentRuntime.getService(
      PolymarketService.serviceType
    ) as PolymarketService | null;

    if (!service) {
      res.status(503).json({
        error: "Polymarket service not available",
        hint: "Ensure the Oracle agent is running and has plugin-polymarket-discovery loaded",
      });
      return;
    }

    const mapMarketToItem = (m: PolymarketMarket): PriorityMarketItem => ({
      question: m.question,
      conditionId: m.conditionId ?? (m as any).condition_id ?? "",
      volume: m.volume,
      liquidity: m.liquidity,
      yesTokenId: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "yes")?.token_id,
      noTokenId: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "no")?.token_id,
      slug: m.slug ?? (m as any).market_slug,
      yesPrice: getYesPrice(m as PolymarketMarket & { outcomePrices?: string | string[] }),
      category: m.category,
      endDateIso: m.endDateIso ?? m.end_date_iso,
    });

    const getLabelForSlug = (slug: string): string => {
      const found = VINCE_POLYMARKET_PREFERRED_LABELS.find((e) => e.slug === slug);
      if (found) return found.label;
      return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    try {
      const limitPerTag = 10;
      const [markets, weeklyCryptoMarkets, cryptoEtfMarketsRaw, ...tagResults] = await Promise.all([
        service.getMarketsByPreferredTags({
          tagSlugs: VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
          totalLimit: 30,
        }),
        service.getWeeklyCryptoMarkets(15),
        service.getEventsByTag("crypto-etf", 15).catch(() => [] as PolymarketMarket[]),
        ...POLYMARKET_TAG_SECTION_SLUGS.map((slug) =>
          service.getEventsByTag(slug, limitPerTag).catch(() => [] as PolymarketMarket[])
        ),
      ]);

      const now = Date.now();
      const openMarkets = markets.filter((m) => {
        const end = m.endDateIso ?? (m as any).end_date_iso;
        return !end || new Date(end).getTime() > now;
      });
      const cryptoEtfItems = cryptoEtfMarketsRaw.map(mapMarketToItem);
      const cryptoEtfOpen = cryptoEtfItems.filter(
        (m) => !m.endDateIso || new Date(m.endDateIso).getTime() > now
      );

      const tagSections: Record<string, { label: string; markets: PriorityMarketItem[] }> = {};
      POLYMARKET_TAG_SECTION_SLUGS.forEach((slug, i) => {
        const raw = tagResults[i] as PolymarketMarket[] | undefined;
        const items = Array.isArray(raw)
          ? raw
              .map(mapMarketToItem)
              .filter(
                (m) =>
                  (!m.endDateIso || new Date(m.endDateIso).getTime() > now) &&
                  (m.yesPrice == null || m.yesPrice >= 0.05)
              )
          : [];
        tagSections[slug] = { label: getLabelForSlug(slug), markets: items };
      });

      const body: PriorityMarketsResponse = {
        whyWeTrack: WHY_WE_TRACK,
        intentSummary: INTENT_SUMMARY,
        markets: openMarkets.map(mapMarketToItem),
        updatedAt: now,
        weeklyCrypto:
          weeklyCryptoMarkets.length > 0
            ? {
                oneLiner: "Weekly crypto odds — vibe check for Hypersurface weekly options.",
                link: "https://polymarket.com/crypto/weekly",
                markets: weeklyCryptoMarkets.map(mapMarketToItem),
                updatedAt: now,
              }
            : undefined,
        cryptoEtf:
          cryptoEtfOpen.length > 0
            ? {
                oneLiner: "Crypto ETF flows and related markets — same view as polymarket.com/crypto/etf.",
                link: "https://polymarket.com/crypto/etf",
                markets: cryptoEtfOpen,
                updatedAt: now,
              }
            : undefined,
        tagSections,
      };

      res.json(body);
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch priority markets",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
