#!/usr/bin/env bun
/**
 * Scan data/x-bookmarks-pipeline/output for finance .meta.json and append
 * to paper-signals.jsonl (same ingest as X_BOOKMARKS_PIPELINE success path).
 *
 *   bun run x-bookmarks:ingest-paper
 */

import path from "node:path";
import process from "node:process";
import { ingestPipelineOutputToPaperQueue } from "../src/plugins/plugin-vince/src/utils/xBookmarksPaperQueue.ts";

const cwd = process.cwd();
const outputDir =
  process.env.X_BOOKMARKS_OUTPUT_DIR?.trim() ??
  path.join(cwd, "data", "x-bookmarks-pipeline", "output");

ingestPipelineOutputToPaperQueue({ cwd, outputDir })
  .then(({ appended, skipped }) => {
    console.log(
      `[x-bookmarks-ingest-paper] appended=${appended} skipped_meta=${skipped} outputDir=${outputDir}`,
    );
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
