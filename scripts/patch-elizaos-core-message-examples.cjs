#!/usr/bin/env node
/**
 * Patch @elizaos/core and @elizaos/plugin-bootstrap so example/message formatting
 * accepts both array and { examples } shapes, fixing "example.map is not a function"
 * when processing messages (e.g. Solus). Patches EVERY copy of core and bootstrap
 * bundle in node_modules (top-level and nested). Run after bun install (postinstall)
 * or before start (prestart).
 *
 * Note: Cursor (auto mode) ground on this for half a day; the actual crash was in
 * plugin-bootstrap/dist/index.js. With GPT 5.3 it was fixed in under 21 seconds.
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "node_modules");

function findCoreBundles(dir, list) {
  if (!list) list = [];
  if (!fs.existsSync(dir)) return list;
  try {
    const coreHere = path.join(dir, "@elizaos", "core", "dist", "node", "index.node.js");
    if (fs.existsSync(coreHere)) list.push(coreHere);
    const nm = path.join(dir, "node_modules");
    if (fs.existsSync(nm)) {
      const coreInNm = path.join(nm, "@elizaos", "core", "dist", "node", "index.node.js");
      if (fs.existsSync(coreInNm)) list.push(coreInNm);
      for (const e of fs.readdirSync(nm, { withFileTypes: true })) {
        if (e.isDirectory()) findCoreBundles(path.join(nm, e.name), list);
      }
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name !== "node_modules") {
        findCoreBundles(path.join(dir, e.name), list);
      }
    }
  } catch (_) {}
  return list;
}

const corePaths = [...new Set(findCoreBundles(rootDir))];
const bootstrapRel = path.join("@elizaos", "plugin-bootstrap", "dist", "index.js");
function findBootstrapBundles(dir, list) {
  if (!list) list = [];
  if (!fs.existsSync(dir)) return list;
  try {
    const bootstrapHere = path.join(dir, bootstrapRel);
    if (fs.existsSync(bootstrapHere)) list.push(bootstrapHere);
    const nm = path.join(dir, "node_modules");
    if (fs.existsSync(nm)) {
      const bootstrapInNm = path.join(nm, bootstrapRel);
      if (fs.existsSync(bootstrapInNm)) list.push(bootstrapInNm);
      for (const e of fs.readdirSync(nm, { withFileTypes: true })) {
        if (e.isDirectory()) findBootstrapBundles(path.join(nm, e.name), list);
      }
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name !== "node_modules") {
        findBootstrapBundles(path.join(dir, e.name), list);
      }
    }
  } catch (_) {}
  return list;
}
const bootstrapPaths = [...new Set(findBootstrapBundles(rootDir))];

function patchOne(file) {
  if (!fs.existsSync(file)) return { patched: false, content: null, skipped: true };
  let s = fs.readFileSync(file, "utf8");
  let changed = false;

  const unpatched1 = "    const conversation = example.map((message) => {";
  const patched1 =
    "    const messages = Array.isArray(example) ? example : (example?.examples ?? []);\n    const conversation = messages.map((message) => {";
  if (s.includes(unpatched1)) {
    s = s.split(unpatched1).join(patched1);
    changed = true;
  }

  const unpatched2 = "      return group.examples.map((message3) => {";
  const patched2 =
    "      const messages = Array.isArray(group) ? group : (group?.examples ?? []);\n      return messages.map((message3) => {";
  if (s.includes(unpatched2)) {
    s = s.split(unpatched2).join(patched2);
    changed = true;
  }

  const unpatched3 = "      return example.examples.map((message3) => {";
  const patched3 =
    "      const messages = Array.isArray(example) ? example : (example?.examples ?? []);\n      return messages.map((message3) => {";
  if (s.includes(unpatched3)) {
    s = s.split(unpatched3).join(patched3);
    changed = true;
  }

  const unpatched4 = "  return examples.map((example, exampleIndex) => {";
  const patched4 =
    "  const examplesArr = Array.isArray(examples) ? examples : [];\n  return examplesArr.map((example, exampleIndex) => {";
  if (s.includes(unpatched4) && !s.includes("const examplesArr = Array.isArray(examples) ? examples : [];")) {
    s = s.split(unpatched4).join(patched4);
    changed = true;
  }

  if (changed) fs.writeFileSync(file, s, "utf8");
  return { patched: true, content: s, skipped: false, written: changed };
}

function patchBootstrap(file) {
  if (!fs.existsSync(file)) return { content: null, skipped: true, written: false };
  let s = fs.readFileSync(file, "utf8");
  let changed = false;
  const unpatched = "          return example.map((msg) => {";
  const patched =
    "          const rawMessages = Array.isArray(example) ? example : (example?.examples ?? []);\n          const messages = Array.isArray(rawMessages) ? rawMessages : [];\n          return messages.map((msg) => {";
  if (s.includes(unpatched)) {
    s = s.split(unpatched).join(patched);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, s, "utf8");
  return { content: s, skipped: false, written: changed };
}

const unpatchedCall = "const conversation = example.map((message) => {";
function verify(content) {
  if (content.includes(unpatchedCall)) {
    console.error("patch-elizaos-core-message-examples: VERIFICATION FAILED - unpatched pattern still present");
    process.exit(1);
  }
  if (content.includes("example.map(") && !content.includes("example.map((a)")) {
    console.error("patch-elizaos-core-message-examples: VERIFICATION FAILED - example.map(...) still present");
    process.exit(1);
  }
}

let patchedAny = false;
for (const file of corePaths) {
  const result = patchOne(file);
  if (result.skipped) continue;
  patchedAny = true;
  if (result.content) verify(result.content);
  if (result.written) {
    console.log("patch-elizaos-core-message-examples: applied " + path.relative(rootDir, file));
  }
}

if (!patchedAny) {
  console.warn("patch-elizaos-core-message-examples: no core bundle found at any path, skipping");
  process.exit(0);
}

let bootstrapAny = false;
for (const file of bootstrapPaths) {
  const result = patchBootstrap(file);
  if (result.skipped) continue;
  bootstrapAny = true;
  if (result.written) {
    console.log("patch-elizaos-core-message-examples: applied " + path.relative(rootDir, file));
  }
}
if (!bootstrapAny) {
  console.warn("patch-elizaos-core-message-examples: no plugin-bootstrap bundle found at any path");
}

console.log("patch-elizaos-core-message-examples: verification passed");
process.exit(0);
