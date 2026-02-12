# Changelog

All notable changes to the VINCE project will be documented in this file.

## [v2.1.0] - 2026-02-12

### 🚀 Sentinel 10x Upgrade (PR #10)

**Sentinel is now a world-class core dev.** Complete rewrite of plugin-sentinel with 15 actions and 6 services.

#### New Capabilities

- **PRD Generator** — Enterprise-grade Product Requirement Documents for Cursor/Claude Code
  - Project Radar scans plugins, progress, docs, and todos
  - Impact Scorer (RICE + strategic alignment) ranks suggestions
  - Architecture rules baked into every PRD
  - Saved to `standup-deliverables/prds/`

- **Trading Intelligence** — Deep expertise in paper trading and options
  - Signal sources, feature store, ML pipeline, ONNX
  - Hypersurface options strategy, strike ritual, EV framework
  - Can explain any trading decision

- **Multi-Agent Vision** — Understands the dream team architecture
  - ASK_AGENT resolution, Discord Option C, policy rules
  - Standup coordination, deliverables flow, feedback loop
  - "Feels genuinely alive" philosophy

- **OpenClaw Expert** — Deep knowledge of OpenClaw/Milaidy/Clawdbot
  - Gateway setup, skills, sub-agents, 24/7 research
  - Integration patterns with ElizaOS

#### New Actions (15 total)

| Action | Description |
|--------|-------------|
| `SENTINEL_PRD` | Generate world-class PRDs |
| `SENTINEL_SUGGEST` | Impact-scored suggestions |
| `SENTINEL_SHIP` | What to ship for max impact |
| `SENTINEL_MULTI_AGENT` | Multi-agent architecture expert |
| `SENTINEL_TRADING_INTEL` | Paper bot + options expert |
| `SENTINEL_CLAWDBOT_GUIDE` | OpenClaw knowledge research setup |
| `SENTINEL_ONNX_STATUS` | ML/ONNX health check |
| `SENTINEL_DOC_IMPROVE` | Documentation improvements |
| `SENTINEL_COST_STATUS` | Cost and treasury status |
| `SENTINEL_SETTINGS_SUGGEST` | Settings recommendations |
| `SENTINEL_ART_GEMS` | ElizaOS examples/art gems |
| `SENTINEL_ART_PITCH` | Gen art pitch |
| `SENTINEL_INVESTOR_REPORT` | VC/investor pitch |
| `SENTINEL_HOW_DID_WE_DO` | Outcome review |
| `SENTINEL_SECURITY_CHECKLIST` | Security hygiene |

#### New Services (6 total)

- `projectRadar.service` — Deep project state scanning
- `impactScorer.service` — RICE + strategic scoring
- `prdGenerator.service` — PRD templates with architecture rules
- `openclawKnowledge.service` — OpenClaw expertise
- `multiAgentVision.service` — Dream team understanding
- `tradingIntelligence.service` — Signal sources, ML, options

---

### 📚 Eliza V2: Autonomous Research (PR #11)

**Eliza is now the knowledge powerhouse.** Complete plugin-eliza with 14 actions and 7 services.

#### New Capabilities

- **Autonomous Research** — Gap analysis + auto-expansion
  - Identifies knowledge gaps and suggests topics
  - Research queue for batch ingestion
  - Session tracking and research agenda

- **Content Production** — Voice-aware writing
  - Essay generation for Substack
  - Tweet drafting for X/Twitter
  - Content repurposing (essay ↔ thread ↔ LinkedIn)

- **Knowledge Intelligence** — Graph, quality, deduplication
  - Relationship tracking between content
  - Source trust and provenance
  - Smart duplicate detection

- **Brand Consistency** — Style guide enforcement
  - Voice profile analysis
  - Style checking and auto-fix
  - Premium content polish

#### New Actions (14 total)

| Action | Description |
|--------|-------------|
| `UPLOAD` | Ingest text, URLs, YouTube |
| `ADD_MICHELIN_RESTAURANT` | Michelin Guide to knowledge |
| `KNOWLEDGE_STATUS` | Knowledge base health check |
| `WRITE_ESSAY` | Substack essay generation |
| `DRAFT_TWEETS` | X/Twitter suggestions |
| `REPURPOSE` | Transform between formats |
| `RESEARCH_QUEUE` | Batch ingestion queue |
| `SUGGEST_TOPICS` | AI-powered topic suggestions |
| `RESEARCH_BRIEF` | Concise research briefs |
| `TREND_CONNECTION` | Connect to VINCE's market trends |
| `KNOWLEDGE_INTEL` | Unified intelligence dashboard |
| `STYLE_CHECK` | Brand style enforcement |
| `POLISH` | Transform to premium content |
| `AUTO_RESEARCH` | Autonomous knowledge expansion |

#### New Services (7 total)

- `voice.service` — Voice profile and brand consistency
- `autoMonitor.service` — Knowledge health monitoring
- `knowledgeGraph.service` — Content relationship tracking
- `deduplication.service` — Smart duplicate detection
- `sourceQuality.service` — Source trust and provenance
- `styleGuide.service` — Brand style rules and fixes
- `researchAgenda.service` — Research priorities and gaps

---

### 📊 Summary

| Metric | Before | After |
|--------|--------|-------|
| **Plugins** | 18 | 20 |
| **Actions** | ~130 | 162 |
| **Services** | ~40 | ~53 |
| **Lines added** | — | +15,900 |

**North star:** Push, not pull. 24/7 market research. Self-improving paper trading bot. One team, one dream.

---

## [v2.0.0] - 2026-02-09

- X research ALOHA-style conclusion
- X All-In: Alpha, Insights, and Sentiment
- Kelly agent + plugin-kelly
- Discord + push unlock
- Fee-aware PnL (net of costs)
- Avoided decisions in feature store

See `src/plugins/plugin-vince/progress.txt` for full history.
