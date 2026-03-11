---
tags: [mev, trading, ethereum]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# MEV Protection

## The Problem

Every transaction you submit to a public mempool is visible to searchers before it's included in a block. Your swap, your liquidation, your NFT mint — all of it is fair game. The default onchain experience is adversarial. Protection requires routing around the public mempool, choosing MEV-aware execution venues, or both.

## Private Mempools & Transaction Protection

The first line of defense: don't broadcast to the public mempool.

### Flashbots Protect

The most widely used MEV protection RPC. Instead of sending transactions to the public mempool, you point your wallet at Flashbots Protect's RPC endpoint. Your transactions go directly to block builders via the Flashbots auction, bypassing public visibility entirely.

**How to use it:** Add `https://rpc.flashbots.net` as a custom RPC in MetaMask or any wallet. That's it. Transactions are invisible to the public mempool, immune to frontrunning and sandwich attacks.

**Tradeoffs:** Transactions may take slightly longer to include (they're only in Flashbots-connected builder blocks, not the full mempool). Failed transactions don't cost gas (they're never included on-chain). Flashbots Protect also offers **MEV refunds** — if a searcher backruns your transaction, you get a share of the profit.

### MEV Blocker

Built by CoW Protocol and Flashbots. Similar to Protect but with an explicit backrun auction: searchers bid for the right to backrun your transactions, and 90% of the bid goes back to you. More aggressive MEV redistribution than Flashbots Protect alone.

**RPC:** `https://rpc.mevblocker.io`

### Other Private RPCs

- **Merkle** — private transaction submission with MEV protection
- **Alchemy Private Transactions** — private mempool for Alchemy users
- **Infura Private Transactions** — similar offering from Infura

## MEV-Aware DEXs

The execution venue matters enormously. Not all DEXs expose you equally.

### CoW Protocol (CoW Swap)

CoW Protocol uses batch auctions instead of continuous AMM trading. Users submit signed "intents" (desired swaps). Solvers compete to find the best execution — including Coincidence of Wants (CoW), where two users' orders are matched directly without touching an AMM. No pool, no slippage, no MEV.

**Why it works:** Batch auctions eliminate the ordering game. All orders in a batch execute at the same price. There's no "first" or "last" — the concept of frontrunning doesn't apply within a batch. Surplus (better-than-expected execution) goes to the user.

### 1inch Fusion

1inch Fusion uses a Dutch auction mechanism: your swap starts at a favorable rate and decays over time until a resolver fills it. Resolvers compete, and the auction structure naturally resists MEV — extracting value from the order means the resolver earns less and risks losing the auction to a competitor.

### UniswapX

Intent-based swap protocol where fillers compete to give users the best price. Cross-chain capable. The auction mechanism forces fillers to internalize MEV as better execution for users. UniswapX represents Uniswap's strategic pivot toward MEV awareness.

### Pendle, Curve, and Protocol-Level Design

Some protocols are inherently more MEV-resistant by design. Curve's concentrated stablecoin pools have low slippage, reducing sandwich profitability. Pendle's fixed-rate markets have different MEV dynamics than spot DEXs. Protocol design is an underappreciated layer of MEV protection.

## Practical Checklist for Users

1. **Switch your RPC** — use Flashbots Protect or MEV Blocker. Takes 30 seconds, eliminates most sandwich attacks.
2. **Set tight slippage** — lower slippage tolerance reduces the profit margin for sandwich attackers. 0.5% instead of the default 1-2%.
3. **Use MEV-aware DEXs** — CoW Swap for large trades, 1inch Fusion for general swaps, UniswapX when available.
4. **Avoid large swaps in a single transaction** — break them up or use TWAP (Time-Weighted Average Price) execution.
5. **Time your transactions** — MEV is worse during high-volatility periods. If it's not urgent, wait for calmer blocks.
6. **Use limit orders** — limit orders on CoW Protocol or 1inch don't hit the mempool as market orders. They execute at your price or not at all.

## For Protocols & Builders

- **Batch auctions** over continuous trading (CoW model)
- **Encrypted mempools** — threshold encryption prevents anyone from seeing transactions pre-inclusion
- **Application-specific sequencing** — protocols can define their own ordering rules (e.g., Uniswap v4 hooks)
- **MEV taxes** — a proposed primitive where contracts set fees proportional to proposer priority fees, automatically capturing MEV

The MEV protection landscape is evolving fast. The default should be: never use a public mempool for DeFi transactions. The tools exist — use them.

_Last updated: 2026-02-15_
