# Solus North Star and Roadmap

The **north star and inspiration** for Solus as an X-native crypto intelligence agent. Summarizes an aspirational system design (autonomous lead analyst, sub-agents, memory, EV framework) and maps **Solus today** plus an **aspirational roadmap**. No implementation is committed here — reference and direction only.

---

## Purpose

Solus is the VINCE project’s **wealth architect**: X-native, options-focused, execution-driven. This doc captures a more advanced crypto intelligence design that inspires where Solus could evolve. It is **doc-only**: no code changes, no new plugins, no commitment to build the full system.

---

## Inspiring System (Summary)

The following summarizes an autonomous crypto intelligence design. It is the north star, not the current implementation.

### Identity

- **Lead analyst** coordinating a network of specialized sub-agents and independent research.
- **Mandate**: find alpha, surface actionable trades, deliver clear buy/sell recommendations with expected value (EV) calculations every day.
- **Autonomous**: runs independently; makes own decisions about what to investigate; does not wait for instructions.
- **Learning system**: persistent memory across sessions; every day the system gets smarter, pattern recognition sharpens, recommendations improve by remembering what worked and what did not.
- **Biased toward action**: every report ends with specific things to buy, sell, and watch, each with a clear EV assessment.

### Tooling

- **Method 1**: Real-time X/Twitter intelligence (e.g. Grok API or equivalent) for social layer—account names, engagement, quotes, timestamps; low temperature for factual queries.
- **Method 2**: Web search, web fetch, bash for everything else—on-chain data, funding, TVL, governance, news. Cross-reference: when social says something is trending, verify with data; when web surfaces a new protocol, check what X says.
- **Both** are used extensively every session; neither alone is sufficient.

### Sub-Agent Architecture

Six specialized sub-agents (each with a dedicated system prompt and query), plus **parallel web research** on the same topics for verification and enrichment:

1. **Market Structure ("The Plumber")** — Funding rates, open interest, liquidations, whale movements, exchange flows, stablecoin supply, options positioning, ETF flows, Hyperliquid positioning. Focus on where money is moving; macro only if a direct catalyst in next 48h.
2. **Ecosystem and DeFi ("The Cartographer")** — TVL migrations, new launches, governance, yield dynamics, DEX volume, infrastructure. Wide mandate; prioritize what actually matters that day.
3. **Solana Trenches ("The Degen")** — pump.fun, Raydium, Meteora, Jupiter, KOL activity, memecoins, rugs. Specific tokens and contracts where possible; what has legs vs trap.
4. **Alpha Hunter ("The Rat")** — Three query types: (a) obscure/early signals not yet mainstream, (b) airdrop farming and points programs and upcoming launches, (c) VC and smart money positioning from X. Paranoid alpha hunt; wide latitude.
5. **Risk Scanner ("The Paranoid")** — Exploits, narrative traps, overvalued tokens, governance attacks, team red flags, regulatory threats. Assume scam until proven otherwise.
6. **The Contrarian ("The Mirror")** — Challenge consensus; argue the other side of dominant narratives. Output is used to **stress-test recommendations**, not as a standalone section. If The Contrarian raises a valid objection, address it or drop the recommendation.

Sub-agent output is never taken at face value: the lead analyst investigates findings independently via web/on-chain and forms an independent view.

### Smart Wallet Intelligence

- **Persistent database** (e.g. `memory/smart_wallets.json`) of tracked wallets: address, chain, label, category (insider, early degen, fund, whale, MEV, smart trader), first-spotted date, score (how often their moves precede profitable outcomes), notable trades, current holdings, last-checked, active/dormant, notes.
- **Discovery every session**: Arkham, Nansen, Hyperliquid leaderboards (Hypurrscan), trace pumps to earliest buyers, airdrop farmers, wallets receiving from VC before public discussion. Prune bad track records; promote consistent ones.
- **Usage**: If tracked wallets make significant moves or converge on the same token, that feeds directly into recommendations as high-priority signal.

### Expected Value Framework

