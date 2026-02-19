# plugin-bankr

Bankr Agent API and External Orders API integration for ElizaOS. **Used only by Otaku** (not VINCE).

## Requirements

- `BANKR_API_KEY` — get one at [bankr.bot/api](https://bankr.bot/api) (wallet access enabled for execution).
- After changing `BANKR_API_KEY` or Bankr plugin code, restart the app (and run `bun run build` if you run from `dist/`) so the Bankr service picks up the key.

## Env (optional)

- `BANKR_AGENT_URL` — default `https://api.bankr.bot`
- `BANKR_ORDER_URL` — default `https://api.bankr.bot/trading/order`

## Actions

| Action                     | Description                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BANKR_AGENT_PROMPT**     | Send a natural-language prompt to the Bankr AI agent. Covers portfolio & balances, transfers, swaps, limit/stop/DCA/TWAP creation, leveraged (Avantis), token launch, NFTs, Polymarket, automations. Submit → poll until complete → return response and any transaction details. |
| **BANKR_USER_INFO**        | Get authenticated account info: wallets (EVM, Solana), social accounts, Bankr Club status, ref code, leaderboard score/rank. Use for "what wallets?", "am I in Bankr Club?", etc.                                                                                                |
| **BANKR_JOB_STATUS**       | Get status of a Bankr prompt job by jobId (pending, processing, completed, failed, cancelled). jobId in message or `actionParams.jobId`.                                                                                                                                         |
| **BANKR_AGENT_CANCEL_JOB** | Cancel a pending or processing Bankr prompt job by jobId. jobId in message or `actionParams.jobId`.                                                                                                                                                                              |
| **BANKR_AGENT_SIGN**       | Sign synchronously (no job): `personal_sign`, `eth_signTypedData_v4` (EIP-712), or `eth_signTransaction`. Requires `actionParams.signatureType` and `actionParams.payload`. Use for permits, order signatures, cancel signatures.                                                |
| **BANKR_AGENT_SUBMIT**     | Submit a raw/signed transaction synchronously. Requires `actionParams.transaction` (hex or object). Optional `actionParams.waitForConfirmation`, `actionParams.description`.                                                                                                     |
| **BANKR_ORDER_QUOTE**      | Get a quote for a limit/stop/DCA/TWAP order. Returns quoteId and actions (approval + EIP-712 signature). Does not sign or submit.                                                                                                                                                |
| **BANKR_ORDER_LIST**       | List External Orders for a maker address.                                                                                                                                                                                                                                        |
| **BANKR_ORDER_STATUS**     | Get status and details of one order by orderId.                                                                                                                                                                                                                                  |
| **BANKR_ORDER_CANCEL**     | Cancel an open order. Requires `actionParams.orderId` and `actionParams.signature` (EIP-712 cancel signature; obtain cancel typed data from Bankr if needed, sign via BANKR_AGENT_SIGN, then call this).                                                                         |

## Features (via prompts)

All of the following are available by sending the user's message as the prompt to **BANKR_AGENT_PROMPT**. Order management (list, status, cancel) uses the order actions above.

- **Portfolio & balances** — "what are my balances?", "show my portfolio", "portfolio worth", token prices, charts, Avantis positions, Polymarket bets, staking, NFTs, recent trades, P&L. See [Portfolio & Balances](https://docs.bankr.bot/features/portfolio).
- **Transfers** — Send ETH/SOL/tokens to address, ENS, or social handle. See [Transfers](https://docs.bankr.bot/features/transfers).
- **NFTs** — View collection, buy (OpenSea / by collection), sell (list, cancel listing, accept offers), mint (Manifold, SeaDrop, featured), transfer, search. EVM only (Base, Ethereum, Polygon, Unichain; not Solana). See [NFTs](https://docs.bankr.bot/features/nfts).
- **Token swaps** — Swap/buy/sell by USD, amount, or %; chain-specific; cross-chain; multi-swap. See [Token Swaps](https://docs.bankr.bot/features/trading/swaps).
- **Limit / stop / DCA / TWAP** — Create orders via natural language ("buy 100 BNKR if it drops 10%", "DCA $100 into BNKR every day", "sell 1000 BNKR over 4 hours"). See [Limit](https://docs.bankr.bot/features/trading/limit-orders), [Stop](https://docs.bankr.bot/features/trading/stop-orders), [DCA](https://docs.bankr.bot/features/trading/dca-orders), [TWAP](https://docs.bankr.bot/features/trading/twap-orders).
- **Leveraged trading** — Avantis on Base: long/short, commodities, forex, crypto. See [Leveraged Trading](https://docs.bankr.bot/features/leveraged-trading).
- **Token launch** — "deploy a token called X on base" / "launch a token on solana". See [Token Launching](https://docs.bankr.bot/token-launching/overview).

The [Features Table](https://docs.bankr.bot/features/features-table) is the complete capability reference (trading, automations, token launch, leveraged, Polymarket, portfolio, transfers, NFTs, market data, staking, chain notes).

Exact phrasings are in `knowledge/bankr/docs-features-prompts.md`.

**Agent API vs SDK:** This plugin uses the **Agent API** (API key, Bankr executes). For the **SDK** (own wallet, x402, you submit txs): see [docs.bankr.bot/sdk/installation](https://docs.bankr.bot/sdk/installation) and [knowledge/bankr/docs-sdk.md](knowledge/bankr/docs-sdk.md). The separate **plugin-bankr-sdk** exposes SDK-based actions (BANKR_SDK_PROMPT, etc.).

## Ingested knowledge

Bankr skill and docs are ingested into the repo for RAG/knowledge:

- **OpenClaw Bankr skill:** [knowledge/bankr/](knowledge/bankr/) — from [openclaw-skills/bankr](https://github.com/BankrBot/openclaw-skills) (SKILL.md and capabilities)
- **Bankr docs:** [knowledge/bankr/docs-\*.md](knowledge/bankr/) — from [docs.bankr.bot](https://docs.bankr.bot/) (overview, token launching, Agent API)
- **Feature prompts:** [knowledge/bankr/docs-features-prompts.md](knowledge/bankr/docs-features-prompts.md) — portfolio, transfers, NFTs, swaps, limit/stop/DCA/TWAP, leveraged, and a features-table reference (exact phrasings for BANKR_AGENT_PROMPT)
- **Features table:** [knowledge/bankr/docs-features-table.md](knowledge/bankr/docs-features-table.md) — capability matrix by feature and chain (what can Bankr do?, which chains for X?)
- **LLM Gateway:** [knowledge/bankr/docs-llm-gateway.md](knowledge/bankr/docs-llm-gateway.md) — overview, models, routing, quick start
- **SDK:** [knowledge/bankr/docs-sdk.md](knowledge/bankr/docs-sdk.md) — when to use, how it works, install, client config, promptAndWait, handling transactions, examples

Otaku can use this knowledge to decide when and how to use Bankr (including token launch prompts, fee structure, and feature phrasings).

## References

- [BANKR.md](/BANKR.md) — VINCE/Bankr context
- [docs.bankr.bot](https://docs.bankr.bot/) — official docs
- **LLM Gateway:** [docs.bankr.bot/llm-gateway/overview](https://docs.bankr.bot/llm-gateway/overview) — pay for Claude, Gemini, GPT with launch fees or wallet; see [knowledge/bankr/docs-llm-gateway.md](knowledge/bankr/docs-llm-gateway.md)
- **SDK:** [docs.bankr.bot/sdk/installation](https://docs.bankr.bot/sdk/installation) — own wallet, x402; see [knowledge/bankr/docs-sdk.md](knowledge/bankr/docs-sdk.md). Use **plugin-bankr-sdk** for SDK-based actions.
- [OpenClaw skills — bankr](https://github.com/BankrBot/openclaw-skills) — install the Bankr skill (OpenClaw); we use plugin-bankr + knowledge ingest for ElizaOS
- [Agent API (Notion)](https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3)
- [External Orders API (Notion)](https://www.notion.so/External-Orders-API-2ac8e0f9661f8045b77cdee144ce7f13)
- [bankr-api-examples](https://github.com/BankrBot/bankr-api-examples)
- [trading-engine-api-example](https://github.com/BankrBot/trading-engine-api-example)
