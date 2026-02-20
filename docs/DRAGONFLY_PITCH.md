# VINCE — For Dragonfly

_A note for Haseeb._

---

## The poker player's problem

You already know this, but most people in markets have it backwards. They think the hard part is finding edge. It isn't. The hard part is three things that happen after you find it:

1. **Sizing correctly** — Kelly criterion, bankroll management, risk of ruin. Most traders blow up not because they're wrong but because they're right with wrong sizing.
2. **Executing with zero tilt** — Emotional discipline across thousands of decisions. The 3am session where fatigue turns a +EV line into a punt.
3. **Compounding learnings** — Updating your model after every session. Not "I'll remember this" but actual Bayesian updating of parameters from outcomes.

Poker solved this by producing a generation of players who think in distributions and manage bankroll like accountants. But poker has fixed rules. Markets don't.

VINCE is what happens when you build a system that does all three — sizing, discipline, learning — across crypto markets, 24/7, with no tilt and no sleep requirement. Not a dashboard. Not a chatbot. A self-improving trading engine that explains every decision, learns from every outcome, and gets measurably better with data.

---

## What it actually is

Ten autonomous agents on ElizaOS. One system.

The important ones for this conversation:

| Agent | What it does |
|-------|-------------|
| **VINCE** | Signal aggregation across 15+ sources (CoinGlass, Binance, Deribit, Hyperliquid, X sentiment, news, on-chain). 50+ features per decision. Paper trades with Kelly sizing, circuit breakers, and daily caps. Every trade includes a "WHY THIS TRADE" banner — supporting vs conflicting factors, N of M sources agreed. |
| **Oracle** | Polymarket edge engine. Three strategies: Black–Scholes implied probability vs CLOB price, overreaction detection (price velocity on favorites → cheap underdogs), and external forecast comparison. Kelly-sized paper trades when edge exceeds threshold. |
| **Otaku** | Only agent with a funded wallet. Executes on Base and EVM: swaps, DCA, bridges (Relay), Morpho lending, stop-loss, NFT mints. x402 micropayments for paid API endpoints. Two modes: degen (full DeFi) and normies (Coinbase-style). |
| **Solus** | Weekly BTC options on Hypersurface. Strike selection, direction, invalidation levels. |

The rest: Eliza (knowledge, research, content), ECHO (X sentiment, social alpha), Kelly (lifestyle — literally "touch grass" concierge), Sentinel (ops, cost, PRDs), Naval (philosophy, mental models), Clawterm (research terminal).

---

## Why this is a Dragonfly deal

Three reasons.

### 1. Hyperliquid-native, DeFi-native execution

We don't route through centralized exchanges. The paper bot runs against Hyperliquid perps. The Polymarket desk runs against the CLOB. Otaku executes on Base. The roadmap to live execution on Hyperliquid is designed and phased — not a slide deck aspiration, it's a [PRD with architecture diagrams and protection layers](PRD_LIVE_HYPERLIQUID_PERPS.md).

The live execution path: signals → optional LLM entry gate → single executor (Otaku for onchain, dedicated HL executor for perps) → chase-limit orders → post-fill verification → SL/TP. Same producer/executor split you'd want in any trading system: producers never touch order placement. [One contract, one path](TRADING_RUNTIME_CONTRACT.md).

### 2. The ML loop is real, not narrative

This isn't "we'll add AI later." The loop runs today:

```
signals → trades → feature store (50+ features) → Python training → ONNX models → runtime inference → repeat
```

Four XGBoost models trained on trade data: signal quality, position sizing, TP optimizer, SL optimizer. When models aren't trained yet, rules keep the bot running (graceful degradation). When they are, ONNX inference runs at the decision point — no redeploy required.

**You can validate it yourself.** One command:

```bash
python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py \
  --data .elizadb/vince-paper-bot/features
```

If the filtered win rate (using ML-derived thresholds) beats the baseline win rate (all trades), the system demonstrably improves selectivity from its own data. Not a claim — a reproducible test on the feature store.

