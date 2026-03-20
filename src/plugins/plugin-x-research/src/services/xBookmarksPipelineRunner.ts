/**
 * Spawns the vendored Rust X bookmarks → Pine pipeline (packages/x-bookmarks-pipeline).
 * See docs/X-BOOKMARKS-PIPELINE.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

const DEFAULT_DATA_ROOT = path.join("data", "x-bookmarks-pipeline");

export function resolvePipelineRoot(cwd: string): string {
  const override = process.env.X_BOOKMARKS_PIPELINE_ROOT?.trim();
  if (override)
    return path.isAbsolute(override) ? override : path.join(cwd, override);
  return path.join(cwd, "packages", "x-bookmarks-pipeline");
}

export function defaultOutputDir(cwd: string): string {
  const fromEnv = process.env.X_BOOKMARKS_OUTPUT_DIR?.trim();
  if (fromEnv)
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(cwd, fromEnv);
  return path.join(cwd, DEFAULT_DATA_ROOT, "output");
}

export function defaultCachePath(cwd: string): string {
  const fromEnv = process.env.X_BOOKMARKS_CACHE_PATH?.trim();
  if (fromEnv)
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(cwd, fromEnv);
  return path.join(cwd, DEFAULT_DATA_ROOT, "cache", "bookmarks.db");
}

export function defaultDigestPath(cwd: string): string {
  return path.join(cwd, DEFAULT_DATA_ROOT, "digest", "latest.md");
}

function settingString(
  runtime: IAgentRuntime,
  key: string,
  fallback?: string,
): string | undefined {
  const v = runtime.getSetting(key);
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

/** Agents allowed to run the pipeline (comma-separated). Default: VINCE */
export function isBookmarkPipelineAgent(runtime: IAgentRuntime): boolean {
  const raw = process.env.X_BOOKMARKS_PIPELINE_AGENTS?.trim() || "VINCE";
  const allowed = raw.split(",").map((s) => s.trim().toUpperCase());
  const name = (runtime.character?.name ?? "").toUpperCase();
  return name.length > 0 && allowed.includes(name);
}

export function isBookmarkPipelineEnabled(): boolean {
  return process.env.X_BOOKMARKS_PIPELINE_ENABLED === "true";
}

export async function cargoAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("cargo", ["--version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function assertPipelineCheckout(cwd: string): Promise<void> {
  const root = resolvePipelineRoot(cwd);
  const cargoToml = path.join(root, "Cargo.toml");
  try {
    await fs.stat(cargoToml);
  } catch {
    throw new Error(
      `Missing pipeline at ${root}. Clone: git clone https://github.com/eliza420ai-beep/x-bookmarks-pipeline.git packages/x-bookmarks-pipeline`,
    );
  }
}

export type PipelineRunMode = "fetch" | "text";

export function parseFetchLimitFromMessage(text: string): number | undefined {
  const m = text.match(/\b(?:last|limit)\s+(\d+)\s+bookmark/i);
  if (m) return Math.min(200, Math.max(1, parseInt(m[1]!, 10)));
  return undefined;
}

export function buildPipelineArgs(options: {
  mode: PipelineRunMode;
  cwd: string;
  verbose: boolean;
  fetchUserId?: string;
  fetchLimit?: number;
  textSnippet?: string;
}): string[] {
  const out: string[] = [];
  const outputDir = defaultOutputDir(options.cwd);
  const cachePath = defaultCachePath(options.cwd);

  out.push("--output-dir", outputDir);
  out.push("--cache-path", cachePath);

  if (options.verbose) out.push("--verbose");

  if (options.mode === "fetch") {
    const uid =
      options.fetchUserId?.trim() ||
      process.env.X_FETCH_USER_ID?.trim() ||
      process.env.X_USER_ID?.trim();
    const username =
      process.env.X_FETCH_USERNAME?.trim() ||
      process.env.XPB_X_FETCH_USERNAME?.trim();
    if (!uid && !username) {
      throw new Error(
        "Set X_FETCH_USER_ID (numeric) or X_FETCH_USERNAME for bookmark fetch, or use the CLI with --file.",
      );
    }
    out.push("--fetch");
    if (uid) out.push("--fetch-user-id", uid);
    else if (username) out.push("--fetch-username", username);
    if (options.fetchLimit != null) {
      out.push("--fetch-limit", String(options.fetchLimit));
    }
  } else if (options.mode === "text") {
    const t = options.textSnippet?.trim();
    if (!t) throw new Error("No text provided for one-off pipeline run.");
    out.push("--text", t);
  }

  return out;
}

/** Merge process env with keys the Rust binary expects; VINCE .env already has OPENAI/ANTHROPIC. */
export function pipelineChildEnv(runtime: IAgentRuntime): NodeJS.ProcessEnv {
  const env = { ...process.env } as NodeJS.ProcessEnv;

  const bearer =
    settingString(runtime, "X_BEARER_TOKEN") ??
    process.env.X_BEARER_TOKEN ??
    process.env.VINCE_X_BEARER_TOKEN;
  if (bearer) env.X_BEARER_TOKEN = bearer;

  for (const key of [
    "CEREBRAS_API_KEY",
    "XAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "X_FETCH_USER_ID",
    "X_FETCH_USERNAME",
    "X_USER_ID",
    "X_CLIENT_ID",
    "X_CLIENT_SECRET",
    "X_REFRESH_TOKEN",
    "X_OAUTH_SCOPE",
    "OUTPUT_DIR",
    "CACHE_PATH",
    "MAX_WORKERS",
    "XPB_CHROME_APP",
    "XPB_CHROME_USER_DATA_DIR",
  ] as const) {
    const v = process.env[key];
    if (v !== undefined && v !== "") env[key] = v;
  }

  return env;
}

export async function runCargoPipeline(options: {
  cwd: string;
  pipelineRoot: string;
  extraArgs: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const args = ["run", "--release", "--", ...options.extraArgs];
  logger.info(
    { cwd: options.pipelineRoot, args },
    "[x-bookmarks-pipeline] spawning cargo",
  );

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn("cargo", args, {
      cwd: options.pipelineRoot,
      env: options.env,
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(
          `Pipeline timed out after ${options.timeoutMs}ms (SIGTERM sent to cargo).`,
        ),
      );
    }, options.timeoutMs);

    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString("utf-8");
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString("utf-8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

export async function ensureDigestDir(cwd: string): Promise<void> {
  const dir = path.dirname(defaultDigestPath(cwd));
  await fs.mkdir(dir, { recursive: true });
}
