# Eliza: Research & Knowledge Agent (VINCE)

Eliza is the **CEO agent** in the VINCE multi-agent system: 24/7 research, knowledge expansion, and content production. She ingests content (URLs, YouTube, PDFs), manages the knowledge base, and produces long-form and social content with brand voice. No execution; handoffs for live data and trading go to VINCE and others.

**Use this doc** to brief OpenClaw (or any agent) on what Eliza can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why Eliza Matters

- **Single owner of knowledge ingestion:** UPLOAD and ADD_MICHELIN_RESTAURANT live in plugin-eliza; no dependency on plugin-vince for ingestion.
- **15 actions, 7 services:** From UPLOAD and KNOWLEDGE_STATUS to WRITE_ESSAY, DRAFT_TWEETS, RESEARCH_BRIEF, AUTO_RESEARCH, CONTENT_AUDIT, and intelligence (graph, dedupe, quality, style).
- **Handoffs:** Live perps, options, paper bot to VINCE; execution to Otaku; strike/plan to Solus. Eliza uses ASK_AGENT to route and report back.

---

## What Eliza Can Do Today

- **Ingestion:** UPLOAD (text, URLs, YouTube to knowledge/ via summarize CLI); ADD_MICHELIN_RESTAURANT (Michelin Guide to knowledge/the-good-life/michelin-restaurants/).
- **Knowledge ops:** KNOWLEDGE_STATUS (health/coverage); RESEARCH_QUEUE (batch ingestion); KNOWLEDGE_INTEL (monitor, graph, dedupe, quality).
- **Content production:** WRITE_ESSAY (Substack, voice-aware); DRAFT_TWEETS (@ikigaistudioxyz, voice-aware); REPURPOSE (essay/thread/LinkedIn); STYLE_CHECK, POLISH (brand elevation).
- **Research:** RESEARCH_BRIEF, SUGGEST_TOPICS (gaps and trends), TREND_CONNECTION (VINCE trends), AUTO_RESEARCH (autonomous expansion with gap analysis).
- **X/Twitter:** CONTENT_AUDIT (top posts by engagement to content playbook) when plugin-x-research and ELIZA_X_BEARER_TOKEN (or X_BEARER_TOKEN) are set.
- **Services:** voice, autoMonitor, knowledgeGraph, deduplication, sourceQuality, styleGuide, researchAgenda.
- **Multi-agent:** ASK_AGENT to VINCE, Kelly, Solus, Otaku, Sentinel, Oracle, ECHO.

---

## What Eliza Cannot Do Yet / Gaps

- **No live market data:** Eliza does not fetch perps, options, or paper bot status; she defers to VINCE via ASK_AGENT. PRD angle: optional combined "research + VINCE snapshot" brief.
- **CONTENT_AUDIT depends on X token:** Without ELIZA_X_BEARER_TOKEN (or X_BEARER_TOKEN), CONTENT_AUDIT returns "X API not configured". No fallback to cached or synthetic playbook.
- **TREND_CONNECTION:** Uses static data; ELIZA_TREND_SOURCE (e.g. openclaw) is optional/future. PRD: wire live trend source for trend-knowledge connection.
- **Publishing automation:** WRITE_ESSAY and DRAFT_TWEETS produce content but do not auto-publish to Substack or X. PRD: optional publish hooks or approval workflow.
- **Knowledge paths:** All paths via getKnowledgeRoot() (paths.ts). No UI for browsing/editing knowledge; CLI and actions only.
- **RAG vs classic:** Eliza can use ragKnowledge; cross-agent shared vs private is by directory/shared flag, not a single "knowledge admin" surface.

---

## Key Files for Code Review

| Area             | Path                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Agent definition | [src/agents/eliza.ts](src/agents/eliza.ts)                                                               |
| Plugin entry     | [src/plugins/plugin-eliza/src/index.ts](src/plugins/plugin-eliza/src/index.ts)                           |
| Actions          | [src/plugins/plugin-eliza/src/actions/](src/plugins/plugin-eliza/src/actions/)                           |
| Services         | [src/plugins/plugin-eliza/src/services/](src/plugins/plugin-eliza/src/services/)                         |
| Paths config     | [src/plugins/plugin-eliza/src/config/paths.ts](src/plugins/plugin-eliza/src/config/paths.ts)             |
| Upload route     | [src/plugins/plugin-eliza/src/routes/uploadRoute.ts](src/plugins/plugin-eliza/src/routes/uploadRoute.ts) |

---

## For OpenClaw / PRD

Use this doc to draft a **next-iteration PRD** for Eliza: e.g. live trend source for TREND_CONNECTION, CONTENT_AUDIT fallback or rate-limit handling, optional publish workflow for essays/tweets, or a small "knowledge admin" surface.

---

## References

- [CLAUDE.md](CLAUDE.md) — VINCE project layout; Eliza as CEO.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT and handoffs.
- [src/plugins/plugin-eliza/README.md](src/plugins/plugin-eliza/README.md) — Plugin config and env.
