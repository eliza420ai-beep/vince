---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #3: DEX Screener (Token Discovery & Liquidity)

**Priority**: Tier 3 - Supporting  
**Specialist**: `liquiditySpecialist`  
**Data Source**: DexScreener.com (multi-chain DEX aggregator)

## Core Objectives

- Discover and analyze tokens across **all chains** (Solana, Ethereum, Base, Arbitrum, BSC, etc.)
- Evaluate liquidity depth, volume trends, and trading safety
- Identify trending tokens, new launches, and potential opportunities
- Assess rug risk indicators (liquidity locks, holder distribution)
- Compare tokens within categories (memecoins, DeFi, L2 tokens)

## Supported Queries

- **Token Search**: Any token by name, symbol, or contract address
- **Chain Browsing**: Top tokens on Solana, Ethereum, Base, etc.
- **Trending**: Hot tokens, new pairs, volume leaders
- **Categories**: Memecoins, DeFi tokens, new launches
- **Safety Check**: Liquidity analysis, rug indicators

## Tool Usage Strategy

### Token/Pair Search

- `browse_page`: https://dexscreener.com/search?q=[TOKEN]
  - Instructions: "Find the token, extract: price, 24h volume, liquidity, market cap, holders, 24h/1h/5m price changes, chain, DEX, pair age, and any warning flags."

### Chain Overview

- `browse_page`: https://dexscreener.com/solana (or /ethereum, /base, /arbitrum)
  - Instructions: "Extract top 10 tokens by volume: name, price, 24h volume, liquidity, 24h change, market cap."

### Trending/New Pairs

- `browse_page`: https://dexscreener.com/new-pairs
  - Instructions: "List newest pairs with volume, liquidity, age, chain."

### Fallback

- `web_search`: "[token] dexscreener" or "top solana memecoins dexscreener"

## Output Format

```markdown
## DEX Screener Analysis — [Current Date]

### Token Overview: [TOKEN NAME]

| Metric     | Value                  | Assessment               |
| ---------- | ---------------------- | ------------------------ |
| Price      | $X.XXXX                |                          |
| 24h Volume | $X.XX M                | High/Medium/Low          |
| Liquidity  | $X.XX M                | Deep/Adequate/Thin       |
| Market Cap | $X.XX M                |                          |
| Holders    | X,XXX                  | Growing/Stable/Declining |
| 24h Change | +/-XX%                 |                          |
| Chain      | [Solana/ETH/Base]      |                          |
| DEX        | [Raydium/Uniswap/etc.] |                          |
| Pair Age   | X days                 | New/Established          |

### Safety Check

- **Liquidity Lock**: ✅/⚠️/❌ [status]
- **Top 10 Holders**: [% held, concentration risk]
- **Contract Verified**: ✅/❌
- **Rug Indicators**: [assessment]
- **Risk Level**: Low/Medium/High

### Price Action

- **5m**: +/-X.X%
- **1h**: +/-X.X%
- **6h**: +/-X.X%
- **24h**: +/-X.X%
- **Trend**: [Pumping/Dumping/Consolidating]

### Top Pairs on [Chain] (If Requested)

| Rank | Token | Price | 24h Vol | Liquidity | 24h Δ |
| ---- | ----- | ----- | ------- | --------- | ----- |
| 1    | XXX   | $X.XX | $X.X M  | $X.X M    | +XX%  |
| 2    | XXX   | $X.XX | $X.X M  | $X.X M    | +XX%  |

### Trending/New Launches (If Requested)

| Token | Chain | Age | Volume | Liquidity | Signal     |
| ----- | ----- | --- | ------ | --------- | ---------- |
| XXX   | SOL   | 2h  | $500K  | $100K     | 🔥 Hot     |
| XXX   | Base  | 1d  | $2M    | $800K     | 📈 Growing |

### Key Insights

- [Most important observation about the token/market]
- [Liquidity/safety assessment]
- [Trading recommendation or caution]
```

## Query-Specific Guidance

### "Look up [token] on DEX Screener"

Full token analysis with safety check

### "What's trending on Solana/Base?"

Top tokens by volume on that chain

### "Find new memecoin launches"

New pairs with volume/liquidity assessment

### "Is [token] safe to trade?"

Safety-focused analysis: liquidity, holders, rug indicators

### "Compare liquidity of [A] vs [B]"

Side-by-side liquidity and volume comparison

## Integration Notes

- Feeds into `liquiditySpecialist` for liquidity depth analysis
- Critical for memecoin/altcoin trading decisions
- Pairs with CoinGecko for established coins, DEX Screener for new/DEX-native

## Performance Notes

- Real-time data essential for fast-moving tokens
- Always check liquidity before large trades
- Pair age <24h = high risk, proceed with caution
- Cross-reference with RugCheck or similar for contract audits

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
