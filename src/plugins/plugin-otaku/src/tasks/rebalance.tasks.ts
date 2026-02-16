/**
 * Autonomous portfolio rebalance – Task worker and registration.
 * User-defined target allocation; scheduled drift check via Task system.
 * Does not auto-execute swaps; reports drift and suggests rebalancing.
 */

import type { IAgentRuntime, Task, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { OtakuService } from "../services/otaku.service";
import type { Position } from "../services/otaku.service";

export const OTAKU_REBALANCE_TASK_NAME = "OTAKU_REBALANCE_CHECK";

const REBALANCE_RULES_CACHE_PREFIX = "otaku:rebalance:rules:";

export interface RebalanceTargets {
  [token: string]: number; // e.g. { USDC: 60, ETH: 30, other: 10 }
}

export function getRebalanceRulesCacheKey(roomId: UUID): string {
  return `${REBALANCE_RULES_CACHE_PREFIX}${roomId}`;
}

export function registerOtakuRebalanceTaskWorker(runtime: IAgentRuntime): void {
  runtime.registerTaskWorker({
    name: OTAKU_REBALANCE_TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options: Record<string, unknown>, task: Task) => {
      const roomId = task.roomId;
      if (!roomId) return;

      const metadata = task.metadata ?? {};
      const targets = metadata.targets as RebalanceTargets | undefined;
      const intervalDays = (metadata.intervalDays as number) ?? 7;

      if (!targets || Object.keys(targets).length === 0) {
        logger.debug("[OtakuRebalance] No targets in task metadata; skipping.");
        return;
      }

      const otaku = rt.getService("otaku") as OtakuService | null;
      if (!otaku?.getPositions) {
        logger.debug("[OtakuRebalance] Otaku or getPositions not available.");
        return;
      }

      try {
        const { positions } = await otaku.getPositions();
        const totalUsd = positions.reduce(
          (sum, p) =>
            sum +
            (typeof p.usdValue === "string" ? parseFloat(p.usdValue) : p.usdValue ?? 0),
          0
        );
        if (totalUsd <= 0) {
          await rt.createMemory(
            {
              entityId: rt.agentId!,
              agentId: rt.agentId!,
              roomId,
              content: {
                text: `[Otaku] Rebalance check: No position value yet. Target allocation: ${formatTargets(targets)}. Set positions to enable drift reporting.`,
              },
              createdAt: Date.now(),
            },
            "facts",
            true
          );
          return;
        }

        const current: Record<string, number> = {};
        for (const p of positions) {
          const v = typeof p.usdValue === "string" ? parseFloat(p.usdValue) : p.usdValue ?? 0;
          const token = (p.token ?? "other").toUpperCase();
          current[token] = (current[token] ?? 0) + v;
        }
        const currentPct: Record<string, number> = {};
        for (const [token, usd] of Object.entries(current)) {
          currentPct[token] = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
        }

        const driftLines: string[] = [];
        for (const [token, targetPct] of Object.entries(targets)) {
          const currentVal = currentPct[token] ?? currentPct["OTHER"] ?? 0;
          const drift = currentVal - targetPct;
          if (Math.abs(drift) >= 5) {
            driftLines.push(
              `${token}: current ${currentVal.toFixed(0)}% vs target ${targetPct}% (drift ${drift > 0 ? "+" : ""}${drift.toFixed(0)}%)`
            );
          }
        }

        const summary =
          driftLines.length > 0
            ? `Portfolio drift (rebalance every ${intervalDays}d): ${driftLines.join("; ")}. Consider rebalancing via swap or Morpho.`
            : `Portfolio within target allocation (rebalance every ${intervalDays}d). No action needed.`;

        await rt.createMemory(
          {
            entityId: rt.agentId!,
            agentId: rt.agentId!,
            roomId,
            content: { text: `[Otaku] ${summary}` },
            createdAt: Date.now(),
          },
          "facts",
          true
        );
        logger.info(`[OtakuRebalance] Stored drift fact for room ${roomId}`);
      } catch (err) {
        logger.warn(`[OtakuRebalance] Execute failed: ${err}`);
      }
    },
  });
}

function formatTargets(targets: RebalanceTargets): string {
  return Object.entries(targets)
    .map(([t, p]) => `${t} ${p}%`)
    .join(", ");
}