On top of that: Thompson Sampling for source weighting (sources that produce winners get more weight), Bayesian parameter tuning that adjusts thresholds from outcomes, and embeddings for signal similarity. The system literally plays more hands through sources that run hot and folds sources that run cold — you'll recognize the pattern.

### 3. Path to profitability is designed, not hoped for

We wrote a [Treasury mandate](TREASURY.md) before writing a pitch deck. The system is designed to cover its own costs and become self-sustaining:

- **ClawRouter** — Automated model routing across 30+ LLMs. Routes each request to the cheapest model that can handle it. Blended cost ~$2/M tokens vs $15+/M for default Claude. 85–92% reduction in the single largest variable cost. The wallet IS the API key (x402 micropayments in USDC on Base).
- **Prediction market edge** — Oracle's paper trading validates edge before a single dollar of real capital. Same discipline a poker player would demand: prove the edge on paper, then size in.
- **x402 paid API** — Otaku already has paid endpoints (positions, quote, yields, history, portfolio). Revenue from day one of live.
- **Money loop** — When ClawRouter + x402 is active: Otaku's wallet funds LLM calls → agents generate signals → Oracle/VINCE find edge → Otaku executes → revenue returns to wallet. If revenue > costs, agents are self-sustaining. We call it Web4; you'd probably call it "the agent pays for itself."

Target: 100K/year covers API + compute + data. Prediction market alpha and execution fees are upside.

---

## What's shipped

This is running code, not a whitepaper.

| What | Status |
|------|--------|
| 10 agents on ElizaOS | Deployed, Eliza Cloud |
| Paper trading bot with 15+ signal sources | Running daily |
| Feature store (50+ features per trade, JSONL + DB + optional Supabase) | Live, dual-write |
| ONNX training pipeline (XGBoost → ONNX, four models) | Shipped |
| Thompson Sampling source weighting | Shipped |
| Bayesian parameter tuner | Shipped |
| Polymarket edge engine (3 strategies, Black–Scholes, overreaction, Synth) | Shipped |
| Otaku with 13 DeFi actions, x402 paid API, funded wallet | Shipped |
| Leaderboard dashboard (markets, memes, news, art, trading bot, Polymarket) | Live |
| Daily standup + day report (cross-agent, 800–1200 word narrative) | Running 2x/day |
| 102 tests pass, 0 fail, build clean, type check clean | Current |
| Base Builder Grant application submitted | In review |

Open source: [github.com/IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince). 420+ commits.

---

## The Medallion parallel (but honest)

We reference Renaissance in the README. Here's why, and where the analogy breaks:

**Where it holds:** Medallion's edge came from repeating small statistical advantages across thousands of instruments simultaneously. Tiny edges, captured over and over through rapid trades in highly liquid assets. That's exactly what the Polymarket desk does — Black–Scholes vs CLOB price, overreaction detection, model fair value — across binary markets. And what the perps bot does across BTC, ETH, SOL, HYPE. Same thesis: code finds edges humans can't process at scale.

**Where we're honest:** We don't have 30 years of returns. We don't have 300 PhDs. We have a paper trading bot that's accumulating data, an ML pipeline that demonstrably improves selectivity, and an edge engine that quantifies dislocations in prediction markets. The claim isn't "we are Medallion." The claim is: the architecture is right, the data is compounding, and the ML loop is real. We're at the stage where Medallion was when Jim Simons hired his first few physicists and started running patterns on commodities data — except we have better infrastructure, cheaper compute, and 24/7 crypto markets that never close.

The honest version: we need capital to go from paper to live, hire ML specialists, and prove the edge with real execution.

---

## Risk framework

You'll ask about this, so:

