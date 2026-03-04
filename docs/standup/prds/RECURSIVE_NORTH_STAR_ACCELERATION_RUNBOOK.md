# Recursive North Star Acceleration Runbook

This runbook defines the operational SLOs and daily checklist used to burn down blockers in the Recursive North Star dashboard.

## Blocker SLOs

| Pillar | Blocker | SLO target | Owner loop |
| --- | --- | --- | --- |
| Recursion | `sample_count_below_20` | `sampleCount >= 20` in 30d window | Paper trading cadence + close hygiene |
| Recursion | `time_coverage_below_7d` | `timeCoverageDays >= 7` | Sustain closes across week, not bursts |
| Recursion | `regime_depth_below_5` | `minRegimeSampleCount >= 5` | Balance entries by active regime |
| Recursion | `allocator_summary_unavailable` | Summary present on every route hit | Allocator task/service uptime |
| ML | `no_models_loaded` | `modelCount > 0` for 3 consecutive days | Training + model artifact integrity |
| ML | `weight_bandit_not_ready` | `banditReady=true` for 3 consecutive days | Bandit state recovery and persistence |
| Synergy | `swarm_not_beating_single_agent` | `upliftDelta > 0` sustained 7d | Improve swarm contribution quality |
| Synergy | `causal_sample_depth_below_12` | `minSamplesPerArm >= 12` | Increase balanced per-arm outcomes |
| Synergy | `causal_promotion_not_eligible` | `promotionEligible=true` at thresholds | Maintain effect + sample quality |

## Daily Operator Checklist

1. Query `/vince/recursive-north-star` and record blocker keys by pillar.
2. Query `/vince/paper` and confirm allocator summary, bandit readiness, and model count.
3. Validate attribution freshness:
   - Closed-trade count moving up in 30d window.
   - At least two regimes represented.
   - No single regime dominating all recent closes.
4. Validate stage coverage for causal pairs:
   - Outcomes exist for `onnx_enabled`.
   - Outcomes exist for `onnx_plus_swarm`.
   - Outcomes exist for `onnx_plus_swarm_plus_adversary`.
5. If ML blockers present:
   - Check model directory and training metadata.
   - Run or inspect `TRAIN_ONNX_WHEN_READY` output.
   - Confirm bandit state file readable.
6. If synergy blockers present:
   - Inspect pair-level `failureReason`, `controlCount`, `treatmentCount`, `ciLower`.
   - Prioritize balanced per-arm collection before threshold changes.
7. Keep allocator mode staged (`recommendation` first). Only move to guarded auto when causal and uplift gates hold.

## Weekly Exit Gates

- Milestone A (3d): recursion blockers clear for 3 consecutive days.
- Milestone B (3d): ML blockers clear for 3 consecutive days.
- Milestone C (7d): synergy blockers clear and north-star synergy proof stable for 7 consecutive days.
