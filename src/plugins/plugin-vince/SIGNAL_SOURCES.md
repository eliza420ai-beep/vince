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

When you see **"2 sources"** in WHY THIS TRADE, that means only **2 distinct source names** contributed factors _that tick_ (e.g. CoinGlass + DeribitIVSkew). Many more _can_ contribute; they only add a factor when their thresholds are met (e.g. taker ratio &gt; 1.25, skew fearful, etc.).

### Sources that DO feed the paper trading algo (can appear in "N sources")

These are the only names that count as "sources" in the aggregator. If a source is available but its thresholds aren’t met this tick, it won’t show up.

| Source name                   | Service                                           | When it contributes                                                       |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| **CoinGlass**                 | VinceCoinGlassService                             | Funding, L/S, OI, fear/greed in range → almost always at least one factor |
| **TopTraders**                | VinceTopTradersService                            | HL whale positions cross threshold (needs wallet config)                  |
| **BinanceTopTraders**         | VinceBinanceService                               | Top trader long % &gt;62 or &lt;38                                        |
| **BinanceTakerFlow**          | VinceBinanceService                               | Taker buy/sell ratio &gt;1.25 or &lt;0.75                                 |
| **BinanceOIFlush**            | VinceBinanceService                               | OI trend falling &lt;−5%                                                  |
| **BinanceLongShort**          | VinceBinanceService                               | L/S ratio &gt;1.4 or &lt;0.72                                             |
| **BinanceFundingExtreme**     | VinceBinanceService                               | Funding in top/bottom 10% of recent                                       |
| **LiquidationCascade**        | VinceBinanceLiquidationService                    | Cascade detected                                                          |
| **LiquidationPressure**       | VinceBinanceLiquidationService                    | Per-symbol pressure                                                       |
| **NewsSentiment**             | VinceNewsSentimentService                         | Sentiment bullish/bearish/neutral (confidence ≥40)                        |
| **XSentiment**                | VinceXSentimentService                            | X (Twitter) sentiment from search (confidence ≥40); staggered refresh **one asset per hour** by default (no burst—e.g. 4 assets = full cycle every 4h, 24 assets = full cycle every 24h); persistent cache `.elizadb/vince-paper-bot/x-sentiment-cache.json`; needs X_BEARER_TOKEN + VinceXResearchService. Set X_SENTIMENT_ENABLED=false to disable. Optional cron: `bun run scripts/x-vibe-check.ts` (round-robin) or pass asset. |
| **DeribitIVSkew**             | VinceDeribitService                               | IV skew fearful, bullish, or neutral (BTC/ETH/SOL)                        |
| **DeribitPutCallRatio**       | VinceDeribitService                               | P/C ratio &gt;1.2 or &lt;0.82                                             |
| **MarketRegime**              | VinceMarketDataService + VinceMarketRegimeService | Regime (bullish/bearish/volatile/neutral)                                 |
| **SanbaseExchangeFlows**      | VinceSanbaseService                               | In/out flows or neutral (needs SANBASE_API_KEY)                           |
| **SanbaseWhales**             | VinceSanbaseService                               | Whale activity or neutral (needs key)                                     |
| **HyperliquidBias**           | Hyperliquid fallback                              | Perps bias long/short                                                     |
| **HyperliquidCrowding**       | Hyperliquid fallback                              | Crowding signal                                                           |
| **HyperliquidOICap**          | Hyperliquid fallback                              | Perp at OI cap (max crowding, contrarian)                                 |
| **HyperliquidFundingExtreme** | Hyperliquid fallback                              | HL funding in top/bottom 10% of history (mean reversion)                  |
| **CrossVenueFunding**         | Hyperliquid + Binance/Bybit                       | Funding arb opportunity                                                   |

So **"2 sources"** = 2 of the above had at least one factor this time. To get more sources: fix config (e.g. Sanbase key), relax thresholds (see IMPROVEMENT_WEIGHTS_AND_TUNING.md), or add new sources below.

### Confirmation: X sentiment **does** impact the paper trading algo

The pipeline is wired end-to-end:

