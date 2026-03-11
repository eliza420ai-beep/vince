# Autonomous Operations SLA

## SLA Targets

| Metric | Target | Alert Threshold | Measurement |
|---|---|---|---|
| Weekly report generation | Every Monday 08:00 UTC | Missed = alert | sentinelWeekly.tasks.ts |
| Genome evolution cycle | Weekly, within 24h of Sunday close | Missed = alert | genomeEvolution.tasks.ts |
| Circuit breaker check | Every trade decision | Any miss = critical | circuitBreaker.service.ts |
| Policy evaluation | Every trade decision | Any miss = critical | vincePolicyEngine.service.ts |
| Drift sentinel check | Every execution | Any miss = alert | vinceDriftSentinel.service.ts |
| Memory decay | Weekly | Missed = degraded | memoryGraph.service.ts |
| Rollback check | Weekly | Missed = alert | rollbackOrchestrator.service.ts |
| Prediction validation | Daily | Missed 3 days = alert | predictionValidation.tasks.ts |

## Recovery SLAs

| Incident Type | Max Time to Detect | Max Time to Recover |
|---|---|---|
| Circuit breaker trip | Instant (automated) | Operator resets within 4h |
| Genome regression | 1 week (next cycle) | 1 week (rollback to prior gen) |
| Drift > 15% | Instant (automated) | Operator reviews within 2h |
| Policy violation | Instant (automated) | Review within 24h |
| Rollback failure | 1 hour | Operator intervenes within 4h |

## Governance Cadence

| Cadence | Activity | Owner |
|---|---|---|
| Daily | Prediction validation, circuit breaker state check | Sentinel (automated) |
| Weekly | Genome evolution, memory decay, rollback check, trust dashboard | Sentinel + Kelly |
| Monthly | Challenger promotion review, policy version review, SLA audit | Operator + Sentinel |
| Quarterly | Immune system pattern review, skill governance review | Operator |

## Escalation Contacts
- Level 1 (automated response): Circuit breaker, drift sentinel, policy engine
- Level 2 (operator notification): Rollback initiated, governance anomaly
- Level 3 (operator action required): Rollback failure, policy bypass attempt, trust score < 40
