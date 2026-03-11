---
tags: [prediction-markets, polymarket, macro]
agents: [oracle, vince, solus, eliza]
last_reviewed: 2026-02-17
---

# Polymarket Deep Reference — Everything Oracle Needs to Know

> Polymarket is Oracle's primary data source. This is the complete knowledge base.

---

## Part 1: What Polymarket Is

### Core Concept

- World's largest prediction market platform
- Users buy/sell shares representing future event outcomes (binary or multi-outcome)
- Shares priced between $0.00 and $1.00 USDC
- Price = probability. A YES share at $0.65 = market says 65% chance of happening
- Every YES + NO pair is fully collateralized by $1.00 USDC
- Winning shares pay out $1.00 each at resolution. Losing shares = $0
- Peer-to-peer: no "house" or bookie. Counterparty is another user
- You can sell shares before resolution (lock in profits or cut losses)
- No one gets banned for winning too much

### Why Prediction Markets Matter

- Research shows prediction markets are MORE accurate than experts, polls, and pundits
- They aggregate news, polls, and expert opinions into a single probability value
- Economic incentives ensure prices reflect true odds (mispricing = profit opportunity for informed traders)
- Real-time probability engine for any event with a market

### How Polymarket Works Technically

- Built on Polygon (Ethereum L2)
- Collateral: USDC.e (bridged USDC on Polygon)
- CLOB (Central Limit Order Book) for trading — not AMM
- Supports deposits from EVM chains, Solana, and Bitcoin (auto-bridged to USDC.e on Polygon)
- Uses UMA Optimistic Oracle for market resolution

## Part 2: Trading Mechanics

### How Prices Are Calculated

- Prices = midpoint of bid-ask spread in the CLOB orderbook
- Exception: if spread >$0.10, last traded price is displayed instead
- Prices NOT set by Polymarket — purely supply and demand
- Initial price: formed when first YES and NO limit orders sum to $1.00 (e.g., YES at $0.60 matched with NO at $0.40)

### Order Types

- **Market Order**: Buy/sell at current best available price. Immediate execution
- **Limit Order**: Set your price, wait for someone to match. Can partially fill. Optional expiration date
- Can buy YES or NO shares. Can sell shares you hold at any time
- Sports markets: 3-second delay on marketable orders; all orders auto-cancelled at game start
- **Feb 2025 — 15m BTC events:** Polymarket removed the 0.5-second order delay. Previously, the UI updated with a fraction-of-a-second lag while price moved; bots could execute at the old price for guaranteed profit. That edge is gone. Do not assume latency arbitrage on these events.

### Key Trading Concepts

- **Bid-Ask Spread**: Difference between best buy and sell price. Tight = liquid, wide = illiquid
- **Depth**: How many shares available at each price level. Deep books = less slippage
- **Volume**: Total USDC traded on a market. High volume = more reliable signal
- **Open Interest**: Total value of outstanding positions. Shows how much money is at stake
- **Top Holders**: Largest positions in a market — whale watching

### Fees

- Trading fees apply (varies, typically small %)
- No fee on winning payouts at resolution
- Deposit/withdrawal may incur bridging fees

## Part 3: Market Resolution

### How Markets Resolve

- When event outcome is clear, market can be "resolved" (finalized)
- Resolution follows pre-defined rules found under the market's order book
- Winning shares → $1.00 each. Losing shares → $0. Trading stops

### Resolution Process

1. Anyone can "propose" a resolution by posting a $750 USDC.e bond on Polygon
2. Proposal enters UMA Optimistic Oracle verification queue
3. If approved: proposer gets bond back + reward
4. If disputed: enters UMA dispute resolution process
5. Challenge period: 2 hours after proposal

### Resolution Risks

- Early resolution proposals can lose the $750 bond
- Ambiguous market rules can lead to disputes
- Some markets may resolve differently than expected based on rule interpretation
- Multi-outcome markets resolve each outcome independently

## Part 4: Market Categories Oracle Tracks

### Crypto Markets (HIGHEST PRIORITY for the stack)

| Category           | Why It Matters                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Bitcoin price      | Direct signal for BTC perps (VINCE) and options strikes (Solus). Weekly/monthly resolution aligns with Hypersurface expiry |
| Ethereum price     | ETH perps correlation, ETH/BTC ratio, options context                                                                      |
| Solana price       | Alt exposure, meme/HYPE correlation                                                                                        |
| MicroStrategy      | BTC proxy, corporate treasury narrative, MSTR HIP-3 perp correlation                                                       |
| Crypto ETF         | Institutional flows, approval odds, sentiment                                                                              |
| Pre-market         | Early price discovery before spot                                                                                          |
| Weekly resolution  | SHORT-TERM — aligns with Friday Hypersurface options expiry. **Most important for Solus**                                  |
| Monthly resolution | Medium-term — aligns with longer-dated options and macro views                                                             |
| Daily resolution   | Intraday/session-level — fastest signal for paper bot                                                                      |

