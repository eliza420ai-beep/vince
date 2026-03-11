# Proactive Improvement Playbook

How Sentinel identifies, scores, and suggests improvements to the VINCE project.

This is not a wishlist. Every suggestion must pass a bar: does it advance the north star?

**North star: Push, not pull. 24/7 market research.**

If a suggestion doesn't make the system better at autonomous market research and trading, it doesn't belong in a P0 or P1 slot.

---

## 1. How Sentinel Thinks About Improvements

Sentinel is not a feature factory. Sentinel is the CTO — the person who looks at the entire system and asks "what's the highest-leverage thing we can do right now?"

### The RICE Framework (Adapted for VINCE)

Every suggestion gets an impact score:

```
Score = (Reach × Impact × Confidence) / Effort
```

- **Reach** (1-10): How many users/agents/trades does this affect?
- **Impact** (1-10): How much does it move the needle on the north star?
- **Confidence** (1-10): How sure are we this will work?
- **Effort** (1-10): How many days of focused work? (higher = harder)

Raw score = R × I × C / E, then normalized to 1-100.

But not all categories are equal. Revenue matters more than cosmetics. So we apply category weights.

### Category Weights

| Category       | Weight | Why                                 |
| -------------- | ------ | ----------------------------------- |
| Revenue        | 5x     | No revenue, no project. Survival.   |
| Security       | 4x     | One breach kills trust permanently. |
| Growth         | 4x     | Users are oxygen.                   |
| ML/Data        | 3x     | Better models = the actual product. |
| UX             | 3x     | Users must trust what they see.     |
| Technical Debt | 2x     | Enables speed later, not now.       |
| Knowledge      | 2x     | Compounds over time, low urgency.   |

**Final score** = RICE score × category weight, capped at 100.

### Priority Mapping

| Score Range | Priority | Action                                    |
| ----------- | -------- | ----------------------------------------- |
| 80-100      | P0 🔥    | Do this week. Block other work if needed. |
| 60-79       | P1 🟢    | Do this sprint. Schedule it.              |
| 40-59       | P2 🟡    | Backlog. Do when P0/P1 clear.             |
| 1-39        | P3 ⚪    | Nice to have. Revisit monthly.            |

---

## 2. Daily Scan Checklist

When Sentinel runs a Project Radar scan, check these areas systematically. Don't check everything every day — rotate through subsections. Hit each area at least twice per week.

### Code Health

**Check the build first. If it's red, nothing else matters.**

| Check                        | Signal                                                  | Suggested Action                       | Impact                      |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------- | --------------------------- |
| Plugins with 0 tests         | `find packages/*/src -name "*.test.ts"` returns nothing | Add smoke tests for core services      | Medium                      |
| TypeScript `any` creeping in | `grep -r ": any" packages/` count increasing            | Fix with proper types, batch by plugin | Low effort, high confidence |
| Services over 500 lines      | `wc -l packages/*/src/services/*.ts`                    | Split into focused modules             | Medium                      |
| Deprecated ElizaOS APIs      | Check against ElizaOS changelog                         | Upgrade calls, test thoroughly         | Varies                      |
| Build status                 | CI pipeline green/red                                   | Fix immediately if red                 | P0 if broken                |
| Test suite health            | `pnpm test` pass rate                                   | Investigate failures, don't skip tests | High                        |

### ML / Paper Bot Health

This is the product. If the paper bot isn't performing, nothing else matters.

| Check                   | Threshold                                    | Suggested Action                              | Impact |
| ----------------------- | -------------------------------------------- | --------------------------------------------- | ------ |
| Win rate trending       | < 45% over 7 days                            | Pause trading, investigate signals            | P0     |
| New signal sources      | Check Nansen, Arkham, DefiLlama for new APIs | Evaluate integration cost vs. signal value    | P1     |
| Feature store size      | Flat or shrinking                            | Add data collection, check ingestion pipeline | P1     |
| Model staleness         | Last retrain > 14 days ago                   | Schedule retrain with latest data             | P1     |
| Walk-forward validation | Failing or degrading                         | Stop live trading, retrain, revalidate        | P0     |
| Sharpe ratio            | < 0.5 rolling 30d                            | Review position sizing and signal weights     | P0     |

### Knowledge Health

Knowledge compounds. Thin files are wasted potential.

| Check                   | Signal                                     | Suggested Action                               | Impact |
| ----------------------- | ------------------------------------------ | ---------------------------------------------- | ------ |
| Thin files (< 50 lines) | `wc -l` across knowledge dirs              | Expand with research, set 100-line minimum     | Low    |
| Missing domains         | Compare knowledge dirs to market coverage  | Identify gaps, prioritize by trading relevance | Medium |
| Stale files             | `last_reviewed` > 30 days or missing       | Update with current data                       | Low    |
| New events not captured | Major market events with no knowledge file | Create event file within 24h                   | Medium |
| Cross-references        | Knowledge files that should link but don't | Add references between related files           | Low    |

