---
date: 2026-03-20T09:38:19.949Z
type: shared-daily-insights
---

# Shared Daily Insights — 2026-03-20

**Scorecard:** ✅ VINCE (neutral 0%) | ✅ Eliza | ✅ ECHO | ✅ Oracle | ✅ Solus (12 pos) | ✅ Otaku | ✅ Sentinel (shipped) | ⚠️ Forge | ✅ Clawterm | ✅ Naval

## TL;DR

Signal short at 90% confidence. Paper: 0 open. REGULATORY NOISE: Choppy ahead - trade smaller

**Conviction:** [======----] 6/10

---

## VINCE
### Delta vs Yesterday
Signal: neutral (0%) → short (90%)

| Asset | Price | Funding/LS | Regime |
|-------|-------|-----------|--------|
| BTC | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |
| SOL | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |
| HYPE | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |

**Signal (BTC):** short (90% conf, NewsSentiment)

**Paper:** No trades yet | 0 open, 0 pending

**ML Loop:** 1+ trades in feature store | SQ:60%

**Self-tuning:** minStr=4000% | minConf=3500% | AUTO-TUNED

**Portfolio:** $100000

**News:** REGULATORY NOISE: Choppy ahead - trade smaller
❗🔴 BTC ETFs: -$130m | ETH ETFs: -$56m (MandoMinutes) [BTC, ETH]
❗🔴 SEC approves Nasdaq tokenised equity pilot (coindesk)
❗🔴 UK lawmakers urge ban on crypto political donation (coindesk)
❗🔴 US considers deploying troops to secure Strait (reuters)
🟢 First official S&P 500 perp launched on HYPE (MandoMinutes) [HYPE]
Themes: other (21), regulatory (5), macro (5), institutional (2), security (1)

**Regime (BTC):** ranging ADX 15.0 | size 0.8x

---

## Eliza
**Yesterday TL;DR:** BTC shorts piling on at 46% conviction while ETF inflows keep flowing—watching $68K close for the re

**Essay Suggestion:** [LLM unavailable -- review recent uploads for a timely topic]

**Recent uploads (6):**
- 📄 **internal-docs:** WORKFLOW-ORCHESTRATION (2019 words) — Preview: > Adapted from the Fairmint AI-Led Development playbook. Codified for the VINCE multi-agent project. Quality of output is directly proportional to quality of input. No exceptions. - Every task file, e…
- 📝 **teammate:** SOUL (591 words) — Preview: Who we are, how we operate, what we stand for. Every agent in VINCE reads this before responding. We are a multi-agent system built around one thesis: a BTC-heavy portfolio with two counter-concentrat…
- 📝 **teammate:** THREE-CURVES (825 words) — Preview: The three curves define how work and capital flow through the VINCE system. Each curve has a different risk profile, time horizon, and agent responsibility. **What:** Perpetual futures on Hyperliquid.…
- 📝 **teammate:** MEMORY (823 words) — Preview: Persistent context that survives between sessions. Every agent reads this before starting work. Update after meaningful decisions, preference changes, or strategy shifts. _Last updated: 2026-03-18_ <!…
- 📝 **teammate:** NO-AI-SLOP (591 words) — Preview: Zero tolerance for generic LLM output. Every agent reads this.

---

## ECHO
**CT sentiment:** X API unavailable. Report from character knowledge only.

---

## Oracle
**Status:** No VINCE-priority markets found. Oracle discovery ready.

---

## Solus
**Today:** Friday, 2026-03-20. Hypersurface weekly options settle Friday ~09:00 Paris Time (08:00 UTC / 00:00 PT). TODAY IS SETTLEMENT DAY — old positions expire today. Focus on the NEW week's strike.

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
05c3b9ae feat(forge+solus): keep-or-revert for Solus strike ritual knobs
71debe7b chore(tasks): encode Claude workflow guardrails
8048d566 Make YES/NO data quality reliable
841a0f13 chore(standup+signals): update 2026-03-19 reports and similarity tuning
514ce396 docs(standup): update daily insights + metrics
efa24c12 feat(leaderboard): add YES/NO market risk gate tab
7561a1e7 docs(workflow): clarify AI-led dev orchestration checklist
a60f3d2f docs(otaku): document x402 stack + ERC-8183 roadmap
933e6727 feat(top100): add freshness + richer detail snapshots
a3f56ad3 fix(top100): bootstrap yahoo market cap cache

**Branch:** main (5 uncommitted)

**Shipped this week:** other: keep-or-revert for Solus strike ritual knobs, encode Claude workflow guardrails, Make YES/NO data quality reliable | leaderboard: add YES/NO market risk gate tab | top100: add freshness + richer detail snapshots, add AIHF draft compare layer, add live overlays, toolbar, detail drawer, and Yahoo quote cache

**Recent PRDs:** RECURSIVE_NORTH_STAR_ACCELERATION_RUNBOOK.md, PRD_YESNO_US_EQUITY_RISK_GATE_V2.md, PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md

---

## Forge
(no data)

---

## Clawterm
OpenClaw data: run CLAWTERM_DAY_REPORT in chat for full report; here report gateway status and one take from knowledge.

---

## Naval
**Frameworks:** Push not pull. Thesis first. Paper before live. One team, one dream.


---


## Cross-Agent Links

• VINCE signal neutral 0% — align with Solus strike
• Solus: Active options — prepare strike decision
• ML Loop: 1 trades in feature store


## Action Items

- **Focus:** VINCE signal neutral 0% + regime 0 — align Solus strike
- **Friday:** Solus — settlement day, next week's strike proposal