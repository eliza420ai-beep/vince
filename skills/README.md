# Skills Index

Auto-generated index of all available skills. See individual SKILL.md files for full documentation.

## Available Skills

| Name | Description | Owner | Risk | SKILL.md |
|------|-------------|-------|------|----------|
| **clawterm** | Clawterm agent behavior: AI terminal bridge to OpenClaw, setup guide, AGI/alignm... | clawterm | 🔴 high | [SKILL.md](skills/clawterm/SKILL.md) |
| **echo** | ECHO agent behavior: Crypto Twitter sentiment, WTT (What's The Trade), pulse/vib... | echo | 🔴 high | [SKILL.md](skills/echo/SKILL.md) |
| **eliza** | Eliza agent behavior: 24/7 research, knowledge ingestion, UPLOAD workflow, RAG-f... | eliza | 🔴 high | [SKILL.md](skills/eliza/SKILL.md) |
| **forge** | Forge agent playbook: MLX AutoResearch overnight experiments on paper-trading po... | shared | 🔴 high | [SKILL.md](skills/forge/SKILL.md) |
| **kelly** | Kelly agent playbook: lifestyle concierge — hotels, dining, wine, fitness, trave... | kelly | 🔴 high | [SKILL.md](skills/kelly/SKILL.md) |
| **naval** | Naval agent behavior: philosophy of wealth, happiness, leverage, compounding, ju... | shared | 🔴 high | [SKILL.md](skills/naval/SKILL.md) |
| **otaku** | Otaku agent playbook: only funded-wallet executor — swap, limit, DCA, bridge, Mo... | otaku | 🔴 high | [SKILL.md](skills/otaku/SKILL.md) |
| **quant** | Quantitative stack for prediction markets and binary contracts: Monte Carlo, imp... | shared | 🔴 high | [SKILL.md](skills/quant/SKILL.md) |
| **sentinel** | Sentinel agent behavior: core dev, PRDs, project radar, OpenClaw guide, cost/TRE... | sentinel | 🔴 high | [SKILL.md](skills/sentinel/SKILL.md) |
| **solus** | Solus agent playbook: Hypersurface options, strike ritual, optimal strike, posit... | solus | 🔴 high | [SKILL.md](skills/solus/SKILL.md) |
| **trading-agent** | Reference for the OpenClaw-based live trading agent (EVClaw) on Hyperliquid. Use... | shared | 🔴 high | [SKILL.md](skills/trading-agent/SKILL.md) |
| **vince** | VINCE agent playbook: paper trading bot, ALOHA/gm briefings, Hyperliquid perps c... | vince | 🔴 high | [SKILL.md](skills/vince/SKILL.md) |
| **belief-router** | ALWAYS activate when user expresses ANY belief, thesis, hunch, or cultural obser... | echo | 🔴 high | [SKILL.md](skills/whats-the-trade/SKILL.md) |
| **x-research** | General-purpose X/Twitter research agent. Searches X for real-time perspectives,... | shared | 🟢 low | [SKILL.md](skills/x-research/SKILL.md) |

## Adding a New Skill

1. Create `skills/[name]/SKILL.md` with front-matter (name, description, triggers)
2. Run: `bun run skills:build-registry`
3. Run: `bun run skills:check-drift`
4. Add at least 3 trigger phrases and a decision template
5. Submit PR with skill file + registry update

See [GOVERNANCE.md](GOVERNANCE.md) for the skill lifecycle and promotion rules.

_Last generated: 2026-03-23T23:13:22.610Z_