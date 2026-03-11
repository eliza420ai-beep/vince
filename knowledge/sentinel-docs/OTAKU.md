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

## References

- [CLAUDE.md](CLAUDE.md) — VINCE project layout; Otaku as the only agent with a funded wallet.
- [README.md](README.md) — Repo overview and quick start.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — Multi-agent coordination (ASK_AGENT, Discord, A2A).
- [docs/grants/BASE-BUILDER-GRANT-APPLICATION.md](grants/BASE-BUILDER-GRANT-APPLICATION.md) — Grant application with Otaku as the core differentiator for funding.

Built with [ElizaOS](https://github.com/elizaos/eliza) and [Coinbase Developer Platform](https://docs.cdp.coinbase.com/).
