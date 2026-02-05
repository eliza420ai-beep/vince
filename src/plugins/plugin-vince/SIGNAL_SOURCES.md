# Signal Sources for the Paper Trading Bot

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗  
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝  
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**Purpose:** Which data sources feed the signal aggregator, how to enable them, and how to verify in logs which sources contributed. For hands-on dev and debugging, see [HOW.md](./HOW.md). For feature-store and ML, see [../../FEATURE-STORE.md](../../FEATURE-STORE.md).

**When to read:** You see few factors per trade, only one source in logs, or want to add/fix CoinGlass, Binance, Deribit, News, Sanbase, etc.

---

## At a glance

- The aggregator merges **factors** from multiple **sources**. **"WHY THIS TRADE"** shows contributing factors (up to 12 in the log; full list in feature store). **"Confirming: N"** = number of **sources** agreeing on direction, not total factor count.
- To get more factors: ensure sources are **registered**, **returning data** for your assets (BTC, ETH, SOL, HYPE), and **meeting thresholds** (see [How to verify which sources are active](#how-to-verify-which-sources-are-active)).
- **Free (no key):** CoinGlass (fallback), Binance, BinanceLiquidations, Deribit (fallback), MarketRegime (uses other data). **Optional keys:** COINGLASS_API_KEY, SANBASE_API_KEY; TopTraders needs wallet config.

---

## Data we have vs what feeds the algo

When you see **"2 sources"** in WHY THIS TRADE, that means only **2 distinct source names** contributed factors *that tick* (e.g. CoinGlass + DeribitIVSkew). Many more *can* contribute; they only add a factor when their thresholds are met (e.g. taker ratio &gt; 1.25, skew fearful, etc.).

### Sources that DO feed the paper trading algo (can appear in "N sources")

These are the only names that count as "sources" in the aggregator. If a source is available but its thresholds aren’t met this tick, it won’t show up.

| Source name | Service | When it contributes |
|-------------|---------|--------------------|
| **CoinGlass** | VinceCoinGlassService | Funding, L/S, OI, fear/greed in range → almost always at least one factor |
| **TopTraders** | VinceTopTradersService | HL whale positions cross threshold (needs wallet config) |
| **BinanceTopTraders** | VinceBinanceService | Top trader long % &gt;62 or &lt;38 |
| **BinanceTakerFlow** | VinceBinanceService | Taker buy/sell ratio &gt;1.25 or &lt;0.75 |
| **BinanceOIFlush** | VinceBinanceService | OI trend falling &lt;−5% |
| **BinanceLongShort** | VinceBinanceService | L/S ratio &gt;1.4 or &lt;0.72 |
| **BinanceFundingExtreme** | VinceBinanceService | Funding in top/bottom 10% of recent |
| **LiquidationCascade** | VinceBinanceLiquidationService | Cascade detected |
| **LiquidationPressure** | VinceBinanceLiquidationService | Per-symbol pressure |
| **NewsSentiment** | VinceNewsSentimentService | Sentiment bullish/bearish/neutral (confidence ≥40) |
| **DeribitIVSkew** | VinceDeribitService | IV skew fearful, bullish, or neutral (BTC/ETH/SOL) |
| **DeribitPutCallRatio** | VinceDeribitService | P/C ratio &gt;1.2 or &lt;0.82 |
| **MarketRegime** | VinceMarketDataService + VinceMarketRegimeService | Regime (bullish/bearish/volatile/neutral) |
| **SanbaseExchangeFlows** | VinceSanbaseService | In/out flows or neutral (needs SANBASE_API_KEY) |
| **SanbaseWhales** | VinceSanbaseService | Whale activity or neutral (needs key) |
| **HyperliquidBias** | Hyperliquid fallback | Perps bias long/short |
| **HyperliquidCrowding** | Hyperliquid fallback | Crowding signal |
| **HyperliquidOICap** | Hyperliquid fallback | Perp at OI cap (max crowding, contrarian) |
| **HyperliquidFundingExtreme** | Hyperliquid fallback | HL funding in top/bottom 10% of history (mean reversion) |
| **CrossVenueFunding** | Hyperliquid + Binance/Bybit | Funding arb opportunity |

So **"2 sources"** = 2 of the above had at least one factor this time. To get more sources: fix config (e.g. Sanbase key), relax thresholds (see IMPROVEMENT_WEIGHTS_AND_TUNING.md), or add new sources below.

### Data we have that do NOT yet influence the trading bot

These services exist and return data, but they are **not** wired into the signal aggregator for the paper trading algo. They are used for other actions (memes, NFT, lifestyle, alerts, etc.) or for context only.

| Service | What it provides | Why it doesn’t feed the algo (yet) |
|---------|------------------|------------------------------------|
| **VinceNansenService** | Smart money, flow (100 credits) | Not connected to signal aggregator; could be added as a source. |
| **VinceCoinGeckoService** | Exchange health, liquidity, prices | Used by MarketData/context; not a named aggregator source. |
| **VinceDexScreenerService** | Hot memes SOLANA + BASE | Memes action only; not perps. |
| **VinceMeteoraService** | LP pool discovery | DCA / memes; not perps signals. |
| **VinceNFTFloorService** | NFT floor prices | NFT action only. |
| **VinceLifestyleService** | Daily suggestions | Lifestyle action only. |
| **VinceHIP3Service** | Stocks, commodities, indices | TradFi; not crypto perps. |
| **VinceWatchlistService** | Early detection watchlist | Not used as an aggregator source; could filter or add weak signal. |
| **VinceAlertService** | Price/signal alerts | Alerts only; not voting in aggregator. |

**DVOL** (Deribit volatility index) is used for position sizing / regime (e.g. cap size when vol is high) but does not appear as its own **source** name in "N sources"; it’s part of context/ML.

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
| 9 | **Hyperliquid** | Perps bias, crowding, OI cap, funding extreme (history-based), cross-venue funding. | Via `getOrCreateHyperliquidService(runtime)` (fallback). Uses `perpsAtOpenInterestCap` and `fundingHistory` APIs. Contributes when HL data available. |
| 10 | **Deribit** (P/C, DVOL) | Put/call ratio, DVOL. | Same Deribit service; adds factors when data available. |

---

## Quick checklist to maximize factors

1. **CoinGlass** – No key needed (Binance fallback). With key, more stable. **Already emits 5–8 factors** (funding, L/S, OI, OI change, fear/greed).
2. **Binance** – No key. Ensure **VINCE_BINANCE_SERVICE** is started (it is in the plugin). If you only see CoinGlass factors, check logs for `[VinceSignalAggregator] Binance error` or that thresholds (e.g. taker ratio 1.25 / 0.75, L/S 1.4 / 0.72) are being hit.
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

---

## Related docs

- [HOW.md](./HOW.md) — Debugging (e.g. `LOG_LEVEL=debug`, grep SignalAggregator), paper bot state
- [README.md](./README.md) — Plugin overview and signal pipeline
- [CLAUDE.md](./CLAUDE.md) — Service list and technical reference
- [../../FEATURE-STORE.md](../../FEATURE-STORE.md) — Where feature records (and decision drivers) are stored for ML
