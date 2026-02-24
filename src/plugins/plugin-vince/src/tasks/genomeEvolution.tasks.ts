/**
 * Genome Evolution Weekly Task (#23)
 *
 * Every 7 days: run one evolution cycle — mutate, replay, promote.
 * Reports results to ops channels.
 */

import { type IAgentRuntime, type Task, logger } from "@elizaos/core";
import type { UUID } from "@elizaos/core";
import type { VinceGenomeService } from "../services/vinceGenome.service";

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_NAME = "VINCE_GENOME_EVOLUTION";

export async function registerGenomeEvolutionTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.VINCE_GENOME_ENABLED !== "false";
  if (!enabled) {
    logger.debug("[Genome] Evolution task disabled");
    return;
  }

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options: unknown, task: Task) => {
      try {
        const svc = rt.getService<VinceGenomeService>("VINCE_GENOME_SERVICE");
        if (!svc) {
          logger.warn("[Genome] Service not available, skipping");
          return;
        }

        const result = await svc.evolve();

        const top = result.topCandidates.slice(0, 3);
        const summary = [
          `**Genome Evolution — Gen ${result.generation}**`,
          `Candidates: ${result.candidateCount}`,
          `Current fitness: ${result.currentFitness.toFixed(3)}`,
          `Best fitness: ${result.bestFitness.toFixed(3)}`,
          result.promoted
            ? `✅ Promoted: ${result.promotedGenomeId}`
            : `⏸ No promotion (threshold not met)`,
          ``,
          `**Top 3:**`,
          ...top.map(
            (c, i) =>
              `${i + 1}. ${c.genomeId} — fitness ${c.fitness.toFixed(3)}, WR ${c.winRate.toFixed(1)}%, Sharpe ${c.sharpe.toFixed(2)}`,
          ),
        ].join("\n");

        logger.info(`[Genome] ${summary}`);

        // Push to ops channels
        await pushToOpsChannels(rt, summary);

        if (task.id) {
          await rt.updateTask(task.id, {
            metadata: { ...task.metadata, updatedAt: Date.now() },
          });
        }
      } catch (e) {
        logger.error(`[Genome] Evolution task failed: ${e}`);
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: TASK_NAME,
        description:
          "Weekly genome evolution: mutate params, replay against history, promote best",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["vince", "genome", "evolution", "repeat"],
        metadata: {
          updateInterval: WEEKLY_MS,
          updatedAt: Date.now(),
        },
      })
      .then(() => logger.info("[Genome] Evolution task registered"))
      .catch((e) => logger.warn(`[Genome] createTask failed: ${e}`));
  });
}

async function pushToOpsChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<void> {
  try {
    const rooms = await runtime.getRooms(runtime.agentId as UUID);
    for (const room of rooms) {
      const name = (room.name ?? "").toLowerCase();
      if (name.includes("ops") || name.includes("trading")) {
        await runtime.createMemory(
          {
            entityId: runtime.agentId as UUID,
            agentId: runtime.agentId as UUID,
            roomId: room.id as UUID,
            content: { text: message },
          },
          "messages",
        );
      }
    }
  } catch {
    // Non-critical
  }
}
