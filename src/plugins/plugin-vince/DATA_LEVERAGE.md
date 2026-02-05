# Leveraging more data points in the trading algo

**TL;DR:** We have many more data points available than are currently used. The feature store schema and the training script’s **suggested_signal_factors** (in `training_metadata.json`) list exactly which fields are present but 0% or low % non-null. This doc maps those to sources and next steps.

---

## Where “unused” shows up

- **Feature store:** `vinceFeatureStore.service.ts` → `collectMarketFeatures()` (and `collectNewsFeatures()`, `collectSignalFeatures()`). Any field we don’t populate stays `null` or `0`.
- **Training:** `train_models.py` flattens records to `market_*`, `signal_*`, `news_*`, etc. It only uses columns that exist and are in each model’s `feature_cols` (or optional lists).
- **Improvement report:** After training, `suggested_signal_factors` lists factors that are predictive in theory but **missing or mostly null** in your data — i.e. “consider populating” these next. The report also includes **holdout_metrics** (AUC, MAE, quantile loss per model) for drift/sizing checks; see [PARAMETER_IMPROVEMENT.md](scripts/PARAMETER_IMPROVEMENT.md) and [IMPROVEMENT_WEIGHTS_AND_TUNING.md](IMPROVEMENT_WEIGHTS_AND_TUNING.md).

---

## Data we just started using (already wired)

| Factor (suggested_signal_factors name) | Feature store field | Source | Status |
|----------------------------------------|---------------------|--------|--------|
| OI change 24h | `market.oiChange24h` | CoinGlass `getOpenInterest(asset).change24h` | Populated in `collectMarketFeatures` |
| DVOL / volatility index | `market.dvol` | MarketData `getDVOL(asset)` (Deribit) | Populated |
| RSI (14) | `market.rsi14` | MarketData `estimateRSI(asset)` | Populated |
| (ATR already used) | `market.atrPct` | MarketData `getATRPercent(asset)` | Now live from Deribit when available |

Training script now includes `market_dvol`, `market_rsi14`, `market_oiChange24h` (and `market_atrPct` for position sizing) in the feature lists when present.

---

## Data now wired (latest batch)

| Factor | Feature store field | Implementation |
|--------|---------------------|----------------|
| Funding 8h delta | `market.fundingDelta` | Per-asset cache of `{ rate, ts }`; prune >24h; delta = current − rate closest to 8h ago. |
| Order book imbalance | `market.bookImbalance` | Binance futures depth (BTC/ETH/SOL/HYPE); (bidVol − askVol) / (bidVol + askVol). |
| Bid-ask spread | `market.bidAskSpread` | Same depth; (bestAsk − bestBid) / mid × 100. |
| Price vs SMA20 | `market.priceVsSma20` | Rolling window of last 20 prices per asset; (price − SMA) / SMA × 100. |
| News sentiment | `news.sentimentScore`, `news.sentimentDirection` | `getOverallSentiment()` → score = ±confidence, direction = sentiment; `getActiveRiskEvents()` → hasActiveRiskEvents, highestRiskSeverity. |
| Signal sentiment | `signal.avgSentiment` → `signal_avg_sentiment` | Keyword scan over `signal.factors` (bullish/bearish); train script uses it when sources don’t provide sentiment. |

## Data still 0% or low % (optional next steps)

| Factor | Feature store field | How to add |
|--------|---------------------|------------|
| NASDAQ 24h change | `news.nasdaqChange` | Add macro/equity data source; set in `collectNewsFeatures()`. |
| ETF flow (BTC/ETH) | `news.etfFlowBtc`, `news.etfFlowEth` | Expose numeric flow from API and set in news features. |
| Macro risk environment | `news.macroRiskEnvironment` | risk_on / risk_off / neutral from same macro source. |

---

## FREE data points we’re overlooking

All of these use **no new API keys** and either existing services or free public APIs.

