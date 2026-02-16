# Agent Briefing Index (OpenClaw / PRD)

This folder contains **one briefing document per agent** in the VINCE multi-agent system. Each doc states what that agent **can** and **cannot yet** do, with key files and suggested PRD angles. They are **actionable for OpenClaw** (or any downstream agent) to draft **next-iteration PRDs**.

---

## Agent docs

| Agent | Doc | Role | One-line |
|-------|-----|------|----------|
| **Eliza** | [ELIZA.md](ELIZA.md) | CEO | Research, knowledge expansion, content production; handoffs for live data to VINCE. |
| **VINCE** | [VINCE.md](VINCE.md) | CDO | Data and paper trading bot; ALOHA, options, perps, memes, lifestyle; no execution. |
| **ECHO** | [ECHO.md](ECHO.md) | CSO | Crypto Twitter sentiment, pulse/vibe, watchlist, save research; handoffs for price/TA to VINCE. |
| **Oracle** | [ORACLE.md](ORACLE.md) | CPO | Polymarket read-only: discovery, odds, portfolio; handoffs for perps/options to VINCE, execution to Solus/Otaku. |
| **Solus** | [SOLUS.md](SOLUS.md) | CFO | Hypersurface options: strike ritual, mechanics, position assess, optimal strike; spot + pasted context; no execution. |
| **Otaku** | [OTAKU.md](OTAKU.md) | COO | Only agent with a funded wallet; swap, bridge, DCA, Morpho, stop-loss, NFT mint, Vince signal execution. |
| **Kelly** | [KELLY.md](KELLY.md) | CVO | Lifestyle concierge; one team one dream (orchestrates others via ASK_AGENT); plugin-personality (self-modification). |
| **Sentinel** | [SENTINEL.md](SENTINEL.md) | CTO | Core dev: PRDs, project radar, impact suggestions, OpenClaw expert, cost status, ART; weekly + optional daily tasks. |

---

## How to use these docs

1. **OpenClaw / Milaidy:** Ingest the full set (or a subset) to understand current agent capabilities and gaps. Use "What X Cannot Do Yet / Gaps" and "For OpenClaw / PRD" to propose work items and PRDs for the next iteration.
2. **PRD drafting:** Each doc ends with a short "For OpenClaw / PRD" section suggesting concrete PRD themes (e.g. testnet runbook, fallbacks, new actions).
3. **Onboarding:** New contributors can read the agent doc for the area they work on; "Key files" points to the right places in the repo.
4. **Consistency:** All agent briefs follow the same shape: role, why they matter, can do, cannot yet, key files, PRD focus, references. OTAKU.md is the longest reference; others are shorter but aligned.

---

## References

- [CLAUDE.md](CLAUDE.md) — VINCE project layout and agent map.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT, Discord, A2A, handoffs.
- [knowledge/teammate/THREE-CURVES.md](knowledge/teammate/THREE-CURVES.md) — Left (Vince perps), mid (HIP-3), right (Solus options).
