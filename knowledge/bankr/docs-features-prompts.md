---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr Features — Prompt Phrasings (Ingested)

Source: docs.bankr.bot/features (Portfolio, Transfers, NFTs, Leveraged Trading, DCA, TWAP, Stop Orders, Limit Orders, Swaps, Features Table)

These phrasings are sent to Bankr via **BANKR_AGENT_PROMPT**. Forward the user's message as the prompt. Order management (list, status, cancel) uses BANKR_ORDER_LIST, BANKR_ORDER_STATUS, BANKR_ORDER_CANCEL.

**Features Table:** The [Features Table](https://docs.bankr.bot/features/features-table) is the complete reference: Trading, Automations, Token Launching, Leveraged, Polymarket, Portfolio, Transfers, NFTs, Market Data, Staking, and chain-specific notes. Capability areas and chains: Trading (all chains), Automations / limit-stop-DCA-TWAP (EVM), Token Launching (Base, Solana), Leveraged / Avantis (Base), Polymarket (Polygon), Portfolio & Balances (all), Transfers (all), NFTs (EVM: Base, Ethereum, Polygon, Unichain; not Solana), Market Data (all), Staking (Base). Use it to answer "what can Bankr do?" and "which chains for X?"

---

## Portfolio & Balances

- "what are my balances?"
- "show my portfolio"
- "what do I own?"
- "my balances on base" / "show my solana balance" / "what do I have on polygon?"
- "how much USDC do I have?" / "my ETH balance" / "how many BNKR tokens do I have?"
- "what's my portfolio worth?" / "total value of my holdings"
- "show portfolio breakdown" / "what percentage is ETH?"
- "price of ETH" / "what's BTC trading at?" / "BNKR price"
- "prices of ETH, SOL, and BTC" / "compare ETH and BTC prices"
- "show ETH price chart" / "BTC chart for last 24 hours"
- "analyze BNKR" / "tell me about this token: 0x1234..." / "is DEGEN a good buy?"
- "what's trending on base?" / "top gainers today" / "trending tokens on solana"
- "technical analysis for ETH" / "analyze BNKR price action"
- "show my Avantis positions" / "what leveraged positions do I have?"
- "my Polymarket bets" / "show my prediction market positions"
- "show my staking positions" / "how much BANKR do I have staked?"
- "show my automations" / "what orders do I have pending?" / "my DCA orders"
- "cancel my DCA for BNKR" / "cancel all automations"
- "show my NFTs" / "what NFTs do I own on base?" / "value of my NFT collection"
- "show my recent trades" / "what did I trade today?"
- "how are my tokens performing?" / "P&L for my BNKR position"
- "export my transaction history" / "download my trades"
- "daily portfolio summary"
- "alert me when ETH moves 5%"
- "total holdings across all chains"

---

## Transfers

- "send 0.1 ETH to 0x1234..." / "send $50 of ETH to vitalik.eth"
- "send 1 SOL to ABC123..." / "send $25 of SOL to my friend"
- "send 10 POL to 0x1234..."
- "send 100 USDC to 0x1234..." / "send $50 of BNKR to 0xABC..." / "send 1000 BONK to ABC123..."
- "send 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f..."
- "send 0.1 ETH to vitalik.eth" / "send 50 USDC to myname.eth"
- "send $5 of DEGEN to @username" / "send 100 BNKR to @twitterhandle"
- "send 10 DEGEN to @farcasteruser"
- "send 100 USDC" / "send 0.5 ETH"
- "send $50 of ETH" / "send $100 worth of USDC"
- "send all my USDC to 0x1234..."
- "send 100 USDC on base to 0x1234..." / "send 50 USDC on polygon to 0xABC..."
- "buy $5 of DEGEN and send to @username" / "swap $10 ETH to USDC and send to 0x1234..."
- "look up 0x1234..." / "who owns vitalik.eth?"
- "how much USDC do I have?" (before transfer)
- "does @username have a Bankr wallet?"
- "send $1 of USDC to 0x1234..." (test first)

---

## NFTs

Buy, sell, mint, and transfer NFTs. **EVM only** (Base, Ethereum, Polygon, Unichain). Not Solana. Pricing in ETH/WETH; OpenSea fees apply on sales.

**Viewing**

- "show my NFTs" / "what NFTs do I own?" / "my NFTs on base"
- "show the floor price for Nouns" / "trending NFT collections" / "top NFTs on base"

**Buying**

- "buy this NFT: [opensea link]" / "buy the cheapest Noun" / "buy floor Pudgy Penguin"
- "buy the cheapest NFT from Nouns" / "show me listings for Based Punks under 0.1 ETH"
- "buy https://opensea.io/assets/base/0x1234.../1"

**Selling**

- "list my Noun #123 for 50 ETH" / "sell my NFT for 0.5 ETH" / "list my NFT #42 for 1 ETH on base"
- "cancel my NFT listing" / "remove my Noun from sale"
- "what offers do I have on my NFTs?" / "accept the best offer on my Noun" / "show offers on my NFTs" / "best offer for my Noun?"

**Minting**

- "mint from [manifold link]" / "mint this NFT: https://app.manifold.xyz/..."
- "mint from [seadrop link]"
- "what's minting today?" / "show featured NFT mints"

**Transferring**

- "send my Noun #123 to 0x1234..." / "transfer my NFT to vitalik.eth" / "send this NFT to @username"

**Searching**

- "search for Pudgy Penguins" / "find NFT collection: Based Punks"

**Tips**

- "show details for [opensea link]" then "buy it" (check before buying)
- Use OpenSea links to identify NFTs reliably. Verify recipient addresses; NFT transfers are irreversible.

---

## Token Swaps

- "swap $50 of ETH to USDC" / "buy $10 of BNKR" / "sell $25 worth of DEGEN"
- "swap 0.1 ETH to USDC" / "swap 100 USDC to BNKR" / "buy 1000 BONK"
- "swap 50% of my USDC to ETH" / "sell half my BNKR" / "sell all my DEGEN"
- "swap $10 of ETH to USDC on base" / "buy $5 of BONK on solana" / "swap 100 MATIC to USDC on polygon"
- "buy $10 of BNKR" / "buy $50 of DEGEN on base" / "buy $5 of WIF on solana"
- "sell my BNKR for ETH" / "sell 50% of my DEGEN" / "sell all my BONK for SOL"
- "swap 1 ETH to USDC with 1% slippage"
- "swap 10 USDC to BNKR and 5 USDC to DEGEN" (multi-swap, EVM)
- "swap $50 USDC from polygon to ETH on base" (cross-chain)
- "buy $5 of DEGEN and send to @username" / "swap $10 ETH to USDC and send to 0x1234..."
- "what are my balances?" (if insufficient)
- "search for TOKENNAME on base" (if token not found)

---

## Limit Orders

- "buy 100 BNKR if it drops 10%" / "buy $50 of ETH when price drops 15%" / "buy DEGEN if it drops to $0.001"
- "sell my BNKR when it rises 20%" / "sell 50% of my DEGEN when it goes up 30%" / "sell DEGEN when BTC reaches $50,000"
- "buy BNKR if it drops 10%" / "sell BNKR when it rises 20%"
- "sell ETH when it reaches $4000" / "buy BTC if it drops to $60000"
- "sell my DEGEN when BTC reaches $50,000"
- "show my limit orders" / "what automations do I have?"
- "cancel my limit order for BNKR" / "cancel all my limit orders"
- "buy $100 of ETH if it drops 5%"
- "sell half my BNKR when it rises 50%"
- "buy $50 of BNKR if it drops 10%" / "buy $50 of BNKR if it drops 20%" / "buy $100 of BNKR if it drops 30%"

EVM only (Base, Ethereum, Polygon, Unichain). Not Solana. Not XMTP.

---

## Stop Orders

- "sell all my DEGEN if it drops 20%" / "sell my BNKR if it falls 15%" / "stop loss on ETH at -10%"
- "sell 50% of my DEGEN if it drops 20%" / "sell 1000 BNKR if price drops 25%"
- "show my stop orders" / "what automations do I have?"
- "cancel my stop order for DEGEN" / "cancel all my stop orders"
- "buy $100 of NEWTOKEN" then "set a stop loss at -20% for NEWTOKEN"
- "set stop loss on BNKR at -10%"
- "buy $500 of ETH" then "stop loss at -5%"
- "set stop loss on BNKR at -15%" and "sell half my BNKR when it rises 50%"

EVM only. Not Solana. Not XMTP.

---

## DCA Orders

- "DCA $100 USDC into BNKR every day at 9am" / "DCA $50 ETH into BNKR every 6 hours" / "buy $25 of DEGEN daily"
- "DCA $100 into BNKR every day" / "DCA $50 into ETH daily at 2pm"
- "DCA $25 into BNKR every hour" / "DCA $50 into ETH every 6 hours" / "DCA $100 into BNKR every 12 hours"
- "DCA $50 ETH into BNKR every 12 hours for 15 days" / "DCA $25 USDC into BNKR daily for 30 days"
- "show my DCA orders" / "what automations do I have?"
- "cancel my DCA for BNKR" / "cancel all my automations"
- "DCA $100 USDC into ETH every day for 7 days"
- "DCA $200 USDC into BNKR every 6 hours for 3 days"
- "DCA $50 into ETH daily for 30 days"
- "DCA $50 into BNKR every day for 3 days" (test)
- "DCA $100 USDC into ETH daily" (stablecoins for predictable amounts)

EVM only. Not Solana. Not XMTP. Minimum $20 per execution. Max 30 executions per DCA default.

---

## TWAP Orders

- "sell 1000 BNKR over the next 4 hours" / "TWAP sell 5000 DEGEN over 2 hours"
- "TWAP sell 5000 DEGEN over 1 hour" / "TWAP sell 10000 BNKR over 4 hours" / "TWAP sell 50000 tokens over 24 hours"
- "show my TWAP orders" / "what automations do I have?"
- "cancel my TWAP order" / "cancel TWAP for BNKR"
- "how's my TWAP order doing?"
- "sell 10000 BNKR over 6 hours" (large position)

EVM only. Not Solana. Not XMTP.

---

## Leveraged Trading (Avantis on Base)

- "buy $10 of GOLD" / "long BTC/USD with 5x leverage" / "buy $50 of ETH/USD with 10x leverage"
- "short $25 of ETH/USD" / "sell $10 of GOLD with 5x leverage" / "short BTC/USD with 10x leverage"
- "buy $50 of BTC/USD with 10x leverage" / "long GOLD with 20x" / "short ETH at 50x leverage"
- "buy $50 of BTC/USD with 5% stop loss" / "long ETH with 10x leverage and 5% stop loss"
- "buy $50 of BTC/USD with 200% take profit" / "long ETH with 100% TP"
- "buy $25 BTC/USD with 10x leverage, 5% stop loss, and 200% take profit"
- "5% stop loss" / "200% take profit" / "stop loss at $2500" / "take profit at $100000"
- "show my Avantis positions" / "what positions do I have?"
- "close my BTC position" / "close all my Avantis positions"
- "buy $10 of GOLD"
- "buy $100 of BTC/USD with 10x leverage, 5% stop loss, 200% take profit"
- "short $50 of ETH/USD with 5x leverage and 10% stop loss"
- "buy $50 of BTC/USD with 1% slippage"

Base only. Commodities (GOLD, SILVER, OIL), crypto (BTC/USD, ETH/USD, SOL/USD), forex (EUR/USD, GBP/USD). Up to 150x leverage.

## Related

- [Docs Overview](docs-overview.md)
- [Docs Sdk](docs-sdk.md)
- [Openclaw Skill Bankr](openclaw-skill-bankr.md)
- [Rwa Frameworks](../rwa/rwa-frameworks.md)
- [Rwa Overview 2026](../rwa/rwa-overview-2026.md)
