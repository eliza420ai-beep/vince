---
tags: [stablecoins, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

## Cross-Chain Bridging

The multi-chain world created a stablecoin fragmentation problem. USDC on Ethereum isn't the same as USDC on Avalanche if bridged through a third-party bridge — it's a wrapped derivative with bridge contract risk. The 2022 Wormhole hack ($320M) and Nomad exploit ($190M) demonstrated this viscerally.

**Circle's CCTP (Cross-Chain Transfer Protocol)** solves this at the issuer level. CCTP burns USDC on the source chain and mints native USDC on the destination chain — no wrapped tokens, no bridge liquidity pools, no third-party risk beyond Circle itself. Launched in 2023, CCTP now supports Ethereum, Avalanche, Arbitrum, Base, Solana, and others. It's slower than third-party bridges (minutes vs. seconds) but eliminates wrapped asset risk entirely.

**Wormhole** remains the dominant general-purpose bridge, handling billions in monthly volume across 30+ chains. Its guardian network (19 validators) provides security through multisig attestation. Post-hack, Wormhole implemented additional security layers and raised $225M to shore up operations. For assets without native cross-chain support, Wormhole is the pragmatic choice.

**LayerZero** takes a different approach with its ultra-light node architecture, allowing message passing between chains without a full validator set. Its OFT (Omnichain Fungible Token) standard lets stablecoin issuers deploy natively across chains — Tether has explored this for multi-chain USDT deployment.

The trend is clear: native burn-and-mint will win for major stablecoins, while third-party bridges handle the long tail of assets and chains.

## Payment Rails

Stablecoins are rebuilding payment infrastructure from the settlement layer up. The value proposition is simple: SWIFT takes 1-5 days and costs $15-50 per international transfer. A USDC transfer on Base or Solana settles in seconds for under $0.01.

**Stripe's acquisition of Bridge** (a stablecoin API platform) in late 2024 for over $1B was the clearest signal that mainstream payment infrastructure is absorbing stablecoins. Bridge provides APIs for businesses to accept, hold, and send stablecoins — abstracting away the blockchain complexity. Stripe integrating this means millions of merchants gain stablecoin capability without knowing they're using crypto.

**Visa and Mastercard** have both piloted stablecoin settlement. Visa settles select transactions in USDC on Ethereum and Solana. Mastercard's Multi-Token Network enables stablecoin-based B2B payments. These are pilot-scale, not yet transformative, but they validate the direction.

The missing piece remains **local currency on/off-ramps**. Sending USDC across borders is trivial; converting it to local currency at the destination still requires exchange infrastructure, banking relationships, and regulatory compliance. Companies like Yellow Card (Africa), Bitso (LatAm), and Coins.ph (Philippines) are building this last mile.

## Merchant Adoption

B2B leads consumer adoption. Freelancer platforms (Deel, Remote) already settle international contractor payments in USDC — it's cheaper and faster than wire transfers, and contractors in emerging markets often prefer dollar-denominated stablecoins over volatile local currencies.

E-commerce is next. Shopify plugins enable USDC checkout; Coinbase Commerce processes stablecoin payments. But consumer adoption faces the "why bother" problem: card payments work fine in developed markets. The wedge is cross-border e-commerce, where card fees are 3-5% and FX conversion adds another 1-3%.

## The Remittance Use Case

Global remittances total ~$650B annually, with average fees of 6.2% (World Bank). Stablecoin transfers cost a fraction of this. The US→Philippines corridor (one of the largest globally) has seen meaningful stablecoin adoption through Coins.ph and GCash integrations.

The pattern: a US-based worker buys USDC on Coinbase, sends it to a recipient's wallet or exchange account, and the recipient cashes out to local currency via a mobile money platform. Total cost: 0.5-2% including cash-out, vs. 5-8% through traditional remittance channels.

Scaling challenges: KYC/AML compliance at both ends, recipient crypto literacy, and local cash-out liquidity in smaller corridors. But the economic incentive is overwhelming — the question is infrastructure maturity, not demand.

_Last updated: 2026-02-15_
