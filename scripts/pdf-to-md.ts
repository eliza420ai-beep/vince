#!/usr/bin/env bun
/**
 * PDF → Markdown script for VINCE knowledge base
 *
 * Extracts text from a PDF and writes a .md file under knowledge/ (default:
 * knowledge/perps-trading/<slug>.md). Optionally applies heuristic heading
 * detection so RAG chunks better.
 *
 * Usage:
 *   bun run scripts/pdf-to-md.ts [path-to.pdf] [options]
 *   bun run scripts/pdf-to-md.ts "knowledge/Hyperliquid House of All Finance .pdf"
 *   bun run scripts/pdf-to-md.ts ./doc.pdf --output knowledge/perps-trading/hyperliquid.md
 *
 * Options:
 *   --output, -o   Output .md path (default: knowledge/perps-trading/<slug>.md)
 *   --dry-run      Print extracted text length and output path, don't write
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

function slugFromFilename(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return base
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Heuristic: treat lines that look like section titles as ## headings.
 * - Short line (e.g. ≤ 60 chars), not ending in . ! ?
 * - Or line that is mostly ALL CAPS
 */
function addMarkdownHeadings(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  const maxTitleLen = 60;
  const capsRatio = 0.7; // line is "heading" if this much is uppercase

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const isShort = trimmed.length <= maxTitleLen;
    const noSentenceEnd = !/[.!?]\s*$/.test(trimmed);
    const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
    const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
    const mostlyCaps = letterCount > 0 && upperCount / letterCount >= capsRatio;

    if ((isShort && noSentenceEnd) || mostlyCaps) {
      out.push(`## ${trimmed}`);
    } else {
      out.push(line);
    }
  }

  return out.join("\n");
}

function buildFrontmatter(sourceFilename: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `---
source: ${path.basename(sourceFilename)}
converted: ${date}
---

`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const hasOutput = process.argv.includes("--output") || process.argv.includes("-o");
  const outputIdx = process.argv.findIndex((a) => a === "--output" || a === "-o");
  const outputArg = outputIdx >= 0 ? process.argv[outputIdx + 1] : undefined;
  const dryRun = process.argv.includes("--dry-run");

  const pdfPath = args[0];
  if (!pdfPath) {
    console.error("Usage: bun run scripts/pdf-to-md.ts <path-to.pdf> [--output knowledge/.../file.md] [--dry-run]");
    process.exit(1);
  }

  const absolutePdf = path.isAbsolute(pdfPath) ? pdfPath : path.resolve(PROJECT_ROOT, pdfPath);

  let outPath: string;
  if (outputArg) {
    outPath = path.isAbsolute(outputArg) ? outputArg : path.resolve(PROJECT_ROOT, outputArg);
  } else {
    const slug = slugFromFilename(absolutePdf) || "document";
    outPath = path.join(PROJECT_ROOT, "knowledge", "perps-trading", `${slug}.md`);
  }

  if (!outPath.endsWith(".md")) {
    outPath = outPath.replace(/\.[^.]+$/, "") + ".md";
  }

  console.log("PDF:", absolutePdf);
  console.log("Output:", outPath);

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePdf);
  } catch (e) {
    console.error("Failed to read PDF:", (e as Error).message);
    process.exit(1);
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  let text: string;
  try {
    const result = await parser.getText();
    text = result.text ?? "";
    await parser.destroy();
  } catch (e) {
    console.error("Failed to parse PDF:", (e as Error).message);
    process.exit(1);
  }

  if (!text || !text.trim()) {
    console.error("No text extracted from PDF.");
    process.exit(1);
  }

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const withHeadings = addMarkdownHeadings(normalized);
  const frontmatter = buildFrontmatter(path.basename(absolutePdf));
  const md = frontmatter + withHeadings;

  console.log("Extracted length:", text.length, "chars → MD length:", md.length);

  if (dryRun) {
    console.log("--dry-run: not writing file.");
    process.exit(0);
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, md, "utf-8");
  console.log("Wrote:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
