---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

---

## Context

MEV (maximal extractable value) in perpetuals includes liquidation ordering, funding arbitrage, and order-flow extraction. This doc outlines how to reason about MEV and perp design for analysis and execution, not for live MEV data.

## Main

**Liquidation and funding:** Liquidations and funding payments are high-value events; who gets to execute first (validators, keepers, bots) and at what price affects PnL. Funding arbitrage (long/short across venues or time) is another MEV source. Use frameworks (e.g. "identify who controls sequencing") rather than quoting current MEV.

**Order flow and execution:** On-chain order books and AMMs expose order flow to front-running and sandwich risk; private order flow or off-chain matching can reduce but not eliminate it. Map venue design to who bears execution cost and who captures value.

**Related content:** See perps-trading (funding-rates, slippage) and defi-metrics for protocol and flow frameworks; security for trust and bridge risk.

## Conclusion

Use this for MEV and perp design frameworks. For current MEV, fees, or execution data, use actions and APIs.
