# Research queue & RSS feeds (automated knowledge expansion)

Used by the research-queue processor and RSS-to-queue script (see **PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md**).

## research-queue.txt

**Path:** `knowledge/internal-docs/research-queue.txt`

- **Format:** One URL per line. Optional second token = category override (e.g. `https://example.com/article macro-economy`).
- **Comments:** Lines starting with `#` or empty lines are ignored.
- **Processing:** When a URL is ingested, mark it done (e.g. move to `research-queue.done.txt` or prefix with `# DONE `) so it isn’t re-ingested.
- **Creation:** Create the file if it doesn’t exist; add URLs manually or via `scripts/rss-to-queue.ts`.

## rss-feeds.txt

**Path:** `knowledge/internal-docs/rss-feeds.txt`

- **Format:** One RSS or Atom feed URL per line (e.g. `https://substack.com/feed/...`).
- **Usage:** `scripts/rss-to-queue.ts` (when implemented) reads this file, fetches each feed, collects new item URLs since last run, and appends them to `research-queue.txt`.
- **Creation:** Create the file and add feed URLs for Substacks, blogs, or other sources you want to auto-queue for knowledge ingest.

## YouTube (curated, no watching)

- **Channel:** Create `#vince-upload-youtube` (or `#youtube-knowledge`) in Discord/Slack. Paste curated YouTube links; VINCE ingests via UPLOAD (transcript + summary) so we don’t have to watch. See **§5.1.1 Curated YouTube** in PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md.
- **Batch:** For many links, you can also add YouTube URLs to `research-queue.txt` (one per line); the research-queue processor will ingest them like any other URL (when ingest supports YouTube transcript/fetch).

## Flow

1. URLs land in `research-queue.txt` (manual paste or RSS script).
2. A task or cron runs the processor: for each unprocessed URL, run `bun run scripts/ingest-urls.ts --file <temp-file-with-urls>` (or spawn summarize), write output to `knowledge/<category>/`, then mark URL as processed.
3. Optional: post “Added: category/filename.md from &lt;url&gt;” to `#vince-research`.
