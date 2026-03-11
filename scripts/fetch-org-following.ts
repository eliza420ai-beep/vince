/**
 * Fetch @ikigaistudioxyz following list via X API and output ORG_FOLLOWING_ACCOUNTS entries.
 *
 * Usage (from repo root):
 *   bun run scripts/fetch-org-following.ts
 *
 * Requires X_BEARER_TOKEN in .env. Pay-as-you-go X API supports the follows endpoint.
 * Paste the printed lines into ORG_FOLLOWING_ACCOUNTS in:
 *   src/plugins/plugin-x-research/src/constants/qualityAccounts.ts
 *
 * Options:
 *   --watchlist   Also print watchlist.json entries (for skills/x-research/data/watchlist.json)
 *   --tiers       Print follower-based WHALE/ALPHA/DATA suggestions
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { XClientService } from "../src/plugins/plugin-x-research/src/services/xClient.service";

const ORG_USERNAME = "ikigaistudioxyz";

function loadEnv(): void {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        )
          val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) {
    console.error("fetch-org-following: X_BEARER_TOKEN not set. Add to .env and run from repo root.");
    process.exit(1);
  }

  const wantWatchlist = process.argv.includes("--watchlist");
  const wantTiers = process.argv.includes("--tiers");
  const client = new XClientService({ bearerToken: token });

  const user = await client.getUserByUsername(ORG_USERNAME);
  if (!user) {
    console.error("fetch-org-following: user @" + ORG_USERNAME + " not found.");
    process.exit(1);
  }

  const allUsers: Array<{
    username: string;
    followers: number;
    verified: boolean;
  }> = [];
  let nextToken: string | undefined;
  do {
    const page = await client.getUserFollowing(user.id, {
      maxResults: 1000,
      paginationToken: nextToken,
    });
    for (const u of page.users) {
      allUsers.push({
        username: u.username,
        followers: u.metrics?.followersCount ?? 0,
        verified: Boolean(u.verified),
      });
    }
    nextToken = page.nextToken;
  } while (nextToken);

  console.error("fetch-org-following: @" + ORG_USERNAME + " follows", allUsers.length, "accounts.\n");

  console.log("// Paste into ORG_FOLLOWING_ACCOUNTS in qualityAccounts.ts:");
  for (const u of allUsers) {
    console.log(
      '  { username: "' + u.username + '", tier: "quality", focus: ["curated", "org_following"] },'
    );
  }

  if (wantTiers) {
    const rank = [...allUsers].sort((a, b) => b.followers - a.followers);
    const whales = rank.filter((u) => u.followers >= 1_000_000);
    const alphas = rank.filter(
      (u) => u.followers >= 100_000 && u.followers < 1_000_000,
    );
    const dataHints = [
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
    ];
    const data = rank.filter((u) => {
      const id = u.username.toLowerCase();
      return dataHints.some((k) => id.includes(k));
    });
    const used = new Set<string>();
    const keepUnique = (list: typeof rank): typeof rank =>
      list.filter((u) => {
        const key = u.username.toLowerCase();
        if (used.has(key)) return false;
        used.add(key);
        return true;
      });
    const whaleUnique = keepUnique(whales);
    const alphaUnique = keepUnique(alphas);
    const dataUnique = keepUnique(data).slice(0, 15);

    console.log("\n// Followers-based tier suggestions");
    console.log("// WHALE_ACCOUNTS (followers >= 1,000,000)");
    for (const u of whaleUnique) {
      console.log(
        '  { username: "' +
          u.username +
          '", tier: "whale", focus: ["macro", "trading"] },'
      );
    }
    console.log(
      "\n// ALPHA_ACCOUNTS (followers 100,000 to 999,999, excluding whales)"
    );
    for (const u of alphaUnique) {
      console.log(
        '  { username: "' +
          u.username +
          '", tier: "alpha", focus: ["trading", "research"] },'
      );
    }
    console.log("\n// DATA_ACCOUNTS (data/news handle hints, excluding whale/alpha)");
    for (const u of dataUnique) {
      console.log(
        '  { username: "' +
          u.username +
          '", tier: "quality", focus: ["data", "news"] },'
      );
    }
  }

  if (wantWatchlist) {
    console.log("\n// Optional: watchlist.json entries (accounts array):");
    const now = new Date().toISOString();
    for (const u of allUsers) {
      console.log(
        '  { "username": "' + u.username + '", "note": "org following", "addedAt": "' + now + '" },'
      );
    }
  }
}

main().catch((e) => {
  console.error("fetch-org-following:", e instanceof Error ? e.message : e);
  process.exit(1);
});
