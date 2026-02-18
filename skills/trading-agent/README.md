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
