/**
 * Post-mortem writer: when a paper trade closes at a loss, ask Echo, Oracle, Solus
 * via direct useModel (bypass shouldRespond/IGNORE) and write a structured markdown
 * file under docs/standup/post-mortems/.
 * PRD: One Dream — Agent Synergy (§5.4, Phase 2).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type { Position } from "../types/paperTrading";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const TIMEOUT_MS = 60_000;

/**
 * Ask an agent for post-mortem feedback using direct useModel (same approach as
 * standup round-robin). Falls back to handleMessage if the agent runtime is
 * not available, but WITHOUT the .then() race condition.
 */
async function askAgent(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  agentName: string,
  question: string,
): Promise<string> {
  // Direct path: useModel bypasses shouldRespond / IGNORE
  const getAgent = eliza.getAgent?.bind?.(eliza) ?? eliza.getAgent;
  const agentRuntime = getAgent?.(agentId);
  if (agentRuntime?.useModel) {
    try {
      const prompt = `You are ${agentName}. A teammate (Vince) is asking you for trade post-mortem feedback. Answer in 2–4 sentences from your domain expertise. Be specific and direct.\n\nQuestion: ${question}`;
      const resp = await agentRuntime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        maxTokens: 200,
        temperature: 0.7,
      });
      const text = String(resp ?? "").trim();
      if (text) return text;
    } catch (err) {
      logger.warn(
        { err, agentName },
        "[VincePostMortem] Direct useModel failed; falling back to handleMessage.",
      );
    }
  }

  // Fallback: handleMessage without .then() race condition
  const roomId = crypto.randomUUID();
  const entityId = crypto.randomUUID();
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
      logger.warn(
        `[VincePostMortem] ${agentName} timed out after ${TIMEOUT_MS}ms`,
      );
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      if (!resp || typeof resp !== "object") return;
      const c = resp as Record<string, unknown>;
      const text =
        typeof c.text === "string"
          ? c.text.trim()
          : typeof c.message === "string"
            ? (c.message as string).trim()
            : typeof c.thought === "string"
              ? (c.thought as string).trim()
              : "";
      if (text) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(text);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {
          // Only resolve if onResponse never fired
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve("");
          }
        },
        onError: (err: Error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            logger.warn(
              `[VincePostMortem] ${agentName} handleMessage error: ${err.message}`,
            );
            resolve("");
          }
        },
      })
      .catch((err: unknown) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          logger.warn(
            `[VincePostMortem] ${agentName} handleMessage rejected: ${err}`,
          );
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
  if (!eliza) {
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
    const target = eliza.getAgentByName?.(q.name);
    const agentId = target?.agentId ?? (target as { id?: string })?.id;
    if (!agentId) {
      replies.push({ agent: q.name, reply: "(agent not available)" });
      continue;
    }
    const reply = await askAgent(eliza, agentId, q.name, q.question);
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
