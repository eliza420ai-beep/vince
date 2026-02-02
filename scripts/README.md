# Scripts

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
