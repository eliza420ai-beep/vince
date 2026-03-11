---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# HIP-3 AI-Related Assets on Hyperliquid

HIP-3 assets are synthetic perps on Hyperliquid. Trade these as perps; xyz for stocks (USDC settled), vntl for AI/tech names (pre-IPO style). For live prices, funding, or positions, ask Vince.

## xyz DEX (USDC settled) — AI/Tech Stocks

| Ticker | Company           | API Symbol |
| ------ | ----------------- | ---------- |
| NVDA   | Nvidia            | xyz:NVDA   |
| GOOGL  | Alphabet (Google) | xyz:GOOGL  |
| META   | Meta Platforms    | xyz:META   |
| MSFT   | Microsoft         | xyz:MSFT   |
| AAPL   | Apple             | xyz:AAPL   |
| PLTR   | Palantir          | xyz:PLTR   |
| INTC   | Intel             | xyz:INTC   |
| ORCL   | Oracle            | xyz:ORCL   |
| MU     | Micron            | xyz:MU     |
| NFLX   | Netflix           | xyz:NFLX   |
| MSTR   | MicroStrategy     | xyz:MSTR   |
| COIN   | Coinbase          | xyz:COIN   |
| HOOD   | Robinhood         | xyz:HOOD   |
| CRCL   | Circle            | xyz:CRCL   |
| AMZN   | Amazon            | xyz:AMZN   |
| TSLA   | Tesla             | xyz:TSLA   |

## vntl DEX — AI/Tech Pre-IPO and Indices

| Ticker    | Company / Index           | API Symbol     |
| --------- | ------------------------- | -------------- |
| OPENAI    | OpenAI                    | vntl:OPENAI    |
| ANTHROPIC | Anthropic                 | vntl:ANTHROPIC |
| SPACEX    | SpaceX                    | vntl:SPACEX    |
| SNDK      | SanDisk (Western Digital) | vntl:SNDK      |
| AMD       | AMD                       | vntl:AMD       |
| MAG7      | Magnificent 7 index       | vntl:MAG7      |
| SEMIS     | Semiconductors index      | vntl:SEMIS     |
| INFOTECH  | Info tech index           | vntl:INFOTECH  |
| ROBOT     | Robotics index            | vntl:ROBOT     |

## Summary

- **xyz:** Most single stocks (GOOGL, META, NVDA, MSFT, AAPL, PLTR, INTC, ORCL, MU, etc.)
- **vntl:** AI/tech names (OPENAI, ANTHROPIC, SPACEX), SNDK, AMD, and indices (MAG7, SEMIS, INFOTECH, ROBOT)
- **API format:** Use `dex:TICKER` when calling Hyperliquid (e.g. `xyz:NVDA`, `vntl:OPENAI`)

## Related

- [Ai_2027_Summary](AI_2027_SUMMARY.md)
- [Clawterm_Vision](CLAWTERM_VISION.md)
