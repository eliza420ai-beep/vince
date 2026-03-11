---
tags: [rwa, tokenization, institutional]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Tokenized Private Credit

_Last updated: 2026-02-15_

## The Protocols

**Centrifuge** pioneered the model: real-world assets (invoices, real estate loans, trade receivables) tokenized into NFTs, pooled via Tinlake, and funded by DAI from MakerDAO. The key innovation was tranching — senior tranche holders (DROP tokens) get lower yield but first claim on repayments; junior tranche (TIN) absorbs losses first but earns more. This mirrors traditional structured finance, brought on-chain.

**Maple Finance** took a different approach: undercollateralized lending to institutional borrowers (trading firms, market makers). Pool delegates — vetted credit professionals — assessed borrower creditworthiness and managed pools. Lenders deposited USDC/wETH and earned 8-15% APY. The model worked beautifully in a bull market.

**Goldfinch** targeted emerging market lending — real-world businesses in Africa, Southeast Asia, Latin America. Backers performed due diligence on individual borrower pools, while the Senior Pool automatically allocated capital across all pools. Yields of 17-20% reflected genuine emerging market credit risk, not token ponzinomics.

## The 2022 Reckoning

The bear market exposed every weakness simultaneously:

- **Maple** suffered ~$54M in defaults when Orthogonal Trading and Auros Capital couldn't meet obligations after FTX collapsed. The undercollateralized model meant lenders had no recourse beyond legal proceedings. Pool delegates had approved borrowers based on bull-market assumptions. Maple's realized default rate spiked to ~25% on affected pools, turning headline 10% APY into significant net losses.

- **Centrifuge** fared better structurally — real asset collateral provided some recovery path — but still saw delays and complications when borrowers in emerging markets faced economic stress. The off-chain enforcement problem became clear: tokenizing a loan doesn't make it easier to repossess cargo in Kenya.

- **Goldfinch** experienced defaults on several pools, particularly in emerging markets hit by dollar strength and local economic downturns. The protocol's ~$5M in losses underscored that high yields reflected real credit risk, not free money.

## Key Lessons

**Undercollateralized ≠ uncollectable, but close.** When Maple borrowers defaulted, the recovery process looked identical to traditional unsecured lending — lawyers, negotiations, slow partial recoveries. The blockchain added transparency to the loss, not protection from it.

**Due diligence is the product.** Pool delegates and backers are doing real credit work. When this layer is thin (rubber-stamping borrowers because yields look good), the entire model fails. Maple's post-crisis pivot to requiring overcollateralization for most pools acknowledges this.

**Tranching works but doesn't eliminate risk.** Centrifuge's senior tranches held up better, proving that structured finance principles translate on-chain. But junior tranche holders — often attracted by higher yields without understanding they were the first-loss layer — learned expensive lessons.

**Yield must reflect risk, or it's subsidized.** Protocols offering 15%+ on credit to unrated borrowers were correctly pricing risk. Protocols offering 10% on supposedly "safe" institutional lending were mispricing it, subsidized by token emissions and bull-market optimism.

## Current State (2025-2026)

Post-crisis, the sector matured significantly:

- Maple pivoted toward overcollateralized and transparent institutional lending
- Centrifuge deepened its integration with MakerDAO and Aave, becoming core RWA infrastructure
- New entrants focus on US Treasuries and investment-grade credit — lower yield (4-6%) but drastically lower risk
- Total tokenized private credit TVL recovered and exceeded pre-crash levels, but composition shifted toward higher-quality assets

## Signal Value

When evaluating tokenized credit protocols: compare **stated APY** vs **net realized returns** (after defaults). Track **default rates per pool**, not protocol averages. Watch for **concentration risk** — a few large borrowers failing can destroy an entire pool. And always ask: if this borrower defaults, what is the actual, practical enforcement mechanism?

The 2022 lesson is permanent: on-chain lending to off-chain borrowers inherits all the risks of traditional credit, plus smart contract risk, minus decades of legal infrastructure. Price accordingly.