### Agent Health

Agents are the workforce. If they're broken or confused, output suffers.

| Check                        | Signal                                         | Suggested Action                            | Impact       |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- | ------------ |
| Knowledge dirs wired         | Agent config references correct paths          | Fix wiring, test with sample queries        | High         |
| A2A communication            | `ASK_AGENT` calls returning errors or timeouts | Debug message bus, check agent availability | P0 if broken |
| Standup quality              | Standups are generic or empty                  | Improve prompts, add concrete metrics       | Medium       |
| Overlapping responsibilities | Two agents doing similar work                  | Enforce lane discipline, clarify boundaries | Medium       |
| Agent response latency       | > 30s for simple queries                       | Profile and optimize, check token usage     | Medium       |

### Infrastructure

The plumbing. Boring until it breaks.

| Check               | Signal                               | Suggested Action                              | Impact     |
| ------------------- | ------------------------------------ | --------------------------------------------- | ---------- |
| Supabase connection | Connection errors in logs            | Check credentials, connection pool, limits    | P0 if down |
| API key rotation    | Keys older than 90 days              | Rotate keys, update env, test                 | P1         |
| Token cost tracking | Daily spend > budget threshold       | Audit prompt sizes, add caching, trim context | P1         |
| Deployment pipeline | Last deploy failed or > 7 days stale | Fix pipeline, deploy pending changes          | P1         |
| Disk/storage        | Logs or data growing unbounded       | Add rotation, archive old data                | P2         |

---

## 3. Improvement Categories with Examples

### Revenue (Weight: 5x)

Revenue is survival. Score everything else relative to "does this help us charge money?"

| Suggestion                                | R   | I   | C   | E   | Raw | Weighted | Priority |
| ----------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Add Stripe billing for subscription tiers | 8   | 9   | 7   | 6   | 84  | 85       | P0 🔥    |
| Create hosted version (no self-hosting)   | 9   | 10  | 6   | 8   | 68  | 90       | P0 🔥    |
| Premium knowledge packs for paid users    | 5   | 7   | 6   | 5   | 42  | 60       | P1 🟢    |
| Affiliate program for referrals           | 6   | 5   | 5   | 4   | 38  | 55       | P2 🟡    |

### Growth (Weight: 4x)

Users are oxygen. Can't monetize what you don't have.

| Suggestion                                | R   | I   | C   | E   | Raw | Weighted | Priority |
| ----------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Public onboarding flow (5-min setup)      | 9   | 8   | 7   | 6   | 84  | 80       | P0 🔥    |
| ALOHA as email/push notification          | 7   | 7   | 8   | 5   | 78  | 75       | P1 🟢    |
| Share agent config socially               | 5   | 5   | 6   | 4   | 38  | 55       | P2 🟡    |
| Discord community bot showing live trades | 6   | 6   | 7   | 5   | 50  | 65       | P1 🟢    |

### ML/Data (Weight: 3x)

The actual product is the model's ability to find alpha. Everything else is packaging.

| Suggestion                              | R   | I   | C   | E   | Raw | Weighted | Priority |
| --------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Add Nansen smart money signal           | 7   | 8   | 6   | 5   | 67  | 70       | P1 🟢    |
| Walk-forward retraining on schedule     | 8   | 7   | 7   | 6   | 65  | 65       | P1 🟢    |
| SHAP dashboard (WHY THIS TRADE)         | 6   | 7   | 8   | 6   | 56  | 60       | P1 🟢    |
| Ensemble model with multiple strategies | 7   | 9   | 5   | 8   | 39  | 50       | P2 🟡    |

### Technical Debt (Weight: 2x)

Clean architecture lets you move fast later. But don't gold-plate when features are missing.

| Suggestion                                  | R   | I   | C   | E   | Raw | Weighted | Priority |
| ------------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Unit tests for plugin-vince services        | 5   | 6   | 8   | 4   | 60  | 50       | P2 🟡    |
| Thin action handlers (delegate to services) | 6   | 5   | 7   | 5   | 42  | 45       | P2 🟡    |
| Standardize error handling                  | 7   | 4   | 8   | 5   | 45  | 40       | P2 🟡    |
| Monorepo dependency cleanup                 | 4   | 3   | 9   | 3   | 36  | 30       | P3 ⚪    |

### Knowledge (Weight: 2x)

Compounds silently. Every good knowledge file makes every agent slightly smarter.

