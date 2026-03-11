---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

Trading perpetuals isn't a team sport where you must pick sides.
Yet scroll through Crypto Twitter (CT) for five minutes and you'd think otherwise. The maximalist mindset has consumed most traders, eroding the edge they could have gained from simply being curious.
Post about trying a new perp DEX and you will be met with replies displaying maximalism rather than curiosity. The irony is that the person being attacked is often just trying to find better options to improve their trading, but in the maximalist mindset, exploration equals betrayal.

## The Real Winners and Losers

In the perps market landscape, there aren't any winners and losers in the way maximalists imagine. Multiple platforms can co-exist profitably because they serve different needs; sometimes for different traders, sometimes for the same trader at different moments.
But there are winners and losers among traders, divided by whether they optimize for outcomes rather than by which platforms they use.

## The Landscape: Specialists, Not Competitors

Understanding the perps landscape requires abandoning the winner-take-all mentality. These platforms are specializing, not fighting to the death.

## Hyperliquid

Hyperliquid is a decentralized exchange that runs on its own Layer-1 blockchain (HyperCore) with an EVM-compatible layer (HyperEVM), designed for high performance and scalability. It addresses the limitations of AMMs and off-chain matching engines by employing a fully on-chain order book model.
Source: HyperFoundation

**HyperBFT Consensus Mechanism:** HyperLiquid uses a custom consensus algorithm called HyperBFT, inspired by HotStuff and its successors. Both the algorithm and networking stack are optimized from the ground up to support the unique demands of the L1, allowing the network to process up to 200,000 orders per second with a latency of approximately 0.2 seconds.

**Dual-chain Architecture:** HyperLiquid is split into two broad components: HyperCore and HyperEVM.
HyperCore: the native execution layer that manages the critical functions of the trading platform. It operates as an ultra-efficient engine, capable of supporting deep order books and the required liquidity.
HyperEVM: the EVM-compatible layer, allowing any developer to deploy smart contracts and thus build decentralized applications, while natively benefiting from Hyperliquid’s liquidity and performance.
The key to this architecture lies in the unification of state between HyperCore and HyperEVM: there is no bridge, no risk of inconsistency, no delays. Applications built on HyperEVM can read and write directly to the deep liquidity of HyperCore, in real time.

### HyperEVM Ecosystem

The HyperEVM ecosystem is already attracting a dense cluster of foundational protocols across lending, derivatives, yield, and infrastructure.
Within this landscape, core protocols like HypurrFi, Felix, Harmonix, Kinetiq, HyperBeat, HyperLend, and Project X anchor capital flow across the chain.
To understand HyperEVM, you have to start with where capital enters.
HyperEVM ecosystem: https://hyperliquid-co.gitbook.io/wiki/ecosystem/projects/hyperevm
Protocols like HypurrFi and Felix provide debt infrastructure through lending markets, synthetic dollar tooling (USDXL, feUSD), and cash-flow enabled products.
Kinetiq transforms locked HYPE into liquid yield-bearing tokens (kHYPE), enabling DeFi composability while maintaining staking rewards. The platform also enables permissionless HIP-3 exchange deployment through crowdfunded validator stakes.
Harmonix converts idle capital into productive liquidity through automated delta-neutral strategies and validator staking curation, delivering 8-15% APY on stablecoins.
Project X operates as an AMM DEX with cross-chain aggregation, offering zero-fee trading across EVM chains with 50ms finality and simplified liquidity provision UX.

### Fees

Perps fee tiers are variable trading fees applied to perpetual futures contracts based on your 14-day trading volume. Depending on your category and total trading volume, you can expect your taker and maker fees to decrease.
There are separate fee schedules for perps vs spot. Perps and spot volume will be counted together to determine your fee tier, and spot volume will count double toward your fee tier. (14d weighted volume) = (14d perps volume) + 2 \* (14d spot volume).
Source: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
For each user, there is one fee tier across all assets, including perps, HIP-3 perps, and spot.

### HyperLiquid Vaults

