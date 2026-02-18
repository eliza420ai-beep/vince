---
name: trading-agent
description: >
  Reference for the OpenClaw-based live trading agent (EVClaw) on Hyperliquid.
  Use when: (1) user asks about "trading agent", "EVClaw", "OpenClaw trading",
  "Hyperliquid bot", "perps bot", "live trading skill", (2) operator needs to
  install or run an autonomous perps/HIP3 trading agent alongside OpenClaw,
  (3) design or docs mention producer/executor split for live execution.
  EVClaw is external (runs on VPS); this skill documents when and how it fits
  the stack. NOT for paper trading (that is plugin-vince in VINCE).
---

# Trading Agent (EVClaw)

Reference skill for **EVClaw**: an autonomous OpenClaw AI trading agent for **Hyperliquid** (perps + HIP3 builder stocks). It uses EVPlus.AI data, OpenClaw agents for entry/exit decisions, and a single wallet identity with a delegated signer. Good fit for the **left curve** (Vince perps on Hyperliquid) when you want **live execution** outside the VINCE app.

- **Repo:** [Degenapetrader/EVClaw](https://github.com/Degenapetrader/EVClaw)
- **Runtime:** Linux VPS, Python 3.10+, OpenClaw installed; installs into OpenClaw `skills/` via `bootstrap.sh`.

## When to use this skill

- Operator wants to run a **live Hyperliquid perps/HIP3** agent with OpenClaw supervision.
- Questions about **"trading agent"**, **EVClaw**, **OpenClaw + trading**, or **Hyperliquid bot**.
- Designing flows that keep **producers** (signals/candidates) separate from **executor** (order placement); EVClaw follows the same idea (cycle_trigger → context → entry gate → executor → exit).

## How it fits VINCE

| Layer | VINCE (this repo) | EVClaw |
|-------|-------------------|--------|
| **Paper / signals** | plugin-vince (paper bot, ALOHA, signals) | — |
| **Live execution** | Otaku (only agent with funded wallet; DeFi, Vince signal execution) | EVClaw (dedicated Hyperliquid identity + delegated signer) |
| **Contract** | [TRADING_RUNTIME_CONTRACT.md](../../docs/TRADING_RUNTIME_CONTRACT.md): producers don’t execute; single executor path | Same: producers build context; executor places/closes orders |

EVClaw does **not** replace VINCE’s paper bot or Otaku; it is a separate, OpenClaw-native **live** trading skill for Hyperliquid. Use it when the operator wants a dedicated, autonomous perps/HIP3 agent with OpenClaw agents for entry/exit and deterministic 15m/hourly ops.

## Quick reference (from EVClaw README)

- **Required env:** `HYPERLIQUID_ADDRESS`, `HYPERLIQUID_AGENT_PRIVATE_KEY` (delegated signer; do not use main wallet key).
- **Modes:** `conservative` | `balanced` (default) | `aggressive` (set in `skill.yaml`).
- **Process model:** tmux sessions (e.g. `evclaw-cycle-trigger`, `evclaw-live-agent`, `evclaw-exit-decider`); start via `./start.sh`.
- **OpenClaw agents:** entry-gate, exit-decider, HIP3 entry/exit, learning-reflector (bootstrap provisions isolated agent IDs).
- **Cron/scheduled:** EVClaw’s `AGENTS.md` defines `CRON_CONTEXT`; scheduled prompts use only that (not manual commands).

## File structure (this skill)

```
skills/trading-agent/
├── SKILL.md    (this file)
└── README.md   (Cursor/setup and link to EVClaw)
```

For full install, config, and ops see the [EVClaw repo](https://github.com/Degenapetrader/EVClaw) (INSTALL.md, AGENTS.md, TRADING_RULES.md, PROTECTION_LAYERS.md).
