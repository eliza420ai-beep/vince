/**
 * OTAKU_EXECUTION_RISK — Show cooldown / hard-stop state, or reset after operator review.
 */

import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import {
  clearExecutionRiskState,
  formatExecutionRiskStatus,
} from "../lib/executionRisk";

export const otakuExecutionRiskAction: Action = {
  name: "OTAKU_EXECUTION_RISK",
  description:
    "Show Otaku BANKR execution risk (cooldown, hard stop). Reset with the exact phrase **otaku reset execution risk** after you fixed the underlying issue.",
  similes: ["OTAKU_RISK_STATUS", "EXECUTION_COOLDOWN", "OTAKU_COOLDOWN"],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Otaku execution risk" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Otaku execution risk** …",
          actions: ["OTAKU_EXECUTION_RISK"],
        },
      },
    ],
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const t = (message.content?.text ?? "").toLowerCase();
    if (t.includes("otaku reset execution risk")) return true;
    if (!t.includes("otaku")) return false;
    return (
      t.includes("execution risk") ||
      t.includes("risk cooldown") ||
      t.includes("cooldown") ||
      t.includes("hard stop")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const t = (message.content?.text ?? "").toLowerCase();
    if (t.includes("otaku reset execution risk")) {
      await clearExecutionRiskState(runtime);
      const status = await formatExecutionRiskStatus(runtime);
      await callback?.({
        text: `Execution risk state **cleared**.\n\n${status}`,
      });
      return { success: true };
    }

    const status = await formatExecutionRiskStatus(runtime);
    await callback?.({ text: status });
    return { success: true };
  },
};

export default otakuExecutionRiskAction;
