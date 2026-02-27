# PRD — Live Execution Graduation & Guardrails

> **Goal:** Ensure swarm, ML, and regime-conditional behavior remain **paper-only** until a separate, explicit graduation path is satisfied — and that no live-capital behavior changes can happen by accident.

---

## 1. Scope and Surfaces

### Paper-only surfaces (can evolve freely)

- `vince` paper bot (`src/plugins/plugin-vince/`):
  - Swarm bandit (`SwarmCoordinationService`)
  - Regime-conditional learning and tuning
  - Genome, tuner, ONNX models, feature store
- Daily standups and day reports:
  - `VINCE_DAILY_STANDUP` action
  - `docs/standup/day-reports/*.md`
- Post-mortems and learning rituals:
  - `docs/standup/post-mortems/*`
  - `PRD_POST_MORTEM_LEARNING_SYSTEM.md`

### Live-capable surfaces (must be gated)

- **Otaku** (only funded wallet):
  - Agent: `src/agents/otaku.ts`
  - Plugin: `src/plugins/plugin-otaku/`
  - Execution actions, e.g. `OTAKU_SWAP`, `OTAKU_BRIDGE`, `OTAKU_EXECUTE_VINCE_SIGNAL`, etc.
- Live capital governance:
  - `docs/ops/LIVE_CAPITAL_SOP.md`
  - Circuit breaker and capital bucket services referenced there.

**Contract:**  
VINCE + swarm = **signal and stats producers** only.  
Otaku + execution layer = **live-capital consumers** that may *read* advisory outputs but never treat them as direct “orders”, unless and until graduation criteria are met **and** live execution is explicitly enabled.

---

## 2. Config & Flag Separation

### Paper-only flags (existing, stay scoped to VINCE)

- `VINCE_SWARM_ENABLED` — consult swarm consensus for paper trades.
- `VINCE_SWARM_MIN_CONFIDENCE` — minimum consensus to allow a paper trade.
- `VINCE_SWARM_REGIME_TUNING_ENABLED` — apply regime-conditional tuning for **paper bot only** (size shrink / veto in weak regimes; never boost size).

These flags **must not** be read by any live execution module.

### Live execution flags (for Otaku / executors)

Planned env/config contract (to be implemented in Otaku, not VINCE):

- `OTAKU_LIVE_ENABLED=true|false`
- `LIVE_EXECUTION_MODE=off|shadow|pilot|prod`

Semantics:

- `off`:
  - No live orders are ever sent.
  - Otaku may answer questions and simulate, but does not execute.
- `shadow`:
  - Otaku mirrors VINCE / swarm / operator intents in **simulated trades only**.
  - Real-time P&L and risk are computed as if trades executed; no capital moves.
- `pilot`:
  - Live-capital execution allowed, but under **hard-coded conservative caps** independent of VINCE sizing.
- `prod`:
  - Only reachable after a separate graduation decision; even then, circuit breakers and capital buckets are in full control.

**Rule:**  
Any new swarm/ML feature must hook **only into paper flags**. Changes to live execution behavior may only key off `OTAKU_LIVE_ENABLED` / `LIVE_EXECUTION_MODE` plus explicit graduation metadata, never `VINCE_SWARM_*`.

---

## 3. Graduation Criteria and State Machine

We treat each “swarm-influenced” behavior as a feature that must graduate independently.

### State machine (per feature)

```text
paper_only → shadow → capped_pilot → graduated_live
```

- **paper_only**:
  - Behavior affects only VINCE paper bot.
  - Live execution ignores the feature entirely.
- **shadow**:
  - Feature’s recommendations (e.g. swarm sizing, regime veto) are logged and simulated alongside live price feed, but never executed.
- **capped_pilot**:
  - Live execution allowed, but:
    - Max notional per trade (e.g. ≤ $100)
    - Max daily loss (e.g. ≤ $200) and strict circuit breakers
    - Max concurrent positions
  - VINCE sizing is treated as an **upper bound**; pilot caps take precedence.
- **graduated_live**:
  - Feature is allowed to influence production sizing/entries within the global risk framework (circuit breakers, buckets, SOP).

### Graduation criteria (per feature)

Minimum requirements before moving to the next state:

- **Sample size:**
  - ≥ N trades **in the feature’s domain** (e.g. per-asset or per-regime, as appropriate).
- **Stability:**
  - Win rate vs baseline (paper-only or simple rules).
  - Sharpe/Sortino and max drawdown within agreed bounds (see `docs/ops/LIVE_CAPITAL_SOP.md` for global thresholds).
  - If applicable, Brier scores and calibration error trending in the right direction.
- **Robustness:**
  - Performance evaluated across key regimes (`trending`, `choppy`, `volatile`) using `VinceMarketRegimeService` + swarm’s `SwarmMarketRegime`.
