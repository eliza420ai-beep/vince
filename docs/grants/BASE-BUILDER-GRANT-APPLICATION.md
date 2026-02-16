# Base Builder Grant Application

**Applying for:** Base Builder Grant (1–5 ETH)  
**Project:** VINCE Multi-Agent System  
**Core agent for this application:** **Otaku** (the only agent that executes onchain)  
**Repository:** https://github.com/IkigaiLabsETH/vince  
**Status:** Shipped; targeting MVP on testnet with grant support

---

## TL;DR

**Otaku is the only agent in our system that can do onchain stuff.** Every other agent (Vince, Kelly, Solus, Sentinel, Oracle, Eliza, ECHO) is built for data, research, insights, lifestyle, or code—none have a wallet or execute transactions. Otaku is the one we want in front of VCs and grant committees: it has a funded wallet, runs on Base (and other EVM chains), and executes swaps, DCA, bridges, Morpho lending, stop-loss, and NFT mints via natural language. With this grant we will harden Otaku for testnet, validate it with real flows, and position it as the proof point for AI x crypto execution that can attract follow-on funding.

---

## Why Otaku Is the Funding Story

From a **VC and grant** perspective, Otaku is the differentiator:

- **Only agent with a wallet** — Holds funds; executes DeFi operations. No other agent in VINCE does this.
- **Two modes** — **Degen** (BANKR, full DeFi) and **Normies** (Coinbase-style, simple language). One codebase serves power users and mainstream abstraction.
- **Revenue path** — x402 micropayments for paid API (positions, quote, yields, history, portfolio). Alerts and completion events feed the product and notifications UX.
- **Shipped** — 13 actions, 5 paid + 5 free routes, DB-backed notifications, per-user completion events, real-time socket updates, and a mode-aware wallet UI. We are not pitching slides; we are pitching a running agent that needs testnet validation and polish to reach MVP.

The other agents provide context and value (market data, sentiment, risk, prediction markets, lifestyle, ops)—but they **cannot and are not designed to** move funds or execute onchain. For grants and investors, **Otaku is the one that needs to get attention and potential funding.**

---

## What We Built: Otaku

### Actions (13)

- **OTAKU_SWAP** — Token swaps (BANKR), confirmation flow  
- **OTAKU_LIMIT_ORDER** — Limit orders at target price  
- **OTAKU_DCA** — Dollar-cost averaging schedules  
- **OTAKU_POSITIONS** — Portfolio and active orders  
- **OTAKU_BRIDGE** — Cross-chain bridge (Relay, BANKR fallback)  
- **OTAKU_BALANCE** — Wallet balance  
- **OTAKU_STOP_LOSS** — Stop-loss, take-profit, trailing stops  
- **OTAKU_MORPHO** — Supply/withdraw Morpho vaults  
- **OTAKU_APPROVE** — Token approvals  
- **OTAKU_NFT_MINT** — Mint NFTs (e.g. gen-art handoff)  
- **OTAKU_YIELD_RECOMMEND** — Yield suggestions  
- **OTAKU_SET_REBALANCE** — Rebalance targets and task  
- **OTAKU_EXECUTE_VINCE_SIGNAL** — Execute Vince signal (swap/bridge)  

### API

- **Free:** `/otaku/health`, `/otaku/config` (runtime mode), `/otaku/alerts` (Morpho/DCA/stop-loss), `/otaku/notifications` (completion events, optional per-user), `/otaku/gas`  
- **Paid (x402):** `/otaku/positions`, `/otaku/quote`, `/otaku/yields`, `/otaku/history`, `/otaku/portfolio`  

### Integrations

- **Coinbase CDP** — Wallet, transfers, optional Advanced Trade  
- **BANKR** — Agent API + Trading Engine (swaps, DCA, TWAP, orders)  
- **Relay** — Cross-chain bridge  
- **Morpho** — Lending (Blue SDK)  
- **x402** — Micropayments in USDC  
- **ERC-8004** — On-chain agent identity (in progress)  

### Product

- **Notifications:** Wallet history + proactive alerts (GET /otaku/alerts) + completion events (DB, per-user), merged in UI with refetch on focus and socket-driven refresh.  
- **Wallet UI:** Degen vs Normies mode (from GET /otaku/config); mode-aware copy, tabs, and actions; optional Swap hidden in normies.  

---

## Other Agents (Context Only)

VINCE runs multiple agents; they support the system but are **not** the grant story:

