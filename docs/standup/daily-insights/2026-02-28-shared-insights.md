---
date: 2026-02-28T01:46:33.157Z
type: shared-daily-insights
---

# Shared Daily Insights — 2026-02-27

**Scorecard:** ✅ VINCE (long 65%) | ✅ Eliza | ✅ ECHO (Bullish CT) | ✅ Oracle (9 mkts) | ✅ Solus (12 pos) | ✅ Otaku | ✅ Sentinel (shipped) | ✅ Clawterm | ✅ Naval

## TL;DR

Fear & Greed 13 (extreme fear). BTC $65,593 -2.7%, SOL $81.46 -5.5%, HYPE $27.258 -3.7%. Signal long at 88% confidence. Paper: 3 open. MIXED RISK TAPE: Event-driven chop - size down

**Conviction:** [===-------] 3/10 (fear extreme, low alignment)

---

## VINCE
### Delta vs Yesterday
Signal: long (65%) → long (88%)

| Asset | Price | Funding/LS | Regime |
|-------|-------|-----------|--------|
| BTC | $65,593 -2.7% | F:0.214% L/S:2.23 Vol:1.0x | bearish |
| SOL | $81.46 -5.5% | F:0.088% L/S:2.93 Vol:1.0x | bearish |
| HYPE | $27.258 -3.7% | F:0.000% L/S:1.00 Vol:1.0x | bearish |

**Fear & Greed:** 13 (extreme fear)

**HIP-3:** bias mixed | hottest: commodities (2.7%) | rotation: neutral
Top: NFLX  | Worst: CRCL  | GOLD vs BTC: gold winning (+1.7% vs +0.0%)

**Signal (BTC):** long (88% conf, CoinGlass, NewsSentiment, XSentiment)

**Paper:** 0W/2L $-134 | WR:0% | 3 open, 0 pending

**ML Loop:** 1+ trades in feature store | SQ:60%

**Self-tuning:** minStr=8500% | minConf=8500% | AUTO-TUNED

**Risk:** Day: $-134 (-13.7%) | 5 trades

**Portfolio:** $97831 | ret:-216.9% | 3 positions

**News:** MIXED RISK TAPE: Event-driven chop - size down
❗🟢 BTC ETFs: +$507m | ETH ETFs: +$157m (MandoMinutes) [BTC, ETH]
❗🟢 Crypto rallies on 3 week high ETF inflows (MandoMinutes)
❗🔴 Hacker uses Claude to steal Mexico tax data (MandoMinutes)
⚪ Top Gainers: DOT, KAS, UNI, NEAR, ICP (MandoMinutes) [DOT]
⚪ Indiana’s BTC rights bill heads for final sign-off (MandoMinutes) [BTC]
Themes: other (19), price (6), regulatory (4), institutional (2), macro (2)

**OI (24h Δ):** BTC $43.9B (-2.5%) | SOL $5.0B (-4.3%)

**Regime (BTC):** trending ADX 25.5 | size 1x

---

## Eliza
**Yesterday TL;DR:** Fear index hit 13 (extreme) but ETF inflows still green—classic reversal setup brewing while Vince f

**Essay Suggestion:** Write: "The AI Skill Arbitrage: Why System Architecture Beats Prompt Engineering" — hook: Most people learning AI are learning the wrong thing. The edge isn't prompts, it's designing how AI, data, and humans fit together. Based on upload: AI-SKILLS-2027 (the non-coding skill lanes that compound).

**Knowledge gap:** Update knowledge/ai-agents/CONTEXT-ENGINEERING.md — add section on RAG hygiene for live trading systems (how to keep market data, funding rates, and order flow fresh in context without hallucination risk, informed by solus-options-sizing patterns).

**Research:** How do covered-call sizing rules in solus-options-sizing (venue: Hypersurface, 2 BTC contracts) scale across macro regimes (high vol vs compression)? Cross-reference with perps-trading/ session filters to see if EU/US overlap 1.1x applies to options premium capture.

**Recent uploads (4):**
- 📋 **private:** solus-options-sizing (355 words) — Preview: - venue: Hypersurface - position_type: covered_calls - contracts_btc: 2
- 📝 **ai-agents:** AI-SKILLS-2027 (1385 words) — Preview: Most people are worried about AI taking jobs. The edge is learning the narrow set of skills that become more valuable *because* AI exists.

---

## ECHO
## ECHO — CT Pulse

| Asset | Sentiment | Narrative | Signal |
|-------|-----------|-----------|--------|
| BTC | Bullish w/ caution | Institutional inflows (BlackRock $275M+) vs. selling pressure near $70K; ETF momentum offsetting leverage flush | LEAN LONG |
| ETH | Neutral-to-bearish | Below $2K support, down 2.83% in 24h; holding but under pressure amid risk-off | WAIT |
| SOL | Neutral | Minimal CT chatter; no clear directional bias | AVOID |
| HYPE | Neutral | Low signal; meme-season noise dominates (excluded from analysis) | AVOID |

**Contrarian:** Fear & Greed Index at 13–16 (Extreme Fear) is historically a contrarian buy setup. Institutional buying (BlackRock, spot ETF inflows $254M+) suggests smart money is accumulating into weakness — retail panic may be overdone.

**Edge:** BTC holding weekly gains despite dips + institutional accumulation into Extreme Fear = classic capitulation buy. ETH weakness is the real risk; watch $1,950 support.

