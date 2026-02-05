# Scripts

## Supabase migration (production persistence)

See **[SUPABASE_MIGRATION.md](../SUPABASE_MIGRATION.md)** for the full checklist. In short: run `supabase-migrations-bootstrap.sql` and `supabase-feature-store-bootstrap.sql` in Supabase SQL Editor, set `POSTGRES_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env`, then `bun start` and `bun run deploy:cloud`.

**Backfill local JSONL to Supabase** (one-off):

```bash
bun run scripts/sync-jsonl-to-supabase.ts --dry-run   # preview
bun run scripts/sync-jsonl-to-supabase.ts             # sync
```

## Supabase feature store (paper-bot dual-write)

To persist paper-bot features across redeploys and query them for ML, run **once** in Supabase Dashboard → SQL Editor the script **`scripts/supabase-feature-store-bootstrap.sql`**. Then set `SUPABASE_SERVICE_ROLE_KEY` (and optionally `SUPABASE_URL`) in `.env`. The deploy script (`deploy-cloud.sh`) passes these to Cloud when set. See [FEATURE-STORE.md](../FEATURE-STORE.md) and [DEPLOY.md](../DEPLOY.md).

---

## Knowledge ingestion playbook (summarize + UPLOAD)

We use [Ikigai Labs summarize](https://github.com/IkigaiLabsETH/summarize) to grow the `knowledge/` folder from URLs, YouTube, PDFs, and podcasts.

| Method | When to use |
|--------|-------------|
| **Chat UPLOAD** | One-off: say “upload: &lt;url&gt;” or paste a YouTube link in VINCE chat. Uses summarize under the hood. |
| **Batch script** | Many URLs: `bun run scripts/ingest-urls.ts --file urls.txt` (optionally `--extract`, `--slides` for YouTube, `--length xl`). |
| **Extract-only** | Set `VINCE_UPLOAD_EXTRACT_ONLY=true` so the UPLOAD action only fetches transcript/extract (no summarization; saves cost). Web URLs get Markdown extract. |
| **YouTube slides** | Set `VINCE_UPLOAD_YOUTUBE_SLIDES=true` (optionally `VINCE_UPLOAD_YOUTUBE_SLIDES_OCR=true`) for slide extraction; or use `--slides` / `--slides-ocr` in the batch script. Slides go to `knowledge/.slides/` (gitignored by default). |
| **Longer summaries** | Set `VINCE_UPLOAD_SUMMARY_LENGTH=xl` or `xxl`; or pass `--length xl` to the batch script. |

- **Summarize**: Pinned in devDependencies (`@steipete/summarize`). UPLOAD and ingest use the local binary from `node_modules/.bin/summarize` when present; otherwise they fall back to `bunx @steipete/summarize`.
- **API keys**: For summaries (non-extract), set one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` for summarize.
- **PDFs / podcasts**: Summarize supports PDF URLs and podcast pages (Apple, Spotify, RSS); same upload or batch flow.
- **Local files**: Ingest script accepts local paths (e.g. `./doc.pdf`, `/path/to/audio.mp3`); summarize supports PDF, audio, video, text.
- **Firecrawl**: Set `VINCE_UPLOAD_FIRECRAWL=auto` or `always` (and `FIRECRAWL_API_KEY`) for web fallback; or use `--firecrawl` in the batch script.
- **Language**: `VINCE_UPLOAD_LANG=en` (or other code) for output language; or `--lang` in the batch script.
- **Timeout**: Upload and batch pass `--timeout` to the summarize CLI so it doesn't exit early on long runs.

**Troubleshooting**

- **"Summarize failed" / non-zero exit**: Check that `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` is set when not using `--extract`. For web URLs, try `VINCE_UPLOAD_FIRECRAWL=auto` (and `FIRECRAWL_API_KEY`) if the page is JS-heavy. The UPLOAD action retries once and surfaces a short stderr snippet in the reply.
- **Timeout**: Long YouTube or slide extraction can hit the default timeout. Increase with a larger `--timeout` in summarize (handled automatically by upload/batch) or run the batch script with fewer items.
- **Too little content**: Some URLs return almost no text; try `--firecrawl` for web or paste the content manually and use "upload: [paste]".
- **Rate limits**: If you hit provider rate limits, use `--extract` for batch ingest (no LLM calls) or reduce `--concurrency` in the batch script.

---

## ingest-urls (batch)

Batch-ingest URLs into `knowledge/` using the summarize CLI. Same category detection as the UPLOAD action.

**Usage**

```bash
# Single URL
bun run scripts/ingest-urls.ts https://example.com/article

# Multiple URLs
bun run scripts/ingest-urls.ts https://a.com/1 https://b.com/2

# From file (one URL per line)
bun run scripts/ingest-urls.ts --file urls.txt

# Extract only (no LLM; cheaper)
bun run scripts/ingest-urls.ts --file urls.txt --extract

# YouTube mode
bun run scripts/ingest-urls.ts "https://youtu.be/xxx" --youtube

# Longer summaries (xl / xxl)
bun run scripts/ingest-urls.ts --file urls.txt --length xl

# YouTube with slide extraction (yt-dlp + ffmpeg; optional tesseract for --slides-ocr)
bun run scripts/ingest-urls.ts "https://youtu.be/xxx" --youtube --slides
bun run scripts/ingest-urls.ts "https://youtu.be/xxx" --youtube --slides --slides-ocr

# Local files (PDF, audio, video, text — summarize accepts paths)
bun run scripts/ingest-urls.ts ./doc.pdf
bun run scripts/ingest-urls.ts /path/to/audio.mp3 ./report.pdf

# Web with Firecrawl fallback and language
bun run scripts/ingest-urls.ts --file urls.txt --firecrawl --lang en

# Limit parallel jobs and see failed URLs at end
bun run scripts/ingest-urls.ts --file urls.txt --concurrency 2

# Custom knowledge dir and dry-run
bun run scripts/ingest-urls.ts --file urls.txt --knowledge-dir ./knowledge --dry-run
```

**Options**: `--file <path>`, `--extract`, `--youtube`, `--slides`, `--slides-ocr`, `--length long|xl|xxl|medium|short`, `--lang <code>`, `--firecrawl`, `--concurrency <n>` (default 3), `--knowledge-dir <dir>`, `--dry-run`. Inputs can be URLs or local file paths (PDF, audio, video, text). With `--extract`, web URLs get `--format md`. The script passes `--timeout` to summarize and runs up to `--concurrency` jobs in parallel; at the end it lists any failed inputs.

---

## pdf-to-md

Converts a PDF to Markdown and writes it under `knowledge/` (default: `knowledge/perps-trading/<slug>.md`). Use this so VINCE’s knowledge base and custom providers (which only read `.md`) can use PDF content.

**Usage**

```bash
# Default output: knowledge/perps-trading/<slug>.md
bun run pdf-to-md "knowledge/Hyperliquid House of All Finance .pdf"

# Custom output path
bun run pdf-to-md ./doc.pdf --output knowledge/perps-trading/my-doc.md

# Preview only (no file written)
bun run pdf-to-md "knowledge/Some Doc.pdf" --dry-run
```

**Behavior**

- Extracts text with `pdf-parse`.
- Adds YAML frontmatter (`source`, `converted`).
- Heuristic heading detection: short lines and mostly-ALL-CAPS lines become `##` headings for better RAG chunking.
- Output path: `knowledge/perps-trading/<slug>.md` unless `--output` is set.

After conversion, the new `.md` is covered by the existing `perps-trading` directory in the character’s knowledge; no need to add a single-file entry for the PDF.

## test-summarize

Smoke test for the [Ikigai Labs summarize](https://github.com/IkigaiLabsETH/summarize) CLI used by VINCE UPLOAD to keep improving the `knowledge/` folder from URLs and YouTube. Run to verify summarize works before using “upload: &lt;url&gt;” or a YouTube link in chat.

**Usage**

```bash
# YouTube example (transcript + summary; needs API key)
bun run scripts/test-summarize.ts

# Extract-only (transcript, no LLM)
bun run scripts/test-summarize.ts -- --extract
```
