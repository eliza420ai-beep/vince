---
title: "# Solana’s Changing Market Microstructure"
source: https://www.youtube.com/watch?v=YnrqiZhqXhw
category: perps-trading
ingestedWith: summarize
tags:
  - eliza-upload
  - user-submitted
  - chat
created: 2026-02-22T21:06:24.833Z
wordCount: 2465
---

# # Solana’s Changing Market Microstructure

> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use VINCE.

## Content

# Solana’s Changing Market Microstructure
Source: YouTube

## Intro / Promo
Host: Blockworks Digital Asset Summit is back in New York City, March 24–26. Top speakers from leading asset managers, financial institutions, DeFi protocols, crypto companies, and policy makers will attend. Use code lightseed200 for $200 off. Nothing on Lightseed is a recommendation to buy or sell investments. This podcast is for informational purposes only; views expressed are opinions, not financial advice.

[music]

## Episode open
Host: Hey guys, welcome back to another episode of the Lightseed Podcast, our weekly roundup. I’m joined by Carlos. Glad to have you back—funny how you and Dan Smith keep missing each other week by week.

Carlos: Sorry I missed last week. Happy to be back—probably a very data-packed episode.

Host: Dan yapped as always. We had Ian on to fill the void. Hopefully we can bring Ian back and get a full crew sometime. Are you going to be in person at DAS at the end of March?

Carlos: I’m going to be at DAS. Hopefully we can shoot around up there.

Host: I’m not certain of Lightseed’s exact plans, but Forward Guidance and other podcasts will be central to some themes. If you haven’t gotten tickets for DAS, it’s a packed conference with institutional showing and many regulators and industry names. March 24–26 in New York City. Use code lightseed200 for $200 off.

## Solana monthly note — high-level recap
Host: You’ve been busy writing the monthly note on Solana. Great time to revisit high-level: what’s been happening on Solana recently, how are metrics looking, where is the ecosystem going?

Carlos: January was quite positive. Despite SOL’s price drawdown, RPC and app revenue surged, breaking a five-month streak of declines. We had a couple of volatility events (Jan 31 and Feb 5) where Solana again proved to be the most performant general-purpose chain in production.

We can compare Solana metrics (throughput and median fees) against other EVM chains. Looking ahead, Nice upgrades are coming to Solana: higher block limits. Block limit will increase from 60 million CUs to 100 million, which will increase network capacity and support higher sustained TPS — and that’s even before Alpenlow (hopefully Q3 this year).

Host: We went from ~50M CUs last year to 60M as a tester. Glad to see a meaningful jump to 100M CUs.

Host: On price performance, Sol has been weak vs. BTC for past months but generally in a stronger position than Ethereum from an L1 perspective. The market rewards that with year-to-date price performance. Within the ecosystem there’s been dispersion: tokens inside Solana have shown wide performance differences.

Carlos: A key theme for 2026 is return dispersion across crypto. Some Solana-adjacent projects have been hit hard — notably Metaplex, which has been the worst performer in our index for three consecutive months. That came after POMP added a new instruction to their token-create program that Metaplex previously provided, removing a large income source from Metaplex and repricing that token downward.

POMP performed well in January. Penguin rose from basically zero to $130M in a few days; that kind of price action pulls in new traders and creates a more speculative on-chain environment for a few weeks. POMP saw its highest weekly revenue at the end of January since mid-September (before the Oct 10 crash).

Host: Metaplex’s movement is reminiscent of earlier dynamics (e.g., Pump and Raydium prior to pump AMM). When a single app becomes integral to the microeconomy, if that app builds the functionality internally, infrastructure providers can suffer.

Carlos: Customer concentration risk is a major theme across ecosystems, not just Solana. On Solana we’ve seen that with e.g., Bonk (?) or Bomb (?) where some apps depend heavily on massive-scale apps for revenue. Across other ecosystems you see similar concentration (e.g., Pendle had a big part of its TVL and revenue tied to Athena).

Host: Within Solana you can look at other apps such as Jupiter being a meaningful customer for venues like prop AMMs (proprietary AMMs). If those customers make changes, it’s very meaningful to the microeconomy of application teams.

## Throughput, block limits, protocol upgrades
Carlos: We discussed protocol upgrades and client competition. Higher block limits and other upgrades will be helpful for scaling. There’s also competition between clients and on the block-building side: Jito vs. Temporal/Harmonic vs. Firedancer, etc. I have data on stake changes for these clients.

Host: What happened to Firedancer? A couple years ago the ecosystem was excited about Firedancer. Now it feels like Anza (ANSA) is shipping fast and Jetto/Jito and Harmonic/Temporal are the main actors; Firedancer is out of the main conversation.

Carlos: ANSA was underrated a year or two ago. Firedancer took a long time to release full client functionality. Firedancer is live on mainnet but only has three validators run by the Jump team, so it’s not open for everyone yet. I doubt it gains meaningful stake compared to Jito or Agave in the coming months.

