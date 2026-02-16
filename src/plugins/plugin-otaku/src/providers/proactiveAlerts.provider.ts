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
import { logger } from "@elizaos/core";
import type { CdpService, MorphoService, BankrOrdersService } from "../types/services";

const MORPHO_HEALTH_WARN_THRESHOLD = 1.2;

export const proactiveAlertsProvider: Provider = {
  name: "OTAKU_PROACTIVE_ALERTS",
  description: "Liquidation risk, stop-loss proximity, DCA progress, and gas context",
  position: 10,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ) => {
    const lines: string[] = [];

    const cdp = runtime.getService("cdp") as CdpService | null;
    const morpho = runtime.getService("morpho") as MorphoService | null;
    const bankrOrders = runtime.getService("bankr_orders") as BankrOrdersService | null;

    if (morpho?.getUserPositions && cdp?.getWalletAddress) {
      try {
        const address = await cdp.getWalletAddress();
        if (address) {
          const positions = await morpho.getUserPositions(address);
          for (const p of positions ?? []) {
            const hf = p.healthFactor;
            if (hf != null && hf < MORPHO_HEALTH_WARN_THRESHOLD) {
              lines.push(
                `⚠️ **Morpho:** Position ${p.asset ?? p.token ?? "?"} health factor ${hf.toFixed(2)} (below ${MORPHO_HEALTH_WARN_THRESHOLD}). Consider topping up collateral.`
              );
            }
          }
        }
      } catch (err) {
        logger.debug(`[OTAKU_ALERTS] Morpho positions check failed: ${err}`);
      }
    }

    if (bankrOrders?.getActiveOrders ?? bankrOrders?.listOrders) {
      try {
        let orders: Array<{ orderType?: string; type?: string }> = [];
        if (bankrOrders.getActiveOrders) {
          orders = await bankrOrders.getActiveOrders();
        } else if (cdp?.getWalletAddress && bankrOrders.listOrders) {
          const address = await cdp.getWalletAddress();
          const res = await bankrOrders.listOrders({ maker: address, status: "active" });
          orders = res.orders ?? [];
        }
        const stopOrders = orders.filter(
          (o) =>
            (o.orderType ?? o.type ?? "").toLowerCase().includes("stop") ||
            (o.orderType ?? o.type ?? "").toLowerCase().includes("sl")
        );
        const dcaOrders = orders.filter(
          (o) => (o.orderType ?? o.type ?? "").toLowerCase().includes("dca")
        );
        if (stopOrders.length > 0) {
          lines.push(
            `📌 **Stop-loss:** ${stopOrders.length} active stop order(s). Monitor for triggers if price is volatile.`
          );
        }
        if (dcaOrders.length > 0) {
          lines.push(`📌 **DCA:** ${dcaOrders.length} active DCA order(s) in progress.`);
        }
      } catch (err) {
        logger.debug(`[OTAKU_ALERTS] Orders check failed: ${err}`);
      }
    }

    if (lines.length === 0) {
      return { text: "" };
    }

    const header = "## Proactive Alerts";
    return {
      text: [header, "", ...lines].join("\n"),
      values: { proactiveAlerts: lines },
    };
  },
};

export default proactiveAlertsProvider;
