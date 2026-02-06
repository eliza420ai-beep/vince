# Stale P&L Investigation (Feb 2026)

**Status:** Fixed (2026-02-03). See `progress.txt` § "Essential bug fix: Stale P&L / uPNL" for the completed entry.

## What happened

The paper bot reported a short position as **"underwater"** with about **-$40 P&L** while BTC had already dropped to ~$75K. The short had been opened at $75,872, so it was actually **profitable** at $75K. The strategy and entry were correct; the **reported unrealized P&L was stale**.

## Root cause

1. **Unrealized P&L** is computed in `VincePositionManagerService.updateMarkPrice(asset, markPrice)` from `markPrice`.
2. **Mark price** is updated by the paper trading **update loop** every **30 seconds** via `updateMarkPrices()` → `marketData.getEnrichedContext(asset)` → `ctx.currentPrice`.
3. **`currentPrice`** in enriched context comes from **CoinGecko** via `coingeckoService.getPrice(asset)`.
4. **CoinGecko was never refreshed on this path**: `getEnrichedContext()` called `coinglassService.refreshData()` but **did not** call `coingeckoService.refreshData()`, so it always read from cache.
5. **CoinGecko cache** was only refreshed at service init and in a few other code paths (e.g. bullBearAnalyzer). Cache TTL was **5 minutes**. So the price used for P&L could be from startup or up to **5 minutes old**.

**Result**: During a fast move (e.g. BTC dumping from ~75.8k to 75k), the bot showed -$40 because it was using a stale price from CoinGecko’s cache. The short was already in profit at the real market price.

## Fixes applied

1. **Refresh CoinGecko in the mark-price path**  
   In `VinceMarketDataService.getEnrichedContext()`, call `coingeckoService.refreshData()` before `getPrice(asset)` so the paper loop can get updated prices (still bounded by cache TTL).

2. **Shorter price cache TTL**  
   In `VinceCoinGeckoService`, reduce `CACHE_TTL_MS` from **5 minutes to 1 minute** so the 30s paper loop gets reasonably fresh prices without hammering the API (one combined price call per minute is within CoinGecko free limits).

3. **On-demand refresh when user asks for status/uPNL**  
   In `vinceContextProvider`, when the user asks for bot status / portfolio / uPNL, call `paperTrading.refreshMarkPrices()` before reading positions and portfolio so the numbers in the reply are current.

## Files changed

- `src/services/marketData.service.ts` – refresh CoinGecko before reading price in `getEnrichedContext()`.
- `src/services/coingecko.service.ts` – cache TTL 5 min → 1 min.
- `src/services/vincePaperTrading.service.ts` – public `refreshMarkPrices()` for on-demand refresh.
- `src/providers/vinceContext.provider.ts` – call `refreshMarkPrices()` before building bot status context.

## Flow after fix

- Every **30s**: paper loop runs `updateMarkPrices()` → `getEnrichedContext()` → **refreshData()** on CoinGecko (if cache > 1 min) → `getPrice()` → `updateMarkPrice()`.
- When user says **"bot status" / "uPNL" / "portfolio"**: provider calls `refreshMarkPrices()` then reads positions/portfolio, so the reply uses up-to-date P&L.
