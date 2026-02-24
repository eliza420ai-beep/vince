# Weekly Agent Scorecard

Track the system, not just individual PRs.

Use this every week (Mon-Sun) to measure throughput, quality, leverage, and spend across your Opus + Codex workflow.

## Header

- Week:
- Owner:
- Total model budget target:
- Codex budget target:
- Opus budget target:

## 1) Throughput

- Tasks spawned:
- PRs opened:
- PRs merged:
- Median lead time (spawn -> merge):
- P90 lead time:

## 2) Quality

- First-pass CI success rate = `PRs passing CI on first run / total PRs`
- Review rejection rate = `PRs sent back / total PRs`
- Revert or hotfix rate (7d) = `(reverts + hotfix PRs) / merged PRs`
- Escaped defects (prod issues linked to recent PRs):

## 3) Human Leverage

- Human minutes per merged PR:
- Percent merged same day:
- Percent completed without redirect:
- Average redirects per task:

## 4) Model Economics

- Codex spend:
- Opus spend:
- Total spend:
- Cost per merged PR = `total spend / merged PRs`
- Cost per first-pass accepted PR = `total spend / PRs that passed CI first run and were not rejected`
- Token waste estimate = `spend on abandoned or restarted tasks`

## 5) Routing Health

- Correctly routed on first try:
- Misrouted tasks:
- Top 3 misroute reasons:
  - 1.
  - 2.
  - 3.
- Routing matrix updates made this week:

## 6) Reliability

- Agent crash count:
- Session drop count:
- CI flake count:
- Tooling downtime (minutes):

## 7) Business Link

- Features shipped tied to revenue:
- Request -> shipped median time:
- MRR impact from shipped work:
- Agency delivery SLA met (Y/N):

## KPI Targets (Starting Baseline)

- First-pass CI success: `>= 70%`
- Review rejection: `<= 20%`
- Same-day merges: `>= 50%`
- Revert/hotfix rate: `<= 5%`
- Human minutes per PR: down `>= 15%` month over month
- Cost per merged PR: flat or down while quality holds

## Weekly Review Ritual (30 Minutes)

1. Pull numbers from git, CI, and billing dashboards.
2. Identify one bottleneck with highest business impact.
3. Choose one system fix for next week.
4. Add one concrete change to routing or DoD template.
5. Assign owner and deadline.

## Week Summary Template

```text
What improved:
- ...

What regressed:
- ...

Main bottleneck:
- ...

System fix for next week:
- ...

Expected impact:
- ...
```
