# Getting Better Data From Binance Free Endpoints

Ways to improve signal quality using the **same** Binance Futures public APIs (no API key). Current endpoints: `topLongShortPositionRatio`, `takerlongshortRatio`, `globalLongShortAccountRatio`, `openInterestHist`, `fundingRate`, `premiumIndex`.

---

## 1. Use more history (less noise, trend awareness)

**Current:** We request `limit=1` for top trader, taker, and L/S ratio.

**Improvement:**

- Request `limit=5` or `limit=10` (API allows up to 500 for some; 30-day max for these).
- **Smoothing:** Use the average of the last 3–5 buckets for the “current” value so a single spike doesn’t flip the signal.
- **Trend:** Compare latest vs 1–2 buckets ago: e.g. “top traders 62% long but down from 68%” can strengthen a short signal (crowd unwinding) or weaken it (already pricing in).

**Where:** `getTopTraderPositions`, `getTakerVolume`, `getLongShortRatio` — add optional `limit` param and compute `current` from a small window or trend.

---

## 2. Multiple timeframes (confirmation)

**Current:** Only `period=5m` for position/taker/L/S.

**Improvement:**

- Fetch both `period=5m` and `period=1h` (or 15m). API supports: 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d.
- Use 5m for “current” and 1h for “alignment”: e.g. only add a BinanceTopTraders signal when 5m and 1h agree (both >62% long), to reduce false positives.

**Where:** Either two calls per symbol (5m + 1h) and merge in the service, or expose both in `BinanceIntelligence` and let the aggregator require alignment.

---

## 3. Funding “extreme” = percentile (adaptive)

**Current:** `isExtreme = Math.abs(current) > 0.001` (fixed 0.1% threshold).

**Improvement:**

- Fetch more history: `limit=30` or `limit=50` for funding rate.
- Compute percentile of current rate vs recent distribution (e.g. last 30).
- Set `isExtreme` when current is in **top 10%** (longs paying a lot) or **bottom 10%** (shorts paying) of recent. This adapts to high-vol vs low-vol regimes.

**Where:** `getFundingTrend`: increase `limit`, compute percentile, set `isExtreme` and `extremeDirection` from that.

---

## 4. Use Binance L/S ratio in the aggregator

**Current:** We fetch `globalLongShortAccountRatio` in `getIntelligence` but do **not** create a signal from it (CoinGlass L/S is used elsewhere).

**Improvement:**

- In the signal aggregator, when `intel.longShortRatio` is present and extreme (e.g. ratio > 1.5 or < 0.67), add a **BinanceLongShort** contrarian signal (too many longs → short, too many shorts → long). That gives the bot one more data point from Binance.

**Where:** `signalAggregator.service.ts` Phase 3 (Binance block): add a 3e. block for `intel.longShortRatio`.

---

## 5. OI trend as a weak signal

**Current:** OI trend only adds narrative text (“OI dropping X% (position flush)”) to factors; no directional signal.

**Improvement:**

- When `oiTrend.trend === "falling"` and `changePercent < -5%`, add a **low-strength** signal (e.g. “OI flush – positions closing”) with direction “long” (flush often precedes bounce) or leave as “context only” but feed into ML as a feature (e.g. `oi_flush`).

**Where:** Signal aggregator or feature store snapshot; optional in `getIntelligence` return type.

---

## 6. 451 / geo and reliability

**Current:** We track consecutive 451s and skip Binance when degraded; no alternative host.

**Improvements:**

- **Proxy:** In restricted regions (e.g. US), run the app or a small proxy in a non-restricted region and call Binance through it. No change to Binance API contract.
- **Base URL:** Add optional `VINCE_BINANCE_BASE_URL` (e.g. `https://your-proxy.com/binance`) so all `fapi.binance.com` requests go through that host. Default remains `https://fapi.binance.com`.
- **Official alternatives:** Binance does not document a separate “data-api” for futures to avoid 451; the community workaround is proxy/VPN.

**Where:** `binance.service.ts`: base URL from env, append path for each endpoint.

---

## 7. Data validation (robustness)

**Current:** We parse and use values; a single bad bucket could skew signals.

**Improvement:**

- **Sanity checks:** Clamp or reject invalid values before caching and returning:
  - `longPosition` in [0, 100].
  - `buySellRatio` > 0 (and e.g. < 10 to ignore outliers).
  - Funding rate in a reasonable range (e.g. ±0.5% for 8h).
- On invalid data, keep previous cached value or return null so the aggregator doesn’t get one bad tick.

**Where:** Each getter in `binance.service.ts` after parsing, before `cache.set` and return.

---

## 8. Rate limits and caching

**Current:** 1-minute TTL per symbol/endpoint; `getIntelligence` runs all fetches in parallel.

**Good practice:**

- Binance weight limits (e.g. 1200/min) are generous for our usage; with 1-min cache we stay safe.
- If you add multi-period or more history, keep a single parallel batch per asset and avoid per-period loops that multiply request count; prefer one call with higher `limit` where the API allows.

---

## Summary (priority)

| Priority      | Change                                                    | Status                                                 |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| High          | Funding extreme = percentile (more history)               | Done (limit=30, top/bottom 10%).                       |
| High          | Use Binance L/S in aggregator                             | Done (BinanceLongShort, ratio >1.5 / <0.67).           |
| Medium        | More history (limit=5) + smoothing for top trader / taker | Done (avg of last 3; validation clamp).                |
| Medium        | Multi-period (5m + 1h) for confirmation                   | Not yet (would double calls).                          |
| Low           | OI trend as weak signal or ML feature                     | Done (BinanceOIFlush when OI falling <-5%).            |
| Env-dependent | Base URL / proxy for 451                                  | Done (VINCE_BINANCE_BASE_URL).                         |
| Low           | Validation and clamping                                   | Done (longPosition, buySellRatio, L/S, funding ±0.5%). |

All of the above use only **free, public** Binance Futures data endpoints; no API key required.
