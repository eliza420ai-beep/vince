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

**Local inference:** For running inference locally instead of cloud APIs (e.g. EXO cluster), see [LOCALSONLY.md](LOCALSONLY.md).

**Session token tracking (implemented):** Each chat run emits a `run_event` log with estimated tokens (input + output character-length heuristic). Real usage from model providers is stored when available. The dashboard **Usage** tab (Leaderboard → Usage) shows tokens by day and total for the period. Optional estimated cost: set `VINCE_USAGE_COST_PER_1K_TOKENS` (e.g. `0.01` for $0.01 per 1K tokens) in env or agent settings to see estimated cost in the Usage tab.

---

## Current Status (Template)

Keep this section updated as strategies are tried:

| Area              | Status        | Notes                          |
|-------------------|---------------|--------------------------------|
| Prediction markets| Not started   | Consider after paper edge proof |
| Token/fee revenue | Not started   | Pending eligibility/approval   |
| Micro-tasks       | Research      | Evaluate MTurk, freelance APIs |
| Cost optimization| In progress   | Cache, batching, model choice; session token tracking + Usage tab live |
| **Monthly target**| e.g. cover 20% of API costs | Adjust as data comes in |

---

## Optional: Cost estimation

Set **`VINCE_USAGE_COST_PER_1K_TOKENS`** (number or string, e.g. `0.01`) in environment or agent settings to enable estimated cost in the Usage tab. The value is applied as USD per 1,000 tokens (e.g. `0.01` = $0.01/1K tokens).

**Code tasks (claude-code-controller):** Code tasks delegated via [claude-code-controller](https://github.com/IkigaiLabsETH/claude-code-controller) use your Claude Code subscription separately; they are not included in the VINCE Usage tab.

---

## Cost breakdown (Sentinel)

Single source of truth for Sentinel: all project costs, LLM choice, data API tiers, bottom line. Update this section when tiers or targets change.

**Last updated (cost breakdown):** 2026-02-08

### Token usage (tracker)

- **Dashboard:** Leaderboard → Usage tab. Shows tokens by day and total for the period; uses `run_event` logs.
- **Estimated cost:** Set `VINCE_USAGE_COST_PER_1K_TOKENS` (e.g. `0.01` for $0.01/1K tokens) in env or agent settings to see estimated cost in the Usage tab.
- **Code tasks:** Claude Code / Cursor usage is separate (subscription); not in the Usage tab.

### Which LLM for what

- **TEXT_SMALL:** Simple tasks (suggestions, short replies, daily digest, most actions). Cheaper; use by default when quality allows.
- **TEXT_LARGE:** Complex reasoning, long context, task briefs. Model from env: e.g. `ANTHROPIC_LARGE_MODEL` (claude-sonnet-4-20250514) or OpenAI equivalent.
- **Embeddings:** `OPENAI_EMBEDDING_MODEL` (e.g. text-embedding-3-small). Required for RAG.
- **Principle:** Use cheaper/smaller for simple tasks; reserve expensive models for complex reasoning. See Strategy 4 above.

### Cursor Max

- **Cost:** Set `CURSOR_MAX_COST_MONTHLY` in .env (e.g. `20` for $20/mo) so Sentinel can cite it; or fill in here and link to [Cursor pricing](https://cursor.com/pricing). Billed separately from agent token usage.

### Data APIs (tiers and differences)

| API / service      | Tier / limit              | What we use it for                    |
|--------------------|---------------------------|----------------------------------------|
| Nansen             | 100 credits/month         | Smart money, wallet tracking (NANSEN_API_KEY) |
| Sanbase (Santiment)| 1K calls/month            | On-chain analytics, flows/whales (SANTIMENT_API_KEY) |
| CoinGlass          | Free tier / Hobbyist      | L/S ratio, funding, OI, fear/greed (COINGLASS_API_KEY) |
| Binance, Deribit   | Public/free where used    | Taker flow, IV, funding                |
| Hyperliquid        | Public API                | OI, funding, options pulse             |
| CoinGecko          | Free tier                 | Prices, exchange health (COINGECKO_API_KEY) |
| Birdeye            | Per tier                  | Memes, Solana wallets (BIRDEYE_API_KEY; plugin-vince TopTraders) |
| DexScreener       | Free / tier               | Meme scanner, traction                 |
| Helius             | Per tier                  | Solana RPC (HELIUS_API_KEY; .env.example) |
| OpenSea            | Limited / tier            | NFT floors (OPENSEA_API_KEY; CryptoPunks, Meridian) |
| X (Twitter)        | Basic tier or higher      | Read-only research, sentiment (X_BEARER_TOKEN) |
| Firecrawl          | Optional                  | Web URLs for upload (FIRECRAWL_API_KEY) |
| Supabase           | Project plan              | Feature store, ML bucket (SUPABASE_*; optional) |

When suggesting features or answering "what does it cost?", cite these limits so we stay within tier and avoid surprise burn.

### Bottom line

- **Breakeven:** Cover API + Cursor + data API spend from revenue or cost reduction. Strategy 4 (cost optimization) first; then Strategies 1–3 for revenue.
- **Target:** 100K/year. Track progress via paper edge proof, then prediction-market or fee revenue when eligible.
- **Burn rate:** Always watch it. Prefer cheaper models, cache, batch, and stay within data API tiers. Sentinel should remind about burn when suggesting work or when asked about cost.

---

## References & Tags

- **Concepts:** #money #survival #llmCosts #profitability #costOptimization
- **Related docs:** `FEATURE-STORE.md` (paper trading → edge validation), `CLAUDE.md` (project overview), `LOCALSONLY.md` (local inference cluster, cost and rationale).

---

*Last updated: 2026-02-08. Update this file when activating new revenue streams or cost levers.*
