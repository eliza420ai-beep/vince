# Hyperliquid API Endpoints Used in plugin-vince

All calls go to **`POST https://api.hyperliquid.xyz/info`** (public, no API key). This file lists which **request `type`** values we use and where.

Reference: [Hyperliquid Docs – Info Endpoint (Perpetuals)](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals)

---

## Endpoints we already use

| Request `type`                               | Where used                | Purpose                                                                                            |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| **`metaAndAssetCtxs`**                       | `hyperliquid.fallback.ts` | Options pulse (funding, crowding), mark price, 24h change. Single call (no `dex`) = main perp dex. |
| **`metaAndAssetCtxs`** (+ optional `dex`)    | `hip3.service.ts`         | HIP-3 asset data per DEX; `fetchDexData(dex?)` with `dex` for xyz/flx/vntl/km.                     |
| **`predictedFundings`**                      | `hyperliquid.fallback.ts` | Cross-venue funding (HL vs Binance/Bybit); drives CrossVenueFunding signals.                       |
| **`clearinghouseState`** (+ `user: address`) | `topTraders.service.ts`   | Whale account state: margin, positions, size, entry; used for Top Traders signals.                 |
| **`perpDexs`**                               | `hip3.service.ts`         | List of perp DEX names (main + HIP-3) for discovery.                                               |
| **`allPerpMetas`**                           | `hip3.service.ts`         | All perp dex metadata + asset contexts in one call; used for HIP-3 pulse.                          |

---

## Where each is called

- **`src/services/fallbacks/hyperliquid.fallback.ts`**
  - `metaAndAssetCtxs` (no `dex`) → `getOptionsPulse()`, `getCrossVenueFunding()` (funding from meta), `getMarkPriceAndChange()`, `testConnection()`.
  - `predictedFundings` → `getCrossVenueFunding()` (HL vs CEX comparison).

- **`src/services/hip3.service.ts`**
  - `allPerpMetas` → `fetchAllPerpMetas()` (HIP-3 pulse).
  - `perpDexs` → `getPerpDexs()` (DEX list).
  - `metaAndAssetCtxs` with optional `dex` → `fetchDexData(dex?)` (per-DEX meta + asset ctxs).

- **`src/services/topTraders.service.ts`**
  - `clearinghouseState` with `user: address` → `fetchTraderData(address)` (whale positions and account value).

---

## Endpoints we do _not_ use yet (candidates for new signals)

From the [perpetuals docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals):

| Request `type`                    | Returns                                                              | Potential use                                    |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| **`meta`**                        | Universe + margin tables only (no asset ctxs)                        | Lighter-weight when only metadata needed.        |
| **`userFunding`**                 | User funding history                                                 | Funding paid/received by a wallet (e.g. whales). |
| **`userNonFundingLedgerUpdates`** | Deposits, transfers, withdrawals                                     | Wallet flow.                                     |
| **`fundingHistory`**              | Historical funding rates (coin, startTime, endTime)                  | Funding regime / percentile / trend.             |
| **`perpsAtOpenInterestCap`**      | List of perps at OI cap                                              | Crowding / capacity constraint.                  |
| **`perpDeployAuctionStatus`**     | Auction status                                                       | Builder-deployed perp lifecycle (niche).         |
| **`activeAssetData`**             | User’s active asset: leverage, maxTradeSzs, availableToTrade, markPx | Execution/risk for a given user+coin.            |
| **`perpDexLimits`**               | OI caps, transfer limits (builder-deployed dex)                      | Risk/limits for HIP-3 dexs.                      |
| **`perpDexStatus`**               | totalNetDeposit                                                      | DEX-level liquidity.                             |

---

## Summary

- **In use:** `metaAndAssetCtxs`, `predictedFundings`, `clearinghouseState`, `perpDexs`, `allPerpMetas`, **`perpsAtOpenInterestCap`** (HyperliquidOICap signal), **`fundingHistory`** (HyperliquidFundingExtreme via getFundingRegime).
- **Not in use:** `meta`, `userFunding`, `userNonFundingLedgerUpdates`, `perpDeployAuctionStatus`, `activeAssetData`, `perpDexLimits`, `perpDexStatus`.