Host: The block-building landscape is interesting. Jito released BAM (Block Assembly Marketplace) in late September — a next-generation processing system that executes transactions inside a TE to deliver privacy and verifiability to Solana’s block building. It resembles Solana protocol proposals with multiple concurrent proposers, aims to add censorship resistance and pre-trade privacy, and provides a more favorable market structure for certain apps (like perps and other exchange-like apps).

## Block-building competition: Jito BAM vs. Harmonic
Carlos: After Jito released BAM, Harmonic (from the Temporal team) released a competing block-building solution, presenting the first credible threat to Jito’s quasi-monopoly on block building. Jito released an IBRL explorer that measures how validators pack blocks and exposes timing games in Solana’s block construction. Solana is a streaming system where validators should pack blocks continuously in 400ms slots, but many validators cluster shreds at the end of a slot, increasing execution variance, jitter, and slot delays.

Harmonic didn’t fare well by Jito’s scoring methodology and disputed the presentation. Both BAM and Harmonic have each gained about 10% of stake in absolute terms in the past month. We’ll see more adoption from both in coming months; the interesting question is who ends up with the majority of stake.

Host: Agave, Harmonic, Agave-Jito — stake might migrate across clients. It’ll be interesting to see if Jetto recaptures stake onto Jito/BAM or if Harmonic captures market share.

Carlos: Harmonic has adoption by some institutional clients (exchanges like Coinbase and Kraken). Jito is focusing on increasing BAM adoption — several governance proposals passed to incentivize BAM adoption by validators. JIP-28 and JIP-31 redirect revenue to validators running BAM (e.g., redirect 100% of revenue in the first two quarters to validators running BAM). If you put incentives in place you’ll see large increases in BAM adoption. Expect a big migration from Agave client to the BAM validator client.

Host: That’s similar to strategies we've seen with DoubleZero — incentives for operators. Jito is doing the same with BAM.

Carlos: Exactly. But remember, BAM is not protocol-enforced; it’s an opt-in client. Today BAM has roughly 20% of stake. From a market maker’s perspective, if 20% of blocks are BAM (favorable structure) and 80% are not, you have inconsistencies: some blocks are good for market making, others require wider spreads because of pick-offs. The long-term optimal solution is protocol-enforced mechanisms to prevent this behavior—otherwise a subset of validators will behave to the detriment of network health for economic gain. Even with high BAM adoption, some validators may still behave adversarially.

Host: There will always be economically motivated actors who pursue profitable behavior. Without protocol-level changes, that activity will continue. In the meantime, builders will keep building custom solutions to bypass public transaction queues.

## Builders bypassing public transaction queue: Prop AMMs, sidechains, and roll-ups
Host: Many teams (Bulk, Bullet, others) aren’t using Jito BAM for advanced maker/taker logic. They’ve built their own things — sidecars, roll-ups, custom execution environments — to get similar behavior as Hyperliquid (Hyperliquid-style) and bypass the public transaction queue.

Carlos: Over the past 12–18 months, Solana-native teams have explored alternatives:

- Off-chain or SBM chains (e.g., Atlas, Fogo) to overcome L1 limitations.
- Exchanges bypassing the public transaction queue (wallet-level solutions and bulk).

BAM and Harmonic offer better options on-chain; after MCP goes live (in 12–18 months), applications may be able to do much of this on the L1. The key question: will it be too late? Will applications have moved too far off-L1 by then?

Host: Ellipsus (Ellipsis?) and Phoenix perps design — some have different architecture. Bulk and Bullet built their own solutions and may not adopt BAM immediately. Path dependence matters: many builders have been building for a while and may not switch back.

Carlos: BAM exists now and can provide better functionality, but it’s not protocol-enforced. With partial adoption, market makers still face inconsistent block-to-block behavior. You can’t rely on “won’t be evil” without protocol enforcement. So protocol changes are the optimal long-term solution.

Host: Until protocol-level changes happen, it’s unsurprising that teams deploy custom solutions.

## Prop AMMs and on-chain profitability (BisonFi, Humidify, Sulfi, Tacera)
Host: Prop AMMs are still a big story. BisonFi has taken off in DEX volume since launch. There are rumors they’re losing money to churn out volume. Do you have a data view?

Carlos: The prop AMM market share changed a lot: Humidify gained traction in July 2025 and hit an all-time high market share in December; BisonFi gained a lot of volume in January.

Volume is a headline metric; for prop AMMs you also need to look at markouts (a measure of adverse selection/profitability). Looking at prop AMM markouts:

- Humidify, Sulfi, and Tacera consistently have positive markouts (directionally profitable).
- BisonFi consistently shows negative markouts on short horizons (e.g., 5-second horizon), indicating toxic flow and likely unprofitability despite search volume.

This data comes from a Dune dashboard by the Solana team. BisonFi’s negative markouts are concerning: they may be getting picked off.

