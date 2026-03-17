/**
 * Low-data auto-remediation: when Forge gates fail due to insufficient
 * labeled/holdout data, run FD cache health check (optional prewarm), collect
 * paper-bot diagnostics, and push a structured alert to ops/forge/sentinel rooms.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, type TargetInfo, logger } from "@elizaos/core";
import {
  readFdCacheManifest,
  prewarmFdPortfolioHistoryCache,
} from "../../../plugin-vince/src/utils/fdPortfolioCachePrewarm.ts";

const REPO_ROOT = process.cwd();
const PAPER_OPS_SUMMARY_PATH = path.join(
  REPO_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "ops_summary.txt",
);

export interface LowDataRemediationContext {
  holdoutCount?: number;
  withOutcome?: number;
  reason: string;
}

/**
 * Run FD cache health check and optionally prewarm. Returns a one-line status.
 */
async function runFdCacheCheck(): Promise<{
  status: string;
  prewarmed?: boolean;
}> {
  const manifest = readFdCacheManifest(REPO_ROOT);
  if (!manifest) {
    try {
      await prewarmFdPortfolioHistoryCache({
        projectRoot: REPO_ROOT,
        force: false,
      });
      return { status: "missing_then_prewarmed", prewarmed: true };
    } catch (e) {
      logger.debug(
        `[ForgeRemediation] FD prewarm failed: ${(e as Error).message}`,
      );
      return { status: "missing_prewarm_failed" };
    }
  }
  const generatedAt = manifest.generatedAt
    ? new Date(manifest.generatedAt).getTime()
    : 0;
  const stale = Date.now() - generatedAt > 7 * 24 * 60 * 60 * 1000;
  if (stale) {
    try {
      await prewarmFdPortfolioHistoryCache({
        projectRoot: REPO_ROOT,
        force: true,
      });
      return { status: "stale_refreshed", prewarmed: true };
    } catch (e) {
      logger.debug(
        `[ForgeRemediation] FD refresh failed: ${(e as Error).message}`,
      );
      return { status: "stale_refresh_failed" };
    }
  }
  return {
    status: "ok",
    prewarmed: false,
  };
}

/**
 * Collect paper-bot activity diagnostics (from ops_summary.txt or runtime).
 */
function getPaperDiagnostics(runtime: IAgentRuntime): string {
  if (fs.existsSync(PAPER_OPS_SUMMARY_PATH)) {
    try {
      const raw = fs.readFileSync(PAPER_OPS_SUMMARY_PATH, "utf-8");
      const lines = raw
        .split("\n")
        .filter((l) => l.trim())
        .slice(0, 6);
      return lines.join(" · ");
    } catch {
      return "Paper ops summary unreadable";
    }
  }
  const positionManager = runtime.getService(
    "VINCE_POSITION_MANAGER_SERVICE",
  ) as {
    getOpenPositions?: () => unknown[];
    getPortfolio?: () => { totalValue: number };
  } | null;
  if (positionManager) {
    const positions = positionManager.getOpenPositions?.() ?? [];
    const portfolio = positionManager.getPortfolio?.();
    const total = portfolio?.totalValue ?? 0;
    return `Paper: ${positions.length} open positions, $${total.toFixed(0)} total`;
  }
  return "Paper bot services not available";
}

function shouldTargetRoom(name: string, includeSentinel: boolean): boolean {
  const n = (name ?? "").toLowerCase();
  if (n.includes("forge") || n.includes("ops")) return true;
  if (includeSentinel && n.includes("sentinel")) return true;
  return false;
}

/**
 * Push insufficient-data alert to rooms named "ops" or "forge"; if none, try "sentinel".
 */
export async function runLowDataRemediation(
  runtime: IAgentRuntime,
  context: LowDataRemediationContext,
): Promise<void> {
  const { holdoutCount, withOutcome, reason } = context;

  const fdResult = await runFdCacheCheck();
  const paperDiag = getPaperDiagnostics(runtime);

  const alertLines = [
    "[Forge] Insufficient data — auto-remediation",
    `Reason: ${reason}`,
    holdoutCount != null ? `Holdout: ${holdoutCount} (need ≥30)` : "",
    withOutcome != null
      ? `Triggered with outcomes: ${withOutcome} (need ≥5)`
      : "",
    `FD cache: ${fdResult.status}${fdResult.prewarmed ? " (prewarmed)" : ""}`,
    `Paper: ${paperDiag}`,
  ].filter(Boolean);

  const message = alertLines.join(" · ");
  let sent = 0;
  const worlds = await runtime.getAllWorlds();
  for (const world of worlds) {
    const rooms = await runtime.getRooms(world.id);
    for (const room of rooms) {
      const source = (room.source ?? "").toLowerCase();
      if (!["telegram", "discord", "slack"].includes(source)) continue;
      if (!shouldTargetRoom(room.name ?? "", false)) continue;
      try {
        await runtime.sendMessageToTarget(
          {
            source: source as "telegram" | "discord" | "slack",
            roomId: room.id,
          } as unknown as TargetInfo,
          { text: message },
        );
        sent++;
      } catch {
        // ignore per-room
      }
    }
  }
  if (sent === 0) {
    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        const source = (room.source ?? "").toLowerCase();
        if (!["telegram", "discord", "slack"].includes(source)) continue;
        if (!shouldTargetRoom(room.name ?? "", true)) continue;
        try {
          await runtime.sendMessageToTarget(
            {
              source: source as "telegram" | "discord" | "slack",
              roomId: room.id,
            } as unknown as TargetInfo,
            { text: message },
          );
          sent++;
        } catch {
          // ignore
        }
      }
    }
  }
  logger.info(
    `[ForgeRemediation] Low-data alert sent to ${sent} room(s). FD: ${fdResult.status} · ${paperDiag.slice(0, 60)}`,
  );
}
