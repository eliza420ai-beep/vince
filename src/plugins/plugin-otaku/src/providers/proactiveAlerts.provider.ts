/**
 * Proactive Alerts Provider
 *
 * Injects risk and progress warnings into Otaku context:
 * - Morpho liquidation risk (health factor)
 * - Stop-loss order count (monitor for triggers)
 * - DCA progress (active schedules)
 * - Optional gas note
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { getAlerts } from "../lib/getAlerts";

export const proactiveAlertsProvider: Provider = {
  name: "OTAKU_PROACTIVE_ALERTS",
  description: "Liquidation risk, stop-loss proximity, DCA progress, and gas context",
  position: 10,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ) => {
    const alerts = await getAlerts(runtime);
    if (alerts.length === 0) {
      return { text: "" };
    }

    const lines = alerts.map((a) => {
      if (a.type === "morpho_warning") {
        return `⚠️ **Morpho:** ${a.subtitle ?? a.title}`;
      }
      if (a.type === "stop_loss_active") {
        return `📌 **Stop-loss:** ${a.title}. ${a.subtitle ?? ""}`.trim();
      }
      if (a.type === "dca_active") {
        return `📌 **DCA:** ${a.title}. ${a.subtitle ?? ""}`.trim();
      }
      return `${a.title}${a.subtitle ? ` — ${a.subtitle}` : ""}`;
    });

    const header = "## Proactive Alerts";
    return {
      text: [header, "", ...lines].join("\n"),
      values: { proactiveAlerts: lines },
    };
  },
};

export default proactiveAlertsProvider;
