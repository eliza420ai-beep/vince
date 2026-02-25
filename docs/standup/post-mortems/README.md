# Post-mortems (losing trades)

When the paper bot closes a position at a loss, Vince automatically runs a **post-mortem**: he asks Echo (CT sentiment), Oracle (Polymarket regime), and Solus (options/mechanics) for feedback and writes a markdown file here.

- **Auto:** Triggered from `closeTrade()` when `realizedPnl < 0`.
- **Manual:** Use the Vince quick action **Post-mortem (last loss)** or say "Post-mortem on the last losing trade" to run the same flow for the most recent closed losing trade.

Files are named: `YYYY-MM-DD-{ASSET}-post-mortem.md`.

## Required post-mortem sections

Each new post-mortem should include, in order:

1. Trade Snapshot
2. Evidence Pack
3. Agent Findings (structured)
4. Root-Cause Tags
5. Corrective Actions
6. Confidence and Data Gaps
7. What changes on next trade?
8. Machine-Readable Summary

## Machine-readable markers

For weekly governance and KPI rollups, include these lines:

- `PM_QUALITY_SCORE: <0-100>`
- `PM_QUALITY_ESCALATE: <true|false>`
- `PM_PRIMARY_CAUSE: <taxonomy_tag>`
- `PM_SECONDARY_CAUSES: <tag1,tag2|none>`
- `PM_PTQG_COMPLETE: <true|false>`
- `PM_PMEP_COMPLETENESS_PCT: <0-100>`
- `PM_MISSING_DATA_COUNT: <integer>`

## Learning system docs

To turn post-mortems into measurable process improvements, use:

- PRD: `docs/standup/prds/PRD_POST_MORTEM_LEARNING_SYSTEM.md`
- Ops playbook: `docs/standup/prds/PLAYBOOK_POST_MORTEM_LEARNING_SYSTEM.md`
