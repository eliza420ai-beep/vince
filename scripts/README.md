# Scripts

## Knowledge ingestion playbook (summarize + UPLOAD)

We use [Ikigai Labs summarize](https://github.com/IkigaiLabsETH/summarize) to grow the `knowledge/` folder from URLs and YouTube.

| Method | When to use |
|--------|-------------|
| **Chat UPLOAD** | One-off: say “upload: &lt;url&gt;” or paste a YouTube link in VINCE chat. Uses summarize under the hood. |
| **Batch script** | Many URLs: `bun run scripts/ingest-urls.ts --file urls.txt` (optionally `--extract` to skip LLM). |
| **Extract-only** | Set `VINCE_UPLOAD_EXTRACT_ONLY=true` so the UPLOAD action only fetches transcript/extract (no summarization; saves cost). |

- **Install summarize**: `bun install -g @steipete/summarize` or rely on `bunx` (no install).
- **API keys**: For summaries (non-extract), set one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` for summarize.

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

# Custom knowledge dir and dry-run
bun run scripts/ingest-urls.ts --file urls.txt --knowledge-dir ./knowledge --dry-run
```

**Options**: `--file <path>`, `--extract`, `--youtube`, `--knowledge-dir <dir>`, `--dry-run`.

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