Hyperliquid vaults let users pool capital and follow trading strategies. There are two main types: protocol vaults and user vaults.
Vaults like the Hyperliquidity Provider (HLP), are run by the platform itself. HLP handles market making and liquidations, earning a share of the trading fees. Anyone can deposit USDC into HLP and share its profits or losses.
Then there are user vaults, managed by vault leaders. Anyone can become a vault leader by putting in at least 100 USDC and keeping 5% of the vault’s total value as their own stake. Vault leaders trade the money in the vault and get 10% of the profits as a reward.
For example, if you deposit 100 USDC into a vault with 900 USDC already, you own 10%. If it grows to 2,000 USDC, you could withdraw 190 USDC—your 200 USDC share minus 10 USDC for the leader’s cut.
There is no DMM program, special rebates/fees, or latency advantages. Anyone is welcome to market make.
Source: https://app.hyperliquid.xyz/vaults

### Team

Hyperliquid is created by Hyperliquid Labs. The platform was founded by Jeff Yan and lliensinc, two Harvard classmates who led the Hyperliquid team.
Other members of the team are from Caltech and MIT and previously worked at Airtable, Citadel, Hudson River Trading, and Nuro.
Jeff Yan brings expertise from Hudson River Trading, where he worked on high-frequency trading systems, and later founded a crypto market-making firm Chameleon Trading. lliensinc complements this with deep knowledge of blockchain technology.
Hyperliquid Labs is self-funded and has not taken any external capital, which allows the team to focus on building a product they believe in without external pressure.

### Tokenomics

Hyperliquid’s native token, HYPE, powers its ecosystem with a total supply of 1 billion tokens. The exchange launched HYPE via an airdrop to 94,000 users, distributing 310 million tokens (31% of supply).
HYPE offers utility through governance rights, letting holders vote on platform upgrades, and staking rewards approx. 2.37% per year.
The tokenomics break down as follows:
38.888% (388.88 million tokens) is reserved for future emissions and community rewards
31% for the genesis distribution
23.8% for core contributors (vesting until 2027-2028)
6% for the Hyper Foundation budget
0.3% for community grants
0.012% for HIP-2 allocation

### HIPs: HyperLiquid Improvement Proposals

The governance of the Hyperliquid ecosystem is driven by its native token (HYPE).
Token holders participate in platform decisions by voting on onchain proposals called Hyperliquid Improvement Proposals (HIPs). Any eligible participant can submit a HIP, and HYPE holders then vote on it—typically proportional to their stake. If a proposal gains enough support, the core team implements it.

### HIP-3: Builder-Deployed Perpetuals

The HyperLiquid protocol supports permissionless builder-deployed perps, a key milestone towards fully decentralizing the perp listing process.
In effect, HIP-3 lets anyone that stakes 1 million HYPE tokens create a new perpetual futures market on the Hyperliquid blockchain, not Hyperliquid's decentralized trading platform.
If a perpetual futures market acts maliciously or poorly, the HIP-3 system can penalize the deployer by slashing their HYPE stake.

## Tradexyz

Tradexyz is a decentralized, non-custodial perpetual futures platform built on Hyperliquid's HIP-3 infrastructure. It enables users to trade crypto, stocks, indices, forex, and commodities 24/7 using leveraged perpetual contracts, all without depositing funds to a centralized entity.
Source: DefiLlama
XYZ is the first HIP-3 deployment on Hyperliquid where XYZ perpetual futures trade.
XYZ perps are perpetual futures contracts that reference traditional (non-crypto) asset classes. Like all perps, XYZ perpetuals are cash-settled and use funding payments to keep prices aligned with the underlying asset. The same trading mechanics that apply to Hyperliquid perps (including collateral management, leverage adjustment, and margin modes or order types) also apply to XYZ Perps.
The XYZ100 Index perpetual future is the first perpetual contract on XYZ. It tracks the value of a modified capitalization-weighted index of 100 large non-financial companies listed on a U.S. exchange. Like other Hyperliquid perps, it uses an oracle price to compute funding rates, and the mark price is used for margining, liquidations, triggering TP/SL, and computing unrealized PnL.
How HIP-3 differs from HIP-1 and HIP-2:
HIP-1 and HIP-2 were earlier governance proposals focused on spot trading, whereas HIP-3 targets perpetual futures. HIP-1 introduced the token listing standard and a governance-based process for new spot tokens. Under HIP-1, communities could create new tokens on Hyperliquid and bid HYPE to list them in spot markets. HIP-2 then added a protocol-native liquidity engine, automatically seeding orderbooks so that new tokens have deep liquidity from day one.

