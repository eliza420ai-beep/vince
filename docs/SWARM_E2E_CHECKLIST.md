# Swarm Manual E2E Checklist (VINCE)

**Run this checklist manually** after config or swarm changes (and after `bun start`) to validate swarm behaviour. No automation—a human walks through the modes below. It assumes the runtime flags described in `docs/SWARM_LEARNING_ARCHITECTURE.md` are available.

## Mode A – VINCE-only (swarm off)

- **Config**
  - `VINCE_SWARM_ENABLED=false`
  - All `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Open Trading Bot → `/vince/paper`.
  - Confirm:
    - Portfolio, open positions, and recent trades match the position manager view.
    - `swarmSummary` is either `null` or clearly labeled as “swarm disabled / no data yet”.
    - Daily standup and “How did the team do today?” talk only about realized paper trades, with no claims about “all ten agents”.

## Mode B – VINCE-only with swarm gating

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - All `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Let the bot run until a few trades are evaluated.
  - In logs, confirm `VincePaperTrading` starts with `swarm=VINCE-only (swarm gated but no extra agents)`.
  - Hit `/vince/paper` and verify `swarmSummary.totalOutcomes` is greater than zero after some decisions.
  - Trigger “WHY THIS TRADE” and confirm:
    - The narrative may mention a swarm paragraph, but agent counts are `1` and only VINCE is implied (no “all ten agents” language).

## Mode C – Limited swarm (VINCE + Echo + Oracle)

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - `SWARM_INCLUDE_ECHO=true`
  - `SWARM_INCLUDE_ORACLE=true`
  - All other `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Run for 50–100 paper trades.
  - Inspect logs for `VinceSwarmOrchestrator`:
    - Echo vote lines referencing `x_sentiment`.
    - Oracle vote lines referencing `polymarket_regime`.
  - On `/vince/paper`, confirm:
    - `swarmSummary.activeAgents` ≥ 3 and `agentPerformance` includes `vince`, `echo`, `oracle`.
  - Call “WHY THIS TRADE”:
    - The captured prompt (see tests) contains a `SWARM SNAPSHOT` with `Participating agents: 3`.
    - The user-facing narrative talks about “VINCE + swarm signals” or similar, not “all ten agents”.

## Mode D – Full swarm-capable (ten agents wired, conservative weights)

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - Enable all relevant `SWARM_INCLUDE_*` flags: `ECHO`, `ORACLE`, `SOLUS`, `OTAKU`, `KELLY`, `SENTINEL`, `ELIZA`, `CLAWTERM`, `NAVAL`.
  - Keep Otaku in **observe-only** mode for real capital (Otaku should never auto-execute based purely on swarm consensus).
- **Checks**
  - Let the paper bot run across at least one full session.
  - `/vince/paper`:
    - `swarmSummary.agentPerformance` lists up to ten agents; placeholder agents (Sentinel/Eliza/Clawterm/Naval) appear with low accuracy and neutral roles.
    - Regime breakdowns are populated for any regime that has seen outcomes.
  - “WHY THIS TRADE”:
    - SWARM snapshot shows realistic `agentCount` and confidence; no test or UI string claims “all ten agents voted” unless `agentCount` is actually 10.
  - Daily standup / paper dashboard:
    - Any swarm commentary is grounded in `swarmSummary` numbers (win rates, regime stats), not fabricated positions or P&L.

## Mode E – Regime-conditional tuning (paper-only)

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - `VINCE_SWARM_REGIME_TUNING_ENABLED=true`
- **Checks**
  - Let the paper bot run until each active regime (e.g. `TRENDING_BULL`, `CHOPPY`) has at least ~15 recorded outcomes in the swarm bandit state.
  - In `/vince/paper` and the daily standup:
    - Confirm the **SWARM / BANDIT BY REGIME** section shows non-zero trades and win rates per regime.
    - Confirm any size changes or vetoes clearly reference the current regime (e.g. log lines containing `swarm regime tuning:`).
  - Verify that regime tuning only ever **reduces** paper position size or vetoes entries; it never increases size above what the existing sizing logic would choose.

## General Guardrails

- Never describe live or paper positions that are not present in the position manager.
- When in doubt, describe the swarm as **VINCE + swarm signals** or **partial swarm**, not “the full ten-agent swarm”, unless the orchestrator confirms all agents participated.
- Use the replay tooling (`swarmReplay.ts` and its tests) offline before changing swarm flags in production-like environments.

# Swarm Manual E2E Checklist (VINCE)

**Run this checklist manually** after config or swarm changes (and after `bun start`) to validate swarm behaviour. No automation—a human walks through the modes below. It assumes the runtime flags described in `docs/SWARM_LEARNING_ARCHITECTURE.md` are available.

## Mode A – VINCE-only (swarm off)

- **Config**
  - `VINCE_SWARM_ENABLED=false`
  - All `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Open Trading Bot → `/vince/paper`.
  - Confirm:
    - Portfolio, open positions, and recent trades match the position manager view.
    - `swarmSummary` is either `null` or clearly labeled as “swarm disabled / no data yet”.
    - Daily standup and “How did the team do today?” talk only about realized paper trades, with no claims about “all ten agents”.

