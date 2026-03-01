# Skills Index

Auto-generated index of all available skills. See individual SKILL.md files for full documentation.

## Available Skills

| Name | Description | Owner | Risk | SKILL.md |
|------|-------------|-------|------|----------|
| **quant** | Quantitative stack for prediction markets and binary contracts: Monte Carlo, imp... | shared | 🔴 high | [SKILL.md](skills/quant/SKILL.md) |
| **trading-agent** | Reference for the OpenClaw-based live trading agent (EVClaw) on Hyperliquid. Use... | shared | 🔴 high | [SKILL.md](skills/trading-agent/SKILL.md) |
| **x-research** | General-purpose X/Twitter research agent. Searches X for real-time perspectives,... | shared | 🟢 low | [SKILL.md](skills/x-research/SKILL.md) |

## Adding a New Skill

1. Create `skills/[name]/SKILL.md` with front-matter (name, description, triggers)
2. Run: `bun run skills:build-registry`
3. Run: `bun run skills:check-drift`
4. Add at least 3 trigger phrases and a decision template
5. Submit PR with skill file + registry update

See [GOVERNANCE.md](GOVERNANCE.md) for the skill lifecycle and promotion rules.

_Last generated: 2026-03-01T09:53:47.370Z_