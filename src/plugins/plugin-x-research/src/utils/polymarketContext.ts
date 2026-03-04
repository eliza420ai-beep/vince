/**
 * Polymarket context for WTT thesis prompt.
 * Fetches Gamma public-search (read-only, no auth) so ECHO can inject
 * prediction-market odds into the thesis without depending on Oracle runtime.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const GAMMA_PUBLIC_SEARCH = "/public-search";
const LIMIT = 5;
const TIMEOUT_MS = 8_000;
const MAX_QUESTION_LENGTH = 80;

interface GammaEvent {
  markets?: Array<{
    question?: string;
    outcomePrices?: string | string[];
    outcomes?: string | string[];
  }>;
}

interface GammaSearchResponse {
  events?: GammaEvent[];
}

interface PolymarketMarketContext {
  question: string;
  yesProb: number | null;
  parseQuality: "yes_outcome" | "fallback_first_outcome" | "unparsed";
}

function clampProb(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

export function parseStringOrArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export function compactQuestion(question: string): string {
  const text = question.replace(/\s+/g, " ").trim();
  if (text.length <= MAX_QUESTION_LENGTH) return text;
  return text.slice(0, MAX_QUESTION_LENGTH - 1) + "…";
}

export function resolveYesProbability(
  outcomesRaw: unknown,
  pricesRaw: unknown,
): {
  yesProb: number | null;
  parseQuality: PolymarketMarketContext["parseQuality"];
} {
  const outcomes = parseStringOrArrayField(outcomesRaw).map((o) =>
    o.toLowerCase().trim(),
  );
  const prices = parseStringOrArrayField(pricesRaw).map((p) => parseFloat(p));

  const yesIdx = outcomes.findIndex((o) => o === "yes" || o === "true");
  if (yesIdx >= 0 && prices[yesIdx] != null) {
    const yesProb = clampProb(prices[yesIdx]);
    if (yesProb != null) return { yesProb, parseQuality: "yes_outcome" };
  }

  if (prices[0] != null) {
    const fallback = clampProb(prices[0]);
    if (fallback != null) {
      return { yesProb: fallback, parseQuality: "fallback_first_outcome" };
    }
  }
  return { yesProb: null, parseQuality: "unparsed" };
}

function normalizeQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenMarkets(events: GammaEvent[]): PolymarketMarketContext[] {
  const out: PolymarketMarketContext[] = [];
  for (const ev of events) {
    const markets = ev.markets ?? [];
    for (const m of markets) {
      const q = compactQuestion(m.question ?? "");
      if (!q) continue;
      const { yesProb, parseQuality } = resolveYesProbability(
        m.outcomes,
        m.outcomePrices,
      );
      out.push({
        question: q,
        yesProb,
        parseQuality,
      });
    }
  }
  return out;
}

function dedupeAndSortMarkets(
  markets: PolymarketMarketContext[],
): PolymarketMarketContext[] {
  const bestByQuestion = new Map<string, PolymarketMarketContext>();
  const qualityRank: Record<PolymarketMarketContext["parseQuality"], number> = {
    yes_outcome: 3,
    fallback_first_outcome: 2,
    unparsed: 1,
  };
  for (const market of markets) {
    const key = normalizeQuestionKey(market.question);
    const prev = bestByQuestion.get(key);
    if (!prev) {
      bestByQuestion.set(key, market);
      continue;
    }
    const better =
      qualityRank[market.parseQuality] > qualityRank[prev.parseQuality] ||
      (qualityRank[market.parseQuality] === qualityRank[prev.parseQuality] &&
        (market.yesProb ?? -1) > (prev.yesProb ?? -1));
    if (better) bestByQuestion.set(key, market);
  }
  return [...bestByQuestion.values()]
    .sort((a, b) => {
      const aq = qualityRank[a.parseQuality];
      const bq = qualityRank[b.parseQuality];
      if (aq !== bq) return bq - aq;
      return (b.yesProb ?? -1) - (a.yesProb ?? -1);
    })
    .slice(0, LIMIT);
}

function renderMarketLine(market: PolymarketMarketContext): string {
  if (market.yesProb == null) return market.question;
  return `${market.question} — Yes ${Math.round(market.yesProb * 100)}%`;
}

/**
 * Fetch a short summary of Polymarket odds for a query (e.g. "bitcoin", "OpenAI").
 * Returns a string like "Prediction markets: [Q1] Yes X%. [Q2] Yes Y%." or "" on failure.
 */
export async function getPolymarketContextForWtt(
  query: string,
): Promise<string | null> {
  if (!query?.trim()) return null;
  const url = `${GAMMA_API}${GAMMA_PUBLIC_SEARCH}?q=${encodeURIComponent(query.trim())}&limit_per_type=${LIMIT}&events_status=active`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = (await res.json()) as GammaSearchResponse;
    const events = body.events ?? [];
    const structured = dedupeAndSortMarkets(flattenMarkets(events));
    const lines = structured.map(renderMarketLine);
    if (lines.length === 0) return null;
    return `Prediction markets: ${lines.join(". ")}`;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
