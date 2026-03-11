---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr Features Table (Ingested)

Source: https://docs.bankr.bot/features/features-table

Complete reference of Bankr capabilities with example prompts and chain support. Use for "what can Bankr do?" and "which chains for X?" All prompts are sent via **BANKR_AGENT_PROMPT**.

---

## Trading

| Feature          | Chains | Example Prompts                                                                  |
| ---------------- | ------ | -------------------------------------------------------------------------------- |
| Token Swap       | All    | "swap $50 of ETH to USDC", "buy $10 of BNKR on base", "sell all my BONK for SOL" |
| Swap by Amount   | All    | "swap 0.1 ETH to USDC", "swap 100 USDC to BNKR"                                  |
| Swap by %        | All    | "swap 50% of my USDC to ETH", "sell half my BNKR"                                |
| Multi-Swap       | EVM    | "swap 10 USDC to BNKR and 5 USDC to DEGEN"                                       |
| Cross-Chain Swap | EVM    | "swap $50 USDC from polygon to ETH on base"                                      |

---

## Automations

| Feature           | Chains | Example Prompts                                                                              |
| ----------------- | ------ | -------------------------------------------------------------------------------------------- |
| Limit Buy         | EVM    | "buy 100 BNKR if it drops 10%", "buy $50 of ETH when price drops 15%"                        |
| Limit Sell        | EVM    | "sell my BNKR when it rises 20%", "sell DEGEN when BTC reaches $50,000"                      |
| Stop Order        | EVM    | "sell all my DEGEN if it drops 20%"                                                          |
| DCA               | EVM    | "DCA $100 USDC into BNKR every day at 9am", "DCA $50 ETH into BNKR every 6 hours for 7 days" |
| TWAP              | EVM    | "sell 1000 BNKR over the next 4 hours"                                                       |
| Cancel Automation | EVM    | "cancel my limit order", "cancel all my automations"                                         |

---

## Token Launching

| Feature               | Chains       | Example Prompts                                                                                      |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| Deploy Token          | Base, Solana | "deploy a token called MyAgent with symbol AGENT on base", "launch a token called MyAgent on solana" |
| Deploy with Vault     | Base, Solana | "deploy a token with 30% vaulted for 30 days on base"                                                |
| Deploy with Vesting   | Base, Solana | "launch a token with 30 day cliff and 90 day vesting on solana"                                      |
| Deploy with Fee Split | Base, Solana | "deploy a token with fees going to 0x1234... on base"                                                |
| Check / Claim Fees    | Base, Solana | "how much fees have I earned?", "claim my fees for TokenName"                                        |

---

## Leveraged Trading (Avantis)

| Feature                      | Chains | Example Prompts                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------ |
| Long                         | Base   | "buy $10 of GOLD", "long BTC/USD with 10x leverage"                      |
| Short                        | Base   | "short $25 of ETH/USD", "sell $10 of OIL with 5x leverage"               |
| With Stop Loss / Take Profit | Base   | "buy $50 of BTC/USD with 5% stop loss", "long ETH with 200% take profit" |
| Close / View Positions       | Base   | "close my BTC position", "show my Avantis positions"                     |

---

## Polymarket

| Feature                      | Chains  | Example Prompts                                                                                                                          |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Search / Bet / View / Redeem | Polygon | "what are the odds the eagles win?", "bet $5 on eagles to win", "show my Polymarket positions", "redeem my winning polymarket positions" |

---

## Portfolio & Balances

| Feature              | Chains | Example Prompts                                   |
| -------------------- | ------ | ------------------------------------------------- |
| Check Balances       | All    | "what are my balances?", "show my portfolio"      |
| Chain/Token-Specific | All    | "my balances on base", "how much USDC do I have?" |
| Portfolio Value      | All    | "what's my total portfolio worth?"                |

---

## Transfers

| Feature                       | Chains | Example Prompts                                                                              |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Send Tokens / Native / Social | All    | "send 100 USDC to 0x1234...", "send 0.1 ETH to vitalik.eth", "send $5 of DEGEN to @username" |

---

## NFTs

| Feature      | Chains | Example Prompts                               |
| ------------ | ------ | --------------------------------------------- |
| View NFTs    | EVM    | "show my NFTs", "what NFTs do I own on base?" |
| Buy NFT      | EVM    | "buy this NFT: [opensea link]"                |
| Transfer NFT | EVM    | "send my Noun to 0x1234..."                   |
| Mint NFT     | EVM    | "mint from [manifold link]"                   |
| List NFT     | EVM    | "list my NFT for 0.5 ETH"                     |

EVM = Base, Ethereum, Polygon, Unichain. Not Solana.

---

## Market Data

| Feature                                        | Chains | Example Prompts                                                                                                 |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Token Price / Chart / TA / Trending / Research | All    | "price of ETH", "show ETH chart", "analyze BNKR price action", "what's trending on base?", "tell me about BNKR" |

---

## Staking

| Feature                | Chains | Example Prompts                                                    |
| ---------------------- | ------ | ------------------------------------------------------------------ |
| Stake / Unstake / View | Base   | "stake 1000 BANKR", "unstake my BANKR", "show my staking position" |

---

## Chain-Specific Notes

- **Base:** Full feature support, gas sponsorship, trading engine, Avantis.
- **Ethereum:** Swaps, transfers, NFTs; no gas sponsorship (high gas).
- **Polygon:** Swaps, transfers, Polymarket; gas sponsorship.
- **Unichain:** Swaps, transfers, NFTs; gas sponsorship.
- **Solana:** Swaps (Jupiter), token launching; limited gas sponsorship (1/day standard, 10/day Bankr Club).

## Related

- [Docs Claude Plugins](docs-claude-plugins.md)
- [Docs Llm Gateway](docs-llm-gateway.md)
- [Openclaw Skill Bankr](openclaw-skill-bankr.md)
