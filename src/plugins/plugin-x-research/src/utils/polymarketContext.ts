/**
 * Polymarket context for WTT thesis prompt.
 * Fetches Gamma public-search (read-only, no auth) so ECHO can inject
 * prediction-market odds into the thesis without depending on Oracle runtime.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const GAMMA_PUBLIC_SEARCH = "/public-search";
const LIMIT = 5;
const TIMEOUT_MS = 8_000;

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
    const lines: string[] = [];
    let count = 0;
    const maxMarkets = 5;
    for (const ev of events) {
      const markets = ev.markets ?? [];
      for (const m of markets) {
        if (count >= maxMarkets) break;
        const q = (m.question ?? "").trim();
        if (!q) continue;
        let pct = "";
        try {
          const prices =
            typeof m.outcomePrices === "string"
              ? (JSON.parse(m.outcomePrices) as string[])
              : Array.isArray(m.outcomePrices)
                ? m.outcomePrices
                : [];
          const outcomes =
            typeof m.outcomes === "string"
              ? (JSON.parse(m.outcomes) as string[])
              : Array.isArray(m.outcomes)
                ? m.outcomes
                : [];
          const yesIdx = outcomes.findIndex(
            (o) => o?.toLowerCase() === "yes" || o?.toLowerCase() === "true",
          );
          if (yesIdx >= 0 && prices[yesIdx] != null) {
            const num = parseFloat(prices[yesIdx]);
            if (!Number.isNaN(num)) pct = `${Math.round(num * 100)}%`;
          } else if (prices[0] != null) {
            const num = parseFloat(prices[0]);
            if (!Number.isNaN(num)) pct = `${Math.round(num * 100)}%`;
          }
        } catch {
          // ignore parse errors
        }
        const shortQ = q.length > 80 ? q.slice(0, 77) + "…" : q;
        lines.push(pct ? `${shortQ} — Yes ${pct}` : shortQ);
        count++;
      }
      if (count >= maxMarkets) break;
    }
    if (lines.length === 0) return null;
    return `Prediction markets: ${lines.join(". ")}`;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
