/**
 * HIP-3 Discovery Task
 *
 * Runs on a schedule to:
 * - Call VinceHIP3Service.discoverHIP3Candidates() (scan all DEXes, volume >= MIN)
 * - Persist candidates to docs/standup/hip3-candidates.json
 * - Auto-add new candidates to targetAssets.ts (HIP3_STOCKS/COMMODITIES/INDICES + DEX_MAPPING)
 *
 * Set HIP3_DISCOVERY_ENABLED=false to disable. Set HIP3_DISCOVERY_INTERVAL_MS (default 24h).
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type { HIP3DiscoveryCandidate } from "../services/hip3.service";
import {
  HIP3_ASSETS,
  HIP3_DEX_MAPPING,
  HIP3_STOCKS,
  HIP3_COMMODITIES,
  HIP3_INDICES,
} from "../constants/targetAssets";

const DEFAULT_DISCOVERY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const CANDIDATES_PATH = "docs/standup/hip3-candidates.json";
const TARGET_ASSETS_PATH =
  "src/plugins/plugin-vince/src/constants/targetAssets.ts";

type HIP3Dex = "xyz" | "flx" | "vntl" | "km";

function getCategory(dex: string): "stocks" | "commodities" | "indices" {
  if (dex === "xyz") return "stocks";
  if (dex === "flx") return "commodities";
  return "indices"; // vntl, km
}

function alreadyInTargetAssets(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return (
    (HIP3_ASSETS as readonly string[]).includes(upper) ||
    (HIP3_DEX_MAPPING as Record<string, string>)[upper] != null
  );
}

/**
 * Apply new candidates to targetAssets.ts: add to the right array and to HIP3_DEX_MAPPING.
 * Edits the file in place. Caller should run from repo root (process.cwd()).
 */
function applyCandidatesToTargetAssets(
  candidates: HIP3DiscoveryCandidate[],
  targetPath: string,
): { applied: string[]; skipped: string[] } {
  const applied: string[] = [];
  const skipped: string[] = [];
  const toApply = candidates.filter((c) => {
    if (alreadyInTargetAssets(c.symbol)) {
      skipped.push(c.symbol);
      return false;
    }
    return true;
  });
  if (toApply.length === 0) return { applied, skipped };

  let content = fs.readFileSync(targetPath, "utf-8");

  const byCategory = {
    stocks: toApply.filter((c) => getCategory(c.dex) === "stocks"),
    commodities: toApply.filter((c) => getCategory(c.dex) === "commodities"),
    indices: toApply.filter((c) => getCategory(c.dex) === "indices"),
  };

  // Add to HIP3_STOCKS (quoted entries)
  if (byCategory.stocks.length > 0) {
    const lastStock = (HIP3_STOCKS as readonly string[])[
      (HIP3_STOCKS as readonly string[]).length - 1
    ];
    const newStocks = byCategory.stocks
      .map((c) => `  "${c.symbol}",`)
      .join("\n");
    const search = `  "${lastStock}",\n] as const;\nexport type HIP3Stock`;
    const replace = `  "${lastStock}",\n${newStocks}\n] as const;\nexport type HIP3Stock`;
    if (content.includes(search)) {
      content = content.replace(search, replace);
      byCategory.stocks.forEach((c) => applied.push(c.symbol));
    }
  }

  // Add to HIP3_COMMODITIES (quoted)
  if (byCategory.commodities.length > 0) {
    const lastComm = (HIP3_COMMODITIES as readonly string[])[
      (HIP3_COMMODITIES as readonly string[]).length - 1
    ];
    const newC = byCategory.commodities
      .map((c) => `  "${c.symbol}",`)
      .join("\n");
    const search = `  "${lastComm}",\n] as const;\nexport type HIP3Commodity`;
    const replace = `  "${lastComm}",\n${newC}\n] as const;\nexport type HIP3Commodity`;
    if (content.includes(search)) {
      content = content.replace(search, replace);
      byCategory.commodities.forEach((c) => applied.push(c.symbol));
    }
  }

  // Add to HIP3_INDICES (quoted)
  if (byCategory.indices.length > 0) {
    const lastIdx = (HIP3_INDICES as readonly string[])[
      (HIP3_INDICES as readonly string[]).length - 1
    ];
    const newI = byCategory.indices.map((c) => `  "${c.symbol}",`).join("\n");
    const search = `  "${lastIdx}",\n] as const;\nexport type HIP3Index`;
    const replace = `  "${lastIdx}",\n${newI}\n] as const;\nexport type HIP3Index`;
    if (content.includes(search)) {
      content = content.replace(search, replace);
      byCategory.indices.forEach((c) => applied.push(c.symbol));
    }
  }

  // Add to HIP3_DEX_MAPPING: one batch per dex section
  const byDex = {
    xyz: toApply.filter((c) => c.dex === "xyz"),
    flx: toApply.filter((c) => c.dex === "flx"),
    vntl: toApply.filter((c) => c.dex === "vntl"),
    km: toApply.filter((c) => c.dex === "km"),
  };
  if (byDex.xyz.length > 0) {
    const lines = byDex.xyz.map((c) => `  ${c.symbol}: "xyz",`).join("\n");
    const anchor = '  MU: "xyz",\n  XYZ100: "xyz",';
    if (content.includes(anchor)) {
      content = content.replace(
        anchor,
        `  MU: "xyz",\n${lines}\n  XYZ100: "xyz",`,
      );
    }
  }
  if (byDex.flx.length > 0) {
    const lines = byDex.flx.map((c) => `  ${c.symbol}: "flx",`).join("\n");
    const anchor = '  NATGAS: "flx",\n\n  // vntl';
    if (content.includes(anchor)) {
      content = content.replace(
        anchor,
        `  NATGAS: "flx",\n${lines}\n\n  // vntl`,
      );
    }
  }
  if (byDex.vntl.length > 0) {
    const lines = byDex.vntl.map((c) => `  ${c.symbol}: "vntl",`).join("\n");
    const anchor = '  AMD: "vntl",\n\n  // km';
    if (content.includes(anchor)) {
      content = content.replace(anchor, `  AMD: "vntl",\n${lines}\n\n  // km`);
    }
  }
  if (byDex.km.length > 0) {
    const lines = byDex.km.map((c) => `  ${c.symbol}: "km",`).join("\n");
    const anchor = '  USOIL: "km",\n};';
    if (content.includes(anchor)) {
      content = content.replace(anchor, `  USOIL: "km",\n${lines}\n};`);
    }
  }

  fs.writeFileSync(targetPath, content, "utf-8");
  return { applied, skipped };
}