1. **VincePaperTradingService** (or the bot tick) calls **`signalAggregator.getSignal(asset)`**.
2. **getSignal(asset)** returns **`aggregateSignals(asset)`** (see `signalAggregator.service.ts`).
3. **aggregateSignals()** includes the **XSentiment** block: it calls **`xSentimentService.getTradingSentiment(asset)`** and, when **confidence ≥ X_SENTIMENT_CONFIDENCE_FLOOR** (default 40), pushes **long/short/neutral** into `signals` with **`source: "XSentiment"`** and appends to **`sources`** and **`allFactors`**. Optional soft tier (confidence 25–39) can contribute with reduced weight when **X_SENTIMENT_SOFT_TIER_ENABLED=true**.
4. The **aggregated signal** (direction, strength, confidence, **sources**, factors) is what the paper trading service uses to:
   - Decide **direction** (long/short) and **strength/confidence** for the trade.
   - Build **supporting reasons** and **sourceBreakdown** (so **XSentiment** appears in “WHY THIS TRADE” and in the source count).
   - Feed the **ML signal-quality** model (when XSentiment contributed, **xSentiment** is passed into the model input).
   - Record the **feature store** (e.g. **signal_xSentimentScore**) for training and the improvement report.

So when X sentiment has sufficient confidence, it **votes** in the same way as NewsSentiment or CoinGlass: it changes the net signal and can tip the decision to open or size a paper trade, and it is visible in logs and WHY THIS TRADE.

### How much weight does X sentiment have?

- **Default (static) weight: 0.5** (in `dynamicConfig.ts` → `DEFAULT_SOURCE_WEIGHTS.XSentiment`). So each X sentiment vote is **half** as influential as a baseline (1.0) source like CoinGlass or MarketRegime.
- **Relative to others:** NewsSentiment is 0.6; high-impact sources (e.g. LiquidationCascade) are 2.0; Binance funding extreme 1.5; so X is on the **lower, “noisy / lagging”** tier by design.
- **How it’s applied:** In the aggregator, each signal’s **confidence** and **strength** are multiplied by `sourceWeight * recencyDecay`. Net direction and final strength/confidence are weighted averages over all sources, so X sentiment **does** move the needle when it agrees or disagrees with others, but with 0.5x scaling.
- **Adaptive weight:** If the weight bandit is enabled (`ML_CONFIG.useBanditWeights`), the effective weight for XSentiment can be **sampled from a learned distribution** (Thompson Sampling) and may differ from 0.5. After retraining, **run-improvement-weights** can also nudge the stored XSentiment weight from the improvement report (feature `signal_xSentimentScore` → source `XSentiment`).

### Will X sentiment improve the paper trading algo?

- **It can.** XSentiment adds another vote (bullish/bearish/neutral) with confidence, same as NewsSentiment. When X and other sources agree, the aggregator gets more confirming factors; when they disagree, the weight bandit and ML can learn over time whether X helps (via `signal_xSentimentScore` in the feature store and improvement report).
- **Initial weight** is 0.5 (see dynamicConfig). After you retrain and run `run-improvement-weights`, the XSentiment weight can move up or down based on feature importance.
- **Best way to know:** run the bot with X_BEARER_TOKEN set, collect trades, retrain with the new `signal_xSentimentScore` column, then check the improvement report and holdout metrics.

### X sentiment: query shape, keywords, confidence, risk

- **Query shape:** Per asset the service searches X with: **BTC** → `$BTC OR Bitcoin`, **ETH** → `$ETH OR Ethereum`, **SOL** → `$SOL OR Solana`, **HYPE** → `HYPE crypto`. Time window and sort order are configurable (**X_SENTIMENT_SINCE**, **X_SENTIMENT_SORT_ORDER**).
- **Keywords:** Bullish/bearish/risk word lists live in **`constants/sentimentKeywords.ts`** (shared lexicon). Phrase overrides (e.g. “bull trap”, “buy the dip”) and simple negation (“not bullish”) are applied before word scoring. Optional custom lists via **X_SENTIMENT_KEYWORDS_PATH** (JSON: `{ "bullish": [], "bearish": [], "risk": [] }`).
- **Confidence formula:** Strength combines `|avgSentiment|*2`, tweet count term, and a small boost when tweet count ≥ min and |avgSentiment| > 0.2; confidence = min(100, strength*70). Tuned so small-but-clear samples (e.g. 5 tweets, avg 0.2) can reach the confidence floor (default 40).
- **Risk:** **hasHighRiskEvent** is set when **≥ X_SENTIMENT_RISK_MIN_TWEETS** tweets (default 2) contain risk keywords (rug, scam, exploit, hack, etc.), to reduce single-troll false positives. X risk is lexical only; consider future filters (e.g. follower count) if the API allows.
- **Env knobs:** See `.env.example`: **X_SENTIMENT_SINCE**, **X_SENTIMENT_SORT_ORDER**, **X_SENTIMENT_CONFIDENCE_FLOOR**, **X_SENTIMENT_MIN_TWEETS**, **X_SENTIMENT_BULL_BEAR_THRESHOLD**, **X_SENTIMENT_RISK_MIN_TWEETS**, **X_SENTIMENT_ENGAGEMENT_CAP**, **X_SENTIMENT_SOFT_TIER_ENABLED**, **X_SENTIMENT_KEYWORDS_PATH**.

