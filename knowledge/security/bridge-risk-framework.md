---
tags: [security, risk, safety]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

---

## Context

Cross-chain bridges lock or mint assets across chains and concentrate value and trust. This doc outlines how to reason about bridge design and risk for analysis and positioning, not for listing current bridges or TVL.

## Main

**Custody and attestation:** Where are assets locked (source chain) and who can mint or release (destination)? Single validator set vs multi-party; fraud proofs vs delay period; upgradeability and admin keys. These determine trust and failure modes.

**Finality and delay:** Source and destination chains may have different finality rules and reorg risk; withdrawal or dispute windows should align with finality. Use frameworks (e.g. "validate delay vs finality") rather than quoting specific bridges.

**Concentration and contagion:** Bridges are high-value targets; exploit or insolvency can affect multiple chains and dependent protocols. Map which protocols and chains rely on which bridge for contagion assessment.

**Related content:** See security-frameworks.md for general security methodology; defi-metrics for TVL and flow frameworks where bridges are discussed.

## Conclusion

Use this for bridge risk and design frameworks. For current bridge TVL, status, or operational procedures, use actions and dedicated security resources.