export async function registerHIP3DiscoveryTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.HIP3_DISCOVERY_ENABLED !== "false" &&
    process.env.HIP3_DISCOVERY_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[HIP3Discovery] Task disabled (HIP3_DISCOVERY_ENABLED=false)",
    );
    return;
  }

  const intervalMs =
    parseInt(process.env.HIP3_DISCOVERY_INTERVAL_MS ?? "", 10) ||
    DEFAULT_DISCOVERY_INTERVAL_MS;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "HIP3_DISCOVER_AND_APPLY",
    validate: async () => true,
    execute: async (rt) => {
      const hip3 = rt.getService("VINCE_HIP3_SERVICE") as {
        discoverHIP3Candidates(): Promise<HIP3DiscoveryCandidate[]>;
      } | null;
      if (!hip3?.discoverHIP3Candidates) {
        logger.warn("[HIP3Discovery] VinceHIP3Service not available, skip");
        return;
      }

      try {
        const candidates = await hip3.discoverHIP3Candidates();
        const cwd = process.cwd();
        const candidatesFullPath = path.join(cwd, CANDIDATES_PATH);
        const targetPath = path.join(cwd, TARGET_ASSETS_PATH);

        const payload = {
          timestamp: new Date().toISOString(),
          count: candidates.length,
          candidates,
        };
        const dir = path.dirname(candidatesFullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
          candidatesFullPath,
          JSON.stringify(payload, null, 2),
          "utf-8",
        );
        logger.info(
          `[HIP3Discovery] Persisted ${candidates.length} candidates to ${CANDIDATES_PATH}`,
        );

        if (candidates.length > 0 && fs.existsSync(targetPath)) {
          const { applied, skipped } = applyCandidatesToTargetAssets(
            candidates,
            targetPath,
          );
          if (applied.length > 0) {
            logger.info(
              `[HIP3Discovery] Added to targetAssets.ts: ${applied.join(", ")}`,
            );
          }
          if (skipped.length > 0) {
            logger.debug(
              `[HIP3Discovery] Already in targetAssets, skipped: ${skipped.join(", ")}`,
            );
          }
        }
      } catch (e) {
        logger.error(
          `[HIP3Discovery] Error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    },
  });

  await runtime.createTask({
    name: "HIP3_DISCOVER_AND_APPLY",
    description:
      "Discover new HIP-3 assets by volume, persist candidates, and add new ones to targetAssets.ts",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["hip3", "discovery", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  logger.info(
    `[HIP3Discovery] Task registered (interval ${intervalMs / 3600_000}h, persist + apply to targetAssets)`,
  );
}
