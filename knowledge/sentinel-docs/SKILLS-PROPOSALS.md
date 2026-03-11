# Proposed Cursor Skills — Belief-Router Grade

_Push, not pull. One team, one dream. No hype._

This doc proposes **four new skills** for Cursor/Claude that match the quality and structure of the [Belief Router](https://github.com/rohunvora/belief-skill/blob/main/SKILL.md): clear triggers, input validation, structured process, fixed output format, and rules. Each fits VINCE/LIVETHELIFETV brand, north star (proactive agent, stay in the game without 12+ hours on screens), and existing agents (Solus, Sentinel, VINCE, Kelly, Eliza).

---

## Reference: What makes Belief Router strong

- **Single job:** Route a belief/thesis into the single best trade expression. Not portfolio construction, not execution.
- **Input validation:** Is it a thesis? Specific enough? Reframe or ask before researching.
- **Structured analysis:** Thesis shape, deeper claim, research budget, hard gates, rubric (alignment, payoff shape, edge, timing).
- **Tools:** Content extraction, instrument discovery (Robinhood, Kalshi, Hyperliquid, Bankr, Angel), return calculations. Batched where possible.
- **Output:** The Take (streamed, 4–6 paragraphs) + The Card (≤10 lines, fixed format) + follow-ups + disclaimer.
- **Rules:** Expressions not advice, always show downside, conviction breakeven, evidence over logic.

The skills below aim for the same level of rigor and scannability.

---

## 1. Strike Ritual Skill

**name:** strike-ritual  
**description:**  
ALWAYS activate when user asks for the **weekly options decision**: covered call vs secured put, which asset (BTC, ETH, SOL, HYPE), size/skip/watch, and invalidation. Fits the Solus/Hypersurface lane and the $100K stack execution architect.  
Triggers: "strike ritual", "options this week", "covered call or put", "what to sell Friday", "Hypersurface decision", "size skip watch", "weekly options", "which asset this week".  
NOT for: executing trades (Otaku), belief routing (Belief Router), or general options education.

### Purpose

One output per run: **the single recommended structure** for the coming week—covered call or secured put, on which asset, what size (or skip/watch), and where invalidation lives. Same discipline as Belief Router (one trade, commit) but for the weekly options ritual.

### Input validation

1. **Stack context:** Default $100K notional. User can say "stack is $50K" or "size: 25K" — use that for size/skip/watch language.
2. **Market view:** If user provides a view ("bullish", "range-bound", "defensive"), use it. If not, infer from available data (spot trend, IV, funding) or state "no view given — defaulting to neutral."
3. **Current positions:** If user mentions open options or roll decisions, factor them in; otherwise assume clean slate.

### Process

1. **Asset scan:** For BTC, ETH, SOL, HYPE (or user-specified list): spot level, 7d trend, IV regime (if available), funding (if perp relevant). Use project scripts or external data (Birdeye, Hypersurface, Hyperliquid) where they exist.
2. **Structure choice:** Covered call vs secured put — match to view (bullish → CC on strength; bearish/defensive → put; neutral → either with clear invalidation).
3. **Size/skip/watch:** One of: SIZE (commit size), SKIP (no trade this week, reason), WATCH (wait for level/catalyst, state condition).
4. **Invalidation:** One line: "Invalidation: [price or condition]. Below/above that, thesis is wrong."
5. **Cross-check:** Could the other structure (CC vs put) be better? State why winner wins.

### Output

**Part 1: The Call (streamed)**  
4–5 short paragraphs: (1) This week: [structure] on [asset]. (2) Why this asset. (3) Why this structure. (4) Size/skip/watch and invalidation. (5) Alt: [other structure] if [condition].

**Part 2: The Card (fixed format)**

```
[ASSET] · [COVERED_CALL | SECURED_PUT] · [SIZE | SKIP | WATCH]
Notional: $[X] · Strike zone: [range or "TBD at open"]
Invalidation: [price or condition]
Alt: [other structure] on [asset] if [condition]
```

**Rules:** No execution. No key or wallet. Expressions, not advice. End with: "Solus owns execution. Do your own sizing."

### Optional tools

- Spot/IV: `scripts/` or plugin-solus data if available; otherwise document "pull spot/IV from [source]".
- Hypersurface: link to strike/contract discovery when implemented.

---

## 2. Cost Burn Skill

**name:** cost-burn  
**description:**  
ALWAYS activate when user asks **what we're spending** or **what's our burn**: inference, APIs, infra, by agent or category. Fits Sentinel as cost steward and TREASURY (cover costs, then profitability).  
Triggers: "what's our burn", "cost status", "how much are we spending", "Sentinel cost", "TREASURY", "inference cost", "API spend", "monthly burn".  
NOT for: trading PnL, revenue (use TREASURY doc or Otaku for that), or setting budgets (human decision).

### Purpose

One output per run: **current burn picture** — totals, trend (vs last period if available), and one "cover costs" reminder. Scannable in 30 seconds.

### Input validation

1. **Range:** Default "this month" or "current period". User can say "last 30 days", "Q1", "this week".
2. **Granularity:** Default by category (inference, APIs, infra, other) and optionally by agent if data exists. User can ask "by agent" or "just total".

### Process

1. **Data source:** Read from TREASURY.md, standup cost summaries, or Sentinel cost output (SENTINEL_COST_STATUS). If no structured data, list what would be needed (e.g. "Usage tab + Supabase + Discord billing") and output a template.
2. **Totals:** Sum by category. If by agent: VINCE, Kelly, Solus, Sentinel, Eliza, Otaku, etc.
3. **Trend:** Compare to prior period if available; otherwise "no prior data — add next month."
4. **One line:** "Cover costs: [revenue or target] vs burn $X — [gap or OK]."

### Output

**Part 1: The Summary (streamed)**  
3–4 short paragraphs: (1) Total burn this period: $X. (2) Breakdown (inference, APIs, infra). (3) By agent if requested. (4) Trend and "cover costs" line.

**Part 2: The Card (fixed format)**

```
BURN · [period]
Total: $[X]
  Inference: $[X]
  APIs:      $[X]
  Infra:    $[X]
Trend: [up|down|flat] vs [prior]
Cover costs: [one line]
```

**Rules:** No advice on what to cut (human decision). Cite data source. If data missing, say so and give a template.

### Optional tools

- Read `docs/TREASURY.md`, `docs/standup/` for cost summaries.
- If Usage tab or billing export exists: path or script to pull numbers.

---

## 3. Signal vs Noise Skill

**name:** signal-vs-noise  
**description:**  
ALWAYS activate when user wants to **distill recent push** into what mattered vs what to ignore. Takes ALOHA, standup, paper bot, or pasted content and outputs Top 3 signals + Top 3 to ignore. Fits north star: stay in the game without 12+ hours on screens.  
Triggers: "signal vs noise", "what mattered", "what to ignore", "distill this", "top signals", "ALOHA summary", "standup highlights", "what was noise".  
NOT for: generating new content (that's standup/ALOHA), or trading decisions (Belief Router / Strike Ritual).

### Purpose

One output per run: **Top 3 signals** (worth your attention) and **Top 3 to ignore** (noise), each with one line. Input = recent ALOHA, day report, standup deliverables, or pasted text.

### Input validation

1. **Input type:** User pastes content, or points to paths (e.g. `docs/standup/day-reports/`, last ALOHA output). If paths, skill reads those files; if paste, use it.
2. **Recency:** Default "last 24–48h" or "this week". User can say "last 7 days" or "this paste".
3. **Scope:** Optional filter: "only trading", "only lifestyle", "only ops" — apply if stated.

### Process

1. **Ingest:** Load pasted content or read specified standup/day-report files. Extract discrete items (bullet points, sections, alerts).
2. **Classify:** For each item: signal (actionable, decision-relevant, or high information) vs noise (repeated, low impact, or already acted on).
3. **Rank:** Top 3 signals by impact/clarity; top 3 noise by "safest to ignore" or "would have wasted attention."
4. **One line each:** No paragraphs — one sentence per item.

### Output

**Part 1: The Take (streamed)**  
2–3 sentences: "From [source/period], these three deserved attention; these three you could skip."

**Part 2: The Card (fixed format)**

```
SIGNALS (worth it)
1. [one line]
2. [one line]
3. [one line]

NOISE (ignore)
1. [one line]
2. [one line]
3. [one line]
```

**Rules:** No new recommendations. No trading call. Only distillation of what was already pushed. Cite source (date range, files).

### Optional tools

- Read `docs/standup/day-reports/*.md`, `docs/standup/daily-insights/*.md`, or ALOHA output path if standardized.

---

## 4. Thesis-to-Essay Skill

**name:** thesis-to-essay  
**description:**  
ALWAYS activate when user has a **belief or thesis** and wants to **turn it into an essay** (Substack, long-form): title, one-line thesis, which knowledge or Naval essays support it, and debt score (how much is already in the corpus). Complements Belief Router (same input type; different output). Fits "thesis first, underwrite then execute" and Eliza/IKIGAI STUDIO content.  
Triggers: "essay for this", "turn this into an essay", "thesis to essay", "what should I write", "Substack idea", "belief router for writing", "which naval essay", "essay debt", "what do I already have on this".  
NOT for: drafting the essay (human or Eliza), or routing into a trade (Belief Router).

### Purpose

One output per run: **essay shape** — working title, one-line thesis, supporting material (knowledge/ files, Naval essays, or "no corpus yet"), and debt score 0–3. User gets "what to write" and "what you already have" without generating the full piece.

### Input validation

1. **Thesis present:** Must contain a directional or explanatory claim (same as Belief Router). If vague ("write about crypto"), ask: "Which angle? [2–3 options]."
2. **Venue:** Default Substack / long-form. User can say "Twitter thread" or "LinkedIn" — adapt length hint.
3. **Corpus:** Skill assumes `knowledge/` and optionally Naval essay map exist. If not, output "no corpus path" and still give title + thesis.

### Process

1. **Extract thesis:** Reframe user input as one clear claim (same discipline as Belief Router input validation).
2. **Deeper claim:** Optional: one sentence — what's the non-obvious layer? (Feeds title or subhead.)
3. **Corpus scan:** Search or list knowledge/ files, drafts/, and Naval essay-themes (from knowledge/naval or plugin-naval) that align. No embedding required for v1 — keyword or path scan is enough.
4. **Debt score:** 0 = no existing corpus; 1 = some overlap; 2 = strong overlap; 3 = most of the essay already in knowledge, just needs assembly. One line rationale.
5. **Title + one-liner:** Proposed title and one-line thesis for the essay.

### Output

**Part 1: The Take (streamed)**  
3–4 short paragraphs: (1) Your thesis reframed. (2) Proposed title and one-line. (3) What you already have (files, essays). (4) Debt score and what's left to write.

**Part 2: The Card (fixed format)**

```
ESSAY · [working title]
Thesis: [one line]
Debt: [0|1|2|3] — [one line why]
Corpus: [list paths or "none"]
Naval: [essay titles or "none"]
Next: [one line — "draft from X" or "need to add Y"]
```

**Rules:** No full draft. No posting. Expressions, not advice. End with: "Eliza or you own the draft. This is the shape."

### Optional tools

- List `knowledge/**/*.md`, `docs/standup/essays/`, drafts.
- Naval essay-themes map (knowledge/naval or plugin-naval) for "which essays support this."

---

## Summary

| Skill               | Trigger (vibe)       | Input → Output                    | Fits                             |
| ------------------- | -------------------- | --------------------------------- | -------------------------------- |
| **Strike Ritual**   | Weekly options call  | View/stack → one structure + card | Solus, Hypersurface, $100K stack |
| **Cost Burn**       | What's our burn      | Period → burn + trend + card      | Sentinel, TREASURY               |
| **Signal vs Noise** | Distill push         | ALOHA/standup/paste → top 3 + 3   | North star, stay in game         |
| **Thesis-to-Essay** | Belief → essay shape | Thesis → title, debt, corpus      | Thesis first, Eliza, Substack    |

All four: **one job, input validation, structured process, fixed card, rules.** No execution, no keys, no hype. Evidence and clarity over volume.

---

## Implementation order

1. **Strike Ritual** — Highest leverage for weekly ritual; depends on spot/IV source (Solus or external).
2. **Signal vs Noise** — Easiest to ship (read standup paths, distill); no new APIs.
3. **Cost Burn** — Depends on cost data (TREASURY.md, Sentinel output, or Usage); template first if no data.
4. **Thesis-to-Essay** — Depends on knowledge/ and Naval map; keyword scan is enough for v1.

_Last updated: 2026-02-17. Belief Router reference: [rohunvora/belief-skill](https://github.com/rohunvora/belief-skill)._

---

## One skill per agent

One Cursor/Claude skill per VINCE agent. Each is scoped to that agent’s lane and constraints; triggers and output are designed so a human (or another agent) can run the skill and get a result that _feels like_ that agent. No execution in skills—Otaku is the only executor, and that stays in-app.

| Agent    | Skill name              | One-line job                                                                          |
| -------- | ----------------------- | ------------------------------------------------------------------------------------- |
| VINCE    | **aloha-in-a-page**     | One scannable ALOHA-style brief (vibe, majors, options, perps, trade today?).         |
| Kelly    | **allowlist-pick**      | One recommendation from lifestyle/knowledge (place, wine, workout) with one-line why. |
| Solus    | **strike-one-pager**    | Weekly options call: CC vs CSP, asset, size/skip/watch, invalidation (Solus lane).    |
| Sentinel | **prd-from-brief**      | Pasteable PRD or task brief from a short problem/scope description.                   |
| Otaku    | **execution-checklist** | Safe steps for a stated intent (swap, bridge, DCA); “Otaku executes, no keys here.”   |
| Oracle   | **polymarket-scan**     | Top markets + odds for a topic; read-only, no order placement.                        |
| Eliza    | **knowledge-router**    | Which knowledge file/dir answers this; debt score; what to add if gap.                |
| ECHO     | **x-pulse-one-pager**   | One-pager of CT sentiment on a topic; “for prices ask VINCE.”                         |

---

### VINCE — **aloha-in-a-page**

**name:** aloha-in-a-page  
**description:**  
ALWAYS activate when user wants a **single-page ALOHA-style brief**: vibe word, majors snapshot, options stance, perps stance, “trade today?” one-liner. Fits VINCE as CDO: unified data intel, paper bot, push not pull.  
Triggers: "aloha summary", "vince brief", "daily vibe", "trade today", "aloha in a page", "one page brief", "gm summary".  
NOT for: live execution (Otaku), strike ritual (Solus), or full ALOHA run (use the agent for that).

**Process:** (1) If user has standup/day-report or pasted VINCE output, distill it. (2) If not, list what’s needed (options view, perps, vibe) and produce a template or “paste ALOHA output and I’ll distill.” (3) Output one page: vibe · majors · options · perps · trade today?

**Output card:**

```
ALOHA · [date]
Vibe: [one word]
Majors: [1 line]
Options: [1 line]
Perps:  [1 line]
Trade today? [yes/no + one line]
```

**Rules:** No execution. No prices invented—cite source or “paste required.” VINCE pushes; this skill is pull-side distill.

---

### Kelly — **allowlist-pick**

**name:** allowlist-pick  
**description:**  
ALWAYS activate when user wants **one lifestyle recommendation** from the allowlist / the-good-life: hotel, restaurant, wine, workout, experience. Kelly lane only; no trading or market data.  
Triggers: "kelly pick", "recommend place", "where to eat", "wine for dinner", "touch grass", "allowlist pick", "good life suggestion", "hotel recommendation", "workout idea".  
NOT for: trading, execution, or recommendations outside lifestyle (defer to other agents).

**Process:** (1) Category + optional constraints (city, vibe, occasion). (2) Search or list `knowledge/the-good-life/`, `allowlist-places.txt`, or project equivalent. (3) Pick one; if none match, say “no match in allowlist—add one or ask Kelly in chat.” (4) One-line why + source path.

**Output card:**

```
KELLY PICK · [category]
Pick: [name]
Why: [one line]
Source: [path or "allowlist"]
```

**Rules:** No market/trading content. One pick per run. If no corpus, say so; don’t invent places.

---

### Solus — **strike-one-pager**

**name:** strike-one-pager  
**description:**  
ALWAYS activate when user wants the **weekly options decision** in Solus’s lane: covered call vs secured put, which asset (BTC, ETH, SOL, HYPE), size/skip/watch, invalidation. Hypersurface, $100K stack. No execution; Otaku executes.  
Triggers: "strike ritual", "solus call", "options this week", "covered call or put", "size skip watch", "weekly options", "Hypersurface decision".  
NOT for: belief routing (Belief Router), execution (Otaku), or live IV/options data (paste from VINCE).

**Process:** Same as **Strike Ritual Skill** (§1): asset scan (spot if available), structure choice, size/skip/watch, invalidation, cross-check. Spot from context or CoinGecko; direction/IV from pasted context or user.

**Output card:**

```
SOLUS · [ASSET] · [CC|CSP] · [SIZE|SKIP|WATCH]
Notional: $[X] · Invalidation: [price or condition]
Alt: [other structure] if [condition]
```

**Rules:** No execution. “Solus owns the call; Otaku owns execution.” Expressions, not advice.

---

### Sentinel — **prd-from-brief**

**name:** prd-from-brief  
**description:**  
ALWAYS activate when user wants a **pasteable PRD or task brief** from a short problem/scope description. Sentinel as CTO: world-class PRDs, project-aware, for Claude/Cursor.  
Triggers: "sentinel prd", "write prd", "task brief", "cursor brief", "prd from this", "brief for claude", "project brief".  
NOT for: running code, deploying, or cost/treasury (use cost-burn skill).

**Process:** (1) Ingest brief (problem, scope, constraints). (2) Optional: scan project (plugins, docs) for context. (3) Output PRD format: context, goals, non-goals, scope, success criteria, open questions. (4) Pasteable markdown for `docs/standup/prds/` or Cursor.

**Output card:**

```
PRD · [short title]
Context: [2–3 lines]
Goals: [bullets]
Non-goals: [bullets]
Scope: [bullets]
Success: [how we know]
Open: [questions]
```

**Rules:** No code execution. No deployment. Cite project paths if used.

---

### Otaku — **execution-checklist**

**name:** execution-checklist  
**description:**  
ALWAYS activate when user wants **safe execution steps** for a stated intent (swap, bridge, DCA, stop-loss, mint): what Otaku would do, in what order, with what confirmations. Read-only; no keys, no execution.  
Triggers: "otaku checklist", "how would otaku", "execution steps", "swap checklist", "bridge steps", "DCA setup steps", "before I execute".  
NOT for: actually executing (use Otaku in app), or pricing/TA (VINCE).

**Process:** (1) Parse intent (e.g. “swap 100 USDC for ETH on Base”, “bridge to Base”, “set stop-loss on X”). (2) List steps: chain, wallet, confirmation points, estimated gas/fees if known. (3) One-line risks and “Otaku executes; no keys in this skill.”

**Output card:**

```
OTAKU CHECKLIST · [intent]
1. [step]
2. [step]
…
N. [step]
Confirm: [what to verify]
Risks: [one line]
Otaku executes; no keys here.
```

**Rules:** Never request or store keys. Never execute. Checklist only.

---

### Oracle — **polymarket-scan**

**name:** polymarket-scan  
**description:**  
ALWAYS activate when user wants **Polymarket (or prediction market) scan** for a topic: top markets, odds, one-line relevance. Read-only; no order placement.  
Triggers: "polymarket", "prediction market", "what do markets say", "odds on X", "polymarket scan", "belief market", "probability on X".  
NOT for: placing orders (read-only), or options/IV (VINCE/Solus).

**Process:** (1) Topic or question (e.g. “Fed March”, “BTC 100k”). (2) Search priority markets (`knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md`) or generic search. (3) Top 3–5 markets with condition, yes/no odds, one-line relevance. (4) “For execution, use Polymarket in-app; this is read-only.”

**Output card:**

```
ORACLE · Polymarket scan · [topic]
1. [market] — Yes [X]¢ · [one line]
2. [market] — Yes [X]¢ · [one line]
…
Read-only. No order placement.
```

**Rules:** Read-only. No wallet, no orders. Cite source (e.g. priority list, API).

---

### Eliza — **knowledge-router**

**name:** knowledge-router  
**description:**  
ALWAYS activate when user asks **where something lives in knowledge** or **whether we have content on X**: which file/dir, debt score (0–3), and what to add if gap. Eliza as CEO of knowledge; no ingestion in skill.  
Triggers: "eliza knowledge", "where is this in knowledge", "do we have content on", "knowledge gap", "knowledge router", "what do we know about", "which file has".  
NOT for: UPLOAD or writing (use Eliza in app), or live data (VINCE).

**Process:** (1) Query or thesis. (2) Scan or list `knowledge/` (and known dirs: teammate, the-good-life, sentinel-docs, etc.). (3) Match files/dirs; if none, debt 3 (gap). (4) One-line “what to add” if gap.

**Output card:**

```
ELIZA · Knowledge · [query]
Found: [path(s)] or "No match"
Debt: [0|1|2|3] — [one line]
If gap: [what to add]
```

**Rules:** No ingestion. No writing to knowledge. Route only.

---

### ECHO — **x-pulse-one-pager**

**name:** x-pulse-one-pager  
**description:**  
ALWAYS activate when user wants **Crypto Twitter sentiment** on a topic in one page: 3–5 bullets, key accounts, bull/bear/neutral, and “for prices/TA ask VINCE.” ECHO as CSO; ears on CT.  
Triggers: "echo pulse", "ct sentiment", "what's twitter saying", "x vibe", "crypto twitter", "x pulse", "sentiment on X", "what's CT saying".  
NOT for: prices or TA (handoff VINCE), or posting (read-only).

**Process:** (1) Topic (e.g. BTC, SOL, funding) or “general CT.” (2) If x-research CLI available: run search or pulse equivalent; else describe “run X_PULSE or x-search for [topic]” and template output. (3) Bullets: key takes, accounts, sentiment. (4) “For prices/levels, ask VINCE.”

**Output card:**

```
ECHO · X pulse · [topic]
• [take 1]
• [take 2]
• [take 3]
Accounts: [@a, @b]
Sentiment: [bullish|bearish|neutral|mixed]
For prices/TA → VINCE.
```

**Rules:** No invented prices. Cite sources (e.g. “per @user”). Read-only.

---

### Summary: agent ↔ skill

| Agent    | Skill               | Primary output                                              |
| -------- | ------------------- | ----------------------------------------------------------- |
| VINCE    | aloha-in-a-page     | One-page brief (vibe, majors, options, perps, trade today?) |
| Kelly    | allowlist-pick      | One lifestyle pick + why + source                           |
| Solus    | strike-one-pager    | CC vs CSP, asset, size/skip/watch, invalidation             |
| Sentinel | prd-from-brief      | Pasteable PRD / task brief                                  |
| Otaku    | execution-checklist | Steps + confirmations for intent; “Otaku executes”          |
| Oracle   | polymarket-scan     | Top markets + odds for topic; read-only                     |
| Eliza    | knowledge-router    | Paths + debt score + “what to add” if gap                   |
| ECHO     | x-pulse-one-pager   | CT sentiment bullets + “for prices → VINCE”                 |
