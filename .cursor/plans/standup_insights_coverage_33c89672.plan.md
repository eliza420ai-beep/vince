---
name: Standup insights coverage
overview: "Ensure the daily standup reliably gets: (1) ECHO — X insights plus content suggestions for X; (2) Eliza — Substack content suggestions (already present, make explicit); (3) Oracle — Polymarket insights (already present, verify); (4) Solus — explicit Hypersurface onchain options recommendations."
todos: []
isProject: false
---

# Standup insights: ECHO (X), Eliza (Substack), Oracle (Polymarket), Solus (Hypersurface)

## Current state


| Agent      | What standup already gets                                                                                                                                                                       | Gap                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **ECHO**   | CT sentiment from X (tweets, 24h, via [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) `fetchEchoData`)                                                | No "content suggestions for X" (tweet/post ideas)                                                            |
| **Eliza**  | Delta (yesterday vs today), facts, plus LLM: one Substack topic + one knowledge area ([standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) ~594–612)       | Substack is there; could make labels explicit in shared insights                                             |
| **Oracle** | Polymarket priority markets (8 markets, YES%, condition_id) via [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) `fetchOracleData`; cap 800 chars      | None; verify cap is enough                                                                                   |
| **Solus**  | Directive + last-week strategy; template asks for "My take" and "Action: Size/Skip + strike recommendation" ([standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts)) | Template does not explicitly say "Hypersurface recommendation"; Solus already sees VINCE + Oracle in kickoff |


Shared insights are built in [standup.tasks.ts](src/plugins/plugin-inter-agent/src/standup/standup.tasks.ts) `buildAndSaveSharedDailyInsights`: for each agent in `STANDUP_REPORT_ORDER`, `fetchAgentData(runtime, displayName, contextHints)` is called, then result is capped per agent (e.g. Oracle 800, ECHO 600, Solus 600) and concatenated. So all four agents’ data is already in the kickoff; the ask is to add or clarify specific outputs.

---

## 1. ECHO — Add content suggestions for X

**Goal:** Standup gets both (a) CT sentiment from X and (b) 1–2 content ideas for X (tweet/post).

**Option A (recommended):**  

- **Report template** ([standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts) ECHO template): Add a line such as:  
`**Content for X:** [1–2 tweet or post ideas that would resonate with today’s CT pulse]`  
so when ECHO speaks, they are explicitly asked to output X content suggestions.  
- **Pre-read kickoff (optional):** In [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) `fetchEchoData`, after building the sentiment block, call `runtime.useModel` once with the sentiment text and ask for “1–2 tweet or post ideas for our X account based on the sentiment above; one sentence each.” Append a line like `**X content ideas:** …` to the returned string. That way the shared insights doc also contains X content suggestions before ECHO’s turn (useful if ECHO is skipped or for consistency).

**Option B (template only):** Only add the “Content for X” line to the ECHO report template; no change to `fetchEchoData`. Cheaper; suggestions only appear when ECHO actually replies.

**Recommendation:** Do both: template + optional LLM append in `fetchEchoData` so the kickoff always includes an X content-suggestion line and ECHO’s reply can refine or repeat it.

---

## 2. Eliza — Substack (and knowledge) suggestions

**Current:** `fetchElizaData` already calls `runtime.useModel` for “One Substack content topic for Ikigai Studio” and “One area in the knowledge/ directory to expand” and appends the raw LLM text to sections.

**Change:** Format the LLM output so the shared insights clearly label both parts. For example, parse or prompt the model to return two lines and prepend `**Substack idea:`** and `**Knowledge to expand:`** when pushing to `sections` (or adjust the prompt so the model outputs those headers). That keeps Substack and knowledge suggestions explicit in the pre-read and in [standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts) Eliza template (“Essay idea (Ikigai Studio Substack)” is already there).

No new data source; only clearer structure/labels so “content suggestions for Substack” is guaranteed to be recognizable in the standup.

---

## 3. Oracle — Polymarket insights

**Current:** `fetchOracleData` returns a markdown table of priority markets (YES%, condition_id). Cap for Oracle is 800 chars in [standup.tasks.ts](src/plugins/plugin-inter-agent/src/standup/standup.tasks.ts) `DEFAULT_INSIGHTS_CAP_BY_AGENT`.

**Change:** No functional change. Optionally: (a) add a one-line comment in `standupDataFetcher.ts` above `fetchOracleData` that this block is “insights from Polymarket” for future readers; (b) if the table grows (e.g. more markets or columns), consider raising Oracle’s cap via `STANDUP_INSIGHTS_CAP_ORACLE` or the default. As-is, 8 markets fit within 800 chars.

---

## 4. Solus — Hypersurface onchain options recommendations

**Current:**  

- `fetchSolusData` returns last-week strategy + a directive: “propose this week’s BTC covered call strike… State: strike price, direction (above/below), premium target, invalidation level. Reference VINCE’s DVOL, funding, regime. Reference Oracle’s odds.”  
- Solus’s report template already has “My take”, “Action: Size/Skip + strike recommendation”, and the structured call block.  
- When Solus replies, he sees the full kickoff (VINCE section with DVOL/best CC, Oracle section with Polymarket odds).

**Change:**  

- In [standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts) Solus template, add one explicit line, e.g.:  
`**Hypersurface recommendation:** Strike, direction (above/below), invalidation for this week’s covered call or CSP.`  
so the standup output is unambiguously “recommendations for onchain options on Hypersurface”.  
- No need to change `fetchSolusData` to pull live strikes: Solus already has VINCE and Oracle in the same kickoff; the directive and template are enough to elicit a concrete recommendation. Optional later improvement: if a “suggested strike” line from VINCE (e.g. from Deribit best CC) were passed into Solus’s block, it would require refactoring how shared insights are built (e.g. pass prior sections into later fetchers); out of scope for this plan.

---

## 5. Caps and ordering

- **Caps:** Current defaults (VINCE 2400, Oracle 800, ECHO 600, Solus 600, Eliza 500, etc.) stay; only consider raising Oracle if you add more markets.  
- **Order:** Build order is fixed by `STANDUP_REPORT_ORDER`; VINCE is first so `vinceContextHints` are set for ECHO and Clawterm. No change.  
- **Naval:** In the report order but has no `fetchAgentData` case; he gets “(no data)” in shared insights, which is fine since his role is conclusion-only.

---

## Implementation summary


| Item                              | File(s)                                                                                   | Action                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ECHO X content suggestions        | [standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts)         | Add “**Content for X:** …” line to ECHO template                                 |
| ECHO X content in kickoff         | [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) | Optionally append LLM-generated “X content ideas” to `fetchEchoData` return      |
| Eliza Substack/knowledge labels   | [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) | Format Eliza LLM output with “**Substack idea:**” and “**Knowledge to expand:**” |
| Oracle                            | [standupDataFetcher.ts](src/plugins/plugin-inter-agent/src/standup/standupDataFetcher.ts) | Optional comment only                                                            |
| Solus Hypersurface recommendation | [standupReports.ts](src/plugins/plugin-inter-agent/src/standup/standupReports.ts)         | Add “**Hypersurface recommendation:** …” line to Solus template                  |


No new env vars or plugins; only template text and optional fetcher formatting/LLM call.