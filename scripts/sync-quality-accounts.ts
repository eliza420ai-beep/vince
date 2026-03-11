/**
 * Sync quality account constants from an org's X following graph.
 *
 * Rewrites:
 * - src/plugins/plugin-x-research/src/constants/qualityAccounts.ts
 * - src/plugins/plugin-vince/src/constants/qualityAccounts.ts
 *
 * Usage:
 *   bun run scripts/sync-quality-accounts.ts --weekly
 *   bun run scripts/sync-quality-accounts.ts --weekly --dry-run
 *   bun run scripts/sync-quality-accounts.ts --weekly --force
 *   bun run scripts/sync-quality-accounts.ts --org=ikigaistudioxyz --whaleMin=1000000 --alphaMin=100000 --whaleMax=15 --alphaMax=20 --dataMax=12
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { XClientService } from "../src/plugins/plugin-x-research/src/services/xClient.service";

export type Options = {
  org: string;
  whaleMin: number;
  alphaMin: number;
  whaleMax: number;
  alphaMax: number;
  dataMax: number;
  weekly: boolean;
  force: boolean;
  dryRun: boolean;
};

type FollowUser = {
  username: string;
  followers: number;
};

type QualityAccountRow = {
  username: string;
  tier: "whale" | "alpha" | "quality";
  focus: [string, string];
};

const ROOT = process.cwd();
const X_RESEARCH_FILE = path.join(
  ROOT,
  "src/plugins/plugin-x-research/src/constants/qualityAccounts.ts",
);
const VINCE_FILE = path.join(
  ROOT,
  "src/plugins/plugin-vince/src/constants/qualityAccounts.ts",
);
const STATE_DIR = path.join(ROOT, ".elizadb", "x-research");
const STATE_FILE = path.join(STATE_DIR, "quality-accounts-sync-state.json");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type SyncState = {
  lastRunAt?: string;
  lastOrg?: string;
  lastFollowingCount?: number;
};

export function parseArgs(argv: string[]): Options {
  const defaults: Options = {
    org: "ikigaistudioxyz",
    whaleMin: 1_000_000,
    alphaMin: 100_000,
    whaleMax: 15,
    alphaMax: 20,
    dataMax: 12,
    weekly: false,
    force: false,
    dryRun: false,
  };

  const out = { ...defaults };
  for (const arg of argv) {
    if (arg === "--weekly") {
      out.weekly = true;
      continue;
    }
    if (arg === "--force") {
      out.force = true;
      continue;
    }
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq < 0) continue;
    const key = arg.slice(2, eq);
    const val = arg.slice(eq + 1);

    if (key === "org") out.org = val;
    if (key === "whaleMin") out.whaleMin = Number(val);
    if (key === "alphaMin") out.alphaMin = Number(val);
    if (key === "whaleMax") out.whaleMax = Number(val);
    if (key === "alphaMax") out.alphaMax = Number(val);
    if (key === "dataMax") out.dataMax = Number(val);
  }
  return out;
}

function readSyncState(): SyncState {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as SyncState;
  } catch {
    return {};
  }
}

function writeSyncState(state: SyncState): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function loadEnv(): void {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function uniqueByUsername(users: FollowUser[]): FollowUser[] {
  const seen = new Set<string>();
  const out: FollowUser[] = [];
  for (const u of users) {
    const key = u.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function pickDataAccounts(
  users: FollowUser[],
  excluded: Set<string>,
  max: number,
): FollowUser[] {
  const hints = [
    "news",
    "alert",
    "onchain",
    "research",
    "analytics",
    "desk",
    "glass",
    "lookon",
    "nansen",
    "messari",
    "coingecko",
    "coin",
    "block",
    "whale",
  ];
  const selected: FollowUser[] = [];
  for (const u of users) {
    if (selected.length >= max) break;
    const key = u.username.toLowerCase();
    if (excluded.has(key)) continue;
    if (hints.some((h) => key.includes(h))) {
      selected.push(u);
      excluded.add(key);
    }
  }
  return selected;
}

function toRows(
  users: FollowUser[],
  tier: "whale" | "alpha" | "quality",
  focus: [string, string],
): QualityAccountRow[] {
  return users.map((u) => ({
    username: u.username,
    tier,
    focus,
  }));
}

function rowsToTs(rows: QualityAccountRow[]): string {
  return rows
    .map(
      (r) =>
        `  { username: "${r.username}", tier: "${r.tier}", focus: ["${r.focus[0]}", "${r.focus[1]}"] },`,
    )
    .join("\n");
}

export function replaceArrayBlock(
  source: string,
  constName: string,
  exportKeyword: "export const" | "const",
  replacementRows: string,
): string {
  const startToken = `${exportKeyword} ${constName}: QualityAccount[] = [`;
  const start = source.indexOf(startToken);
  if (start < 0) {
    throw new Error(`Could not replace array block: ${constName}`);
  }
  const bodyStart = start + startToken.length;
  const end = source.indexOf("\n];", bodyStart);
  if (end < 0) {
    throw new Error(`Could not find end of array block: ${constName}`);
  }
  const before = source.slice(0, bodyStart);
  const after = source.slice(end);
  return `${before}\n${replacementRows}${after}`;
}

export function getWeeklySkipInfo(
  state: SyncState,
  nowMs = Date.now(),
): { skip: boolean; nextEligibleAt?: string; daysLeft?: number } {
  const last = state.lastRunAt ? Date.parse(state.lastRunAt) : Number.NaN;
  if (Number.isNaN(last)) return { skip: false };
  if (nowMs - last >= WEEK_MS) return { skip: false };
  const nextEligibleMs = last + WEEK_MS;
  return {
    skip: true,
    nextEligibleAt: new Date(nextEligibleMs).toISOString(),
    daysLeft: Math.ceil((nextEligibleMs - nowMs) / (24 * 60 * 60 * 1000)),
  };
}

async function fetchFollowing(org: string, token: string): Promise<FollowUser[]> {
  const client = new XClientService({ bearerToken: token });
  const user = await client.getUserByUsername(org);
  if (!user) throw new Error(`User not found: @${org}`);

  const all: FollowUser[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.getUserFollowing(user.id, {
      maxResults: 1000,
      paginationToken: nextToken,
    });
    for (const u of page.users) {
      all.push({
        username: u.username,
        followers: u.metrics?.followersCount ?? 0,
      });
    }
    nextToken = page.nextToken;
  } while (nextToken);

  const deduped = uniqueByUsername(all);
  deduped.sort((a, b) => b.followers - a.followers);
  return deduped;
}

async function main(): Promise<void> {
  loadEnv();
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) {
    throw new Error("X_BEARER_TOKEN not set. Add it to .env.");
  }

  if (options.weekly && !options.force) {
    const skip = getWeeklySkipInfo(readSyncState(), Date.now());
    if (skip.skip) {
      console.log(
        `sync-quality-accounts: weekly guard active; skipping (next eligible: ${skip.nextEligibleAt}, ~${skip.daysLeft} day(s)). Use --force to override.`,
      );
      return;
    }
  }

  const following = await fetchFollowing(options.org, token);
  const used = new Set<string>();

  const whales = following
    .filter((u) => u.followers >= options.whaleMin)
    .slice(0, options.whaleMax)
    .filter((u) => {
      const key = u.username.toLowerCase();
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });

  const alphas = following
    .filter(
      (u) => u.followers >= options.alphaMin && u.followers < options.whaleMin,
    )
    .slice(0, options.alphaMax)
    .filter((u) => {
      const key = u.username.toLowerCase();
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });

  const data = pickDataAccounts(following, used, options.dataMax);

  const whaleRows = toRows(whales, "whale", ["macro", "trading"]);
  const alphaRows = toRows(alphas, "alpha", ["trading", "research"]);
  const dataRows = toRows(data, "quality", ["data", "news"]);
  const orgRows = toRows(
    following,
    "quality",
    ["curated", "org_following"],
  );

  const whaleTs = rowsToTs(whaleRows);
  const alphaTs = rowsToTs(alphaRows);
  const dataTs = rowsToTs(dataRows);
  const orgTs = rowsToTs(orgRows);

  const xResearchBefore = readFileSync(X_RESEARCH_FILE, "utf-8");
  let xResearchAfter = xResearchBefore;
  xResearchAfter = replaceArrayBlock(
    xResearchAfter,
    "WHALE_ACCOUNTS",
    "export const",
    whaleTs,
  );
  xResearchAfter = replaceArrayBlock(
    xResearchAfter,
    "ALPHA_ACCOUNTS",
    "export const",
    alphaTs,
  );
  xResearchAfter = replaceArrayBlock(
    xResearchAfter,
    "DATA_ACCOUNTS",
    "export const",
    dataTs,
  );
  xResearchAfter = replaceArrayBlock(
    xResearchAfter,
    "ORG_FOLLOWING_ACCOUNTS",
    "export const",
    orgTs,
  );

  const vinceBefore = readFileSync(VINCE_FILE, "utf-8");
  let vinceAfter = vinceBefore;
  vinceAfter = replaceArrayBlock(vinceAfter, "WHALE_ACCOUNTS", "const", whaleTs);
  vinceAfter = replaceArrayBlock(vinceAfter, "ALPHA_ACCOUNTS", "const", alphaTs);
  vinceAfter = replaceArrayBlock(vinceAfter, "DATA_ACCOUNTS", "const", dataTs);

  console.log(
    `sync-quality-accounts: @${options.org} following=${following.length} whales=${whaleRows.length} alphas=${alphaRows.length} data=${dataRows.length}`,
  );

  if (options.dryRun) {
    console.log("sync-quality-accounts: dry run complete (no files written).");
    return;
  }

  writeFileSync(X_RESEARCH_FILE, xResearchAfter, "utf-8");
  writeFileSync(VINCE_FILE, vinceAfter, "utf-8");
  writeSyncState({
    lastRunAt: new Date().toISOString(),
    lastOrg: options.org,
    lastFollowingCount: following.length,
  });
  console.log("sync-quality-accounts: wrote both qualityAccounts.ts files.");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      "sync-quality-accounts:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}