For adding new data to the algo, the highest-value candidates are likely **`fundingHistory`** (funding regime), **`perpsAtOpenInterestCap`** (crowding/cap), and optionally **`userFunding`** for tracked whale wallets.

---

## Which endpoint improves the paper trading algo?

Recommendation in order of impact for the **paper trading bot** (signal aggregator → thresholds/weights → trade decision + feature store for ML):

### 1. **`fundingHistory`** — Highest impact

- **What it gives:** Historical funding rates per coin (`coin`, `startTime`, `endTime` → array of `{ coin, fundingRate, premium, time }`).
- **Why it helps the algo:**
  - We already have **Binance** “extreme funding” via percentile (current vs last 30 samples). **Hyperliquid** today only uses _current_ funding from `metaAndAssetCtxs` for bias/crowding, so “extreme” is a fixed annualized threshold.
  - With `fundingHistory` we can compute **HL funding percentile** (e.g. current in top/bottom 10% of last N periods) and either:
    - Add a **HyperliquidFundingExtreme** signal (mean-reversion, same idea as BinanceFundingExtreme), or
    - Make **HyperliquidCrowding** regime-aware (only “extreme” when HL funding is in the tail of its own history).
  - Feature store already has `fundingRate`, `fundingPercentile`, `fundingDelta`; we can add **HL-specific** funding percentile/delta for ML and for combo logic (e.g. funding/OI divergence using HL data).
- **Implementation:** Call `fundingHistory` for BTC/ETH/SOL (and optionally HYPE) with a rolling window (e.g. last 30 funding intervals), compute percentile, then feed into aggregator and/or feature context. One extra POST per asset per refresh; can share/cache by asset.

### 2. **`perpsAtOpenInterestCap`** — High impact, low effort

- **What it gives:** List of perp symbols currently at their open-interest cap (e.g. `["BADGER","CANTO","FTM","LOOM","PURR"]`).
- **Why it helps the algo:**
  - When the asset we’re trading (e.g. BTC, ETH) is in this list, OI cannot grow further → maximum crowding / capacity constraint. Useful as:
    - **Contrarian:** “At OI cap” = crowded, consider fading or reducing size.
    - **Combo:** Combine with existing funding/OI divergence logic (e.g. “at cap” + extreme funding = stronger mean-reversion setup).
  - Fits current weights: we already use **HyperliquidCrowding** (1.4x); an “at cap” signal could be a separate source (e.g. **HyperliquidOICap**) or a factor inside crowding.
- **Implementation:** One lightweight POST (no `user`, no time range). Cache 60s. In aggregator, if `asset` is in the returned list, add a short/crowding factor or a dedicated weak signal.

### 3. **`userFunding`** — Medium impact (when Top Traders is enabled)

- **What it gives:** Funding history for a given wallet (`user`, `startTime`, `endTime`).
- **Why it helps the algo:**
  - We already use **clearinghouseState** for Top Traders (whale positions). **userFunding** tells us whether those whales are _paying_ or _receiving_ funding over time.
  - “Whales paying funding” = they’re long and crowded → contrarian short bias; “whales receiving” = they’re short and crowded → contrarian long bias. Improves quality of Top Traders / whale-based signals when you have real wallet addresses in `wallets.json`.
  - Lower priority if Top Traders weight is 0 (no wallets configured); still valuable for future use and for feature store (whale funding as a feature).
- **Implementation:** For each tracked Hyperliquid wallet, call `userFunding` with a rolling window; aggregate “net payer vs receiver” and feed into Top Traders or a small **WhaleFunding** signal. Respect rate limits (we already throttle HL requests).

---

## Summary for the paper bot

| Endpoint                   | Use for algo                                                                                            | Effort                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **fundingHistory**         | HL funding percentile + extreme/crowding regime; new signal or smarter HyperliquidCrowding; ML features | Medium (per-asset history + percentile)                 |
| **perpsAtOpenInterestCap** | “At OI cap” = max crowding; contrarian or combo with funding/OI                                         | Low (one call, small aggregator change)                 |
| **userFunding**            | Whale funding direction; improve Top Traders when wallets are configured                                | Medium (per-wallet history, only when Top Traders used) |

**Suggested order:** Implement **perpsAtOpenInterestCap** first (quick win), then **fundingHistory** (largest algo and ML benefit), then **userFunding** when you rely on Top Traders.
