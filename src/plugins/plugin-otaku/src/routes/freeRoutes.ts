/**
 * Free Routes - No payment required
 *
 * GET /otaku/health - Service health status
 * GET /otaku/config - Runtime wallet mode
 * GET /otaku/alerts - Proactive alerts (Morpho, DCA, stop-loss) for notifications UI
 * GET /otaku/gas - Gas prices across chains
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getAlerts } from "../lib/getAlerts";
import { getNotificationEvents } from "../lib/notificationEvents";

export type { AlertItem } from "../lib/getAlerts";

type RouteHandler = (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Health Route
// ---------------------------------------------------------------------------

async function handleHealth(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  const services: Record<string, { available: boolean; configured?: boolean }> =
    {};

  // Check Otaku service
  const otakuSvc = runtime.getService("otaku");
  services.otaku = { available: !!otakuSvc };

  // Check BANKR
  const bankrAgent = runtime.getService("bankr_agent") as {
    isConfigured?: () => boolean;
  } | null;
  services.bankr = {
    available: !!bankrAgent,
    configured: bankrAgent?.isConfigured?.() ?? false,
  };

  // Check CDP wallet
  const cdp = runtime.getService("cdp");
  services.cdp = { available: !!cdp };

  // Check Morpho
  const morpho = runtime.getService("morpho");
  services.morpho = { available: !!morpho };

  // Check DefiLlama
  const defillama = runtime.getService("defillama");
  services.defillama = { available: !!defillama };

  // Check x402
  const x402Enabled = process.env.X402_ENABLED === "true";
  const x402PayTo = !!process.env.X402_PAY_TO?.trim();
  services.x402 = {
    available: x402Enabled && x402PayTo,
    configured: x402Enabled,
  };

  const allHealthy = Object.values(services).every((s) => s.available);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    services,
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
}

export const healthRoute = {
  name: "otaku-health",
  path: "/otaku/health",
  type: "GET" as const,
  public: true,
  handler: handleHealth,
};

// ---------------------------------------------------------------------------
// Config Route (runtime wallet mode for frontend)
// ---------------------------------------------------------------------------

async function handleConfig(
  _req: RouteRequest,
  res: RouteResponse,
  _runtime: IAgentRuntime,
): Promise<void> {
  const mode =
    (process.env.OTAKU_MODE ?? "degen").toLowerCase() === "normies"
      ? "normies"
      : "degen";
  res.status(200).json({ mode });
}

export const configRoute = {
  name: "otaku-config",
  path: "/otaku/config",
  type: "GET" as const,
  public: true,
  handler: handleConfig,
};

// ---------------------------------------------------------------------------
// Alerts Route (proactive alerts for notifications UI)
// ---------------------------------------------------------------------------

async function handleAlerts(
  _req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  const alerts = await getAlerts(runtime);
  res.status(200).json(alerts);
}

export const alertsRoute = {
  name: "otaku-alerts",
  path: "/otaku/alerts",
  type: "GET" as const,
  public: true,
  handler: handleAlerts,
};

// ---------------------------------------------------------------------------
// Notifications Route (completion events for notifications UI)
// ---------------------------------------------------------------------------

async function handleNotifications(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  const userId = (req.query?.userId ?? req.query?.entityId) as
    | string
    | undefined;
  const events = await getNotificationEvents(runtime, userId);
  res.status(200).json(events);
}

export const notificationsRoute = {
  name: "otaku-notifications",
  path: "/otaku/notifications",
  type: "GET" as const,
  public: true,
  handler: handleNotifications,
};

// ---------------------------------------------------------------------------
// Gas Route
// ---------------------------------------------------------------------------

interface GasPrice {
  chain: string;
  gasPrice: number;
  unit: string;
  usdCost?: number;
  speed: "slow" | "standard" | "fast";
}

async function handleGas(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  const gasPrices: GasPrice[] = [];

  // Fetch from multiple chains
  const chains = [
    { name: "ethereum", rpc: process.env.ETHEREUM_RPC_URL },
    { name: "base", rpc: process.env.BASE_RPC_URL },
    { name: "arbitrum", rpc: process.env.ARBITRUM_RPC_URL },
    { name: "polygon", rpc: process.env.POLYGON_RPC_URL },
    { name: "optimism", rpc: process.env.OPTIMISM_RPC_URL },
  ];

  for (const chain of chains) {
    if (!chain.rpc) continue;

    try {
      const res = await fetch(chain.rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_gasPrice",
          params: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const gasPriceWei = parseInt(data.result, 16);
        const gasPriceGwei = gasPriceWei / 1e9;

        gasPrices.push({
          chain: chain.name,
          gasPrice: Math.round(gasPriceGwei * 100) / 100,
          unit: "gwei",
          speed: "standard",
        });
      }
    } catch (err) {
      logger.debug(`[Otaku] Gas price fetch failed for ${chain.name}: ${err}`);
    }
  }

  // Fallback: use public gas trackers
  if (gasPrices.length === 0) {
    try {
      // Etherscan gas oracle (free tier)
      const ethRes = await fetch(
        "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
        { signal: AbortSignal.timeout(5000) },
      );
      if (ethRes.ok) {
        const data = await ethRes.json();
        if (data.result?.ProposeGasPrice) {
          gasPrices.push({
            chain: "ethereum",
            gasPrice: parseFloat(data.result.ProposeGasPrice),
            unit: "gwei",
            speed: "standard",
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  res.status(200).json({
    success: true,
    data: {
      gasPrices,
      timestamp: new Date().toISOString(),
    },
  });
}

export const gasRoute = {
  name: "otaku-gas",
  path: "/otaku/gas",
  type: "GET" as const,
  public: true,
  handler: handleGas,
};