### Builder codes

Builder codes are unique identifiers that enable any developer to connect their front end to Hyperliquid's back end. Thus, every trade executed through this identifier is routed through Hyperliquid's order book and automatically pays out a percentage of trading fees to the developer. Builder fees charged can be at most 0.1% on perps and 1% on spot.
Source: OAK research
In practice, this means any trading bot, mobile application, or wallet can choose to use Hyperliquid as its back-end infrastructure to offer crypto trading to its users, while also earning a share of the fees generated.

### Adoption and Key Metrics

Builder Codes were introduced in October 2024 by the Hyperliquid team, with adoption accelerating in the months that followed.
The chart below compares revenue across protocols implementing Builder Codes highlighting Top 20.
Source: hypeburn.fun/builders
But the real success of HyperLiquid lies not only in the quality of its product, or even the largest airdrop ever distributed in crypto history. Above all, it is rooted in a decisive point: having built the platform with the deepest liquidity in the market.
Liquidity is the single truth when it comes to financial markets. However, decentralized finance emerged with the promise of making finance more open and accessible, but this openness led to the rise of a multitude of blockchains and applications, all competing relentlessly to attract and retain the same liquidity.
The history of decentralized finance is a cycle that repeats itself endlessly: protocols are born, attract liquidity through incentives or airdrops, and then see their users migrate as soon as a better opportunity arises. In this world, liquidity remains a zero-sum game.
Hyperliquid has built an infrastructure capable of retaining this liquidity.
Source: https://defillama.com/pro/rpzjq3mf5e0w40u
Hyperliquid has established itself through liquidity depth, unique technical architecture and market variety. The platform offers deep orderbooks across major pairs and dozens of perpetual markets. For traders managing diverse portfolios or large positions, this liquidity is valuable.
You can trade exposure across different tokens without fragmenting capital across venues.
500k BTC Position comparing liquidity depth ( see slippage)

## Lighter

Lighter is a decentralized exchange built on a custom zero-knowledge rollup for Ethereum.
Lighter uses custom ZK circuits to generate cryptographic proofs for all operations including order matching and liquidations, with final settlement occurring on the Ethereum blockchain. This approach enables the platform to process tens of thousands of orders per second with millisecond latency, while ensuring every trade is provably fair and verifiable onchain.
Hyperliquid and Lighter achieve verifiable trade execution through different architectures.
Graphical description of Lighter Core
Lighter Core is an orchestrated assembly of components:
Users submit signed transactions: orders, cancels, liquidations, etc are user-signed. This guarantees no forged actions and deterministic execution (same inputs → same outputs)
These transactions enter the system via API Servers (top of the diagram).
Sequencer & Soft Finality: The heart of the system is the Sequencer, responsible for ordering transactions on a “First in, First out” (FIFO) basis. It provides immediate “Soft Finality” to users via APIs, delivering a seamless, CEX like experience.
Witness Generators & Prover: This is where the magic happens. Data from the Sequencer is fed to Witness Generators, which transform it into circuit friendly inputs. Subsequently, the Lighter Prover built from scratch specifically for exchange workloads generates hundreds of thousands of execution proofs in parallel.
Multi layer Aggregation: To minimize gas costs on Ethereum, Lighter utilizes a Multi layer Aggregation Engine. This compresses thousands of individual proofs into a single Batch Proof for final verification on Ethereum.
Escape Hatch
This feature defines true ownership. In a worst case scenario, such as the Sequencer being compromised or attempting to censor your withdrawal, Lighter Core triggers the Escape Hatch mode.
The protocol allows users to submit a Priority Request directly on Ethereum. If the Sequencer fails to process this request within a predefined timeframe, the Smart Contract freezes the entire exchange. In this state, users can leverage the compressed Data Blobs previously published on Ethereum to reconstruct their account state and withdraw full asset value directly on chain, independent of the Lighter team or off chain coordination.
Custom Arithmetic Circuits
A significant challenge for current Layer 2 scaling solutions is the “technical debt” incurred from attempting to simulate the entire Ethereum Virtual Machine (EVM). This often necessitates redundant opcodes that are unnecessary for specific financial tasks.
Lighter addresses this by engineering Custom Arithmetic Circuits from scratch.
These circuits are exclusively designed for exchange logic: order matching, balance updates, and liquidations.
Technical data indicates that by eliminating the EVM overhead, the Lighter Prover operates at significantly higher speeds and consumes considerably fewer resources than zkEVM competitors when processing the same volume of transactions. This is a prerequisite for achieving the Low Latency required for High Frequency Trading (HFT).
Multi Layer Aggregation
Lighter’s ability to offer zero trading fees for Retail Users does not stem from short-term subsidy strategies, but from the structural advantage of Multi Layer Aggregation.
Source: https://assets.lighter.xyz/whitepaper.pdf
The verification process operates as a data compression assembly line:
Batching: The Prover generates parallel execution proofs for thousands of small transactions.
Aggregation: The system collects hundreds of thousands of sub-proofs and compresses them into a single Batch Proof.
Final Verification: The Smart Contract on Ethereum only needs to verify this single final proof.
The economic consequence is that the Marginal Cost to verify an additional transaction on the network approaches zero. This creates a sustainable competitive advantage regarding operational costs.

