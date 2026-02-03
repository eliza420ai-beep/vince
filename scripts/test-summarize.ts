#!/usr/bin/env bun
/**
 * Manual smoke test for the summarize CLI (used by VINCE UPLOAD for URLs/YouTube).
 *
 * Run with network so bunx can fetch the package and summarize can fetch the URL:
 *   bun run scripts/test-summarize.ts
 *
 * Uses a real YouTube video; needs OPENAI_API_KEY or GEMINI_API_KEY for transcript/summary.
 * For extract-only (no LLM): bun run scripts/test-summarize.ts -- --extract
 */

import { spawn } from "child_process";

const useExtract = process.argv.includes("--extract");
// Example YouTube URL for testing (same as used in UPLOAD action)
const testUrl = "https://www.youtube.com/watch?v=wGucOorJlvk";
const timeoutMs = 120_000; // YouTube can take 1–2 min for transcript + summary

const args = [
  "@steipete/summarize",
  testUrl,
  "--youtube",
  "auto",
  "--plain",
  "--no-color",
  ...(useExtract ? ["--extract"] : ["--length", "short"]),
];

console.log("Testing summarize CLI (bunx)...");
console.log("Command: bunx", args.join(" "));
console.log("Timeout:", timeoutMs / 1000, "s\n");

const child = spawn("bunx", args, {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});

let stdout = "";
let stderr = "";
child.stdout?.on("data", (chunk: Buffer) => {
  stdout += chunk.toString("utf-8");
});
child.stderr?.on("data", (chunk: Buffer) => {
  stderr += chunk.toString("utf-8");
});

const timer = setTimeout(() => {
  child.kill("SIGTERM");
  console.error("TIMEOUT: summarize did not finish in", timeoutMs / 1000, "s");
  process.exit(1);
}, timeoutMs);

child.on("close", (code, signal) => {
  clearTimeout(timer);
  const content = stdout.trim();
  const minLen = 50;
  if (code === 0 && content.length >= minLen) {
    console.log("SUCCESS: summarize returned", content.length, "chars");
    console.log("First 200 chars:", content.slice(0, 200).replace(/\n/g, " "));
    process.exit(0);
  }
  console.error("FAIL: code=%s signal=%s stdout=%d chars stderr=%s", code, signal ?? "", content.length, stderr.slice(0, 300));
  process.exit(1);
});

child.on("error", (err) => {
  clearTimeout(timer);
  console.error("FAIL: spawn error", err.message);
  process.exit(1);
});
