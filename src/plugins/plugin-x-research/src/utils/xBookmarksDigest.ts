/**
 * Summarize recent pipeline artifacts for chat + optional digest file.
 */

import fs from "node:fs/promises";
import path from "node:path";

type MetaShape = {
  tweet_url?: string;
  tweet_id?: string;
  category?: string;
  is_finance?: boolean;
  summary?: string;
  ticker?: string;
  direction?: string;
  timeframe?: string;
  rationale?: string;
  validation_passed?: boolean;
  pine_path?: string;
};

async function collectMetaFiles(
  dir: string,
  acc: string[] = [],
): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const name = String(e.name);
    const p = path.join(dir, name);
    if (e.isDirectory()) await collectMetaFiles(p, acc);
    else if (name.endsWith(".meta.json")) acc.push(p);
  }
  return acc;
}

async function mtime(p: string): Promise<number> {
  try {
    const s = await fs.stat(p);
    return s.mtimeMs;
  } catch {
    return 0;
  }
}

export async function summarizeOutputDirectory(
  outputDir: string,
  maxItems: number,
): Promise<{ lines: string[]; metaCount: number }> {
  const metas = await collectMetaFiles(outputDir);
  const scored = await Promise.all(
    metas.map(async (p) => ({ p, t: await mtime(p) })),
  );
  scored.sort((a, b) => b.t - a.t);
  const lines: string[] = [];
  let n = 0;
  for (const { p } of scored) {
    if (n >= maxItems) break;
    let raw: string;
    try {
      raw = await fs.readFile(p, "utf-8");
    } catch {
      continue;
    }
    let m: MetaShape;
    try {
      m = JSON.parse(raw) as MetaShape;
    } catch {
      continue;
    }
    const bits: string[] = [];
    if (m.ticker) bits.push(`${m.ticker}`);
    if (m.direction) bits.push(m.direction);
    if (m.timeframe) bits.push(m.timeframe);
    const head = bits.length ? `**${bits.join(" · ")}**` : "";
    const url = m.tweet_url ?? m.tweet_id ?? "";
    const sum = (m.summary ?? m.rationale ?? "").replace(/\s+/g, " ").trim();
    const fin = m.is_finance ? "finance" : (m.category ?? "non-finance");
    const val =
      m.validation_passed === undefined
        ? ""
        : m.validation_passed
          ? " ✓"
          : " ✗";
    lines.push(
      `- ${fin}${val}: ${head}${sum ? ` — ${sum.slice(0, 200)}${sum.length > 200 ? "…" : ""}` : ""}${url ? `\n  ${url}` : ""}`,
    );
    n++;
  }
  return { lines, metaCount: metas.length };
}

export async function readCostReportHead(
  outputDir: string,
  maxLines: number,
): Promise<string | null> {
  const p = path.join(outputDir, "cost_report.md");
  try {
    const raw = await fs.readFile(p, "utf-8");
    return raw.split("\n").slice(0, maxLines).join("\n");
  } catch {
    return null;
  }
}

export async function writeDigestFile(
  digestPath: string,
  body: string,
): Promise<void> {
  await fs.mkdir(path.dirname(digestPath), { recursive: true });
  await fs.writeFile(digestPath, body, "utf-8");
}
