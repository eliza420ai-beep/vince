#!/usr/bin/env bun
/**
 * Forge terminal command bridge.
 *
 * Lets operators trigger Forge action messages from shell:
 *   bun run forge:run
 *   bun run forge:status
 *   bun run forge:report
 *
 * Optional flags:
 *   --base-url http://localhost:3000
 *   --agent Forge
 *   --text "forge run"
 *   --sender-id <uuid>
 *   --room-id <uuid>
 */

import { randomUUID } from "node:crypto";

type ForgeIntent =
  | "run"
  | "status"
  | "report"
  | "revert"
  | "push-now"
  | "job-status"
  | "text";

interface AgentRecord {
  id?: string;
  name?: string;
  character?: {
    name?: string;
  };
}

interface JobCreateResponse {
  jobId?: string;
}

interface JobStatusResponse {
  status?: "pending" | "processing" | "completed" | "failed" | "timeout";
  result?: {
    message?: {
      content?: string;
      text?: string;
    };
  };
  error?: string;
}

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_TIMEOUT_MS = 15000;
const JOB_POLL_INTERVAL_MS = 1800;
const JOB_MAX_WAIT_MS = 95000;

function parseArgs(argv: string[]) {
  const args = [...argv];
  let intent: ForgeIntent = "run";
  let explicitText: string | null = null;
  let explicitJobId: string | null = null;
  let baseUrl = process.env.ELIZA_BASE_URL?.trim() || "http://localhost:3000";
  let agentName = process.env.FORGE_AGENT_NAME?.trim() || "Forge";
  let senderId = process.env.FORGE_SENDER_ID?.trim() || randomUUID();
  let roomId = process.env.FORGE_ROOM_ID?.trim() || randomUUID();

  const first = args[0]?.toLowerCase();
  if (
    first === "run" ||
    first === "status" ||
    first === "report" ||
    first === "revert" ||
    first === "push-now" ||
    first === "job-status"
  ) {
    intent = first;
    args.shift();
  } else if (first && !first.startsWith("--")) {
    // Treat unknown positional as explicit text command.
    intent = "text";
    explicitText = args.shift() ?? null;
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === "--base-url" && args[i + 1]) {
      baseUrl = args[++i];
    } else if (token === "--agent" && args[i + 1]) {
      agentName = args[++i];
    } else if (token === "--text" && args[i + 1]) {
      explicitText = args[++i];
      intent = "text";
    } else if (token === "--sender-id" && args[i + 1]) {
      senderId = args[++i];
    } else if (token === "--room-id" && args[i + 1]) {
      roomId = args[++i];
    } else if (token === "--job-id" && args[i + 1]) {
      explicitJobId = args[++i];
    }
  }
  if (intent === "job-status" && !explicitJobId && args[0] && !args[0].startsWith("--")) {
    explicitJobId = args[0];
  }

  const textByIntent: Record<Exclude<ForgeIntent, "text">, string> = {
    run: "forge run",
    status: "forge status",
    report: "forge report",
    revert: "forge revert",
    "push-now": "forge push daily report now",
    "job-status": "forge status",
  };

  const text = intent === "text" ? explicitText || "forge run" : textByIntent[intent];
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    agentName,
    senderId,
    roomId,
    text,
    intent,
    jobId: explicitJobId,
  };
}

function isAbortError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("The operation was aborted") ||
    msg.includes("AbortError") ||
    msg.includes("aborted")
  );
}

