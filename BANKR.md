# Bankr — TL;DR

Quick reference for Bankr, its repos, and API. Relevant for VINCE’s [token/ticker path](knowledge/internal-docs/vince-as-ticker-bankr-deep-dive.md) and possible skill/execution integration.

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

## Links

| What | URL |
|------|-----|
| Bankr site | https://bankr.bot/ |
| Bankr API / get key | https://bankr.bot/api · https://bankr.bot/#api |
| Agent API (Notion) | https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3 |
| OpenClaw skills repo | https://github.com/BankrBot/openclaw-skills |
| Tokenized agents repo | https://github.com/BankrBot/tokenized-agents |
