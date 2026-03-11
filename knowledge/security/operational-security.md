---
tags: [security, risk, safety]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

### Endpoint Security

**Device hygiene:** Keep OS and browsers updated. Use a password manager (1Password, Bitwarden) with unique passwords per site. Enable 2FA everywhere — hardware keys (YubiKey) > authenticator apps > SMS (vulnerable to SIM swap). Never use SMS 2FA for crypto-adjacent accounts.

**Browser isolation:** Separate browser profiles: one for DeFi (minimal extensions — just wallet), one for general browsing. Consider Brave or a hardened Firefox config for DeFi. Disable auto-fill in the DeFi profile.

### Phishing Defense

**URL verification:** Bookmark every protocol you use. Access only via bookmarks, never via search results, Discord links, or Twitter links. Verify SSL certificates on sensitive sites. Use ENS/DNS resolution carefully — DNS hijacks have redirected legitimate domains to drainer contracts.

**Communication hygiene:** No legitimate project will DM you first. No legitimate support agent will ask for your seed phrase or ask you to "validate your wallet." Treat all unsolicited crypto communication as adversarial until proven otherwise.

### Safe Signing Practices

**Transaction simulation first:** Before signing any transaction, simulate it. Rabby wallet does this automatically. For MetaMask, use the Tenderly Chrome extension or Fire. If the simulation shows assets leaving your wallet that you don't expect, reject.

**Permit signatures are dangerous:** EIP-2612 permit signatures authorize token spending off-chain — they don't appear as on-chain approvals and can't be revoked via revoke.cash until used. Treat any `permit` signing request with extreme caution. Wallet drainers increasingly use permit-based flows because they bypass approval-checking tools.

**Batch revoke regularly:** Set a monthly calendar reminder. Go to revoke.cash, connect wallet, review all active approvals. Revoke anything you don't actively need. The gas cost of revocation is trivial compared to the risk of a stale unlimited approval being exploited.

_Last updated: 2026-02-15_
