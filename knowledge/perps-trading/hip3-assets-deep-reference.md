# HIP-3 Complete Asset Bible — 34 Assets Across 4 DEXs

> Last updated: 2026-02-17
> Last reviewed: 2026-02-17
> Source: targetAssets.ts + Hyperliquid official docs + onchain observation
> Scope: Every HIP-3 asset VINCE tracks, plus Tier 3 sector leaders

---

## Part 1: HIP-3 Protocol Mechanics (Condensed)

HIP-3 enables permissionless builder-deployed perpetuals on Hyperliquid. Key mechanics:

- **Deployer staking**: 500k HYPE required (must maintain 30 days after all perps halted)
- **Margin**: Isolated-only — no cross-margin with native perps or other HIP-3 DEXs
- **Fee structure**: 2x native perp fees. 50% of fees go to deployer, 50% to protocol
- **Growth mode**: New DEXs can temporarily waive deployer fee share to attract liquidity
- **Settlement**: Each DEX settles in its own collateral token (USDC, USDH, etc.)
- **Slashing**: Deployer stake can be slashed for oracle manipulation or malicious contract specs
- **API**: Same Hyperliquid API — just prefix asset with `dex:TICKER`

For full protocol details, see: `perps-deep-reference.md`

---

## Part 2: The Four HIP-3 DEXs

### xyz DEX (USDC settled)

The flagship HIP-3 venue. Stock perpetuals — the most liquid and actively traded HIP-3 DEX.

| Property   | Value                                |
| ---------- | ------------------------------------ |
| Collateral | USDC                                 |
| Assets     | 17 (16 single stocks + XYZ100 index) |
| API format | `xyz:TICKER`                         |
| Focus      | US equity single-name perps          |

Stocks listed: NVDA, TSLA, AAPL, AMZN, GOOGL, META, MSFT, PLTR, COIN, HOOD, MSTR, NFLX, INTC, ORCL, MU, CRCL + XYZ100 index.

### flx DEX (USDH settled)

Commodity perpetuals. **Critical distinction: collateral is USDH, not USDC.** You must hold USDH to trade here — check your balance before placing orders.

| Property   | Value                                      |
| ---------- | ------------------------------------------ |
| Collateral | USDH                                       |
| Assets     | 5                                          |
| API format | `flx:TICKER`                               |
| Focus      | Precious metals, industrial metals, energy |

Assets: GOLD, SILVER, COPPER, NATGAS, OIL.

### vntl DEX

AI/tech pre-IPO hyperps, sector indices, and select stocks. Pre-IPO assets are **hyperps** — no spot oracle, funding based on mark price EMA. This makes them extremely sentiment-driven and prone to funding rate extremes.

| Property   | Value                                             |
| ---------- | ------------------------------------------------- |
| Collateral | (verify current)                                  |
| Assets     | 9                                                 |
| API format | `vntl:TICKER`                                     |
| Focus      | Pre-IPO AI companies, sector indices, tech stocks |

Assets: OPENAI, ANTHROPIC, SPACEX, AMD, SNDK, MAG7, SEMIS, INFOTECH, ROBOT.

### km DEX

Traditional equity indices plus US oil.

| Property   | Value                        |
| ---------- | ---------------------------- |
| Collateral | (verify current)             |
| Assets     | 3                            |
| API format | `km:TICKER`                  |
| Focus      | Broad market indices, energy |

Assets: US500, SMALL2000, USOIL.

---

## Part 3: Every HIP-3 Asset — Deep Profiles

### COMMODITIES (flx DEX, USDH Settled)

---

#### GOLD (flx:GOLD)

**Tracks:** XAU/USD gold spot price

**Why it matters:** Ultimate safe haven asset. $13T+ total market. Central bank reserve asset, inflation hedge, geopolitical fear trade. The oldest store of value in human history.

**Trading context:**

- Inverse correlation with USD strength (DXY). When the dollar weakens, gold rallies — and vice versa
- Positive correlation with negative real rates. When inflation > nominal yields, gold thrives
- Rallies during banking crises, wars, sanctions, de-dollarization narratives
- Currently in a secular bull market driven by central bank accumulation (China, Russia, India all increasing reserves)
- OPEC+ petrodollar recycling into gold is a structural bid