| Agent   | Role  | Function |
|---------|--------|----------|
| Eliza   | CEO    | Knowledge, research |
| VINCE   | CDO    | Market data: options, perps, funding |
| ECHO    | CSO    | CT sentiment, X research |
| Oracle  | CPO    | Prediction markets (Polymarket) |
| Solus   | CFO    | Risk, position sizing |
| **Otaku** | **COO** | **DeFi execution on Base** ← This grant |
| Kelly   | CVO    | Lifestyle, touch grass |
| Sentinel| CTO    | Ops, code, infra |

None of these agents hold funds or execute transactions. Otaku is the single executor and the one we are putting forward for the Base Builder Grant.

---

## Why Base?

1. **Low fees** — DCA and TWAP need many transactions; Base makes this viable.  
2. **BANKR** — Trading Engine runs on Base.  
3. **x402** — Micropayments in USDC on Base.  
4. **Coinbase ecosystem** — CDP and Advanced Trade integration path.  
5. **DeFi** — Morpho, Aerodrome, Moonwell for yield and execution.

---

## What We Will Do With the Grant

### Immediate (1–2 weeks)

1. **Testnet hardening** — Document and validate Otaku on Base Sepolia (or chosen testnet): RPC, CDP wallet, BANKR/Relay testnet, env and flows.  
2. **E2E confirmation** — Lock down pending state (swap/bridge/DCA) so “confirm” → execute works reliably across turns.  
3. **Deploy Otaku wallet on Base mainnet** when testnet is validated; fund initial operations for live DCA/TWAP testing.

### Short-term (1 month)

4. **Complete Trading Engine integration** — TWAP, order management (list, cancel, status), app fees (e.g. 0.5% on volume) for sustainability.  
5. **Live testing with real capital** — Paper bot → real trades; validate signals with skin in the game.  
6. **Multi-agent demo** — VINCE/Solus signal → Otaku executes; full pipeline with receipts.

### Medium-term (2–3 months)

7. **Yield on Base** — Morpho lending, Aerodrome LP, auto-compound where applicable.  
8. **ERC-8004** — Register Otaku on Base; reputation through successful trades; trustless agent-to-agent where relevant.

---

## Team

**IkigaiLabsETH** — AI agents and DeFi since 2024.

- ElizaOS contributors  
- Previous: NFT infra, DeFi protocols  
- Active in Base ecosystem  

---

## Traction

- **Otaku shipped** — 13 actions, 10 routes, DB-backed notifications, per-user events, mode-aware UI.  
- **Multi-agent system live** — Standups, ASK_AGENT, Discord A2A.  
- **Self-improving ML** — Paper bot and feature store; path to Otaku execution.  
- **Open source** — MIT; public repo.

---

## Grant Usage

**Requesting: 3 ETH**

| Use            | Amount | Purpose |
|----------------|--------|---------|
| Otaku wallet   | 1.5 ETH| Live DeFi, DCA, testnet/mainnet |
| Gas & testing  | 0.5 ETH| Deployments, testnet runs |
| Infrastructure | 0.5 ETH| APIs, hosting, tooling |
| Contingency    | 0.5 ETH| Audits, unexpected costs |

---

## Success Metrics

| Metric                    | Target | Timeframe |
|---------------------------|--------|-----------|
| Testnet E2E flows passing | All    | 2 weeks   |
| Live DCA orders (mainnet) | 10+    | 1 month   |
| Unique Base txs           | 100+   | 1 month   |
| Yield strategies on Base  | 3+     | 2 months  |
| ERC-8004 registration     | Done   | 2 months  |

---

## Why Fund Us?

1. **Shipped** — Otaku is running with actions, routes, notifications, and UI; we need testnet validation and path to mainnet, not a concept.  
2. **Only executor** — Clear positioning: one agent that does onchain execution; others support.  
3. **Dual mode** — Degen (BANKR/DeFi) and Normies (Coinbase-style) in one stack.  
4. **Open source** — MIT; ecosystem can build on it.  
5. **Base-native** — BANKR, x402, CDP, Morpho; execution and revenue on Base.

We are not selling a chatbot. We are asking for support to take our **already-shipped onchain execution agent** to MVP on testnet and mainnet so it can be the proof point for AI x crypto that attracts further funding.

---

## Links

- **Repo:** https://github.com/IkigaiLabsETH/vince  
- **Otaku doc:** [docs/OTAKU.md](../OTAKU.md)  
- **README:** README.md, MULTI_AGENT.md, FEATURE-STORE.md  
- **Twitter/X:** [@IkigaiLabsETH](https://x.com/IkigaiLabsETH)  

---

## Contact

**Email:** [your email]  
**Discord:** [your handle]  
**Telegram:** [your handle]  

---

*“One team, one dream. Otaku executes.”*
