# Multi-Agent Plugin Validation

This runbook compares baseline behavior against pilot plugin behavior:

- `@elizaos/plugin-agent-orchestrator` (Sentinel-only)
- `@elizaos/plugin-autonomous` (Kelly + Sentinel)
- `@elizaos/plugin-presence` (VINCE + ECHO with bridge source)

## Baseline Snapshot (from `docs/standup/standup-metrics.jsonl`)

- Sample size: `67` standup records
- Avg action items: `4.90`
- Avg lessons: `6.28`
- Avg cross-agent links: `1.48`
- Avg disagreements: `0.13`
- Avg estimated cost: `$0.145`
- Avg estimated tokens: `24,193`

## Pilot Matrix

| Variant | Flags | Runs |
| --- | --- | --- |
| Baseline | all pilot flags `false` | 3 standups |
| Autonomous | `KELLY_ENABLE_AUTONOMOUS=true`, `SENTINEL_ENABLE_AUTONOMOUS=true` | 3 standups |
| Presence | autonomous flags + `VINCE_ENABLE_PRESENCE=true`, `ECHO_ENABLE_PRESENCE=true`, `ENABLE_PRESENCE_BRIDGE=true` | 3 standups |
| Orchestrator | previous flags + `SENTINEL_ENABLE_AGENT_ORCHESTRATOR=true` | 3 standups + 3 Sentinel coding-task flows |

## Validation Checklist

1. **A2A correctness**
   - `ASK_AGENT` still resolves cross-runtime targets.
   - Timeout/error rate does not increase materially.
2. **Standup behavior**
   - Kelly kickoff works.
   - Round-robin completes.
   - Day report writes to `docs/standup/day-reports/`.
3. **Response quality**
   - No pile-on regression in standup channels.
   - Cross-agent links stay flat or improve.
4. **Cost/latency**
   - Compare `estimatedCost` and `totalEstimatedTokens`.
5. **Orchestrator execution**
   - Sentinel can launch a coding-task flow with clean workspace finalization output.

## Commands

```bash
bun run type-check
```

```bash
node scripts/standup/compare-metrics.js docs/standup/standup-metrics.jsonl
```

If `compare-metrics.js` is not present yet, use this one-liner:

```bash
node -e "const fs=require('fs');const p='docs/standup/standup-metrics.jsonl';const rows=fs.readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));const avg=k=>rows.reduce((a,r)=>a+(Number(r[k])||0),0)/rows.length;console.log({n:rows.length,actionItems:avg('actionItems'),lessons:avg('lessons'),crossAgentLinks:avg('crossAgentLinks'),estimatedCost:avg('estimatedCost'),totalEstimatedTokens:avg('totalEstimatedTokens')});"
```

## Pass/Fail Criteria

- **Pass**
  - No standup breakage.
  - No ASK_AGENT regression.
  - Equal or lower average token/cost burn in autonomous variant.
  - Stable orchestrator task flow on Sentinel.
- **Fail**
  - Any standup deadlock/timeout pattern.
  - Large increase in disagreements/pile-on.
  - Sentinel orchestrator flow repeatedly fails to finalize.

## Rollback

Set pilot flags to `false` and restart:

- `KELLY_ENABLE_AUTONOMOUS`
- `SENTINEL_ENABLE_AUTONOMOUS`
- `VINCE_ENABLE_PRESENCE`
- `ECHO_ENABLE_PRESENCE`
- `ENABLE_PRESENCE_BRIDGE`
- `SENTINEL_ENABLE_AGENT_ORCHESTRATOR`