**Crypto correlation:** Often inversely correlated with risk-on crypto — when BTC pumps on risk appetite, gold is flat or down. BUT both rally during monetary debasement fears. The "digital gold vs physical gold" narrative creates occasional co-movement. In a true crisis, gold leads; BTC follows days later (or doesn't).

**Key levels:** All-time highs above $2,700. Round numbers ($2,500, $3,000) are psychological magnets. $3,000 is a massive level that will attract global attention.

**Volatility:** Low compared to crypto. Daily moves of 1-2% are notable. Good for funded positions — carry trade works if funding is favorable. Position sizing can be larger given lower vol.

---

#### SILVER (flx:SILVER)

**Tracks:** XAG/USD silver spot price

**Why it matters:** Dual identity — industrial metal AND monetary metal. Solar panels, electronics, EVs, and medical devices all require silver. Supply is structurally constrained with declining mine output and limited recycling. The silver market is tiny (~$1.5T) compared to gold, making it prone to violent squeezes.

**Trading context:**

- Higher beta than gold: moves 2-3x in percentage terms on the same macro catalyst
- **Gold/silver ratio** is the key metric. Historically ranges 60-80. Ratio >80 = silver historically cheap relative to gold. Ratio <60 = silver relatively expensive
- Industrial demand ties silver to manufacturing PMI and global growth. Solar installation rates are a secular tailwind
- Reddit/WSB "silver squeeze" narratives surface periodically and can cause short-term spikes

**Key signals:** Gold/silver ratio extremes are mean-reverting. When the ratio spikes above 80, going long silver / short gold has historically been a high-probability reversion trade.

**Risk:** More volatile than gold with wider spreads. Liquidity can thin out fast.

---

#### COPPER (flx:COPPER)

**Tracks:** Copper futures price (LME/COMEX)

**Why it matters:** "Dr. Copper" — the metal with a PhD in economics. Copper demand is the single best real-time proxy for global economic health. EVs use 4x more copper than ICE vehicles. AI data centers require massive copper for power infrastructure and wiring. The green energy transition is creating a structural supply-demand imbalance.

**Trading context:**

- China consumes 50%+ of global copper. Chinese PMI, property sector health, and stimulus announcements are primary drivers
- Green energy transition = structural demand increase that won't reverse
- Supply takes 7-10 years to bring online (new mines). Demand is accelerating now. This mismatch is bullish medium-term
- Chilean and Peruvian mine disruptions (strikes, weather, regulation) cause supply shocks

**Macro signal:** Copper rallying = global growth expectations rising. Copper crashing = recession fear. It's one of the most reliable leading indicators. When copper and equities diverge, copper is usually right.

---

#### NATGAS (flx:NATGAS)

**Tracks:** Henry Hub natural gas futures

**Why it matters:** Power generation, heating, petrochemicals, and LNG exports. The most weather-dependent commodity in existence. AI data center power demand is creating a new structural bid.

**Trading context:**

- **Extreme seasonality**: Winter demand spikes (heating season Oct-Mar), summer spikes (cooling/AC demand Jul-Aug)
- US is now the world's largest LNG exporter. European energy security post-Russia drives structural export demand
- EIA weekly storage reports (Thursday 10:30 AM ET) are the primary catalyst — surprises move price 3-5% instantly
- Weather forecasts (2-week ahead) drive speculative positioning. A cold snap forecast in January can move natgas 10%+ in a day

**Volatility:** EXTREME. This is the most volatile commodity by far. 10-20% daily moves happen multiple times per year on weather forecasts or storage surprises. Position size accordingly — this is not gold. Use tight stops or accept massive drawdowns.

**Risk management:** Never size natgas like you'd size a crypto major. Treat it like a memecoin in terms of position sizing.

---

#### OIL (flx:OIL)

**Tracks:** Brent crude oil price (international benchmark)

**Important:** This is Brent, NOT WTI. For WTI, see USOIL on km DEX. Brent is the global pricing benchmark — used by ~80% of world's crude oil contracts.

**Why it matters:** Still the world's most important commodity. Geopolitics, OPEC+ production decisions, and US shale output determine price. Every 10% move in oil flows through to inflation expectations, central bank policy, and consumer spending.

**Trading context:**

- OPEC+ meetings (typically monthly) are the primary catalyst. Production cut/increase decisions move oil 3-5%
- US inventory data: API report (Tuesday), EIA official report (Wednesday 10:30 AM ET)
- Brent-WTI spread indicates relative Atlantic Basin vs US supply dynamics
- Geopolitical risk premium: Middle East tensions (Iran, Houthis, Strait of Hormuz), Russia sanctions
- US Strategic Petroleum Reserve (SPR) releases/refills create supply/demand shifts

**Crypto correlation:** Oil rallies → inflation fears → hawkish Fed → risk-off → bearish crypto. Oil crashes → deflation fears → dovish Fed → risk-on → bullish crypto. It's indirect but consistent.

---

#### USOIL (km:USOIL)

**Tracks:** WTI crude oil (US domestic benchmark)

**DEX:** km (NOT flx). Different collateral requirements.

**Trading context:**

- Same macro drivers as Brent but more sensitive to US-specific data: Cushing, Oklahoma storage levels, US rig count (Baker Hughes, Friday), and domestic refinery utilization
- Typically trades at $2-5 discount to Brent (the "Brent-WTI spread"). When this spread widens, it signals US oversupply or international tightness
- More responsive to US shale production data and pipeline capacity constraints
- Hurricane season (Jun-Nov) can disrupt Gulf Coast refining and move WTI more than Brent

---

### EQUITY INDICES

---

#### XYZ100 (xyz:XYZ100)

**Tracks:** Broad index of the xyz DEX stock universe

**DEX:** xyz (USDC settled)

**Trading context:** Diversified exposure across all xyz-listed stocks. Lower single-stock risk than individual names. Useful for expressing a general view on US tech/growth equities without picking individual winners. Think of it as a concentrated Nasdaq-like basket accessible 24/7 on Hyperliquid.

---

#### US500 (km:US500)

**Tracks:** S&P 500 index

**DEX:** km

**Why it matters:** THE benchmark for US equities and, increasingly, global risk appetite. 500 largest US companies. $45T+ market cap. Every institutional portfolio benchmarks against it. When "the market" moves, this is what people mean.

**Trading context:**

- Macro-driven: Fed decisions (FOMC 8x/year), monthly jobs data (NFP, first Friday), CPI/PPI inflation data, ISM PMI
- Earnings season (Jan, Apr, Jul, Oct) drives 4-6 weeks of elevated volatility per quarter
- **24/7 access on Hyperliquid** vs CME futures market hours — trade S&P reactions to weekend/overnight news before TradFi opens
- Key support/resistance at round numbers (5,000 / 5,500 / 6,000)

**Crypto correlation:** BTC-S&P correlation has been increasing since 2020. Crypto trades as a risk asset in the current regime. US500 dropping 2%+ in a day almost always drags BTC down.

---

#### SMALL2000 (km:SMALL2000)

**Tracks:** Russell 2000 small-cap index

**DEX:** km

**Why it matters:** Small caps are the economic canary. More domestic US exposure (less international revenue), more rate-sensitive (higher leverage, more floating-rate debt), and more cyclical (consumer discretionary, regional banks, industrials).

**Trading context:**

- Outperforms in early recovery and rate-cut cycles — when the Fed pivots, small caps rip first
- Underperforms during recession fears and tight monetary policy (small companies can't refinance cheap)
- Russell/S&P ratio is a key risk appetite indicator

**Alpha signal:** When SMALL2000 leads US500, it signals a broad-based rally (healthy market, rising tide lifting all boats). When US500 leads while SMALL2000 lags, it's mega-cap concentration (fragile, narrow market). This divergence has preceded major corrections historically.

---

#### MAG7 (vntl:MAG7)

**Tracks:** Magnificent 7 basket — AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA

**DEX:** vntl

**Why it matters:** These 7 stocks represent ~30% of S&P 500 market cap. They ARE the market. Concentrated bet on AI spending, cloud growth, digital advertising, and consumer tech dominance.

**Trading context:**

- Earnings from ANY single MAG7 name can move the entire index and broader market
- When MAG7 diverges strongly from US500, it signals either concentration risk (MAG7 leading) or rotation (MAG7 lagging as money moves to small caps/value)
- Trade this when you want big tech exposure without picking a single name
- Quarterly rebalancing of weights matters — NVDA's weight has been increasing rapidly

---

#### SEMIS (vntl:SEMIS)

**Tracks:** Semiconductor sector index (SOX/Philadelphia Semiconductor Index proxy)

**DEX:** vntl

**Why it matters:** Chips are the new oil. The AI revolution runs on GPUs (NVDA), HBM memory (MU, SK Hynix), logic chips (AMD, INTC), and foundry capacity (TSMC). CHIPS Act subsidies ($52B) reshoring production to US. Taiwan/TSMC geopolitical tension is the sector's existential risk.

**Trading context:**

- **Leads the broader market by 3-6 months** — semis are a capex cycle indicator. When semis roll over, the market follows
- NVDA earnings is the single biggest catalyst for the entire sector
- SOX index correlation is tight. Book-to-bill ratios and fab utilization rates are leading indicators
- Memory pricing cycles (DRAM/NAND spot prices) drive MU, SK Hynix portion of the index

---

#### INFOTECH (vntl:INFOTECH)

**Tracks:** Broader information technology sector index

**DEX:** vntl

**Includes:** Software (MSFT, CRM, ADBE), hardware (AAPL), IT services (ACN, IBM), and semiconductors. Wider and more diversified than SEMIS or MAG7.

**Trading context:** Less concentrated than MAG7, broader tech exposure. Good for expressing a general tech bull/bear view without the extreme concentration risk of MAG7. Software names in this index are more sensitive to enterprise spending cycles and interest rates (long-duration assets).

---

#### ROBOT (vntl:ROBOT)

**Tracks:** Robotics and automation index

**DEX:** vntl

**Why it matters:** Tesla Optimus, Figure AI (OpenAI-backed), Boston Dynamics, Fanuc, ABB — the physical AI narrative. Humanoid robots, industrial automation, autonomous warehouses. This is where AI meets the physical world.

**Trading context:**

- Thematic play on labor replacement, manufacturing automation, and the humanoid robot narrative
- Early innings — more narrative-driven than fundamentals-driven at this stage
- Tesla Optimus progress/demos are major catalysts. Figure AI funding rounds. Any major robotics demo that goes viral
- Long-term secular trend: aging populations in developed nations + rising labor costs = automation demand

---

### SINGLE STOCKS (xyz DEX, USDC Settled)

---

#### NVDA (xyz:NVDA)

**Nvidia.** Jensen Huang. $3T+ market cap. The most important company in the AI era.

**The thesis:** Monopoly on AI training and inference hardware. H100/H200/B100/B200 GPUs are the picks-and-shovels of the AI gold rush. CUDA software moat makes switching nearly impossible — the entire ML ecosystem is built on CUDA. Data center revenue is >80% of total and growing.

**Trading context:**

- Earnings are market-wide events. Expect ~10% moves in either direction. The entire AI trade prices off NVDA guidance
- GTC conference (typically March) is a major product catalyst — new chip announcements, roadmap updates
- AI regulation news and US-China export controls directly impact revenue (China was ~25% of data center revenue before restrictions)
- Every hyperscaler (MSFT, GOOGL, META, AMZN) is spending $30-50B/year on NVDA GPUs

**Correlation:** NVDA is the bellwether. When NVDA dumps, ALL AI trades dump — SEMIS, MAG7, AMD, even AI tokens like TAO. When NVDA rips, everything follows. It's the single most important stock for the AI narrative.

---

#### TSLA (xyz:TSLA)

**Tesla.** Elon Musk. The most volatile mega-cap stock in existence.

**The thesis:** Not just an EV company. EV manufacturing + FSD (Full Self-Driving) autonomy + Optimus humanoid robot + Megapack energy storage + Dojo AI supercomputer. The bull case prices in robotaxi revenue ($1T+ TAM). The bear case says it's a car company trading at 80x earnings.

**Trading context:**

- Musk's tweets, politics, and public behavior move TSLA as much as fundamentals
- Quarterly delivery numbers (reported ~first week of each quarter) are binary events
- FSD progress updates, robotaxi timeline, and Optimus demos are catalysts
- Short interest is always elevated — short squeezes are part of the TSLA experience

**Crypto correlation:** TSLA is a proxy for Musk sentiment. Musk sentiment bleeds directly into DOGE and broader crypto meme culture. TSLA dumping on Musk controversy often correlates with DOGE weakness.

---

#### AAPL (xyz:AAPL)

**Apple.** Largest company by market cap. The consumer tech fortress.

**The thesis:** iPhone installed base (2B+ devices) generates recurring Services revenue (App Store, iCloud, Apple TV+, Apple Music, Apple Pay). Services margin is 70%+ vs 35% for hardware. Apple Intelligence AI features are driving an iPhone upgrade supercycle.

**Trading context:**

- Services revenue growth is THE narrative — Wall Street rewards the transition from hardware to recurring revenue
- iPhone launch cycles (September) create predictable volatility. Supply chain checks (from Asian suppliers) leak demand signals
- China demand is critical (~20% of total revenue). Any China-US tension or China consumer weakness hits AAPL disproportionately
- Defensive mega-cap: lower beta than NVDA or TSLA. Flight-to-quality within tech during corrections

---

#### AMZN (xyz:AMZN)

**Amazon.** Andy Jassy (CEO). AWS cloud + e-commerce + advertising + logistics empire.

**The thesis:** AWS is the profit engine (>60% of operating income on ~17% of revenue). E-commerce is the distribution moat. Advertising is the fastest-growing high-margin segment. Amazon is simultaneously the world's largest cloud provider, retailer, and logistics network.

**Trading context:**

- AWS growth rate is THE metric every quarter. Deceleration = sell. Reacceleration = buy
- Prime Day (July) and holiday season (Q4) drive e-commerce revenue beats
- Margin expansion story: Jassy's cost cuts worked — operating margins expanding from 2% to 8%+
- AI through AWS Bedrock (hosting foundational models). Alexa LLM refresh could unlock voice commerce
- AWS competes with Azure (MSFT) and GCP (GOOGL) — cloud market share data from Synergy/Canalys moves all three

---

#### GOOGL (xyz:GOOGL)

**Alphabet.** Search monopoly + YouTube + Google Cloud + Waymo + DeepMind.

**The thesis:** Search ad revenue is still 55%+ of total — the most profitable business model ever created. But the ChatGPT/AI search disruption narrative creates periodic sell-offs. Meanwhile, Gemini AI, Cloud growth acceleration, YouTube ad recovery, and Waymo autonomous driving are underappreciated.

**Trading context:**

- Any "Google Search is dying" narrative (ChatGPT, Perplexity, etc.) creates buying opportunities if you believe the moat holds
- Google Cloud growth rate inflecting higher — AI workloads on GCP
- YouTube is a $40B+ run-rate business. Connected TV ad spend shifting to YouTube
- Waymo autonomous driving: 100k+ paid rides per week. Could be worth $100B+ standalone
- Antitrust ruling risk: DOJ case could force structural remedies (Chrome divestiture, default search changes)

**Valuation:** Cheapest MAG7 name on P/E. If you believe big tech stays dominant, GOOGL is the value play within the group.

---

#### META (xyz:META)

**Meta Platforms.** Mark Zuckerberg. Facebook + Instagram + WhatsApp + Threads + Reality Labs + Llama AI.

**The thesis:** 3.9B+ monthly active users across the family of apps. Digital advertising duopoly with Google. Reels is winning the short-video war against TikTok (especially where TikTok is banned). Llama open-source AI models are building a developer moat. Reality Labs (VR/AR) is a $15B+/year bet on the future.

**Trading context:**

- Digital advertising revenue is the engine. Any macro weakness in ad spend hits META hard
- Reels monetization improving quarter over quarter — closing the gap with feed ads
- AI infrastructure spend ($30B+/year capex) is both a bull case (AI moat) and bear case (overcapitalization)
- Llama model releases drive developer ecosystem narrative
- Reality Labs still burning $15B+/year with no clear path to profitability — bears cite this as value destruction

---

#### MSFT (xyz:MSFT)

**Microsoft.** Satya Nadella. Azure + OpenAI + Copilot + Office/Windows + Gaming.

**The thesis:** Most diversified big tech company. Azure is #2 cloud (gaining on AWS). OpenAI partnership gives exclusive access to GPT models. Copilot integration across Office, GitHub, Windows, and Dynamics creates enterprise AI lock-in. Xbox + Activision Blizzard rounds out gaming.

**Trading context:**

- Azure growth rate is the key metric. Closely watched for AI workload contribution (% of Azure growth from AI)
- OpenAI integration: Copilot everywhere — Office 365 Copilot ($30/user/month), GitHub Copilot, Windows Copilot
- Enterprise AI adoption leader: CIOs trust Microsoft, procurement is easy (existing EA agreements)
- Lower beta than NVDA/TSLA. The "safe" big tech trade. Widows-and-orphans tech stock

---

#### PLTR (xyz:PLTR)

**Palantir.** Peter Thiel + Alex Karp (CEO). Government AI + commercial platform.

**The thesis:** Foundry (commercial) and Gotham (government) platforms for data integration and analysis. AIP (Artificial Intelligence Platform) is the growth catalyst — letting enterprises deploy AI on their own data without building infrastructure. "The AI operating system for government and enterprise."

**Trading context:**

- Government contracts (DoD, CIA, ICE, NHS) are the revenue base. Defense spending tailwinds post-Ukraine, post-Middle East
- AIP commercial growth accelerating — boot camp go-to-market strategy converting enterprises
- High P/E (100x+) — growth is priced in. Any deceleration gets punished hard
- Politically polarizing: government surveillance narrative creates ESG-related selling pressure periodically

---

#### COIN (xyz:COIN)

**Coinbase.** Brian Armstrong. Largest US-regulated crypto exchange.

**The thesis:** Revenue = crypto trading volume × take rate. But Coinbase is diversifying: Base L2 chain (generates sequencer fees), stablecoin revenue (USDC partnership with Circle earns interest on reserves), staking services, and institutional custody (Coinbase Prime).

**Trading context:**

- BTC price directly drives revenue. When BTC pumps, retail FOMO → volume spikes → COIN revenue surges
- Regulatory clarity is a tailwind: won vs SEC on most counts. Stablecoin legislation (if passed) benefits USDC/Coinbase
- Base L2 ecosystem growth creates optionality beyond exchange revenue
- THE crypto equity proxy: when BTC +10%, COIN often +15-25%. Leveraged exposure to crypto volume

---

#### HOOD (xyz:HOOD)

**Robinhood.** Vlad Tenev. Retail trading platform turned fintech.

**The thesis:** Democratized trading for retail. Expanding from equities/options into crypto (listed SOL, AVAX, etc.), retirement accounts (IRA matching), and credit cards. Gold subscription tier ($5/month) driving ARPU growth.

**Trading context:**

- Crypto revenue segment growing as a % of total — more crypto listings = more revenue diversification
- Event-driven: meme stock rallies (GME, AMC) boost engagement and trading volume
- Options trading volume is the bread and butter — track CBOE retail flow data
- Retail sentiment indicator: when HOOD is ripping, retail is back in the market

---

#### MSTR (xyz:MSTR)

**MicroStrategy.** Michael Saylor. The Bitcoin treasury company.

**The thesis:** Software company that pivoted to becoming a Bitcoin accumulation vehicle. Holds 200k+ BTC (~$15B+ at current prices). Issues convertible bonds and equity to buy more BTC. Trades at a premium or discount to its Bitcoin NAV.

**Trading context:**

- MSTR/BTC NAV ratio is the key metric. Premium = market pricing in future BTC acquisitions and Saylor's strategy. Discount = concern about debt load, dilution, or BTC outlook
- Leveraged BTC play: when BTC +5%, MSTR often moves +10-15%. Works both ways — MSTR drawdowns are amplified
- Convertible bond issuances are catalysts (dilution fear short-term, BTC accumulation bullish long-term)
- Saylor's conference calls and Bitcoin evangelism create narrative momentum

**Risk:** If BTC enters a prolonged bear market, MSTR's debt structure becomes concerning. Forced selling of BTC to service debt would be catastrophic.

---

#### NFLX (xyz:NFLX)

**Netflix.** Reed Hastings legacy (now co-chair). Dominant streaming platform.

**The thesis:** 260M+ global subscribers. Ad-supported tier driving incremental growth and ARPU. Password-sharing crackdown successfully converted freeloaders to paid subscribers. Live sports (WWE Raw, NFL Christmas games) expanding TAM.

**Trading context:**

- Subscriber growth + ARPU (average revenue per user) are the key metrics every quarter
- Ad-supported tier is the growth story — advertisers want Netflix's premium audience
- Content spend ($17B+/year) creates high barrier to entry but also high fixed costs
- Live sports strategy (WWE, NFL) de-risks the "content miss" problem — sports always draws viewers

**Crypto correlation:** Least correlated to crypto of any xyz stock. Pure consumer entertainment play. Useful for portfolio diversification within HIP-3.

---

#### INTC (xyz:INTC)

**Intel.** Turnaround story — or cautionary tale.

**The thesis:** Attempting the most ambitious turnaround in semiconductor history. IFS (Intel Foundry Services) aims to manufacture chips for others (competing with TSMC). Meanwhile, losing CPU market share to AMD (EPYC servers) and relevance in AI (no competitive GPU).

**Trading context:**

- Foundry business (IFS) orders are the key catalyst. Any major customer win (MSFT, AMZN) would be transformative
- CHIPS Act subsidies ($8B+ in grants) subsidize the turnaround but don't guarantee success
- New CEO strategy and execution are everything. Each earnings call is a referendum on the turnaround
- AMD continues taking server CPU share quarter after quarter

**Trade thesis:** Contrarian value play if the turnaround works — stock is cheap on book value. Value trap if it doesn't — the moat is gone and competitors are accelerating.

---

#### ORCL (xyz:ORCL)

**Oracle.** Larry Ellison. Database empire reinventing itself as cloud infrastructure.

**The thesis:** OCI (Oracle Cloud Infrastructure) is the fastest-growing cloud. Massive AI data center buildout ($100B+ planned with partners). Strategic partnerships with NVDA and MSFT. Multi-cloud strategy (Oracle database running on Azure/AWS) is unique.

**Trading context:**

- OCI growth rate is the key metric. Consistently above 40% YoY — faster than AWS, Azure, or GCP
- Larry Ellison's AI data center buildout vision: partnering with SoftBank, NVDA, and governments worldwide
- RPO (Remaining Performance Obligations) indicates future revenue — watch for acceleration
- Oracle database is mission-critical for enterprises — sticky revenue base funds the cloud transition

---

#### MU (xyz:MU)

**Micron Technology.** Memory chips — DRAM and NAND flash.

**The thesis:** HBM (High Bandwidth Memory) for AI accelerators is the secular catalyst. NVDA's H100/B200 GPUs need Micron's HBM3E. AI is creating insatiable demand for high-performance memory that only three companies can supply (Micron, Samsung, SK Hynix).

**Trading context:**

- Memory is **cyclical** — the most cyclical sector in semis. Watch DRAM/NAND spot pricing trends and inventory levels
- When memory prices rise: MU prints money, margins expand 30%+, stock rips. When they fall: margins collapse, stock gets cut in half
- HBM is the structural story that may break the cycle — AI demand is less cyclical than consumer electronics
- NVDA's product roadmap directly impacts MU (each new GPU generation needs more HBM)

---

#### CRCL (xyz:CRCL)

**Circle.** Jeremy Allaire (CEO). USDC stablecoin issuer.

**The thesis:** Revenue comes from interest earned on USDC reserves ($30B+ in US Treasuries and cash). As USDC circulation grows and interest rates remain elevated, Circle prints money. IPO'd in 2024. Pure play on stablecoin adoption and the tokenization of the dollar.

**Trading context:**

- USDC circulation is the key metric — directly determines reserve income
- Interest rate sensitivity: higher rates = more revenue. Rate cuts are a headwind
- Stablecoin legislation (US and global) is a structural tailwind — regulatory clarity drives institutional adoption
- DeFi volume on USDC (Uniswap, Aave, etc.) indicates organic demand beyond speculation
- Competition from USDT (Tether), PYUSD (PayPal), and others

---

### PRE-IPO / AI TECH (vntl DEX — HYPERPS)

These assets trade as **hyperps** — perpetual contracts with no spot oracle. Funding is based on mark price EMA, making them extremely sentiment-driven. Funding rates can be extreme during AI hype cycles. Position management requires extra attention to funding costs.

---

#### OPENAI (vntl:OPENAI)

**OpenAI.** Sam Altman. ChatGPT, GPT-4/GPT-5, DALL-E, Sora.

**The thesis:** Most valuable private AI company (~$300B+ valuation). Revenue $10B+ ARR and growing rapidly. ChatGPT has 200M+ weekly active users. Enterprise adoption accelerating. The company that kicked off the AI revolution.

**Trading context:**

- Hyperp — no spot oracle. Funding based on mark price EMA. Extremely sentiment-driven
- Catalysts: New model releases (GPT-5), product launches, enterprise deal announcements, IPO timeline rumors, Microsoft relationship developments, regulatory news
- Funding can be extreme during AI hype cycles — being long when funding is +0.5%/day eats your position
- Sam Altman's public statements, board drama, and structural changes (nonprofit → for-profit transition) all move price

---

#### ANTHROPIC (vntl:ANTHROPIC)

**Anthropic.** Dario & Daniela Amodei. Claude AI. Constitutional AI. Safety-focused.

**The thesis:** The "responsible AI" counterweight to OpenAI. Amazon invested $4B+. Google invested $2B+. Claude models are competitive with GPT-4 for enterprise use cases. Constitutional AI approach resonates with enterprise compliance requirements.

**Trading context:**

- Hyperp. Lower volume than OPENAI — wider spreads, more slippage
- Catalysts: Claude model releases, enterprise adoption metrics, new funding rounds, IPO speculation, Amazon partnership deepening
- Often correlated with OPENAI (both are "AI lab" trades) but with a lag and lower magnitude
- Safety narrative could become a premium if AI regulation tightens — Anthropic positioned as the "compliant" lab

---

#### SPACEX (vntl:SPACEX)

**SpaceX.** Elon Musk. Starlink + Falcon 9 + Starship.

**The thesis:** ~$350B valuation. Starlink satellite internet approaching profitability with 4M+ subscribers globally. Falcon 9 dominates commercial launch market. Starship is the moonshot — if fully reusable super-heavy lift works, it redefines space economics.

**Trading context:**

- Hyperp. Catalysts: Starship test flights (success/failure), Starlink subscriber growth milestones, government contracts (NASA, DoD), IPO rumors (Musk has hinted at spinning out Starlink)
- Correlated with Musk sentiment (also moves TSLA, DOGE)
- Starship milestones are binary events — successful tests can move price 10%+

---

#### AMD (vntl:AMD)

**AMD.** Lisa Su (CEO). MI300X AI GPUs + EPYC server CPUs.

**The thesis:** "The NVDA challenger." MI300X AI accelerator competing for data center AI workloads. EPYC server CPUs steadily taking share from Intel. Xilinx FPGA acquisition adds adaptive computing for edge AI.

**DEX:** vntl (not xyz — important distinction)

**Trading context:**

- AI GPU market share vs NVDA is the key narrative. Any hyperscaler win (META, MSFT adopting MI300X) moves price
- Data center revenue growth rate is the metric to watch
- Rallies when the market wants to diversify AI bets beyond NVDA (especially after NVDA earnings when investors look for "the next AI chip play")
- EPYC server CPU share gains from Intel are the steady, less-hyped revenue driver

---

#### SNDK (vntl:SNDK)

**SanDisk / Western Digital.** Flash storage and SSDs.

**DEX:** vntl

**Trading context:**

- NAND flash pricing cycles drive revenue. When NAND prices rise (tight supply), margins expand
- Enterprise SSD demand for AI data centers (training data storage, inference caching) is the growth narrative
- Smaller and more niche than MU. Lower liquidity on vntl
- Merger/restructuring news (Western Digital split into HDD and flash businesses) is a catalyst

---

## Part 4: Tier 3 Sector Leaders

Native Hyperliquid crypto perps that VINCE monitors. Not HIP-3 — these trade on the core Hyperliquid orderbook with standard margin.

### Privacy

**XMR (Monero)** — Gold standard of privacy coins. Ring signatures, stealth addresses, mandatory privacy. Tracked because privacy demand = crypto adoption signal. Catalyst: exchange delistings (reduce supply on market), regulatory crackdowns (increase demand), darknet volume.

**ZEC (Zcash)** — Optional privacy via zk-SNARKs (shielded transactions). More regulatory-friendly than XMR. Catalyst: Zcash halving cycles, privacy regulation clarity, institutional interest in compliant privacy.

### RWA / Institutional

**ONDO (Ondo Finance)** — Tokenized US Treasuries and real-world assets. Leading the RWA narrative. Catalyst: TradFi partnerships (BlackRock, Franklin Templeton), TVL growth, new product launches (tokenized equities, bonds).

**ENA (Ethena)** — Synthetic dollar protocol (USDe). Generates yield through delta-neutral basis trade (long spot ETH, short perps). Catalyst: USDe adoption in DeFi, sUSDe yield rates, integration into lending protocols (Aave, MakerDAO).

### DeFi

**AAVE (Aave)** — Dominant lending protocol. $10B+ TVL. Catalyst: GHO stablecoin growth, v4 launch, new chain deployments, fee switch activation.

**UNI (Uniswap)** — Largest DEX. $1T+ cumulative volume. Catalyst: Uniswap v4 hooks, fee switch vote, Unichain L2, regulatory clarity on DeFi.

**MORPHO (Morpho)** — Lending optimizer and modular lending protocol. Catalyst: TVL growth, new vault deployments, integration as backend for other protocols.

**PENDLE (Pendle)** — Yield tokenization and trading. Splits yield-bearing assets into principal and yield tokens. Catalyst: New yield market listings, points/airdrop meta (Pendle is the infrastructure), expiry cycles.

**SYRUP (Maple Finance)** — Institutional lending. Undercollateralized loans to crypto-native institutions. Catalyst: Loan book growth, institutional adoption, real yield narrative.

**LINK (Chainlink)** — Oracle infrastructure. Price feeds for all of DeFi + CCIP cross-chain messaging + DECO privacy proofs. Catalyst: CCIP adoption, staking expansion, bank partnerships (SWIFT integration), tokenized asset oracle feeds.

### AI Infrastructure

**FIL (Filecoin)** — Decentralized storage network. Catalyst: AI training data storage demand, enterprise adoption, retrieval market improvements, FVM (Filecoin Virtual Machine) DeFi growth.

**TAO (Bittensor)** — Decentralized AI network. Subnet model for distributed AI training and inference. Catalyst: New subnet launches, model quality improvements, enterprise adoption, NVDA correlation (rises and falls with AI narrative).

### AI Memes

**AIXBT (AI trading bot token)** — AI agent that posts crypto analysis on Twitter/X. Catalyst: engagement metrics, alpha generation reputation, AI agent meta narrative.

**ZEREBRO (AI agent)** — Autonomous AI agent ecosystem. Catalyst: AI agent narrative cycles, new capabilities, community growth.

**FARTCOIN** — The meme. Pure narrative, pure vibes. Catalyst: memecoin rotation cycles, social media virality, community sentiment. Track as a meme sector barometer.

### Solana Ecosystem

**JUP (Jupiter)** — Dominant Solana DEX aggregator. 80%+ of Solana swap volume. Catalyst: New product launches (perps, launchpad), JUP staking, Solana ecosystem growth, fee revenue.

### Base Ecosystem

**AVNT (Avant)** — Base-native DeFi protocol. Catalyst: Base ecosystem growth, TVL, new product features.

**ZORA (Zora)** — NFT/media protocol on Base. Catalyst: Creator adoption, protocol revenue, Base ecosystem growth, NFT market recovery.

### Layer 1

**SUI (Sui)** — Move-based L1 blockchain. Object-centric data model. Catalyst: TVL growth, DeFi ecosystem expansion, gaming/consumer apps, institutional partnerships, Move language adoption vs Aptos.

---

## Part 5: API Reference

### Symbol Format

```
Core perps:  BTC, ETH, SOL, HYPE, etc.
HIP-3:       dex:TICKER
             xyz:NVDA, flx:GOLD, vntl:OPENAI, km:US500
```

### DEX Collateral Matrix

| DEX  | Collateral | Note                                                |
| ---- | ---------- | --------------------------------------------------- |
| xyz  | USDC       | Standard — same as core perps                       |
| flx  | USDH       | **Different stablecoin** — must hold USDH, not USDC |
| vntl | (verify)   | May vary — check before trading                     |
| km   | (verify)   | May vary — check before trading                     |

### HIP-3 Asset Count Summary

| DEX       | Count  | Categories                       |
| --------- | ------ | -------------------------------- |
| xyz       | 17     | 16 stocks + 1 index              |
| flx       | 5      | 5 commodities                    |
| vntl      | 9      | 3 pre-IPO + 2 stocks + 4 indices |
| km        | 3      | 2 indices + 1 commodity          |
| **Total** | **34** |                                  |

### Category Helper Functions

```typescript
isHIP3Asset(symbol: string): boolean
// Returns true for any HIP-3 prefixed symbol

getHIP3Dex(symbol: string): "xyz" | "flx" | "vntl" | "km"
// Extracts DEX identifier from symbol

getHIP3Category(symbol: string): "commodity" | "index" | "stock" | "ai_tech"
// Returns asset category for routing and display

toHIP3ApiSymbol(ticker: string): string
// "NVDA" → "xyz:NVDA" (looks up correct DEX prefix)

normalizeHIP3Symbol(apiSymbol: string): string
// "xyz:NVDA" → "NVDA" (strips DEX prefix)
```

### Complete Asset → DEX Mapping

```
xyz:  NVDA TSLA AAPL AMZN GOOGL META MSFT PLTR COIN HOOD MSTR NFLX INTC ORCL MU CRCL XYZ100
flx:  GOLD SILVER COPPER NATGAS OIL
vntl: OPENAI ANTHROPIC SPACEX AMD SNDK MAG7 SEMIS INFOTECH ROBOT
km:   US500 SMALL2000 USOIL
```