### Finance Markets

| Category    | Why It Matters                                                |
| ----------- | ------------------------------------------------------------- |
| Stocks      | Equities correlation, risk-on/off, sector rotation            |
| Indices     | S&P 500, Nasdaq — broad market and macro hedging              |
| Commodities | Gold, oil — inflation/real-asset hedging                      |
| IPO         | New listings, valuation, sentiment                            |
| Fed rates   | CRITICAL — rate path probabilities feed everything. FOMC odds |
| Treasuries  | Yield curve, duration, safe-haven signals                     |

### Geopolitics & Economy

| Category    | Why It Matters                                                   |
| ----------- | ---------------------------------------------------------------- |
| Geopolitics | Tail risk — wars, sanctions, policy shocks. Moves gold, oil, BTC |
| Economy     | Recession odds, GDP, employment. Macro regime identification     |

## Part 5: How Oracle Uses Polymarket Data for the Stack

### 1. Hypersurface Strike Selection (MOST IMPORTANT)

- Weekly crypto price markets tell you what the market thinks BTC/ETH/SOL will do by Friday
- Example: "BTC above $100K by Friday" at 72% → market expects BTC stays above $100K
- Oracle translates this to Solus: "Market prices 72% chance BTC stays above $100K. Consider selling $100K strike covered calls — high probability of keeping asset + premium"
- Weekly resolution markets are the single most valuable signal for Friday strike selection
- Monthly markets inform longer-dated view and trend

### 2. Paper Bot (Perps on Hyperliquid)

- Short-term price predictions improve directional signals
- Daily resolution markets = same-session trading signals
- Example: "BTC above $98K today" at 85% → market strongly expects BTC holds above $98K. Paper bot can lean long with tighter stops
- Compare Polymarket odds to funding rates: if Polymarket says 85% above $98K but funding is deeply negative (shorts paying), there's a disconnect to exploit

### 3. Macro Vibe Check

- Fed rate cut odds → risk asset positioning. If market prices 80% cut → bullish crypto/stocks
- Recession odds → risk-off vs risk-on regime
- Geopolitical escalation odds → gold/oil/BTC safe-haven flows
- Election/policy odds → regulatory clarity for crypto

### Signal Hierarchy

1. **Weekly crypto price markets** → Friday strike selection (Solus)
2. **Daily crypto price markets** → Paper bot signals (VINCE)
3. **Fed rate odds** → Macro regime (all agents)
4. **Geopolitics/economy** → Tail risk awareness (all agents)

## Part 6: Oracle's Analytical Framework

### Reading Market Efficiency

- **High volume + tight spread** = efficient market, hard to beat. Trust the odds
- **Low volume + wide spread** = inefficient, potential alpha if you have an information edge
- **Sudden volume spike** = new information entering the market. Watch for odds shift
- **Odds not moving despite news** = market already priced it in (or illiquid and slow to react)

### Detecting Mispricing

- Compare Polymarket odds to: funding rates (Hyperliquid), IV (Deribit), on-chain data, CT sentiment
- Divergence = potential alpha:
  - Polymarket says 80% BTC above $100K, but Hyperliquid funding deeply negative → market confused, edge exists
  - Polymarket says 30% Fed cut, but CME FedWatch says 60% → one market is wrong, trade the divergence
  - Polymarket says 90% above $X, but IV is spiking → someone is buying protection against the 10% scenario

### Volume and Liquidity Interpretation

| Volume Level | What It Tells You                                                            |
| ------------ | ---------------------------------------------------------------------------- |
| >$10M        | Major market, highly liquid, reliable signal                                 |
| $1M-$10M     | Good liquidity, trustworthy odds                                             |
| $100K-$1M    | Moderate — odds directionally useful but can be moved by single large trades |
| <$100K       | Thin — odds unreliable, easily manipulated. Use with caution                 |

### Time Decay in Prediction Markets

- As resolution date approaches, odds should converge to 0% or 100%
- Shares at 90% with 1 day to resolution are VERY different from 90% with 30 days
- Edge: buy high-probability outcomes close to resolution for small but reliable gains (the "last mile" trade)
- Risk: tail events can flip outcomes even at 95%+

## Part 7: Oracle's Plugin Actions Reference

### Discovery

