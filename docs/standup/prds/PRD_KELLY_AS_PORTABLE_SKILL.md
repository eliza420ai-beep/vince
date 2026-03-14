# PRD: Kelly → Portable Skill

**Status:** Draft  
**Owner:** Sentinel  
**Target:** Kelly decommissioned from VINCE by end of sprint; skill running on Mac Mini  
**Context:** [VINCE v2 refactor](../../VINCE.md) — 4-agent core, v1 agents migrate to their own machines

---

## 1. Problem

Kelly is a 1,000-line ElizaOS character definition plus 69 plugin files running inside VINCE. That is the wrong container for what Kelly actually is.

Kelly's value has nothing to do with ElizaOS. It is:

1. The judgment encoded in her system prompt — the-good-life allowlist, five hats, geographic defaults, sommelier voice, no-filler rules.
2. The `knowledge/the-good-life/` directory — the curated knowledge base for hotels, restaurants, wine, wellness, surf, and creative practice.
3. The research loop — the intent (never fulfilled in VINCE) to improve Kelly's picks continuously from feedback and new data.

The ElizaOS runtime is overhead. The `plugin-kelly/` directory (69 files) is boilerplate. The standup facilitator role she holds in VINCE dies with v2. Moving her out removes dead weight from the VINCE codebase and lets her actually improve, running on hardware that stays on 24/7 with a research machine (Perplexity) feeding her knowledge continuously.

**The fix:** Extract Kelly's intelligence into a portable `SKILL.md`. Move `knowledge/the-good-life/` onto a Mac Mini. Let Perplexity Computer research 24/7 to keep the knowledge alive. Run Kelly as an OpenClaw or Nemoclaw daemon that improves itself while the VINCE machine sleeps.

---

## 2. Goals

| Goal | Done when |
|------|-----------|
| Kelly's full judgment is in a single portable file | `skills/kelly/SKILL.md` is self-contained — system prompt, five hats, actions, knowledge path map, voice rules |
| Kelly runs without ElizaOS | The skill loads into Claude Code (AGENTS.md), OpenClaw, Nemoclaw, or any Claude-compatible runtime |
| Knowledge lives on the Mac Mini | `~/kelly-knowledge/` contains the full the-good-life corpus; not in any git repo |
| Perplexity researches 24/7 | Nightly protocol updates MICHELIN listings, hotel openings, wine awards, surf resorts, seasonal schedules |
| VINCE is clean | `KELLY_ENABLED=false` is the permanent default; Kelly's plugin and agent files are deprecated with a clear tombstone |
| Kelly improves autonomously | The research loop runs without manual intervention; the allowlist and curated schedules stay current |

---

## 3. Non-Goals

- Rebuilding any of Kelly's existing ElizaOS actions in the new runtime (translate as needed, don't port).
- Maintaining backward compatibility with plugin-kelly (it's staying in the repo as reference; it won't run).
- Running Kelly on VINCE hardware. She gets her own machine.
- Adding new capabilities in this sprint. The PRD is migration + research loop, not feature expansion.

---

## 4. Architecture

```
Mac Mini (always-on)
├── ~/kelly-knowledge/                  ← the-good-life corpus (migrated from VINCE)
│   ├── the-good-life/                  ← hotels, restaurants, wine, wellness, surf
│   ├── kelly-btc/                      ← private BTC color (Satoshi / GROK420)
│   ├── art-collections/
│   ├── naval/
│   ├── substack-essays/
│   └── brand/
│
├── skills/kelly/
│   ├── SKILL.md                        ← the portable instruction file (this PRD's main output)
│   └── RESEARCH_PROTOCOL.md           ← what Perplexity researches and where it writes
│
└── openclaw/ or nemoclaw/              ← runtime that loads the skill
    └── (loads SKILL.md + knowledge/)
```

```
Perplexity Computer (Mac Mini, always-on)
└── Nightly research jobs:
    ├── MICHELIN Guide new stars → knowledge/the-good-life/michelin-restaurants/
    ├── Hotel openings SW France → luxury-hotels/southwest-france-5-star-complete.md
    ├── Wine awards (Platter, Veritas, Parker) → wine-tasting/
    ├── Seasonal schedule updates → curated-open-schedule.md
    ├── Dammann Frères new products → lifestyle/tea-dammann-freres.md
    └── Surf resort openings → surf/surf-resorts-expanded.md
```

---

## 5. SKILL.md Specification

