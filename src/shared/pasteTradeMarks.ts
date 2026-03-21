/**
 * Live USD marks for paste-trade local snapshots: Hyperliquid allMids first,
 * CoinGecko simple/price for mapped alts. Used by VINCE pipeline + frontend poll.
 */

/** Strip common suffixes so HL / CG lookups hit (e.g. BTC-PERP → BTC). */
export function normalizePasteTradeTicker(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/-PERP$/i, "")
    .replace(/-USDT$/i, "")
    .replace(/USD$/i, "");
}

/**
 * Map shorthand / alt symbols → HIP-3 perp name on the xyz dex (see xyz:NATGAS on
 * https://app.hyperliquid.xyz/trade/xyz:NATGAS). Main `allMids` has no HIP-3 keys.
 */
export const PASTE_TRADE_MARK_SYMBOL_ALIASES: Record<string, string> = {
  NG: "NATGAS",
  UNG: "NATGAS",
};

/** CoinGecko `ids` for symbols not covered by HL allMids (or as HL fallback). */
export const PASTE_TRADE_COINGECKO_SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  WBTC: "bitcoin",
  ETH: "ethereum",
  WETH: "ethereum",
  SOL: "solana",
  HYPE: "hyperliquid",
  DOGE: "dogecoin",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOT: "polkadot",
  MATIC: "matic-network",
  POL: "matic-network",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TON: "the-open-network",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  SHIB: "shiba-inu",
};

export type PasteTradeMarkSource = "hyperliquid" | "coingecko";

export interface PasteTradeResolvedMark {
  usd: number;
  source: PasteTradeMarkSource;
}

