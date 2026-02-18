# Plugin Eliza

Eliza's knowledge and content plugin: **15 actions**, 7 services for corpus management, research, and content production.

## Content ingestion and production (Eliza-owned)

Eliza is fully focused on **content ingestion** (UPLOAD) and **content production**. This plugin implements:

- **UPLOAD**: Ingest text, URLs, and YouTube into `knowledge/` (via summarize CLI when available). Files are written with prefix `eliza-upload-` and use `getKnowledgeRoot()` from [src/config/paths.ts](src/config/paths.ts).
- **ADD_MICHELIN_RESTAURANT**: Add Michelin Guide restaurants to `knowledge/the-good-life/michelin-restaurants/` (paths via `getKnowledgeRoot()`).

There is **no dependency on plugin-vince** for these actions. The same env vars (e.g. `VINCE_UPLOAD_*`) and summarize CLI can be used so both agents share the same pipeline if desired.

## CONTENT_AUDIT (plugin-x-research)

**CONTENT_AUDIT** fetches top posts by engagement and produces a content playbook. It requires **plugin-x-research** at `src/plugins/plugin-x-research` and the X API:

- Set **`ELIZA_X_BEARER_TOKEN`** (or `X_BEARER_TOKEN`) so Eliza can call the X API. Without it, the action returns a clear "X API not configured" message.

## Substack (SUBSTACK_CONTEXT provider)

The **SUBSTACK_CONTEXT** provider injects recent Ikigai Studio Substack posts (from RSS) and optional profile stats into Eliza’s state. See [docs/SUBSTACK.md](../../../docs/SUBSTACK.md) for details.

| Env | Purpose |
|-----|--------|
| **SUBSTACK_FEED_URL** | Optional. RSS feed URL (default: https://ikigaistudio.substack.com/feed). Set empty to disable. |
| **ELIZA_SUBSTACK_LINKEDIN_HANDLE** | Optional. LinkedIn handle linked to Substack for profile stats (Substack Developer API; requires ToS). |

Publishing is not automated: WRITE_ESSAY saves drafts to `knowledge/drafts/`; you publish manually.

## Knowledge and cache paths

All knowledge paths are centralized in [src/config/paths.ts](src/config/paths.ts).

| Env | Purpose |
|-----|--------|
| **KNOWLEDGE_ROOT** | Knowledge base root (relative to cwd or absolute). Read at call time. Default: `knowledge`. |
| **ELIZA_CACHE_DIR** | Cache root for plugin state (monitor, agenda, graph, trend connections). Default: `.openclaw-cache` under cwd. |
| **ELIZA_X_BEARER_TOKEN** | X API Bearer token for CONTENT_AUDIT (when plugin-x-research is used). |
| **ELIZA_KNOWLEDGE_CHANNEL_IDS** | Optional comma-separated channel IDs treated as "knowledge" for ADD_MICHELIN_RESTAURANT. |
| **ELIZA_TREND_SOURCE** | Optional. Future gate for live trend data (e.g. `openclaw`). TREND_CONNECTION currently uses static data. |
