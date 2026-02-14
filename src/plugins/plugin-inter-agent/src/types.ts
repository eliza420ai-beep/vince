/**
 * Typed elizaOS registry interface used by ASK_AGENT and standups.
 * Single source of truth for the in-process agent registry contract.
 */

import type { IAgentRuntime } from "@elizaos/core";

/** Minimal agent info returned by the registry. */
export interface ElizaOSAgentInfo {
  agentId: string;
  character?: { name?: string };
}

/** In-process agent registry: list agents and send messages to a target agent. */
export interface IElizaOSRegistry {
  getAgents(): ElizaOSAgentInfo[];
  getAgent?(id: string): IAgentRuntime | undefined;
  getAgentByName?(name: string): { agentId: string } | undefined;
  handleMessage(
    agentId: string,
    msg: unknown,
    opts?: {
      onResponse?: (content: unknown) => void | Promise<void>;
      onComplete?: () => void | Promise<void>;
      onError?: (err: Error) => void | Promise<void>;
    },
  ): Promise<unknown>;
}

/**
 * Returns the in-process elizaOS registry from a runtime, if present.
 * Use this instead of inline casts in ASK_AGENT and standup code.
 * When absent, ASK_AGENT and standup flows fall back to the job API or skip cross-agent calls.
 */
export function getElizaOS(runtime: IAgentRuntime): IElizaOSRegistry | undefined {
  return (runtime as { elizaOS?: IElizaOSRegistry }).elizaOS;
}