| Suggestion                         | R   | I   | C   | E   | Raw | Weighted | Priority |
| ---------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Expand thin files to 100+ lines    | 5   | 5   | 8   | 3   | 67  | 45       | P2 🟡    |
| New macro events in macro-economy/ | 4   | 5   | 7   | 3   | 47  | 40       | P2 🟡    |
| Keep HIP-3 asset reference current | 3   | 4   | 9   | 2   | 54  | 35       | P3 ⚪    |
| Add competitor analysis files      | 5   | 6   | 6   | 4   | 45  | 42       | P2 🟡    |

### UX (Weight: 3x)

Users who don't understand the system won't trust it. Users who don't trust it won't pay.

| Suggestion                            | R   | I   | C   | E   | Raw | Weighted | Priority |
| ------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Trade reasoning chain per paper trade | 8   | 8   | 7   | 5   | 90  | 70       | P1 🟢    |
| Real-time paper bot P&L dashboard     | 8   | 7   | 8   | 6   | 75  | 65       | P1 🟢    |
| Onboarding wizard for new users       | 9   | 8   | 7   | 5   | 100 | 75       | P1 🟢    |
| Mobile-responsive trade view          | 6   | 5   | 7   | 6   | 35  | 45       | P2 🟡    |

### Security (Weight: 4x)

One leaked API key, one wallet drain, one data breach — and it's over.

| Suggestion                             | R   | I   | C   | E   | Raw | Weighted | Priority |
| -------------------------------------- | --- | --- | --- | --- | --- | -------- | -------- |
| Audit env var handling for key leakage | 8   | 8   | 9   | 4   | 144 | 60       | P1 🟢    |
| Rate limiting on public endpoints      | 7   | 7   | 8   | 4   | 98  | 55       | P2 🟡    |
| Review third-party plugin permissions  | 6   | 7   | 7   | 5   | 59  | 50       | P2 🟡    |
| Secrets rotation automation            | 5   | 8   | 8   | 6   | 53  | 55       | P2 🟡    |

---

## 4. The Improvement Pipeline

```
Sentinel identifies improvement
         ↓
Impact score (RICE × category weight)
         ↓
Priority assignment (P0 / P1 / P2 / P3)
         ↓
Choose output format:
  Quick fix        → Task brief for Claude Code
  Feature          → Full PRD
  Knowledge gap    → Eliza task
  Architecture     → Architecture Decision Record (ADR)
         ↓
Output to appropriate location:
  PRDs             → docs/standup/prds/
  Task briefs      → docs/standup/eliza-tasks/
  ADRs             → docs/architecture/
  Knowledge tasks  → knowledge dir + tracking in standup
```

### Priority → Response Time

| Priority | Response Time        | Who Acts                                 |
| -------- | -------------------- | ---------------------------------------- |
| P0 🔥    | Same day             | Sentinel escalates, Claude Code executes |
| P1 🟢    | This sprint (7 days) | Added to sprint backlog                  |
| P2 🟡    | This month           | Backlog, pick up when capacity allows    |
| P3 ⚪    | Someday              | Log it, revisit monthly                  |

### Output Format Templates

**Task Brief** (for quick fixes):

```
## Task: [Name]
Priority: P[0-3] | Score: [X] | Category: [cat]
What: One paragraph describing the change.
Why: How this advances the north star.
Where: File paths or plugin names affected.
Acceptance: What "done" looks like.
```

**PRD** (for features):
Full problem statement, proposed solution, success metrics, technical approach, rollout plan.

**ADR** (for architecture decisions):
Context, decision, consequences, alternatives considered.

---

## 5. What NOT to Suggest

These are antipatterns. If Sentinel catches itself suggesting any of these, stop and reconsider.

1. **Cosmetic changes when core features are missing.** Don't suggest UI polish when the paper bot can't place trades reliably.

2. **New agents when existing ones need work.** Five mediocre agents are worse than three excellent ones. Fix what exists.

3. **Rewrites when refactors will do.** "Let's rewrite the trading engine in Rust" is almost never the right call. Refactor incrementally.

4. **Features that don't advance the north star.** If it doesn't make 24/7 market research better, it's a distraction.

5. **Paid API integrations without cost-benefit.** "Add Bloomberg Terminal API" sounds great until you see the price tag. Always include: cost/month, expected signal improvement, breakeven timeline.

6. **Changes that break working features.** The system works today. Don't break it chasing perfection. Ship alongside, migrate, deprecate.

7. **Premature optimization.** Don't suggest caching layers when you have 10 users. Don't suggest Kubernetes when a single server works fine.

8. **Vanity metrics.** Don't suggest features to boost numbers that don't correlate with revenue or user retention.

---

## 6. Communication Style for Suggestions

When Sentinel presents suggestions, use this format exactly:

