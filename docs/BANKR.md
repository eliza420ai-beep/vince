# Bankr — TL;DR

What Bankr is, why it matters for VINCE, and how it compares. Use this for the [token/ticker path](../knowledge/internal-docs/vince-as-ticker-bankr-deep-dive.md), skill/execution integration, and a **utility token** that pays for access, dev, contributors, and premium APIs.

**Idea:** Skills become the product. You ship a skill; others install it. You get paid when they use it. That’s the shift: from big apps to small, reusable skills that compound.

**Contents:** [What the token does for VINCE](#what-the-token-does-for-vince) · [Bankr product & API](#bankr--product--api) · [Why Bankr is different](#why-bankr-is-different) · [Bankr vs BAGS](#bankr-vs-bags) · [Links](#links)

---

## What the token does for VINCE

A token that **pays for the thing** — not grants, not out-of-pocket:

| You get | How |
|:--------|:----|
| **Gated access** | Hold or spend token for paper bot, live signals, or execution. Fewer freeloaders, clearer usage. |
| **Dev and infra paid** | Fees and subscriptions fund the stack: dev time and inference (e.g. Claude). The agent stays current because revenue flows in. |
| **Contributors rewarded** | Allocate token to people who ship: algo work, ML/ONNX, signal factors, plugin-vince. Bounties or retro for merged PRs and accepted proposals. |
| **Better data, paid for** | Use token revenue to buy high-tier APIs (CoinGlass, Messari). Feed the model better inputs without burning your own budget. |

One line: **Token = who gets in + who gets paid + what data the model sees.** The loop improves because money is attached to the right levers.

---

## [Bankr](https://bankr.bot/) · Product & [API](https://bankr.bot/#api)

An agent that **pays for itself** with $BNKR. Swap and bridge (Base, Solana, Polygon, Ethereum). Limit, stop, DCA, TWAP. Copy trade, token launchpad, Bankr Earn (USDC yield), stake $BNKR for rewards.

**Build on it:** [API key](https://bankr.bot/api). **Trading Engine** — advanced orders, you take a fee on trades. **x402** — pay per request to the agent. Backed by Coinbase Ventures, Polygon.

---

## [openclaw-skills](https://github.com/BankrBot/openclaw-skills) · Skill library

Public repo of skills for Moltbot/OpenClaw and Bankr. One top-level dir per provider (`bankr/`, `base/`, `neynar/`, `zapper/`); under each, installable skills with `SKILL.md` (and optional `references/`, `scripts/`). Polymarket, crypto, DeFi, automation, token deployment.

**Use it:** Point your agent at the repo and pick a skill (e.g. Bankr for trading). **Add one:** open a PR with a new provider dir and `SKILL.md`. ~384 stars; Bankr, erc-8004, botchan, qrcoin, yoink listed.

---

## [tokenized-agents](https://github.com/BankrBot/tokenized-agents) · Registry

Registry of agents that launched tokens via Bankr. Tokens fund development; the repo records who’s tokenized.

**Mechanism:** An agent learns something → it’s written into the skills repo → any agent can install it. One fix, everyone upgraded. Agents onchain, improving, funded by use. Add yours: PR. Links to [Moltbot Skills](https://github.com/BankrBot/openclaw-skills), Bankr Claude Code Plugins + Skills, [Bankr Agent API](https://bankr.bot/api).

---

## [Bankr Agent API](https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3) (Notion)

Programmatic control of a Bankr wallet and agent. [API key](https://bankr.bot/api); Notion has endpoints and usage. Use it to build skills, plugins, or automation (orders, swaps, DMs).

---

## Why Bankr is different

| Dimension | Bankr | Others |
|:----------|:------|:-------|
| **Who pays** | The token. Trading fees and subscriptions pay for compute. The agent funds itself from day one. | You pay infra and APIs. Launchpads give you a token but no wallet or execution in the same stack. |
| **Stack** | Agent, wallet, execution in one place. Cross-chain wallet; swap, bridge, limit/stop/DCA, perps, Polymarket. The agent can trade and hold. | Chat or API only; execution is something you wire in. Wallet is yours or a third party’s. |
| **Skills** | OpenClaw repo. One agent writes a skill (e.g. “don’t write cringe tweets”); every agent can install it. Upgrades spread. | Agents are isolated or skills stay private. No shared library that improves as people add to it. |
| **Token job** | $BNKR: Bankr Club, stake for rewards, baked into the product. Fair launch by the agent on Farcaster. | Token is governance or speculation; paying for API or subscriptions comes later or not at all. |
| **Where it runs** | Terminal, X, Telegram, Farcaster, Base App, XMTP. “Add Bankr to the chat” in Base. | Often one surface (e.g. web) or you bring your own bot; no shared distribution. |
| **How you build** | Trading Engine API (fee on trades), x402 (pay per request), skills (use Bankr or ship your own). You run the agent or you ship a skill. | Use their agent or their SDK; fewer ways to earn (e.g. fee on volume) or to plug in as a skill. |

**Summary:** Bankr is wallet + execution + token that pays the agent + shared skills. Not “launch a token” or “host an agent” by themselves.

---

## Bankr vs BAGS

VINCE is weighing a utility token (access, dev, contributors, premium APIs). Two ways to do it:

| Dimension | [Bankr](https://bankr.bot/) | [BAGS](https://bags.fm/) |
|:----------|:----------------------------|:-------------------------|
| **What it is** | Token pays the agent: compute, execution, subscriptions. Wallet + swap/limit/perps in the product. | Funding for ideas. Launch a coin, verify with social, earn from volume. [$21M+ to creators](https://bags.fm/). |
| **Token** | $BNKR = Club, stake, native to the product. Agent pays for itself. Fair launch on Farcaster. | Coin for your project. Creators earn **1% of volume forever**. Optional dividends to top 100 holders. |
| **VINCE fit** | Direct. VINCE is an agent; “token funds the agent” maps to funding Claude, APIs, dev. Trading Engine = fee on trades; x402 = pay per request. OpenClaw can hold VINCE-style skills. | Good for attention and royalties. Launch “VINCE coin,” earn 1%, fund dev/APIs. Less about the agent; more “community coin for the algo project.” Dividends can reward holders or contributors. |
| **Execution / wallet** | Included. Cross-chain wallet, swap, bridge, limit/stop/DCA, perps. | Not included. BAGS is launch + trade the coin. Solana; SOL to launch. |
| **Build** | Trading Engine API, x402, [OpenClaw skills](https://github.com/BankrBot/openclaw-skills). Add VINCE as skill or tokenized agent. | [API](https://docs.bags.fm), [Dev Blueprint](https://bags.fm/blueprint), mobile app. Launch: logo, name, ticker, description; optional fee sharing (up to 100 accounts). |
| **Backing** | Coinbase Ventures, Polygon. Tokenized agents registry; shared skill upgrades. | Bags Holdings; large creator volume; Discord, app, drops ($100K challenge). |
| **Pick when** | VINCE is the product: token pays the stack, you want wallet + execution + skills in one place. | You want a coin for the VINCE project: royalties, dividends, use revenue for dev/Claude/APIs and optional rewards for GitHub contributors. |

**Bottom line:**  
- **Bankr** when VINCE is the agent and you want one stack (token funds compute, execution, APIs).  
- **BAGS** when you want “a coin for VINCE,” 1% forever, and to use proceeds for dev and contributor rewards.

Both support access, dev funding, API spend; Bankr is agent-as-product; BAGS is project-as-creator with volume royalties.

---

## VINCE Plugin Implementation

Two plugins wrap the Bankr stack. Both live in `src/plugins/`; **Otaku** loads `plugin-bankr` by default.

### plugin-bankr (Agent API — custodial)

| What | Detail |
|:-----|:-------|
| **Auth** | `BANKR_API_KEY` (from [bankr.bot/api](https://bankr.bot/api)) |
| **Execution** | Bankr executes transactions for you (custodial wallet) |
| **Actions (10)** | `BANKR_AGENT_PROMPT` · `BANKR_USER_INFO` · `BANKR_JOB_STATUS` · `BANKR_AGENT_CANCEL_JOB` · `BANKR_AGENT_SIGN` · `BANKR_AGENT_SUBMIT` · `BANKR_ORDER_QUOTE` · `BANKR_ORDER_LIST` · `BANKR_ORDER_STATUS` · `BANKR_ORDER_CANCEL` |
| **Services (2)** | `BankrAgentService` (Agent API calls) · `BankrOrdersService` (External Orders API) |
| **Providers (1)** | `bankrProvider` — exposes wallets, positions, orders for cross-agent context |
| **Loaded by** | **Otaku** |

**API endpoints used:**

- Agent API (`https://api.bankr.bot`): `POST /agent/prompt`, `GET /agent/job/{jobId}`, `POST /agent/job/{jobId}/cancel`, `GET /agent/me`, `POST /agent/sign`, `POST /agent/submit`
- External Orders API (`https://api.bankr.bot/trading/order`): `POST /quote`, `POST /submit`, `POST /list`, `GET /{orderId}`, `POST /cancel/{orderId}`

### plugin-bankr-sdk (Own-wallet — x402)

| What | Detail |
|:-----|:-------|
| **Auth** | `BANKR_PRIVATE_KEY` (0x-prefixed hex; your own wallet) |
| **Execution** | SDK returns transaction data; you sign and submit yourself |
| **Actions (1)** | `BANKR_SDK_PROMPT` |
| **Services (1)** | `BankrSdkService` — wraps `@bankr/sdk` `BankrClient` |
| **Providers** | None |
| **Payment** | x402 micropayments ($0.01 USDC per request on Base) |
| **Loaded by** | Not loaded by any agent yet |

### When to use which

| Scenario | Use |
|:---------|:----|
| Interactive DeFi through Otaku (swap, bridge, limit, perps, NFT, Polymarket) | `plugin-bankr` — Bankr executes, no wallet management |
| Own-wallet control, fine-grained tx signing, x402 payments | `plugin-bankr-sdk` — you sign, you submit |
| Token launching | `plugin-bankr` via `BANKR_AGENT_PROMPT` (simplest path) |
| Programmatic DCA/TWAP/limit without AI overhead | `plugin-bankr` External Orders API actions (`BANKR_ORDER_QUOTE` → `BANKR_ORDER_LIST`) |

---

## Token Launching via API

**Can we launch tokens programmatically?** Yes — already supported through both plugins. No new code needed for the basic flow.

### How it works

[Bankr token launching](https://docs.bankr.bot/token-launching/overview) uses the same natural-language prompt system that `BANKR_AGENT_PROMPT` / `BANKR_SDK_PROMPT` wrap. There is no separate REST endpoint for token deployment — it flows through the prompt API.

**Prompt examples:**
```
"deploy a token called MyAgent with symbol AGENT on base"
"launch a token called CoolBot on solana"
"deploy a token with 20% vaulted for 30 days on base"
```

### Supported features (via prompt)

| Feature | Base | Solana |
|:--------|:-----|:-------|
| Token deploy | Yes | Yes |
| Vaulting (lock supply %) | Yes | Yes |
| Vesting (time-based release) | Yes | Yes |
| Fee splitting (route fees to collaborators) | Yes | Yes |
| Claiming accumulated fees | Yes | Yes |

### Fee structure

**Base:** 1% fee LP; deployer gets 60%, Bankr gets 40%. Fees accumulate in your token + WETH.

**Solana — bonding curve phase:** 1% platform fee (Bankr) + 0.5% creator fee (your wallet).
**Solana — after migration to CPMM pool:** 50% LP locked to creator, 40% to Bankr, 10% burned. Ongoing trading fees from locked LP.

### Token supply

- **Base:** Fixed 100B tokens (not mintable after deploy)
- **Solana:** Configurable supply, default 6 decimals

### Deployment limits

| User type | Tokens/day |
|:----------|:-----------|
| Standard | 1 |
| Bankr Club | 10 |

Gas is sponsored within limits. Extra launches require paying gas (~0.02 SOL on Solana).

### Recommendation

**Use `plugin-bankr` (Agent API) through Otaku.** Token launching already works via `BANKR_AGENT_PROMPT` — Otaku prompts Bankr, Bankr handles creation + LP + fee routing. No need for the manual web UI at [bankr.bot/launches](https://bankr.bot/launches).

**Optional next step:** A dedicated `BANKR_DEPLOY_TOKEN` action wrapping `BANKR_AGENT_PROMPT` with structured params (name, symbol, chain, vault %, vest days, fee split addresses) for better validation, cleaner inter-agent handoff (VINCE signal → Otaku deploy), and structured response parsing.

---

## Links

| What | URL |
|:-----|:----|
| Bankr | https://bankr.bot/ |
| Bankr API / key | https://bankr.bot/api · https://bankr.bot/#api |
| Bankr Docs | https://docs.bankr.bot/ |
| Token Launching Docs | https://docs.bankr.bot/token-launching/overview |
| Token Launches (web UI) | https://bankr.bot/launches |
| Agent API (Notion) | https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3 |
| OpenClaw skills | https://github.com/BankrBot/openclaw-skills |
| Tokenized agents | https://github.com/BankrBot/tokenized-agents |
| **BAGS** | https://bags.fm/ · [How it works](https://bags.fm/how-it-works) · [Launch](https://bags.fm/launch) · [API](https://docs.bags.fm) · [Blueprint](https://bags.fm/blueprint) |
