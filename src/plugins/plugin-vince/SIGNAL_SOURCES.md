# Signal Sources for the Paper Trading Bot

The aggregator merges factors from multiple data sources. **"WHY THIS TRADE"** shows all factors (up to 12 in the log; full list in feature store). **"Confirming: N"** = number of **sources** that agree on direction, not total factor count.

To get more than a few factors per trade, ensure as many sources as possible are **available** and **returning data** for your assets (BTC, ETH, SOL, HYPE).

---

## Sources (in aggregator order)

| # | Source | What it adds | Enabling / config |
|---|--------|--------------|-------------------|
| 1 | **CoinGlass** | Funding, L/S ratio, OI level, OI 24h change, Fear/Greed. Always registered; now emits 5–8 factors (funding, L/S, OI, OI change, fear/greed). | No key → uses free Binance fallback for data. **COINGLASS_API_KEY** (Hobbyist) → better coverage and stability. |
| 2 | **TopTraders** | Whale positioning from Hyperliquid. | **VINCE_TOP_TRADERS_SERVICE** is registered. Needs wallet/watchlist config for HL whales; if none, may return no signal. |
| 3 | **Binance** (intel) | Top trader positions %, taker buy/sell ratio, OI trend, funding extremes. | **VINCE_BINANCE_SERVICE** – **no API key**. Public endpoints. Should always contribute when conditions hit (e.g. taker flow >1.3 or <0.7, OI drop, extreme funding). |
| 4 | **BinanceLiquidations** | Cascade and per-symbol liquidation pressure. | **VINCE_BINANCE_LIQUIDATION_SERVICE** – no key. Contributes when cascade or pressure detected. |
| 5 | **NewsSentiment** | Bullish/bearish news from MandoMinutes. | **VINCE_NEWS_SENTIMENT_SERVICE**. Depends on MandoMinutes cache (plugin-web-search **MANDO_MINUTES**). Ensure that action/cache is populated. |
| 6 | **Deribit** | IV skew (fear/greed from options). | **VINCE_DERIBIT_SERVICE** – registered; may use fallback. Contributes for BTC/ETH/SOL when skew is fearful or bullish. |
| 7 | **MarketRegime** | Bullish/bearish/volatile from 24h price + sentiment. | **VINCE_MARKET_DATA_SERVICE** (enriched context). Uses CoinGlass/CoinGecko. Contributes when regime is not neutral. |
| 8 | **Sanbase** | Exchange flows, whale activity. | **VINCE_SANBASE_SERVICE** + **isConfigured()**. Needs **SANBASE_API_KEY** (or similar). If not configured, skipped. |
| 9 | **Hyperliquid** | Perps bias, crowding, cross-venue funding. | Via `getOrCreateHyperliquidService(runtime)` (fallback). Contributes when HL data available. |
| 10 | **Deribit** (P/C, DVOL) | Put/call ratio, DVOL. | Same Deribit service; adds factors when data available. |

---

## Quick checklist to maximize factors

1. **CoinGlass** – No key needed (Binance fallback). With key, more stable. **Already emits 5–8 factors** (funding, L/S, OI, OI change, fear/greed).
2. **Binance** – No key. Ensure **VINCE_BINANCE_SERVICE** is started (it is in the plugin). If you only see CoinGlass factors, check logs for `[VinceSignalAggregator] Binance error` or that thresholds (e.g. taker ratio 1.3 / 0.7) are being hit.
3. **Market regime** – Depends on **VINCE_MARKET_DATA_SERVICE** and enriched context. If CoinGlass/Binance have price and sentiment, regime can add a factor.
4. **News** – Ensure MandoMinutes (or whatever feeds news sentiment) is running and cache has recent data.
5. **Deribit** – For BTC/ETH/SOL, if Deribit service is up and returns IV surface, skew factors can appear.
6. **Sanbase** – Set **SANBASE_API_KEY** (or required env) and ensure `sanbaseService.isConfigured()` is true if you want on-chain flow factors.
7. **Liquidations** – **VINCE_BINANCE_LIQUIDATION_SERVICE** is registered; contributes when cascade or pressure is detected.

---

## How to verify which sources are active

- **Startup (INFO)** – When the plugin loads you will see: `[VINCE] 📡 Signal sources available: N/8 (CoinGlass, TopTraders, Binance, ...)` and a reminder to confirm contributing sources in aggregator logs. This confirms which services are **registered**.
- **Confirm in logs (INFO)** – On each aggregation the aggregator logs: `[VinceSignalAggregator] SOL: 2 source(s) → 8 factors | Sources: CoinGlass, BinanceTakerFlow`. So you can see exactly **which sources contributed** and how many factors. If you only see one source (e.g. `CoinGlass`), enable or fix the others (see checklist above). Set `LOG_LEVEL=info` (default) to see these lines.
- **DEBUG: why a source didn’t contribute** – Set `LOG_LEVEL=debug`. You will see lines like `[VinceSignalAggregator] BTC: tried but no contribution this tick: Binance, NewsSentiment, DeribitIVSkew, MarketRegime` so you can tell whether a source was tried but thresholds weren’t met or errored.
- **"WHY THIS TRADE"** – In the paper trade open banner, the line **"WHY THIS TRADE: N factors, M sources agreeing"** plus the bullet list shows all contributing factors (up to 12 in the log; full list in feature store and journal).
- **getStatus()** – The aggregator’s `getStatus()` returns `dataSources: { name, available }[]`. `available` means the service is registered; it does not guarantee that the service returns a signal on every tick (signals depend on thresholds and data).

---

## Summary

- **CoinGlass** now emits **5–8 factors** (funding, L/S, OI, OI 24h, fear/greed) so even with only CoinGlass you see more than 3.
- **Binance** (no key) and **MarketRegime** are the next easiest to get more factors; then News, Deribit, Sanbase, and liquidations as you add keys or fix config.
