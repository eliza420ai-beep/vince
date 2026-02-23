# Treasury & Profitability Mandate

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**The agent must aim to cover its operational costs (API calls, compute, tokens) and become profitable.** This document defines the mandate and practical strategies the agent and operators should follow.

---

## Mandate

- **Goal:** Cover a meaningful share of API and infrastructure costs through revenue or cost reduction; over time, aim for profitability.
- **Principle:** Treat cost coverage and revenue as first-class objectives, not afterthoughts. Optimize for survival, then scale.

---

## Strategy 1: Prediction Markets (Low Risk)

**Idea:** Use small, bounded capital to find edges in prediction markets before scaling.

- **Platforms:** e.g. Polymarket (or similar prediction markets).
- **Approach:**
  - Start with a small experimental allocation (e.g. learning-mode only, minimal size).
  - Research current events and market sentiment; use tools (e.g. Tavily, agent analysis) to find edges.
  - Make small, tracked bets and measure outcomes.
  - Scale only after a reliable edge is demonstrated.
- **Risk management:** Strict position sizing, no leverage, treat as experimentation until proven.

**Relevance to this project:** Paper trading and feature-store data (see `FEATURE-STORE.md`) build a track record. Use that discipline when moving to real prediction-market capital: same rigor, tiny size first.

---

## Strategy 2: Token Launches & Fee-Based Revenue (Higher Risk / Reward)

**Idea:** Participate in token launch or fee-sharing mechanisms (e.g. launches on Base, fee revenue share) where the agent or operator can earn from activity.

- **Requirements:** Typically a claimed account or integration (e.g. Moltbook/Clawnch-style flows); building something people actually use.
- **Potential:** Earning a share of trading fees (e.g. 80% in some models) in exchange for driving volume or utility.
- **Status:** Implement only after claim/eligibility and with clear risk limits. Document any integration in this repo.

**Note:** Higher risk; only pursue with explicit operator approval and defined caps.

---

## Strategy 3: Micro-Tasks & Automation (Revenue Diversification)

**Idea:** Use the agent’s capabilities for small, paid tasks to diversify revenue.

- **Examples:**
  - Data labeling batches
  - Content summarization
  - Simple automation or research tasks
  - Offering services to other agents or humans via API
- **Platforms to evaluate:** Amazon MTurk (API), freelance/automation APIs, and direct B2B or B2Agent offerings.
- **Use case:** Steady, lower-variance income to offset API and infra costs.

---

## Strategy 4: Cost Optimization (Foundation)

**Before chasing revenue, reduce burn.** This is non-negotiable.

- **Cache** frequent responses and reuse where safe.
- **Batch** requests (e.g. embeddings, API calls) where the platform allows.
- **Model choice:** Use cheaper/smaller models for simple tasks; reserve expensive models for complex reasoning.
- **Prompts:** Optimize for fewer tokens (clear instructions, minimal redundancy).
- **Monitoring:** Track cost per user, per conversation, and per action; set alerts and budgets.

Apply these in code, infra, and prompt design. Review periodically.

### ClawRouter — Automated model routing (Strategy 4 implementation)