- `GET_ACTIVE_POLYMARKETS` — trending and active markets
- `SEARCH_POLYMARKETS` — search by keyword/category
- `GET_VINCE_POLYMARKET_MARKETS` — VINCE-priority markets only
- `GET_POLYMARKET_CATEGORIES` — all available categories
- `GET_POLYMARKET_EVENTS` / `GET_POLYMARKET_EVENT_DETAIL` — event listings

### Pricing & Analytics

- `GET_POLYMARKET_PRICE` — real-time CLOB prices (most accurate; list/search show Gamma-derived odds)
- `GET_POLYMARKET_DETAIL` — full market detail
- `GET_POLYMARKET_ORDERBOOK` / `GET_POLYMARKET_ORDERBOOKS` — single or batch orderbooks
- `GET_POLYMARKET_OPEN_INTEREST` — outstanding positions value
- `GET_POLYMARKET_LIVE_VOLUME` — real-time volume
- `GET_POLYMARKET_SPREADS` — bid-ask spreads

### Portfolio (wallet required)

- `GET_POLYMARKET_POSITIONS` — current positions
- `GET_POLYMARKET_BALANCE` — wallet balance
- `GET_POLYMARKET_TRADE_HISTORY` — past trades
- `GET_POLYMARKET_CLOSED_POSITIONS` — resolved positions
- `GET_POLYMARKET_USER_ACTIVITY` — on-chain activity
- `GET_POLYMARKET_TOP_HOLDERS` — whale positions per market

### Rules

- Never paste condition_id or token_id in replies — offer to pull live odds by market name
- Always use GET_POLYMARKET_PRICE for current odds (list/search shows Gamma-derived, slightly delayed)
- Oracle is READ-ONLY — never execute trades

## Part 8: Handoffs

| Request                                 | Goes To  | What Oracle Says                                                                |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| Live perps data, funding, IV, paper bot | VINCE    | "That's VINCE — he has live data. Ask him, paste here if you want odds context" |
| Strike selection, size/skip/watch       | Solus    | "That's Solus. Get VINCE's options view, paste to Solus for the strike call"    |
| DeFi execution, wallet ops              | Otaku    | "That's Otaku for execution"                                                    |
| Lifestyle, travel                       | Kelly    | "That's Kelly"                                                                  |
| Ops, code, infra                        | Sentinel | "That's Sentinel"                                                               |

## Part 9: Advanced Concepts

### Conditional Token Framework (CTF)

- Polymarket uses Gnosis Conditional Token Framework
- Each market outcome = a conditional token on Polygon
- Tokens are ERC-1155 (semi-fungible)
- condition_id = unique identifier for a market condition
- token_id = specific outcome token within that condition
- These are what Oracle passes internally but NEVER shows to users

### UMA Optimistic Oracle

- Decentralized truth machine for resolution
- Proposer puts up bond ($750 USDC.e), asserts outcome
- 2-hour challenge period
- If disputed: goes to UMA DVM (Data Verification Mechanism) — token holders vote
- Designed to be correct by default (hence "optimistic") — disputes are rare and expensive
- Oracle should understand resolution risk: some markets can resolve unexpectedly based on rule wording

### Market Making on Polymarket

- Market makers provide liquidity by placing limit orders on both sides
- They earn the bid-ask spread
- Automated market makers (bots) provide most liquidity
- Builder codes: market makers can register as "builders" for analytics/leaderboard
- Polymarket CLOB is off-chain matching with on-chain settlement (hybrid model)

### API Architecture

- Gamma API: market metadata, events, search (slightly delayed prices)
- CLOB API: real-time orderbook, live prices, trading
- Data API: positions, trades, leaderboards, analytics
- All APIs are public (read endpoints), trading requires wallet auth

## Part 10: Platform changes and bot strategy (notes for our trading bot)

### Feb 2025 — Polymarket removed the “money button” (0.5s delay)

- **What happened:** Polymarket removed the 0.5-second delay on orders for events with 15m BTC (and similar high-volume crypto price markets). No announcement or explanation from the team.
- **Why it mattered:** The UI was slower than price movement by fractions of a second. Bots could click and get fills at the old price while spot had already moved — guaranteed profit. The most profitable bot reportedly went from ~$55k to ~$20 after the change. Copy trading those bots was never viable (too fast for humans).
- **Implication for our bot:** Do **not** design or size for latency arbitrage on these markets. That edge is gone. Our desk (Synth vs Polymarket price, edge threshold, Risk/Executor flow) does not rely on order delay; we are fine. Any future arb or speed-based strategy must assume no artificial delay.
- **What to do instead:** Look for new inefficiencies (e.g. Synth forecast vs CLOB price, crowd overreaction per “the poly strat”, technical analysis on Bitcoin markets). Now is a good environment to trade Bitcoin on Polymarket using TA / fundamental edge rather than speed.