| Risk | Mitigation |
|------|-----------|
| Paper ≠ live (slippage, liquidity) | Phased rollout: paper → testnet → small live. Protection layers 3–5 (post-fill verification, exchange reconciliation, SL/TP validation). Single executor path — same code, paper or live. |
| ML on small N | Graceful degradation: rules run when models lack data. Minimum 90 trades for ONNX training. Feature store grows daily. Walk-forward validation, not just backtest. |
| Signal source dependency (X API, CoinGlass) | 15+ sources; Thompson Sampling naturally downweights unreliable sources. Cached fallbacks. No single source is fatal. |
| Execution risk (Otaku wallet) | Only one agent holds funds. Circuit breakers, daily caps ($200 paper, configurable live). No leverage without explicit mode. Producer/executor split enforced in code. |
| Regulatory | Paper trading only today. No advisory, no fund structure, no customer funds. Open source. |

---

## The ask

**$2M seed.**

- **Live execution infrastructure** — Hyperliquid perps (Phase 2 of the [PRD](PRD_LIVE_HYPERLIQUID_PERPS.md)), Polymarket CLOB execution, testnet validation.
- **ML depth** — Hire 1–2 ML engineers to build on the ONNX pipeline. More models, better features, regime detection, cross-asset correlation.
- **Data** — Upgrade API tiers (Nansen, CoinGlass, Santiment) for deeper signal coverage.
- **Six months of runway** — Prove live edge, then raise on results.

Projected return path: platform fees on execution, x402 API revenue, prediction market alpha, and the option value of a self-improving trading system that compounds its own edge.

---

## Why you, specifically

You spent years at a poker table learning that edge is perishable, sizing is everything, and tilt is the real enemy. Then you wrote about expected value and risk of ruin with more clarity than most quant textbooks. Then you built Dragonfly into the firm that backs DeFi infrastructure and takes the long view on crypto-native systems.

VINCE is a poker player's trading system. Kelly sizing. Source weighting that plays hot streaks and folds cold ones. A feature store that's the equivalent of keeping detailed session notes. An ML loop that's Bayesian updating after every hand. And a treasury mandate that says "cover your own rake before you play bigger."

The difference: this player never tilts, never sleeps, and gets measurably better with every session.

We'd rather have one conversation with someone who gets this intuitively than pitch 50 generalist funds. That's why we're writing to you.

---

## Appendix: supporting docs

For due diligence, everything is in the repo:

| Doc | What it proves |
|-----|---------------|
| [WORTH_IT_PROOF.md](WORTH_IT_PROOF.md) | Three pillars: ONNX validation (one-command proof), 24/7 research as ML prerequisite, knowledge = methodology |
| [TRADING_RUNTIME_CONTRACT.md](TRADING_RUNTIME_CONTRACT.md) | Producer/executor split, CRON vs manual, single execution path |
| [PRD_LIVE_HYPERLIQUID_PERPS.md](PRD_LIVE_HYPERLIQUID_PERPS.md) | Paper → live roadmap, phased, protection layers, EVClaw-informed |
| [FEATURE-STORE.md](FEATURE-STORE.md) | 50+ features per trade, JSONL + DB + Supabase, training pipeline |
| [PAPER-BOT-AND-ML.md](PAPER-BOT-AND-ML.md) | Full signal loop, MandoMinutes, training, improvement weights |
| [POLYMARKET_TRADING_DESK.md](POLYMARKET_TRADING_DESK.md) | Edge engine, three strategies, analyst → risk → executor |
| [TREASURY.md](TREASURY.md) | Cost mandate, ClawRouter, revenue strategies, money loop |
| [ONNX.md](ONNX.md) | Train once run anywhere, four models, portable inference |
| [grants/BASE-BUILDER-GRANT-APPLICATION.md](grants/BASE-BUILDER-GRANT-APPLICATION.md) | Otaku as execution agent, 13 actions, x402, shipped |
| [VINCE.md](VINCE.md) | Agent brief: can/can't, key files, gaps |
| [README.md](../README.md) | Full overview, five levels, team, getting started |

---

_No hype. No shilling. No timing the market. Just code that compounds._

_— Ikigai Labs_
