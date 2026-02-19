# Release Notes: VINCE Changelog (Closed PRs Scope)

**PRD ID:** PRD-20260212-LJEF
**Version:** 1.2
**Created:** 2026-02-12
**Updated:** 2026-02-13 (full scope: all closed PRs from [IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince))
**Priority:** P1 | **Effort:** S
**Status:** Ready for Implementation

---

## 🎯 North Star

Push, not pull. 24/7 market research. Self-improving paper trading bot. One team, one dream.

This PRD advances the mission by: **Generate release notes (CHANGELOG + What's New) by scanning all closed/merged PRs** so each release is accurately documented from the [closed PRs list](https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed).

**Agent Lanes (never overlap):**
• **Eliza:** Knowledge, research, content (CEO)
• **VINCE:** Data, signals, paper trading (CDO)
• **ECHO:** CT sentiment, X research, social alpha (CSO)
• **Oracle:** Prediction markets, Polymarket discovery, odds, portfolio (CPO)
• **Solus:** Execution, sizing, risk (CFO)
• **Otaku:** DeFi, wallet, onchain ops (COO)
• **Kelly:** Lifestyle, touch grass, standup coordinator (CVO)
• **Sentinel:** Ops, code, PRDs, infra (CTO)

---

## Daily Standup: Agent Roles and Quality Bar

Standup behavior and the quality bar for the multi-agent daily standup. The goal is to be as good as or better than asking a single model (e.g. Grok) the essential BTC question.

### Agent roles during standup

- **Kelly:** Always kicks off; keeps it very short; acts only as coordinator (no commentary, no long intros). Transitions are 3 words max (e.g. "@VINCE, go.").
- **VINCE:** Has the most accurate data and recent news. Reports paper trading bot results for perps on Hyperliquid. Live data (prices, funding, paper bot W/L and PnL) must drive his report.
- **Eliza:** Mostly listening. Use standup to spot knowledge gaps, suggest essays for Ikigai Studio Substack, and suggest research to upload to `knowledge/`. She does not lead; she reacts to what she hears.
- **Oracle:** Has Polymarket data but is still unreliable for real-time data. Do not overclaim; status can be "Polymarket in progress" or caveated.
- **Otaku:** Still under construction. Should be aware of who he is: agent with wallet (Bankr, Coinbase), DeFi skills. Brief status only; no fake execution.
- **Sentinel:** Reports what is next in terms of coding (what still needs to be done) and what has been pushed to the repo.
- **ECHO:** Should show that he can get insights from X via plugin-x-research (e.g. sentiment, key voices, narrative).
- **Solus:** Does most of the thinking during the standup. Primary focus: where will BTC land by next Friday (Hypersurface options settle weekly, Friday 08:00 UTC). Full context: we do options every week (wheel strategy); we sit in BTC and need data + sentiment + news to choose optimal strike for BTC covered calls on Hypersurface. Solus must synthesize data from VINCE, ECHO, Oracle and give a clear, Grok-style view.

### Essential question (example)

> "Based on current market sentiment, do you think BTC will be above $70K by next Friday?"

This is the type of question we want answered every daily standup. Solus should produce an answer of that quality.

### Quality bar: Grok-style answer (reference)

We expect Solus (and the Day Report) to produce something as actionable as this. Reference reply (Feb 13, 2026):

- **Current data:** e.g. BTC price (~$66,500), 24h change, distance from ATH.
- **Sentiment:** e.g. Fear & Greed (extreme fear), X sentiment bearish/short-term.
- **Macro / volatility:** e.g. liquidations, Fed policy, tech selloffs.
- **Polymarket / options:** e.g. odds BTC below $75K for February, options expiry / max pain.
- **On-chain / contrarian:** e.g. MVRV, base-building, JPM mining cost floor, Bernstein targets.
- **Clear answer:** Yes/No (e.g. "No, I don't think BTC will be above $70,000 by next Friday") with short-term path and caveats.

Example closing line: _"My take: No, I don't think BTC will be above $70,000 by next Friday. The prevailing extreme fear, recent 30%+ monthly drop, and lack of immediate bullish catalysts suggest continued chop or downside pressure in the $60,000–$70,000 range over the next week."_

The standup and Day Report must include: (1) the essential question, (2) Solus's call (Above/Below/Uncertain + one sentence), (3) TL;DR and actions.

---

## 📋 Closed PRs (Source of Truth)

**Source:** [Pull requests · IkigaiLabsETH/vince (closed)](https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed)

Use this list when generating release notes. Scan PR titles, descriptions, and linked issues to extract key changes.

| #   | Title                                                                                                         | Merged              |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| 20  | Daily Standup FineTune                                                                                        | 2026-02-13          |
| 19  | fix(standup): turn-based responses + concise prompts                                                          | 2026-02-13          |
| 18  | Feature/v2.4 multiagent                                                                                       | 2026-02-12          |
| 17  | feat(v2.5): Autonomous Trading Standup System                                                                 | 2026-02-12          |
| 16  | feat(v2.4): Symmetric A2A Discord Chat with Loop Protection                                                   | 2026-02-12          |
| 15  | feat: v2.3.0 — BANKR Deep Integration                                                                         | 2026-02-12          |
| 14  | docs: v2.2.0 release notes                                                                                    | 2026-02-12          |
| 13  | feat: plugin-x-research + ECHO agent (CSO)                                                                    | 2026-02-12          |
| 12  | Feature/plugin x research                                                                                     | 2026-02-12          |
| 11  | Feature/plugin eliza                                                                                          | 2026-02-11          |
| 10  | feat(plugin-sentinel): 10x upgrade - world-class core dev with PRDs, trading intelligence, multi-agent vision | 2026-02-11          |
| 9   | feat(plugin-eliza): Dedicated Eliza plugin with content production capabilities                               | 2026-02-11          |
| 8   | Implement OpenClaw plugin integration and enhance market data fetching…                                       | 2026-02-11          |
| 7   | 🚀 V2.0.0 - OpenClaw Enterprise Plugin (28+ Features)                                                         | 2026-02-11          |
| 6   | Refactor character plugin tests to use a type guard for plugin retrieval                                      | 2026-02-09          |
| 5   | Feat/oneteamonedream                                                                                          | 2026-02-09          |
| 4   | Frontend/otaku mirror                                                                                         | 2026-02-06          |
| 3   | Merge pull request #1 from IkigaiLabsETH/frontend/otaku-mirror                                                | 2026-02-06          |
| 2   | Frontend/otaku mirror                                                                                         | 2026-02-06 (closed) |
| 1   | Frontend/otaku mirror                                                                                         | 2026-02-06          |

**Key themes to extract (examples):** Sentinel 10x, Eliza plugin V2, OpenClaw, plugin-x-research, ECHO (CSO), BANKR, A2A + loop protection, autonomous standup, standup state/orchestrator/data fetcher, turn-based standup, Day Report, One Team One Dream, frontend/otaku mirror.

---

## 📋 Goal & Scope

**Title:** Release Notes: VINCE Changelog (Full Closed PRs Scope)
**Priority:** P1 | **Effort:** S
**Target Plugin:** `plugin-sentinel` (or doc tooling)

**What we're building:**
Generate release notes for the current release by scanning **all closed/merged PRs** from [IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince) (see table above).
Extract key changes per PR/theme: Sentinel 10x, Eliza plugin, OpenClaw, x-research, ECHO, BANKR, A2A/standup, frontend.
Output a GitHub-ready CHANGELOG entry + README "What's New" section.

**Why it matters:**

- Single source of truth: closed PRs drive release notes
- Accurate history from v1/v2 through standup fine-tune (PR #20)
- Reduces manual curation and missed PRs

---

## 👤 User Story

**As** Yves
**I want** release notes generated from all closed PRs (IkigaiLabsETH/vince)
**So that** CHANGELOG and What's New stay in sync with merged work (PR #1–#20)

**Primary Actor:** Developer / Claude Code
**Secondary Actors:** Agents (Eliza, VINCE, Solus, Otaku, Kelly, Sentinel)

---

## ✅ Success Criteria

**Must Have (P0):**

- [ ] Feature works as described in Goal
- [ ] No regression in existing functionality
- [ ] Tests pass: `bun test`
- [ ] TypeScript compiles: `bun run build`

**Should Have (P1):**

- [ ] Unit tests for new services
- [ ] Error handling for edge cases
- [ ] Logs at appropriate levels (debug, info, warn, error)

**Nice to Have (P2):**

- [ ] Performance within acceptable bounds
- [ ] Documentation updated if public API changes

---

## 🔧 Technical Specification

**Tech Stack:** ElizaOS + TypeScript + Bun + Supabase + ONNX

**Target Location:** `src/plugins/plugin-sentinel/src/`

**Architecture Rules (MANDATORY):**

1. **Plugin boundaries:** Logic lives in plugins, not agents. Agents are thin orchestrators.
2. **No duplicate lanes:** Each agent owns a clear domain. No overlapping responsibilities.
3. **Services over actions:** Complex logic goes in services; actions are thin wrappers.
4. **Type safety:** All parameters have TypeScript types. No `any` unless absolutely necessary.
5. **Testability:** New services include unit tests. Mocked external deps.
6. **Error handling:** Graceful degradation. Never crash the agent on external failures.
7. **Cache-first:** Expensive operations cache results. Use `.openclaw-cache/` or memory.
8. **No AI slop:** Code comments and logs use clear, human language. No 'leverage', 'utilize', 'robust'.

**Project Context:**
**Release notes source:** [Closed PRs · IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed) — see **Closed PRs** table in this PRD.
**Active Plugins:**
• plugin-vince: 28 actions, 33 services
• plugin-polymarket-discovery: 19 actions, 1 services
• plugin-openclaw: 15 actions, 14 services
• plugin-sentinel: 15 actions, 6 services
• plugin-eliza: 14 actions, 7 services

**In Progress:**
• X research ALOHA-style conclusion
• X All-In: Alpha, Insights, and Sentiment
• Kelly agent + plugin-kelly

**Current Blockers:**
• the container to become healthy and it never does. Common causes:
• a patch to `@elizaos/server` that fixes plugin route path stripping. The patch is applied in the Doc
• length and whether extract-only. Extract-only is cheap; full summary uses LLM tokens.

---

## 🛠 Implementation Guide (for Claude Code)

**Step-by-step:**

1. **Read context first:**
   - Open [closed PRs](https://github.com/IkigaiLabsETH/vince/pulls?q=is%3Apr+is%3Aclosed) and the **Closed PRs** table in this PRD
   - Check `src/plugins/plugin-sentinel/` (or doc tooling) for release-notes generation
   - Understand existing CHANGELOG / README format

2. **Create/modify files:**
   - Services go in `services/*.service.ts`
   - Actions go in `actions/*.action.ts`
   - Export from `index.ts`

3. **Follow patterns:**
   - Copy structure from similar existing files
   - Use `logger` from `@elizaos/core`
   - Add JSDoc comments for public functions

4. **Test:**
   - Add tests in `__tests__/*.test.ts`
   - Run `bun test` to verify
   - Run `bun run build` to check types

5. **Commit:**
   - Clear commit message: `docs: release notes from closed PRs (PR #1–#20)`
   - Reference this PRD ID in commit

**Mindset:** Coding 24/7. Keep the architecture as good as it gets.

---

## 🧪 Testing & Validation

**Unit Tests:**

- File: `src/plugins/plugin-sentinel/src/__tests__/release-notes-from-closed-prs.test.ts` (or equivalent)
- Mock external dependencies
- Test happy path + error cases

**Integration Tests:**

- Verify action triggers correctly
- Verify service outputs expected data
- Check cache behavior if applicable

**Manual Verification:**

- Run `elizaos dev`
- Trigger the action via chat
- Verify output matches expectations

**Commands:**

```bash
bun test src/plugins/plugin-sentinel/  # Run plugin tests
bun run build                     # Type check
elizaos dev                       # Manual test
```

---

## 🚫 Out of Scope

**NOT included in this PRD:**

- UI changes (unless explicitly stated)
- Database schema changes (unless explicitly stated)
- Changes to other plugins (except plugin-sentinel)
- Performance optimization (unless P0)
- Documentation updates (separate task)

**Future considerations:**

- Automate release-notes generation from closed PRs (e.g. on release tag)
- Per-version slices (e.g. “v2.2.0” = PRs merged before that tag)
- Integration with GitHub API for PR body/description extraction

---

_Generated by Sentinel PRD Generator. Keep the architecture as good as it gets._
