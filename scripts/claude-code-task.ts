#!/usr/bin/env bun
/**
 * Send a single task/message to claude-code-controller and optionally wait for a reply.
 *
 * Prerequisites: Claude Code CLI v2.1.34+, controller server running (e.g. port 3456).
 *
 * Usage:
 *   bun run scripts/claude-code-task.ts "Review src/auth for security. Reply with SendMessage."
 *   CLAUDE_CODE_CONTROLLER_MESSAGE="Refactor X" bun run scripts/claude-code-task.ts
 *
 * Env:
 *   CLAUDE_CODE_CONTROLLER_URL  - base URL (default http://localhost:3456)
 *   CLAUDE_CODE_CONTROLLER_AGENT - agent name (default coder)
 *   CLAUDE_CODE_CONTROLLER_MESSAGE - message (overrides argv)
 *   CLAUDE_CODE_CONTROLLER_WEBHOOK_URL - optional Discord webhook to post result
 */

const BASE_URL =
  process.env.CLAUDE_CODE_CONTROLLER_URL?.trim() || "http://localhost:3456";
const AGENT_NAME =
  process.env.CLAUDE_CODE_CONTROLLER_AGENT?.trim() || "coder";
const TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;

function getMessage(): string {
  const fromEnv = process.env.CLAUDE_CODE_CONTROLLER_MESSAGE?.trim();
  if (fromEnv) return fromEnv;
  const arg = process.argv.slice(2).join(" ").trim();
  if (arg) return arg;
  console.error("Usage: bun run scripts/claude-code-task.ts \"<message>\"");
  console.error("   or: CLAUDE_CODE_CONTROLLER_MESSAGE=\"<message>\" bun run scripts/claude-code-task.ts");
  process.exit(1);
}

async function fetchJson(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
    });
    const data = res.headers.get("content-type")?.includes("json")
      ? await res.json().catch(() => ({}))
      : undefined;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

async function main() {
  const message = getMessage();
  console.log("[claude-code-task] Controller:", BASE_URL);
  console.log("[claude-code-task] Agent:", AGENT_NAME);
  console.log("[claude-code-task] Message:", message.slice(0, 80) + (message.length > 80 ? "..." : ""));

  const health = await fetchJson("/health");
  if (!health.ok) {
    console.error("[claude-code-task] Controller not reachable at", BASE_URL);
    console.error("[claude-code-task] Start it with: npx claude-code-controller (or set CLAUDE_CODE_CONTROLLER_PORT=3456)");
    process.exit(1);
  }

  const sessionRes = await fetchJson("/session");
  if (!sessionRes.ok || !sessionRes.data) {
    const initRes = await fetchJson("/session/init", {
      method: "POST",
      body: JSON.stringify({ teamName: "vince", cwd: process.cwd() }),
    });
    if (!initRes.ok) {
      console.error("[claude-code-task] Session init failed:", initRes.status, initRes.data);
      process.exit(1);
    }
  }

  const agentsRes = await fetchJson("/agents");
  const agents = (agentsRes.data as { agents?: { name: string }[] })?.agents ?? [];
  const exists = agents.some((a: { name: string }) => a.name === AGENT_NAME);
  if (!exists) {
    const spawnRes = await fetchJson("/agents", {
      method: "POST",
      body: JSON.stringify({ name: AGENT_NAME, model: "sonnet" }),
    });
    if (!spawnRes.ok) {
      console.error("[claude-code-task] Spawn agent failed:", spawnRes.status, spawnRes.data);
      process.exit(1);
    }
    console.log("[claude-code-task] Spawned agent", AGENT_NAME);
    await new Promise((r) => setTimeout(r, 10_000));
  }

  const sendRes = await fetchJson(`/agents/${encodeURIComponent(AGENT_NAME)}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  if (!sendRes.ok) {
    console.error("[claude-code-task] Send message failed:", sendRes.status, sendRes.data);
    process.exit(1);
  }

  console.log("[claude-code-task] Message sent. Waiting up to", TIMEOUT_MS / 1000, "s for reply...");
  const start = Date.now();
  let lastReply: string | null = null;
  while (Date.now() - start < TIMEOUT_MS) {
    const actionsRes = await fetchJson("/actions");
    const data = actionsRes.data as {
      idleAgents?: { name: string }[];
      approvals?: unknown[];
    } | undefined;
    if (data?.idleAgents?.some((a: { name: string }) => a.name === AGENT_NAME)) {
      const agentRes = await fetchJson(`/agents/${encodeURIComponent(AGENT_NAME)}`);
      const agentData = agentRes.data as { lastMessage?: string } | undefined;
      if (agentData?.lastMessage) {
        lastReply = agentData.lastMessage;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (lastReply) {
    console.log("\n--- Reply ---\n");
    console.log(lastReply);
    const webhook = process.env.CLAUDE_CODE_CONTROLLER_WEBHOOK_URL?.trim();
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `**Claude Code (${AGENT_NAME})**\n${lastReply.slice(0, 1900)}`,
          }),
        });
      } catch {
        // ignore webhook errors
      }
    }
  } else {
    console.log("[claude-code-task] No reply in time. Check the controller web dashboard for agent output.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
