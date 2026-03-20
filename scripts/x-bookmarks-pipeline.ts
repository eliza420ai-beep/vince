#!/usr/bin/env bun
/**
 * CLI wrapper for packages/x-bookmarks-pipeline (Rust).
 * Forwards argv after the subcommand to `cargo run --release -- <args>`.
 *
 * Usage:
 *   bun run scripts/x-bookmarks-pipeline.ts fetch
 *   bun run scripts/x-bookmarks-pipeline.ts run -- --text "BTC 4h breakout"
 *   bun run scripts/x-bookmarks-pipeline.ts run -- --file ./bookmarks.json
 *
 * Sets OUTPUT_DIR and CACHE_PATH under data/x-bookmarks-pipeline/ unless overridden.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const root = path.join(cwd, "packages", "x-bookmarks-pipeline");
const dataRoot = path.join(cwd, "data", "x-bookmarks-pipeline");
const outputDir = process.env.OUTPUT_DIR ?? path.join(dataRoot, "output");
const cachePath =
  process.env.CACHE_PATH ?? path.join(dataRoot, "cache", "bookmarks.db");

const [, , sub, ...rest] = process.argv;

function usage(): never {
  console.error(`Usage:
  bun run scripts/x-bookmarks-pipeline.ts fetch [extra cargo args...]
  bun run scripts/x-bookmarks-pipeline.ts run -- --text "..." | --file ... | --fetch ...

Examples:
  bun run scripts/x-bookmarks-pipeline.ts fetch
  bun run scripts/x-bookmarks-pipeline.ts run -- --fetch --fetch-user-id YOUR_ID

Env: see packages/x-bookmarks-pipeline/.env.example and docs/X-BOOKMARKS-PIPELINE.md
Default OUTPUT_DIR=${outputDir}
Default CACHE_PATH=${cachePath}
`);
  process.exit(1);
}

if (!sub) usage();

const env = {
  ...process.env,
  OUTPUT_DIR: outputDir,
  CACHE_PATH: cachePath,
};

let cargoArgs: string[];

if (sub === "fetch") {
  const uid = process.env.X_FETCH_USER_ID?.trim();
  const user = process.env.X_FETCH_USERNAME?.trim();
  if (!uid && !user) {
    console.error("Set X_FETCH_USER_ID or X_FETCH_USERNAME in .env");
    process.exit(1);
  }
  const tail = rest.length ? rest : [];
  cargoArgs = [
    "run",
    "--release",
    "--",
    "--fetch",
    ...(uid ? ["--fetch-user-id", uid] : ["--fetch-username", user!]),
    "--output-dir",
    outputDir,
    "--cache-path",
    cachePath,
    ...tail,
  ];
} else if (sub === "run") {
  if (rest[0] !== "--") usage();
  cargoArgs = ["run", "--release", "--", ...rest.slice(1)];
} else {
  usage();
}

const child = spawn("cargo", cargoArgs, {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
