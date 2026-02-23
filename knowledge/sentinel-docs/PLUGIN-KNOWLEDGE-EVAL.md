# Evaluation: @elizaos/plugin-knowledge for URL → Knowledge Pipeline

> **Date:** 2026-02-08  
> **Context:** Michelin knowledge in progress; exploring plugin-based solutions (see [todo-michelin-crawlee.md](todo-michelin-crawlee.md)).

## Summary

**[elizaos-plugins/plugin-knowledge](https://github.com/elizaos-plugins/plugin-knowledge)** provides RAG (retrieval-augmented generation): document ingestion, chunking, embeddings, and semantic search via `KnowledgeService.addKnowledge()` and `getKnowledge()`. It does **not** provide file generation to `knowledge/<category>/*.md`. The VINCE upload action needs to **write markdown files** to the repo (e.g. `knowledge/the-good-life/`, `knowledge/options/`) with categorization and filenames. So we **do not replace** the current upload flow with plugin-knowledge; we **keep** the existing `tryLoadKnowledgeFileService` (plugin-knowledge-ingestion, when available) + `simpleFallbackStorage` for file output.

## Optional alignment

When **@elizaos/plugin-knowledge** is added to the character and the runtime has `KnowledgeService` registered (`runtime.getService('knowledge')`), we could **additionally** call `addKnowledge()` with the same content we write to a file, so that content is also searchable via SEARCH_KNOWLEDGE / the knowledge provider. That would be a dual-write: file to `knowledge/` + RAG store. Not implemented in this repo yet; add the plugin and character registration first, then in the upload handler after `simpleFallbackStorage` (or after any successful file write), if `runtime.getService('knowledge')` exists, call `addKnowledge({ content, contentType: 'text/plain', originalFilename, ... })`.

## References

- [plugin-knowledge README](https://github.com/elizaos-plugins/plugin-knowledge) — Full / Headless / Core modes; `KnowledgeService`; PROCESS_KNOWLEDGE, SEARCH_KNOWLEDGE.
- [docs/todo-michelin-crawlee.md](todo-michelin-crawlee.md) — Status and solution exploration (plugin-knowledge, plugin-browser).