- **Drift checks:**
  - Compare recent performance vs training/validation windows and **paper baseline**.
  - Feature cannot graduate if paper vs live drift breaches thresholds defined in `LIVE_CAPITAL_SOP`.

---

## 4. Shadow and Pilot Mode Specifications (Otaku)

### Shadow mode (LIVE_EXECUTION_MODE=shadow)

- Behavior:
  - Otaku listens to VINCE and/or operator intents and produces **shadow orders/trades**.
  - Trades are persisted with a `mode: "shadow"` tag and full audit trail (asset, direction, size, timestamp, reason).
  - P&L and risk metrics are computed exactly as live trades, but no onchain or CEX orders are sent.
- Purpose:
  - Validate that swarm/ML/strategy logic behaves sensibly under live market conditions.
  - Compare against:
    - Pure manual or existing baseline strategy.
    - VINCE paper performance in the same window.

### Capped pilot mode (LIVE_EXECUTION_MODE=pilot)

- Behavior:
  - Live orders allowed only through a **pilot bucket** with strict caps, aligned with `docs/ops/LIVE_CAPITAL_SOP.md` (e.g. `$1K` bucket, `$100` max per trade).
  - For any candidate trade:
    - Compute VINCE suggested size (paper).
    - Clamp to pilot bucket constraints (per-trade, per-day, per-bucket).
  - Live trades are tagged with `mode: "pilot"` and include references back to:
    - The advisory signal (VINCE/swarm snapshot ID).
    - Swarm confidence / regime state at entry.
- Purpose:
  - Narrow but real-money test to confirm that the feature still behaves under capital constraints and execution frictions.

---

## 5. Guardrails and Test Strategy

### Code-level invariants (to enforce in implementation)

- Live execution modules (Otaku, capital bucket services) must depend on VINCE outputs **only via typed “advisory” interfaces**, e.g.:
  - `AdvisorySignal` (asset, direction, confidence, time).
  - `AdvisorySizing` (suggested size, rationale).
  - `AdvisoryContext` (swarm consensus snapshot, regime, narrative).
- No function or action in a live execution path may accept a “fire order” command directly from VINCE.
- Any attempt to enable `LIVE_EXECUTION_MODE` to `shadow|pilot|prod` when:
  - Graduation criteria are not met, or
  - Required telemetry (shadow history, drift metrics) is absent  
  must **fail closed**:
  - Log error with explicit reason.
  - Refuse to place live orders.

### Test strategy (conceptual)

- **Unit tests**:
  - Assert that toggling `VINCE_SWARM_ENABLED` / `VINCE_SWARM_REGIME_TUNING_ENABLED` has **no effect** on live execution code paths when `LIVE_EXECUTION_MODE=off|shadow`.
  - Validate that advisory interfaces are pure (no side effects) and that execution modules reject untyped or improperly annotated inputs.
- **Integration tests**:
  - Simulate environments with `LIVE_EXECUTION_MODE=off`, `shadow`, `pilot` and confirm:
    - No live orders are emitted in `off` or `shadow`.
    - Pilot caps are applied even when VINCE suggests larger sizes.
    - Circuit breakers and capital buckets behave as configured in `docs/ops/LIVE_CAPITAL_SOP.md`.

---

## 6. Operator Workflow and Status Surfacing

### Graduation workflow (operator-facing)

1. **Request**: Operator proposes moving a feature from `paper_only` → `shadow` → `capped_pilot` → `graduated_live`, attaching:
   - Metrics (sample size, win rate, Sharpe, drawdown, drift).
   - Regime breakdown and post-mortem summary.
2. **Review**: Sentinel / core dev reviews metrics against:
   - This PRD.
   - `docs/ops/LIVE_CAPITAL_SOP.md`.
3. **Approval**: Graduation is approved or rejected explicitly and recorded (e.g. in `tasks/todo.md` and/or a small changelog in this PRD).
4. **Activation**:
   - Operator updates env or runtime config:
     - `LIVE_EXECUTION_MODE` from `off` → `shadow` → `pilot` → `prod`.
   - Redeploy or restart as required.

### Surfacing live execution status

- **Daily standup** (`VINCE_DAILY_STANDUP`):
  - Add a short line in the summary block:
    - `Live execution: OFF (paper-only, no capital at risk)`  
    - `Live execution: SHADOW (simulated only, no capital at risk)`  
    - `Live execution: PILOT (capped live bucket)`  
  - Status derived from `LIVE_EXECUTION_MODE` or, if absent, defaults to `OFF`.
- **Day reports** (`docs/standup/day-reports/*.md`):
  - Add a “Live execution status” section at the top with the same wording as the standup.
  - When `off` or `shadow`, always state explicitly: **“No capital was risked today.”**

With this graduation and guardrail framework in place, VINCE and the swarm can continue to evolve aggressively in paper, while live-capital behavior stays frozen behind a clearly documented and auditable gate.