| Data point | Where it lives / how to get it | Feature store / algo impact |
|------------|--------------------------------|-----------------------------|
| **Index 24h (SPX / INFOTECH proxy)** | **VinceHIP3Service** already has `getPulse()` → `pulse.indices` with `change24h` (US500, INFOTECH, etc.). No new API. | Set `news.nasdaqChange` from e.g. SPX or INFOTECH 24h % in `collectNewsFeatures()` (inject HIP-3 when building news features). Gives ML a risk-on/risk-off macro input. |
| **Macro risk (risk_on / risk_off)** | Same HIP-3 pulse: `pulse.summary.tradFiVsCrypto`, indices vs gold. Indices up + gold down → risk_on; opposite → risk_off. | Set `news.macroRiskEnvironment` in `collectNewsFeatures()` from HIP-3. FREE. |
| **Signal sentiment (higher % non-null)** | Already derived from `signal.factors` keyword scan; often 20% non-null. | Ensure every aggregated signal has at least one factor string; optionally add per-source sentiment where aggregator has it. No new API—just logic so `signal_avg_sentiment` is populated more often. |
| **Fear & Greed** | Already in market context (CoinGlass/Binance); `market.fearGreedIndex` in feature store. | Confirm it’s in the training optional list and that CoinGlass/Binance path always sets it so ML can use it. |
| **CoinGecko (as weak factor)** | **VinceCoinGeckoService** – exchange health, liquidity, prices; used by MarketData but not a named aggregator source. | Optionally add a single “market breadth” or “exchange health” factor to the aggregator (e.g. “Exchange health OK” / “Liquidity tight”) so it appears in Sources and in feature store. FREE. |
| **ETF flow (BTC/ETH)** | **FREE options:** Farside Investors publishes flow data; some free dashboards or CSV. Or defer and leave null until a free/cheap API is chosen. | Set `news.etfFlowBtc`, `news.etfFlowEth` (millions USD) in `collectNewsFeatures()` when you have a source. |
| **Multi-venue funding** | Bybit and OKX have **free public** funding-rate endpoints. We already use Binance + Hyperliquid. | Optional: add “funding extreme” from Bybit/OKX as one more confirming source so “extreme funding” is cross-venue. Improves robustness; still FREE. |

**Highest impact, zero cost:** Wire **HIP-3 index 24h** and **macro risk** into `collectNewsFeatures()` (get `VINCE_HIP3_SERVICE`, call `getPulse()`, set `news.nasdaqChange` and `news.macroRiskEnvironment`). Then retrain so `suggested_signal_factors` can drop “NASDAQ 24h” and “Macro risk environment” from the “consider adding” list.

---

## Quick checklist

- [ ] Run paper bot so new feature records get **market.oiChange24h**, **market.dvol**, **market.rsi14**, **market.atrPct** (Deribit must be available for dvol/atr on BTC/ETH).
- [ ] Retrain with updated JSONL; confirm `suggested_signal_factors` drops or reduces “OI change 24h”, “DVOL”, “RSI”, “Price vs SMA20” if you add SMA.
- [ ] Add one of: funding 8h cache, order-book provider, or price history (SMA20) and wire into `collectMarketFeatures`.
- [x] **FREE:** Use HIP-3 for index 24h and macro: in `collectNewsFeatures()` get `VINCE_HIP3_SERVICE`, call `getHIP3Pulse()`, set `news.nasdaqChange` from `pulse.indices` (US500, INFOTECH, MAG7, SEMIS, XYZ100) `change24h` and `news.macroRiskEnvironment` from `pulse.summary.tradFiVsCrypto` (risk_on / risk_off / neutral). **DONE (2026-02-05):** Added 6s timeout, broader index fallback, Yahoo Finance ^IXIC fallback when HIP-3 has no index data.
- [ ] Optionally add ETF flow source (e.g. Farside) and set `news.etfFlowBtc` / `news.etfFlowEth` in `collectNewsFeatures()`.
- [ ] Improve signal sentiment coverage so `signal_avg_sentiment` is non-null more often (e.g. from factor text or source-level scores).

After retraining, `improvement_report.holdout_metrics` and `improvement_report.md` contain per-model metrics; use `bun run train-models` with optional `--recency-decay`, `--balance-assets`, or `--tune-hyperparams` (see [scripts/README.md](scripts/README.md)).

See **ALGO_ML_IMPROVEMENTS.md** (§ “Leverage more data points”) for the same summary and links to code.
