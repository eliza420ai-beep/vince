---
tags: [security, risk, safety]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

### Seed Phrase Management

Seed phrases are the root of all custody. Protect them with the same rigor as the assets they control.

**Storage rules:** Never digital — no photos, no cloud storage, no password managers for raw seeds. Use steel/titanium backups (Cryptosteel, Billfodl) rated for fire and flood. Split across locations using Shamir's Secret Sharing (SSS) if single-point-of-failure is unacceptable. A 2-of-3 Shamir split means any two shares reconstruct the seed, but a single stolen share reveals nothing.

**Passphrase (25th word):** Adds a memorized component that creates an entirely separate wallet. Even if seed is compromised, assets behind the passphrase remain safe. Trade-off: forgetting the passphrase means permanent loss.

### Social Engineering Defense

The most sophisticated wallet setup fails against a well-crafted social attack. Common vectors include fake customer support (Ledger will never DM you), airdrop claim sites requiring wallet connection, and "urgent security migration" scams.

**Defensive posture:** Treat all unsolicited contact as hostile. Verify through official channels only (bookmarked URLs, not search results). Use burner wallets for new dApps. Never share screen during signing. Establish personal verification protocols with multisig co-signers (out-of-band confirmation via pre-agreed channels).

**Operational discipline:** Separate browser profiles for DeFi (no personal browsing). Dedicated device for high-value signing. Review all transaction data on hardware wallet screen, not just the software prompt. If the hardware display doesn't match expectations, reject and investigate.

The wallet security stack is only as strong as its weakest behavioral link. Technology provides the ceiling; discipline determines where you actually operate.

_Last updated: 2026-02-15_