The skill file is Kelly's complete portable intelligence. It follows the same SKILL.md format used in `skills/x-research/` and can be installed into any Claude-compatible runtime by reading the file.

### 5.1 File location

```
skills/kelly/SKILL.md
```

### 5.2 SKILL.md structure

```markdown
# Kelly — Live the Life

## Overview
[One paragraph: who Kelly is, what she does, what container to run her in]

## Knowledge base
[Path mapping: where ~/kelly-knowledge/ lives and how the runtime loads it]

## Five hats
[The five hats verbatim from kelly.ts: travel advisor, sommelier, dining guide, health guru, fitness coach + tea + entertainment + creative]

## Geographic defaults
[SW France defaults, 2h corridor, restaurant = lunch, dinner = at home]

## Allowlist
[Reference to ~/kelly-knowledge/the-good-life/allowlist-life.md; allowlist-first rule]

## Voice
[Benefit-led, craft-focused, no AI-slop. Full banned list reference.]

## Capabilities (natural language)
[The 16 actions translated to natural language instructions the LLM follows without needing ElizaOS actions:]
- Daily briefing: when the user asks what to do today → run the briefing protocol
- Recommend place: when asked where to eat or stay → check allowlist first, then the-good-life
- Recommend wine: one pick + one alternative, sommelier voice, French default
- [... all 16 actions as natural-language rules]

## Research protocol
[Reference to RESEARCH_PROTOCOL.md; the Perplexity loop]

## Rules
[The hard rules: never invent place names, allowlist-first, lunch default, touch grass trigger]
```

### 5.3 What the skill replaces

| Was in ElizaOS | Becomes in SKILL.md |
|----------------|---------------------|
| `character.system` | § Five hats + Voice + Rules |
| `character.knowledge` (dir refs) | § Knowledge base (path map) |
| `KELLY_DAILY_BRIEFING` action | Natural language: "when asked what to do today, run the briefing protocol" |
| `KELLY_RECOMMEND_PLACE` action | Natural language: "check allowlist-life.md first; use the-good-life for picks" |
| `KELLY_RECOMMEND_WINE` action | Natural language: "one pick + one alternative; French default; sommelier voice" |
| `lifestyleFeedback.evaluator` | Natural language: "when user says what didn't work, acknowledge and flip the pick" |
| `weather.provider` | Runtime-level: inject weather context in the prompt (OpenClaw/Nemoclaw handles this) |
| `kellyContext.provider` | Runtime-level: inject curated-open-schedule + day-of-week |
| `interAgentPlugin` (standup) | Removed — standup dies with v2; Kelly is solo |

---

## 6. Knowledge Migration

### 6.1 Current state

`knowledge/` is already gitignored in VINCE (see `.gitignore`: "Knowledge base — personal RAG corpus; not committed to public repo"). The the-good-life corpus lives on the user's local machine, never pushed. This is the right call. The migration just moves it to the Mac Mini and removes the dependency on VINCE's filesystem.

### 6.2 Migration steps

```bash
# On the current machine — export Kelly's knowledge to a standalone folder
rsync -av ~/vince/knowledge/ ~/kelly-knowledge/

# Remove VINCE repo dependency:
# - knowledge/the-good-life/ stays on local machine (already gitignored)
# - Mac Mini gets a copy via rsync or iCloud Drive sync
# - ~/kelly-knowledge/ is the canonical location on the Mac Mini

# On the Mac Mini — verify the knowledge loaded
ls ~/kelly-knowledge/the-good-life/
# → allowlist-life.md, michelin-restaurants/, luxury-hotels/, wine-tasting/, ...
```

### 6.3 Knowledge directory map (post-migration)

