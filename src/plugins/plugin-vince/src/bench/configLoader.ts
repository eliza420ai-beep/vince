/**
 * Load VinceBench scoring config from domains-vince.yaml.
 */
import * as fs from "fs";
import * as path from "path";
import { parse } from "yaml";
import type { VinceBenchConfig } from "./types";

const DEFAULT_CONFIG_PATH = "bench-dataset/domains-vince.yaml";

/**
 * Resolve path to config file. Tries plugin root (where bench-dataset lives).
 */
function resolveConfigPath(customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) return customPath;
  const fromCwd = path.join(process.cwd(), DEFAULT_CONFIG_PATH);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromPlugin = path.join(__dirname, "..", "..", DEFAULT_CONFIG_PATH);
  if (fs.existsSync(fromPlugin)) return fromPlugin;
  return customPath || fromCwd;
}

/**
 * Load and parse domains-vince.yaml into VinceBenchConfig.
 */
export function loadConfig(configPath?: string): VinceBenchConfig {
  const resolved = resolveConfigPath(configPath);
  const raw = fs.readFileSync(resolved, "utf-8");
  const parsed = parse(raw) as Record<string, unknown>;
  const domains = (parsed.domains as Record<string, unknown>) || {};
  const result: VinceBenchConfig = {
    version: String(parsed.version ?? "0.1"),
    per_decision_window_ms: Number(parsed.per_decision_window_ms ?? 60000),
    per_signature_cap: Number(parsed.per_signature_cap ?? 5),
    domains: {},
  };
  for (const [name, dom] of Object.entries(domains)) {
    const d = dom as Record<string, unknown>;
    result.domains[name] = {
      weight: Number(d.weight ?? 1),
      description: d.description != null ? String(d.description) : undefined,
      allow: Array.isArray(d.allow) ? (d.allow as string[]) : [],
    };
  }
  return result;
}