### Fees

Lighter currently does not charge taker or maker fees for the standard accounts. Everyone can trade in all of the markets free of charge. Premium accounts are subject to taker and maker fees.
Lighter Vault: LLP is the native market making vault on Lighter.
The platform features Public Liquidity Pools where users can contribute liquidity and earn yield based on trading activity. LLP tokens represent shares in these pools and can be used across the Ethereum DeFi ecosystem, enabling composability with protocols like Aave for additional yield opportunities.
While its purpose is to ensure deep liquidity and tight spreads in the orderbooks, it is far from the only market maker on the exchange. Other trader HFT firms can run market making algorithms as well.

### Team

Vladimir Novakovski is the Founder and CEO of Lighter, with a background in quantitative trading at Citadel, machine learning at Quora, and engineering leadership at Addepar. He previously co-founded Lunchclub and holds a degree from Harvard University.

### Fundraising

Lighter raised a total of $68M through an undisclosed funding round completed on November 11, 2025, at a reported valuation of $1.5B.
The round was led by Ribbit Capital and Founders Fund, with participation from Haun Ventures and the online brokerage Robinhood which rarely makes venture investments.
In addition, Lighter is supported by a broad network of leading venture firms and angel investors, including Andreessen Horowitz (a16z), Coatue, Lightspeed, CRV, SVA, 8VC, and Abstract Ventures, among others.

### Tokenomics

According to the official allocation data, the total supply of Lighter is capped at 1,000,000,000 LIT (1 Billion tokens). The distribution architecture establishes a precise 50/50 equilibrium between internal stakeholders and the external community.
26% for the team
25% for the airdrop
25% for the ecosystem
24% for the investors
Lighter carved out its position through cost obsession. The platform's zero fee structure can make the difference between profitable and unprofitable strategies for high volume traders.
On $10 million monthly volume, the savings compared to platforms charging even 0.03-0.05% taker fee amounts to thousands of dollars monthly, or tens of thousands annually. Lighter recognized that for certain traders, eliminating fees matters more than having access to a hundred different markets.
They optimized for that trader, and those traders notice.
Fees comparison between Hyperliquid vs Lighter vs Extended

## Extended

Extended is a perp DEX built by an ex-Revolut team with a unique product vision centered around unified margin.
The goal is to create a full-suite trading experience — combining perps, spot, and integrated lending markets under one margin system.
The Extended network, with global unified margin at its core, will allow all applications within the network to access users’ available margin and share unified liquidity , reinforcing overall liquidity depth. From the user’s perspective, all activity will contribute to a single global margin account shared across applications, allowing them to manage one account instead of multiple app-specific ones and maximize capital efficiency by using the same margin across dApps.
Extended operates as a hybrid Central Limit Order Book (CLOB) exchange. While order processing, matching, position risk assessment, and transaction sequencing are handled off-chain, transaction validation and trade settlement occur on-chain via Starknet.
Extended's hybrid model leverages the strengths of both centralized and decentralized components:
On-chain Settlement with Validations and Oracle Prices: Extended settles each trade on the blockchain and on-chain validations of trading logic ensure the prevention of fraudulent or incorrect transactions. Additionally, mark prices sourced from multiple independent oracle providers mitigate the risk of price manipulation.
Off-chain Trading Infrastructure: Off-chain order matching and risk engines, combined with a unique settlement architecture, deliver remarkable performance in terms of throughput, end-to-end latency, and trade settlement. This performance is comparable to centralized exchanges and superior to other hybrid exchanges or decentralized exchanges (DEXs).
Extended Technical Architecture
Extended is designed to operate in a completely trustless manner, enabled by two core principles:
Users retain self-custody of their funds, with all assets held in smart contracts on Starknet. This means Extended has no custodial access to user assets under any circumstances.
On-chain validation of the trading logic ensures that fraudulent or incorrect transactions, including liquidations that are contrary to the on-chain rules, are never permitted.
All transactions that happen on Extended are settled on Starknet. While Starknet does not rely on Ethereum Layer 1 for every individual transaction, it inherits Ethereum’s security by publishing zero-knowledge proofs every few hours. These proofs validate state transitions on Starknet, ensuring the integrity and correctness of the entire system.

