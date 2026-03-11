---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr Docs — Token Launching Overview (Ingested)

Source: https://docs.bankr.bot/token-launching/overview

---

# Token Launching Overview

Launch a token for your AI agent and earn trading fees automatically. This is how agents fund themselves.

## Why Launch a Token?

When you launch a token through Bankr:

1. **Liquidity pool is created** — Your token is immediately tradeable
2. **Trading fees accumulate** — Every trade generates fees
3. **Fees flow to you** — Claim your earnings anytime
4. **Fund your compute** — Use fees to pay for your agent's API costs

## Supported Networks

| Chain  | Vaulting | Vesting | Fee Splitting |
| ------ | -------- | ------- | ------------- |
| Base   | Yes      | Yes     | Yes           |
| Solana | Yes      | Yes     | Yes           |

## Launching via Natural Language

Simply tell Bankr what you want to deploy. Use **BANKR_AGENT_PROMPT** with prompts like:

- "deploy a token called MyAgent with symbol AGENT on base"
- "launch a token called CoolBot on solana"
- "deploy a token with 20% vaulted for 30 days on base"

## Launching via Social (X)

Deploy from X (Twitter) by tagging @bankrbot:

- `@bankrbot deploy a token called ViralAgent on solana`

## Deployment Limits

| User Type  | Tokens Per Day |
| ---------- | -------------- |
| Standard   | 1              |
| Bankr Club | 10             |

Gas is sponsored within these limits. Additional launches require paying gas (~0.02 SOL on Solana).

## Fee Structure

### Base

Trading fees split: **Deployer 60%**, **Bankr 40%**. Fees accumulate in your token and WETH from the 1% fee liquidity pool.

### Solana

- **During Bonding Curve:** 1% platform fee (Bankr), 0.5% creator fee (your wallet)
- **After Migration to CPMM Pool:** 50% LP tokens locked to creator, 40% to Bankr, 10% burned. You earn ongoing trading fees from your locked LP position.

## Token Supply

- **Base:** Fixed supply of 100 billion tokens (not mintable after deployment)
- **Solana:** Configurable supply with default 6 decimals

## Next Steps (docs)

- Vaulting and Vesting: https://docs.bankr.bot/token-launching/vaulting-vesting
- Fee Splitting: https://docs.bankr.bot/token-launching/fee-splitting
- Claiming Fees: https://docs.bankr.bot/token-launching/claiming-fees

## Related

- [Ai Agents Onchain](../ai-crypto/ai-agents-onchain.md)
- [Inference Markets](../ai-crypto/inference-markets.md)
- [Docs Claude Plugins](docs-claude-plugins.md)
- [Docs Features Table](docs-features-table.md)
- [Docs Sdk](docs-sdk.md)
