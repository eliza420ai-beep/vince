# Live Capital Governance SOP

> **⚠️ SAFETY CRITICAL:** All live execution defaults to OFF. Every real-money path requires explicit operator action. When in doubt: paper-first, gate everything.

---

## Prerequisites

Before enabling any live capital:

1. Paper trading win rate ≥ 55% over minimum 100 trades
2. Max drawdown < 10% in last 30 days
3. Circuit breaker stack deployed and tested (Phase 10 #59)
4. Drift sentinel validated against paper positions (Phase 10 #58)
5. Execution audit trail live and writing (Phase 10 #60)
6. At least one full week of execution quality data (Phase 8 #44)
7. Delegated signer wallet funded with test amount ($100)

---

## Pilot Activation Checklist

- [ ] Set `PILOT_BUCKET_ENABLED=true` in `.env`
- [ ] Set `PILOT_BUCKET_CAPITAL_USD=1000`
- [ ] Verify `OTAKU_FORCE_LEVEL=1` (notify-only, not auto)
- [ ] Confirm `CB_DAILY_LOSS_LIMIT_USD=200`
- [ ] Run: `bun run skills:check-drift` (must exit 0)
- [ ] Run operator dashboard and verify HEALTHY status
- [ ] First trade: manual confirm required, paper first

---

## Escalation Ladder

| Condition | Action | Who |
|---|---|---|
| Daily loss > $100 | Alert operator | Automated |
| Daily loss > $200 | Trip circuit breaker | Automated |
| Drift > 5% | Warn, reduce size 50% | Automated |
| Drift > 15% | Halt live bucket | Automated |
| 5 consecutive losses | Trip circuit breaker | Automated |
| Any circuit breaker tripped | All live execution halts | Automated |
| Circuit breaker reset | Manual operator action required | Operator |

---

## Emergency Procedures

### Full Stop (30 seconds)

1. Set env: `OTAKU_AUTO_EXECUTE_ENABLED=false`
2. Run: `openclaw chat vince "halt all trading"` → `OTAKU_CLOSE_ALL`
3. Verify: operator dashboard shows HALTED

### Capital Recovery

1. Trip manual circuit breaker: set `CB_MANUAL_TRIP=true`
2. Wait for all positions to close or expire
3. Reconcile P&L: `vincePnLReconciliation.reconcileAll()`
4. Review audit trail before re-enabling

---

## Graduation Path

```
Paper (L0) → Pilot $1K (L1) → Pilot $5K (L2) → Main $10K (L3)
```

Each step requires:
- 4 weeks at current level
- Win rate ≥ 55%
- Max drawdown < 10%
- Zero unresolved circuit breaker events
- Operator sign-off

---

## Circuit Breaker Reference

| Breaker | Threshold | Auto-Reset |
|---|---|---|
| `daily-loss-limit` | Loss > `CB_DAILY_LOSS_LIMIT_USD` (default $200) | ✅ Midnight UTC |
| `consecutive-losses` | N losses in a row (default 5) | ✅ Midnight UTC |
| `max-drawdown` | Portfolio drawdown > `CB_MAX_DRAWDOWN_PCT` (default 15%) | ❌ Manual only |
| `drift-halt` | Live vs paper drift > `DRIFT_HALT_THRESHOLD_PCT` (default 15%) | ❌ Manual only |
| `manual` | Operator-triggered | ❌ Manual only |

To reset a manual-only breaker:
```ts
import { CircuitBreakerService } from "src/plugins/plugin-otaku/src/services/circuitBreaker.service";
CircuitBreakerService.getInstance().reset("max-drawdown");
```

---

## Capital Bucket Reference

| Bucket | Allocated | Max/Trade | Max DD | Live Default |
|---|---|---|---|---|
| `paper` | $100,000 | $10,000 | 50% | ❌ OFF |
| `pilot` | $1,000 | $100 | 20% | ❌ OFF |
| `main` | $10,000 | $500 | 15% | ❌ OFF |

Enable a bucket for live trading (operator action):
```ts
VinceCapitalBucketsService.getInstance().updateBucketConfig("pilot", {
  enabled: true,
  liveExecutionAllowed: true, // explicit confirmation required
});
```

**`liveExecutionAllowed` must be explicitly set to `true` — it defaults to `false` and is never set automatically.**

---

## Operator Dashboard

Run via chat: `"Show operator dashboard"` → `SENTINEL_OPERATOR_DASHBOARD`

Returns:
- Circuit breaker status (all 5 breakers)
- Capital bucket values and drawdown
- Drift monitor (last 24h max drift, warn/halt counts)
- Execution audit (last 24h decisions, rejection rate)
- P&L reconciliation (unreconciled count, large discrepancies)
- System status: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 HALTED

---

## Monitoring Checklist (Daily)

1. `operator dashboard` → verify HEALTHY
2. Check drift: `vinceDriftSentinel.getMaxDrift(24)` should be < 5%
3. Check unreconciled P&L: `pnlRecon.getUnreconciled()` should be < 5
4. Review execution audit rejections: `auditSvc.getRejectionStats()`
5. Verify no circuit breakers tripped: `circuitBreaker.isHalted()` → false

---

## Key Environment Variables

```bash
# Circuit Breakers
CB_DAILY_LOSS_LIMIT_USD=200       # Trip if daily loss exceeds
CB_CONSECUTIVE_LOSSES=5           # Trip after N consecutive losses
CB_MAX_DRAWDOWN_PCT=15            # Trip if portfolio drawdown exceeds

# Drift Sentinel
DRIFT_WARN_THRESHOLD_PCT=5        # Warn if paper vs live drift exceeds
DRIFT_HALT_THRESHOLD_PCT=15       # Halt if drift exceeds

# Position Guardrails
GUARDRAIL_MAX_POSITION_PCT=10     # Max % of bucket in single position
GUARDRAIL_MAX_CORRELATED_PCT=25   # Max % in correlated assets (BTC+ETH)
GUARDRAIL_MIN_SIZE_USD=10         # Block if below this (not worth fees)
GUARDRAIL_MAX_SIZE_USD=500        # Hard cap regardless of bucket config
```

---

*Phase 10 — Live Capital Pilot: Controlled Real-Money Deployment (#57–#64)*
