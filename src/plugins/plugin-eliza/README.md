# Plugin Eliza

Eliza's knowledge and content plugin: 14 actions, 7 services for corpus management, research, and content production.

## Content ingestion and production (Eliza-owned)

Eliza is fully focused on **content ingestion** (UPLOAD) and **content production**. This plugin implements:

- **UPLOAD**: Ingest text, URLs, and YouTube into `knowledge/` (via summarize CLI when available). Files are written with prefix `eliza-upload-` and use `getKnowledgeRoot()` from [src/config/paths.ts](src/config/paths.ts).
- **ADD_MICHELIN_RESTAURANT**: Add Michelin Guide restaurants to `knowledge/the-good-life/michelin-restaurants/` (paths via `getKnowledgeRoot()`).

There is **no dependency on plugin-vince** for these actions. The same env vars (e.g. `VINCE_UPLOAD_*`) and summarize CLI can be used so both agents share the same pipeline if desired.

## Knowledge root

All knowledge paths are centralized in [src/config/paths.ts](src/config/paths.ts). Override with env `KNOWLEDGE_ROOT` (relative to cwd or absolute) if needed.