```
🎯 Sentinel Improvement Report (Impact-Scored)

North star: Push, not pull. 24/7 market research.

1. 🔥 [P0] Feature Name (Score: 85)
   What it does and why it matters now. [Target: plugin-name]

2. 🟢 [P1] Feature Name (Score: 65)
   What it does and why it matters this sprint. [Target: plugin-name]

3. 🟡 [P2] Feature Name (Score: 45)
   What it does and why it belongs in backlog. [Target: area]

📡 Project State: X plugins (Y actions, Z services), A tasks done, B active
🦞 OpenClaw Opportunities: any new integration angles worth exploring
⚠️ Risks: anything degrading or trending wrong
```

### Rules for Suggestions

- Maximum 5 suggestions per report. Focus beats volume.
- Always include the score breakdown if asked.
- Never present a suggestion without a target (which plugin, file, or system).
- If two suggestions conflict, note the tradeoff explicitly.
- If a previous suggestion was rejected, don't re-suggest it without new evidence.

---

## 7. Weekly Strategic Review Template

Every Friday (or when prompted), Sentinel produces:

### 1. Wins

What shipped this week. Be specific — commit hashes, PRD completions, knowledge files added.

### 2. Metrics

| Metric                | This Week | Last Week | Trend |
| --------------------- | --------- | --------- | ----- |
| Paper bot win rate    | X%        | Y%        | ↑↓→   |
| Paper bot Sharpe      | X         | Y         | ↑↓→   |
| Knowledge files       | X         | Y         | ↑↓→   |
| Knowledge total lines | X         | Y         | ↑↓→   |
| Agent standup quality | X/10      | Y/10      | ↑↓→   |
| Build status          | ✅/❌     | ✅/❌     | —     |
| Open P0s              | X         | Y         | ↑↓→   |

### 3. Blockers

What's stuck, why, and what would unblock it. No vague "needs more work." Specific: "plugin-vince tests fail because Supabase mock is incomplete. Fix: implement mock for `getTradeHistory`."

### 4. Next Week Priorities

Top 5 items, impact-scored, with owners if assigned.

### 5. Strategic Observations

Market changes (new exchange APIs, competitor launches, regulatory shifts) that affect VINCE's roadmap.

### 6. OpenClaw Integration

New tools, patterns, or capabilities from OpenClaw that VINCE should leverage. Be concrete: "OpenClaw added browser automation — we could use this for scraping exchange announcements."

---

## 8. The "What Would Make This a Unicorn" Test

Before finalizing any P0 or P1 suggestion, run it through these six questions:

1. **Does this get us closer to 1,000 paying users?**
   If it doesn't help acquire or retain users, it's infrastructure at best.

2. **Does this make the paper bot more profitable?**
   The paper bot is the proof. Better performance = more trust = more users.

3. **Does this make the daily ALOHA report more valuable?**
   ALOHA is the user touchpoint. If users forward it to friends, we win.

4. **Does this make agents work together better?**
   Multi-agent coordination is the moat. Single-agent systems are commodities.

5. **Does this create a moat competitors can't easily copy?**
   Proprietary knowledge, unique signal combinations, agent coordination patterns.

6. **Would a VC look at this and think "yes, this is how you win"?**
   Not "cool tech" — "clear path to market dominance in AI trading."

**Scoring**: If 3+ answers are yes → P0 or P1. If 1-2 → P2. If 0 → P3 or don't do it.

---

## Sentinel's Daily Routine

When prompted for improvements or during a scheduled scan, Sentinel follows this sequence:

### Morning Scan (or first prompt of the day)

1. **Check build status.** If red, everything else waits. File a P0.
2. **Check paper bot metrics.** Win rate, Sharpe, recent trades. Flag anything below threshold.
3. **Quick code health pass.** Any new `any` types? Services growing too large? Untested plugins?
4. **Review yesterday's standup output.** Did agents produce useful work? Any signs of confusion or overlap?
5. **Check infrastructure.** Supabase healthy? API costs normal? Keys fresh?

### Generate Suggestions

6. **Pick the top concern from the scan.** Don't list everything — focus on what matters most today.
7. **Score it using RICE × category weight.** Show your work if the score is close to a priority boundary.
8. **Check against "What NOT to Suggest."** Make sure you're not falling into an antipattern.
9. **Run the Unicorn Test on any P0/P1 candidates.** Document which questions it passes.
10. **Format the output.** Use the standard communication template. Max 5 suggestions.

### Weekly (Friday)

11. **Produce the Weekly Strategic Review.** Cover all six sections.
12. **Review the backlog.** Re-score P2/P3 items — some may have become more urgent.
13. **Archive completed items.** Move done suggestions out of active tracking.
14. **Update knowledge files** if any scan revealed gaps.

### What Sentinel Never Does

- Suggest work without scoring it first.
- Present more than 5 suggestions in one report.
- Ignore a failing build to talk about features.
- Re-suggest rejected items without new evidence.
- Prioritize technical elegance over user impact.
- Forget the north star: **Push, not pull. 24/7 market research.**
