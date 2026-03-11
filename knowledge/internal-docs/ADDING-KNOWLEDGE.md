# Adding New Knowledge

This guide describes how to add content to the knowledge base so it is **RAG-optimized**: the first chunk tells the agent how to use the content (frameworks and context, not current data).

## Preferred: Agent Ingestion

Use the **knowledge-ingestion** plugin so the agent categorizes and writes a structured file.

| Method            | How                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Paste in chat** | "Save this knowledge: [your research or notes]" or "Add to knowledge base: [content]" (or paste 500+ chars). |
| **Local file**    | "Process docs path/to/file.md" or "Ingest local file path/to/research.md".                                   |
| **Link**          | Share a URL; the agent can ingest from the link.                                                             |

**What you get:** The agent chooses a category (e.g. `perps-trading`, `options`) and writes a file with Title, Source, Summary, Key Points, Implications, Action Items, Related Topics. Ingested files now include **## Metadata** (Category, Source, Word Count, Tags) and a **Knowledge Base Note** at the top.

**Optional after ingestion:** Run the quality audit and AI enhancement so low-quality files get a **Methodology & Framework** block:

```bash
bun run scripts/audit-knowledge-quality.ts
bun run scripts/ai-enhance-knowledge.ts --backup
```

See `scripts/KNOWLEDGE-ENHANCEMENT-GUIDE.md` for details.

---

## Manual: New File by Hand

### Minimum (reference docs – specs, protocols, fee tiers)

1. **Knowledge Base Note at the top** (2–4 lines):

   ```markdown
   > **📌 Knowledge Base Note**
   >
   > These documents are optimized for RAG: use for **frameworks and context**, not for current data. Numbers and dates are illustrative—check actions/APIs for live data.

   ---
   ```

2. **## section headers** in the body so chunking has clear boundaries.

### Better (essays / analysis)

1. Use the **essay template**: [`knowledge/internal-docs/knowledge-essay-template.md`](knowledge-essay-template.md).
2. It includes:
   - **## Methodology & Framework** (key concepts, analytical approach, pattern recognition, strategic framework)
   - **Knowledge Base Note** (use for frameworks, not current data)
   - **## Metadata** (Source, Category, Word Count, Tags)
   - **---** separator, then **## Context**, **## Main**, **## Conclusion**
3. Fill in the body; update Word Count after writing.
4. Alternatively, add **## Metadata** and **---** yourself, then run the add-headers script to insert **## Context** / **## Main** / **## Conclusion**:

   ```bash
   node scripts/add-headers-for-knowledge.cjs
   ```

---

## Fixing Existing Pasted Files

For files that are already raw paste (no Knowledge Base Note at the top):

1. **Quick fix:** Prepend the **Knowledge Base Note** (2–4 lines) at the very top so the first chunk tells the agent "frameworks, not current data." Use the same block as in the "Minimum" section above, then `---` and the existing content.
2. **Optional:** Run the quality audit and AI enhancement to add a **Methodology & Framework** section to low-quality files:

   ```bash
   bun run scripts/audit-knowledge-quality.ts
   bun run scripts/ai-enhance-knowledge.ts --backup
   ```

   See `scripts/KNOWLEDGE-ENHANCEMENT-GUIDE.md` for options (e.g. `--limit`, `--backup`).

---

## Summary

| Situation                | Action                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New research**         | Prefer agent ingestion ("Save this knowledge", "Process docs …", or link). Ingested files get ## Metadata + Knowledge Base Note automatically. Optionally run audit + ai-enhance for Methodology & Framework. |
| **Manual new file**      | Use [`knowledge-essay-template.md`](knowledge-essay-template.md) for essays; for reference docs use at least Knowledge Base Note + ## section headers.                                                        |
| **Existing pasted file** | Prepend Knowledge Base Note; optionally run `audit-knowledge-quality.ts` then `ai-enhance-knowledge.ts`.                                                                                                      |

---

## Related

- [KNOWLEDGE-QUALITY-GUIDE.md](KNOWLEDGE-QUALITY-GUIDE.md) – quality principles and metrics
- [knowledge-essay-template.md](knowledge-essay-template.md) – template for essay-style knowledge
- `scripts/KNOWLEDGE-ENHANCEMENT-GUIDE.md` – audit and AI enhancement scripts
- `scripts/add-headers-for-knowledge.cjs` – add ## Context/Main/Conclusion to files that already have ## Metadata + ---
