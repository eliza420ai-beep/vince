---
type: solus-options-sizing
private: true
description: >
  Sample fixture for Solus strategy improvement tests. Structure matches
  knowledge/private/solus-options-sizing.md. Used so tests run in CI without
  the real (gitignored) file.
---

## 2026-03-06 — Hypersurface Wheel Snapshot (fixture)

**Capital mandate:** All capital deployed on Hypersurface is intended to optimize for upfront premium (weekly option income). BTC, SOL, and HYPE on Hypersurface are not part of the core long-term portfolio.

**Weekly premium goal:** ~$3,000/week across BTC and HYPE positions.

### BTC — Covered Calls (active)

- asset: BTC
- venue: Hypersurface
- position_type: covered_calls
- contracts_btc: 2.037364
- strike_usd: 69500
- expiry_utc: 2026-03-06T08:00:00Z
- upfront_premium_usd: 1202.11
- weekly_premium_target_usd: 2000
- notes: >
  New weekly covered calls sold at $69,500; exp 3/6/26. Part of ~$3K/week target
  with HYPE puts and HYPE calls.
- current_plan: >
  Hold to expiry or manage if spot approaches strike. Roll or adjust if needed.
  Thursday evening review for early exercise; next cycle aim to keep BTC CC premium in line with weekly goal share.

### HYPE — Secured Puts + Covered Calls (active)

- asset: HYPE
- venue: Hypersurface
- position_type: covered_calls
- previous_position_type: secured_puts
- strike_usd: 30
- new_strike_usd: 30
- expiry_utc: 2026-03-06T08:00:00Z
- assigned_size_hype: 1367.762886
- upfront_premium_usd: 1396.86
- csp_size_this_week: 173.87685
- csp_premium_usd: 143.56
- notes: >
  Two legs exp 3/6/26: (1) New secured puts at $30 — size 173.88, premium $143.56.
  (2) Covered calls at $30 from prior assignment — size 1367.76, premium $1,396.86.
  Total HYPE premium this week ~$1,540. With BTC CC ~$1,202, combined ~$2,742 toward $3K/week goal.
- current_plan: >
  Monitor both legs. If CSP assigned, take delivery and can sell CC next cycle.
  If CC assigned above $30 we deliver HYPE and keep premium; then reopen CSP or CC as appropriate.

### SOL — Spot Stack (covered-calls candidate)

- asset: SOL
- venue: spot
- position_type: spot_stack
- notional_usd_at_entry: 200000
- entry_price_usd: 141
- approx_size_sol: 1418
- status: down_bad_vs_entry
- weekly_premium_target_usd: 2000
- current_plan: >
  This SOL stack is premium-seeking capital (not a core long-term hold).
  Use it for covered calls on Hypersurface when vols are healthy, or consider
  swapping into HYPE/BTC if that earns more upfront premium. OTM strikes to
  keep assignment odds manageable; goal is weekly income, not holding SOL.
- question_for_solus: >
  (1) Sell covered calls against this SOL stack for option income, or
  (2) Swap SOL into HYPE or BTC if Hypersurface shows better CC/CSP yields
  there — we optimize for upfront premium; BTC/SOL/HYPE on Hypersurface are
  not core holds, just the form the capital takes to earn weekly income.
