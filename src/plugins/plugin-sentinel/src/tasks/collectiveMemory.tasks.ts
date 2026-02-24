/**
 * Agent Collective Memory Task (#28)
 *
 * Weekly Sentinel task: collect learnings from every agent,
 * synthesize into a Weekly Intelligence Brief (500 words max),
 * store in knowledge/teammate/weekly-briefs/YYYY-WW.md.
 */

import {
  type IAgentRuntime,
  type Task,
  logger,
  ModelType,
} from "@elizaos/core";
import type { UUID } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_NAME = "SENTINEL_COLLECTIVE_MEMORY";
const BRIEFS_DIR = "knowledge/teammate/weekly-briefs";

interface AgentLearning {
  agent: string;
  reply: string;
}

function getElizaOS(runtime: IAgentRuntime): any {
  return (runtime as any).elizaOS ?? null;
}

async function askAgent(
  runtime: IAgentRuntime,
  agentName: string,
  question: string,
  timeoutMs = 25000,
): Promise<string> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents) return "";

  const agents = await eliza.getAgents();
  const target = agents?.find(
    (a: any) =>
      (a.character?.name ?? "").toUpperCase() === agentName.toUpperCase(),
  );
  if (!target) return "";

  return new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve(""), timeoutMs);
    try {
      eliza.handleMessage(
        target.agentId,
        {
          id: crypto.randomUUID(),
          entityId: runtime.agentId,
          roomId: target.agentId,
          content: {
            text: `[To ${agentName} — weekly brief collection] ${question}`,
            source: "sentinel_collective_memory",
          },
          createdAt: Date.now(),
        },
        {
          onResponse: (resp: any) => {
            clearTimeout(timer);
            resolve(resp?.content?.text ?? resp?.text ?? "");
          },
          onComplete: () => {},
          onError: () => {
            clearTimeout(timer);
            resolve("");
          },
        },
      );
    } catch {
      clearTimeout(timer);
      resolve("");
    }
  });
}

export async function registerCollectiveMemoryTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SENTINEL_COLLECTIVE_MEMORY_ENABLED !== "false";
  if (!enabled) {
    logger.debug("[CollectiveMemory] Task disabled");
    return;
  }

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options: unknown, task: Task) => {
      try {
        logger.info("[CollectiveMemory] Collecting agent learnings...");

        const questions: Record<string, string> = {
          VINCE:
            "Weekly brief: top 3 trading patterns, source performance changes, any counterfactual insights. 2-3 sentences max.",
          ECHO: "Weekly brief: sentiment accuracy this week, best/worst accounts for alpha, notable CT shifts. 2-3 sentences max.",
          ORACLE:
            "Weekly brief: prediction record, notable market odds changes, regime assessment. 2-3 sentences max.",
          SOLUS:
            "Weekly brief: premium income, strike accuracy, notable IV/DVOL changes. 2-3 sentences max.",
          ELIZA:
            "Weekly brief: content performance (views, engagement), knowledge gaps identified, uploads count. 2-3 sentences max.",
          OTAKU:
            "Weekly brief: execution quality, any slippage issues, portfolio health. 2-3 sentences max.",
          KELLY:
            "Weekly brief: user engagement patterns, $100K pace status, any lifestyle highlights. 2-3 sentences max.",
        };

        const learnings: AgentLearning[] = [];
        const agentNames = Object.keys(questions);

        // Query in parallel batches of 3 to avoid overwhelming the system
        for (let i = 0; i < agentNames.length; i += 3) {
          const batch = agentNames.slice(i, i + 3);
          const replies = await Promise.all(
            batch.map((name) => askAgent(rt, name, questions[name])),
          );
          for (let j = 0; j < batch.length; j++) {
            if (replies[j]) {
              learnings.push({ agent: batch[j], reply: replies[j] });
            }
          }
        }

        if (learnings.length === 0) {
          logger.warn("[CollectiveMemory] No agent replies received");
          return;
        }

        // Synthesize into brief
        const agentInputs = learnings
          .map((l) => `**${l.agent}:** ${l.reply}`)
          .join("\n\n");

        const prompt = [
          "You are Sentinel, the CTO. Synthesize these agent learnings into a Weekly Intelligence Brief.",
          "Rules: 500 words max. Start with a one-line summary. Use bullet points. Be concrete — numbers, names, specific patterns.",
          "No AI slop. No filler. Every sentence must carry information.",
          "",
          "Agent inputs:",
          agentInputs,
          "",
          "Write the Weekly Intelligence Brief now.",
        ].join("\n");

        const brief = await rt.useModel(ModelType.TEXT_SMALL, {
          prompt,
          maxTokens: 800,
        });

        if (!brief || typeof brief !== "string") {
          logger.warn("[CollectiveMemory] LLM returned empty brief");
          return;
        }

        // Write to knowledge directory
        const now = new Date();
        const weekNum = getISOWeek(now);
        const year = now.getFullYear();
        const filename = `${year}-W${String(weekNum).padStart(2, "0")}.md`;

        const briefDir = path.join(process.cwd(), BRIEFS_DIR);
        if (!fs.existsSync(briefDir)) {
          fs.mkdirSync(briefDir, { recursive: true });
        }

        const content = [
          `# Weekly Intelligence Brief — ${year}-W${String(weekNum).padStart(2, "0")}`,
          ``,
          `*Generated: ${now.toISOString().slice(0, 10)}*`,
          ``,
          brief,
          ``,
          `---`,
          `*Sources: ${learnings.map((l) => l.agent).join(", ")}*`,
        ].join("\n");

        fs.writeFileSync(path.join(briefDir, filename), content);
        logger.info(
          `[CollectiveMemory] Brief saved: ${filename} (${learnings.length} agents)`,
        );

        // Push summary to ops channels
        const summaryLine =
          brief.split("\n").find((l) => l.trim().length > 10) ??
          "Brief generated.";
        await pushToOpsChannels(
          rt,
          `**Weekly Intelligence Brief (${year}-W${weekNum})**\n${summaryLine}\n\nFull brief: ${BRIEFS_DIR}/${filename}`,
        );

        if (task.id) {
          await rt.updateTask(task.id, {
            metadata: { ...task.metadata, updatedAt: Date.now() },
          });
        }
      } catch (e) {
        logger.error(`[CollectiveMemory] Task failed: ${e}`);
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: TASK_NAME,
        description:
          "Weekly: collect learnings from all agents, synthesize into shared intelligence brief",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["sentinel", "collective_memory", "repeat"],
        metadata: {
          updateInterval: WEEKLY_MS,
          updatedAt: Date.now(),
        },
      })
      .then(() => logger.info("[CollectiveMemory] Weekly task registered"))
      .catch((e) => logger.warn(`[CollectiveMemory] createTask failed: ${e}`));
  });
}

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

async function pushToOpsChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<void> {
  try {
    const rooms = await runtime.getRooms(runtime.agentId as UUID);
    for (const room of rooms) {
      const name = (room.name ?? "").toLowerCase();
      if (name.includes("sentinel") || name.includes("ops")) {
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
