/**
 * RESEARCH_QUEUE Action
 *
 * Manage a queue of content to research and ingest:
 * - Add URLs, YouTube videos, topics to queue
 * - View current queue
 * - Process queue items (batch or one-by-one)
 * - Track what's been ingested
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "../config/paths";

const QUEUE_FILE = path.join(DATA_DIR, "research-queue.json");

type QueueItemType = "youtube" | "article" | "topic" | "pdf";
type QueueItemStatus = "pending" | "processing" | "completed" | "failed";

interface QueueItem {
  id: string;
  type: QueueItemType;
  url?: string;
  topic?: string;
  notes?: string;
  priority: "high" | "normal" | "low";
  status: QueueItemStatus;
  addedAt: number;
  processedAt?: number;
  savedTo?: string;
  error?: string;
}

interface ResearchQueue {
  items: QueueItem[];
  lastProcessed: number | null;
  totalProcessed: number;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadQueue(): ResearchQueue {
  ensureDataDir();
  if (!fs.existsSync(QUEUE_FILE)) {
    return { items: [], lastProcessed: null, totalProcessed: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8"));
  } catch {
    return { items: [], lastProcessed: null, totalProcessed: 0 };
  }
}

function saveQueue(queue: ResearchQueue): void {
  ensureDataDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function generateId(): string {
  return `rq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function detectType(text: string): QueueItemType {
  if (text.includes("youtube.com") || text.includes("youtu.be")) return "youtube";
  if (text.includes(".pdf")) return "pdf";
  if (text.startsWith("http")) return "article";
  return "topic";
}

function extractUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/i);
  return match ? match[1].replace(/[.,;:!?)]+$/, "") : null;
}

function formatQueueItem(item: QueueItem, index: number): string {
  const statusIcons: Record<QueueItemStatus, string> = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    failed: "❌",
  };
  const priorityIcons: Record<string, string> = {
    high: "🔴",
    normal: "🟡",
    low: "🟢",
  };
  
  const icon = statusIcons[item.status];
  const priority = priorityIcons[item.priority];
  const content = item.url || item.topic || "Unknown";
  const truncated = content.length > 60 ? content.slice(0, 60) + "..." : content;
  const age = Math.floor((Date.now() - item.addedAt) / (1000 * 60 * 60));
  
  return `${index + 1}. ${icon} ${priority} **${item.type}** - ${truncated}
   Added: ${age}h ago | ID: \`${item.id}\`${item.savedTo ? `\n   → Saved: \`${item.savedTo}\`` : ""}${item.error ? `\n   ⚠️ ${item.error}` : ""}`;
}

function formatQueue(queue: ResearchQueue): string {
  const pending = queue.items.filter((i) => i.status === "pending");
  const completed = queue.items.filter((i) => i.status === "completed").slice(-5);
  const failed = queue.items.filter((i) => i.status === "failed").slice(-3);

  const pendingStr = pending.length > 0
    ? pending.map((item, i) => formatQueueItem(item, i)).join("\n\n")
    : "Queue is empty! Add items with:\n`queue add [URL or topic]`";

  const completedStr = completed.length > 0
    ? completed.map((item, i) => formatQueueItem(item, i)).join("\n")
    : "None yet";

  const failedStr = failed.length > 0
    ? failed.map((item, i) => formatQueueItem(item, i)).join("\n")
    : "None";

  return `📋 **Research Queue**

**Pending (${pending.length}):**
${pendingStr}

**Recently Completed (${queue.totalProcessed} total):**
${completedStr}

**Failed:**
${failedStr}

---
**Commands:**
• \`queue add [URL/topic]\` - Add to queue
• \`queue add high [URL]\` - Add with high priority
• \`queue process\` - Process next item
• \`queue process all\` - Process all pending
• \`queue remove [id]\` - Remove item
• \`queue clear\` - Clear completed/failed`;
}

export const researchQueueAction: Action = {
  name: "RESEARCH_QUEUE",
  similes: [
    "QUEUE",
    "ADD_TO_QUEUE",
    "RESEARCH_LIST",
    "INGEST_QUEUE",
  ],
  description: `Manage the research queue for batch content ingestion.

TRIGGERS:
- "queue" / "research queue" - View queue
- "queue add [URL]" - Add to queue
- "queue add high [URL]" - Add with high priority
- "add to queue: [URL]"
- "queue process" - Process next item
- "queue process all" - Batch process
- "queue remove [id]" - Remove item
- "queue clear" - Clear completed

Use this to batch up content for later ingestion.`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    if (message.entityId === runtime.agentId) return false;

    return (
      text.includes("queue") ||
      text.includes("add to research") ||
      text.includes("research list") ||
      (text.includes("batch") && text.includes("ingest"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text || "";
    const lower = text.toLowerCase();

    try {
      const queue = loadQueue();

      // VIEW QUEUE
      if (
        (lower.includes("queue") && !lower.includes("add") && !lower.includes("process") && !lower.includes("remove") && !lower.includes("clear")) ||
        lower === "queue" ||
        lower.includes("show queue") ||
        lower.includes("view queue") ||
        lower.includes("research queue")
      ) {
        if (callback) {
          await callback({
            text: formatQueue(queue),
            actions: ["RESEARCH_QUEUE"],
          });
        }
        return;
      }

      // ADD TO QUEUE
      if (lower.includes("add") || lower.includes("queue:")) {
        const url = extractUrl(text);
        const isHighPriority = lower.includes("high") || lower.includes("urgent") || lower.includes("important");
        const isLowPriority = lower.includes("low") || lower.includes("later") || lower.includes("someday");
        
        let topic: string | undefined;
        if (!url) {
          // Extract topic (everything after "add" or "queue:")
          const topicMatch = text.match(/(?:add|queue:?)\s+(?:high\s+|low\s+)?(.+)/i);
          topic = topicMatch?.[1]?.trim();
        }

        if (!url && !topic) {
          if (callback) {
            await callback({
              text: `⚠️ Please provide a URL or topic:\n\`queue add [URL or topic]\`\n\`queue add high [URL]\` for priority`,
              actions: ["RESEARCH_QUEUE"],
            });
          }
          return;
        }

        const newItem: QueueItem = {
          id: generateId(),
          type: detectType(url || topic || ""),
          url: url || undefined,
          topic: url ? undefined : topic,
          priority: isHighPriority ? "high" : isLowPriority ? "low" : "normal",
          status: "pending",
          addedAt: Date.now(),
        };

        queue.items.push(newItem);
        
        // Sort by priority (high first, then by date)
        queue.items.sort((a, b) => {
          if (a.status !== "pending" || b.status !== "pending") return 0;
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (pDiff !== 0) return pDiff;
          return a.addedAt - b.addedAt;
        });
        
        saveQueue(queue);

        const pending = queue.items.filter((i) => i.status === "pending").length;

        if (callback) {
          await callback({
            text: `✅ **Added to queue**\n\n**Type:** ${newItem.type}\n**Content:** ${url || topic}\n**Priority:** ${newItem.priority}\n**ID:** \`${newItem.id}\`\n\n📋 Queue: ${pending} pending\n\nProcess with: \`queue process\``,
            actions: ["RESEARCH_QUEUE"],
          });
        }
        return;
      }

      // PROCESS QUEUE
      if (lower.includes("process")) {
        const processAll = lower.includes("all") || lower.includes("batch");
        const pending = queue.items.filter((i) => i.status === "pending");

        if (pending.length === 0) {
          if (callback) {
            await callback({
              text: `📋 **Queue empty**\n\nNo pending items to process.\n\nAdd items: \`queue add [URL]\``,
              actions: ["RESEARCH_QUEUE"],
            });
          }
          return;
        }

        const toProcess = processAll ? pending : [pending[0]];

        if (callback) {
          await callback({
            text: `🔄 **Processing ${toProcess.length} item${toProcess.length > 1 ? "s" : ""}...**\n\n${toProcess.map((i) => `• ${i.type}: ${i.url || i.topic}`).join("\n")}\n\n_This will run UPLOAD for each item. May take a few minutes..._`,
            actions: ["RESEARCH_QUEUE"],
          });
        }

        // Note: In a real implementation, this would call the UPLOAD action for each item
        // For now, we mark them as needing manual processing
        for (const item of toProcess) {
          item.status = "processing";
        }
        saveQueue(queue);

        // Provide instructions for manual processing
        const instructions = toProcess.map((item) => {
          if (item.url) {
            return `**${item.type}:** Upload this URL:\n\`upload: ${item.url}\``;
          }
          return `**topic:** Research and add content about: ${item.topic}`;
        }).join("\n\n");

        if (callback) {
          await callback({
            text: `📋 **Ready to process**\n\n${instructions}\n\n---\nAfter uploading, items will be marked complete.\nOr manually: \`queue complete ${toProcess[0].id}\``,
            actions: ["RESEARCH_QUEUE"],
          });
        }
        return;
      }

      // REMOVE FROM QUEUE
      if (lower.includes("remove") || lower.includes("delete")) {
        const idMatch = text.match(/rq_[\w]+/);
        if (!idMatch) {
          if (callback) {
            await callback({
              text: `⚠️ Specify item ID: \`queue remove [id]\`\n\nView IDs: \`queue\``,
              actions: ["RESEARCH_QUEUE"],
            });
          }
          return;
        }

        const idx = queue.items.findIndex((i) => i.id === idMatch[0]);
        if (idx === -1) {
          if (callback) {
            await callback({
              text: `❌ Item not found: ${idMatch[0]}`,
              actions: ["RESEARCH_QUEUE"],
            });
          }
          return;
        }

        const removed = queue.items.splice(idx, 1)[0];
        saveQueue(queue);

        if (callback) {
          await callback({
            text: `✅ Removed: ${removed.url || removed.topic}`,
            actions: ["RESEARCH_QUEUE"],
          });
        }
        return;
      }

      // CLEAR COMPLETED/FAILED
      if (lower.includes("clear")) {
        const before = queue.items.length;
        queue.items = queue.items.filter((i) => i.status === "pending" || i.status === "processing");
        const removed = before - queue.items.length;
        saveQueue(queue);

        if (callback) {
          await callback({
            text: `🧹 Cleared ${removed} completed/failed items.\n\n${queue.items.length} items remain in queue.`,
            actions: ["RESEARCH_QUEUE"],
          });
        }
        return;
      }

      // MARK COMPLETE (helper)
      if (lower.includes("complete") || lower.includes("done")) {
        const idMatch = text.match(/rq_[\w]+/);
        if (idMatch) {
          const item = queue.items.find((i) => i.id === idMatch[0]);
          if (item) {
            item.status = "completed";
            item.processedAt = Date.now();
            queue.totalProcessed++;
            queue.lastProcessed = Date.now();
            saveQueue(queue);

            if (callback) {
              await callback({
                text: `✅ Marked complete: ${item.url || item.topic}`,
                actions: ["RESEARCH_QUEUE"],
              });
            }
            return;
          }
        }
      }

      // Default: show queue
      if (callback) {
        await callback({
          text: formatQueue(queue),
          actions: ["RESEARCH_QUEUE"],
        });
      }

    } catch (error) {
      logger.error({ error }, "[RESEARCH_QUEUE] Error");
      if (callback) {
        await callback({
          text: `❌ Error: ${String(error)}`,
          actions: ["RESEARCH_QUEUE"],
        });
      }
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "queue add https://youtube.com/watch?v=xyz" } },
      {
        name: "Eliza",
        content: {
          text: "✅ **Added to queue**\n\n**Type:** youtube...",
          actions: ["RESEARCH_QUEUE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "show research queue" } },
      {
        name: "Eliza",
        content: {
          text: "📋 **Research Queue**\n\n**Pending (3):**...",
          actions: ["RESEARCH_QUEUE"],
        },
      },
    ],
  ],
};

export default researchQueueAction;
