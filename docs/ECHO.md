# ECHO: Sentiment & X Research Agent (VINCE)

ECHO is the **CSO (Chief Sentiment Officer)** agent: the voice of Crypto Twitter. She captures CT sentiment, surfaces alpha, summarizes threads, and warns when sentiment is extreme. No price/TA execution; handoffs for objective data → VINCE, plan/execution → Solus/Otaku.

**Use this doc** to brief OpenClaw (or any agent) on what ECHO can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why ECHO Matters

- **X/CT as product signal:** Sentiment and narratives feed VINCE’s paper bot and briefing. ECHO is the dedicated “ears on Crypto Twitter.”
- **Quality-weighted:** Whale/alpha accounts weighted higher; contrarian awareness when sentiment is extreme.
- **Single lane:** Sentiment, threads, account analysis, breaking content, X News API. Not price, not execution, not knowledge ingestion.

---

## What ECHO Can Do Today

- **Pulse & vibe:** X_PULSE (quick or full briefing, last 24h); X_VIBE (single-topic, optional quality-account filter). Uses plugin-x-research; X_BEARER_TOKEN required.
- **Watchlist:** X_WATCHLIST — read-only “check my watchlist”; add/remove via CLI only.
- **Account:** X_ACCOUNT — “what did @user say about BTC/ETH/…” with topic filter.
- **Save research:** X_SAVE_RESEARCH — save last pulse/vibe/news to file (e.g. `--save --markdown` via CLI).
- **Handoffs:** Objective price, options, perps, TA → ASK_AGENT VINCE; trading plan, strike, execution → Solus/Otaku; knowledge/upload → Eliza. ECHO reports back the other agent’s answer.
- **Brand voice:** Benefit-led, confident, no AI-slop; cite sources (“per @user”), flag confidence; emojis where appropriate.

---

## What ECHO Cannot Do Yet / Gaps

- **No prices:** ECHO must never invent or add “Cryptocurrency Prices” or numeric levels. For current prices she must use ASK_AGENT VINCE and report his answer. PRD: enforce no-hallucination guardrail in prompts/evals.
- **X token shared with Eliza:** If ECHO and Eliza both use X_BEARER_TOKEN, rate limits can bite. ELIZA_X_BEARER_TOKEN separates Eliza. PRD: document token strategy and optional per-agent tokens.
- **Watchlist only via CLI:** X_WATCHLIST is read-only in chat; add/remove is CLI-only. PRD: optional in-chat “add to watchlist” / “remove from watchlist” actions.
- **Pulse/vibe failure handling:** If X_PULSE or X_VIBE fails (API/network), ECHO must not say “feeds acting up” or “last successful read” without having run the action; return real error or result. PRD: clear error messaging and optional retry/backoff.
- **No historical sentiment series:** ECHO returns current pulse/vibe, not time-series sentiment for backtest or paper bot history. PRD: optional sentiment history store for analytics.
- **News from X News API:** Documented in system prompt; depends on X plugin/API. PRD: clarify News API scope and rate limits.

---

## Key Files for Code Review

| Area | Path |
|------|------|
| Agent definition | [src/agents/echo.ts](src/agents/echo.ts) |
| X research plugin | [src/plugins/plugin-x-research/](src/plugins/plugin-x-research/) |
| Actions (X_PULSE, X_VIBE, etc.) | [src/plugins/plugin-x-research/src/actions/](src/plugins/plugin-x-research/src/actions/) |
| Spec / instructions | [src/plugins/plugin-x-research/SPEC.md](src/plugins/plugin-x-research/SPEC.md), [AGENT_INSTRUCTIONS.md](src/plugins/plugin-x-research/AGENT_INSTRUCTIONS.md) |

---

## For OpenClaw / PRD

Use this doc to draft a **next-iteration PRD** for ECHO: e.g. in-chat watchlist add/remove, X token strategy and rate-limit handling, no-price hallucination evals, or optional sentiment history for paper bot/analytics.

---

## References

- [CLAUDE.md](CLAUDE.md) — X Research skill; ECHO as CSO.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT and handoffs.
- [skills/x-research/README.md](skills/x-research/README.md) — X research CLI and watchlist.
