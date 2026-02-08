# Todo: Michelin scraping with Crawlee (fallback)

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
