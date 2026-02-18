/**
 * VINCE Paper Ops Task (deterministic)
 *
 * Runs on an interval (default 15 min) to:
 * - Check portfolio/positions consistency
 * - Write ops summary to .elizadb/vince-paper-bot/ops_summary.txt
 * - Optionally post one-line status to channels with "ops" or "sentinel" in name
 *
 * No LLM; health and reconciliation only. See docs/TRADING_RUNTIME_CONTRACT.md CRON_CONTEXT.
 * Set VINCE_PAPER_OPS_INTERVAL_MS to override (default 900000 = 15 min). Disable with VINCE_PAPER_OPS_ENABLED=false.
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

const DEFAULT_OPS_INTERVAL_MS = 15 * 60 * 1000; // 15 min

export async function registerPaperOpsTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_PAPER_OPS_ENABLED !== "false" &&
    process.env.VINCE_PAPER_OPS_ENABLED !== "0";
  if (!enabled) {
    logger.debug("[VincePaperOps] Task disabled (VINCE_PAPER_OPS_ENABLED=false)");
    return;
  }

  const intervalMs =
    parseInt(process.env.VINCE_PAPER_OPS_INTERVAL_MS ?? "", 10) ||
    DEFAULT_OPS_INTERVAL_MS;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "VINCE_PAPER_OPS",
    validate: async () => true,
    execute: async (rt) => {
      const positionManager = rt.getService("VINCE_POSITION_MANAGER_SERVICE") as
        | { getOpenPositions(): unknown[]; getPortfolio(): { totalValue: number } }
        | null;
      if (!positionManager) {
        logger.debug("[VincePaperOps] Position manager not available, skip");
        return;
      }

      const openPositions = positionManager.getOpenPositions();
      const portfolio = positionManager.getPortfolio();
      const now = new Date();
      const ts = now.toISOString();

      // Consistency: compare in-memory state with disk if positions.json exists
      let consistencyNote = "ok";
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);
      const positionsPath = path.join(persistDir, "positions.json");
      if (fs.existsSync(positionsPath)) {
        try {
          const raw = fs.readFileSync(positionsPath, "utf-8");
          const data = JSON.parse(raw) as { positions?: unknown[] };
          const onDisk = Array.isArray(data.positions) ? data.positions.length : 0;
          const inMemory = openPositions.length;
          if (onDisk !== inMemory) {
            consistencyNote = `mismatch: disk=${onDisk} inMemory=${inMemory}`;
          }
        } catch (e) {
          consistencyNote = `read_error: ${(e as Error).message}`;
        }
      }

      const summaryLines = [
        `# VINCE Paper Ops Summary`,
        `Updated: ${ts}`,
        ``,
        `Open positions: ${openPositions.length}`,
        `Portfolio totalValue: ${portfolio.totalValue.toFixed(2)}`,
        `Consistency: ${consistencyNote}`,
      ];

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }
      const summaryPath = path.join(persistDir, "ops_summary.txt");
      fs.writeFileSync(summaryPath, summaryLines.join("\n") + "\n", "utf-8");
      logger.debug(`[VincePaperOps] Wrote ${summaryPath}`);

      // Optional: one-line push to ops/sentinel channels
      const notif = rt.getService("VINCE_NOTIFICATION_SERVICE") as
        | {
            push?: (
              text: string,
              opts?: { roomNameContains?: string },
            ) => Promise<number>;
          }
        | null;
      if (notif?.push) {
        const oneLine = `[Paper Ops] ${openPositions.length} open · $${portfolio.totalValue.toFixed(0)} · ${consistencyNote}`;
        const sent = await notif.push(oneLine, {
          roomNameContains: "ops",
        });
        if (sent === 0) {
          await notif.push(oneLine, { roomNameContains: "sentinel" });
        }
      }
    },
  });

  await runtime.createTask({
    name: "VINCE_PAPER_OPS",
    description:
      "Deterministic paper trading ops: consistency check, ops summary, optional status push",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "paper-ops", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  logger.info(
    `[VincePaperOps] Task registered (interval ${intervalMs / 60_000} min, ops_summary.txt + optional push)`,
  );
}