async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { ...init, signal: controller.signal });
  const body = await res.text();
  clearTimeout(timeoutId);
  let parsed: any = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} at ${url}\n${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`,
    );
  }
  return parsed;
}

function extractAgents(payload: any): AgentRecord[] {
  if (Array.isArray(payload)) return payload as AgentRecord[];
  if (Array.isArray(payload?.data?.agents)) return payload.data.agents as AgentRecord[];
  if (Array.isArray(payload?.agents)) return payload.agents as AgentRecord[];
  return [];
}

function pickAgentId(agents: AgentRecord[], preferredName: string): string | null {
  const target = preferredName.toLowerCase();
  const exact = agents.find((a) => (a.name || a.character?.name || "").toLowerCase() === target);
  if (exact?.id) return exact.id;

  const contains = agents.find((a) =>
    (a.name || a.character?.name || "").toLowerCase().includes(target),
  );
  if (contains?.id) return contains.id;

  return null;
}

function extractReplyText(payload: any): string {
  const direct = payload?.data?.message?.text;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (typeof payload?.message?.text === "string" && payload.message.text.trim()) {
    return payload.message.text;
  }
  return "Command sent. Check VINCE logs/chat for async result.";
}

async function tryDirectAgentMessage(
  baseUrl: string,
  agentId: string,
  senderId: string,
  roomId: string,
  text: string,
): Promise<{ ok: boolean; text?: string; notFound?: boolean }> {
  const msgPayload = {
    senderId,
    roomId,
    text,
    source: "direct",
  };
  const url = `${baseUrl}/api/agents/${agentId}/message?worldId=${ZERO_UUID}`;
  try {
    const response = await fetchJson(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgPayload),
      },
      30000,
    );
    return { ok: true, text: extractReplyText(response) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("HTTP 404")) {
      return { ok: false, notFound: true };
    }
    throw err;
  }
}

async function tryMessagingJobs(
  baseUrl: string,
  agentId: string,
  senderId: string,
  text: string,
  options?: { createTimeoutMs?: number; pollTimeoutMs?: number; createRetries?: number },
): Promise<{ reply?: string; jobId: string; status: string }> {
  const createBody = {
    agentId,
    userId: senderId,
    content: text,
    timeoutMs: 90000,
    metadata: {
      source: "forge-cli",
    },
  };
  const createTimeoutMs = options?.createTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollTimeoutMs = options?.pollTimeoutMs ?? 20000;
  const createRetries = options?.createRetries ?? 2;
  let created: JobCreateResponse | null = null;

  for (let attempt = 1; attempt <= createRetries; attempt++) {
    try {
      created = (await fetchJson(
        `${baseUrl}/api/messaging/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        },
        createTimeoutMs,
      )) as JobCreateResponse;
      break;
    } catch (err) {
      if (!isAbortError(err) || attempt === createRetries) throw err;
      console.log(
        `[forge-cli] jobs create timeout (attempt ${attempt}/${createRetries}), retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }

  if (!created?.jobId) {
    throw new Error("Job API did not return a jobId.");
  }
  const jobId = created.jobId;

  const start = Date.now();
  while (Date.now() - start < JOB_MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
    const status = (await fetchJson(
      `${baseUrl}/api/messaging/jobs/${jobId}`,
      undefined,
      pollTimeoutMs,
    )) as JobStatusResponse;

    if (status.status === "completed") {
      const content =
        status.result?.message?.content ??
        status.result?.message?.text ??
        "Job completed.";
      return { reply: content, jobId, status: "completed" };
    }
    if (status.status === "failed") {
      throw new Error(`Job failed: ${status.error || "unknown error"}`);
    }
    if (status.status === "timeout") {
      return {
        jobId,
        status: "timeout",
      };
    }
  }

  return {
    jobId,
    status: "processing",
  };
}

async function main() {
  const { baseUrl, agentName, senderId, roomId, text, intent, jobId } = parseArgs(
    process.argv.slice(2),
  );

  if (intent === "job-status") {
    if (!jobId) {
      throw new Error(
        'Missing job id. Use: bun run forge:job-status -- <jobId> (or --job-id <jobId>)',
      );
    }
    try {
      const status = (await fetchJson(
        `${baseUrl}/api/messaging/jobs/${jobId}`,
        undefined,
        30000,
      )) as JobStatusResponse;
      const replyText =
        status.result?.message?.content ??
        status.result?.message?.text ??
        "";
      console.log(`[forge-cli] jobId=${jobId}`);
      console.log(`[forge-cli] status=${status.status ?? "unknown"}`);
      if (replyText) {
        console.log(`[forge-cli] reply: ${replyText}`);
      }
      if (status.error) {
        console.log(`[forge-cli] error: ${status.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("HTTP 404")) {
        console.log(`[forge-cli] jobId=${jobId}`);
        console.log(
          "[forge-cli] status=not_found (job may have expired or was never created on this server)",
        );
        return;
      }
      throw err;
    }
    return;
  }

  console.log(`[forge-cli] base=${baseUrl} agent=${agentName} text="${text}"`);

  const agentsPayload = await fetchJson(`${baseUrl}/api/agents`);
  const agents = extractAgents(agentsPayload);
  if (agents.length === 0) {
    throw new Error(
      "No agents returned from /api/agents. Ensure VINCE is running (`bun start`).",
    );
  }

  const agentId = pickAgentId(agents, agentName);
  if (!agentId) {
    const names = agents
      .map((a) => a.name || a.character?.name || a.id || "unknown")
      .join(", ");
    throw new Error(`Agent "${agentName}" not found. Available: ${names}`);
  }

  console.log(`[forge-cli] agentId=${agentId}`);
  const direct = await tryDirectAgentMessage(
    baseUrl,
    agentId,
    senderId,
    roomId,
    text,
  );
  if (direct.ok) {
    console.log(`[forge-cli] reply: ${direct.text}`);
    return;
  }

  if (direct.notFound) {
    console.log(
      "[forge-cli] direct endpoint not found, falling back to /api/messaging/jobs",
    );
  }

  const isPushNow = intent === "push-now" || text.includes("push daily report now");
  const job = await tryMessagingJobs(baseUrl, agentId, senderId, text, {
    createTimeoutMs: isPushNow ? 45000 : DEFAULT_TIMEOUT_MS,
    pollTimeoutMs: isPushNow ? 30000 : 20000,
    createRetries: isPushNow ? 3 : 2,
  });
  if (job.reply) {
    console.log(`[forge-cli] jobId=${job.jobId}`);
    console.log(`[forge-cli] reply: ${job.reply}`);
    return;
  }
  console.log(`[forge-cli] jobId=${job.jobId}`);
  console.log(
    `[forge-cli] no immediate reply (status=${job.status}). Command accepted; check Forge status with: bun run forge:status`,
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (isAbortError(err)) {
    console.error(
      "[forge-cli] error: request timed out while waiting for messaging jobs API. " +
        "The command may still be queued; retry in a few seconds or run: bun run forge:status",
    );
    process.exit(1);
  }
  console.error(`[forge-cli] error: ${msg}`);
  process.exit(1);
});

