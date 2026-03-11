# Oracle: Prediction Markets Agent (VINCE)

Oracle is the **CPO agent**: read-only Polymarket specialist for discovery, odds, and portfolio. Priority Polymarket data feeds the paper bot, Hypersurface strike selection, and macro vibe. No trading execution. Handoffs: live perps/options to VINCE, strike/execution to Solus, DeFi/wallet to Otaku.

**Use this doc** to brief OpenClaw on what Oracle can and cannot do today for PRD drafting.

---

## Why Oracle Matters

- Polymarket as palantir for market belief; improves paper trading and weekly strike selection on Hypersurface.
- Read-only: discovery, odds, orderbooks, portfolio when wallet linked, events/categories. No order placement.
- Handoffs to VINCE, Solus, Otaku via ASK_AGENT.

---

## What Oracle Can Do Today

- **Discovery:** GET_ACTIVE_POLYMARKETS, SEARCH_POLYMARKETS, GET_VINCE_POLYMARKET_MARKETS, GET_POLYMARKET_DETAIL, GET_POLYMARKET_PRICE, price history, categories, events.
- **Orderbooks/analytics:** GET_POLYMARKET_ORDERBOOK, GET_POLYMARKET_ORDERBOOKS, open interest, live volume, spreads.
- **Portfolio (wallet required):** GET_POLYMARKET_POSITIONS, GET_POLYMARKET_BALANCE, trade history, closed positions, user activity, top holders.
- **Knowledge:** Priority markets, macro-economy, regulation, stocks, bitcoin-maxi, commodities, research-daily; RAG.
- **Multi-agent:** ASK_AGENT to VINCE, Solus, Otaku, Kelly, Sentinel, Eliza, ECHO.

---

## What Oracle Cannot Do Yet / Gaps

- **No trading:** Does not place orders. PRD: keep read-only.
- **Wallet for portfolio:** Portfolio actions need linked Polymarket wallet; no in-chat connect. PRD: wallet flow or doc.
- **Gamma vs CLOB:** List/search may show Gamma odds; real-time from GET_POLYMARKET_PRICE. PRD: clarify in prompts; do not paste condition_id in replies.
- **Priority list refresh:** GET_VINCE_POLYMARKET_MARKETS is curated; update process not documented. PRD: refresh and ownership.
- **No options/IV:** Stays with VINCE/Solus. PRD: keep boundary.

---

## Key Files

| Area             | Path                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Agent            | [src/agents/oracle.ts](src/agents/oracle.ts)                                                           |
| Plugin           | [src/plugins/plugin-polymarket-discovery/](src/plugins/plugin-polymarket-discovery/)                   |
| Priority markets | [knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md](knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md) |

---

## For OpenClaw / PRD

Draft next-iteration PRD: wallet linking for portfolio, priority markets refresh, or Gamma vs CLOB prompt guidance.

---

## References

- [CLAUDE.md](CLAUDE.md) — Oracle as CPO.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT and handoffs.
