/**
 * OTAKU_RECONCILE — Post-trade / operator snapshot of BANKR portfolio text vs active orders.
 */

import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { OtakuService } from "../services/otaku.service";

export const otakuReconcileAction: Action = {
  name: "OTAKU_RECONCILE",
  description:
    "Reconcile Otaku view of portfolio and active BANKR orders with what you expect on-chain or on the exchange. Use after trades or when something looks off.",
  similes: [
    "RECONCILE_PORTFOLIO",
    "RECONCILE_ORDERS",
    "CHECK_OTAKU_SYNC",
    "PORTFOLIO_RECONCILE",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Otaku reconcile portfolio" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Here is the reconciliation snapshot…",
          actions: ["OTAKU_RECONCILE"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const t = (message.content?.text ?? "").toLowerCase();
    if (!t.includes("reconcile")) return false;
    const otaku = runtime.getService("otaku") as OtakuService | null;
    if (!otaku?.isBankrAvailable?.()) return false;
    return (
      t.includes("otaku") ||
      t.includes("portfolio") ||
      t.includes("positions") ||
      t.includes("orders") ||
      t.includes("wallet") ||
      t.includes("bankr")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const otaku = runtime.getService("otaku") as OtakuService | null;
    if (!otaku?.getReconciliationReport) {
      await callback?.({ text: "Otaku service not available." });
      return {
        success: false,
        error: new Error("Otaku service not available"),
      };
    }
    const report = await otaku.getReconciliationReport();
    await callback?.({ text: report });
    return { success: true };
  },
};

export default otakuReconcileAction;
