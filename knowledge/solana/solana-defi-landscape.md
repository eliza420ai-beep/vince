---
tags: [solana, l1, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Solana DeFi Landscape

## Major Protocols

### Jupiter — The Aggregation Layer

Jupiter is Solana's dominant DEX aggregator, routing 70-80%+ of all swap volume. It has expanded into limit orders, DCA, perpetual futures, and the LFG launchpad. Jupiter is to Solana what Uniswap aspires to be on Ethereum — but broader. See `jupiter-aggregator.md` for deep dive.

### Raydium — Core AMM Infrastructure

Raydium provides concentrated liquidity AMM pools and serves as the primary liquidity venue for new token launches (particularly via pump.fun integrations). Its CLMM (Concentrated Liquidity Market Maker) pools compete directly with Orca. Raydium's advantage is its deep integration with the Solana token launch pipeline — when memecoins migrate from bonding curves, they typically land on Raydium. TVL: $1-2B range.

### Orca — Concentrated Liquidity Pioneer

Orca pioneered concentrated liquidity on Solana with its Whirlpools product. Known for cleaner UX and more institutional-grade liquidity, Orca captures significant volume in major pairs (SOL/USDC, SOL/ETH). Orca's fee tier structure and LP tooling are considered best-in-class on Solana.

### Meteora — Dynamic Liquidity

Meteora introduced Dynamic Liquidity Market Making (DLMM) pools that automatically adjust bin widths based on volatility. Increasingly popular for new token launches due to better capital efficiency for LPs. Meteora has grown rapidly as an alternative to Raydium for launch liquidity.

### Marinade Finance — Liquid Staking OG

Marinade is Solana's oldest liquid staking protocol, offering mSOL. It pioneered native staking delegation strategies that distribute stake across smaller validators, improving decentralization. Marinade Native (non-tokenized staking with validator distribution) is a unique offering. TVL: $1-1.5B.

### Jito — MEV-Powered Liquid Staking

Jito's jitoSOL has become Solana's largest liquid staking token by TVL ($2-3B+). Its moat comes from MEV redistribution — Jito validators earn MEV tips and pass yields to jitoSOL holders, offering structurally higher APY than competitors. Jito's MEV infrastructure (block engine, bundles) underpins much of Solana's MEV ecosystem. See `solana-mev-jito.md`.

### Kamino Finance — Automated Yield

Kamino started as an automated liquidity management protocol (auto-rebalancing LP positions) and expanded into lending/borrowing. Kamino Lend has become one of Solana's largest lending markets, competing with MarginFi and Solend. Its integrated approach — LP management + lending + leverage — creates a DeFi flywheel.

### Drift Protocol — Perpetual DEX

Drift is Solana's leading perpetual futures DEX, offering up to 20x leverage on major pairs. It uses a hybrid model combining a virtual AMM (vAMM), order book, and JIT (Just-In-Time) liquidity. Drift also offers spot trading, lending, and prediction markets. Volume has grown significantly, though it still trails centralized perp venues.

## Emerging Themes

- **Points meta:** Most Solana DeFi protocols ran points programs through 2024-2025, driving TVL but raising questions about organic demand post-airdrop.
- **Lending wars:** Kamino, MarginFi, and Solend compete aggressively for lending market share. MarginFi faced controversy around its points program and team conduct.
- **Real yield:** Jito's MEV-backed yields and Jupiter's fee revenue represent genuine protocol revenue — a differentiator from purely emissions-driven DeFi.

_Last updated: 2026-02-15_
