---
tags: [security, risk, safety]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

---

## Context

Security in crypto spans wallet safety, smart contract and protocol risk, and cross-chain (bridge) risk. This document outlines how to reason about these areas for analysis and positioning, not for implementing security procedures.

## Main

**Wallet and key management:** Reason about key storage (hot vs cold), multisig thresholds, and recovery flows. Consider principle of least privilege: which keys can move what, and what happens if a key is compromised or lost. Avoid storing specific seed phrases or credentials in knowledge; reference setup or internal docs for procedures.

**Smart contract and protocol risk:** For any protocol, ask: who can upgrade or pause, who controls treasuries, and how oracles and liquidations work. Historical exploits (oracle manipulation, governance attacks, flash-loan-driven liquidations) illustrate failure modes; use them to build a checklist for similar systems.

**Bridge and cross-chain risk:** Bridges concentrate value and trust. Identify where assets are locked or minted, who validates or attests, and what delay or finality exists. Prefer frameworks (e.g. "validate custody and attestation model") over listing current bridges; for live data use actions/APIs.

## Conclusion

Use security knowledge for risk frameworks and "how to think" about trust and failure modes. For current threats, operational playbooks, or compliance, use dedicated security and operations resources.
