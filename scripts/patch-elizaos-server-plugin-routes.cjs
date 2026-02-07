#!/usr/bin/env node
/**
 * Apply plugin-route path fix to @elizaos/server so GET /api/agents/:id/plugins/vince/pulse works
 * when Express passes req.path without the /api prefix. Run after bun install (e.g. in Dockerfile).
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "@elizaos",
  "server",
  "dist",
  "index.js"
);

if (!fs.existsSync(file)) {
  console.warn("patch-elizaos-server-plugin-routes: file not found, skipping");
  process.exit(0);
}

let s = fs.readFileSync(file, "utf8");
const alreadyPatched = s.includes("(?:\\/api)?\\/agents\\/");
const unpatched =
  'reqPath.replace(/\\/api\\/agents\\/[^\\/]+\\/plugins/, "")';
const patched =
  'reqPath.replace(/(?:\\/api)?\\/agents\\/[^\\/]+\\/plugins/, "")';

if (alreadyPatched) {
  console.log("patch-elizaos-server-plugin-routes: already patched");
  process.exit(0);
}
if (!s.includes(unpatched)) {
  console.warn("patch-elizaos-server-plugin-routes: pattern not found, skipping");
  process.exit(0);
}

s = s.replace(unpatched, patched);
fs.writeFileSync(file, s);
console.log("patch-elizaos-server-plugin-routes: applied");
