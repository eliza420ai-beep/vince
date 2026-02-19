/**
 * VINCE CODE TASK Action
 *
 * Delegates code/repo tasks to claude-code-controller (real Claude Code CLI).
 * Only active when CLAUDE_CODE_CONTROLLER_URL is set. Uses fetch only; no npm dependency.
 *
 * Usage: "run a code review on src/auth", "refactor X", "delegate to Claude Code: ..."
 * See docs/CLAUDE_CODE_CONTROLLER.md and plan: leverage_claude-code-controller.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

const CONTROLLER_URL_ENV = "CLAUDE_CODE_CONTROLLER_URL";
const DEFAULT_AGENT_NAME = "coder";
const TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;

function getBaseUrl(): string | null {
  const url = process.env[CONTROLLER_URL_ENV]?.trim();
  return url || null;
}

async function controllerFetch(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
    });
    const data = res.headers.get("content-type")?.includes("json")
      ? await res.json().catch(() => ({}))
      : undefined;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    logger.debug({ err: String(e), path }, "[VINCE_CODE_TASK] fetch error");
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

export const vinceCodeTaskAction: Action = {
  name: "VINCE_CODE_TASK",
  similes: [
    "DELEGATE_CODE",
    "CODE_TASK",
    "RUN_CODE_REVIEW",
    "CLAUDE_CODE_TASK",
  ],
  description:
    "Delegates code or repo tasks (e.g. code review, refactor, apply improvement journal) to a Claude Code agent via claude-code-controller. Only available when CLAUDE_CODE_CONTROLLER_URL is set.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!getBaseUrl()) return false;
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("code review") ||
      text.includes("delegate to claude code") ||
      text.includes("claude code") ||
      (text.includes("refactor") &&
        (text.includes("src") || text.includes("code"))) ||
      text.includes("run a code task") ||
      text.includes("code task:")
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      await callback({
        text: "Code task delegation is not configured. Set CLAUDE_CODE_CONTROLLER_URL in .env and run claude-code-controller (see docs/CLAUDE_CODE_CONTROLLER.md).",
        actions: ["VINCE_CODE_TASK"],
      });
      return;
    }

    const instruction =
      message.content.text?.trim() ||
      "Run a quick code review and reply with SendMessage.";
    const agentName =
      process.env.CLAUDE_CODE_CONTROLLER_AGENT?.trim() || DEFAULT_AGENT_NAME;

    const health = await controllerFetch(baseUrl, "/health");
    if (!health.ok) {
      await callback({
        text: `Controller at ${baseUrl} is not reachable. Start it with: npx claude-code-controller (use a different port if ElizaOS is on 3000). See docs/CLAUDE_CODE_CONTROLLER.md.`,
        actions: ["VINCE_CODE_TASK"],
      });
      return;
    }

    const sessionRes = await controllerFetch(baseUrl, "/session");
    if (!sessionRes.ok || !sessionRes.data) {
      const initRes = await controllerFetch(baseUrl, "/session/init", {
        method: "POST",
        body: JSON.stringify({ teamName: "vince", cwd: process.cwd() }),
      });
      if (!initRes.ok) {
        await callback({
          text: `Controller session init failed (${initRes.status}). Check controller logs.`,
          actions: ["VINCE_CODE_TASK"],
        });
        return;
      }
    }

    const agentsRes = await controllerFetch(baseUrl, "/agents");
    const agents =
      (agentsRes.data as { agents?: { name: string }[] })?.agents ?? [];
    const exists = agents.some((a: { name: string }) => a.name === agentName);
    if (!exists) {
      const spawnRes = await controllerFetch(baseUrl, "/agents", {
        method: "POST",
        body: JSON.stringify({ name: agentName, model: "sonnet" }),
      });
      if (!spawnRes.ok) {
        await callback({
          text: `Failed to spawn agent "${agentName}" (${spawnRes.status}). Check controller.`,
          actions: ["VINCE_CODE_TASK"],
        });
        return;
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }

    const sendRes = await controllerFetch(
      baseUrl,
      `/agents/${encodeURIComponent(agentName)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message: instruction }),
      },
    );
    if (!sendRes.ok) {
      await callback({
        text: `Failed to send message to agent (${sendRes.status}). Check controller.`,
        actions: ["VINCE_CODE_TASK"],
      });
      return;
    }

    const start = Date.now();
    let lastReply: string | null = null;
    while (Date.now() - start < TIMEOUT_MS) {
      const actionsRes = await controllerFetch(baseUrl, "/actions");
      const data = actionsRes.data as
        | {
            idleAgents?: { name: string }[];
          }
        | undefined;
      if (
        data?.idleAgents?.some((a: { name: string }) => a.name === agentName)
      ) {
        const agentRes = await controllerFetch(
          baseUrl,
          `/agents/${encodeURIComponent(agentName)}`,
        );
        const agentData = agentRes.data as { lastMessage?: string } | undefined;
        if (agentData?.lastMessage) {
          lastReply = agentData.lastMessage;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (lastReply) {
      await callback({
        text: `**Claude Code (${agentName})**\n\n${lastReply}`,
        actions: ["VINCE_CODE_TASK"],
      });
    } else {
      await callback({
        text: `Message sent to Claude Code agent "${agentName}". No reply within ${TIMEOUT_MS / 1000}s. Check the controller web dashboard for the agent's output.`,
        actions: ["VINCE_CODE_TASK"],
      });
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Run a code review on src/auth for security issues." },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll delegate that to Claude Code. Check the reply below or the controller dashboard.",
          actions: ["VINCE_CODE_TASK"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Refactor the options action to use less tokens." },
      },
      {
        name: "{{user2}}",
        content: {
          text: "Delegating to Claude Code for refactor. You'll get the agent's response here or in the dashboard.",
          actions: ["VINCE_CODE_TASK"],
        },
      },
    ],
  ],
};