### Team

Extended was created by an ex-Revolut team comprising :
@rf_extended, CEO: Former Head of Crypto Operations at Revolut, ex-McKinsey.
@dk_extended, CTO: Architect of 4 crypto exchanges, including recently launched Revolut Crypto Exchange.
@spooky_x10, CBO: Former Lead Engineer at Revolut Crypto and one of the major contributors behind Corda blockchain.
Their journey as a team began at Revolut, where they saw millions of retail users enter crypto during the last bull run, but also noticed a lack of high-quality products beyond the top exchanges and an overall suboptimal DeFi experience.

### Fees

Extended adopts a streamlined fee structure for its perpetual markets:
Taker fee: 0.025% of the filled notional value.
Maker fee: 0.000% (i.e., no fee for maker orders).
From a user’s perspective, this means the cost of executing market-orders is low, and placing limit orders that are filled as makers may incur no direct fee.
Builder Codes
Extended supports Builder Codes which enables developers who build alternative frontends for Extended to earn a builder fee on each trade they route for users. This fee goes 100% to the builder and is defined per-order.
The builder codes are already in progress with the mentioned teams below:
Extended
@extendedapp
·
Nov 6, 2025
Extended now supports Builder Codes

Builder Codes allow developers who build alternative frontends or strategies for Extended to earn a fee on every trade they route for users. This builder fee goes 100% to the builder.

## Already in progress with 5+ external teams, including:

Show more
Wallet Trading Integration
Beyond expanding its product offering, Extended has integrated natively with wallets, enabling perpetual trading directly within wallet interfaces, similar to how swaps are accessed today. This integration has opened perpetuals to a broader base of retail users.
Ready (Formerly Argent)
@ready_co
·
Dec 4, 2025
Perps, points, and a… 🪂?

Introducing Perps for Ready Wallet

Powered by
@extendedapp
0:00 / 0:27
The Extended Vault
The vault actively quotes on all markets listed on Extended using an automated market-making strategy. Its quoting behavior is governed by both global and market-specific exposure controls, as well as dynamic capital allocation and spread management logic:
Exposure Management
Global Exposure Cap:If the vault’s leverage exceeds 0.2x, it will only quote in markets where it already holds exposure, and only on the side that reduces that exposure. This acts as a circuit breaker to prevent excessive leverage.
Per-Market Exposure Limits:Each market has a hard cap on allowable vault exposure. Less liquid assets have stricter limits to minimize risk from illiquidity.
Quoting Behavior
Adaptive Spread Quoting:Spreads are set dynamically—tightening in stable conditions and widening with volatility—to mitigate adverse selection. Quotes must remain within predefined width constraints to stay eligible for rewards.
Exposure-Aware Adjustments:The vault adjusts size and spread asymmetrically by side, reducing quoting size and widening the spread on the side that would further increase the vault's exposure.
Additionally, the vault accrues maker rebates from its market-making activity.
Extended distinguishes itself through its vault system that allows traders to earn yield while trading perps. Through Extended Vault Shares ( XVS) , depositors earn a base yield of approximately 15% APR on their collateral, with additional yield based on trading activity.
The amount of Extra Yield a given user receives depends on their trading league. The higher the trading league, the higher the Extra Yield APR. Extended’s trading leagues are percentile-based and depend on users’ trading activity:

