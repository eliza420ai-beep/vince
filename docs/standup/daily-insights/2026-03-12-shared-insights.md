---
date: 2026-03-12T09:27:49.519Z
type: shared-daily-insights
---

# Shared Daily Insights — 2026-03-12

**Scorecard:** ✅ VINCE (long 62%) | ✅ Eliza | ✅ ECHO | ✅ Oracle (9 mkts) | ✅ Solus (12 pos) | ✅ Otaku | ✅ Sentinel (shipped) | ⚪ Forge | ✅ Clawterm | ✅ Naval

## TL;DR

Fear & Greed 18 (extreme fear). BTC $69,638 +0.2%, SOL $85.517 +0.4%, HYPE $37.116 +7.7%. Signal long at 68% confidence. Paper: 36 open. MIXED RISK TAPE: Event-driven chop - size down

**Conviction:** [====------] 4/10 (fear extreme)

---

## VINCE
### Delta vs Yesterday
Signal: long (62%) → long (68%)

| Asset | Price | Funding/LS | Regime |
|-------|-------|-----------|--------|
| BTC | $69,638 +0.2% | F:-0.691% L/S:1.33 Vol:1.0x | bearish |
| SOL | $85.517 +0.4% | F:-0.064% L/S:2.39 Vol:1.0x | bearish |
| HYPE | $37.116 +7.7% | F:0.000% L/S:1.00 Vol:1.0x | bearish |

**Fear & Greed:** 18 (extreme fear)

**HIP-3:** bias mixed | hottest: commodities (2.5%) | rotation: neutral
Top: USOIL  | Worst: OPENAI  | GOLD vs BTC: tie winning (-0.2% vs +0.0%)
Crowded: longs RIVN

**Signal (BTC):** long (68% conf, CoinGlass, NewsSentiment, PolymarketSentiment +5 more)

**Paper:** 32W/46L $-796 | WR:100% PF:0.6 | 36 open, 0 pending

**ML Loop:** 1+ trades in feature store | SQ:49% |  (TP: 0:0%, 1:36%) [tuning: strength≥5600%, conf≥5000%]

**Self-tuning:** minStr=8800% | minConf=6000% | AUTO-TUNED

**Risk:** Day: $-796 (-93.8%) | 114 trades

**Portfolio:** $84387 | ret:-15.6% | 36 positions

**News:** MIXED RISK TAPE: Event-driven chop - size down
❗🟢 BTC ETFs: +$247m | ETH ETFs: +$13m (MandoMinutes) [BTC, ETH]
❗⚪ Goldman emerges as largest holder of XRP ETFs (MandoMinutes) [XRP]
❗🔴 S Korea prosecutors sell $21.5m seized BTC (MandoMinutes) [BTC]
❗⚪ Americans withdrawing from 401k at record rates (MandoMinutes)
❗🟢 Treasury buys back ATH $15b debt (MandoMinutes)
Themes: other (31), price (5), regulatory (3), institutional (2), defi (2)

**Liquidations (5m):** Longs | 2 long ($644k) / 2 short ($3k) | intensity 13%

**OI (24h Δ):** BTC $46.7B (+1.5%) | SOL $5.2B (+3.0%)

**Regime (BTC):** ranging ADX 19.0 | size 0.8x

---

## Eliza
**Yesterday:** Solus's call: Above — BTC covered calls ITM by 74 bps, buying back early to unlock collateral and roll higher rather than get assigned at $70,500.

**TL;DR:** Signal flipped long on extreme fear (index 15) but paper bot's down 83%, so we're sizing down until the range breaks clean.

**Essay idea:** "The AI Super-Cycle Has Begun — Why OpenClaw Timing Matters More Than NVDA Valuation"

**Research:** Macro regime detection — mechanical link between Fed surprises and session-specific funding spikes.

**TODO**
| WHAT | WHY | OWNER |
|------|-----|-------|
| Buy back BTC covered calls | ITM by 74 bps, assignment risk | @Solus |
| Roll to $71,500 strikes | Momentum still up post-buyback | @Solus |
| Fix wallet keys setup | Need operational DeFi execution | @Otaku |
| Push uncommitted diffs | 5 pending on main branch | @Sentinel |
| Ship Quick Start video | Users bail at networking setup | @Clawterm |
| Map OpenClaw to agentic-systems.md | Production patterns missing | @Eliza |
| Wait for ADX break above 20 | Range-bound until conviction returns | @Vince |

