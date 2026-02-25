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

---

## Safety Preflight

Run this checklist before **any live operation**:

- [ ] Verify delegated signer address matches `HYPERLIQUID_AGENT_PRIVATE_KEY` — confirm it is **not** the main wallet key
- [ ] Check circuit breaker status: `echo $OTAKU_CIRCUIT_BREAKER_ACTIVE` (must be `false` or unset before going live)
- [ ] Confirm execution graduation level: `echo $OTAKU_FORCE_LEVEL` (L0=paper only, L1=notify, L2=confirm, L3=auto)
- [ ] Verify daily loss limit not breached: check recent P&L from VINCE paper bot dashboard or Sentinel weekly
- [ ] Check DVOL < 80: if crypto volatility index is ≥80, reduce position size by 50%+ before executing

**If any check fails → do not proceed to live.** Return to paper trading (L0) or pause and investigate.

---

## Rollback / Kill-Switch

Emergency procedures to halt or reverse live operations:

| Action | Command / Steps |
|--------|----------------|
| **Emergency stop (halt execution)** | Set `OTAKU_AUTO_EXECUTE_ENABLED=false` + restart the agent process |
| **Close all positions** | Use `OTAKU_CLOSE_ALL` action in chat (e.g. "Otaku, close all positions") |
| **Trigger circuit breaker manually** | `export OTAKU_CIRCUIT_BREAKER_ACTIVE=true` + notify Sentinel |
| **Rollback to paper trading** | Set `OTAKU_FORCE_LEVEL=0` in `.env` + restart agent; verify no orders sent |

**Verification after rollback:**
1. Confirm no new orders placed on Hyperliquid (check account → open orders)
2. Check `OTAKU_CIRCUIT_BREAKER_ACTIVE=true` is active
3. Notify Sentinel weekly task — it will log the event in the weekly report

---

## Mode Change SOPs

Graduation levels control how live execution flows. Change levels only when criteria are met.

### L0 → L1: Paper → Notify

**Requirements before promoting:**
- Minimum 4 weeks paper trading with VINCE bot
- Win rate (WR) ≥ 45% over the period
- No signal logic bugs (confirmed by Sentinel code review)

**Steps:**
1. Set `OTAKU_FORCE_LEVEL=1` in `.env`
2. Restart agent
3. Confirm Sentinel logs "Execution level: Notify" in first weekly report

**Verification:** Next trade signal should generate a Discord/Telegram notification but NOT execute.

---

### L1 → L2: Notify → Confirm

**Requirements before promoting:**
- WR > 55% over 4 consecutive weeks at L1
- At least 20 notified signals reviewed (manually confirmed quality)
- Sentinel weekly report shows consistent signal quality

**Steps:**
1. Set `OTAKU_FORCE_LEVEL=2` in `.env`
2. Restart agent
3. Next trade will send a confirmation prompt — manually approve the first 3

**Verification:** First trade after promotion must require human confirm before execution.

---

### L2 → L3: Confirm → Auto

**Requirements before promoting:**
- WR > 58% over 8 consecutive weeks at L2
- Sharpe ratio > 1.0 (annualized, calculated from weekly P&L)
- Maximum drawdown < 10% from peak
- Sentinel weekly report explicitly notes all three criteria met

**Steps:**
1. Set `OTAKU_FORCE_LEVEL=3` in `.env`
2. Set `OTAKU_AUTO_EXECUTE_ENABLED=true`
3. Start with reduced position size (50% of normal) for first 2 weeks at L3
4. Sentinel will auto-log the promotion in the weekly report

**Verification:** Monitor first 5 auto-executed trades closely. If any unexpected behavior, immediately rollback to L2.

---

## Bootstrap Checks

Steps to verify the trading stack is healthy on startup:

1. **Environment variables set**
   ```bash
   echo $HYPERLIQUID_ADDRESS          # must be set
   echo $HYPERLIQUID_AGENT_PRIVATE_KEY # must be set (delegated signer)
   echo $OTAKU_CIRCUIT_BREAKER_ACTIVE  # must be false or unset
   echo $OTAKU_FORCE_LEVEL             # should be 0 unless intentionally promoted
   ```

2. **Confirm agent process running**
   ```bash
   tmux ls  # expect: evclaw-cycle-trigger, evclaw-live-agent, evclaw-exit-decider
   ```

3. **Check position reconciliation**
   - Open EVClaw dashboard or Hyperliquid account page
   - Confirm no stale positions from prior session
   - If stale positions found: use `OTAKU_CLOSE_ALL` before starting new cycle

4. **Run Safety Preflight** (see above)

5. **Verify VINCE paper bot synced**
   - VINCE signals should be current (within 15 minutes)
   - Feature store last update timestamp must be < 30 minutes old

6. **Notify Sentinel**
   - If starting a new session after any downtime > 4 hours, trigger a Sentinel cost/status check to confirm system health
