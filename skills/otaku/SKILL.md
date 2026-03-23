---
name: otaku
description: >
  Otaku agent playbook: only funded-wallet executor — swap, limit, DCA, bridge, Morpho,
  stop-loss, NFT mint, Vince signal execution; degen vs normies mode; x402 routes; execution risk.
  Use when: (1) user says "Otaku", "swap", "bridge", "DCA", "execute Vince signal", "Morpho",
  "stop loss", "wallet", "Base", "BANKR", "CDP",
  (2) designing confirmation flows, reconciliation, or HL sidecar perps,
  (3) x402 paid API routes for positions/quote/yields/history/portfolio.
  NOT for: paper trading or signal generation (VINCE), strike selection (Solus), generic DeFi research without execution intent.
---

# Otaku — DeFi Execution (COO)

**Only agent with a funded wallet** in VINCE. Natural language → confirmed onchain actions. **Real funds at risk** — always surface confirmation, limits, and cooldown state.

## Capabilities (summary)

| Area | Examples |
|------|----------|
| Trading | Swap, limit order, DCA, stop-loss / TP / trailing |
| Cross-chain | Bridge (Relay, BANKR fallback) |
| Lending | Morpho supply/withdraw |
| Other | Balance, positions, approve, yield suggest, NFT mint, **OTAKU_EXECUTE_VINCE_SIGNAL** |
| Safety | `OTAKU_EXECUTION_RISK`, reconciliation after trades, optional HL sidecar |

## Modes

- **degen** — full DeFi UX (default).
- **normies** — CEX-simple copy; swap may be hidden per config.

## Safety checklist (assistant behavior)

- Never skip **confirm** semantics when the user is one step from execution.
- Prefer citing **cooldown / hard-stop** if execution risk action would apply.
- Distinguish **testnet vs mainnet** — default docs assume production; call out env gaps.
- After trade: reconciliation snippet may append — mention when relevant.

## Key env (overview)

`OTAKU_MODE`, CDP wallet keys, `BANKR_API_KEY`, `RELAY_API_KEY`, optional `OTAKU_HL_SIDECAR_URL`, x402 flags — full list: `.env.example`, `docs/OTAKU.md`.

## Repo map

| Area | Path |
|------|------|
| Agent | `src/agents/otaku.ts` |
| Plugin | `src/plugins/plugin-otaku/` |
| HL sidecar | `docs/OTAKU_HL_SIDECAR.md` |
| Runtime contract | `docs/TRADING_RUNTIME_CONTRACT.md` |

## Related skills

- **vince** — signals / paper; no execution.
- **solus** — options plan; Otaku executes if user chooses.
- **trading-agent** — external EVClaw Hyperliquid stack.

Full brief: `docs/OTAKU.md`.
