import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  Task,
} from "@elizaos/core";
import { randomUUID } from "node:crypto";
import { pasteTradeEnabled } from "../config.ts";
import { PasteTradeClient } from "../pasteTradeClient.ts";
import { createRun } from "../runRegistry.ts";

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
}

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0]! : null;
}

export const pasteTradeAction: Action = {
  name: "VINCE_PASTE_TRADE",
  similes: [
    "PASTE_TRADE",
    "/trade",
    "paste trade",
    "what's the trade",
    "whats the trade",
  ],
  description:
    "Runs the paste.trade pipeline: extract a URL or typed thesis, create a live source on paste.trade, save theses. Use when the user pastes a link, says /trade, or asks what the trade is in a source.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    if (!pasteTradeEnabled()) return false;
    const text = (message.content?.text ?? "").trim();
    if (!text) return false;
    const lower = text.toLowerCase();
    if (
      lower.startsWith("/trade") ||
      lower.includes("paste trade") ||
      lower.includes("what's the trade") ||
      lower.includes("whats the trade")
    ) {
      return true;
    }
    if (looksLikeUrl(text) || extractFirstUrl(text)) return true;
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const client = PasteTradeClient.fromRuntime(runtime);
    if (!client) {
      if (callback) {
        await callback({
          text: "paste.trade is not configured. Set PASTE_TRADE_KEY and PASTE_TRADE_ENABLED=true.",
          actions: ["VINCE_PASTE_TRADE"],
        });
      }
      return { success: false };
    }

    const raw = (message.content?.text ?? "").trim();
    const url =
      extractFirstUrl(raw) ??
      (looksLikeUrl(raw) ? raw.replace(/^www\./i, "https://www.") : "");
    const stripped = raw
      .replace(/^\/trade\s*/i, "")
      .replace(/^(paste trade|what's the trade|whats the trade)[:\s]*/i, "")
      .trim();
    const inputUrl = url || extractFirstUrl(stripped) || "";
    const inputText = !inputUrl && stripped ? stripped : !inputUrl ? raw : "";

    if (!inputUrl && !inputText) {
      if (callback) {
        await callback({
          text: "Send a URL or paste the thesis text to run paste.trade.",
          actions: ["VINCE_PASTE_TRADE"],
        });
      }
      return { success: false };
    }

    const runId = randomUUID().slice(0, 12);
    createRun({
      runId,
      agentId: String(runtime.agentId),
      roomId: message.roomId,
      inputUrl: inputUrl || undefined,
      inputText: inputText || undefined,
    });

    const worker = runtime.getTaskWorker("PASTE_TRADE_PIPELINE");
    const task: Task = {
      name: "PASTE_TRADE_PIPELINE",
      description: "paste.trade from chat",
      tags: ["paste-trade"],
      metadata: { runId },
    };

    if (callback) {
      await callback({
        text: "Running paste.trade now. Open **Paste trade** in the app for live progress, or watch the source page when it appears.\n\nExpressions, not advice. Do your own research.",
        actions: ["VINCE_PASTE_TRADE"],
      });
    }

    if (worker) {
      void worker.execute(runtime, {}, task);
    } else {
      const { runPasteTradePipeline } = await import("../pipeline.ts");
      const { getRun } = await import("../runRegistry.ts");
      const rec = getRun(runId);
      if (rec) void runPasteTradePipeline(runtime, rec, client);
    }

    return { success: true };
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "/trade https://x.com/someone/status/123" },
      },
      {
        name: "VINCE",
        content: {
          text: "Running paste.trade now…",
          actions: ["VINCE_PASTE_TRADE"],
        },
      },
    ],
  ],
};