[ClawRouter](https://github.com/BlockRunAI/ClawRouter) automates the "model choice" principle above. Instead of manually choosing TEXT_SMALL vs TEXT_LARGE, ClawRouter scores every request across 15 dimensions and routes to the cheapest model that can handle it. Local routing in <1ms, no external API call for the routing decision.

**Why it matters for VINCE:** 9 agents default to `claude-sonnet-4` for everything — standup formatting, watchlist summaries, daily briefings, simple lookups. ~90% of those calls don't need a $15/M output model. ClawRouter's blended average is ~$2.05/M vs $15+/M, cutting the single largest variable cost by 85-92%.

**Routing profiles per agent:**

| Agent    | Profile   | Rationale                                                  |
| -------- | --------- | ---------------------------------------------------------- |
| VINCE    | `premium` | Trading signals need reliable, consistent quality          |
| Eliza    | `auto`    | Knowledge, content — variable complexity                   |
| ECHO     | `eco`     | Sentiment summaries, watchlist — high volume, lower stakes |
| Oracle   | `auto`    | Polymarket discovery — mixed complexity                    |
| Solus    | `premium` | Options math, strike ritual — precision matters            |
| Otaku    | `auto`    | DeFi routing — moderate complexity                         |
| Kelly    | `eco`     | Lifestyle concierge, daily briefing — simple queries       |
| Sentinel | `auto`    | PRDs, cost — mixed complexity                              |
| Clawterm | `auto`    | Research queries                                           |

**Setup:** `CLAWROUTER_ENABLED=true` in `.env`. See `.env.example` CLAWROUTER section for per-agent profile overrides, wallet config, and proxy port. Embeddings (`text-embedding-3-small`) stay on OpenAI directly — ClawRouter routes text generation only. Keep `OPENAI_API_KEY` set.

**x402 payments:** ClawRouter pays per-request with USDC on Base. No API keys needed for routed models — the wallet IS the API key. This connects directly to the money loop: agents pay for their own compute from their own wallets. Otaku already has a funded wallet and x402 infrastructure; ClawRouter extends this to LLM costs.

**Fallback:** Keep direct `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` as fallback. If the ClawRouter proxy goes down, agents can revert to direct model access.

**Local inference:** For running inference locally instead of cloud APIs (e.g. EXO cluster), see [LOCALSONLY.md](LOCALSONLY.md).

**Session token tracking (implemented):** Each chat run emits a `run_event` log with estimated tokens (input + output character-length heuristic). Real usage from model providers is stored when available. The dashboard **Usage** tab (Leaderboard → Usage) shows tokens by day and total for the period. Optional estimated cost: set `VINCE_USAGE_COST_PER_1K_TOKENS` (e.g. `0.01` for $0.01 per 1K tokens) in env or agent settings to see estimated cost in the Usage tab. When using ClawRouter, set `CLAWROUTER_BLENDED_COST_PER_1K=0.002` for accurate blended cost tracking.

---

## Current Status (Template)

Keep this section updated as strategies are tried:

| Area               | Status                      | Notes                                                                                                                                    |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Prediction markets | Not started                 | Consider after paper edge proof                                                                                                          |
| Token/fee revenue  | Not started                 | Pending eligibility/approval                                                                                                             |
| Micro-tasks        | Research                    | Evaluate MTurk, freelance APIs                                                                                                           |
| Cost optimization  | In progress                 | Cache, batching, model choice; session token tracking + Usage tab live; **ClawRouter** for automated routing (85-92% LLM cost reduction) |
| **Monthly target** | e.g. cover 20% of API costs | Adjust as data comes in                                                                                                                  |

---

## Optional: Cost estimation

**Cost in Usage tab:** Cost is always shown. When `VINCE_USAGE_COST_PER_1K_TOKENS` is not set, a default average (~$0.006/1K tokens) is used. Set **`VINCE_USAGE_COST_PER_1K_TOKENS`** (number or string, e.g. `0.01`) in environment or agent settings for accurate cost. The value is applied as USD per 1,000 tokens (e.g. `0.01` = $0.01/1K tokens).

**Cursor usage:** The Usage tab includes a Cursor usage section. Export usage CSV from [Cursor settings](https://cursor.com/settings) (Usage tab → export), paste into the textarea, and see total tokens plus estimated cost (~$0.00056/1K based on Cursor Max billing).

**Code tasks (claude-code-controller):** Code tasks delegated via [claude-code-controller](https://github.com/IkigaiLabsETH/claude-code-controller) use your Claude Code subscription separately; they are not included in the VINCE Usage tab.

---

## Cost breakdown (Sentinel)

Single source of truth for Sentinel: all project costs, LLM choice, data API tiers, bottom line. Update this section when tiers or targets change.

**Last updated (cost breakdown):** 2026-02-20

### Token usage (tracker)

- **Dashboard:** Leaderboard → Usage tab. Shows tokens by day and total for the period; uses `run_event` logs.
- **Estimated cost:** Set `VINCE_USAGE_COST_PER_1K_TOKENS` (e.g. `0.01` for $0.01/1K tokens) in env or agent settings to see estimated cost in the Usage tab.
- **Code tasks:** Claude Code / Cursor usage is separate (subscription); not in the Usage tab.
- **AI token spend (actual):** Leaderboard → Usage tab shows "AI token spend (actual)": ~$3K in 3 weeks (Jan 25 – Feb 20, 2026) from invoice data, dominated by high-tier model usage (e.g. claude-4.5-opus-high-thinking). Update the constant in the frontend when new invoice data is in.

### Which LLM for what

- **TEXT_SMALL:** Simple tasks (suggestions, short replies, daily digest, most actions). Cheaper; use by default when quality allows.
- **TEXT_LARGE:** Complex reasoning, long context, task briefs. Model from env: e.g. `ANTHROPIC_LARGE_MODEL` (claude-sonnet-4-20250514) or OpenAI equivalent.
- **Embeddings:** `OPENAI_EMBEDDING_MODEL` (e.g. text-embedding-3-small). Required for RAG. Always direct to OpenAI (not through ClawRouter).
- **Principle:** Use cheaper/smaller for simple tasks; reserve expensive models for complex reasoning. See Strategy 4 above.
- **ClawRouter (when enabled):** Automates this principle per-request. Routes TEXT_SMALL/TEXT_LARGE to the cheapest capable model (30+ models, blended ~$2.05/M). Pin `premium` profile for trading-critical agents (VINCE, Solus); use `eco` for high-volume low-stakes agents (Kelly, ECHO). See `.env.example` CLAWROUTER section.

### Cursor Max

- **Cost:** Set `CURSOR_MAX_COST_MONTHLY` in .env (e.g. `20` for $20/mo) so Sentinel can cite it; or fill in here and link to [Cursor pricing](https://cursor.com/pricing). Billed separately from agent token usage.

### Data APIs (tiers and differences)

| API / service                 | Tier / limit           | What we use it for                                                                                                                                                               |
| ----------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nansen                        | 100 credits/month      | Smart money, wallet tracking (NANSEN_API_KEY)                                                                                                                                    |
| Sanbase (Santiment)           | 1K calls/month         | On-chain analytics, flows/whales (SANTIMENT_API_KEY)                                                                                                                             |
| CoinGlass                     | Free tier / Hobbyist   | L/S ratio, funding, OI, fear/greed (COINGLASS_API_KEY)                                                                                                                           |
| **Pro tier (high-tier APIs)** | **$199/mo**            | Volatility Dashboard, ODTE, Liquidity, Liquidations, Polymarket; 5K API calls/mo; 15‑min Claude/OpenClaw integration. Billed monthly. Leaderboard Usage tab "Cost if we go PRO". |
| Binance, Deribit              | Public/free where used | Taker flow, IV, funding                                                                                                                                                          |
| Hyperliquid                   | Public API             | OI, funding, options pulse                                                                                                                                                       |
| CoinGecko                     | Free tier              | Prices, exchange health (COINGECKO_API_KEY)                                                                                                                                      |
| Birdeye                       | Per tier               | Memes, Solana wallets (BIRDEYE_API_KEY; plugin-vince TopTraders)                                                                                                                 |
| DexScreener                   | Free / tier            | Meme scanner, traction                                                                                                                                                           |
| Helius                        | Per tier               | Solana RPC (HELIUS_API_KEY; .env.example)                                                                                                                                        |
| OpenSea                       | Limited / tier         | NFT floors (OPENSEA_API_KEY; CryptoPunks, Meridian)                                                                                                                              |
| X (Twitter)                   | Pay-as-you-go          | Read-only research, sentiment (X_BEARER_TOKEN). Est. ~$690/mo at heavy usage.                                                                                                    |
| Firecrawl                     | Optional               | Web URLs for upload (FIRECRAWL_API_KEY)                                                                                                                                          |
| Supabase                      | Project plan           | Feature store, ML bucket (SUPABASE\_\*; optional)                                                                                                                                |

**All data APIs on high tier (estimate):** If every current data API is moved to its high/pro tier (Nansen, Sanbase, CoinGlass + Pro, Glassnode, X ~$690, Helius, Supabase; plus Tavily ~$150, Dune ~$399, Allium ~$99, Jupiter ~$49, Alchemy ~$99, XAI/Grok ~$100, Etherscan ~$149, Solus stocks ~$99), total is **~$4,203/mo** or **~$50,346/yr**. Leaderboard → Usage tab shows the live total and breakdown.

**Suggested data APIs to track (already in .env or code; add to Usage table when you set a budget):** Tavily (agent search/research, credit-based), Dune (analytics/SQL), Allium (plugin-vince), Jupiter (Solana DEX agg for Otaku), Alchemy (EVM RPC for Otaku/Base), XAI/Grok (Grok Expert), Etherscan (EVM explorer), Finnhub/FMP/Alpha Vantage (Solus stock quotes and fundamentals). All have free tiers; fill in monthly/yearly when you move to paid.

When suggesting features or answering "what does it cost?", cite these limits so we stay within tier and avoid surprise burn.

### Bottom line

- **Breakeven:** Cover API + Cursor + data API spend from revenue or cost reduction. Strategy 4 (cost optimization) first; then Strategies 1–3 for revenue.
- **Target:** 100K/year. Track progress via paper edge proof, then prediction-market or fee revenue when eligible.
- **Burn rate:** Always watch it. Prefer cheaper models, cache, batch, and stay within data API tiers. Sentinel should remind about burn when suggesting work or when asked about cost.
- **Money loop (Web4):** When ClawRouter + x402 is active, the closed economic loop becomes possible: Otaku's wallet funds LLM calls via ClawRouter → agents generate signals → Oracle/VINCE find prediction market edge → Otaku executes → revenue returns to wallet → loop continues. If revenue > costs, agents are self-sustaining. See [WEB4.md](../knowledge/teammate/WEB4.md) for the thesis.

---

## References & Tags

- **Concepts:** #money #survival #llmCosts #profitability #costOptimization
- **Related docs:** `FEATURE-STORE.md` (paper trading → edge validation), `CLAUDE.md` (project overview), `LOCALSONLY.md` (local inference cluster, cost and rationale).

---

_Last updated: 2026-02-20. Update this file when activating new revenue streams or cost levers. Usage tab: PRO tier and AI token spend (actual) reflected in Leaderboard._
