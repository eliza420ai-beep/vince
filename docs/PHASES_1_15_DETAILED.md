# VINCE Phases 1-15 (Detailed Narrative)

If you want the fast summary, use `README.md` under **What We Built: 15 Phases, One System**. This page is the longer story of what changed and why each stage mattered.

---

## Where we started

VINCE began with strong individual agents, but weak collaboration. Insights were trapped inside each agent, handoffs were manual, and losses repeated because the system had no shared memory of mistakes. We were getting answers, but not compounding learning.

Phases 1 through 4 solved that foundation problem. We wired agent handoffs, added shared scorecards, brought sentiment and regime context directly into trading decisions, and introduced recurring operating rhythm. The goal in this stage was simple: stop losing information between agents and create a single picture of performance.

## How the system learned to improve itself

Phases 5 and 6 changed the project from "automated workflows" into a self-improving trading engine. The strategy genome made parameters evolvable instead of fixed. Counterfactual replay told us what would have happened under different thresholds. Then the adversary layer forced every trade and promotion to survive stress before it could graduate.

This was the point where confidence stopped being enough. A setup could look good and still fail if it did not hold up under downside checks and counter-thesis pressure.

## Making quality visible across the whole stack

Phases 7 through 9 focused on measurement quality. Calibration became a first-class output, not an internal detail. Research lineage connected source inputs to trade outcomes. Skills moved from hidden prompting to governed execution with telemetry and QA.

At this point, the system could not just act. It could explain where the action came from and whether those pathways were still reliable.

## Building the bridge to live capital safely

Phases 10 through 12 introduced risk structure and governance. Capital buckets, drift monitoring, policy-as-code, rollback orchestration, and transparency surfaces made it possible to move toward real capital without pretending paper success automatically transfers.

This stage answered the operational question: can we trust the system under stress, and can we recover quickly when something goes wrong?

## Multi-agent consensus and proof-driven allocation

Phase 13 added swarm intelligence: consensus-aware paper trading with reliability-weighted multi-agent input. It improved decision quality by replacing single-agent confidence with coordinated voting and dissent handling.

Phase 14 then solved the next bottleneck: converting learning into allocation. We shipped proof attribution, uplift/sufficiency/source-quality services, and allocator modes (`observe_only`, `recommendation`, `auto_apply`) so risk changes could be justified instead of guessed.

Primary reference: `docs/standup/prds/PRD_PHASE_14_PROOF_TO_CAPITAL_ENGINE.md`

## Phase 15: confidence before promotion

Phase 15 hardened the proof layer so promotion decisions require stronger evidence. We added confidence-bounded causal stage comparisons, sufficiency v2 with actionable blockers, source-stability controls, Solus proof parity in operator views, and verified-claim routing for Eliza content.

In plain terms: we moved from "uplift looks better" to "uplift is confident enough to earn risk."

Operational runbook: `docs/standup/prds/PHASE_15_7DAY_RUNBOOK.md`

## Phase 15 quick ops

```bash
export VINCE_PHASE14_PROOF_ENGINE_ENABLED=true
export VINCE_PROOF_ALLOCATOR_MODE=observe_only
export VINCE_PROOF_MIN_SUFFICIENCY_GRADE=MEDIUM
export VINCE_PHASE15_CAUSAL_MIN_EFFECT=0.02
export VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM=12
export VINCE_SOURCE_QUALITY_COOLDOWN_HOURS=24
export VINCE_SOURCE_QUALITY_HYSTERESIS_POINTS=5
export ELIZA_VERIFIED_CLAIMS_MIN_CONFIDENCE=0.6

bun start
```

## What comes after 15

The natural next step is finer-grained causal cohorts and broader policy automation, but only after continued stability in rollout windows. The principle stays the same: earn risk through measured evidence, keep rollback paths sharp, and make every public claim traceable to verified proof.
