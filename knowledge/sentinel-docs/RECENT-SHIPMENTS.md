# Recent Shipments and GitHub Sources

Reference for Sentinel: what shipped recently and where to check for the latest closed PRs and OpenClaw fork activity.

---

## Recent Shipments (Last Few Days)

**Otaku agent (src/agents/otaku.ts):**

- Plugins now loaded: SQL, Bootstrap, OpenAI (optional), Web Search (optional), CDP, Morpho (when CDP), Relay (when CDP + RELAY_API_KEY), **Biconomy/MEE** (when CDP + BICONOMY_API_KEY — gasless cross-chain swaps/rebalance), **DefiLlama** (always — protocol TVL, GET_PROTOCOL_TVL, GET_YIELD_RATES), Bankr (when BANKR_API_KEY), Etherscan (optional).
- **Not loaded:** Clanker (redundant with Bankr for token launch on Base + Solana), CoinGecko (execution/quote from Relay/Bankr/Nansen; Hyperliquid preferred elsewhere).
- OTAKU.md updated with full plugin-loading notes.

**plugin-relay:** Type fix in RelayService.initialize: apiKey from runtime.getSetting normalized to string | undefined to fix TS 2322.

**Bankr:** Token launch is first-class ("deploy a token called X on base" / "launch a token on solana" via BANKR_AGENT_PROMPT). We are Bankr-first; Clanker kept only if a direct Base SDK path is needed.

**Standup/PRD:** docs/standup/prds/2026-02-12-prd-v2-1-0-release-notes-sentinel-eliza-upgrades.md — v2.1.0 release notes (Sentinel + Eliza upgrades).

---

## Canonical GitHub Sources (Check These for Latest)

When asked about recent merges, shipped features, or OpenClaw work, use or cite:

1. **Closed PRs (main repo):** https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed — use when asked about recent merges, shipped features, or "what landed."
2. **OpenClaw fork and branches:** https://github.com/eliza420ai-beep/vince/branches — OpenClaw contributions and feature branches; use when asked about OpenClaw work or upstream integration.

Update the snapshots below when syncing sentinel-docs, or run web search for the current list.

---

## Snapshot of Closed PRs (as of 2026-02-12)

From https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed:

| PR  | Title                                                                                                         | Merged       |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| #13 | feat: plugin-x-research + ECHO agent (CSO)                                                                    | Feb 12, 2026 |
| #12 | Feature/plugin x research                                                                                     | Feb 12, 2026 |
| #11 | Feature/plugin eliza                                                                                          | Feb 11, 2026 |
| #10 | feat(plugin-sentinel): 10x upgrade - world-class core dev with PRDs, trading intelligence, multi-agent vision | Feb 11, 2026 |
| #9  | feat(plugin-eliza): Dedicated Eliza plugin with content production capabilities                               | Feb 11, 2026 |
| #8  | Implement OpenClaw plugin integration and enhance market data fetching                                        | Feb 11, 2026 |
| #7  | V2.0.0 - OpenClaw Enterprise Plugin (28+ Features)                                                            | Feb 11, 2026 |
| #6  | Refactor character plugin tests to use a type guard for plugin retrieval                                      | Feb 9, 2026  |
| #5  | Feat/oneteamonedream                                                                                          | Feb 9, 2026  |
| #4  | Frontend/otaku mirror                                                                                         | Feb 6, 2026  |
| #3  | Merge pull request #1 from IkigaiLabsETH/frontend/otaku-mirror                                                | Feb 6, 2026  |
| #1  | Frontend/otaku mirror                                                                                         | Feb 6, 2026  |

Update this snapshot when syncing sentinel-docs or run web search for current list.

---

## Snapshot of OpenClaw Fork Branches (as of 2026-02-12)

From https://github.com/eliza420ai-beep/vince/branches:

- main
- feature/plugin-x-research-impl
- feature/plugin-x-research
- feature/sentinel-10x
- feature/plugin-eliza
- feature/v2-roadmap

Update when relevant; use GitHub or web search for latest.