- **Every recommendation** must include an EV calculation. Three scenarios (bull, base, bear) with probabilities summing to 100%; EV = (p_bull × return_bull) + (p_base × return_base) + (p_bear × return_bear).
- **Presentation**: e.g. `TOKEN at $X.XX (mcap). Bull: 30% @ +150%. Base: 45% @ +20%. Bear: 25% @ -60%. EV: +24.5%`.
- **Calibration**: Use track record, category win rates, Contrarian counterarguments, on-chain data (holder concentration, unlocks). Be ruthlessly honest; overweighting bull case is the common mistake. When closing a recommendation, note which scenario played out to build calibration data over time.

### Memory System

Files in a `memory/` directory (or equivalent) form a **learning system**:

- **intelligence_log.jsonl** — Append-only log of significant findings: date, category, signal description, source (grok, web, onchain, smart_wallet, hyperliquid), confidence, status (new, developing, confirmed, invalidated), follow-up for next session, related tokens, tags. Read entire log each session; look for patterns; update statuses.
- **recommendations.jsonl** — Full lifecycle of every recommendation: date, ticker, action, price, mcap, category, thesis, target, invalidation, timeframe, status, P&L, close date/reason, three-scenario EV and which scenario played out.
- **watchlist.json** — Living watchlist of protocols, wallets, narratives, airdrops, unlocks, notable Hyperliquid positions. Review entirely every session.
- **smart_wallets.json** — As above.
- **track_record.json** — Wins, losses, win rate, breakdowns by category and source, EV calibration (estimated vs actual outcomes), lessons array.
- **patterns.json** — Recurring signals and reliability, market regime history, source reliability scores, narrative lifecycle, EV calibration patterns.
- **session_state.json** — Inter-session continuity: last_run, open_investigations (findings + next steps), questions_for_next_session, contrarian_challenges, priority_checks.

Memory is **active**: consulted, updated, and reasoned over every session. Quality of memory directly determines quality of analysis.

### Session Startup

Before running sub-agents:

1. **Load all memory files.** Read intelligence log for patterns and developing signals; load active recommendations and compute current P&L (live prices); load watchlist and daily check items; load smart wallets; load track record and patterns; load session state (open investigations, questions from last session).
2. **Pre-flight**: Answer last session’s questions via web; continue open investigations; update recommendation prices and P&L; check all tracked smart wallets; update developing signals; review upcoming unlocks (e.g. 7 days); check Hyperliquid watchlist positions; review patterns for relevance; resolve Contrarian challenges (right or wrong).
3. **Then** run the six sub-agents with parallel web research.

### Autonomous Behavior Rules (Summary)

- Investigate sub-agent findings independently; do not just paste into report.
- Flag conflicts between social and web data; investigate which is right.
- Escalate developing signals that show new movement; multi-session signals are highest conviction.
- Convergence across sub-agents or across Grok and web = strong signal; investigate immediately.
- Always check previous recommendations before making new ones; lead with updates if something moved.
- For any new token/protocol: team, VCs, GitHub, audit, TVL trend, distribution, unlocks, smart wallet involvement.
- For Solana trenches: developer history, bundling, concentration, Kolscan for KOL/dump patterns.
- Win rate and EV calibration inform new recommendations; recalibrate when a category underperforms.
- Trust accumulated memory over single-day noise; if multi-session intelligence conflicts with today’s X sentiment, weight accumulated view and explain.
- Update patterns when something changes understanding of market dynamics.
- Actively hunt for new smart wallets every session; database should grow.
- Cross-reference Hyperliquid positioning with spot; divergence is a signal.
- Use EV calibration history to improve probability estimates.

### Output Format

- **Report file**: e.g. `crypto_intel_YYYY-MM-DD.md`.
- **Sections**: (1) Memory Review and Previous Session Follow-Up, (2) Market Structure Snapshot, (3) Ecosystem and DeFi Intelligence, (4) Solana Trenches Report, (5) Alpha Signals, (6) Smart Wallet Activity, (7) Risk Radar, (8) Today’s Recommendations (buys, sells, yield, watchlist with EVs), (9) The Interesting Stuff, (10) Summary (synthesis + highest-EV recommendations restated). Dense and specific; no filler.
- **After writing**: Update all memory files (intelligence log, recommendations, watchlist, smart wallets, track record, patterns, session state).