### X list feed (curated list sentiment)

When **X_LIST_ID** is set (e.g. your curated list ID from x.com/i/lists/…), **VinceXResearchService** can fetch list metadata and list posts via **getListById**, **getListPosts**, and **getListMembers**. List posts are cached **15 minutes** (same TTL as search). **VinceXSentimentService.getListSentiment()** runs the same keyword/phrase/risk scoring over list posts and returns one aggregate sentiment (bullish/bearish/neutral + confidence + hasHighRiskEvent); result is cached in-memory for **15 minutes**. Set **X_SENTIMENT_LIST_ENABLED=false** to disable list sentiment (default: enabled when X_LIST_ID is set). List sentiment is exposed in: **CT Vibe** action (line "List (curated): …"), **leaderboard** News section (X vibe card shows a "List (curated)" row when present). List feed does **not** currently feed the signal aggregator as a separate source; it is an additional alpha/vibe signal for display and CT Vibe only.

**Tuning:** **X_SENTIMENT_ASSETS** (optional) is a comma-separated list of tickers to refresh for per-asset sentiment; default is BTC,ETH,SOL,HYPE. Add more tickers when you have quota (e.g. X_SENTIMENT_ASSETS=BTC,ETH,SOL,HYPE,DOGE). Stagger still runs one asset per interval, so more assets = longer full cycle.

### Data we have that do NOT yet influence the trading bot

These services exist and return data, but they are **not** wired into the signal aggregator for the paper trading algo. They are used for other actions (memes, NFT, lifestyle, alerts, etc.) or for context only.

| Service                     | What it provides                   | Why it doesn’t feed the algo (yet)                                 |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| **VinceNansenService**      | Smart money, flow (100 credits)    | Not connected to signal aggregator; could be added as a source.    |
| **VinceCoinGeckoService**   | Exchange health, liquidity, prices | Used by MarketData/context; not a named aggregator source.         |
| **VinceDexScreenerService** | Hot memes SOLANA + BASE            | Memes action only; not perps.                                      |
| **VinceMeteoraService**     | LP pool discovery                  | DCA / memes; not perps signals.                                    |
| **VinceNFTFloorService**    | NFT floor prices                   | NFT action only.                                                   |
| **VinceLifestyleService**   | Daily suggestions                  | Lifestyle action only.                                             |
| **VinceHIP3Service**        | Stocks, commodities, indices       | TradFi; not crypto perps.                                          |
| **VinceWatchlistService**   | Early detection watchlist          | Not used as an aggregator source; could filter or add weak signal. |
| **VinceAlertService**       | Price/signal alerts                | Alerts only; not voting in aggregator.                             |

**DVOL** (Deribit volatility index) is used for position sizing / regime (e.g. cap size when vol is high) but does not appear as its own **source** name in "N sources"; it’s part of context/ML.

---

## Sources (in aggregator order)

