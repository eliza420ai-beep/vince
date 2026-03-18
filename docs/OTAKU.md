# Otaku: DeFi Execution Agent (VINCE)

Otaku is the **COO agent** in the VINCE multi-agent system and the **only agent with a funded wallet**. It executes DeFi operations on Base (and other EVM chains) via natural language: swaps, DCA, limit orders, bridging, Morpho lending, stop-loss, and NFT minting. Built on ElizaOS with Coinbase Developer Platform (CDP), BANKR, Relay, Morpho, and x402.

**Repository:** This doc describes Otaku as implemented in [github.com/IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince). For the standalone Otaku reference project (structure, managers, workspace packages), see [github.com/elizaOS/otaku](https://github.com/elizaOS/otaku/).

---

## Why Otaku Matters

- **Only onchain executor:** Vince, Kelly, Solus, Sentinel, Oracle, Eliza, ECHO—none have a wallet or execute transactions. Otaku is the single agent that can move funds, swap, bridge, and mint.
- **Two modes:** **Degen** (BANKR, full DeFi, power-user) and **Normies** (Coinbase CEX-style, simple language). Same codebase; mode is runtime config and drives backend behavior and frontend wallet UI copy.
- **Revenue path:** x402 micropayments for paid API routes (positions, quote, yields, history, portfolio). Alerts and completion events feed the in-app notifications panel.

---

## Architecture

- **Character:** [src/agents/otaku.ts](src/agents/otaku.ts) — plugins, knowledge dirs, system prompt, `OTAKU_MODE` (degen | normies), optional Discord, x402, Advanced Trade, ERC-8004.
- **Execution layer:** [src/plugins/plugin-otaku/](src/plugins/plugin-otaku/) — OtakuService, actions, providers, evaluators, routes (free + x402-paid).
- **Wallet & payments:** plugin-cdp (CDP wallet, transfers, x402), plugin-bankr (BANKR Agent + Trading Engine for swaps/DCA/orders).
- **Chains & protocols:** plugin-relay (bridge), plugin-morpho (lending), plugin-etherscan (tx confirmation), plugin-biconomy (gasless when configured).

---

## Features (Shipped)

### Actions (13)

| Action                       | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `OTAKU_SWAP`                 | Token swaps via BANKR; confirmation flow       |
| `OTAKU_LIMIT_ORDER`          | Limit orders at target price                   |
| `OTAKU_DCA`                  | Dollar-cost averaging schedules                |
| `OTAKU_POSITIONS`            | Portfolio and active orders                    |
| `OTAKU_BRIDGE`               | Cross-chain bridge (Relay, fallback BANKR)     |
| `OTAKU_BALANCE`              | Wallet balance check                           |
| `OTAKU_STOP_LOSS`            | Stop-loss, take-profit, trailing stops         |
| `OTAKU_MORPHO`               | Supply/withdraw Morpho vaults                  |
| `OTAKU_APPROVE`              | Token approval management                      |
| `OTAKU_NFT_MINT`             | Mint NFTs (e.g. gen-art handoff from Sentinel) |
| `OTAKU_YIELD_RECOMMEND`      | Yield strategy suggestions                     |
| `OTAKU_SET_REBALANCE`        | Rebalance targets and task                     |
| `OTAKU_EXECUTE_VINCE_SIGNAL` | Execute Vince signal (swap/bridge)             |

### Routes

**Free (no x402):**

- `GET /otaku/health` — Service health
- `GET /otaku/config` — Runtime mode `{ mode: "degen" | "normies" }` (single source of truth for frontend)
- `GET /otaku/alerts` — Proactive alerts (Morpho health, DCA/stop-loss counts) as JSON; used by notifications UI
- `GET /otaku/notifications` — Completion events (swap/DCA/bridge/Morpho/stop-loss/NFT) from DB; optional `?userId=` for per-user filtering
- `GET /otaku/gas` — Gas prices across chains

**Paid (x402 when enabled):**

- `GET /otaku/positions` — Portfolio positions and orders
- `GET /otaku/quote` — Swap quote
- `GET /otaku/yields` — DeFi yield opportunities
- `GET /otaku/history` — Transaction history
- `GET /otaku/portfolio` — Full portfolio visualization

### Notifications Pipeline

- **Alerts:** Shared [getAlerts(runtime)](src/plugins/plugin-otaku/src/lib/getAlerts.ts) used by `GET /otaku/alerts` only (ProactiveAlertsProvider removed). Morpho health &lt; 1.2, active DCA/stop-loss counts.
- **Completion events:** [notificationEvents.ts](src/plugins/plugin-otaku/src/lib/notificationEvents.ts) — DB-backed (`notification_events` table via runtime memory API), per-user (`entityId`), cap 50. Action handlers call `appendNotificationEvent(runtime, input, message.entityId)` on success; socket `notifications:update` emitted after persist.
- **Frontend:** [useWalletNotifications](src/frontend/hooks/useWalletNotifications.ts) merges wallet history (CDP), alerts (GET /otaku/alerts), and events (GET /otaku/notifications?userId=). Refetch on window focus; subscription to `notifications:update` when agentId set.

### Wallet UI (Degen vs Normies)

- **Mode source:** Backend `GET /otaku/config` (fallback: `VITE_OTAKU_MODE`). App passes `mode` to CDPWalletCard, Widget, CollapsibleNotifications, MobileHeader.
- **Degen:** "DeFi" pill, tabs Tokens / Collections / History / Orders, buttons Fund / Send / Swap.
- **Normies:** "Simple" pill, Balance / Collections / Activity / Orders, Add funds / Send / Buy & sell (Swap hidden when `showSwap: false`). Empty states and tooltips use mode-specific copy.

---

## Configuration

- **OTAKU_MODE:** `degen` (default) or `normies`. Backend only; frontend reads via GET /otaku/config or `VITE_OTAKU_MODE`.
- **Wallet:** CDP keys (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`), optional `ALCHEMY_API_KEY`. Advanced Trade: `COINBASE_ADVANCED_TRADE_KEY_NAME`, `COINBASE_ADVANCED_TRADE_KEY_SECRET`.
- **Execution:** `BANKR_API_KEY` (and optional `BANKR_AGENT_URL`, `BANKR_ORDER_URL`), `RELAY_API_KEY` (bridge), `ETHERSCAN_API_KEY` (optional), `BICONOMY_API_KEY` (optional gasless).
- **x402:** `X402_ENABLED=true`, `X402_PAY_TO`, etc. See `.env.example`.

---

## For Developers: Code Review & MVP (Roy)

This section is for developers (e.g. Roy) doing a code review or helping get Otaku to **MVP level for testnet testing**. It summarizes what Otaku **can** and **cannot** do today and where to look.

### What Otaku Can Do Today

- **Chat:** Natural-language requests; question vs command detection; confirmation flows for swap, bridge, DCA, Morpho, stop-loss, NFT mint.
- **Execution:** Swaps (BANKR), limit orders, DCA, bridge (Relay then BANKR fallback), Morpho supply/withdraw, stop-loss orders, NFT mint (contract + gen-art path), Vince signal execution.
- **Data:** Positions, balance, quote, yields, history, portfolio via paid routes when x402 enabled; health, config, alerts, notifications, gas via free routes.
- **Notifications:** Wallet history + proactive alerts + completion events in one list; per-user events; real-time refetch on socket `notifications:update`.
- **UI:** Wallet card (tokens/balance, collections, history/activity, orders) with degen/normies copy and optional Swap hide in normies; mobile wallet sheet with same mode; notifications panel with merge and mark-all-read.

### What Otaku Cannot Do / Gaps

- **Confirmation state:** Pending swap/bridge/DCA etc. are stored via a **pending cache** (e.g. [pendingCache](src/plugins/plugin-otaku/src/utils/pendingCache.ts)); not all flows may persist across turns in every environment. Worth verifying "confirm" → execute path end-to-end.
- **Intent parsing:** Largely regex-based; phrasings like "I want to exchange some ethereum for stablecoins" may not map to OTAKU_SWAP. LLM-based intent extraction would improve robustness.
- **Testnet:** Default setup targets mainnet/CDP production. Testnet (e.g. Base Sepolia) requires testnet RPC, testnet CDP/wallet config, and possibly BANKR/Relay testnet support—not fully documented here.
- **Alerts in context:** Proactive alerts are **API-only** (GET /otaku/alerts). The agent no longer sees "Proactive Alerts" in its system context; it can still answer "what are my alerts?" if an action or tool calls `getAlerts(runtime)` (not wired by default).
- **Placeholders:** Some NFT/Morpho configs (e.g. known collections, popular vaults) may still use placeholder addresses; replace with real contract addresses for production.

### Key Files for Code Review

| Area                     | Path                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Agent definition         | [src/agents/otaku.ts](src/agents/otaku.ts)                                                                       |
| Plugin entry             | [src/plugins/plugin-otaku/src/index.ts](src/plugins/plugin-otaku/src/index.ts)                                   |
| Service                  | [src/plugins/plugin-otaku/src/services/otaku.service.ts](src/plugins/plugin-otaku/src/services/otaku.service.ts) |
| Actions                  | [src/plugins/plugin-otaku/src/actions/](src/plugins/plugin-otaku/src/actions/)                                   |
| Alerts (shared)          | [src/plugins/plugin-otaku/src/lib/getAlerts.ts](src/plugins/plugin-otaku/src/lib/getAlerts.ts)                   |
| Notification events (DB) | [src/plugins/plugin-otaku/src/lib/notificationEvents.ts](src/plugins/plugin-otaku/src/lib/notificationEvents.ts) |
| Routes                   | [src/plugins/plugin-otaku/src/routes/](src/plugins/plugin-otaku/src/routes/) (freeRoutes, paid\*)                |
| Wallet UI                | [src/frontend/components/dashboard/cdp-wallet-card/](src/frontend/components/dashboard/cdp-wallet-card/)         |
| Notifications hook       | [src/frontend/hooks/useWalletNotifications.ts](src/frontend/hooks/useWalletNotifications.ts)                     |

### How to Run & Test

- From repo root: `bun install`, configure `.env` (see Configuration above), `bun start` or `bun run dev`. Use the printed Vite URL (e.g. http://localhost:5173) for the chat UI.
- Select Otaku agent; try "What can you do?", "Swap 0.01 ETH for USDC", "My balance", "Bridge 10 USDC from Base to Arbitrum". Check server logs for action and route execution.
- Notifications: Open the notifications panel; expect wallet history + alerts + completion events after executing a swap/DCA/bridge etc. (with userId so events are per-user when logged in).

### Suggested Issues for MVP / Testnet

1. **E2E confirmation flow** — Verify pending state survives across messages (swap → "confirm" → execution) in all environments; document or fix any cache/state gaps.
2. **Testnet support** — Document and validate Base Sepolia (or chosen testnet): RPC, CDP wallet, BANKR/Relay testnet endpoints, and env vars.
3. **LLM intent parsing** — Add optional LLM-based intent extraction for swap/bridge/DCA so natural phrasings map to the right action.
4. **Alerts in context (optional)** — If product wants the agent to proactively mention alerts in chat, add an action or provider that calls `getAlerts(runtime)` when the user asks about alerts or risk.
5. **Replace placeholders** — Audit KNOWN_COLLECTIONS, POPULAR_VAULTS, and similar; replace with real contract addresses for target chains.
6. **Error handling & observability** — Consistent error codes and logging for paid routes and actions; optional tracing for testnet debugging.

---

## Plugins (Summary)

| Plugin              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| plugin-cdp          | Coinbase Developer Platform wallet, transfers, x402            |
| plugin-bankr        | BANKR Agent + Trading Engine (swaps, DCA, orders)              |
| plugin-otaku        | Otaku COO layer (actions, routes, alerts, notification events) |
| plugin-relay        | Cross-chain bridge                                             |
| plugin-morpho       | Morpho lending (Blue SDK)                                      |
| plugin-etherscan    | Transaction confirmation (optional)                            |
| plugin-biconomy     | Gasless tx (optional)                                          |
| plugin-defillama    | Protocol TVL / yields                                          |
| plugin-bootstrap    | Core ElizaOS actions, evaluators, providers                    |
| @elizaos/plugin-sql | Database                                                       |
| Others              | Discord, x402, inter-agent, ERC-8004 as configured in otaku.ts |

### Security Knowledge: EVMbench

Otaku ingests `knowledge/security/`, which includes **EVMbench** (OpenAI + Paradigm): the benchmark for AI agents on EVM smart contract vulnerability detection, patching, and exploit. When advising on protocol risk, audit quality, or contract safety, Otaku can reference EVMbench as the emerging standard and prefer defensive use (AI-assisted auditing, hardened contracts). See [knowledge/security/evmbench-ai-smart-contract-benchmark.md](../knowledge/security/evmbench-ai-smart-contract-benchmark.md).

---

## Prerequisites & Scripts

- **Runtime:** Bun; Node 18+.
- **Env:** Copy `.env.example` to `.env`; set CDP, BANKR, and at least one AI provider key. See Configuration above.
- **Scripts:** `bun run dev` (backend + Vite), `bun run build`, `bun run start`. Type-check: `bun run type-check`.

---

## x402 Ecosystem Positioning

Otaku is an **autonomous economic actor** in the emerging x402 machine economy — not just an agent with a wallet. The x402 protocol (Coinbase + Cloudflare, May 2025) embeds USDC micropayments directly into HTTP, activating the long-dormant HTTP 402 status code. Settlement on Base: ~$0.0001 per transaction, ~2 seconds.

### Dual Facilitator Strategy

Otaku uses two facilitators for different functions:

| Facilitator | Function | Settlement | Fee | Status |
|-------------|----------|------------|-----|--------|
| **BANKR** | DeFi execution (swaps, bridges) | USDC on Base | 0.8% → $BNKR buybacks | Live |
| **Stripe** | Data API monetization (paid routes) | Fiat into Stripe balance → bank | 1.5% per charge, gasless | Roadmap |

BANKR and Stripe don't compete — they serve different sides of the stack. BANKR handles DeFi execution with structural token demand. Stripe handles data sales with fiat settlement, expanding the buyer base from crypto-native agents to anyone with a payment method.

### Two Protocols: x402 + MPP

| Protocol | Payment method | Best for | Status |
|----------|---------------|----------|--------|
| **x402** | USDC on Base/Solana (crypto only) | Agent-to-agent micropayments | Live (5 paid routes) |
| **MPP** | Crypto (Tempo/USDC) AND fiat (cards, wallets, SPTs via Stripe) | Broader market — traditional buyers | Roadmap |

**MPP (Machine Payments Protocol)** is Stripe's second machine payment protocol. Same HTTP 402 pattern as x402, but supports Shared Payment Tokens (SPTs) — meaning a hedge fund, fintech app, or any business can pay for Otaku's API endpoints with a corporate card. The addressable market goes from "agents with crypto wallets on Base" to "anyone with a payment method."

Reference implementation: [eliza420ai-beep/machine-payments](https://github.com/eliza420ai-beep/machine-payments) (forked from [stripe-samples/machine-payments](https://github.com/stripe-samples/machine-payments)). TypeScript + Python samples for both x402 and MPP servers.

### Where Otaku Sits in the Stack

| Layer | Otaku's Role | Status |
|-------|-------------|--------|
| **Settlement chain** | CDP wallet on Base (Coinbase's L2, primary x402 settlement chain) | Live |
| **x402 seller** | Paid API routes (`/otaku/positions`, `/quote`, `/yields`, `/history`, `/portfolio`) gate data behind USDC micropayments | Live |
| **MPP seller** | Same paid routes accepting cards/wallets/SPTs via Stripe, fiat settlement | Roadmap |
| **x402 buyer** | Autonomously pay for external agent services (data feeds, compute, research) via x402 endpoints | Roadmap |
| **MPP buyer** | Pay for traditional APIs (non-crypto) using SPTs — extends Otaku's purchasing power beyond x402 endpoints | Roadmap |
| **ERC-8004 identity** | On-chain agent registration, reputation queries, endorse/penalize actions, multi-registry | Live (plugin-erc8004) |
| **ERC-8183 commerce** | Formalize Otaku actions as interoperable Jobs (client/provider/evaluator pattern) | Roadmap |
| **BANKR facilitator** | Primary DeFi execution via BANKR (x402 facilitator, 80+ projects on Base, 0.8% swap fee → $BNKR buybacks) | Live |
| **Stripe facilitator** | Data API monetization via Stripe (x402 + MPP, fiat settlement, 1.5% per charge, gasless) | Roadmap |

### x402 Ecosystem Context (Khala Research, March 2026)

- **~165M transactions**, ~$46.5M cumulative volume processed across the x402 ecosystem.
- **Coinbase** dominates: 58.7% of all-time $ volume; Base is primary settlement; CDP is top facilitator.
- **Institutional adoption:** Coinbase (creator), Cloudflare (co-founded x402 Foundation), Google (A2A / Agent Payments Protocol), Visa (Trusted Agent Protocol), **Stripe** (live on Base, Feb 2026 — now a full x402 + MPP facilitator with fiat settlement, 1.5% per charge, gasless, microtransactions as low as $0.01 USDC; also supports MPP with Shared Payment Tokens for card/wallet/fiat payments), Circle (Arc in development).
- **Agentic stack:** x402 (payments) + ERC-8004 (identity/reputation) + ERC-8183 (commerce: Jobs, escrow, delivery attestation) + ERC-8126 (agent security scoring, 0-100 risk score).
- **No protocol token** — value accrues to facilitators, settlement chains, agent frameworks, and identity layers.
- **BANKR** ($BNKR, ~$50M mcap): operates its own x402 facilitator server; x402 SDK since July 2025; "default financial execution layer for agents built on OpenClaw"; 0.8% swap fee routes into $BNKR buybacks. Every Otaku swap generates BANKR ecosystem value.

### Value Accrual Framework

Value accrues at five points in the x402 stack (in order of durability):

1. **Settlement chains** (Base/Solana) — sequencer fees on every tx. Most durable.
2. **Agent commerce OS** (Virtuals ACP) — transaction fees on agent-to-agent commerce. Highest growth.
3. **Commerce layers** (DREAMS Router) — router fees across frameworks. Unproven but asymmetric.
4. **Identity/trust** (ERC-8004, Kite AIR) — attestation fees. Essential for high-value autonomous tx.
5. **Facilitators** — commoditizing toward zero margins (Dexter's zero-fee model compressing the market).

Otaku sits at layers 1 (Base settlement), 2 (commerce/execution), and 4 (ERC-8004 identity). Correct positioning — we avoid the facilitator race to zero.

### x402 Investable Universe (for Dexter coverage)

| Position | Ticker | Layer | Relevance to Otaku |
|----------|--------|-------|-------------------|
| Coinbase | $COIN (equity) | Foundation — multi-layer moat | Protocol author; Otaku's CDP wallet provider; Base settlement |
| Virtuals Protocol | $VIRTUAL (~$518M) | Agent commerce OS | Co-authored ERC-8183; $1.4M/mo protocol fees; 21K+ agents; $480M aGDP |
| Kite AI | $KITE (~$368M) | Agent-native L1 | PayPal + Coinbase Ventures; BIP-32 agent identity |
| DayDreams | $DREAMS (~$6.3M) | Commerce layer | x402-native router; binary/asymmetric |
| BANKR | $BNKR (~$50M) | Facilitator + execution | Otaku's primary DeFi execution layer |
| Fabric/OpenMind | $ROBO (~$70M) | Physical economy | Robots + x402; Circle partnership |

### Roadmap: Otaku as Autonomous Economic Actor

**Phase 1 — Deepen what's live:**
- Expand x402 paid routes: signal quality scores, portfolio analytics, risk assessments, Vince paper-bot performance data.
- Build ERC-8004 reputation through attestations on every successful trade execution.

**Phase 1.5 — Stripe machine payments (dual facilitator):**
- Contact `machine-payments@stripe.com` for account enablement.
- Add Stripe as x402 facilitator for paid data routes — fiat settlement into Stripe balance alongside existing CDP/USDC flow.
- Add MPP support using `mppx` package: wrap existing 5 paid routes with `Mppx.create()` + `stripe.charge()` to accept cards/wallets/SPTs alongside USDC.
- Integration template: [eliza420ai-beep/machine-payments](https://github.com/eliza420ai-beep/machine-payments) (x402 + MPP TypeScript/Python samples).
- New env vars: `STRIPE_SECRET_KEY`, `STRIPE_MACHINE_PAYMENTS_ENABLED`, `MPP_ENABLED`, `MPP_SECRET_KEY`, `STRIPE_PROFILE_ID`.

**Phase 2 — ERC-8183 commerce layer:**
- Define Otaku actions (swap, bridge, signal execution) as ERC-8183 Jobs: client posts requirements + escrow → Otaku executes → evaluator verifies → payment releases.
- OTAKU_EXECUTE_VINCE_SIGNAL maps directly: Vince produces signal (Job), Otaku executes (Provider), trade outcome evaluator verifies (Evaluator).
- Makes Otaku interoperable with any external agent, not just our internal swarm.

**Phase 3 — x402 + MPP buyer:**
- Enable Otaku to autonomously pay for external x402 endpoints (market data, research, compute) without human intervention.
- MPP buyer via SPTs extends purchasing power to traditional APIs (not just x402 endpoints) — any Stripe-enabled API becomes purchasable.
- Inter-agent x402 payments: Vince charges for premium signal data; Otaku pays per-call.

---

## References

- [CLAUDE.md](CLAUDE.md) — VINCE project layout; Otaku as the only agent with a funded wallet.
- [README.md](README.md) — Repo overview and quick start.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — Multi-agent coordination (ASK_AGENT, Discord, A2A).
- [docs/grants/BASE-BUILDER-GRANT-APPLICATION.md](grants/BASE-BUILDER-GRANT-APPLICATION.md) — Grant application with Otaku as the core differentiator for funding.
- [Khala Research: x402 Report (March 2026)](https://www.khala.io/x402-completing-the-internets-missing-payment-layer-for-agentic-commerce) — Full x402 ecosystem analysis, value accrual framework, investable universe.
- [Stripe Machine Payments](https://docs.stripe.com/payments/machine) — Stripe's official x402 + MPP facilitator docs. x402 guide: [docs.stripe.com/payments/machine/x402](https://docs.stripe.com/payments/machine/x402). MPP guide: [docs.stripe.com/payments/machine/mpp](https://docs.stripe.com/payments/machine/mpp).
- [eliza420ai-beep/machine-payments](https://github.com/eliza420ai-beep/machine-payments) — Forked reference implementation (TypeScript + Python) for x402 and MPP servers.

Built with [ElizaOS](https://github.com/elizaos/eliza) and [Coinbase Developer Platform](https://docs.cdp.coinbase.com/).