/** Fetch HL perp mids (public, no auth). */
export async function fetchHyperliquidAllMids(
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, number>> {
  const res = await fetchFn("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allMids" }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return {};
  const j = (await res.json()) as Record<string, string>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(j)) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

/**
 * Mark prices for HIP-3 / TradFi perps on the `xyz` dex (`xyz:NVDA`, `xyz:NATGAS`, …).
 * These are absent from main-dex `allMids`.
 */
export async function fetchHyperliquidXyzDexMarks(
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, number>> {
  const res = await fetchFn("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs", dex: "xyz" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return {};
  const d = (await res.json()) as unknown;
  if (!Array.isArray(d) || d.length < 2) return {};
  const meta = d[0] as { universe?: Array<{ name?: string }> };
  const ctxs = d[1] as Array<{ markPx?: string }>;
  const uni = meta.universe ?? [];
  const out: Record<string, number> = {};
  for (let i = 0; i < uni.length; i++) {
    const name = uni[i]?.name;
    if (!name || typeof name !== "string") continue;
    const raw = ctxs[i]?.markPx;
    if (raw == null) continue;
    const n = Number.parseFloat(String(raw));
    if (!Number.isFinite(n) || n <= 0) continue;
    const short =
      name.startsWith("xyz:") || name.startsWith("XYZ:") ? name.slice(4) : name;
    out[short.toUpperCase()] = n;
    out[name.toUpperCase()] = n;
  }
  return out;
}

function lookupXyzMarkUsd(
  sym: string,
  xyz: Record<string, number>,
): number | undefined {
  const u = sym.toUpperCase();
  const alias = PASTE_TRADE_MARK_SYMBOL_ALIASES[u];
  const a = alias?.toUpperCase();
  return (
    xyz[u] ??
    (a ? xyz[a] : undefined) ??
    xyz[`XYZ:${u}`] ??
    (a ? xyz[`XYZ:${a}`] : undefined)
  );
}

async function fetchCoingeckoUsdByIds(
  ids: string[],
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    [...new Set(ids)].join(","),
  )}&vs_currencies=usd`;
  const res = await fetchFn(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return {};
  const j = (await res.json()) as Record<string, { usd?: number }>;
  const out: Record<string, number> = {};
  for (const [id, row] of Object.entries(j)) {
    const u = row?.usd;
    if (typeof u === "number" && Number.isFinite(u) && u > 0) out[id] = u;
  }
  return out;
}

/**
 * Resolve USD mark per normalized ticker (HL first, then CoinGecko when mapped).
 */
export async function resolveUsdMarksForTickers(
  tickers: string[],
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, PasteTradeResolvedMark>> {
  const syms = [
    ...new Set(
      tickers.map(normalizePasteTradeTicker).filter((s) => s.length > 0),
    ),
  ];
  if (syms.length === 0) return {};

  const mids = await fetchHyperliquidAllMids(fetchFn);
  const out: Record<string, PasteTradeResolvedMark> = {};
  const needCg: { sym: string; id: string }[] = [];

  for (const sym of syms) {
    const hl = mids[sym];
    if (hl != null && hl > 0) {
      out[sym] = { usd: hl, source: "hyperliquid" };
      continue;
    }
    const cgId = PASTE_TRADE_COINGECKO_SYMBOL_TO_ID[sym];
    if (cgId) needCg.push({ sym, id: cgId });
  }

  if (needCg.length > 0) {
    const byId = await fetchCoingeckoUsdByIds(
      needCg.map((x) => x.id),
      fetchFn,
    );
    for (const { sym, id } of needCg) {
      if (out[sym]) continue;
      const u = byId[id];
      if (u != null && u > 0) out[sym] = { usd: u, source: "coingecko" };
    }
  }

  const stillMissing = syms.filter((s) => !out[s]);
  if (stillMissing.length > 0) {
    const xyz = await fetchHyperliquidXyzDexMarks(fetchFn);
    for (const sym of stillMissing) {
      const px = lookupXyzMarkUsd(sym, xyz);
      if (px != null && px > 0) {
        out[sym] = { usd: px, source: "hyperliquid" };
      }
    }
  }

  return out;
}

/**
 * Add mark_price, reference_price_usd (at extract), and initial pnl 0 for each trade.
 */
export async function enrichLocalSnapshotWithMarks(
  snap: Record<string, unknown>,
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const tradesRaw = snap.trades;
  if (!Array.isArray(tradesRaw) || tradesRaw.length === 0) {
    return { ...snap };
  }
  const trades = tradesRaw.filter((t) => t && typeof t === "object") as Record<
    string,
    unknown
  >[];
  const tickers = trades.map((t) => String(t.ticker ?? ""));
  const marks = await resolveUsdMarksForTickers(tickers, fetchFn);
  const capturedAt = new Date().toISOString();

  const enriched = trades.map((t) => {
    const sym = normalizePasteTradeTicker(String(t.ticker ?? ""));
    const m = sym ? marks[sym] : undefined;
    if (!m) return { ...t };
    const usd = m.usd;
    return {
      ...t,
      mark_price: usd,
      reference_price_usd: usd,
      reference_captured_at: capturedAt,
      mark_source: m.source,
      posted_pnl_pct: 0,
      pnl_pct: 0,
    };
  });

  return {
    ...snap,
    trades: enriched,
    marks_enriched_at: capturedAt,
  };
}

/** Read numeric field from a trade row (tolerant types). */
function numFromTradeRow(
  t: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = t[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Unrealized % since `reference_price_usd` (set at extract) vs current `liveUsd`.
 * Long: (live - ref) / ref; short: (ref - live) / ref.
 */
export function localTradePnlPct(
  t: Record<string, unknown>,
  liveUsd: number | null | undefined,
): number | null {
  if (liveUsd == null || !Number.isFinite(liveUsd) || liveUsd <= 0) return null;
  const ref =
    numFromTradeRow(t, [
      "reference_price_usd",
      "author_entry_price",
      "posted_entry_price",
      "entry_price",
    ]) ?? null;
  if (ref == null || ref <= 0) return null;
  const dir = String(t.direction ?? "").toLowerCase();
  const isShort =
    dir === "short" || dir === "sell" || dir === "bear" || dir === "no";
  const r = isShort ? (ref - liveUsd) / ref : (liveUsd - ref) / ref;
  return r * 100;
}