```
~/kelly-knowledge/
├── the-good-life/
│   ├── allowlist-life.md               ← THE allowlist; Kelly checks here first
│   ├── michelin-restaurants/           ← Perplexity updates nightly
│   │   ├── paris/
│   │   ├── landes-coast/
│   │   ├── landes-interior/
│   │   ├── biarritz-region/
│   │   └── southwest-france-michelin-stars-complete.md
│   ├── luxury-hotels/                  ← Perplexity updates weekly
│   │   ├── france-palaces.md
│   │   ├── southwest-france-5-star-complete.md
│   │   ├── livethelife-places.md
│   │   ├── ski-mountain-resorts.md
│   │   └── [city files: cape-town, lisbon, miami, nyc, ...]
│   ├── wine-tasting/                   ← Perplexity updates on award cycles
│   │   ├── sommelier-playbook.md
│   │   ├── bordeaux-reds-curated-list.md
│   │   ├── champagne-curated-list.md
│   │   ├── south-african-wines.md
│   │   └── [all region curated lists]
│   ├── lifestyle/
│   │   ├── curated-open-schedule.md    ← CRITICAL: Perplexity updates seasonally
│   │   ├── tea-dammann-freres.md
│   │   ├── home-cooking.md
│   │   ├── entertainment-tastes.md
│   │   └── [wellness, yoga, swimming, creative files]
│   └── surf/
│       ├── surf-spots-by-country.md
│       ├── surf-resorts-expanded.md    ← Perplexity updates quarterly
│       └── [iconic waves, people files]
├── kelly-btc/                          ← private; Satoshi / GROK420 color
├── art-collections/
├── naval/
└── brand/
```

---

## 7. Perplexity Research Protocol

This is the upgrade VINCE never shipped. Kelly's knowledge was always static; Perplexity makes it live.

### 7.1 Research cadence

