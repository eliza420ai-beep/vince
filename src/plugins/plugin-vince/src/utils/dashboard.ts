/**
 * Dashboard display helpers.
 * Dashboards are only printed for the VINCE agent to avoid duplicate output
 * when both VINCE and Eliza load plugin-vince (each agent gets its own service instance).
 */

import type { IAgentRuntime } from "@elizaos/core";

/**
 * Returns true if the current agent is VINCE. Use to skip printing terminal dashboards
 * when the plugin is loaded by another agent (e.g. Eliza) so dashboards don't appear twice.
 */
export function isVinceAgent(runtime: IAgentRuntime): boolean {
  const name = (runtime as { character?: { name?: string } }).character?.name;
  return name === "VINCE";
}