**Risk:** Paper bot accuracy 30% (target 50%+) — team should dial down confidence until performance improves.

**Wrap-up**
BTC ETFs pulled $247m while fear hit 15, classic bounce setup. Solus is managing the covered call assignment risk smart—buying back early beats getting stuck at worse strikes.

---

## ECHO
**CT sentiment:** X API unavailable. Report from character knowledge only.

---

## Oracle
**Priority Markets (+5 more):**
| Market | YES% | ID |
|-------|------|----|
| Will the Fed decrease interest rates by 50+ bps af… | 0% | `0xdeb6...c20` |
| Will the Fed increase interest rates by 25+ bps af… | 0% | `0x25aa...d38` |
| Will there be no change in Fed interest rates afte… | 99% | `0x257b...aed` |

**Strike Insight:** Use top markets for Hypersurface weekly strike confidence (Solus). Run EDGE_CHECK on BTC/ETH for signals.

---

## Solus
**Today:** Thursday, 2026-03-12. Hypersurface weekly options settle Friday ~09:00 Paris Time (08:00 UTC / 00:00 PT).

**Live spot (use these — do not guess):** [Hypersurface spot USD] BTC $69,697, ETH $2,042.81, SOL $85.56, HYPE $37.15

**⚠️ CRITICAL: Current positions this week:**
- **HYPE:** Secured puts, strike $30 (collected premium, holding USDT collateral)
- **BTC:** Covered calls, strike $70,500 (holding BTC, hoping it stays below strike)

**Before giving ANY advice, you must know: What assets do we have positions on? What are our strikes?**

This determines what we should focus on and whether to consider BUYING BACK early.


**Distance to strike:**
BTC: $69,697 vs $70,500 strike = 1.2% OTM

**Your job (DAILY MONITORING):** This is no longer just Friday expiry — we track DAILY because we can BUY BACK early to unlock collateral!

(1) Current position status: strike, premium, distance to strike.

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
4e91d449 fix: resolve type errors in agents and plugins
e79dfef3 feat: add forge backfill script + forge:backfill npm command
15e08a35 docs: update README shipped section + OpenRouter embedding fix
3f6fc1b7 fix EdgeEngine SQL + wire Forge signal cache + ship recursive autoresearch
8cc84cf9 Merge pull request #22 from eliza420ai-beep/satoshi/phase-8-compounding-edge
5cb543b7 Merge pull request #23 from eliza420ai-beep/satoshi/phase-11-portfolio-intelligence
9bcabcf0 Merge pull request #24 from eliza420ai-beep/feat/forge-mlx-autoresearch
7086f426 fix(pr-22): merge fork/main to resolve conflicts — phase 8 compounding edge
8e3f8f4d fix(pr-23): merge fork/main to resolve conflicts — phase 11 portfolio intelligence
fc5baf53 Merge PR #23: phase 11 portfolio intelligence + distribution moat

**Branch:** main (5 uncommitted)

**Shipped this week:** other: resolve type errors in agents and plugins, add forge backfill script + forge:backfill npm command, update README shipped section + OpenRouter embedding fix | sql: enhance index creation SQL to include IF NOT EXISTS

**Recent PRDs:** RECURSIVE_NORTH_STAR_ACCELERATION_RUNBOOK.md, PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md, PRD_REGIME_CONDITIONAL_BANDIT.md

**Macro news:**
The Fed's third rate cut of 2025 headlines a packed macro week that could shift crypto liquidity fast.

---

## Forge
(no agent in registry)

---

## Clawterm
OpenClaw data: run CLAWTERM_DAY_REPORT in chat for full report; here report gateway status and one take from knowledge.

---

## Naval
**Today's Naval:** **Agents are leverage on your thesis:** Write down why you're trading (thesis), then build agents that execute it while you sleep—the compounding happens when your edge runs on code, not your attention.

**Frameworks:** Push not pull. Thesis first. Paper before live.


---


## Cross-Agent Links

• VINCE signal long 62% — align with Solus strike
• Solus: BTC $69,697 vs $70,500 strike = 1.2% OTM → hold, let theta work
• HIP-3: GOLD underperforming BTC — neutral
• ML Loop: 1 trades in feature store


## Action Items

- **Focus:** VINCE signal long 62% + regime ranging — align Solus strike
- **Thursday:** Solus — pre-settlement check, early exercise risk, roll decision
- **Watchlist:** Oracle — Will the Fed decrease interest 0%
- **ML:** Signal quality 49% — review feature store, consider pausing auto-trades