Host: Blockworks data team has been working on revenue/earnings for prop AMMs based on markouts and related data. Big point: big volume doesn't necessarily equal profit.

Host: Interesting observation: on Agave BAM blocks, BisonFi performed relatively well on the 5-second timeslot, whereas Humidify, Sulfi, Tacera are more consistent across clients. Methodology isn’t perfect, but directionally it shows some prop AMMs are profitable and some are being picked off.

Carlos: Yes—methodology isn’t a direct P&L but directionally the story holds. Take headline volume with a grain of salt.

Host: Expect more teams to enter the prop AMM space and to specialize (e.g., pairs other than SOL/USD, tokenized equities). Prop AMMs may dominate for certain asset classes (BTC pair, tokenized equities) where redemption arbitrage exists.

Carlos: I agree. Prop AMMs likely won’t dominate long-tail meme assets, but specialized prop AMMs may capture BTC pairs and tokenized equities.

Host: For meme coins, market makers and bots create similar behavior, but it's a different game from quoting SOL or BTC.

## Metaplex, pump players, and concentration risk
Carlos: Metaplex lost a major revenue source when POMP added a token-create instruction that Metaplex previously provided. That led to repricing. Pump tokens and memecoin dynamics have pulled activity and revenue in specific directions, creating hotspots and customer concentration.

Host: Customer concentration is an ecosystem-level issue. Builders like Bulk, Bullet, etc. will build custom solutions for now because they have to.

## Metad and uncapped ICOs (Huru Pay example)
Host: Metad (Metad?) moves: Huru Pay did an ICO uncapped raise. That’s their first uncapped raise. Previously, capped raises led to whale games (contribute large amounts, get refunded but gain larger allocations). Uncapped raises aim to remove short-term games and pull in patient capital. Thoughts?

Carlos: Uncapped raises are the right choice in principle. Capped raises incentivized whale games and didn’t reflect true funding demand. Uncapped raises remove short-term traders and pull in patient capital, which is what you want for venture-style investment.

However, Huru Pay’s sale happened at a very bad market time (risk-off sentiment and right after Rangers ICO underperformance). That timing hurt their ability to attract the patient capital they needed. If they’d launched earlier (before Oct 10), they might have filled their $3M target.

Lessons going forward for Metad:

- Favor uncapped raises.
- Find a better way to pull in long, patient capital.
- Move to permissionless listings eventually — curating races worked early (build trust), but it doesn’t scale. Metad can’t perform due diligence on every project forever. Permissionless tracks with minimum criteria are needed to scale.

Host: Metad can require minimum criteria (disclosures, team details) even in a permissionless system. They won’t need to deep-dive every team; otherwise bandwidth becomes a bottleneck.

## Pump vs. Metad — distribution and fundraising differences
Host: Pump started by making memecoin launches easy and permissionless. Metad is on the other end (curated, ICO-style). Could Metad compete with Pump? Pump has distribution; Metad offers fundraising structure and legal/treasury protections.

Carlos: Pump has better distribution and capital, but lacks legal structure and on-chain mechanisms to make ICO-style sales safe for users and attractive to serious investors. Metad’s advantages:

- Funds go to a future-controlled treasury (a multisig squad) preventing founders from running away with funds.
- Legal work (with Metal) to ensure IP and other assets are tied to the token, not an equity structure.

If Pump tried to host serious ICO-style sales, they’d face adverse selection and legal/mechanism issues (founders could rug or misbehave).

Host: Pump could offer differentiated token types (e.g., a Metad-like product for serious projects and a memecoin contract for pure memecoins), but their simplicity and single standard is their product strength. Differentiation introduces friction and branding challenges.

Carlos: Also consider ROI for Pump—memecoins generate much more revenue than curated ICO platforms. There’s a tension: distributing resources to serious startups might not provide Pump the same return as memecoin activity. But Pump’s vertical integration (recent acquisitions like Viper) leans into building upstream/downstream services for its core use cases.

Host: Pump’s strategy has been vertical integration (acquiring terminal/trading apps, mobile, etc.). Hackathons are a good way to surface more serious teams on Pump and potentially build a flywheel of higher-quality projects.

Carlos: Waves of activity (memecoins, AI-agent-based memecoin creators) can land in different ecosystems (Solana, Base) depending on where the first app gets traction. Reflexivity means when one coin explodes, many follow.

Host: Good to keep iterating and keep shots on goal.

## Closing / Shoutouts
Host: That’s a wrap. Shoutout: come to DAS March 24–26 in New York City. Use code lightseed200 for $200 off. Many speakers and Blockworks folks will be there. Look out for Solana Policy Institute and Solana Foundation interviews on Lightseed before DAS.

Carlos: There will be important figures adjacent to the Solana ecosystem at DAS as well.

Host: Thanks, Carlos. Catch you next time.

Carlos: Thank you, Danny.

[music]
