/**
 * Paid Positions Route - x402 paywalled portfolio API
 *
 * GET /otaku/positions — Returns wallet positions (requires USDC payment)
 *
 * When X402_ENABLED=true, this route requires payment.
 * Free when x402 is disabled.
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteHandler = (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) => Promise<void>;

interface PaywallConfig {
  network: string;
  amount: bigint;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  facilitatorUrl: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const X402_ENABLED = process.env.X402_ENABLED === "true";
const X402_NETWORK = process.env.X402_NETWORK || "base-sepolia";
const X402_PAY_TO = process.env.X402_PAY_TO || "";
const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Price: $0.05 per positions query (50000 = 0.05 USDC in 6 decimals)
const PRICE_POSITIONS = BigInt(process.env.X402_PRICE_POSITIONS || "50000");

// ---------------------------------------------------------------------------
// Paywall middleware (lazy-loaded)
// ---------------------------------------------------------------------------

let createPaywallMiddleware: ((config: PaywallConfig) => any) | null = null;

async function getPaywallMiddleware(): Promise<typeof createPaywallMiddleware> {
  if (createPaywallMiddleware) return createPaywallMiddleware;

  try {
    const x402Module = await import("@elizaos/plugin-x402");
    createPaywallMiddleware = x402Module.createPaywallMiddleware;
    return createPaywallMiddleware;
  } catch (err) {
    logger.debug("[Otaku] x402 middleware not available:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Positions handler
// ---------------------------------------------------------------------------

async function handlePositions(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    // Get BANKR service for positions
    const bankrService = runtime.getService("bankr_orders") as {
      getActiveOrders?: () => Promise<any[]>;
    } | null;

    // Get wallet info from CDP if available
    const walletInfo: { address?: string; balances?: any[] } = {};

    // Try to get wallet address from CDP
    try {
      const cdpService = runtime.getService("cdp") as {
        getWalletAddress?: () => Promise<string>;
        getBalances?: () => Promise<any[]>;
      } | null;

      if (cdpService?.getWalletAddress) {
        walletInfo.address = await cdpService.getWalletAddress();
      }
      if (cdpService?.getBalances) {
        walletInfo.balances = await cdpService.getBalances();
      }
    } catch {
      // CDP not available
    }

    // Get active orders from BANKR
    let activeOrders: any[] = [];
    if (bankrService?.getActiveOrders) {
      activeOrders = await bankrService.getActiveOrders();
    }

    res.status(200).json({
      success: true,
      data: {
        wallet: walletInfo,
        activeOrders,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn(`[Otaku] Positions route error: ${err}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch positions",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Wrapped handler with x402 paywall
// ---------------------------------------------------------------------------

export const positionsHandler: RouteHandler = async (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> => {
  // If x402 not enabled, run handler directly
  if (!X402_ENABLED || !X402_PAY_TO) {
    return handlePositions(req, res, runtime);
  }

  const createMiddleware = await getPaywallMiddleware();

  if (!createMiddleware) {
    // Fallback: run without paywall
    return handlePositions(req, res, runtime);
  }

  const middleware = createMiddleware({
    network: X402_NETWORK,
    amount: PRICE_POSITIONS,
    description:
      "Otaku portfolio positions - wallet balances and active orders",
    mimeType: "application/json",
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: 300,
    facilitatorUrl: X402_FACILITATOR_URL,
  });

  let handlerCalled = false;
  const next = async () => {
    handlerCalled = true;
    await handlePositions(req, res, runtime);
  };

  await middleware(req as any, res as any, next);
};

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const positionsRoute = {
  name: "otaku-positions",
  path: "/otaku/positions",
  type: "GET" as const,
  handler: positionsHandler,
};
