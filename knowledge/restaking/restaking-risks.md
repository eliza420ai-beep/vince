---
tags: [restaking, ethereum, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Restaking Risks

## Leverage Stacking

Restaking creates implicit leverage. The same ETH simultaneously secures Ethereum consensus, one or more AVSs via EigenLayer, and potentially serves as DeFi collateral through an LRT. This isn't leverage in the traditional borrowed-money sense, but it's **obligation stacking** — the same capital backs multiple commitments.

The danger: each layer assumes the underlying capital is available. If slashing reduces the collateral, it simultaneously affects the ETH staking position, the AVS security guarantee, and any DeFi position using the LRT. The effective leverage ratio can be 3-5x in terms of obligations-to-capital, depending on how many AVSs a restaker opts into and how the LRT is deployed in DeFi.

Yield farmers compound this by looping: deposit ETH → get LRT → use LRT as collateral to borrow ETH → restake again. This recursive leverage amplifies returns and risks exponentially.

## Correlated Slashing

The nightmare scenario for restaking: an event that triggers slashing across multiple AVSs simultaneously.

- **Operator overlap**: If a small number of operators run most AVSs (which is currently the case), a single operator failure — compromised keys, infrastructure outage, or malicious behavior — could trigger slashing across every AVS they validate. Since the same restaked ETH backs all of them, losses compound.
- **Correlated infrastructure**: Many operators use the same cloud providers (AWS, Hetzner). A cloud outage could cause mass liveness failures. If multiple AVSs slash for downtime (some do), the same ETH gets slashed repeatedly.
- **Smart contract bug in EigenLayer core**: A vulnerability in EigenLayer's delegation or slashing contracts could affect all AVSs simultaneously. This is the single biggest systemic risk — the entire restaking ecosystem shares this dependency.

## Smart Contract Risk

The restaking stack is deep and each layer introduces contract risk:

1. **Ethereum staking contracts** — Battle-tested, lowest risk
2. **EigenLayer core contracts** — Audited but complex; strategy manager, delegation manager, slasher contracts interact in non-trivial ways
3. **AVS-specific contracts** — Varying quality; some AVSs are early-stage with minimal auditing
4. **LRT protocol contracts** — Another layer of wrapping, minting, and redemption logic
5. **DeFi integration contracts** — Lending protocols, DEXs, vaults that accept LRTs as collateral

A bug at any layer cascades upward. An AVS with flawed slashing logic could illegitimately slash restaked ETH. A compromised LRT contract could drain underlying restaked positions. The composability that makes DeFi powerful also makes it fragile.

## Cascade Scenarios

### Scenario 1: The Depeg Spiral

An AVS slashing event reduces the NAV of a major LRT. The LRT depegs on secondary markets. DeFi lending protocols begin liquidating LRT collateral positions. Liquidation selling deepens the depeg. More positions get liquidated. Trust evaporates, and redemption queues spike as holders rush to exit. The restaking equivalent of a bank run.

### Scenario 2: The Operator Compromise

A top-5 operator by delegated stake has its signing keys compromised. The attacker triggers slashable offenses across 10+ AVSs the operator validates. Since delegation is non-custodial but slashing is automatic, restakers who delegated to this operator lose a percentage of their ETH across all AVS slashing conditions. Multiple LRTs that delegated to this operator see their backing reduced simultaneously.

### Scenario 3: The Governance Failure

EigenLayer's slashing veto committee fails to act on an illegitimate slash (due to inaction, compromise, or disagreement). Restakers lose funds to a buggy AVS. Trust in the veto mechanism collapses. Capital flight from EigenLayer triggers mass withdrawals, destabilizing AVSs that depend on the security budget.

## Mitigating Factors

- **Slashing veto committee** provides a backstop (but introduces centralization)
- **Gradual slashing rollout** — EigenLayer delayed enabling slashing until contracts were battle-tested
- **AVS insurance** via protocols like Nexus Mutual could partially cover losses
- **Operator diversification** by LRT protocols reduces single-operator exposure
- **Withdrawal delays** provide time buffers against instant cascade failures

The fundamental tension: restaking's value proposition requires meaningful slashing risk (otherwise the security is hollow), but meaningful slashing risk in a composable system creates systemic fragility. This is an unresolved design challenge that will likely require a real stress event to fully understand.

_Last updated: 2026-02-15_
