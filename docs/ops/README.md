# Ops Playbook

Use this folder to run the agent system as an operations loop, not ad hoc prompting.

## Start Here

1. `AGENT_ROUTING_MATRIX.md`
   - Decides which model handles which task type.
   - Defines spawn and review gates.
2. `AGENT_OPERATING_RHYTHM.md`
   - Defines daily and weekly execution cadence.
   - Keeps PR flow predictable and controlled.
3. `WEEKLY_AGENT_SCORECARD.md`
   - Measures quality, speed, leverage, and cost.
   - Drives weekly systems improvements.

## Recommended Workflow

- Before spawning tasks:
  - apply routing rules
  - enforce spec clarity and DoD
- During execution:
  - keep one task per branch/PR
  - use redirects, avoid restart loops
- Before merge:
  - require review gate and green CI
- Weekly:
  - fill scorecard
  - tune one bottleneck

## Objective

Increase shipping speed and quality while lowering human review load and cost per merged PR.