- Trading league rankings are updated weekly, together with points distribution, based on users’ total trading points.
- Passive vault depositors do not have a trading league and have an Extra Yield factor of zero.
- Active traders are ranked into Pawn (bottom 40%), Knight (next 30%), Rook (15%), Queen (10%), and King (top 5%).
  Extended
  @extendedapp
  ·
  Jan 7
  The past week’s vault APR was 35%, of which 30% came from the vault’s max Extra Yield. The amount of Extra Yield a given user receives depends on their trading league. The higher the trading league, the higher the Extra Yield APR.

Extended’s trading leagues are percentile-based
Show more
The platform allows XVS to be used as margin with up to 90% equity contribution, meaning traders can simultaneously earn passive income on their capital while executing leveraged trades.
For traders who maintain significant capital in perps platforms, this dual-use of collateral—both as trading margin and yield-generating deposits—creates capital efficiency that traditional platforms don't offer.
Extended Vault Shares Guide

## Variational

Variational is a peer-to-peer trading protocol that operates on a fundamentally different model. Unlike order-book based DEXs, Variational uses a request-for-quote (RFQ) model. The protocol offers zero trading fees across 500+ markets while implementing a revenue redistribution system through loss refunds and trading rebates.
Variational revenue stream to reward
OMNI: Perpetual Futures Trading
The first live app on the Variational Protocol is Omni, a retail-focused perp trading platform. Omni lets users trade hundreds of markets with tight spreads and zero fees, all while earning loss refunds and other rewards.
The protocol uses an internal market maker called the Omni Liquidity Provider (OLP) that aggregates liquidity from CEXs, DEXs, DeFi Protocol, and OTC markets. OLP is the first vault that simultaneously runs a sophisticated market making strategy and is the only counterparty to user trades. When users request a quote, the OLP sources competitive prices across the entire liquidity landscape. The OLP captures spread revenue of typically 4-6 basis points while charging traders zero fees.
Additionally, since the RFQ model only requires OLP to provision liquidity when trades are opened, OLP is able to quote competitively across hundreds of pairs simultaneously.
Variational redistributes a significant portion of this revenue back to users through two mechanisms:
Loss Refunds: Every time a trader closes a losing position, they have the chance of getting that entire loss instantly refunded, with odds ranging from 0% to 5% depending on their reward tier ( from No Tier to Grandmaster). The protocol has distributed over $2million in refunds across 70,000+ transactions, with the highest refund exceeding $100,000. This is funded by 10% of the OLP's spread revenue.
Trading Rebates: Active traders earn rebates on their trading volume and receive spread discounts. Higher volume results in more value flowing back to the trader.
The 500+ market selection gives Variational the broadest coverage in the perp DEX space. Through an automated listing engine that leverages the OLP's aggregated liquidity from CEXs, DEXs, DeFi Protocols and OTC sources, new assets can go live within hours. Having a customizable, in-house oracle allows Variational to support new assets quickly, and in the future, list exotic and novel markets.
On Omni, the on-chain transactor covers gas for user deposits and withdrawals, and as necessary to move funds from OLP into new settlement pools. This removes the friction of managing gas fees across different trading operations.
For traders who want downside protection, access to exotic markets, and rewards that flow back based on activity, Variational's model serves a distinct need.
PRO: Institutional OTC Derivatives Trading
With Omni tackling the perps market, Pro is designed for institutional traders who need more than just standard perpetuals. Pro extends the RFQ model by enabling multiple market makers to compete for a single request for quote in real time, providing transparency and better pricing than the current "negotiate in telegram groups" model.
Pro is designed to make OTC derivatives trading transparent and automated. Turning what is a slow, opaque, and risky market, into efficient and fair on-chain infrastructure.

### Team

