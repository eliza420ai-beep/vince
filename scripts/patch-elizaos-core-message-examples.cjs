#!/usr/bin/env node
/**
 * Patch @elizaos/core so formatSelectedExamples accepts both array and { examples }
 * shapes, fixing "example.map is not a function" when processing messages (e.g. Solus).
 * Run after bun install (postinstall) or manually if the error appears.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "@elizaos",
  "core",
  "dist",
  "node",
  "index.node.js"
);

if (!fs.existsSync(file)) {
  console.warn("patch-elizaos-core-message-examples: file not found, skipping");
  process.exit(0);
}

let s = fs.readFileSync(file, "utf8");

const unpatched =
  "    const conversation = example.map((message) => {";
const patched =
  "    const messages = Array.isArray(example) ? example : (example?.examples ?? []);\n    const conversation = messages.map((message) => {";

if (s.includes(patched)) {
  // already applied
} else if (s.includes(unpatched)) {
  s = s.replace(unpatched, patched);
  fs.writeFileSync(file, s, "utf8");
  console.log("patch-elizaos-core-message-examples: formatSelectedExamples patch applied");
} else {
  console.warn("patch-elizaos-core-message-examples: pattern not found, skipping");
}

process.exit(0);