| #   | Source                  | What it adds                                                                                                                                 | Enabling / config                                                                                                                                                    |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **CoinGlass**           | Funding, L/S ratio, OI level, OI 24h change, Fear/Greed. Always registered; now emits 5–8 factors (funding, L/S, OI, OI change, fear/greed). | No key → uses free Binance fallback for data. **COINGLASS_API_KEY** (Hobbyist) → better coverage and stability.                                                      |
| 2   | **TopTraders**          | Whale positioning from Hyperliquid.                                                                                                          | **VINCE_TOP_TRADERS_SERVICE** is registered. Needs wallet/watchlist config for HL whales; if none, may return no signal.                                             |
| 3   | **Binance** (intel)     | Top trader positions %, taker buy/sell ratio, OI trend, funding extremes.                                                                    | **VINCE_BINANCE_SERVICE** – **no API key**. Public endpoints. Should always contribute when conditions hit (e.g. taker flow >1.3 or <0.7, OI drop, extreme funding). |
| 4   | **BinanceLiquidations** | Cascade and per-symbol liquidation pressure.                                                                                                 | **VINCE_BINANCE_LIQUIDATION_SERVICE** – no key. Contributes when cascade or pressure detected.                                                                       |
| 5   | **NewsSentiment**       | Bullish/bearish news from MandoMinutes.                                                                                                      | **VINCE_NEWS_SENTIMENT_SERVICE**. Depends on MandoMinutes cache (plugin-web-search **MANDO_MINUTES**). Ensure that action/cache is populated.                        |
| 5b  | **XSentiment**          | X (Twitter) search sentiment for BTC/ETH/SOL/HYPE. **Default weight: 0.5** (see below).                                                        | **VINCE_X_SENTIMENT_SERVICE**. Depends on **X_BEARER_TOKEN** and **VinceXResearchService**. Staggered refresh: **one asset per hour** by default (no burst; 24 assets = full cycle every 24h); cache file `.elizadb/vince-paper-bot/x-sentiment-cache.json`. Set X_SENTIMENT_ENABLED=false to disable. Optional cron: `bun run scripts/x-vibe-check.ts` (see script header).      |
| 6   | **Deribit**             | IV skew (fear/greed from options).                                                                                                           | **VINCE_DERIBIT_SERVICE** – registered; may use fallback. Contributes for BTC/ETH/SOL when skew is fearful or bullish.                                               |
| 7   | **MarketRegime**        | Bullish/bearish/volatile from 24h price + sentiment.                                                                                         | **VINCE_MARKET_DATA_SERVICE** (enriched context). Uses CoinGlass/CoinGecko. Contributes when regime is not neutral.                                                  |
| 8   | **Sanbase**             | Exchange flows, whale activity.                                                                                                              | **VINCE_SANBASE_SERVICE** + **isConfigured()**. Needs **SANBASE_API_KEY** (or similar). If not configured, skipped.                                                  |
| 9   | **Hyperliquid**         | Perps bias, crowding, OI cap, funding extreme (history-based), cross-venue funding.                                                          | Via `getOrCreateHyperliquidService(runtime)` (fallback). Uses `perpsAtOpenInterestCap` and `fundingHistory` APIs. Contributes when HL data available.                |
| 10  | **Deribit** (P/C, DVOL) | Put/call ratio, DVOL.                                                                                                                        | Same Deribit service; adds factors when data available.                                                                                                              |

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

### How to test X sentiment

1. **Unit tests** – From repo root:
   ```bash
   bun test src/plugins/plugin-vince/src/__tests__/xSentiment.service.test.ts
   ```
   Confirms cache, refresh, rate-limit backoff, and `getTradingSentiment` shape.

2. **Live: see XSentiment in the algo** – Start VINCE with `X_BEARER_TOKEN` set (and not rate limited). After first refresh (within 1h with default stagger) or on the next aggregation:
   - Logs: look for `[VinceSignalAggregator] ASSET: N source(s) → M factors | Sources: ..., XSentiment` when X sentiment confidence ≥ 40.
   - Paper trade banner: when a trade opens, **WHY THIS TRADE** can list e.g. `X sentiment bullish (50% confidence)` if XSentiment contributed.
   - Debug: `LOG_LEVEL=debug` shows `tried but no contribution: XSentiment` when the source was tried but confidence was too low or cache empty/rate limited.

3. **Rate limit** – If you see `[VinceXSentimentService] X API rate limited. Skipping refresh for N min`, the service backs off and keeps serving cached sentiment (or neutral) until the reset time; no further X calls until then.

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
- [IMPROVEMENT_WEIGHTS_AND_TUNING.md](./IMPROVEMENT_WEIGHTS_AND_TUNING.md) — Threshold tunables, improvement report (holdout_metrics), run-improvement-weights
- [ML_IMPROVEMENT_PROOF.md](./ML_IMPROVEMENT_PROOF.md) — How to prove ML improves the algo (validate_ml_improvement, tests)