Variational was founded by Lucas Schuermann and Edward Yu. Lucas and Edward met as engineering students and researchers at Columbia University before founding their own hedge fund (Qu Capital) in 2017. In 2019, Qu Capital was acquired by Digital Currency Group, and Lucas and Edward became the VP of engineering and VP of Quant Trading respectively at Genesis Trading.
In 2021, after processing hundreds of billions in volume at Genesis (at the time one of the largest desks in crypto), Lucas and Edward left to start their own proprietary trading firm: Variational. After raising $10M in funding to profitably run their trading strategies for a few years, and integrating with virtually every CEX and DEX in the space, Lucas and Edward decided to use Variational's trading profits to develop the Variational Protocol.
Lucas and Edward's goal with the Variational Protocol is to return market making profits to traders with Omni, and solve pain points they saw firsthand by bringing institutional OTC trading on-chain with Pro.
The Variational development and quant teams consist of industry veterans active in crypto algorithmic trading since 2017 with prior experience at Google, Meta, Goldman Sachs, GSR, and more. All members of the core technical team each have more than a decade each of experience in software engineering and/or quantitative research.
Fundraising: Variational raised a total of $11.8M through a funding round completed on June, 4 2025.
Variational is backed by industry leaders, including Bain Capital Crypto, Peak XV (formerly Sequoia India/Southeast Asia), Coinbase Ventures, Dragonfly, Hack VC, North Island Ventures, Caladan, Mirana Ventures, Zoku Ventures and more.
Fees
There are no trading fees on Omni.
Omni only charges a flat fee of $0.1 per deposit/withdraw to disincentivize spam and cover gas costs.
OLP
The Omni Liquidity Provider (OLP) is a vertically integrated market maker that acts as the counterparty to all trades on Omni.
OLP can be broken down into three key components: the vault, the market making engine, and the risk management system.
The Vault
The vault is a smart contract where the capital that powers OLP (USDC) is secured. The vault is the source of OLP's margin, and is also where OLP's market making profits are accumulated.
The Market Making Engine
OLP runs a sophisticated market making strategy that is responsible for generating competitive price quotes and acting as the counterparty to every trade executed on Omni. OLP runs proprietary in-house algorithms that analyze real-time data (such as flow and volatility) from CEXs and on-chain sources to determine fair prices. The market making engine's primary objective is to maintain the tightest possible spreads across all markets.
OLP is based on the same market making engine that the Variational founders have been using and improving for over 7 years.
OLP As The Sole Counterparty
For every trade on Omni, both OLP and the user are subject to margin requirements. This means both parties are required to maintain margin in a settlement pool, and may be subject to liquidation if their margin levels fall below requirements.
A key difference from Omni's design compared to other platforms is that OLP is the counterparty to all trades on Omni. This brings a variety of benefits to traders:
Zero Fees: Since all market making on Omni is done by OLP instead of external market makers, Omni doesn't need fees to generate revenue.
Loss Refunds: A portion of spread revenue is immediately redirected back to traders, including via Omni's loss refund mechanism.
Listing Variety: All OLP requires for a new listing is a reliable price feed, a quoting strategy, and a hedging mechanism — all of which can be built and maintained in-house. This manifests as ~500 tradable markets on Omni, with RWAs and other exotic markets able to be added in the future.
OLP makes money through the following flow:
OLP constantly determines a fair spread for each asset.
Users open trades against OLP at the quoted prices.
OLP hedges out the directional exposure it accumulates from traders via external venues as needed.
The Variational protocol makes money by taking a percentage of Omni's spread revenue. To give a high-level example, the Variational protocol may earn 10% of all spreads paid on Omni.
How OLP Is Funded
Initially, the Variational team has provided seed capital for OLP. Once the system's stability is proven over time in mainnet and has a good track record of generating market-neutral yield, the team intends to open it up to user deposits via a community vault.
Variational Oracle
The Variational Oracle sources prices and market information for all assets supported by the Variational Protocol.
Variational Data Flow Program
The oracle works by streaming a variety of different real-time data feeds for each listed market, using a weighted combination of prices on different exchanges. Having a customizable, in-house oracle allows Variational to support new assets quickly, and (in the future) list exotic and novel markets.
Omni’s permissionless perp listings are enabled by its custom oracle, which can autonomously assess price reliability, decentralization, and market activity before activating new markets.
Trading via RFQ
Variational is a request-for-quote (RFQ) protocol, and does not utilize an orderbook.
Source: https://hummingbot.org/blog/exchange-types-explained-clob-rfq-amm/#request-for-quotation-rfq-exchanges
At a high level, an RFQ system consists of takers requesting quotes and makers responding to them with bids and/or offers. The generic RFQ flow (at the protocol level) is as follows:
The taker creates an RFQ by selecting the structure they would like to trade. For example, a future on ETH with a settlement date of 2026-01-01. The taker can either broadcast the RFQ globally (to all makers) or to a select whitelist of makers.
Eligible makers can respond with quotes. Each quote includes terms, which consist of:
The price at which the trade would be executed. The maker can either quote dual-sided (with a bid and offer), or single-sided (either a bid or offer).
The settlement pool in which the trade would be booked. This would be either an existing pool between the two parties (if one exists), or a new pool that would be created concurrently with the trade. Regardless of whether the trade will use an existing or new pool, margin requirements, liquidation penalties, and other pool parameters are proposed here before the quote is accepted.
If the terms are acceptable, the taker can choose a quote to accept. At this stage, the taker has to approve the smart contract calls to move collateral into the pool. However, no funds will actually be moved until the maker last look stage.
The maker has a last look, which is a final confirmation of the trade and all terms. If the maker gives the final "OK" by approving the smart contract calls, the pending trade will enter the clearing process. If a new settlement pool needs to be created, it will happen at this stage. At this point, collateral is moved from both parties into the pool, the trade is booked, and the new position will be reflected in the pool's ledger.
Taken together, Variational represents a fundamentally different approach to derivatives trading. By combining an RFQ-based execution model with a vertically integrated liquidity provider, Variational functions as a perpetual DEX aggregator done correctly; abstracting fragmented liquidity across CEXs, DEXs, DeFi protocols, and OTC markets into a single, zero-fee trading interface.
The result is a system that delivers institutional-grade pricing, broad market coverage, and capital efficiency while returning a portion of market-making profits directly to traders through loss refunds and rebates. Where traditional perp DEXs rely on external market makers and fee extraction, Variational internalizes liquidity provision, aligns incentives, and removes unnecessary intermediaries. This design positions Variational not simply as another perp venue, but as an execution layer that bridges retail and institutional trading under a unified, on-chain framework.

