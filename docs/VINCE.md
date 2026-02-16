# VINCE: Data & Paper Trading Agent

VINCE is the **CDO (Chief Data Officer)** agent: unified data intelligence across options, perps, TradFi, memes, lifestyle, and art, with a **self-improving paper trading bot** at the core. One coherent voice: “Here’s the play, and here’s why.” No execution; Otaku is the only agent with a funded wallet.

**Use this doc** to brief OpenClaw (or any agent) on what VINCE can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why VINCE Matters

- **Paper bot is the flagship:** X (Twitter) sentiment is the #1 signal source; with funding, whale flow, regime, and 10+ sources. Thompson Sampling, embeddings, optional ONNX. Every trade explains why; the bot learns without redeploy.
- **One entry:** “gm” or “ALOHA” → options skew, perps funding, top memes, session context, lifestyle nudge, NFT floors. Curated narrative, not a raw dashboard.
- **Six domains:** Options (Hypersurface, Deribit IV), perps (Hyperliquid), TradFi (HIP-3), memes (DexScreener), lifestyle (day-of-week), art (NFT floors). Free-first; paid APIs optional.

---

## What VINCE Can Do Today

- **Briefing:** ALOHA (one-word vibe, majors, trade or wait), gm-style briefing (options, perps, memes, context, lifestyle, NFT).
- **Paper bot:** Signal aggregation, Kelly sizing, circuit breakers (e.g. $200 daily cap), goals ($420/day, $10K/month). Status, deep-dive meme, “Grok Expert” prompts. Thompson Sampling and embeddings; ONNX when trained.
- **Options:** Hypersurface view (covered calls, secured puts); Deribit IV, Greeks, DVOL via data sources; handoff to Solus for strike/execution.
- **Perps:** Hyperliquid signals, funding, regime; paper execution in-app (no onchain unless Otaku executes).
- **Memes / TradFi / Art:** Meme scan (DexScreener, traction, liquidity); HIP-3 (gold, NVDA, SPX, etc.); NFT floor tracking (curated collections).
- **Actions & routes:** Many plugin-vince actions (e.g. paper bot status, options view, meme deep-dive, ALOHA); dashboard routes (usage, paper, knowledge, BANKR when configured).
- **Multi-agent:** ASK_AGENT to Eliza, Kelly, Solus, Otaku, Sentinel, Oracle, ECHO. Handoffs: execution → Otaku, strike/plan → Solus, prediction markets → Oracle.

---

## What VINCE Cannot Do Yet / Gaps

- **No onchain execution:** VINCE does not hold a wallet or send transactions. All execution (swap, bridge, DCA, etc.) is via Otaku. PRD: keep this boundary; no “execute” action on VINCE.
- **Paper bot testnet/mainnet:** Default is production-oriented; testnet (e.g. Hyperliquid testnet) and env parity are not fully documented. PRD: testnet runbook and env checklist.
- **ONNX dependency:** When ONNX models are not trained or fail, rules take over (graceful degradation). No auto-training from chat; training is offline (feature store, scripts). PRD: document “Day 1 → 30 days → 90+ days” path and observability.
- **X sentiment as #1 source:** If X API is down or rate-limited, paper bot and briefing degrade; fallbacks (cached sentiment, other sources) are partial. PRD: resilience and fallback clarity.
- **Paid APIs:** CoinGlass, Nansen, Sanbase are optional; not required for MVP. PRD: optional “premium data” tier and feature flags.
- **Dashboard routes:** Some routes (e.g. BANKR, usage, paper) depend on env and backend state; not all are exposed in the same way in the UI. PRD: align route contract and frontend consumption.

---

## Key Files for Code Review

| Area | Path |
|------|------|
| Agent definition | [src/agents/vince.ts](src/agents/vince.ts) |
| Plugin entry | [src/plugins/plugin-vince/src/index.ts](src/plugins/plugin-vince/src/index.ts) |
| Paper bot / ML | [src/plugins/plugin-vince/](src/plugins/plugin-vince/) (actions, services, tasks, models) |
| Signal sources | [src/plugins/plugin-vince/SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) |
| Feature store | [docs/FEATURE-STORE.md](docs/FEATURE-STORE.md) |
| Dashboard routes | [src/plugins/plugin-vince/src/routes/](src/plugins/plugin-vince/src/routes/) |

---

## For OpenClaw / PRD

Use this doc to draft a **next-iteration PRD** for VINCE: e.g. paper bot testnet runbook, ONNX training/observability docs, X sentiment fallbacks, optional premium data tier, or dashboard route/UI alignment.

---

## References

- [CLAUDE.md](CLAUDE.md) — VINCE project layout; paper bot, ML, three curves.
- [docs/FEATURE-STORE.md](docs/FEATURE-STORE.md) — Feature store and ML pipeline.
- [src/plugins/plugin-vince/WHAT.md](src/plugins/plugin-vince/WHAT.md) — What plugin-vince is and does.
