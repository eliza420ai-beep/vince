/**
 * Dashboard display helpers.
 * Dashboards are only printed for the VINCE agent to avoid duplicate output
 * when both VINCE and Eliza load plugin-vince (each agent gets its own service instance).
 */

import type { IAgentRuntime } from "@elizaos/core";

function getCharacterName(runtime: IAgentRuntime): string | undefined {
  return (runtime as { character?: { name?: string } }).character?.name;
}

/**
 * Returns true if the current agent is VINCE. Use to skip printing terminal dashboards
 * when the plugin is loaded by another agent (e.g. Eliza) so dashboards don't appear twice.
 */
export function isVinceAgent(runtime: IAgentRuntime): boolean {
  return getCharacterName(runtime) === "VINCE";
}

/**
 * Returns true if the current agent is Eliza. Use to skip heavy startup work (API fetches,
 * cache fills) so we only run them once for VINCE and avoid 2x API/token cost.
 */
export function isElizaAgent(runtime: IAgentRuntime): boolean {
  return getCharacterName(runtime) === "Eliza";
}
