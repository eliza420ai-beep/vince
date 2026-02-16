/**
 * Shared proactive alerts logic for Otaku.
 * Used by ProactiveAlertsProvider (agent context) and GET /otaku/alerts (HTTP API).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { CdpService, MorphoService, BankrOrdersService } from "../types/services";

export const MORPHO_HEALTH_WARN_THRESHOLD = 1.2;

export interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "morpho_warning" | "dca_active" | "stop_loss_active";
  time: number;
}

/**
 * Fetch proactive alerts (Morpho health, DCA/stop-loss counts) for the runtime's wallet.
 */
export async function getAlerts(runtime: IAgentRuntime): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const now = Date.now();

  const cdp = runtime.getService("cdp") as CdpService | null;
  const morpho = runtime.getService("morpho") as MorphoService | null;
  const bankrOrders = runtime.getService("bankr_orders") as BankrOrdersService | null;

  let address: string | undefined;
  if (cdp?.getWalletAddress) {
    try {
      address = await cdp.getWalletAddress();
    } catch (err) {
      logger.debug(`[getAlerts] getWalletAddress failed: ${err}`);
    }
  }

  if (morpho?.getUserPositions && address) {
    try {
      const positions = await morpho.getUserPositions(address);
      for (const p of positions ?? []) {
        const hf = p.healthFactor;
        if (hf != null && hf < MORPHO_HEALTH_WARN_THRESHOLD) {
          const asset = p.asset ?? p.token ?? "?";
          alerts.push({
            id: `morpho-${asset}-${p.chain ?? "mainnet"}`,
            title: `Morpho: low health factor`,
            subtitle: `${asset} health factor ${hf.toFixed(2)} (below ${MORPHO_HEALTH_WARN_THRESHOLD}). Consider topping up collateral.`,
            type: "morpho_warning",
            time: now,
          });
        }
      }
    } catch (err) {
      logger.debug(`[getAlerts] Morpho positions check failed: ${err}`);
    }
  }

  if (bankrOrders?.getActiveOrders ?? bankrOrders?.listOrders) {
    try {
      let orders: Array<{ orderType?: string; type?: string }> = [];
      if (bankrOrders.getActiveOrders) {
        orders = await bankrOrders.getActiveOrders();
      } else if (address && bankrOrders.listOrders) {
        const listRes = await bankrOrders.listOrders({ maker: address, status: "active" });
        orders = listRes.orders ?? [];
      }
      const stopOrders = orders.filter(
        (o) =>
          (o.orderType ?? o.type ?? "").toLowerCase().includes("stop") ||
          (o.orderType ?? o.type ?? "").toLowerCase().includes("sl"),
      );
      const dcaOrders = orders.filter(
        (o) => (o.orderType ?? o.type ?? "").toLowerCase().includes("dca"),
      );
      if (stopOrders.length > 0) {
        alerts.push({
          id: "stop-loss-active",
          title: `${stopOrders.length} active stop order(s)`,
          subtitle: "Monitor for triggers if price is volatile.",
          type: "stop_loss_active",
          time: now,
        });
      }
      if (dcaOrders.length > 0) {
        alerts.push({
          id: "dca-active",
          title: `${dcaOrders.length} active DCA order(s)`,
          subtitle: "In progress.",
          type: "dca_active",
          time: now,
        });
      }
    } catch (err) {
      logger.debug(`[getAlerts] Orders check failed: ${err}`);
    }
  }

  return alerts;
}
