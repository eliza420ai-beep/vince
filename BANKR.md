# Bankr — TL;DR

Quick reference for Bankr, its repos, and API. Relevant for VINCE’s [token/ticker path](knowledge/internal-docs/vince-as-ticker-bankr-deep-dive.md), possible skill/execution integration, and **utility-token launch** (access, dev funding, contributor rewards, premium APIs).

**Contents:** [VINCE utility-token vision](#vince-utility-token-vision) · [Bankr product & API](#bankr--product--api) · [How Bankr differs](#how-bankr-differs-from-other-ai-agent-launchpads) · [Bankr vs BAGS](#launch-platform-comparison-bankr-vs-bags) · [Links](#links)

---

## VINCE utility-token vision

A **utility token** for VINCE could align incentives and fund the stack without relying only on grants or out-of-pocket spend:

| Use | How the token helps |
|:---|:---|
| **Access** | Hold or pay token to access the paper bot, live signals, or future execution tier. Gates usage and reduces abuse. |
| **Ongoing dev & infra** | Token revenue (fees, subscriptions, or allocations) backs **dev work** and **expensive inference** (e.g. Claude 4.6 credits) so the agent and ML pipeline stay current. |
| **GitHub contributor rewards** | Allocate token to **reward devs** who collab on GitHub—e.g. algo improvements, ML/ONNX pipeline, signal factors, plugin-vince features. Bounty/retroactive rewards for merged PRs or accepted proposals. |
| **Premium data APIs** | Use **fees earned from the token** (trading fees, access fees, or protocol revenue) to pay for **high-tier APIs** (CoinGlass, Messari, etc.) and add them as **signal factors**, improving model inputs without burning personal/team budget. |

**In one line:** Token = **access gating** + **funding dev/Claude** + **incentivizing open-source algo/ML work** + **financing better data** (CoinGlass, Messari, etc.) for the self-improving loop.

---

## [Bankr](https://bankr.bot/) · Product & [API](https://bankr.bot/#api)

**TL;DR:** AI agent that **funds itself** via $BNKR. Swap/bridge (Base, Solana, Polygon, Ethereum), limit/stop/DCA/TWAP, copy trade, token launchpad, Bankr Earn (USDC yield), stake $BNKR for rewards. **Build on Bankr:** get an [API key](https://bankr.bot/api) and use the **Trading Engine** (advanced orders, take a fee on trades) or the **x402 SDK** (pay-per-request to the Bankr agent). Backed by Coinbase Ventures, Polygon.

---

## [openclaw-skills](https://github.com/BankrBot/openclaw-skills) · Moltbot skill library

**TL;DR:** Public repo of **skills for Moltbot/OpenClaw** (and Bankr). Each top-level dir is a provider (e.g. `bankr/`, `base/`, `neynar/`, `zapper/`); each subdir is an installable skill with `SKILL.md` (+ optional `references/`, `scripts/`). Skills cover Polymarket, crypto trading, DeFi, automation, token deployment, etc. **Install:** give your agent the repo URL and pick a skill (e.g. Bankr skill for trading). Add a skill via PR (new provider dir + `SKILL.md`). ~384 stars; Bankr, erc-8004, botchan, qrcoin, yoink are listed.

---

## [tokenized-agents](https://github.com/BankrBot/tokenized-agents) · Tokenized agent registry

**TL;DR:** **Community registry of AI agents that launched tokens through Bankr.** Tokens let agents be self-sustaining and fund development; the repo tracks which agents are “tokenized.” **Vision:** agents learn something → save to Bankr skills repo → every agent gets the upgrade (“one agent’s lesson = every agent’s upgrade”). Goal: onchain agents that get smarter and self-fund. **Add an agent:** submit a PR. Links to [Moltbot Skills](https://github.com/BankrBot/openclaw-skills), Bankr Claude Code Plugins + Skills, and [Bankr Agent API](https://bankr.bot/api).

---

## [Bankr Agent API](https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3) (Notion)

**TL;DR:** Notion doc for the **Bankr Agent API** — programmatic control of a Bankr wallet and agent (also referenced from [bankr.bot/api](https://bankr.bot/api)). Use for building skills, plugins, or automation (e.g. advanced orders, swaps, DMs). Get an API key from [bankr.bot/api](https://bankr.bot/api) and refer to the Notion page for endpoints and usage.

---

## How Bankr differs from other AI agent launchpads

| Dimension | Bankr | Typical alternatives |
|-----------|--------|------------------------|
| **Economics** | Token **funds the agent**: trading fees and subscriptions ($BNKR) pay for compute. “Self-sustaining from day one.” | Agent frameworks (Eliza, LangChain, etc.): you pay infra/API; no built-in token or revenue loop. Token launchpads: you get a token, but no native wallet/execution or shared skill layer. |
| **Agent + wallet + execution** | One stack: agent, **built-in cross-chain wallet**, and execution (swap, bridge, limit/stop/DCA, perps, Polymarket). Agent can trade and hold. | Many “agent launchpads” are chat-only or API-only; execution is a separate integration. Wallet often user’s own or third-party. |
| **Shared skills** | **OpenClaw skills repo**: one agent’s learning (e.g. “don’t write cringe tweets”) is saved and **every agent can install it**. Upgrades compound across agents. | Most platforms: each agent is isolated or skills are private. No shared, composable skill library that auto-improves the whole ecosystem. |
| **Token utility** | $BNKR = Bankr Club subscription, stake-for-rewards, native to the product. Fair launch by the agent on Farcaster. | Many launchpads: token is governance or speculative; utility (e.g. pay for API, subscriptions) is added later or not at all. |
| **Distribution** | Live where users are: Terminal, X, Telegram, Farcaster, Base App, XMTP. “Add Bankr to the chat” inside Base. | Often one surface (e.g. web only) or “bring your own Discord bot” with no shared distribution. |
| **Build surface** | **Trading Engine API** (fee on trades) + **x402** pay-per-request + **skills** (install Bankr or add your own). You can be the agent or a skill provider. | Either “use our agent” or “use our SDK”; fewer ways to earn (e.g. take a fee on volume) or to plug in as a skill. |

**In one line:** Bankr is an **agent-first launchpad with built-in wallet and execution**, a **token that pays for the agent**, and a **shared skills repo** so agents get smarter together—not just “launch a token” or “host an agent” in isolation.

---

## Launch platform comparison: Bankr vs BAGS

VINCE is considering a **utility token** (access, dev funding, contributor rewards, premium APIs). Two launch options:

| Dimension | [Bankr](https://bankr.bot/) | [BAGS](https://bags.fm/) |
|-----------|-----------------------------|---------------------------|
| **Positioning** | **Agent-first**: token funds the agent (compute, execution, subscriptions). Built-in wallet + swap/limit/perps. | **Creator/idea funding**: “Get funding for your ideas.” Launch a coin, verify with social, earn from volume. [$21M+ earned by creators](https://bags.fm/). |
| **Token utility** | $BNKR = Bankr Club, stake-for-rewards, **native to product** (agent pays for itself). Fair launch by agent on Farcaster. | Coin tied to **your project**; creators earn **1% of trading volume forever**. Optional **dividends** to top 100 holders. |
| **Fit for VINCE** | **Strong**: VINCE is an AI agent. Bankr’s “token funds the agent” maps directly to funding Claude, APIs, and dev. Trading Engine API = fee on trades; x402 = pay-per-request. Shared skills (OpenClaw) could host VINCE-style skills. | **Good for awareness + royalties**: Launch “VINCE coin” as the project token; earn 1% volume → fund dev/APIs. Less agent-native; more “community coin for the algo project.” Dividends could reward holders or contributors. |
| **Execution / wallet** | **Included**: cross-chain wallet, swap, bridge, limit/stop/DCA, perps. Agent can trade and hold. | **Not included**: BAGS is launch + trade the coin; no built-in execution for an agent. Solana-based (SOL for launch). |
| **Build / integrate** | Trading Engine API (fee on trades), x402 pay-per-request, [OpenClaw skills](https://github.com/BankrBot/openclaw-skills). Add VINCE as skill or tokenized agent. | [API](https://docs.bags.fm), [Dev Blueprint](https://bags.fm/blueprint), mobile app. Launch flow: logo, name, ticker, description; optional fee sharing (up to 100 accounts). |
| **Backing / ecosystem** | Coinbase Ventures, Polygon. Tokenized agents registry; shared skill upgrades across agents. | Bags Holdings; large creator volume; Discord, app, drops ($100K challenge). |
| **Best for** | **Agent sustainability**: token pays for the agent stack and fits into an agent-first product (VINCE as Bankr agent or skill). | **Community funding + royalties**: simple “launch a coin for VINCE,” earn 1% forever, use proceeds for dev/APIs; dividends to reward holders/contributors. |

**Summary:**  
- **Bankr** = better fit if VINCE is **the agent** (token funds agent compute, execution, APIs) and we want wallet + execution + skills in one stack.  
- **BAGS** = better fit for **“launch a coin for the VINCE project,”** earn royalties and dividends, use revenue for dev/Claude/APIs and optional token rewards for GitHub contributors.

Both can support the utility-token vision (access, dev funding, API fees); Bankr aligns with **agent-as-product**; BAGS with **project-as-creator** and ongoing volume royalties.

---

## Links

| What | URL |
|------|-----|
| Bankr site | https://bankr.bot/ |
| Bankr API / get key | https://bankr.bot/api · https://bankr.bot/#api |
| Agent API (Notion) | https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3 |
| OpenClaw skills repo | https://github.com/BankrBot/openclaw-skills |
| Tokenized agents repo | https://github.com/BankrBot/tokenized-agents |
| **BAGS** (alternative launch) | https://bags.fm/ · [How it works](https://bags.fm/how-it-works) · [Launch](https://bags.fm/launch) · [API docs](https://docs.bags.fm) · [Dev Blueprint](https://bags.fm/blueprint) |
