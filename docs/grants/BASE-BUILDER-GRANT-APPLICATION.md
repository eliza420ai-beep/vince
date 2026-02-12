# Base Builder Grant Application

## Otaku: Autonomous DeFi Agent on Base

**Applying for:** Base Builder Grant (1-5 ETH)  
**Project:** VINCE Multi-Agent System  
**Component:** Otaku (COO Agent)  
**Repository:** https://github.com/IkigaiLabsETH/vince  
**Status:** Shipped (v2.3.0)

---

## TL;DR

Otaku is the **Chief Operating Officer** of an 8-agent AI system built on ElizaOS. It's the only agent with a funded wallet—executing DeFi operations on Base via natural language. Think of it as an autonomous treasury manager that can swap, DCA, set stop-losses, and manage yields without manual intervention.

**What makes it special:** Otaku doesn't just execute orders. It coordinates with 7 other specialized agents (market data, sentiment, risk management) to make informed decisions, then explains *why* it's making each trade.

---

## What We Built

### The Dream Team (8 Agents)

| Agent | Role | Function |
|-------|------|----------|
| **Eliza** | CEO | Knowledge base, research, strategy |
| **VINCE** | CDO | Market data: options, perps, funding, OI |
| **ECHO** | CSO | CT sentiment, X research, social alpha |
| **Oracle** | CPO | Prediction markets (Polymarket) |
| **Solus** | CFO | Risk: position sizing, stop-loss, rebalancing |
| **Otaku** | COO | **DeFi execution on Base** ← This grant |
| **Kelly** | CVO | Lifestyle balance (touch grass) |
| **Sentinel** | CTO | Ops, code, infrastructure |

### Otaku's Capabilities (Shipped)

**7 Actions:**
- `OTAKU_SWAP` — Token swaps via BANKR
- `OTAKU_LIMIT_ORDER` — Limit orders with confirmation flow
- `OTAKU_DCA` — Dollar cost averaging (7-day schedules, etc.)
- `OTAKU_POSITIONS` — View current positions
- `OTAKU_BRIDGE` — Cross-chain bridging
- `OTAKU_BALANCE` — Wallet balance check
- `OTAKU_STOP_LOSS` — Stop-loss + take-profit + trailing stops

**6 API Routes (x402 micropayments):**
- `/otaku/positions` — Paid ($0.05)
- `/otaku/quote` — Paid ($0.02)
- `/otaku/yields` — Paid ($0.10)
- `/otaku/history` — Paid ($0.05)
- `/otaku/health` — Free
- `/otaku/gas` — Free

**Integrations:**
- BANKR Agent API — Natural language → trades
- BANKR Trading Engine API — Direct EIP-712 signed orders (DCA, TWAP)
- x402 Protocol — Micropayments for API access
- ERC-8004 — On-chain agent identity (in progress)

### Technical Stats

- **20 plugins**, **162 actions** across the system
- **173 tests** for trading components alone
- **55 tests** specifically for plugin-otaku
- **~30,000 lines** of plugin code
- **Open source** — MIT license

---

## Why Base?

1. **Low fees** — DCA and TWAP need multiple transactions; Base makes this viable
2. **BANKR native** — BANKR Trading Engine runs on Base
3. **x402 on Base** — Micropayments in USDC on Base
4. **Coinbase ecosystem** — CDP wallet integration path
5. **Growing DeFi** — Aerodrome, Morpho, Moonwell for yield strategies

---

## What We'll Build with the Grant

### Immediate (1-2 weeks)

1. **Deploy Otaku wallet on Base mainnet**
   - Fund initial operations
   - Enable live DCA/TWAP testing

2. **Complete Trading Engine integration**
   - TWAP orders (time-weighted execution)
   - Order management (list, cancel, status)
   - App fees for sustainability (0.5% on volume)

3. **Live testing with real capital**
   - Paper bot → real trades
   - Validate ML signals with skin in the game

### Short-term (1 month)

4. **Yield strategies on Base**
   - Morpho lending optimization
   - Aerodrome LP management
   - Auto-compound yields

5. **Multi-agent coordination demo**
   - VINCE spots opportunity → Solus sizes → Otaku executes
   - Full pipeline with transaction receipts

### Medium-term (2-3 months)

6. **ERC-8004 on-chain identity**
   - Register Otaku on Base
   - Build reputation through successful trades
   - Enable trustless agent-to-agent transactions

---

## Team

**IkigaiLabsETH** — Building at the intersection of AI agents and DeFi since 2024.

- ElizaOS core contributors
- Previous: NFT infrastructure, DeFi protocols
- Active in Base ecosystem

---

## Traction

- **v2.3.0 shipped** — Full BANKR integration
- **8 agents operational** — Multi-agent standups working
- **Self-improving ML** — Paper bot with 50+ features per decision
- **Community** — Discord with daily standups, open development

---

## Grant Usage Breakdown

**Requesting: 3 ETH**

| Allocation | Amount | Purpose |
|------------|--------|---------|
| Otaku wallet funding | 1.5 ETH | Live DeFi operations, DCA testing |
| Gas for development | 0.5 ETH | Contract deployments, testing |
| Infrastructure | 0.5 ETH | Supabase, API costs, hosting |
| Contingency | 0.5 ETH | Unexpected costs, security audits |

---

## Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Live DCA orders executed | 10+ | 2 weeks |
| Unique Base transactions | 100+ | 1 month |
| ML-informed trades | 50+ | 1 month |
| Yield strategies deployed | 3+ | 2 months |
| ERC-8004 registration | Complete | 2 months |

---

## Links

- **Repository:** https://github.com/IkigaiLabsETH/vince
- **Documentation:** See README.md, MULTI_AGENT.md, FEATURE-STORE.md
- **Demo:** Multi-agent standup in Discord (invite on request)
- **Twitter/X:** [@IkigaiLabsETH](https://x.com/IkigaiLabsETH)

---

## Why Fund Us?

1. **Shipped, not vaporware** — v2.3.0 is live with 173 tests
2. **Unique approach** — Multi-agent coordination, not just another bot
3. **Open source** — Everything MIT licensed, benefits the ecosystem
4. **Base-native execution** — BANKR + x402 + ERC-8004 all on Base
5. **Self-improving** — ML loop means Otaku gets smarter over time

We're not building a chatbot. We're building autonomous economic agents that coordinate, reason, and execute—with Base as the settlement layer.

---

## Contact

**Email:** [your email]  
**Discord:** [your handle]  
**Telegram:** [your handle]

---

*"One team, one dream. Push, not pull."*
