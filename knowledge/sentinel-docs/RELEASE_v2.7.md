# VINCE v2.7.0

> **Release date:** 2026-02-16

Otaku is the star: the only agent with a funded wallet and onchain execution. This release tightens docs, grant positioning, and the path to testnet MVP.

---

## Otaku: the executor

- **13 actions** — Swap, limit order, DCA, positions, bridge, balance, stop-loss, Morpho, approve, NFT mint, yield recommend, rebalance, execute Vince signal
- **API** — Free: health, config, alerts, notifications (per-user completion events), gas. Paid (x402): positions, quote, yields, history, portfolio
- **Notifications** — Wallet history + alerts (Morpho/DCA/stop-loss) + DB-backed completion events; merged in UI with socket refresh and refetch on focus
- **Wallet UI** — Degen vs Normies mode from `GET /otaku/config`; mode-aware copy and optional Swap in normies
- **Docs** — [OTAKU.md](OTAKU.md) fully updated; **For Developers (Roy)** section: can/cannot do, key files, run instructions, suggested issues for testnet MVP
- **Grant** — [Base Builder Grant application](grants/BASE-BUILDER-GRANT-APPLICATION.md) rewritten with Otaku as core; other agents as context only; VC/grant framing

---

## What’s next

We’re grinding hard on two fronts:

1. **Kelly** — Make our personal lifestyle agent as good as it gets: deeper knowledge on the topics that matter most (travel, dining, wine, health, fitness), so she’s the one concierge we actually use every day.
2. **Sentinel** — Gen art passion project: a **QQL derivative** — Sentinel’s long-standing obsession with generative art (Meridian, QQL, Ringers, Fidenza, XCOPY) turns into a real side project we can ship.

---

**Full changelog:** [CHANGELOG.md](../CHANGELOG.md)

**Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud`

---

## Create this release on GitHub

```bash
git tag v2.7.0
git push origin v2.7.0
gh release create v2.7.0 --title "v2.7.0 — Otaku star, Kelly & Sentinel grind" --notes-file docs/RELEASE_v2.7.md
```
