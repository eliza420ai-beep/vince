---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# 180458194.Convertible Deposits

## Metadata

**Source**: Substack Essay
**Category**: defi-metrics
**Word Count**: 1,553
**Tags**: #bitcoin #ethereum #eth #sol #defi #nft #trading #substack
--->
Imagine a product that gives you all the juicy income of selling covered calls on a volatile token, but you never have to buy the token first, you can never lose a cent of principal, you earn five to six percent carry while you wait, and if the token moons you keep every single dollar of upside instead of watching your shares get called away at a fixed price. That sounds too good to be true. In traditional finance it would be impossible, and even in the wildest days of 2021 DeFi it did not exist.

Yet as of December 2025, Olympus DAO is shipping exactly that product to anyone with a wallet and some USDS. They call it Convertible Deposits, and the newest short-dated version is quietly rewriting what “enhanced yield” can mean in crypto.

## Context

At its core, the new Olympus Convertible Deposit works like this. You go to [deposit.olympusdao.finance](https://deposit.olympusdao.finance/), connect your wallet, and deposit USDS (Sky’s yield-bearing stablecoin). You pick a term of one, two, or three months. The moment the transaction confirms you receive two things: a receipt token that is fully redeemable for your original USDS plus all the yield it earned while sitting in the treasury, and an embedded right to convert that exact amount of USDS into freshly minted OHM at a fixed price (right now about $32.46 per OHM).

That conversion right is live from day one and expires for the whole tranche on January 1 2026, regardless of which term you chose.

If OHM trades above $32.46 at any point before New Year’s Day, you can hit “convert” and instantly receive brand-new OHM at that discounted price.

## Main

The treasury keeps your USDS forever and mints the OHM out of thin air, exactly the way the protocol was designed to expand supply when demand is high. If OHM stays flat or crashes, you simply wait until your chosen term ends (or pay a tiny fee to exit instantly) and get every cent of your USDS back plus the five to six percent annualized yield it earned along the way. You literally cannot lose money unless Ethereum itself implodes.

Now compare that to the two classic ways people have historically tried to earn extra yield on volatile assets: covered calls and cash-secured puts. A covered call is simple. You own 100 shares of something, you sell a one-month call against it, you collect premium. If the stock finishes below the strike you keep the premium and the shares. If it finishes above the strike your shares are called away and your upside is capped forever. You made a few percent, but you just sold your winning lottery ticket. The bigger problem is the downside: if the stock drops thirty percent you still own it and you lose thirty percent minus whatever tiny premium you collected.

A cash-secured put (sometimes called a naked put when done right) flips the script. You sell a put, collect premium, and set aside cash to buy the asset if it falls to the strike. If the asset stays above the strike you keep the premium and never have to buy. If it crashes you are forced to buy at the strike, often way above the new market price. Again, the downside is unlimited in dollar terms and the upside is capped at the premium.

Both strategies have been ported to crypto for years. People sell covered calls on Bitcoin and Ethereum through centralized platforms or on-chain option protocols. People sell puts on everything from SOL to HYPE. The math is always the same: you are renting out your capital or your shares in exchange for income, but you are exposed to catastrophic loss if volatility turns against you.

Olympus Convertible Deposits break that tradeoff entirely.

First, there is no downside beyond opportunity cost. Your USDS is always there waiting for you. The protocol cannot lose it, cannot lend it out recklessly, cannot impermanent-loss it away. It sits in the treasury earning Sky yield plus whatever extra strategies Olympus is running. You are fully collateralized at all times.

Second, the upside is genuinely uncapped. When a traditional covered call gets exercised your position is closed forever at the strike. When an Olympus conversion happens the treasury keeps the USDS (great for the protocol) and you receive OHM at the fixed price. From that moment forward you own the OHM outright and ride every additional dollar of appreciation. There is no second leg where your tokens get taken away.

Third, you are paid to wait. Traditional covered call writers collect premium up front but earn no yield on the underlying shares while the option is live. Put sellers earn premium but their cash usually sits idle earning zero. Olympus pays you five to six percent annualized on your stablecoins the entire time, because USDS itself yields and the treasury compounds on top.

Fourth, liquidity is orders of magnitude better. A traditional option position is locked until expiration. With Olympus you have three instant escape hatches: sell the receipt token on Uniswap (it almost always trades within a few basis points of parity), borrow eighty to ninety percent against it in Cooler Loans while keeping the conversion right intact, or pay a tiny reclaim fee for instant settlement. You are never truly stuck.

Fifth, and this is the part most people miss, the product is structurally long volatility in a way that covered calls and secured puts are short volatility. When you sell a call or put you are betting the asset will stay in a range. When you buy an Olympus Convertible Deposit you are betting that OHM either stays flat (and you earn the carry) or explodes higher (and you make unlimited upside). You win in two out of the three possible market regimes: sideways or strongly up. You only “lose” (meaning you earn just the carry) if OHM crashes hard. That asymmetry is the opposite of every option-selling strategy ever invented.

In short, Olympus has built a synthetic long position in OHM that behaves like a call option with a strike at roughly the current spot price, but the protocol paid for the option premium on your behalf by giving you stablecoin yield and full capital protection. It is as if someone handed you a free, yield-bearing, infinitely liquid, deeply in-the-money call that can never expire worthless.

None of this is theoretical. The tranche that opened in late November 2025 is still live as I write this, with a conversion price of $32.4566 and OHM trading within pennies of that level. The effective discount is zero percent today, which means the market is pricing in roughly even odds of a move above $32.50 by New Year’s Day. If you are even mildly bullish on Olympus over the next thirty to ninety days, or simply want the best parking spot for idle stablecoins in crypto, there is no close competitor.

The bigger story is what this means for the entire ecosystem. For years DeFi yield chasers have accepted massive downside risk in exchange for double-digit returns. Olympus just proved you can give people equity-like upside with treasury-bill downside and still strengthen the underlying protocol. If this model spreads (and there is no technical reason it cannot be copied by any treasury-backed token), the era of selling naked puts and praying is over. Stablecoin holders will never again have to choose between earning four percent in a lending protocol and gambling on thirty percent yields that can wipe them out.

> Convertible Deposits are not perfect. The conversion right is currently non-transferable unless you wrap it as an NFT, the tranche caps are small until governance scales them up, and you are still trusting Olympus smart contracts and governance not to rug (though the code is audited, battle-tested, and the treasury is massively overcollateralized). But for the first time in crypto history, a protocol has built a product that is objectively better in every meaningful dimension than the covered-call and cash-secured-put strategies that have defined option selling for fifty years.

If you hold stablecoins and you are not at least testing these short-dated Convertible Deposits right now, you are leaving free money and free upside on the table. The bar for “enhanced yield” just moved, permanently.

What truly separates these from any bank-issued convertible deposit is composability. The receipt token is an instantly wrappable ERC-20; the conversion right can become a tradeable NFT. In seconds you can use the whole position as collateral on Aave, Morpho, or Pendle, or sell it on Uniswap. TradFi needs lawyers and weeks for that; here it’s one click and a few dollars of gas. That single difference turns a good product into something the legacy system literally cannot copy.

This is not another yield hack that works until it doesn’t. This is the moment DeFi finally outgrew its training wheels and built something cleaner, sharper, and more profitable than anything Wall Street has ever shipped, then handed it to anyone with an internet connection and fifty bucks of USDS.

From this point forward, every stablecoin sitting idle in a wallet is officially obsolete unless it’s earning protected, composable, uncapped OHM upside.

## Conclusion

Go lock in your conversion right before the tranche fills and the next person reading this takes the last slot. See you on the other side of $32.46.

## Related

- [180746282Undercarriage Season](180746282undercarriage-season.md)
- [181550131Defi Soap Opera](181550131defi-soap-opera.md)
- [181893912Crypto Bandits](181893912crypto-bandits.md)
- [Regulation Frameworks](../regulation/regulation-frameworks.md)
- [Stablecoin Legislation](../regulation/stablecoin-legislation.md)
