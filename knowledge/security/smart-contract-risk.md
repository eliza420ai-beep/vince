---
tags: [security, risk, safety]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

### Common Vulnerability Patterns

**Reentrancy:** Attacker's contract calls back into the vulnerable contract before the first execution completes. Classic defense: checks-effects-interactions pattern, reentrancy guards (`nonReentrant` modifier). Modern variant: read-only reentrancy via view functions that read stale state during cross-contract callbacks.

**Oracle manipulation:** Price feeds that rely on single-block spot prices are exploitable. Flash loans amplify this by providing unlimited capital for one transaction. Mitigation: Chainlink decentralized oracles, TWAP over multiple blocks, circuit breakers for extreme deviations.

**Access control failures:** Missing `onlyOwner` checks, unprotected `initialize()` functions on proxy contracts, or default visibility allowing anyone to call privileged functions. The Parity multisig hack ($150M frozen) stemmed from an unprotected library initialization.

### Insurance & Risk Transfer

**Nexus Mutual** provides discretionary cover for smart contract failures and protocol exploits. Coverage is claim-assessed — not automatic. Premiums reflect perceived risk (higher for newer or unaudited protocols). **Insurace** and **Unslashed** offer alternatives with different claim processes.

Insurance doesn't eliminate risk; it transfers it. Cover limits are often below total TVL, meaning a catastrophic exploit may not be fully reimbursable. Use insurance as one layer in a broader risk management stack: position sizing, diversification across protocols, and personal due diligence remain primary defenses.

_Last updated: 2026-02-15_