| Research job | Frequency | Output file |
|---|---|---|
| MICHELIN Guide new stars / removals | Nightly | `michelin-restaurants/[region].md` |
| Hotel openings + closures SW France | Weekly | `luxury-hotels/southwest-france-5-star-complete.md` |
| Wine awards (Platter's, Veritas, Parker Top 100) | At award release (~annual) | `wine-tasting/south-african-wines.md`, `wine-tasting/award-winning-whiskies.md` |
| Seasonal schedule (palace pools, Caudalie, Palais) | Seasonal (Nov, Feb, May) | `lifestyle/curated-open-schedule.md` |
| Dammann Frères new products | Monthly | `lifestyle/tea-dammann-freres.md` |
| Surf resort openings | Quarterly | `surf/surf-resorts-expanded.md` |
| Restaurant open/close (Landes locals) | Weekly | `lifestyle/curated-open-schedule.md` (Restaurants by Day section) |

### 7.2 Research protocol file

`skills/kelly/RESEARCH_PROTOCOL.md` contains:

```markdown
# Kelly Research Protocol — Perplexity Computer

## Daily (run at 03:00 local)
1. Query Perplexity: "New MICHELIN star awards or removals France [current month year]"
2. If results → diff against michelin-restaurants/ → append confirmed changes
3. Query: "New hotel openings or closures Landes Biarritz Bordeaux [current month year]"
4. If results → update southwest-france-5-star-complete.md
5. Query: "Le Relais de la Poste Magescq open schedule [current year]"
   → update curated-open-schedule.md restaurant days if changed

## Weekly (run Monday 04:00)
1. Query: "New surf resort openings or closures [list of key regions]"
2. Query: "Dammann Frères new tea products [current year]"
3. Query: "New 5-star hotel openings Southwest France [current year]"

## Seasonal (Nov 1, Feb 1, May 1, Jul 1)
1. Query: "Hôtel du Palais Biarritz pool reopen date [year]"
2. Query: "Les Sources de Caudalie pool reopen date [year]"
3. Query: "Les Prés d'Eugénie open schedule [year]"
4. Update curated-open-schedule.md with confirmed dates

## Annual (January — wine award season)
1. Query: "Platter's Wine Guide 5-star wines [year]"
2. Query: "Veritas Double Gold winners [year]"
3. Query: "Tim Atkin South Africa Top 100 [year]"
4. Query: "World Whiskies Awards winners [year]"
5. Update south-african-wines.md and award-winning-whiskies.md

## Write protocol
- Append → don't overwrite. New entries go at top of section with date.
- Mark unconfirmed info with [UNCONFIRMED — verify before recommending].
- Confirmed picks from official sources (MICHELIN, Platter's, hotel websites) → no flag.
- Never invent an entry. If Perplexity is uncertain, skip.
```

---

## 8. VINCE Repo Changes

### 8.1 `src/agents/kelly.ts`

Add a deprecation header and leave the file as tombstone reference:

```typescript
/**
 * @deprecated Kelly has been migrated to a portable skill.
 * See: skills/kelly/SKILL.md and RESEARCH_PROTOCOL.md
 * The skill runs on the Mac Mini via OpenClaw/Nemoclaw.
 * KELLY_ENABLED=false is the permanent default in .env.example
 *
 * This file is kept as reference for the system prompt and action patterns.
 * Do not re-enable this agent in the VINCE runtime.
 */
```

### 8.2 `.env.example`

`KELLY_ENABLED` default changes from commented-out to explicit false:

```bash
# Kelly has moved to a portable skill on the Mac Mini.
# See docs/standup/prds/PRD_KELLY_AS_PORTABLE_SKILL.md
KELLY_ENABLED=false
```

### 8.3 `src/index.ts`

Already gated from previous sprint (`KELLY_ENABLED` check). No change needed. When `KELLY_ENABLED=false`, she doesn't load.

### 8.4 `src/plugins/plugin-kelly/`

Keep all files. Add a `DEPRECATED.md` at the root of the plugin:

```markdown
# plugin-kelly — DEPRECATED

Kelly has moved to skills/kelly/SKILL.md. This plugin no longer runs in production.
Retained as reference for action patterns and provider implementations.
```

### 8.5 `CLAUDE.md` / `README.md`

Update agent roster sections to reflect Kelly's departure and her new home.

---

## 9. Deployment (Mac Mini)

### 9.1 Minimal viable setup

```bash
# On the Mac Mini — one-time setup

# 1. Create knowledge directory
mkdir -p ~/kelly-knowledge

# 2. Sync from current machine (or iCloud)
rsync -av ~/vince/knowledge/ ~/kelly-knowledge/

# 3. Install the skill into OpenClaw
# (copy SKILL.md into the OpenClaw agents directory or Nemoclaw config)
cp ~/vince/skills/kelly/SKILL.md ~/openclaw/agents/kelly/SKILL.md

# 4. Set knowledge path in OpenClaw config
# KELLY_KNOWLEDGE_PATH=~/kelly-knowledge

# 5. Set up Perplexity research cron
crontab -e
# 0 3 * * * ~/scripts/kelly-research.sh   (daily at 3am)
# 0 4 * * 1 ~/scripts/kelly-research-weekly.sh
```

### 9.2 Runtime options (pick one)

| Runtime | How to load Kelly |
|---------|------------------|
| **OpenClaw** | Copy `SKILL.md` into `openclaw-agents/kelly/`; set `KNOWLEDGE_PATH=~/kelly-knowledge` |
| **Nemoclaw** | Load `SKILL.md` as the system prompt; mount `~/kelly-knowledge` as RAG corpus |
| **Claude Code** | Add `SKILL.md` contents to `AGENTS.md` in the Kelly project root |
| **Claude Desktop App** | Load `SKILL.md` as a custom instruction set; reference knowledge files via MCP filesystem tool |

### 9.3 Weather and surf context

Kelly's `weather.provider` and `KELLY_SURF_FORECAST` action pulled live data. In the skill runtime:

- **Weather:** Inject current weather in the prompt preamble (the runtime or a wrapper script fetches it). One line: `Local: clear, 14°C`.
- **Surf (Biarritz):** Same pattern — inject surf conditions in the prompt preamble from a weather API or Surfline.
- **Day-of-week + curated schedule:** Inject today's date and open restaurants from `curated-open-schedule.md` as a prompt prefix.

A simple shell wrapper can do this before invoking OpenClaw:

```bash
#!/bin/bash
# kelly-context.sh — prepend context before each Kelly session

DATE=$(date "+%A, %B %d, %Y")
WEATHER=$(curl -s "wttr.in/Hossegor?format=%C,+%t")  # or similar
OPEN_TODAY=$(grep "$(date +%A)" ~/kelly-knowledge/the-good-life/lifestyle/curated-open-schedule.md | head -20)

cat <<EOF
Today: $DATE
Local: $WEATHER
Restaurants open today:
$OPEN_TODAY
---
EOF
```

---

## 10. What Kelly Becomes

Without the ElizaOS runtime overhead, Kelly is faster and more focused. The skill runs on hardware that's always on, backed by a knowledge base that updates itself. No standup facilitator role, no ASK_AGENT routing to VINCE's inter-agent plugin — she's a standalone concierge.

**Kelly's new role:** Ambient lifestyle advisor on the Mac Mini. You open a Claude tab or OpenClaw session, she has context (weather, day, open restaurants), she knows the allowlist, and her knowledge was updated by Perplexity last night.

The research loop is the unlock. VINCE never shipped a working Kelly research queue. Moving to Perplexity Computer, which is already doing 24/7 research on other topics, means Kelly's knowledge compounds over time instead of going stale.

---

## 11. Success Criteria

| Criterion | Test |
|-----------|------|
| Skill loads without ElizaOS | `SKILL.md` read by Claude Code → Kelly answers in character |
| Knowledge on Mac Mini | `ls ~/kelly-knowledge/the-good-life/` returns expected dirs |
| Allowlist check works | Ask "where to eat?" → Kelly references allowlist-life.md, not invented names |
| Geographic defaults correct | Ask "where to stay?" → gets SW France picks, not Paris |
| Voice correct | No "Great question", no "Certainly", no AI slop |
| Perplexity research runs | Nightly cron executes; `michelin-restaurants/` has entries from last 7 days |
| VINCE is clean | `KELLY_ENABLED=false` in .env.example; no Kelly actions in the active runtime |
| Knowledge stays current | Curated-open-schedule has current-year dates; wine awards current year |

---

## 12. Open Questions

1. **Which runtime first?** OpenClaw or Claude Desktop App with MCP filesystem? Claude Desktop + MCP filesystem is faster to set up; OpenClaw is more automated. Recommend starting with Claude Desktop, then automating with OpenClaw.

2. **Perplexity API vs Perplexity Computer?** The research protocol assumes Perplexity Computer (browser-based, always-on). If using the Perplexity API directly, the research scripts need to call `api.perplexity.ai` with `sonar-pro` and write results to files.

3. **iCloud sync?** If the Mac Mini and the user's laptop both need the knowledge folder, iCloud Drive is the easiest sync. Set `~/kelly-knowledge/` as an iCloud Drive folder; both machines see updates.

4. **Allowlist maintenance?** The allowlist (`allowlist-life.md`) is hand-curated — places you say yes to. Perplexity can suggest candidates; you approve. The research protocol should include a `CANDIDATES.md` file where Perplexity proposes new places for allowlist review.

5. **Kelly's BTC knowledge (`kelly-btc/`):** This is private character color (Satoshi / GROK420 / LiveTheLifeTV). Keep it private on Mac Mini; do not sync to any shared location.

---

## 13. Files to Create

| File | Content |
|------|---------|
| `skills/kelly/SKILL.md` | The portable skill — Kelly's complete system prompt, five hats, voice, capabilities, knowledge path map |
| `skills/kelly/RESEARCH_PROTOCOL.md` | Perplexity research cadence, query templates, write protocol |
| `skills/kelly/KELLY_CONTEXT_WRAPPER.sh` | Shell script to prepend weather + day + open restaurants before each session |
| `docs/standup/prds/PRD_KELLY_AS_PORTABLE_SKILL.md` | This document |

**Changes to existing files:**

| File | Change |
|------|--------|
| `src/agents/kelly.ts` | Add `@deprecated` header and tombstone comment |
| `src/plugins/plugin-kelly/DEPRECATED.md` | New file explaining the plugin is no longer active |
| `.env.example` | `KELLY_ENABLED=false` as explicit default with migration note |
| `README.md` | Update agent roster — Kelly listed under "Moved to Mac Mini" |
| `CLAUDE.md` | Update agent map — Kelly removed from the roster table |

---

## 14. Timeline

| Sprint | Deliverable |
|--------|------------|
| Sprint 1 (this week) | Write `SKILL.md` — port system prompt, five hats, voice, capabilities. Get Kelly answering in Claude Desktop App via AGENTS.md or custom instructions. |
| Sprint 1 | Rsync `knowledge/the-good-life/` to Mac Mini. Verify all dirs present. |
| Sprint 2 | Write `RESEARCH_PROTOCOL.md`. Set up first Perplexity research run manually. Verify MICHELIN and hotel queries write to correct files. |
| Sprint 2 | Automate research cron on Mac Mini. |
| Sprint 2 | Write `KELLY_CONTEXT_WRAPPER.sh` with weather + curated-open-schedule injection. |
| Sprint 3 | Add `@deprecated` tombstone to `src/agents/kelly.ts` and `plugin-kelly`. Update `README.md` and `CLAUDE.md`. Confirm `KELLY_ENABLED=false` is permanent in `.env.example`. |
| Sprint 3 | Test allowlist check, geographic defaults, sommelier voice, no-AI-slop in the new runtime. |
| Sprint 4 | Kelly is running as ambient daemon on Mac Mini. Research loop has run for 2 weeks. Verify knowledge freshness. |
