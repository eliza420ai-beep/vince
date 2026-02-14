# VINCE v2.5.0 — We Shipped a Lot

**Release date:** 2026-02-14

This release packs **Clawterm**, **OpenClaw**, **standups**, and two new DeFi plugins. One team, one dream—with more structure and more data.

---

## 🦞 Clawterm & standups

- **Clawterm agent** — Bio, configuration, and day report action (`CLAWTERM_DAY_REP`)
- **Standup facilitator** — Refactored data fetching; clearer lessons, action items, and relationship signals
- **Structured standups** — Runs twice daily; lessons stored per agent; summary to #daily-standup

## 🔗 OpenClaw integration

- **OpenClaw plugin tests** — Test coverage for adapter and data flow
- **Data source clarity** — Documented and clarified OpenClaw data sources
- **Security** — Hardening and security guidance in knowledge
- **Knowledge base** — OpenClaw-specific knowledge for Sentinel and handoffs
- **Adapter** — Enhanced OpenClaw adapter for ElizaOS ↔ OpenClaw hybrid mode

## 📦 New plugins

- **@elizaos/plugin-8004** — ERC-8004 (identity/attestation) integration
- **plugin-defillama** — DeFiLlama integration for Otaku: protocol TVL, yield rates, TVL/yield history; no API key required

## ⚡ Core & UX

- **A2A context** — Enhanced agent-to-agent context provisioning
- **Dashboard leader** — Volume-based leaderboard and dashboard improvements
- **Gamification** — Rebels ranking and engagement features
- **Agent branding** — Clearer agent lanes and voice consistency
- **plugin-vince** — Various enhancements and stability improvements

---

**Full changelog:** [CHANGELOG.md](../CHANGELOG.md)

**Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud`

---

## Create this release on GitHub

From repo root, with [GitHub CLI](https://cli.github.com/) installed and authenticated:

```bash
# Create tag and release in one step (uses this file as body)
gh release create v2.5.0 --title "v2.5.0 — We shipped a lot" --notes-file docs/RELEASE_v2.5.0.md

# Or create tag first, then release
git tag v2.5.0
git push origin v2.5.0
gh release create v2.5.0 --title "v2.5.0 — We shipped a lot" --notes-file docs/RELEASE_v2.5.0.md
```
