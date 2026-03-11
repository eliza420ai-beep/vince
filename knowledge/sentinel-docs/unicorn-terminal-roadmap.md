# VINCE: Unicorn Terminal Roadmap

**Document Owner:** Sentinel (CTO)
**Last Updated:** 2026-02-17
**Status:** Living document — update as milestones hit
**Classification:** Internal strategic reference

---

## 1. Vision: The Bloomberg of Onchain Finance

Bloomberg Terminal generates $12B+/year in revenue. ~325,000 subscribers pay ~$24,000/year each for a data terminal that was revolutionary in 1982 and has barely changed since. It's a command-line interface with real-time data, news, and analytics. That's it.

We're building what Bloomberg would be if it were invented today:

- **AI-native** — not a data display with an AI chatbot bolted on. Every interaction is agent-mediated. The terminal thinks, not just shows.
- **Onchain-first** — native to Hyperliquid perps, HIP-3 stocks/commodities/indices, Hypersurface options, DeFi protocols. Not an adapter layer over TradFi rails.
- **Lifestyle-integrated** — Bloomberg serves one dimension of its users' lives. We serve the whole person. Kelly handles wine, travel, culture. Because the best traders aren't one-dimensional.
- **Open-source core** — Bloomberg's moat is proprietary lock-in. Ours is network effects and compounding intelligence.

### The Multi-Agent Terminal Model

Each of our 11 agents maps to what would be a separate Bloomberg module:

| Agent    | Role                          | Bloomberg Equivalent               |
| -------- | ----------------------------- | ---------------------------------- |
| Eliza    | CEO / Orchestrator            | Bloomberg Terminal itself          |
| VINCE    | CDO / Data Intelligence       | Bloomberg Data License             |
| Solus    | CFO / Options & Risk          | Bloomberg MARS / Options Pricing   |
| Otaku    | COO / DeFi Operations         | Bloomberg PORT (Portfolio)         |
| Kelly    | CVO / Lifestyle               | No equivalent (our differentiator) |
| Sentinel | CTO / Technical Strategy      | Bloomberg BSYS (Systems)           |
| ECHO     | CSO / X Sentiment             | Bloomberg News / Social Sentiment  |
| Clawterm | AI Terminal Interface         | Bloomberg Command Line             |
| Oracle   | Prediction Markets            | Bloomberg FORE (Forecasts)         |
| Naval    | Philosophy / First Principles | No equivalent (our differentiator) |

The difference: Bloomberg modules don't talk to each other intelligently. Our agents do. ECHO picks up sentiment shift → VINCE correlates with onchain data → Solus prices the options play → Otaku checks DeFi liquidity → the ALOHA report synthesizes it all into one actionable thesis. That's not a terminal. That's a team.

### The Math

Bloomberg: $24K/year × 325K users = ~$12B revenue, ~$6B profit. $60B+ valuation.

If we capture 1% of that market at 10% of the price:

- 3,250 users × $2,400/year = $7.8M ARR
- At 20x revenue multiple (SaaS + AI premium) = $156M valuation

If we capture the _new_ market Bloomberg can't serve (onchain-native traders, DeFi operators, crypto funds):

- 50,000 users × $1,800/year average = $90M ARR
- At 20x = $1.8B valuation

The onchain finance TAM is growing faster than any market Bloomberg serves. Hyperliquid alone does $10B+ daily volume. The terminal for this market doesn't exist yet.

---

## 2. What We Already Have (Honest Assessment)

### Strengths

**Multi-agent architecture is genuinely novel.**
No one else has 11 specialized agents with real A2A (agent-to-agent) communication running on ElizaOS v2.8. This isn't a gimmick — each agent has deep domain knowledge (800+ knowledge files total) and they coordinate through structured standups and cross-references. The morning standup where agents brief each other is something no competitor can replicate without rebuilding from scratch.

**Paper bot ML loop is real.**
Signals → trades → feature extraction → ONNX model training → retraining. Four models running: gradient boosting, random forest, neural net, ensemble. 50+ features extracted from 20+ signal sources. This is a genuine self-improving system, not a static strategy. Every trade makes the next trade smarter. The Renaissance Fund parallel isn't just marketing — it's architecture.

**Knowledge base depth is a compounding moat.**
800+ knowledge files across all domains. Each file makes every agent smarter. This compounds — a new knowledge file about Hyperliquid funding rates improves VINCE's data analysis, Solus's options pricing, Otaku's DeFi routing, and the ALOHA report simultaneously. Competitors would need months to build equivalent depth.

