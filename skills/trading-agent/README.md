# Trading Agent Skill (Cursor / Claude)

Reference skill for **EVClaw** — the OpenClaw-based live trading agent for Hyperliquid (perps + HIP3). Use when the user or operator asks about a trading agent, EVClaw, OpenClaw trading, or Hyperliquid perps bot.

## What this skill is

- **Reference only.** EVClaw runs in its own repo and on a VPS; we don’t vendor its code here.
- **When to use:** Questions about “trading agent”, EVClaw, OpenClaw + live trading, or how a dedicated Hyperliquid bot fits next to VINCE (paper bot + Otaku).
- **Fit with VINCE:** Left curve = Vince perps (Hyperliquid). Paper/signals live in plugin-vince; live execution in-app is Otaku. EVClaw is the recommended **external** OpenClaw skill for autonomous Hyperliquid perps/HIP3 with producer/executor separation.

## EVClaw quick links

- **Repo:** [github.com/Degenapetrader/EVClaw](https://github.com/Degenapetrader/EVClaw)
- **Install:** [EVClaw INSTALL.md](https://github.com/Degenapetrader/EVClaw/blob/main/INSTALL.md)
- **Agent context:** [EVClaw AGENTS.md](https://github.com/Degenapetrader/EVClaw/blob/main/AGENTS.md) (CRON_CONTEXT vs MANUAL_COMMANDS)
- **Trading rules / safety:** TRADING_RULES.md, PROTECTION_LAYERS.md in the repo

## Using in Cursor

- Add this project (or the `skills/trading-agent` path) so the model can read `SKILL.md`.
- When you ask about a trading agent, EVClaw, or OpenClaw + Hyperliquid, the agent can point here and to the EVClaw repo.

## Relation to VINCE

- **Paper bot / signals:** `src/plugins/plugin-vince/` and [docs/TRADING_RUNTIME_CONTRACT.md](../../docs/TRADING_RUNTIME_CONTRACT.md).
- **Live execution in-app:** Otaku (only agent with funded wallet).
- **Live execution (external):** EVClaw as OpenClaw skill — same producer/executor idea, dedicated HL identity and ops.

---

## Runbook Sections (see SKILL.md)

The [SKILL.md](SKILL.md) file contains the full operational runbook. Key sections:

| Section | What it covers |
|---------|---------------|
| [Safety Preflight](#safety-preflight) | Checklist before any live operation (wallet, circuit breaker, graduation level, DVOL) |
| [Rollback / Kill-Switch](#rollback--kill-switch) | Emergency stop, close all positions, circuit breaker trigger, rollback to paper |
| [Mode Change SOPs](#mode-change-sops) | Requirements and steps for L0→L1→L2→L3 graduation |
| [Bootstrap Checks](#bootstrap-checks) | Startup health verification steps |

## When to use this skill

1. Operator asks about "trading agent", "EVClaw", "OpenClaw trading", or "Hyperliquid bot"
2. Need to install or run an autonomous perps/HIP3 trading agent alongside OpenClaw
3. Designing flows with producer/executor split for live execution
4. Running the Safety Preflight before any live position
5. Performing a mode change (paper → notify → confirm → auto)

## ⚠️ Live trading safety

- **Always run the Safety Preflight** before enabling live execution
- **Start at L0 (paper)** — promote only when WR/Sharpe criteria are met
- **Single wallet identity:** One address + delegated signer. Never use main wallet key in agent config
- **Circuit breaker is your emergency stop** — keep `OTAKU_CIRCUIT_BREAKER_ACTIVE` monitoring active

For full install and ops: [EVClaw repo](https://github.com/Degenapetrader/EVClaw)