## The Thesis in Brief

The long-term arc for DEXs isn't a winner-take-all fight; it's a progressive improvement cycle fueled by self-custody demand and capital efficiency. As traders increasingly value retaining control of their own assets, DEXs will continuously gain traction.
However the moment the perp DEX meta took off, it became inevitable that dozens of teams would rush to launch cheap forks and points-driven clones, optimized less for traders and more for extracting fees from people farming the "next big DEX" before the opportunity window closes. This is the same late-cycle behaviour we have seen in every successful meta and it is basically the saturation phase where you are better off just protecting your capital.
What we’re seeing now feels strikingly familiar with broader crypto cycles:
Paradigm Shift and Massive Success: A high-quality first mover reshapes expectations; Hyperliquid pioneered deep on-chain liquidity, unique technical architecture and set a new benchmark.
Second Movers with Tangible Value Propositions: Protocols like Lighter and Variational that spotlight a specific structural advantage (zero fees in Lighter's case, and a zero-fee, RFQ-based aggregator model with trading rebates in Variational's.)
Saturation and Low-Quality Late Movers: As the narrative becomes crowded, late entrants and derivative forks, many offering little true differentiation beyond speculative yield. This mirrors saturation phases seen in NFTs, yield-bearing stablecoins, ICO waves, and even early perp markets like GMX and its many forks.
This pattern is a structural feature of crypto narratives. First movers garner outsized opportunity because they establish new paradigms that many traders have not yet priced in. Early second movers can still profit if they differentiate meaningfully. Late movers face two simple realities:
Most will never have real liquidity or offer anything meaningfully better for serious traders.
For users, preserving capital usually beats spreading it across redundant farms once a meta is already crowded.
Differentiation is a top player in paradigm shifts.
Hyperliquid was a paradigm shift because it combined deep, unified liquidity, a fully on-chain orderbook, and CEX-level performance on its own purpose-built L1
Lighter differentiated by making a very clean, very opinionated bet: zero trading fees.
Variational went in a completely different direction with an RFQ-based aggregator model, abstracting fragmented liquidity across venues and returning part of market-making profits back to traders.
Meta shifts and in some cases, the competitors still stick around; what ultimately sets them apart is the specific value they bring.
If you're farming a perp DEX and it looks functionally similar to these; same order-book, promised value proposition with no pre-Token value, same points playbook, the odds are you're late.