### Scheduling

- Daily cron (or equivalent) runs the full protocol: load memory, pre-flight, run all six sub-agents with parallel web research, independent deep dives, smart wallet checks, EV calculations, track record update, compile report, update memory.

---

## Solus Today

Current implementation lives in [src/agents/solus.ts](../src/agents/solus.ts) and is described for X research in [X-RESEARCH.md](X-RESEARCH.md).

**What exists:**

- **X-first identity**: On X since 2007; lives on the timeline; alpha from CT, threads, and X—not the web. Direct, no-fluff personality; confident but not arrogant.
- **Single X research action**: **VINCE_X_RESEARCH** — search, profile (“what did @user post?”), thread (tweet URL or ID), single tweet. One action, four intents; no sub-agents.
- **VIP list**: Curated X accounts on notif (configurable via `SOLUS_X_VIP_HANDLES`); Solus can suggest checking or citing them and can run profile lookups for any VIP.
- **Focus tickers**: Core (BTC, ETH, SOL, HYPE), HIP-3 (commodities, indices, stocks, AI/tech), priority crypto—from plugin targetAssets. Used for X research and strike ritual.
- **Strike ritual**: Options on HYPERSURFACE; $3K/week minimum; framed as “Strike ritual” / “This week’s targets” with yield math, not “My call.” Data from Deribit, CoinGlass, Hyperliquid via plugin.
- **Seven pillars**: Stacking sats, yield (USDC/USDT0), Echo seed DD, paper perps bot, HIP-3 spot, airdrop farming, HYPERSURFACE options. Full $100K/year stack.
- **No persistent memory files**: No intelligence_log, recommendations.jsonl, session_state, or track_record. No EV section. No daily compiled report format. No smart wallet database. No session startup/pre-flight sequence. No cron.

---

## Gap and Roadmap

**Aspirational direction** (could evolve; not a commitment to build):

- **Multi-angle X intelligence** — Even with a single action today, the north star is distinct “angles” (market structure, DeFi ecosystem, trenches, alpha, risk, contrarian) that could over time become separate queries or sub-flows, with parallel web/on-chain verification.
- **Session memory** — Open investigations, questions for next session, contrarian challenges, priority checks. Persistent state so Solus (or a future variant) can “remember” across runs and pre-flight at session start.
- **EV-style framing** — Recommendations (strike ritual, buy/sell, watchlist) could evolve toward explicit three-scenario EV where appropriate; calibration would require tracking outcomes over time.
- **Compiled briefings** — Daily or weekly report output (e.g. markdown with sections similar to the inspiring format) as an optional mode, not replacing in-chat Q&A.
- **Scheduled runs** — Optional cron or scheduled task to run a “full protocol” (load memory, pre-flight, multi-query X + web, compile report, update memory) for users who want a daily briefing.
- **Smart wallet layer** — Tracking and scoring wallets (Hypurrscan, Arkham, trace pumps) as a future possibility for alpha and risk signals.

This doc remains the single place to understand the target design. Implementation choices (e.g. Grok vs existing X API, where memory lives, how many “sub-agents” are first-class) are left to future work.

**Implementation status (Phases 2–5):** Sub-agent Grok orchestration (six specialists + Section 10 synthesis), optional Tavily web verification, persistent memory (`.elizadb/vince-paper-bot/crypto-intel/`: `intelligence_log.jsonl`, `session_state.json`, `recommendations.jsonl`, `track_record.json`, `smart_wallets.json`, `watchlist.json`), pre-flight (session + recommendations PnL + wallet activity), Section 1 (Memory Review), Section 8 (Today's Recommendations with EV), Section 6 (Smart Wallet Activity), post-report extraction, and close-recommendation action are implemented in plugin-vince. Enable with `GROK_SUB_AGENTS_ENABLED=true`. Report output: `knowledge/internal-docs/grok-daily-<date>.md` (action) or `grok-auto-<date>.md` (task).

---

## Non-Goals (This Doc)

- No code changes, no new plugins, no new env vars or config.
- No edits to [src/agents/solus.ts](../src/agents/solus.ts) or to X research behavior.
- Reference and direction only.
