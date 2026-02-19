# List test PRD

**PRD ID:** PRD-20260219-UUUT
**Version:** 1.0
**Created:** 2026-02-19
**Priority:** P1 | **Effort:** M
**Status:** Ready for Implementation

---

## 🎯 North Star

Push, not pull. 24/7 market research. Self-improving paper trading bot. One team, one dream.

This PRD advances the mission by: **List test PRD...**

**Agent Lanes (never overlap):**
• **Eliza:** Knowledge, research, content (CEO)
• **VINCE:** Data, signals, paper trading (CDO)
• **Solus:** Execution, sizing, risk (CFO)
• **Otaku:** DeFi, wallet, onchain ops (COO)
• **Kelly:** Lifestyle, touch grass (CVO)
• **Sentinel:** Ops, code, PRDs, infra (CTO)

---

## 📋 Goal & Scope

**Title:** List test PRD
**Priority:** P1 | **Effort:** M

**What we're building:**
List test PRD

**Why it matters:**
- Advances 24/7 market research capability
- Reduces manual intervention
- Improves system reliability or user experience

---

## 👤 User Story

**As** the team
**I want** list test prd
**So that** I can list test prd

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

**Target Location:** `src/plugins/plugin-vince/src/`


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
**Active Plugins:**
• plugin-naval: 41 actions, 0 services
• plugin-vince: 27 actions, 34 services
• plugin-polymarket-discovery: 21 actions, 1 services
• plugin-sentinel: 16 actions, 7 services
• plugin-eliza: 15 actions, 8 services

**In Progress:**
• X research ALOHA-style conclusion
• X All-In: Alpha, Insights, and Sentiment
• Kelly agent + plugin-kelly

**Current Blockers:**
• model choice + context size + token volume, making it harder to predict than flat-rate APIs.
• length and whether extract-only. Extract-only is cheap; full summary uses LLM tokens.
• X plugin/API. PRD: clarify News API scope and rate limits.

---

## 🛠 Implementation Guide (for Claude Code)

**Step-by-step:**

1. **Read context first:**
   - Check `src/plugins/plugin-vince/` structure
   - Review related services in `src/plugins/plugin-vince/src/services/`
   - Understand existing patterns

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
   - Clear commit message: `feat(plugin-vince): list test prd`
   - Reference this PRD ID in commit

**Mindset:** Coding 24/7. Keep the architecture as good as it gets.

---

## 🧪 Testing & Validation

**Unit Tests:**
- File: `src/plugins/plugin-vince/src/__tests__/list-test-prd.test.ts`
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
bun test src/plugins/plugin-vince/  # Run plugin tests
bun run build                     # Type check
elizaos dev                       # Manual test
```

---

## 🚫 Out of Scope

**NOT included in this PRD:**
- UI changes (unless explicitly stated)
- Database schema changes (unless explicitly stated)
- Changes to other plugins (stay in lane)
- Performance optimization (unless P0)
- Documentation updates (separate task)

**Future considerations:**
- List test PRD V2 with expanded capabilities
- Integration with other agents if needed

---

*Generated by Sentinel PRD Generator. Keep the architecture as good as it gets.*
