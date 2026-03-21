import { randomUUID } from "node:crypto";
import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { Task } from "@elizaos/core";
import { getPasteTradeKey } from "../config.ts";
import { PasteTradeClient } from "../pasteTradeClient.ts";
import { buildOtakuHandoffPayload } from "../otakuHandoff.ts";
import { createRun, getRun, listRunsForAgent } from "../runRegistry.ts";

function getRuntime(
  req: RouteRequest,
  res: RouteResponse,
  /** ElizaOS AgentServer passes the agent runtime as the third handler argument (not on the plain route request). */
  runtimeArg?: IAgentRuntime,
): IAgentRuntime | null {
  if (runtimeArg) return runtimeArg;
  const reqAny = req as unknown as Record<string, unknown>;
  const rt =
    (reqAny.runtime as IAgentRuntime) ??
    (reqAny.agentRuntime as IAgentRuntime) ??
    (reqAny.agent as { runtime?: IAgentRuntime })?.runtime;
  if (!rt) {
    res.status(503).json({
      error: "paste-trade requires agent context",
      hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/runs?agentId=<same-uuid> (or legacy .../plugins/paste-trade/...)",
    });
    return null;
  }
  return rt;
}

function requirePasteTradeKey(
  res: RouteResponse,
  runtime: IAgentRuntime,
): boolean {
  if (!getPasteTradeKey(runtime)) {
    res.status(503).json({
      error: "PASTE_TRADE_KEY not configured",
      hint: "Run `bun run packages/paste-trade/scripts/onboard.ts` once (or set PASTE_TRADE_KEY), then restart the server.",
    });
    return false;
  }
  return true;
}

export async function handlePostPasteTradeRuns(
  req: RouteRequest,
  res: RouteResponse,
  runtimeArg?: IAgentRuntime,
): Promise<void> {
  const runtime = getRuntime(req, res, runtimeArg);
  if (!runtime) return;
  if (!requirePasteTradeKey(res, runtime)) return;

  const body = (req.body ?? {}) as {
    url?: string;
    text?: string;
    roomId?: string;
  };
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!url && !text) {
    res.status(400).json({ error: "Provide url or text" });
    return;
  }

  const worker = runtime.getTaskWorker("PASTE_TRADE_PIPELINE");
  const clientFallback = worker ? null : PasteTradeClient.fromRuntime(runtime);
  if (!worker && !clientFallback) {
    res.status(503).json({ error: "PASTE_TRADE_KEY not configured" });
    return;
  }

  const runId = randomUUID().slice(0, 12);
  const rec = createRun({
    runId,
    agentId: String(runtime.agentId),
    roomId: body.roomId,
    inputUrl: url || undefined,
    inputText: text || undefined,
  });

  const task: Task = {
    name: "PASTE_TRADE_PIPELINE",
    description: "paste.trade pipeline",
    tags: ["paste-trade"],
    metadata: { runId },
  };
  if (worker) {
    void worker
      .execute(runtime, {}, task)
      .catch((e: unknown) => logger.error(`[paste-trade] task execute: ${e}`));
  } else if (clientFallback) {
    const { runPasteTradePipeline } = await import("../pipeline.ts");
    void runPasteTradePipeline(runtime, rec, clientFallback).catch(
      (e: unknown) => logger.error(`[paste-trade] pipeline: ${e}`),
    );
  }

  res.status(202).json({
    runId,
    agentId: runtime.agentId,
    status: "accepted",
  });
}

export async function handleGetPasteTradeRun(
  req: RouteRequest,
  res: RouteResponse,
  runtimeArg?: IAgentRuntime,
): Promise<void> {
  const runtime = getRuntime(req, res, runtimeArg);
  if (!runtime) return;
  if (!requirePasteTradeKey(res, runtime)) return;

  const q = (req as unknown as { query?: Record<string, string> }).query ?? {};
  const runId =
    (typeof q.runId === "string" && q.runId.trim()) ||
    (
      req as unknown as { params?: Record<string, string> }
    ).params?.runId?.trim();
  if (!runId) {
    res.status(400).json({ error: "Missing runId (query runId=)" });
    return;
  }
  const rec = getRun(runId);
  if (!rec) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  if (rec.agentId !== String(runtime.agentId)) {
    res.status(403).json({ error: "Run belongs to another agent" });
    return;
  }
  res.json(rec);
}

/** GET list of runs for leaderboard (newest first). Query: limit= (default 50, max 100). */
export async function handleGetPasteTradeRunsList(
  req: RouteRequest,
  res: RouteResponse,
  runtimeArg?: IAgentRuntime,
): Promise<void> {
  const runtime = getRuntime(req, res, runtimeArg);
  if (!runtime) return;
  if (!requirePasteTradeKey(res, runtime)) return;

  const q = (req as unknown as { query?: Record<string, string> }).query ?? {};
  let limit = 50;
  const rawLimit = typeof q.limit === "string" ? q.limit.trim() : "";
  if (rawLimit) {
    const n = Number.parseInt(rawLimit, 10);
    if (Number.isFinite(n) && n > 0) limit = Math.min(n, 100);
  }

  const runs = listRunsForAgent(String(runtime.agentId), limit);
  res.json({ runs, agentId: runtime.agentId });
}

/** GET handoff text for Otaku — read-only, no orders. */
export async function handleGetPasteTradeHandoff(
  req: RouteRequest,
  res: RouteResponse,
  runtimeArg?: IAgentRuntime,
): Promise<void> {
  const runtime = getRuntime(req, res, runtimeArg);
  if (!runtime) return;
  if (!requirePasteTradeKey(res, runtime)) return;

  const q = (req as unknown as { query?: Record<string, string> }).query ?? {};
  const runId =
    (typeof q.runId === "string" && q.runId.trim()) ||
    (
      req as unknown as { params?: Record<string, string> }
    ).params?.runId?.trim();
  if (!runId) {
    res.status(400).json({ error: "Missing runId (query runId=)" });
    return;
  }
  const rec = getRun(runId);
  if (!rec) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  if (rec.agentId !== String(runtime.agentId)) {
    res.status(403).json({ error: "Run belongs to another agent" });
    return;
  }

  res.json(buildOtakuHandoffPayload(rec));
}
