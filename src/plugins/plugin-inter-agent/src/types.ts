/**
 * Typed elizaOS registry interface used by ASK_AGENT and standups.
 * Single source of truth for the in-process agent registry contract.
 */

import type { IAgentRuntime } from "@elizaos/core";

export interface ElizaOSAgentInfo {
  agentId: string;
  character?: { name?: string };
}

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

/** Runtime with optional elizaOS attachment (set by server when using in-process agents). */
interface RuntimeWithElizaOS extends IAgentRuntime {
  elizaOS?: IElizaOSRegistry;
}

/**
 * Get the in-process elizaOS registry from a runtime, if present.
 * Use this instead of inline casts in ASK_AGENT and standup code.
 */
export function getElizaOS(runtime: IAgentRuntime): IElizaOSRegistry | undefined {
  return (runtime as RuntimeWithElizaOS).elizaOS;
}
