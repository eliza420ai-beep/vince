# Skill Governance

> Rules and lifecycle for skills in the VINCE Skills OS. Phase 9 — ONE DREAM PRD.

---

## Lifecycle

```
draft → validated → promoted → deprecated
```

## Stages

- **draft:** Skill exists in `skills/` but has no recorded usage or test coverage. It is listed in `skills/registry.json` but has not been exercised in production and has not passed the QA harness.

- **validated:** Skill has passed the QA harness (`bun run skills:check-drift` exits 0) and has at least 1 successful usage event recorded in `data/skill-telemetry.jsonl`. A validated skill is safe to use but has not yet demonstrated measurable KPI improvement.

- **promoted:** Skill has demonstrated measurable KPI improvement in at least one of: (1) trading algorithm quality, (2) content output quality, (3) X-research insight quality. Promotion requires the Sentinel weekly report to explicitly note the improvement. Promoted skills are the default recommendation for their use case.

- **deprecated:** Skill no longer produces valid outputs or its KPI contribution has gone negative for 4+ consecutive weekly reports. Deprecated skills remain in `skills/` for reference but are removed from the registry's active recommendations and marked `status: deprecated`.

---

## Promotion Criteria

**One must be met to promote a skill from validated → promoted:**

1. **Trading quality:** Skill-sourced signals show +3pp win rate vs baseline over a 4-week window (tracked in VINCE paper bot)
2. **Content quality:** Skill-sourced content drafts show >50% publish rate (tracked in `data/content-performance.jsonl`)
3. **Research quality:** Skill routing accuracy >80% for skill-intent queries (tracked via `bun run skills:eval-routing`)

---

## Deprecation Criteria

A skill should be deprecated when **all of the following are true:**
- Its KPI contribution has been negative (below baseline) for 4+ consecutive Sentinel weekly reports
- No new usage events in the past 4 weeks (`data/skill-telemetry.jsonl`)
- No active PR or improvement work referencing the skill

---

## Current Skill Status

| Skill | Status | Owner | Last KPI |
|---|---|---|---|
| x-research | validated | Echo | — |
| trading-agent | validated | Otaku/Vince | — |

_Update this table after each Sentinel weekly report._

---

## Adding a New Skill

1. Create `skills/[name]/SKILL.md` following the template in [skills/README.md](README.md)
   - Required front-matter: `name`, `description` (with "Use when" and "NOT for" sections)
   - Required sections: Decision Templates, Output Format
   - Recommended: Source Tiering, Benchmark Queries
2. Run: `bun run skills:build-registry` — must update `skills/registry.json` without errors
3. Run: `bun run skills:check-drift` — must exit 0 (no broken references)
4. Add at least 3 trigger phrases to the `description` "Use when" section
5. Add at least one decision template (input → output bucket mapping)
6. Submit PR with skill file + registry update + at least one test or usage example
7. After first successful production use: record event via `SkillTelemetryService.recordUsage()`
8. Status promotes to `validated` automatically after QA passes + first successful usage event

---

## Skill Runbook Standard

Every skill SKILL.md should include:

| Section | Required | Description |
|---------|----------|-------------|
| Front-matter | ✅ | name, description with "Use when" and "NOT for" |
| Decision Templates | ✅ | Input → output bucket mapping (Trade Now / Monitor / Ignore or equivalent) |
| Output Format | ✅ | Standardized structure for all outputs |
| Benchmark Queries | ✓ recommended | 3-5 example queries with expected results |
| Source Tiering | if applicable | Signal quality tiers |
| Safety Preflight | for high-risk skills | Checklist before live operations |
| Rollback / Kill-Switch | for high-risk skills | Emergency procedures |
| Bootstrap Checks | for high-risk skills | Startup health verification |

---

## CI / QA Commands

```bash
# Build the skill registry from all SKILL.md files
bun run skills:build-registry

# Check for drift between registry and actual files
bun run skills:check-drift

# Evaluate skill routing accuracy (must be ≥75%)
bun run skills:eval-routing
```

These should be run before any PR that modifies a skill file or the registry.

---

## Skill Telemetry

Usage events are tracked in `data/skill-telemetry.jsonl`. The Sentinel weekly task automatically appends a **Skill Scoreboard** section to the weekly report when skills have been used in the past 7 days.

To record a usage event programmatically:

```typescript
import { SkillTelemetryService } from "src/plugins/plugin-sentinel/src/services/skillTelemetry.service";

const telemetry = new SkillTelemetryService();
telemetry.recordUsage({
  skillName: "x-research",
  agentId: "echo",
  latencyMs: 1200,
  outcome: "success",
  downstreamImpact: "insight",
});
```
