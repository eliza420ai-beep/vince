/**
 * Post-mortem writer: when a paper trade closes at a loss, ask Echo, Oracle, Solus
 * via in-process ASK_AGENT and write a structured markdown file under docs/standup/post-mortems/.
 * PRD: One Dream — Agent Synergy (§5.4, Phase 2).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type { Position } from "../types/paperTrading";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const TIMEOUT_MS = 20_000;

function extractReply(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const text =
    typeof c.text === "string"
      ? c.text
      : typeof (c as { message?: string }).message === "string"
        ? (c as { message: string }).message
        : "";
  if (text.trim()) return text.trim();
  if (typeof c.thought === "string" && c.thought.trim())
    return (c.thought as string).trim();
  return "";
}

async function askAgent(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  agentName: string,
  question: string,
  roomId: string,
  entityId: string,
): Promise<string> {
  const content = `[To ${agentName} — you are being asked for a trade post-mortem. Answer in 2–4 sentences.][From Vince]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "vince_post_mortem" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(reply);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      });
  });
}

/**
 * Run post-mortem for a closed losing position: ask Echo, Oracle, Solus and write markdown.
 * Fire-and-forget safe; logs errors.
 */
export async function runPostMortem(
  runtime: IAgentRuntime,
  closedPosition: Position,
): Promise<void> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgentByName || !eliza.handleMessage) {
    logger.debug(
      "[VincePostMortem] elizaOS not available; skipping post-mortem.",
    );
    return;
  }

  const pnl = closedPosition.realizedPnl ?? 0;
  if (pnl >= 0) return;

  const asset = closedPosition.asset;
  const direction = closedPosition.direction;
  const closeReason = closedPosition.closeReason ?? "manual";
  const entryPrice = closedPosition.entryPrice;
  const exitPrice = closedPosition.markPrice;
  const sizeUsd = closedPosition.sizeUsd;
  const leverage = closedPosition.leverage ?? 1;

  // Synthetic room/entity for in-process ask (no DB required)
  const roomId = crypto.randomUUID();
  const entityId = crypto.randomUUID();

  const tradeSummary = `${asset} ${direction} closed ${closeReason}: entry $${entryPrice.toFixed(2)} → exit $${exitPrice.toFixed(2)}, P&L $${pnl.toFixed(2)} (${sizeUsd} USD, ${leverage}x).`;

  const queries: { name: string; question: string }[] = [
    {
      name: "Echo",
      question: `We just closed a losing paper trade. ${tradeSummary} In 2–4 sentences: Did CT sentiment or your vibe beforehand warn against this ${direction}, or was the loss a surprise given what you were seeing?`,
    },
    {
      name: "Oracle",
      question: `We just closed a losing paper trade. ${tradeSummary} In 2–4 sentences: Was Polymarket or your regime view (risk-on/risk-off) indicating caution for this move, or neutral?`,
    },
    {
      name: "Solus",
      question: `We just closed a losing paper trade. ${tradeSummary} In 2–4 sentences: From an options/mechanics perspective, was sizing or strike/expiry timing a factor, or was this mainly direction/spot move?`,
    },
  ];

  const replies: { agent: string; reply: string }[] = [];
  for (const q of queries) {
    const target = eliza.getAgentByName(q.name);
    const agentId = target?.agentId ?? (target as { id?: string })?.id;
    if (!agentId) {
      replies.push({ agent: q.name, reply: "(agent not available)" });
      continue;
    }
    const reply = await askAgent(
      eliza,
      agentId,
      q.name,
      q.question,
      roomId,
      entityId,
    );
    replies.push({ agent: q.name, reply: reply || "(no reply)" });
  }

  const date = new Date().toISOString().slice(0, 10);
  const safeAsset = asset.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${date}-${safeAsset}-post-mortem.md`;
  const dir = path.join(process.cwd(), "docs", "standup", "post-mortems");
  const filepath = path.join(dir, filename);

  const md = [
    `# Post-mortem: ${asset} ${direction} (${closeReason})`,
    "",
    `**Date:** ${date}`,
    `**Trade:** ${tradeSummary}`,
    "",
    "## Agent feedback",
    "",
    ...replies.flatMap((r) => [`### ${r.agent}`, "", r.reply, ""]),
  ].join("\n");

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, md, "utf-8");
    logger.info(`[VincePostMortem] Wrote ${filepath}`);
  } catch (err) {
    logger.warn(`[VincePostMortem] Failed to write ${filepath}: ${err}`);
  }
}
