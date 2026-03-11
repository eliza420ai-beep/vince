# Sentinel Data Sources — Deep Reference

> **Last updated:** 2026-02-17
> **Purpose:** Comprehensive reference for every data source feeding the Vince paper trading bot.
> Covers signal weights, API details, tier analysis, and the data source hunting mandate.

---

## Table of Contents

1. [Signal Aggregator Source Weights](#signal-aggregator-source-weights)
2. [Bull/Bear Analyzer Weights](#bullbear-analyzer-weights)
3. [Services & APIs Reference](#services--apis-reference)
4. [API Tier Analysis](#api-tier-analysis)
5. [Data Source Hunting Mandate](#data-source-hunting-mandate)
6. [Data Source Wishlist](#data-source-wishlist)
7. [Infrastructure Services](#infrastructure-services)

---

## Signal Aggregator Source Weights

Source: `dynamicConfig.ts` → `DEFAULT_SOURCE_WEIGHTS`

The signal aggregator produces a composite directional signal per asset. Each source emits a
signal in the range `[-1, +1]` (short ↔ long). The weight multiplies that signal before
aggregation. Higher weight = more influence on the final trade decision.

### Tier 1 — High Impact (weight 1.2–2.0)

These sources have the strongest empirical edge. They capture forced liquidations, extreme
funding, and options flow — all of which have immediate, measurable price impact.

| Source                        | Weight   | Direction                   | Data                                                                                                          | Provider                                                            | Cost                            |
| ----------------------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| **LiquidationCascade**        | **2.0**  | Contrarian                  | Cascading forced liquidations detected via volume/time clustering                                             | Binance WebSocket (`wss://fstream.binance.com/ws/!forceOrder@arr`)  | FREE                            |
| **LiquidationPressure**       | **1.6**  | Directional                 | Accumulated liquidation pressure over rolling window; net long liqs → bearish, net short liqs → bullish       | Binance WebSocket (same stream)                                     | FREE                            |
| **BinanceFundingExtreme**     | **1.5**  | Contrarian (mean-reversion) | Funding rate in top/bottom decile of 30-day history → fade the crowd                                          | Binance public API (`/fapi/v1/fundingRate`)                         | FREE                            |
| **DeribitPutCallRatio**       | **1.4**  | Contrarian                  | Options put/call ratio; extreme readings signal fear (high P/C) or greed (low P/C)                            | Deribit public API (`/public/get_book_summary_by_currency`)         | FREE (rate limited: 20 req/sec) |
| **HyperliquidCrowding**       | **1.4**  | Contrarian                  | Crowding classification: `extreme_long`, `long`, `neutral`, `short`, `extreme_short` based on OI distribution | Hyperliquid API (`/info` → `metaAndAssetCtxs`)                      | FREE                            |
| **HyperliquidFundingExtreme** | **1.35** | Contrarian (mean-reversion) | HL funding rate in top/bottom 10% of rolling history                                                          | Hyperliquid API (`/info` → funding data)                            | FREE                            |
| **HyperliquidOICap**          | **1.2**  | Contrarian                  | Perp asset at its OI cap = maximum crowding, high contrarian signal                                           | Hyperliquid API (`/info` → `metaAndAssetCtxs`, compare OI vs maxOi) | FREE                            |

**Why Tier 1 matters:** Liquidation cascades are the single strongest short-term signal.
When a cascade triggers, it forces market orders that move price mechanically. The 2.0 weight
reflects this — it's the highest weight in the entire system.

**Key thresholds (from codebase):**

- Liquidation cascade: ≥3 liquidations in same direction within 500ms window
- Funding extreme: funding rate > 90th percentile or < 10th percentile of 30-day history
- Crowding: OI concentration > 70% in one direction = `extreme_long`/`extreme_short`
- OI cap: asset OI ≥ 95% of maxOi field

### Tier 2 — Smart Money (weight 0.9–1.3)

These capture institutional positioning, cross-venue arbitrage, and derivatives flow.
Reliable but less immediate than Tier 1.

| Source                   | Weight  | Direction                   | Data                                                                                               | Provider                                                         | Cost                                                    |
| ------------------------ | ------- | --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **HIP3Funding**          | **1.3** | Contrarian (mean-reversion) | Per-asset funding rate on HIP-3 DEX perps; extreme funding → fade                                  | Hyperliquid API                                                  | FREE                                                    |
| **SanbaseExchangeFlows** | **1.2** | Directional                 | Net exchange inflows (bearish — selling) vs outflows (bullish — accumulating)                      | Santiment/Sanbase GraphQL API                                    | FREE TIER: **30-day lag**. Paid: real-time              |
| **CrossVenueFunding**    | **1.2** | Arbitrage                   | Funding rate divergence between HL and CEX (Binance); large spread → mean-reversion opportunity    | Composite (HL + Binance APIs)                                    | FREE                                                    |
| **BinanceTopTraders**    | **1.0** | Contrarian                  | Top trader long/short ratio from Binance (top 20% by account size)                                 | Binance public API (`/futures/data/topLongShortAccountRatio`)    | FREE                                                    |
| **CoinGlass**            | **1.0** | Composite                   | Aggregated funding rates, L/S ratios, Fear/Greed index, open interest across exchanges             | CoinGlass API (`api.coinglass.com/api/`)                         | API key: `COINGLASS_API_KEY`. Free tier: ~100 calls/day |
| **BinanceTakerFlow**     | **1.0** | Directional                 | Taker buy volume / taker sell volume ratio; >1 = buyers aggressive, <1 = sellers aggressive        | Binance public API (`/futures/data/takerlongshortRatio`)         | FREE                                                    |
| **HIP3Momentum**         | **1.0** | Momentum                    | 24h price change on HIP-3 DEX assets; strong momentum continues (trend-following)                  | Hyperliquid API + DexScreener                                    | FREE                                                    |
| **DeribitIVSkew**        | **1.0** | Sentiment                   | IV surface skew classification: `fearful` (puts expensive), `neutral`, `bullish` (calls expensive) | Deribit public API (`/public/get_order_book`)                    | FREE (rate limited)                                     |
| **HyperliquidBias**      | **1.0** | Directional                 | Overall options bias derived from HL options flow                                                  | Hyperliquid API                                                  | FREE                                                    |
| **MarketRegime**         | **1.0** | Regime                      | Composite regime detection: `bullish`, `bearish`, `volatile`, `neutral`. Uses multiple sub-signals | Composite (internal)                                             | FREE                                                    |
| **BinanceLongShort**     | **0.9** | Contrarian                  | Global (all accounts) long/short ratio from Binance futures                                        | Binance public API (`/futures/data/globalLongShortAccountRatio`) | FREE                                                    |

**Key thresholds:**

- Exchange flows: net inflow > 2 std devs above 7-day mean = strong bearish signal
- Cross-venue funding: spread > 0.01% (annualized > 3.65%) = actionable divergence
- Top traders: L/S ratio > 2.0 or < 0.5 = extreme (contrarian signal)
- Taker flow: ratio > 1.3 or < 0.7 = strong directional pressure
- Fear/Greed: < 20 = extreme fear (bullish contrarian), > 80 = extreme greed (bearish contrarian)

### Tier 3 — Lower Signal (weight 0.5–0.8)

Supplementary signals. Useful for confirmation, not primary trade drivers.

| Source             | Weight  | Direction   | Data                                                                                                      | Provider                                              | Cost                   |
| ------------------ | ------- | ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| **HIP3OIBuild**    | **0.8** | Contrarian  | OI/volume ratio on HIP-3 assets; high ratio = position buildup without volume → crowded, contrarian fade  | Hyperliquid API                                       | FREE                   |
| **BinanceOIFlush** | **0.7** | Directional | OI dropping sharply = forced position closure (flush); directional signal based on which side got flushed | Binance public API (`/futures/data/openInterestHist`) | FREE                   |
| **NewsSentiment**  | **0.6** | Directional | Composite: MandoMinutes crypto analysis, NASDAQ futures change, BTC ETF flows, macro risk events          | Multiple (MandoMinutes, Yahoo Finance, ETF providers) | Mixed                  |
| **XSentiment**     | **0.5** | Contrarian  | X/Twitter sentiment analysis; staggered polling (1 asset/hour), results cached 24h                        | X API or scraping                                     | Requires X API access  |
| **GrokExpert**     | **0.5** | Directional | Daily Grok auto-pulse: AI-generated market narrative and directional bias                                 | xAI API                                               | Requires `XAI_API_KEY` |

**Key thresholds:**

- OI build: OI/volume ratio > 3.0 = extreme buildup (contrarian)
- OI flush: OI drops > 15% in 4h = significant flush
- News sentiment: normalized score [-1, +1], only acts when |score| > 0.3
- X sentiment: contrarian when sentiment > 0.7 or < -0.7 (crowd extremes)

### Disabled Sources (weight 0.0)

| Source            | Weight  | Reason                                                                 | Fix Required                                              |
| ----------------- | ------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| **TopTraders**    | **0.0** | Wallet tracking disabled — `wallets.json` contains no real addresses   | Add real whale wallet addresses to `wallets.json`         |
| **SanbaseWhales** | **0.0** | Free tier has 30-day lag on whale metrics — useless for active trading | Upgrade to Sanbase paid plan ($49/mo) or find alternative |

---

## Bull/Bear Analyzer Weights

Source: `analysis.ts` → `DEFAULT_ANALYSIS_WEIGHTS`

The bull/bear analyzer runs a separate, broader analysis pipeline. These weights determine
how much each data category contributes to the overall bull/bear score (0–100 scale).

| Category          | Weight | What It Captures                                                            | Service                    | Status                                  |
| ----------------- | ------ | --------------------------------------------------------------------------- | -------------------------- | --------------------------------------- |
| **CoinGlass**     | **20** | Aggregated funding rates, L/S ratios, Fear/Greed index, OI across exchanges | `coinglass.service.ts`     | ✅ Active                               |
| **Deribit**       | **15** | IV surface, DVOL (Deribit Volatility Index), put/call skew                  | `deribit.service.ts`       | ✅ Active                               |
| **Sanbase**       | **15** | Exchange flows, network activity (DAA, tx volume), whale sentiment          | `sanbase.service.ts`       | ⚠️ 30-day lag on free tier              |
| **Nansen**        | **15** | Smart money flows, token accumulation/distribution by labeled wallets       | `nansen.service.ts`        | ❌ Requires paid API (`NANSEN_API_KEY`) |
| **TopTraders**    | **15** | Whale positioning on Hyperliquid (specific wallet tracking)                 | `topTraders.service.ts`    | ❌ Disabled (no wallet addresses)       |
| **NewsSentiment** | **10** | News flow analysis, macro events, ETF flows                                 | `newsSentiment.service.ts` | ✅ Active                               |
| **PriceAction**   | **10** | 24h price momentum from CoinGecko                                           | `coingecko.service.ts`     | ✅ Active                               |

**Note:** 30 out of 100 weight points (Nansen + TopTraders) are currently non-functional.
This means the active system runs on effectively 70% of its designed capacity. Fixing either
of these would meaningfully improve signal quality.

---

## Services & APIs Reference

### Core Trading Data Services

#### 1. CoinGlass (`coinglass.service.ts`)

- **API:** `https://api.coinglass.com/api/`
- **Auth:** `COINGLASS_API_KEY` (header: `coinglassSecret`)
- **Data:** Funding rates (all exchanges), long/short ratios, Fear/Greed index, open interest, liquidation data
- **Rate limit:** Free tier ~100 calls/day, paid tier 1000+/day
- **Used by:** Signal aggregator (weight 1.0), Bull/Bear analyzer (weight 20)
- **Endpoints used:**
  - `/api/pro/v1/futures/funding_rates_chart` — Funding rates
  - `/api/pro/v1/futures/longShort_chart` — L/S ratios
  - `/api/pro/v1/index/fear-greed-history` — Fear/Greed
  - `/api/pro/v1/futures/openInterest_chart` — OI

#### 2. Binance (`binance.service.ts`)

- **API:** `https://fapi.binance.com`
- **Auth:** None required (public endpoints)
- **Data:** Top trader L/S, taker buy/sell ratio, global L/S, OI history, funding rate
- **Rate limit:** 2400 request weight/min (generous)
- **Used by:** Multiple signal sources (BinanceTopTraders, BinanceTakerFlow, BinanceLongShort, BinanceOIFlush, BinanceFundingExtreme)
- **Endpoints used:**
  - `/futures/data/topLongShortAccountRatio` — Top traders
  - `/futures/data/takerlongshortRatio` — Taker flow
  - `/futures/data/globalLongShortAccountRatio` — Global L/S
  - `/futures/data/openInterestHist` — OI history
  - `/fapi/v1/fundingRate` — Funding rates

#### 3. Binance Liquidation (`binanceLiquidation.service.ts`)

- **API:** `wss://fstream.binance.com/ws/!forceOrder@arr`
- **Auth:** None (public WebSocket)
- **Data:** Real-time forced liquidation orders across all Binance futures pairs
- **Rate limit:** N/A (persistent WebSocket)
- **Used by:** LiquidationCascade (weight 2.0), LiquidationPressure (weight 1.6)
- **Implementation:** Maintains rolling window of liquidation events, detects cascades via clustering algorithm

#### 4. Deribit (`deribit.service.ts`)

- **API:** `https://www.deribit.com/api/v2`
- **Auth:** None (public endpoints)
- **Data:** DVOL (volatility index), IV surface, put/call ratio, order book depth
- **Rate limit:** 20 requests/second (non-matching engine)
- **Used by:** DeribitPutCallRatio (weight 1.4), DeribitIVSkew (weight 1.0), Bull/Bear analyzer (weight 15)
- **Endpoints used:**
  - `/public/get_book_summary_by_currency` — Options summaries
  - `/public/get_order_book` — Per-instrument order book + IV
  - `/public/get_index_price` — Index prices
  - `/public/ticker` — DVOL

#### 5. Santiment/Sanbase (`sanbase.service.ts`)

- **API:** `https://api.santiment.net/graphql`
- **Auth:** `SANBASE_API_KEY` (Bearer token)
- **Data:** Exchange flows (in/out), network activity (DAA, tx volume), whale transactions, MVRV
- **Rate limit:** Free tier: 30-day lag on most metrics, 100 API credits/month. Paid ($49/mo): real-time, 5000 credits
- **Used by:** SanbaseExchangeFlows (weight 1.2), Bull/Bear analyzer (weight 15), SanbaseWhales (disabled)
- **Critical limitation:** Free tier 30-day lag makes most data useless for active trading

#### 6. Nansen (`nansen.service.ts`)

- **API:** `https://api.nansen.ai/`
- **Auth:** `NANSEN_API_KEY` (required)
- **Data:** Smart money flows, token accumulation/distribution, labeled wallet activity
- **Rate limit:** Varies by plan
- **Cost:** Paid only — starts at $150/mo for API access
- **Used by:** Bull/Bear analyzer (weight 15)
- **Status:** ❌ Not active (no API key configured)

#### 7. Top Traders / Whale Tracking (`topTraders.service.ts`)

- **API:** Hyperliquid API (`https://api.hyperliquid.xyz/info`)
- **Auth:** None
- **Data:** Position tracking for specific whale wallets on Hyperliquid
- **Used by:** Bull/Bear analyzer (weight 15)
- **Status:** ❌ Disabled — requires real wallet addresses in `wallets.json`
- **Fix:** Research and add known whale/fund wallet addresses

#### 8. HIP-3 DEX Assets (`hip3.service.ts`)

- **API:** Hyperliquid API (`https://api.hyperliquid.xyz/info`)
- **Auth:** None
- **Data:** Funding rates, price momentum, OI for HIP-3 (DEX-listed) perp assets
- **Rate limit:** Generous (no published limit, but be reasonable)
- **Used by:** HIP3Funding (1.3), HIP3Momentum (1.0), HIP3OIBuild (0.8)

#### 9. News Sentiment (`newsSentiment.service.ts`)

- **Sources:** MandoMinutes analysis feed, Yahoo Finance (NASDAQ futures), ETF flow trackers
- **Data:** Crypto news sentiment, macro risk events, BTC ETF daily flows, NASDAQ correlation
- **Used by:** NewsSentiment signal (weight 0.6), Bull/Bear analyzer (weight 10)

#### 10. X/Twitter Sentiment (`xSentiment.service.ts`)

- **API:** X API v2 or scraping fallback
- **Auth:** X API Bearer token or scraping credentials
- **Data:** Sentiment analysis of crypto Twitter; staggered 1 asset/hour, cached 24h
- **Used by:** XSentiment (weight 0.5)
- **Rate limit:** X API free tier: 1500 tweets/month read. Basic ($100/mo): 10,000 tweets/month

#### 11. CoinGecko (`coingecko.service.ts`)

- **API:** `https://api.coingecko.com/api/v3`
- **Auth:** None (free tier) or `CG_API_KEY` (paid)
- **Data:** Price data, 24h/7d change, market cap, volume
- **Rate limit:** Free: 10-30 calls/min. Paid ($129/mo): 500 calls/min
- **Used by:** PriceAction in Bull/Bear analyzer (weight 10)

#### 12. Market Regime (`marketRegime.service.ts`)

- **Type:** Composite (internal)
- **Inputs:** Volatility (from Deribit DVOL), trend (from price action), funding extremes, liquidation activity
- **Output:** Regime classification: `bullish`, `bearish`, `volatile`, `neutral`
- **Used by:** MarketRegime signal (weight 1.0), position sizing adjustments

#### 13. DexScreener (`dexscreener.service.ts`)

- **API:** `https://api.dexscreener.com/latest/dex/`
- **Auth:** None
- **Data:** DEX token pair data, price, volume, liquidity for HIP-3 tokens
- **Rate limit:** 300 requests/min
- **Used by:** HIP-3 token data enrichment

### Support Services (Non-Signal)

#### 14. Market Data Aggregation (`marketData.service.ts`)

- Central aggregation layer for price/volume data across services

#### 15. Meteora (`meteora.service.ts`)

- Solana DEX integration for LP and swap data. FREE.

#### 16. Allium (`allium.service.ts`)

- On-chain data queries. Used for exploratory data analysis.

#### 17. X Research (`xResearch.service.ts`)

- Extended X/Twitter research pipeline for deep-dive analysis.

#### 18. Watchlist (`watchlist.service.ts`)

- Asset watchlist management — determines which assets get analyzed.

#### 19. Weight Bandit (`weightBandit.service.ts`)

- Multi-armed bandit algorithm for dynamic source weight optimization.
- Learns from trade outcomes to adjust source weights over time.
- Explores new weight configurations with epsilon-greedy strategy.

#### 20. Signal Similarity (`signalSimilarity.service.ts`)

- Detects when multiple signals are saying the same thing (correlated signals).
- Prevents duplicate trades from redundant signal sources.

#### 21. ML Inference (`mlInference.service.ts`)

- ONNX runtime integration for ML model inference.
- Runs trained models on feature vectors to produce trade signals.

#### 22. Feature Store (`vinceFeatureStore.service.ts`)

- Stores feature vectors for ML model training.
- Captures snapshots of all signal values at trade decision points.
- Used for offline model training and backtesting.

#### 23. Parameter Tuner (`parameterTuner.service.ts`)

- Auto-tuning of signal thresholds based on rolling performance.
- Adjusts sensitivity of individual signals based on hit rate.

---

## API Tier Analysis

### Free & Fully Functional

| Service                | What You Get                                            | Limitations                        | ROI                            |
| ---------------------- | ------------------------------------------------------- | ---------------------------------- | ------------------------------ |
| **Binance Public API** | Top traders, taker flow, L/S, OI, funding, liquidations | 2400 weight/min (more than enough) | ★★★★★ Best free data source    |
| **Hyperliquid API**    | Funding, OI, crowding, HIP-3 data, wallet positions     | No published rate limit            | ★★★★★ Essential for HL trading |
| **Deribit Public API** | DVOL, IV surface, put/call, order books                 | 20 req/sec                         | ★★★★☆ Excellent options data   |
| **DexScreener**        | DEX pair data, price, volume                            | 300 req/min                        | ★★★☆☆ Useful for HIP-3         |
| **CoinGecko Free**     | Prices, 24h change, market cap                          | 10-30 calls/min                    | ★★★☆☆ Basic but reliable       |

### Free But Degraded

| Service       | What You Get Free                          | What You Miss                               | Upgrade Cost         | Worth It?                                                   |
| ------------- | ------------------------------------------ | ------------------------------------------- | -------------------- | ----------------------------------------------------------- |
| **Sanbase**   | 30-day lagged exchange flows, network data | Real-time flows, whale alerts, full history | $49/mo (Sanbase Pro) | **YES** — real-time exchange flows are high-signal          |
| **CoinGlass** | ~100 calls/day: funding, L/S, Fear/Greed   | Higher rate limits, more granular data      | $30-80/mo            | **Maybe** — already getting core data from Binance directly |
| **X API**     | 1500 tweets/month read                     | Meaningful search volume, streaming         | $100/mo (Basic)      | **No** — scraping or Grok covers this adequately            |

### Paid Only (Not Currently Active)

| Service       | What You'd Get                                 | Cost     | Signal Value                 | Priority                                  |
| ------------- | ---------------------------------------------- | -------- | ---------------------------- | ----------------------------------------- |
| **Nansen**    | Smart money labels, wallet flows, accumulation | $150+/mo | High (weight 15 in analyzer) | **Medium** — expensive but unique data    |
| **Kaiko**     | Institutional-grade market data, order flow    | $500+/mo | Medium-High                  | **Low** — too expensive for paper trading |
| **The Block** | Research, institutional flow data              | $300+/mo | Low-Medium                   | **Low**                                   |

### Cost-Benefit Summary

Current monthly cost: **~$0** (everything on free tiers + own API keys for CoinGlass)

**Recommended upgrades in priority order:**

1. **Sanbase Pro ($49/mo)** — Unlocks real-time exchange flows. Directly activates SanbaseExchangeFlows at full power and re-enables SanbaseWhales. Biggest bang for buck.
2. **Real whale addresses in wallets.json ($0)** — Just research. Re-enables TopTraders (weight 15 in analyzer). Free.
3. **CoinGlass paid ($30/mo)** — More API calls, but marginal since we get most data from Binance directly.

---

## Data Source Hunting Mandate

Sentinel should continuously evaluate and integrate new data sources. The signal edge decays
as more participants use the same data. Diversification of data sources is a moat.

### Priority Order for New Sources

#### Priority 1: On-Chain Data (Free or Cheap)

- Whale wallet movements (large transfers to/from exchanges)
- DEX flow aggregation (Uniswap, Curve, Aave liquidation queues)
- Staking/unstaking flows (beacon chain deposits/withdrawals)
- Bridge flows (cross-chain movement patterns)
- Mempool analysis (pending large transactions)

#### Priority 2: Maximize Free Tier APIs

Already excellent coverage:

- ✅ Binance — fully utilized (top traders, taker flow, L/S, OI, liquidations, funding)
- ✅ Deribit — fully utilized (DVOL, IV, P/C, skew)
- ✅ Hyperliquid — fully utilized (funding, OI, crowding, HIP-3)
- ✅ DexScreener — utilized for HIP-3
- ⚠️ CoinGecko — only using price/24h change; could add volume analysis, trending coins

#### Priority 3: Social Signals

- X/Twitter — partially active (XSentiment, weight 0.5)
- Discord — not integrated (could monitor alpha channels)
- Telegram — not integrated (could monitor signal groups)
- Reddit — not integrated (r/cryptocurrency sentiment)

#### Priority 4: Institutional Signals

- BTC/ETH ETF daily flows — partially captured via NewsSentiment
- CME futures basis and OI — not integrated
- Grayscale premium/discount — not integrated
- CBOE VIX correlation — not integrated

#### Priority 5: Alternative Data

- GitHub commit activity (developer sentiment) — not integrated
- Google Trends for crypto terms — not integrated
- App store rankings for exchange apps — not integrated
- Stablecoin supply changes (USDT/USDC mint/burn) — not integrated

---

## Data Source Wishlist

Concrete APIs to evaluate for integration. Each entry includes what data is available,
free tier limitations, what it would add to the algo, and estimated signal weight.

### Arkham Intelligence

- **URL:** `https://api.arkhamintelligence.com/`
- **Data:** Labeled wallet tracking (exchanges, funds, whales), entity-level flow analysis
- **Free tier:** Limited API access, basic wallet labels
- **What it adds:** Replace our empty `wallets.json` with Arkham-labeled whale addresses. Track smart money movement in real-time without manually curating addresses.
- **Estimated weight:** 1.2–1.5 (replaces TopTraders which is currently 0.0)
- **Priority:** ★★★★★ — This is the easiest win. Free wallet labels → re-enable whale tracking.

### Glassnode

- **URL:** `https://api.glassnode.com/v1/metrics/`
- **Data:** On-chain metrics: SOPR, NUPL, exchange netflow, miner outflows, HODL waves, realized cap
- **Free tier:** Limited to 24h resolution, 10+ metrics, BTC only
- **Paid:** $29/mo (Advanced) for 1h resolution, all assets; $799/mo for 10min resolution
- **What it adds:** Deep on-chain analytics that Sanbase partially covers. SOPR and NUPL are unique.
- **Estimated weight:** 1.0–1.3 for exchange netflow, 0.8 for SOPR/NUPL
- **Priority:** ★★★☆☆ — Overlaps with Sanbase. Only if Sanbase free tier remains too lagged.

### DefiLlama

- **URL:** `https://api.llama.fi/` (no auth needed)
- **Data:** TVL by protocol/chain, yield rates, stablecoin flows, bridge volumes, DEX volumes
- **Free tier:** Fully free, no API key required, generous rate limits
- **What it adds:** TVL changes as risk-on/risk-off indicator. Stablecoin supply changes. Bridge flow direction (capital moving to which chain). Yield compression as leverage indicator.
- **Estimated weight:** 0.8–1.0 (TVL momentum), 0.7 (stablecoin flows)
- **Priority:** ★★★★★ — Completely free, high-quality data, easy integration.

### Kaiko

- **URL:** `https://us.market-api.kaiko.io/`
- **Data:** Institutional-grade OHLCV, order book snapshots, trade data, cross-exchange aggregation
- **Free tier:** None (trial only)
- **Paid:** Starting ~$500/mo
- **What it adds:** Higher quality market microstructure data, better VWAP, spread analysis
- **Estimated weight:** 1.0–1.2 (order flow analysis)
- **Priority:** ★☆☆☆☆ — Too expensive for the marginal improvement over Binance direct data.

### Token Terminal

- **URL:** `https://api.tokenterminal.com/v2/`
- **Data:** Protocol fundamentals: revenue, fees, P/S ratio, active developers, TVL
- **Free tier:** Limited metrics, daily resolution
- **Paid:** $325/mo for full API
- **What it adds:** Fundamental analysis layer. Revenue trends as medium-term signal.
- **Estimated weight:** 0.5–0.7 (fundamental momentum, very slow signal)
- **Priority:** ★★☆☆☆ — Too slow for short-term trading. Better for portfolio allocation.

### Flipside Crypto

- **URL:** `https://flipsidecrypto.xyz/` (SQL-based)
- **Data:** On-chain SQL queries across EVM chains, Solana, Cosmos. Any metric you can write SQL for.
- **Free tier:** 5,000 query seconds/month, community dashboards
- **What it adds:** Custom on-chain analytics: whale tracking, DEX flow, bridge patterns. Fully customizable.
- **Estimated weight:** Depends on query — 0.8–1.5 for well-designed whale flow queries
- **Priority:** ★★★★☆ — Powerful but requires SQL development work. High ceiling.

### Dune Analytics

- **URL:** `https://api.dune.com/api/v1/`
- **Data:** On-chain SQL (similar to Flipside). Huge community query library.
- **Free tier:** 2,500 API credits/month, 10 queries/min
- **Paid:** $349/mo for 1M credits
- **What it adds:** Same as Flipside — custom on-chain analytics. Larger community = more pre-built queries to fork.
- **Estimated weight:** 0.8–1.5 depending on queries
- **Priority:** ★★★★☆ — Slightly better ecosystem than Flipside. Free tier is usable.

### The Block

- **URL:** `https://www.theblock.co/api/` (research API)
- **Data:** Institutional research, exchange volume, mining data, DeFi metrics
- **Free tier:** None for API
- **Paid:** $300+/mo
- **What it adds:** Institutional-grade metrics, but mostly available elsewhere
- **Estimated weight:** 0.5–0.8
- **Priority:** ★☆☆☆☆ — Data available cheaper elsewhere.

### Messari

- **URL:** `https://data.messari.io/api/`
- **Data:** Asset profiles, on-chain metrics, market data, governance data
- **Free tier:** Basic market data, asset profiles (generous)
- **Paid:** $29/mo (Pro) for full API
- **What it adds:** Clean asset metadata, governance events (which can move prices), sector rotation data
- **Estimated weight:** 0.5–0.7 (governance events), 0.3 (sector rotation — very slow)
- **Priority:** ★★☆☆☆ — Nice to have, not critical.

### Alternative.me Fear & Greed Index

- **URL:** `https://api.alternative.me/fng/`
- **Data:** Crypto Fear & Greed index (0-100)
- **Free tier:** Fully free, no key needed
- **What it adds:** Already captured via CoinGlass. Direct integration would remove CoinGlass dependency for this metric.
- **Estimated weight:** Already included in CoinGlass signal (weight 1.0)
- **Priority:** ★★☆☆☆ — Redundant but could be useful as fallback.

### CME BTC/ETH Futures

- **URL:** Various (CME DataMine, or via CoinGlass)
- **Data:** CME basis, OI, volume — institutional positioning proxy
- **Free tier:** Delayed data via CoinGlass; real-time requires CME data license
- **What it adds:** Institutional flow direction. CME OI build = institutional interest.
- **Estimated weight:** 1.0–1.3 (institutional positioning)
- **Priority:** ★★★☆☆ — Valuable signal but hard to get cheaply in real-time.

### Stablecoin Supply Trackers

- **URL:** DefiLlama (`/stablecoins`) or Glassnode
- **Data:** USDT/USDC mint/burn events, total supply changes
- **Free tier:** DefiLlama = free; Glassnode = limited free
- **What it adds:** Large stablecoin mints = capital inflow (bullish). Burns = outflow (bearish). Leading indicator.
- **Estimated weight:** 0.8–1.0
- **Priority:** ★★★★☆ — Easy via DefiLlama, meaningful signal.

---

## Integration Priority Roadmap

### Immediate (Zero Cost)

1. **Add whale addresses to wallets.json** — Re-enables TopTraders (15 weight in analyzer)
2. **DefiLlama integration** — TVL, stablecoin flows, bridge data. Completely free.
3. **Arkham Intelligence free tier** — Wallet labels to populate wallets.json automatically
4. **Alternative.me direct** — Fear/Greed fallback if CoinGlass is down

### Short-Term ($50-100/mo)

5. **Sanbase Pro upgrade ($49/mo)** — Real-time exchange flows. Biggest paid upgrade ROI.
6. **Dune Analytics free tier** — Custom on-chain queries for whale tracking

### Medium-Term ($100-300/mo)

7. **Nansen API** — Smart money labels and flow tracking
8. **CoinGecko Pro ($129/mo)** — Only if rate limiting becomes an issue

### Long-Term (Evaluate After Profitability)

9. **Kaiko** — Institutional market microstructure
10. **CME real-time data** — Institutional futures positioning

---

## Appendix: Weight Optimization

The `weightBandit.service.ts` implements a multi-armed bandit that dynamically adjusts
source weights based on observed trade outcomes. The weights listed in this document are
the **defaults** — the bandit may adjust them ±30% based on recent performance.

**Bandit parameters:**

- Epsilon (exploration rate): 0.1 (10% of weight updates are random exploration)
- Learning rate: 0.05 (slow adaptation to avoid overfitting)
- Window: 100 most recent trades
- Constraint: weights stay within [0.5× default, 2.0× default] range

The `parameterTuner.service.ts` separately tunes signal thresholds (not weights) based on
hit rate analysis. If a signal's thresholds are too tight (missing good trades) or too loose
(too many false positives), the tuner adjusts automatically.

**Together, these two systems mean the default weights and thresholds in this document are
starting points. The live system may have diverged based on actual trading performance.**

---

_This document should be updated whenever new data sources are added or weights change
significantly. Check `dynamicConfig.ts` and `analysis.ts` for current values._