## Mode B – VINCE-only with swarm gating

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - All `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Let the bot run until a few trades are evaluated.
  - In logs, confirm `VincePaperTrading` starts with `swarm=VINCE-only (swarm gated but no extra agents)`.
  - Hit `/vince/paper` and verify `swarmSummary.totalOutcomes` is greater than zero after some decisions.
  - Trigger “WHY THIS TRADE” and confirm:
    - The narrative may mention a swarm paragraph, but agent counts are `1` and only VINCE is implied (no “all ten agents” language).

## Mode C – Limited swarm (VINCE + Echo + Oracle)

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - `SWARM_INCLUDE_ECHO=true`
  - `SWARM_INCLUDE_ORACLE=true`
  - All other `SWARM_INCLUDE_*` flags unset/`false`.
- **Checks**
  - Run for 50–100 paper trades.
  - Inspect logs for `VinceSwarmOrchestrator`:
    - Echo vote lines referencing `x_sentiment`.
    - Oracle vote lines referencing `polymarket_regime`.
  - On `/vince/paper`, confirm:
    - `swarmSummary.activeAgents` ≥ 3 and `agentPerformance` includes `vince`, `echo`, `oracle`.
  - Call “WHY THIS TRADE”:
    - The captured prompt (see tests) contains a `SWARM SNAPSHOT` with `Participating agents: 3`.
    - The user-facing narrative talks about “VINCE + swarm signals” or similar, not “all ten agents”.

## Mode D – Full swarm-capable (ten agents wired, conservative weights)

- **Config**
  - `VINCE_SWARM_ENABLED=true`
  - Enable all relevant `SWARM_INCLUDE_*` flags: `ECHO`, `ORACLE`, `SOLUS`, `OTAKU`, `KELLY`, `SENTINEL`, `ELIZA`, `CLAWTERM`, `NAVAL`.
  - Keep Otaku in **observe-only** mode for real capital (Otaku should never auto-execute based purely on swarm consensus).
- **Checks**
  - Let the paper bot run across at least one full session.
  - `/vince/paper`:
    - `swarmSummary.agentPerformance` lists up to ten agents; placeholder agents (Sentinel/Eliza/Clawterm/Naval) appear with low accuracy and neutral roles.
    - Regime breakdowns are populated for any regime that has seen outcomes.
  - “WHY THIS TRADE”:
    - SWARM snapshot shows realistic `agentCount` and confidence; no test or UI string claims “all ten agents voted” unless `agentCount` is actually 10.
  - Daily standup / paper dashboard:
    - Any swarm commentary is grounded in `swarmSummary` numbers (win rates, regime stats), not fabricated positions or P&L.

## General Guardrails

- Never describe live or paper positions that are not present in the position manager.
- When in doubt, describe the swarm as **VINCE + swarm signals** or **partial swarm**, not “the full ten-agent swarm”, unless the orchestrator confirms all agents participated.
- Use the replay tooling (`swarmReplay.ts` and its tests) offline before changing swarm flags in production-like environments.*** End Patch
