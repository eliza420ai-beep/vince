---
date: 2026-03-17T21:05:17.186Z
type: shared-daily-insights
---

# Shared Daily Insights — 2026-03-17

**Scorecard:** ✅ VINCE (neutral 0%) | ✅ Eliza | ✅ ECHO | ✅ Oracle | ✅ Solus (9 pos) | ✅ Otaku | ✅ Sentinel (shipped) | ⚠️ Forge | ✅ Clawterm | ✅ Naval

## TL;DR

Signal neutral at 0% confidence. Paper: 0 open. NEWS: No data yet - run MANDO_MINUTES to fetch

**Conviction:** [====------] 4/10 (signal weak)

---

## VINCE
| Asset | Price | Funding/LS | Regime |
|-------|-------|-----------|--------|
| BTC | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |
| SOL | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |
| HYPE | N/A +0.0% | F:0.000% L/S:1.00 Vol:1.0x | neutral |

**Signal (BTC):** neutral (0% conf, 0 sources)

**Paper:** No trades yet | 0 open, 0 pending

**ML Loop:** SQ:60%

**Self-tuning:** minStr=4000% | minConf=3500% | AUTO-TUNED

**Portfolio:** $100000

**News:** NEWS: No data yet - run MANDO_MINUTES to fetch

**Regime (BTC):** ranging ADX 15.0 | size 0.8x

---

## Eliza
**Yesterday TL;DR:** BTC broke above our strike, Fed's locked at hold, buying back the call early to reset higher.

**Essay Suggestion:** [LLM unavailable -- review recent uploads for a timely topic]

**Recent uploads:** No new uploads in last 48h.

---

## ECHO
**CT sentiment:** X API unavailable. Report from character knowledge only.

---

## Oracle
**Status:** No VINCE-priority markets found. Oracle discovery ready.

---

## Solus
**Today:** Tuesday, 2026-03-17. Hypersurface weekly options settle Friday ~09:00 Paris Time (08:00 UTC / 00:00 PT).

**⚠️ CRITICAL: Current positions this week:**
- **HYPE:** Secured puts, strike $30 (collected premium, holding USDT collateral)
- **BTC:** Covered calls, strike $70,500 (holding BTC, hoping it stays below strike)

**Before giving ANY advice, you must know: What assets do we have positions on? What are our strikes?**

This determines what we should focus on and whether to consider BUYING BACK early.


**Your job:** Given last week's position (above), propose this week's BTC covered call strike for Hypersurface (settle Friday ~09:00 Paris Time).
State: strike price, direction (above/below), premium target, invalidation level.
Reference the live spot prices above when present; otherwise VINCE's DVOL, funding, and regime. Reference Oracle's odds.
If uncertain (like last week), say so and explain why with data.

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
a3f56ad3 fix(top100): bootstrap yahoo market cap cache
df96bb14 feat(top100): add AIHF draft compare layer
09562fc2 fix(types): resolve TS errors in agents and plugins for core types
ddf247a8 Portfolio-driven Top100 tab + Forge init guard
d81483f3 Top100 data coverage: Yahoo/FD prewarm, 1D fallback, profile cache, telemetry; fix type-check
b58c4ad6 feat(top100): add live overlays, toolbar, detail drawer, and Yahoo quote cache
18b82290 feat(leaderboard): surface Unbias consensus on News tab
fdfdce1d Add .claude/rules/ with path-specific glob rules
605fed5e chore: add TOP100.md, update trade-attribution and USOIL post-mortem
ba862751 chore: add docs, standup outputs, and watchlist data

**Branch:** main (5 uncommitted)

**Shipped this week:** other: bootstrap yahoo market cap cache, resolve TS errors in agents and plugins for core types, Portfolio-driven Top100 tab + Forge init guard | top100: add AIHF draft compare layer, add live overlays, toolbar, detail drawer, and Yahoo quote cache | leaderboard: surface Unbias consensus on News tab | discovery: tastytrade preset alignment — glossary + tags

**Recent PRDs:** RECURSIVE_NORTH_STAR_ACCELERATION_RUNBOOK.md, PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md, PRD_REGIME_CONDITIONAL_BANDIT.md

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
• ML Loop: ONNX / feature store active


## Action Items

- **Focus:** VINCE signal neutral 0% + regime 0 — align Solus strike
- **Solus:** Monitor options — hold / buy back / roll decision