**Hyperliquid integration covers the full stack.**
Native perps trading (the core of Hyperliquid's $10B+ daily volume) PLUS HIP-3 onchain stocks, commodities, and indices. This means we can trade AAPL, gold, and BTC perps from the same terminal. No competitor covers this range onchain.

**Hypersurface options are live.**
Actual DeFi options strategy execution — covered calls, secured puts. Options are the highest-margin product in finance. Having this integrated from day one while competitors are still figuring out spot trading is a genuine edge.

**Kelly lifestyle agent has no competitor equivalent.**
Wine recommendations, travel planning, cultural curation — integrated into the same terminal that does your trading. This sounds frivolous until you realize Bloomberg's most loyal users stay because of BCOM (Bloomberg Communities) — the social/lifestyle layer. We're building that natively.

**OpenClaw multi-channel presence.**
WhatsApp, Telegram, Discord, web — same agents, same intelligence, everywhere the user already is. No separate app to download. This dramatically lowers the barrier to first value.

**Renaissance Fund 3.0 narrative resonates.**
V3.0's autonomous belief-router — turning any narrative into the single highest-edge trade expression — is compelling to sophisticated traders. It's not "AI picks stocks." It's "AI synthesizes macro, sentiment, onchain data, and options flow into one thesis, then expresses it through the optimal instrument." That's what quant funds do with 200-person teams.

### Weaknesses (Be Honest)

**No live trading yet.**
Paper only. This is the single biggest credibility gap. Sophisticated users will ask "what's your live track record?" and we don't have one. The paper bot's ML loop is real, but paper ≠ real. Slippage, liquidity, execution timing — all untested in production.

**No revenue, no users beyond the team.**
Zero external validation. We've built something impressive in isolation, but product-market fit is unproven. The danger: we're optimizing for what we think is cool, not what users will pay for.

**Frontend needs work.**
The terminal interface exists but isn't ready for users who aren't developers. Onboarding is nonexistent. A new user would be lost. This is the #1 blocker to public beta.

**ML models are data-starved.**
90+ paper trades is thin. The models work, but confidence intervals are wide. We need 500+ trades minimum for reliable signal, 2000+ for robust backtesting. At current paper trading velocity, this takes months.

**Signal sources require paid API keys.**
Many of our 20+ signal sources need API subscriptions. Scaling means scaling API costs. Some sources (Bloomberg itself, Refinitiv) are expensive. Need to prioritize free/cheap sources and build proprietary ones.

**No mobile app.**
OpenClaw nodes provide some mobile capability, but there's no dedicated iOS/Android experience. For a terminal product, mobile is table stakes. Push notifications for ALOHA and trade alerts are critical.

**Documentation is scattered.**
800+ knowledge files is a strength for agents but a weakness for humans. No clear getting-started guide, no architecture overview, no API docs. Contributors can't onboard.

**ElizaOS dependency.**
We're built on ElizaOS v2.8. Upstream breaking changes can cascade. We've mitigated this with deep knowledge files, but the risk remains. Need a strategy for graceful upstream divergence if necessary.

---

## 3. The Path to Unicorn ($1B+ Valuation)

### Phase 1: Product-Market Fit (Months 0–6)

**Objective:** Get 100 active users. Learn what they actually want.

**The One Killer Use Case:**
"AI that tells you what to trade today and why."

Not 11 agents. Not ML loops. Not knowledge files. One sentence: every morning, you get a push notification with today's highest-conviction trade thesis, the reasoning behind it, and the exact instrument to express it. That's ALOHA as a product.

**What ships in public beta:**

1. ALOHA daily report — push notification/email, one thesis per day
2. Paper bot dashboard — see the ML bot's trades, P&L, confidence scores
3. X sentiment feed — ECHO's real-time read on crypto Twitter
4. Chat with agents — ask VINCE about data, Solus about options, Kelly about dinner
5. Basic onboarding — sign up, pick your interests, get your first ALOHA in 60 seconds

**What doesn't ship yet:**

- Live trading (too risky without more data)
- Agent customization (complexity kills adoption)
- Marketplace (no supply-side yet)
- Mobile app (web-first, OpenClaw for mobile access)

**Pricing:**

- Free tier: ALOHA daily report (delayed 4 hours), basic chat
- Paid tier ($49/mo): Real-time ALOHA, full paper bot, all agents, X sentiment
- No institutional tier yet (premature)

**Success metrics:**

- 100 daily active users by month 6
- 40%+ ALOHA open rate
- 10%+ free-to-paid conversion
- NPS > 40

**What we learn:**

- Do users want daily thesis or real-time alerts?
- Which agents do they actually talk to?
- Is paper bot performance compelling enough to retain?
- What's the killer feature we haven't built yet?

### Phase 2: Revenue (Months 6–12)

**Objective:** $1.8M ARR. Prove the business model.

**Subscription tiers (refined from Phase 1 learnings):**

| Tier          | Price   | Features                                                                   |
| ------------- | ------- | -------------------------------------------------------------------------- |
| Basic         | $49/mo  | ALOHA daily, X sentiment, basic signals, 2 agents                          |
| Pro           | $149/mo | Full paper bot + ML, options strategy, HIP-3, all 11 agents, custom alerts |
| Institutional | $499/mo | API access, custom agents, white-label, priority support                   |

**Revenue math:**

- 500 Basic × $49 = $24,500/mo
- 400 Pro × $149 = $59,600/mo
- 100 Institutional × $499 = $49,900/mo
- Total: ~$134K/mo = **$1.6M ARR**

Round up with annual plans and overages → $1.8M ARR target.

**Key builds:**

- Stripe billing integration
- Usage metering (API calls, agent interactions)
- Knowledge access control (premium files for paid tiers)
- Paper bot visual dashboard (the "wow" factor for conversion)
- Referral program (each user brings 1.5 more)

**Growth channels:**

- Crypto Twitter / X (ECHO's domain — use it)
- Discord community (already have OpenClaw integration)
- Content marketing: publish ALOHA-style analysis publicly (teaser for paid)
- Partnerships: Hyperliquid ecosystem, ElizaOS community

### Phase 3: Scale (Months 12–24)

**Objective:** 10,000 paying users. $10M+ ARR. Series A territory.

**Live trading graduation.**
This is the moment. Paper bot has 6+ months of data, models are trained on 1000+ trades, risk controls are battle-tested. Graduated rollout:

1. Live trading with $100 max position size
2. Increase limits based on performance
3. User-configurable risk parameters
4. Full portfolio management

**Mobile app.**
iOS and Android. Not a wrapper — a native experience optimized for:

- Morning ALOHA push notification
- One-tap trade execution (when live)
- Agent chat on the go
- Portfolio P&L at a glance

**Social layer.**

- Share your ALOHA thesis (anonymized performance)
- Follow top-performing agent configurations
- Community strategies with transparent track records
- Leaderboards (paper and live, separate)

**Marketplace v1.**

- Custom knowledge packs (domain expertise for sale)
- Signal configurations (share your edge, or sell it)
- Agent personality configs (your version of VINCE)

**International.**

- Multi-language knowledge files (agents respond in user's language)
- Region-specific signal sources
- Timezone-aware ALOHA delivery

### Phase 4: Platform (Months 24–36)

**Objective:** 50,000+ users. $50M+ ARR. Unicorn territory.

**Open platform for third-party developers.**
Anyone can build an agent that plugs into the VINCE terminal. The agent marketplace is our App Store moment. Revenue share: 70/30 (developer/platform).

**Institutional grade.**

- Compliance: audit trails, trade reporting, regulatory frameworks
- Risk management: firm-wide position limits, exposure monitoring
- Multi-user: team accounts, role-based access
- White-label: hedge funds run VINCE under their own brand

**Fund management.**

- Community-managed funds using agent strategies
- Multi-sig execution (no single point of failure)
- Transparent performance with onchain verification
- Token-gated access to top-performing funds

**The endgame:**
VINCE becomes the operating system for onchain finance. Not just a terminal — a platform where agents, strategies, knowledge, and capital flow. Every new user makes the platform smarter. Every new agent makes every user more capable. Network effects compound.

---

## 4. Technical Priorities (Impact-Scored)

Each item scored on: Impact (how much it moves the needle) × Urgency (how soon it matters) × Feasibility (can we actually do it now).

### P0: Ship or Die

These block everything. Nothing else matters until these are done.

**1. Public beta launch**

- Impact: 10/10 | Urgency: 10/10 | Feasibility: 7/10
- Clean up the frontend. Build an onboarding flow that gets a new user to their first ALOHA in under 60 seconds. Write basic docs (not 800 knowledge files — a simple getting-started guide).
- Owner: Sentinel + Eliza
- Dependencies: Items 2, 3, 4
- Definition of done: A non-technical person can sign up and get value in their first session.

**2. User authentication**

- Impact: 9/10 | Urgency: 10/10 | Feasibility: 8/10
- Supabase auth. Email/password + wallet connect. User accounts with profile, preferences, subscription tier. Session management.
- Owner: Sentinel
- Dependencies: None (can start immediately)
- Definition of done: Users can sign up, log in, and have persistent preferences.

**3. Hosted deployment**

- Impact: 9/10 | Urgency: 10/10 | Feasibility: 6/10
- Users cannot be expected to self-host ElizaOS. We need cloud deployment — likely Railway, Fly.io, or custom k8s. Multi-tenant architecture where each user gets agent access without running their own instance.
- Owner: Sentinel
- Dependencies: Auth (item 2)
- Definition of done: Users access VINCE via a URL, not a GitHub clone.

**4. ALOHA as a product**

- Impact: 10/10 | Urgency: 9/10 | Feasibility: 8/10
- The daily ALOHA report is our single most compelling feature. Make it a standalone product: push notification, email digest, web dashboard. One thesis per day with full reasoning chain. Track engagement metrics.
- Owner: VINCE + ECHO + Solus (content), Sentinel (delivery)
- Dependencies: Auth (item 2), Hosting (item 3)
- Definition of done: Users receive daily ALOHA via their preferred channel with open/click tracking.

### P1: Revenue Enablers

These turn users into paying customers. Start building in parallel with P0.

**5. Stripe integration**

- Impact: 9/10 | Urgency: 8/10 | Feasibility: 9/10
- Subscription billing. Three tiers. Annual discount. Upgrade/downgrade flow. Webhook handling for failed payments. Stripe is well-documented; this is straightforward.
- Owner: Sentinel
- Dependencies: Auth (item 2)

**6. Usage metering**

- Impact: 7/10 | Urgency: 7/10 | Feasibility: 7/10
- Track per-user: API calls, agent interactions, knowledge file accesses, paper bot trades. This data drives pricing decisions and identifies power users for upsell.
- Owner: Sentinel
- Dependencies: Auth (item 2)

**7. Knowledge access control**

- Impact: 7/10 | Urgency: 7/10 | Feasibility: 6/10
- Premium knowledge files gated by subscription tier. Free users get general knowledge; paid users get deep domain files (options strategies, HIP-3 analysis, etc.). This is our content paywall.
- Owner: Sentinel + VINCE
- Dependencies: Auth (item 2), Stripe (item 5)

**8. Paper bot dashboard**

- Impact: 8/10 | Urgency: 8/10 | Feasibility: 7/10
- Visual P&L chart. Trade history with entry/exit reasoning. ML confidence scores per trade. Feature importance visualization. This is the "proof" that the ML loop works — users need to see it to believe it.
- Owner: Sentinel + VINCE
- Dependencies: Hosting (item 3)

### P2: Competitive Moats

These create defensibility. Start after P1 is underway.

**9. Live trading graduation**

- Impact: 10/10 | Urgency: 6/10 | Feasibility: 5/10
- Paper → real with configurable risk limits. Graduated rollout: micro positions first, scale with confidence. Requires: exchange API integration hardening, slippage handling, position size management, kill switches.
- Owner: Sentinel + Solus + Otaku
- Dependencies: Paper bot dashboard (item 8), sufficient training data (500+ trades)
- Risk: This is where real money is at stake. Triple-check everything. Audit the execution path.

**10. Mobile push notifications**

- Impact: 8/10 | Urgency: 7/10 | Feasibility: 7/10
- ALOHA and trade alerts via OpenClaw to phone. Morning thesis, intraday alerts for high-conviction signals, end-of-day recap. Push is the engagement driver — email gets ignored, push gets opened.
- Owner: Sentinel
- Dependencies: ALOHA product (item 4)

**11. Social layer**

- Impact: 7/10 | Urgency: 5/10 | Feasibility: 6/10
- Share strategies, compare performance, follow top traders' agent configs. This creates network effects — users stay because other users are there. Start simple: public paper bot leaderboard.
- Owner: Sentinel + Eliza
- Dependencies: Auth (item 2), Paper bot dashboard (item 8)

**12. Agent customization**

- Impact: 7/10 | Urgency: 5/10 | Feasibility: 5/10
- Users configure their own agent personality, focus areas, risk tolerance. "Make VINCE more aggressive" or "Make Solus focus on weekly options only." This is the personalization play — every user's terminal is unique.
- Owner: Sentinel + all agents
- Dependencies: Auth (item 2), Usage metering (item 6)

### P3: Platform Play

These are the endgame. Don't build until Phase 3+.

**13. Agent marketplace**

- Impact: 9/10 | Urgency: 3/10 | Feasibility: 4/10
- Third-party developers create and sell agents. Revenue share model. Agent certification/review process. SDK and documentation for agent developers.
- Dependencies: Agent customization (item 12), significant user base

**14. Knowledge marketplace**

- Impact: 7/10 | Urgency: 3/10 | Feasibility: 5/10
- Buy/sell domain expertise packs. A macro analyst sells their knowledge files. A DeFi researcher packages protocol deep-dives. Content creators monetize expertise.
- Dependencies: Knowledge access control (item 7), significant user base

**15. API for institutions**

- Impact: 8/10 | Urgency: 3/10 | Feasibility: 6/10
- White-label VINCE for hedge funds and trading desks. Custom integrations. SLA guarantees. This is where $499/mo becomes $5,000/mo.
- Dependencies: Live trading (item 9), compliance framework

**16. Fund tooling**

- Impact: 8/10 | Urgency: 2/10 | Feasibility: 3/10
- Multi-sig execution. Community fund management. Onchain performance verification. Regulatory compliance. This is the most complex and highest-stakes feature.
- Dependencies: Everything above

---

## 5. Competitive Landscape

### Direct Competitors

| Competitor          | What They Do               | Their Strength                           | Our Edge                                         |
| ------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Bloomberg Terminal  | Data + news + analytics    | 40 years of data, regulatory moat, habit | AI-native, onchain, 100x cheaper, lifestyle      |
| TradingView         | Charts + social trading    | 50M+ users, great UX, Pine Script        | Multi-agent AI, not just charts, execution       |
| Dune Analytics      | Onchain SQL dashboards     | Developer love, open queries             | Push not pull, AI interpretation, no SQL needed  |
| Nansen              | Onchain wallet analytics   | Smart money tracking, labels             | Broader coverage (lifestyle, options, macro)     |
| Arkham Intelligence | Onchain entity tracking    | Entity resolution, investigative         | Multi-agent, actionable not just investigative   |
| Copin               | Copy trading aggregator    | Simple UX, proven model                  | AI-generated strategies, not just copying humans |
| Kaito               | AI crypto research         | Strong NLP, good data sources            | Multi-agent execution, not just research papers  |
| DeFiLlama           | DeFi TVL and protocol data | Comprehensive, free, trusted             | AI layer on top, actionable not just data        |

### Indirect Competitors

| Competitor                    | Threat Level | Notes                                        |
| ----------------------------- | ------------ | -------------------------------------------- |
| ChatGPT / Claude with plugins | Medium       | General purpose, not specialized for trading |
| Perplexity Finance            | Medium       | Good at research, can't execute              |
| Telegram trading bots         | High         | Already have users, simple UX, but dumb      |
| Jupiter / Raydium frontends   | Low          | DEX-specific, not terminal                   |
| Custom quant setups           | Low          | High barrier, not productized                |

### Our Unique Moat

**No one else has all four:**

1. **AI agents** — not chatbots, specialized agents with deep domain knowledge and A2A communication
2. **Onchain execution** — native to Hyperliquid, HIP-3, Hypersurface options
3. **Lifestyle integration** — Kelly handles the whole person, not just the trader
4. **Self-improving ML loop** — every trade makes the next trade smarter

Competitors can copy one or two. Copying all four requires rebuilding from scratch — and they'd still be years behind on knowledge base depth.

### Defensibility Timeline

- **Months 0-6:** Knowledge base + agent quality (soft moat)
- **Months 6-12:** User data + ML training (data moat)
- **Months 12-24:** Network effects from social layer (network moat)
- **Months 24-36:** Third-party ecosystem (platform moat)

Each phase builds on the last. By Phase 4, the moat is the ecosystem itself.

---

## 6. Fundraising Narrative

### The Pitch (60 seconds)

"We're building the AI-native Bloomberg Terminal for onchain finance.

Bloomberg makes $12 billion a year selling data terminals. But Bloomberg was built in 1982. It's a dumb screen that shows you data and waits for you to figure out what to do with it.

We built a team of 11 AI agents that work together. One reads X sentiment. One analyzes options flow. One tracks DeFi protocols. One handles your wine and travel. Every morning, they brief each other, synthesize everything, and send you one message: here's what to trade today, here's why, here's the exact instrument.

Behind that is a self-improving ML loop — 4 models processing 50+ features from 20+ signal sources. Every trade makes the next trade smarter. We're applying Renaissance Technologies' approach to onchain markets.

Version 3.0 turns any market narrative into the single highest-edge trade expression. Bull case for AI? Here's the options play. China tariffs? Here's the commodity hedge. It's not a chatbot — it's a portfolio manager.

Hyperliquid does $10 billion in daily volume. HIP-3 is bringing stocks and commodities onchain. Options are coming with HIP-4. The terminal for this market doesn't exist yet. We're building it."

### For VCs — What They Want to Hear

**Market size:** Onchain finance TAM growing 40%+ annually. Bloomberg's $12B revenue is the comp. We need 0.1% of that to be a $100M business.

**Why now:**

- Hyperliquid's volume explosion proves onchain perps PMF
- HIP-3 bringing TradFi assets onchain (stocks, commodities, indices)
- HIP-4 / Hypersurface bringing options onchain
- AI agent frameworks (ElizaOS, OpenClaw) mature enough for production
- Bloomberg hasn't meaningfully innovated in a decade
- No one has built the multi-agent terminal yet

**Team:** 11 specialized AI agents, each with deep domain knowledge. Open-source community. Built on proven infrastructure (ElizaOS v2.8, Hyperliquid, OpenClaw).

**Traction:** 800+ knowledge files. Self-improving ML loop with 4 models. Paper bot with real P&L tracking. Multi-channel presence (Discord, Telegram, WhatsApp, web).

**Ask:** Seed round to fund hosted deployment, API costs, and 6 months of runway to reach 1,000 paying users.

### Key Metrics to Track (Pre-Revenue)

| Metric                      | Why It Matters     | Target (Month 6) |
| --------------------------- | ------------------ | ---------------- |
| Daily Active Users          | Core engagement    | 100              |
| ALOHA open rate             | Content quality    | 40%+             |
| Paper bot Sharpe ratio      | Strategy quality   | > 1.5            |
| Paper bot win rate          | Strategy quality   | > 55%            |
| Knowledge files created/day | Platform vitality  | 5+               |
| Agent interactions/user/day | Stickiness         | 3+               |
| Time to first value         | Onboarding quality | < 60 seconds     |
| Free → Paid conversion      | Business model     | 10%+             |
| Monthly churn               | Retention          | < 5%             |

### Key Metrics to Track (Post-Revenue)

| Metric                | Target (Month 12) | Target (Month 24) |
| --------------------- | ----------------- | ----------------- |
| MRR                   | $150K             | $800K+            |
| Paying users          | 1,000             | 10,000            |
| Net revenue retention | 110%+             | 120%+             |
| CAC payback period    | < 3 months        | < 2 months        |
| LTV:CAC ratio         | > 3:1             | > 5:1             |

---

## 7. Culture & Team Philosophy

### Core Principles

**"One team, one dream."**
Agents work together, not in silos. ECHO's sentiment analysis improves VINCE's data quality. Solus's options pricing uses Oracle's prediction markets. Kelly's lifestyle recommendations consider Otaku's DeFi positions (don't suggest an expensive dinner the day you're max leveraged). The whole is greater than the sum of its parts.

**"Push, not pull."**
Bloomberg waits for you to type a command. We push intelligence to you. ALOHA arrives before you ask. Trade alerts fire when the ML model sees signal. Kelly suggests dinner when your portfolio is up. The terminal is proactive, not reactive.

**"No hype. No shilling. No timing the market."**
Substance over noise. Every claim backed by data. Every trade thesis with full reasoning chain. We don't pump tokens or shill narratives. We analyze, we express conviction, we show our work. This is what separates a terminal from a Telegram group.

**"Renaissance Fund 3.0."**
Jim Simons built the greatest quant fund with 200+ PhDs and billions in compute. We're building the same thing with 11 AI agents and compounding knowledge. The ML loop isn't a feature — it's the culture. Every trade, every signal, every analysis makes the system smarter. That's the dream.

**"Ship fast, learn faster."**
The paper bot's ML loop is the culture embodied in code. Trade → learn → improve → trade better. Same for the product: ship → get feedback → improve → ship better. Perfection is the enemy of progress. Paper trading exists precisely so we can learn without consequences.

**"Feels genuinely alive."**
The north star for multi-agent interaction. When agents brief each other in morning standup, when ECHO alerts the team to a sentiment shift, when Kelly suggests celebrating a winning week — it should feel like a team, not a tool. Users should feel like they joined a team, not subscribed to a service.

### What We Don't Do

- We don't guarantee returns (paper or live)
- We don't front-run users
- We don't sell user data
- We don't build features users haven't asked for (after beta)
- We don't compete with our users (no proprietary fund using the same signals)
- We don't sacrifice correctness for speed
- We don't add agents just to have more agents

### Engineering Standards

- Every change reviewed (agents review each other's knowledge files)
- Every trade logged with full reasoning chain
- Every model tracked with versioning and performance metrics
- Every knowledge file attributed and dated
- Every API integration with fallback and error handling
- No silent failures — if something breaks, someone (Sentinel) knows immediately

---

## 8. What Sentinel Should Suggest Daily

When performing Project Radar scans, Sentinel evaluates the entire codebase, knowledge base, and agent performance against this roadmap. Suggestions are prioritized by what moves us closest to the next milestone.

### Priority Order

**Priority 1: Anything blocking public beta launch.**
If there's a bug in onboarding, a broken frontend route, missing documentation for new users, or a deployment issue — this comes first. Nothing else matters if users can't get in.

Examples:

- "Frontend login flow has a race condition — auth state isn't persisting across page refreshes"
- "Onboarding doesn't explain what ALOHA is. Add a 30-second explainer."
- "Docker build fails on M1 Macs — need multi-arch support for contributors"

**Priority 2: Revenue enablers (auth, billing, dashboard).**
Once beta is live, revenue infrastructure is next. Stripe integration, subscription management, usage tracking, premium feature gating.

Examples:

- "Stripe webhook handler doesn't handle subscription downgrades gracefully"
- "Need to add usage metering middleware — can't price tiers without data"
- "Paper bot dashboard should show ML confidence scores — users asked for this"

**Priority 3: ML/paper bot improvements (more data = better models).**
Every improvement to the paper bot compounds. More features, better signal processing, faster retraining, more robust backtesting. The ML loop is the core technology — keep it improving.

Examples:

- "Current ONNX export drops the ensemble model metadata — retraining can't reproduce results"
- "Add Hyperliquid funding rate as a feature — it's the strongest alpha signal we're not using"
- "Paper bot should log feature importance after each retraining — need this for dashboard"

**Priority 4: New signal sources (each one improves every trade).**
Each new signal source improves every trade the paper bot makes and every ALOHA report generated. Prioritize free/cheap sources, then evaluate paid ones by expected alpha contribution.

Examples:

- "Hyperliquid liquidation data is available via WebSocket — free, high signal"
- "Polymarket has an API — Oracle should ingest prediction market odds"
- "CoinGecko free tier gives us 30 calls/minute — enough for top 100 tokens"

**Priority 5: Knowledge expansion (compound interest of context).**
Every knowledge file makes every agent smarter. But quality over quantity — one deep analysis of Hyperliquid's fee structure is worth more than ten surface-level token summaries.

Examples:

- "Write knowledge file on HIP-3 fee structure — Solus needs this for options pricing"
- "ECHO's X sentiment patterns should be documented — what keywords actually predict moves?"
- "Kelly's wine knowledge is impressive but restaurant coverage is thin — expand Bay Area"

**Priority 6: Agent-to-agent improvements (standups, A2A quality).**
The multi-agent architecture is our moat. The better agents communicate, the more valuable the system. Focus on: standup quality, cross-agent references, conflict resolution (what happens when ECHO is bullish but Solus sees options risk?).

Examples:

- "Morning standup takes 45 seconds but agents aren't referencing each other's previous reports"
- "ECHO and VINCE are analyzing the same data independently — add shared context"
- "Need a disagreement protocol — when agents have opposing views, how does ALOHA resolve it?"

**Priority 7: Developer experience (make it easy for contributors).**
As we approach platform phase, external developers need to build on VINCE. Good DX now means ecosystem growth later.

Examples:

- "Add a CONTRIBUTING.md with local dev setup in under 5 minutes"
- "Agent creation should have a template — too many files to create manually"
- "Knowledge file format needs a schema — inconsistent formats slow down parsing"

### Suggestion Format

Each daily suggestion from Sentinel should follow:

```
## Project Radar — [Date]

### Critical (blocks current phase)
- [Issue]: [One-line description]
  - Impact: [What breaks / what's delayed]
  - Fix: [Specific action to take]
  - Priority: P[0-3] from roadmap

### Recommended (advances current phase)
- [Improvement]: [One-line description]
  - Why now: [Why this matters today]
  - Effort: [S/M/L]
  - Impact: [What gets better]

### Observed (worth tracking)
- [Pattern]: [What Sentinel noticed]
  - Trend: [Getting better/worse/new]
  - Action: [Monitor / Investigate / Plan]
```

### Weekly Strategic Review

Every Monday, Sentinel should also:

1. Compare actual progress against this roadmap's phase milestones
2. Identify if we're on track, ahead, or behind
3. Flag any assumptions in this roadmap that new data has invalidated
4. Suggest roadmap updates if the market has shifted

---

## 9. Risk Register

| Risk                                      | Probability | Impact   | Mitigation                                                         |
| ----------------------------------------- | ----------- | -------- | ------------------------------------------------------------------ |
| ElizaOS breaking change                   | Medium      | High     | Pin versions, maintain fork option, deep knowledge files as buffer |
| Hyperliquid API changes                   | Low         | High     | Abstraction layer, multiple exchange support roadmap               |
| ML model overfitting                      | High        | Medium   | Ensemble approach, out-of-sample testing, walk-forward validation  |
| User data breach                          | Low         | Critical | Supabase auth, no custody of funds, minimal PII                    |
| Competitor launches similar product       | Medium      | Medium   | Knowledge base depth as moat, ship faster, community lock-in       |
| API cost explosion at scale               | Medium      | Medium   | Caching, rate limiting, self-hosted alternatives where possible    |
| Regulatory action against onchain trading | Low         | High     | No custody, paper trading default, compliance roadmap for live     |
| Key person risk (single developer)        | High        | High     | Open source, documentation, agent-as-documentation                 |
| Market downturn kills crypto interest     | Medium      | High     | Cross-asset coverage (HIP-3 stocks), lifestyle retention (Kelly)   |

---

## 10. Success Definition by Phase

### Phase 1 Success (Month 6)

- [ ] 100 daily active users
- [ ] Public beta live and stable
- [ ] ALOHA delivered daily with 40%+ engagement
- [ ] Paper bot running with 500+ trades logged
- [ ] At least 3 paid users (proves willingness to pay)

### Phase 2 Success (Month 12)

- [ ] 1,000 paying users
- [ ] $1.5M+ ARR
- [ ] Paper bot Sharpe > 1.5 (public, verifiable)
- [ ] Seed round closed
- [ ] Mobile push notifications live

### Phase 3 Success (Month 24)

- [ ] 10,000 paying users
- [ ] $10M+ ARR
- [ ] Live trading launched (graduated rollout)
- [ ] Mobile app in app stores
- [ ] Social layer with 1,000+ shared strategies
- [ ] Series A closed

### Phase 4 Success (Month 36)

- [ ] 50,000+ users
- [ ] $50M+ ARR
- [ ] Agent marketplace with 50+ third-party agents
- [ ] Institutional clients (10+)
- [ ] $500M-1B valuation

---

## Appendix A: The Renaissance Fund Parallel

Jim Simons' Medallion Fund returned 66% annually before fees from 1988 to 2018. The principles that made it work:

1. **Data over intuition** — They traded on signals, not opinions. Our ML loop does the same.
2. **Ensemble methods** — Multiple models voting. We run 4 models in ensemble.
3. **Continuous learning** — Models retrained constantly. Our ONNX loop retrains after every batch.
4. **Signal diversity** — Hundreds of uncorrelated signals. We have 20+ sources, growing.
5. **Risk management** — Position sizing, drawdown limits, correlation tracking. Our paper bot has these.
6. **Team of specialists** — 200+ PhDs, each expert in one domain. We have 11 agents, each expert in one domain.

The difference: Medallion had a $10B+ infrastructure budget and 200 employees. We have AI agents and open-source infrastructure. The question isn't whether this approach works — Simons proved it does. The question is whether AI agents can replicate what 200 PhDs did. Early results suggest yes.

## Appendix B: Why Onchain Finance Wins

The migration from TradFi to onchain is not a question of if, but when. Key drivers:

- **24/7 markets** — Crypto never closes. Options expire when you want. No waiting for Monday.
- **Permissionless access** — No accredited investor requirements. Anyone, anywhere.
- **Composability** — Protocols plug into each other. Perps + options + lending in one tx.
- **Transparency** — All trades onchain. Verifiable track records. No Madoff possible.
- **Speed** — Hyperliquid does 200K+ orders/second. Faster than NYSE.
- **HIP-3** — Traditional assets (AAPL, gold, oil) now tradeable onchain. The bridge.
- **Cost** — No clearing houses, no prime brokers, no 2-day settlement. Direct.

Bloomberg serves TradFi. The terminal for this new financial system doesn't exist yet. That's what we're building.

---

_This document is Sentinel's strategic bible. Reference it when prioritizing suggestions, evaluating PRs, and planning sprints. Update it when milestones are hit or assumptions change. The goal is simple: build the terminal that makes every onchain trader better, every day._

_— Drafted 2026-02-17 | VINCE Project_
