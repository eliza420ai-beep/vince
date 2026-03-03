import type {
  Action,
  IAgentRuntime,
  Memory,
  Provider,
  State,
} from "@elizaos/core";
import {
  addHeader,
  composeActionExamples,
  formatActionNames,
  logger,
} from "@elizaos/core";

interface ActionParameter {
  type: string;
  description: string;
  required: boolean;
}
/**
 * Formats actions with only name and description (no parameters).
 * Use this for a simpler view of available actions.
 */
function formatActionsWithoutParams(actions: Action[]): string {
  return actions
    .map((action) => {
      return `## ${action.name}\n${action.description}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Formats actions with their parameter schemas for tool calling.
 * This is an enhanced version that includes parameter information.
 */
function formatActionsWithParams(actions: Action[]): string {
  return actions
    .map((action: Action) => {
      let formatted = `## ${action.name}\n${action.description}`;

      // Check if action has parameters defined (array form from @elizaos/core)
      if (action.parameters !== undefined) {
        const arr = Array.isArray(action.parameters)
          ? (action.parameters as Array<{
              name: string;
              description: string;
              required?: boolean;
              schema?: { type?: string };
            }>)
          : Object.entries(
              action.parameters as Record<string, ActionParameter>,
            ).map(([name, def]) => ({
              name,
              description: def.description,
              required: def.required,
              schema: { type: def.type },
            }));

        if (arr.length === 0) {
          formatted +=
            "\n\n**Parameters:** None (can be called directly without parameters)";
        } else {
          formatted += "\n\n**Parameters:**";
          for (const p of arr) {
            const typeStr = p.schema?.type ?? "string";
            const required = p.required ? "(required)" : "(optional)";
            formatted += `\n- \`${p.name}\` ${required}: ${typeStr} - ${p.description}`;
          }
        }
      }

      return formatted;
    })
    .join("\n\n---\n\n");
}

/**
 * A provider object that fetches possible response actions based on the provided runtime, message, and state.
 * @type {Provider}
 * @property {string} name - The name of the provider ("ACTIONS").
 * @property {string} description - The description of the provider ("Possible response actions").
 * @property {number} position - The position of the provider (-1).
 * @property {Function} get - Asynchronous function that retrieves actions that validate for the given message.
 * @param {IAgentRuntime} runtime - The runtime object.
 * @param {Memory} message - The message memory.
 * @param {State} state - The state object.
 * @returns {Object} An object containing the actions data, values, and combined text sections.
 */
/**
 * Provider for ACTIONS
 *
 * @typedef {import('./Provider').Provider} Provider
 * @typedef {import('./Runtime').IAgentRuntime} IAgentRuntime
 * @typedef {import('./Memory').Memory} Memory
 * @typedef {import('./State').State} State
 * @typedef {import('./Action').Action} Action
 *
 * @type {Provider}
 * @property {string} name - The name of the provider
 * @property {string} description - Description of the provider
 * @property {number} position - The position of the provider
 * @property {Function} get - Asynchronous function to get actions that validate for a given message
 *
 * @param {IAgentRuntime} runtime - The agent runtime
 * @param {Memory} message - The message memory
 * @param {State} state - The state of the agent
 * @returns {Object} Object containing data, values, and text related to actions
 */
export const actionsProvider: Provider = {
  name: "ACTIONS",
  description: "Possible response actions",
  position: -1,
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    // Get actions that validate for this message
    const actionPromises = runtime.actions.map(async (action: Action) => {
      try {
        const result = await action.validate(runtime, message, state);
        if (result) {
          return action;
        }
      } catch (e) {
        logger.error(
          { action: action?.name, err: e },
          "ACTIONS GET -> validate err",
        );
      }
      return null;
    });

    const resolvedActions = await Promise.all(actionPromises);

    const actionsData = resolvedActions.filter(Boolean) as Action[];

    // Format action-related texts
    const actionNames = `Possible response actions: ${formatActionNames(actionsData)}`;

    // Actions with only descriptions (no parameters)
    const actionsWithDescriptions =
      actionsData.length > 0
        ? addHeader(
            "# Available Actions",
            formatActionsWithoutParams(actionsData),
          )
        : "";

    // Actions with full parameter schemas
    const actionsWithParams =
      actionsData.length > 0
        ? addHeader(
            "# Available Actions (List of callable tools/functions the assistant can execute)",
            formatActionsWithParams(actionsData),
          )
        : "";

    const actionExamples =
      actionsData.length > 0
        ? addHeader("# Action Examples", composeActionExamples(actionsData, 10))
        : "";

    const data = {
      actionsData,
    };

    const values = {
      actionNames,
      actionExamples,
      actionsWithDescriptions,
      actionsWithParams,
    };

    // Combine all text sections - now including actionsWithDescriptions
    const text = [actionNames, actionsWithDescriptions, actionExamples]
      .filter(Boolean)
      .join("\n\n");

    return {
      data,
      values,
      text,
    };
  },
};
