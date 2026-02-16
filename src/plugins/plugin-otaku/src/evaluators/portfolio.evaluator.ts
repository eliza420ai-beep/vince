/**
 * Portfolio evaluator – tracks DeFi transactions, portfolio drift, and concentration risk.
 * Runs after Otaku responses; stores insights as memory facts for future context.
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { OtakuService } from "../services/otaku.service";
import type { Position } from "../services/otaku.service";

const COMPLETION_PHRASES = [
  "swap complete",
  "bridge initiated",
  "deposit complete",
  "withdrawal complete",
  "approv",
  "minting",
  "mint complete",
  "✅",
  "tx:",
  "txhash",
];

function agentMessageIndicatesCompletion(text: string): boolean {
  const lower = (text ?? "").toLowerCase();
  return COMPLETION_PHRASES.some((p) => lower.includes(p));
}

function extractTxFact(agentText: string): string | null {
  const t = agentText.trim();
  if (t.length < 10) return null;
  // One-line summary: take first sentence or first 120 chars
  const firstLine = t.split(/\n/)[0]?.trim() ?? t.slice(0, 120);
  if (firstLine.length > 200) return firstLine.slice(0, 197) + "...";
  return firstLine;
}

function concentrationFromPositions(positions: Position[]): string | null {
  if (!positions.length) return null;
  const totalUsd = positions.reduce(
    (sum, p) => sum + (typeof p.usdValue === "string" ? parseFloat(p.usdValue) : p.usdValue ?? 0),
    0
  );
  if (totalUsd <= 0) return null;
  const byToken: Record<string, number> = {};
  for (const p of positions) {
    const v = typeof p.usdValue === "string" ? parseFloat(p.usdValue) : p.usdValue ?? 0;
    const token = (p.token ?? "unknown").toUpperCase();
    byToken[token] = (byToken[token] ?? 0) + v;
  }
  const parts = Object.entries(byToken)
    .map(([token, usd]) => {
      const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
      return `${token} ${pct.toFixed(0)}%`;
    })
    .sort((a, b) => parseFloat(b.split(" ")[1]) - parseFloat(a.split(" ")[1]));
  const concentration = parts.slice(0, 5).join(", ");
  const topPct = parts[0] ? parseFloat(parts[0].split(" ")[1]) : 0;
  if (topPct >= 70) {
    return `Portfolio concentration: ${concentration}. Consider rebalancing to reduce single-asset risk.`;
  }
  return `Portfolio allocation: ${concentration}.`;
}

export const portfolioEvaluator: Evaluator = {
  name: "OTAKU_PORTFOLIO",
  description:
    "Tracks DeFi transactions and portfolio composition after Otaku actions; stores facts for drift and concentration risk.",
  similes: ["PORTFOLIO_TRACKER", "DEFI_LEARNING"],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    if (!message.roomId || !runtime.agentId) return false;
    const otaku = runtime.getService("otaku") as OtakuService | null;
    if (!otaku) return false;

    try {
      const recent = await runtime.getMemories({
        tableName: "messages",
        roomId: message.roomId,
        count: 5,
        unique: true,
      });
      const agentMessage = recent.find((m) => m.agentId === runtime.agentId);
      const text = agentMessage?.content?.text ?? "";
      return agentMessageIndicatesCompletion(text);
    } catch {
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<void> => {
    const { agentId, roomId } = message;
    if (!agentId || !roomId) return;

    try {
      const recent = await runtime.getMemories({
        tableName: "messages",
        roomId,
        count: 5,
        unique: true,
      });
      const agentMessage = recent.find((m) => m.agentId === runtime.agentId);
      const agentText = agentMessage?.content?.text ?? "";
      const factClaim = extractTxFact(agentText);
      if (factClaim) {
        const factMemory = {
          entityId: agentId,
          agentId,
          content: { text: `[Otaku] ${factClaim}` },
          roomId,
          createdAt: Date.now(),
        };
        await runtime.createMemory(factMemory, "facts", true);
        logger.debug(`[OTAKU_PORTFOLIO] Stored fact: ${factClaim.slice(0, 60)}...`);
      }

      const otaku = runtime.getService("otaku") as OtakuService | null;
      if (otaku?.getPositions) {
        try {
          const { positions } = await otaku.getPositions();
          const concentrationFact = concentrationFromPositions(positions);
          if (concentrationFact) {
            const concMemory = {
              entityId: agentId,
              agentId,
              content: { text: `[Otaku] ${concentrationFact}` },
              roomId,
              createdAt: Date.now(),
            };
            await runtime.createMemory(concMemory, "facts", true);
          }
        } catch (err) {
          logger.debug(`[OTAKU_PORTFOLIO] getPositions failed: ${err}`);
        }
      }
    } catch (err) {
      logger.warn(`[OTAKU_PORTFOLIO] Evaluator failed: ${err}`);
    }
  },

  examples: [],
};

export default portfolioEvaluator;
