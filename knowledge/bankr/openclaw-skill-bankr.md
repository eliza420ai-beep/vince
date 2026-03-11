---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr — OpenClaw Skill (Ingested)

Source: https://github.com/BankrBot/openclaw-skills/blob/main/bankr/SKILL.md

---

**Skill name:** bankr  
**Description:** AI-powered crypto trading agent via natural language. Use when the user wants to trade crypto (buy/sell/swap tokens), check portfolio balances, view token prices, transfer crypto, manage NFTs, use leverage, bet on Polymarket, **deploy tokens**, set up automated trading strategies, submit raw transactions, execute calldata, or send transaction JSON. Supports Base, Ethereum, Polygon, Solana, and Unichain.

## Capabilities Overview

### Trading Operations

- Token Swaps, Cross-Chain bridge, Limit Orders, Stop Loss, DCA, TWAP

### Portfolio Management

- Balances across chains, USD valuations, real-time prices

### Market Research

- Token prices, technical analysis, sentiment, charts, trending tokens

### Transfers

- Send to addresses, ENS, or social handles (Twitter, Farcaster, Telegram)

### NFT Operations

- Browse collections, floor prices, purchase via OpenSea, transfer, mint

### Polymarket Betting

- Search markets, odds, place bets, positions, redeem

### Leverage Trading

- Long/short (up to 50x crypto, 100x forex/commodities), Avantis on Base

### Token Deployment

- **EVM (Base):** Deploy ERC20 via Clanker, customizable metadata and social links
- **Solana:** Launch SPL via Raydium LaunchLab, bonding curve, auto-migration to CPMM
- Creator fee claiming; Fee Key NFTs on Solana (50% LP fees post-migration)
- Rate limits: 1/day standard, 10/day Bankr Club (gas sponsored within limits)

### Automation

- Limit orders, stop loss, DCA, TWAP, scheduled commands

### Arbitrary Transactions

- Raw EVM calldata, custom contract calls, value transfers with data

## Supported Chains

| Chain    | Native | Best For           | Gas      |
| -------- | ------ | ------------------ | -------- |
| Base     | ETH    | Memecoins, general | Very Low |
| Polygon  | MATIC  | Gaming, NFTs       | Very Low |
| Ethereum | ETH    | Blue chips         | High     |
| Solana   | SOL    | High-speed         | Minimal  |
| Unichain | ETH    | Newer L2           | Very Low |

## Prompt Examples — Token Deployment

**Solana:**

- "Launch a token called MOON on Solana"
- "Launch a token called FROG and give fees to @0xDeployer"
- "Deploy SpaceRocket with symbol ROCK"
- "How much fees can I claim for MOON?" / "Claim my fees for MOON"

**EVM (Base / Clanker):**

- "Deploy a token called BankrFan with symbol BFAN on Base"
- "Claim fees for my token MTK"

## API Workflow (Agent API)

1. **Submit** — POST /agent/prompt, get jobId
2. **Poll** — GET /agent/job/{jobId} every ~2s
3. **Complete** — Use response and any transactions

Synchronous: **POST /agent/sign** (messages, typed data, tx without broadcast), **POST /agent/submit** (raw transactions).

## Resources

- Agent API: https://www.notion.so/Agent-API-2e18e0f9661f80cb83ccfc046f8872e3
- API keys: https://bankr.bot/api
- Terminal: https://bankr.bot/terminal

## Related

- [Docs Features Prompts](docs-features-prompts.md)
- [Docs Llm Gateway](docs-llm-gateway.md)
- [Docs Token Launching](docs-token-launching.md)
