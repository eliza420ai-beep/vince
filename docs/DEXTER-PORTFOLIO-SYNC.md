# Dexter ↔ VINCE portfolio sync

**Single source of truth for “what we monitor”:** the three portfolio JSONs and the three core crypto tickers.

## Files

| Location (repo root) | Role |
|----------------------|------|
| `portfolio_hyperliquid.json` | HL sleeve — on-chain equities (HIP-3) |
| `portfolio_tastytrade.json`   | Tastytrade sleeve — off-chain options/equities |
| `portfolio_watchlist.json`   | Watchlist — pipeline for promotion to sleeves |
| `BTC.md`, `SOL.md`, `HYPE.md` | Core crypto — doctrine and monitoring focus |

These files are the same format and intent as in the [Dexter repo](https://github.com/eliza420ai-beep/dexter). Dexter owns portfolio construction and rebalance; VINCE consumes them for **monitoring** (drift, regime, thresholds, paper bot / signal focus).

## How VINCE uses them

- **Context:** The VINCE context provider (`plugin-vince` → `vinceContextProvider`) loads the three JSONs at runtime and injects a **Dexter universe** block into every response context: HL sleeve tickers, tastytrade sleeve tickers, watchlist tickers, and “Core crypto: BTC, SOL, HYPE (see BTC.md, SOL.md, HYPE.md).”
- **Loader:** `src/plugins/plugin-vince/src/utils/dexterPortfolio.ts` — `loadDexterPortfolios(rootDir?)` reads from repo root (or given path), returns `{ hyperliquid, tastytrade, watchlist, coreCrypto }`. Missing or invalid files yield empty arrays; no throw.
- **State:** `state.data.dexterPortfolios` is set so future features (e.g. drift alerts, paper bot prioritization) can filter or rank by Dexter universe without re-reading files.

## Keeping in sync with Dexter

- **Option A (same repo):** Keep the three JSONs in this repo and update them when you run Dexter’s `/suggest` or rebalance flows; then VINCE always sees the latest.
- **Option B (Dexter repo):** Copy or symlink from Dexter’s repo into VINCE’s root so one place defines the sleeves; document the path in this file or `.env` if you use a non-default location.
- **Core crypto:** BTC, SOL, HYPE are fixed in code as the three main crypto tickers; doctrine and nuance live in `BTC.md`, `SOL.md`, `HYPE.md` for RAG and human review.

## Contract

- Portfolio JSONs: `{ sleeve: string, assets: [ { symbol: string, target_weight_pct: number } ], ... }`. Other fields are ignored for context.
- VINCE does not write these files; it only reads. Dexter (or a manual process) is the writer.
