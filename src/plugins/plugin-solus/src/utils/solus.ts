import type { IAgentRuntime } from "@elizaos/core";

/**
 * True when the runtime character is Solus (case-insensitive).
 */
export function isSolus(runtime: IAgentRuntime): boolean {
  return (runtime.character?.name ?? "").toUpperCase() === "SOLUS";
}
