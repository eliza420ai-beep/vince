# Tastytrade Preset Watchlists — Glossary & VINCE Mapping

Our premier trading platform partner (tastytrade) ships built-in watchlists you can't delete. Blending our discovery flow with these categories lets you move names from VINCE's ranked shortlist into the right tastytrade list — or at least think in the same language.

## Preset watchlist glossary (tastytrade)

### Crypto
- **Crypto: All** — Digital currencies tradeable at tastytrade.
- **Crypto: ETFs** — Digital Asset ETFs (e.g. spot Bitcoin/ETH ETFs). Read prospectus before investing.

### Dividend
- **Dividend Aristocrats** — S&P 500 mega-caps that have increased the dividend 25+ consecutive years.
- **Dividend Champions** — All U.S. companies (any size) that have increased dividends 25+ consecutive years.

### Earnings
- **All Earnings** — Stocks with earnings in the next 10 calendar days.
- **tasty Earnings** — Earnings within 7 days; S&P 500 or Russell; 3-star liquidity; IV Rank 35+.

### Futures
- **Futures: All** — All available futures at tastytrade.
- **Futures: CME** — CME futures.
- **Futures: Micros** — CME micro e-mini futures.

### Indicators
- **Market Indicators** — Symbols for market cadence (see dxfeed.com).
- **Market indices** — S&P 500, NASDAQ 100, Russell 2000, etc.

### Liquidity
- **High Options Volume** — High CBOE options volume; near 52-wk high/low; high IV/IVR; sizeable OI; tight spreads; large share/options volume.
- **Liquid ETFs** — Most active ETFs by options volume and liquidity.
- **Liquid Symbols** — 3+ star liquidity, market cap ≥ $500M, notional volume ≥ $10M.

### Sectors (GICS)
Sector watchlists follow the Global Industry Classification Standard (GICS). Examples:
- **Basic Materials** — Raw materials (forestry, industrial metals, chemicals).
- **Communication Services** — Fixed-line, wireless, broadband; telecom, IT services, TV.
- **Consumer Defensive** — Staples (food, household goods, personal products).
- **Consumer Discretionary** — Autos, durables, apparel, services, retail.
- **Energy** — Equipment, oil, gas, consumable fuels.
- **Financial Services** — Banks, diversified financials, insurance.
- **Healthcare** — Equipment, services, pharma, biotech, life sciences.
- **Industrials** — Capital goods, commercial/professional services, transportation.
- **Real Estate** — REITs, real estate management/development.
- **Technology** — Software, hardware, semiconductors.
- **Utilities** — Electric, gas, water, renewable, multi-utility.

### tasty Watchlists
- **52-Week Near High** — Near 52-wk high, IV Rank 30%+, trades options; updates 40 min after open, then hourly.
- **52-Week Near Low** — Near 52-wk low, IV Rank 30%+, trades options; same update cadence.
- **tasty Fast Movers** — Fast price action; stock $10–$500, options, IVR 35+; proprietary volume/intraday/daily swing weight; populates 8:45 CT, updates hourly until 4p.
- **tasty Default** — Curated list from tastylive (regularly traded/monitored stocks, ETFs, futures).
- **tasty Hourly Top Equities** — Top 15 equity underlyings by volume at tastytrade; 10a–2p CT hourly.
- **tasty IVR** — NASDAQ and S&P 500 names with IV Rank 30%+.

---

## How VINCE discovery maps to tastytrade

| VINCE concept | Tastytrade preset(s) to think about |
|---------------|-------------------------------------|
| **Liquidity** (high/adequate dollar volume) | Liquid Symbols, Liquid ETFs, High Options Volume. We don't have star rating or IVR; we use dollar volume and coarse-screen thresholds. When we tag **High liquidity**, the name has strong trading volume; you can add to tastytrade Liquid Symbols or a custom list. |
| **Event** (earnings, 8-K, filings, insider cluster) | All Earnings, tasty Earnings. We have `days_since_earnings`, recent 8-K, filing intensity. "Earnings catalyst" tag = event-driven; for "earnings in next 7–10 days" we'd need next earnings date (future enhancement). |
| **Momentum** (3m/12m, cohort-relative, sector-relative) | 52-Week Near High / 52-Week Near Low, tasty Fast Movers. We don't compute 52w distance or IVR yet; our momentum explanation aligns with *why* a name might show up on those lists. |
| **Sector** (when we have GICS/sector on the symbol master) | Sector Watchlists (Technology, Healthcare, etc.). If the symbol master includes sector, we tag it so you can add to the matching tastytrade sector list. |
| **Quality** (margins, growth, FCF) | No direct preset; useful for *which* Liquid or Sector names to prioritize. Dividend Aristocrats/Champions are quality-by-definition; we don't flag those yet. |

### Tags we expose

- **Earnings catalyst** — Recent or upcoming earnings context (8-K, filing activity, earnings beat in explanation).
- **High liquidity** — Meets our liquidity bar (strong dollar volume); aligns with tastytrade’s Liquid Symbols list.
- **Sector: &lt;name&gt;** — When symbol master has sector (e.g. Technology, Healthcare); use tastytrade Sector Watchlists with the same name.

Future: **52w near high/low**, **tasty Earnings** (next 7d + liquidity), **Dividend** when we have dividend data.

---

## Why this helps

Same mental model as tastytrade: when you promote a candidate from VINCE into your workflow, you know whether it belongs in "Earnings", "Liquid Symbols", or "Sector: Technology" on the platform. Our discovery stays the single search surface; tastytrade stays the execution and list management layer.