**Takeaway:** Lean long BTC on institutional tailwinds into fear; avoid ETH until it stabilizes above $2K. Meme noise is irrelevant — focus on macro setup.
> **Latest WTT:** Silver breaks out on industrial demand while gold stalls on dollar strength - SILVER outperforms GOLD this week


---

## Oracle
**Priority Markets (+5 more):**
| Market | YES% | ID |
|-------|------|----|
| Will Trump nominate Judy Shelton as the next Fed c… | 4% | `0x46d4...adf` |
| Will the Fed decrease interest rates by 50+ bps af… | 0% | `0xdeb6...c20` |
| Will the Fed increase interest rates by 25+ bps af… | 0% | `0x25aa...d38` |

**Strike Insight:** Use top markets for Hypersurface weekly strike confidence (Solus). Run EDGE_CHECK on BTC/ETH for signals.

---

## Solus
**Today:** Friday, 2026-02-28. Hypersurface weekly options settle Friday ~09:00 Paris Time (08:00 UTC / 00:00 PT). TODAY IS SETTLEMENT DAY — old positions expire today. Focus on the NEW week's strike.

**⚠️ CRITICAL: Current positions this week:**
- **HYPE:** Secured puts, strike $30 (collected premium, holding USDT collateral)
- **BTC:** Covered calls, strike $70,500 (holding BTC, hoping it stays below strike)

**Before giving ANY advice, you must know: What assets do we have positions on? What are our strikes?**

This determines what we should focus on and whether to consider BUYING BACK early.


**Your job (FRIDAY — settlement day):** Old positions settle today at ~09:00 Paris Time. (1) Final status of expiring position if any. (2) Propose NEXT WEEK's BTC covered call strike for Hypersurface (new weekly cycle starts now, settles next Friday ~09:00 Paris Time). State: strike price, direction (above/below), premium target, invalidation level.

---

## Otaku
**Status:** Under construction -- no wallet execution yet.

**Steps to get operational:**
1. Configure Bankr wallet (Base + Solana) -- set EVM_PRIVATE_KEY and SOLANA_PRIVATE_KEY in .env
2. Test with plugin-evm / plugin-solana: simple token balance check
3. Once balance check works, enable DefiLlama yield scanning (already loaded)

**Today's task:** Complete step 1 -- generate or import wallet keys and verify Bankr connection. Report: wallet address, chain, balance.

---

## Sentinel
Recent code (git log --oneline):
1154fa10 LFG
a9e9277c chore: add regime buckets to swarm replay metrics
5523e012 LFG
4321570c feat: gate swarm tuning and document live execution graduation
ccde46f3 feat: ingest postmortems and tighten solus wheel
5138a47d feat: tighten swarm claims and add e2e testing
052478e2 docs: PRD for regime-conditional bandit
797d6d84 docs: deep-dive release notes for 2026-02-26 swarm intelligence day
a8be93a9 docs: add Phase 13 swarm intelligence milestone to README
d331e39d fix: restore agent runtime after bad merge

**Branch:** main (5 uncommitted)

**Shipped this week:** other: LFG, add regime buckets to swarm replay metrics, LFG | vince: implement multi-agent swarm learning with Thompson Sampling

**Recent PRDs:** PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md, PRD_REGIME_CONDITIONAL_BANDIT.md, PRD_POST_MORTEM_LEARNING_SYSTEM.md

**Macro news:**
It signals that the Fed is trying to slow down inflation or prevent the economy from overheating. For crypto, it may lead to short-term bearish sentiments:
We've seen this play out time and again – periods of aggressive Fed rate hikes often coincide with significant downturns in the crypto market.
After three interest rate cuts in the last half of 2025, the Fed appears poised to hold rates steady for the first quarter of 2026. Economic

---

## Clawterm
OpenClaw setup guides are dominating—Reddit's "Ultimate Setup" hit 139 upvotes, freeCodeCamp dropped a 1-hour comprehensive course (local install → skills → security), and Sid Saladi's Substack is driving serious traction with "OpenClaw 101" and full setup walkthroughs. Builders are moving from chatbots to autonomous agents; the shift is real and the community is hungry for concrete tutorials on skills installation, memory management, and VPS hosting for 24/7 workflows.

**Ops Next:** Build a **Skills Discovery Dashboard** (Next.js, hosted on Gateway) that surfaces trending skills from ClawHub, shows install commands, and displays real use cases (Gmail automation, GitHub sync, Notion integration). Make it the go-to reference when builders ask "what skills should I install?"
**Sprint candidate?** Yes — cross-link to Sentinel.

---

## Naval
**Today's Naval:** **Agents are leverage for your thesis:** Build one agent that executes your signal while you sleep, not ten agents you babysit. Your edge compounds when the machine runs your judgment, not when you run the machine.

**Frameworks:** Push not pull. Thesis first. Paper before live.


---


## Cross-Agent Links

• VINCE signal long 65% — align with Solus strike
• ECHO bullish CT aligns with VINCE long — higher confidence
• Solus: Active options — prepare strike decision
• HIP-3: GOLD outperforming BTC — neutral
• Clawterm → Sentinel: Build a **Skills Discovery Dashboard** (Next.js, hosted on G = sprint candidate
• ML Loop: 1 trades in feature store


## Action Items

- **Focus:** VINCE signal long 65% + regime 0 — align Solus strike
- **Friday:** Solus — settlement day, next week's strike proposal
- **Watchlist:** Oracle — Will Trump nominate Judy Shelt 4%
- **Alert:** Extreme fear (13) — review contrarian playbook, watch for reversal signals