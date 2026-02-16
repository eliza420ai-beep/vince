# Michelin Scraping with Crawlee (Fallback)

## Status

**In progress.** The desired result (reliable, full-detail Michelin entries: address, phone, website, chef, description) is not yet fully achieved. We are exploring **plugin-based solutions**; preference is **not** to set up a separate ClawdBot/Crawlee bot. All improvements should stay inside the agent via plugins.

## Solution exploration (plugins)

We are evaluating these **public** ElizaOS plugins as primary references:

- **[elizaos-plugins/plugin-knowledge](https://github.com/elizaos-plugins/plugin-knowledge)** — Eliza RAG Knowledge Plugin: document ingestion, chunking, embeddings, PROCESS_KNOWLEDGE / SEARCH_KNOWLEDGE. Could improve the URL → knowledge pipeline and reduce duplicate/meta-only content.
- **[elizaos-plugins/plugin-browser](https://github.com/elizaos-plugins/plugin-browser)** — Playwright-based web scraping and content extraction. Full-page load and DOM extraction so ADD_MICHELIN can read phone, “Visit Website,” description from the live page instead of raw fetch. **Implemented**: ADD_MICHELIN tries `runtime.getService('browser')` first when present and uses `getPageContent()` for page text; otherwise it falls back to raw `fetch()`. Add `@elizaos/plugin-browser` to the project and register it on the character to use this path.

See the plan: Michelin in-progress and plugin exploration.

---

## Crawlee fallback (when plugins are not enough)

If **phone**, **website**, or **description** are often missing from ADD_MICHELIN_RESTAURANT (e.g. because the summarize CLI or raw fetch don't include the sidebar or the right DOM parts), you can set up a **Crawlee** (or Firecrawl/Playwright) scraper for `guide.michelin.com` restaurant pages.

## Steps (outline)

1. **Install Crawlee**  
   e.g. `bun add crawlee` or `npm install crawlee`.

2. **Write a small script or route** that, given a restaurant URL:
   - Loads the page (Crawlee/Playwright).
   - Selects the main content and sidebar (e.g. phone, "Visit Website" link, description paragraph).
   - Returns structured JSON: `name`, `address`, `phone`, `website`, `price`, `style`, `description`, `chef`, `notes`.

3. **Optional: integrate with ADD_MICHELIN**  
   From ADD_MICHELIN, when `CRAWLEE_MICHELIN=1` or when summarize/fetch content is too short or lacks phone/website, call this scraper and use its output for the extract (or ingest the JSON into the regional file directly).

4. **Document required env**  
   Crawlee typically needs no API key. If you use Firecrawl instead, set `FIRECRAWL_API_KEY`.

## When to use this

Use this path if the improved prompt and content pipeline (summarize + optional raw fetch augmentation) still don't reliably yield phone and website for Michelin restaurant pages.
