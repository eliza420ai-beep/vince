# Polymarket priority markets (VINCE)

Polymarket topics VINCE prioritizes for market insights and hedging. Oracle and the Polymarket Discovery plugin favor these when browsing or when the user asks for "our" or "priority" markets.

For a list of markets only in these topics, use action **GET_VINCE_POLYMARKET_MARKETS**.

## Why we use this

Prediction markets give us a **palantir** into what the market thinks—collective belief, priced in odds.

- **Paper bot (perps, Hyperliquid):** Short-term price predictions from Polymarket can improve the paper trading algo’s signals.
- **Hypersurface strike selection:** Weekly (and monthly) price predictions help pick the right strike when doing onchain options on Hypersurface—**by far the most important** use case.
- **Vibe check:** Macro and sentiment overlay.

---

## Crypto

| Path / slug          | Label         | Why it matters for VINCE                                      |
| -------------------- | ------------- | ------------------------------------------------------------- |
| crypto/bitcoin       | Bitcoin       | Macro/hedging, perps correlation, options context, ETF flows. |
| crypto/microstrategy | MicroStrategy | BTC proxy, corporate treasury narrative.                      |
| crypto/ethereum      | Ethereum      | Perps and options correlation, ETH/BTC ratio.                 |
| crypto/solana        | Solana        | Meme/alt exposure, HYPE and spot context.                     |
| crypto/pre-market    | Pre-market    | Early price discovery before spot opens.                      |
| crypto/etf           | ETF           | Flows, approval/outflow odds, institutional sentiment.        |
| crypto/monthly       | Monthly       | Medium-term resolution, expiry alignment.                     |
| crypto/weekly        | Weekly        | Short-term resolution, Friday/weekly options alignment.       |
| crypto/daily         | Daily         | Intraday resolution, session-level hedging.                   |

## Finance

| Path / slug         | Label       | Why it matters for VINCE                            |
| ------------------- | ----------- | --------------------------------------------------- |
| finance/stocks      | Stocks      | Equities correlation, risk-on/off, sector rotation. |
| finance/indicies    | Indices     | Broad market (S&P, Nasdaq) and macro hedging.       |
| finance/commodities | Commodities | Inflation, gold, oil, real-asset hedging.           |
| finance/ipo         | IPO         | New listings, valuation and sentiment.              |
| finance/fed-rates   | Fed rates   | Rates path, FOMC odds, critical for risk assets.    |
| finance/treasuries  | Treasuries  | Yield curve, duration, safe-haven vs risk-on.       |

## Other

| Path / slug | Label       | Why it matters for VINCE                  |
| ----------- | ----------- | ----------------------------------------- |
| geopolitics | Geopolitics | Tail risk, conflict, policy shocks.       |
| economy     | Economy     | Recession, GDP, employment, macro regime. |

---

Keep this list in sync with `VINCE_POLYMARKET_PREFERRED_TAG_SLUGS` / `VINCE_POLYMARKET_PREFERRED_LABELS` in the plugin (`src/plugins/plugin-polymarket-discovery/src/constants.ts`).
