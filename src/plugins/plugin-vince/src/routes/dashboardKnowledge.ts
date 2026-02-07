/**
 * Dashboard Knowledge API – newly added knowledge for the Knowledge tab.
 * GET /api/agents/:agentId/plugins/plugin-vince/vince/knowledge
 * Returns files in knowledge/ grouped by weekly and all-time.
 */

import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_DIR = "knowledge";
const EXTENSIONS = new Set([".md", ".txt"]);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface KnowledgeFileEntry {
  path: string;
  name: string;
  mtime: number;
  relativePath: string;
}

export interface KnowledgeGroup {
  count: number;
  files: KnowledgeFileEntry[];
}

export interface KnowledgeResponse {
  weekly: KnowledgeGroup;
  allTime: KnowledgeGroup;
  updatedAt: number;
}

function walkDir(
  dir: string,
  baseDir: string,
  out: KnowledgeFileEntry[],
): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const relative = path.relative(baseDir, full);
    if (e.isDirectory()) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      walkDir(full, baseDir, out);
    } else if (EXTENSIONS.has(path.extname(e.name).toLowerCase())) {
      try {
        const stat = fs.statSync(full);
        out.push({
          path: full,
          name: e.name,
          mtime: stat.mtimeMs,
          relativePath: relative,
        });
      } catch {
        // skip unreadable
      }
    }
  }
}

export function buildKnowledgeResponse(
  cwd: string = process.cwd(),
): KnowledgeResponse {
  const baseDir = path.join(cwd, KNOWLEDGE_DIR);
  const allFiles: KnowledgeFileEntry[] = [];
  walkDir(baseDir, baseDir, allFiles);

  const now = Date.now();
  const weekAgo = now - WEEK_MS;

  const weekly = allFiles.filter((f) => f.mtime >= weekAgo);
  const weeklySorted = [...weekly].sort((a, b) => b.mtime - a.mtime);
  const allTimeSorted = [...allFiles].sort((a, b) => b.mtime - a.mtime);

  return {
    weekly: {
      count: weekly.length,
      files: weeklySorted.slice(0, 100),
    },
    allTime: {
      count: allFiles.length,
      files: allTimeSorted.slice(0, 200),
    },
    updatedAt: now,
  };
}
