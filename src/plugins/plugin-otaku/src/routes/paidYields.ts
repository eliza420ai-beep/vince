/**
 * Paid Yields Route - x402 paywalled DeFi yields API
 *
 * GET /otaku/yields?token=USDC&chain=base&minApy=5
 *
 * Returns DeFi yield opportunities from DefiLlama + Morpho.
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";

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

interface YieldOpportunity {
  protocol: string;
  pool: string;
  token: string;
  chain: string;
  apy: number;
  tvl: number;
  risk: "low" | "medium" | "high";
  url?: string;
}

// Config
const X402_ENABLED = process.env.X402_ENABLED === "true";
const X402_NETWORK = process.env.X402_NETWORK || "base-sepolia";
const X402_PAY_TO = process.env.X402_PAY_TO || "";
const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Price: $0.10 per yields query (100000 = 0.10 USDC)
const PRICE_YIELDS = BigInt(process.env.X402_PRICE_YIELDS || "100000");

// Paywall middleware
let createPaywallMiddleware: ((config: PaywallConfig) => any) | null = null;

async function getPaywallMiddleware(): Promise<typeof createPaywallMiddleware> {
  if (createPaywallMiddleware) return createPaywallMiddleware;
  try {
    const x402Module = await import("@elizaos/plugin-x402");
    createPaywallMiddleware = x402Module.createPaywallMiddleware;
    return createPaywallMiddleware;
  } catch {
    return null;
  }
}

// Handler
async function handleYields(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    const { token, chain, minApy } = req.query as Record<string, string>;
    const minApyNum = parseFloat(minApy || "0");
    const chainFilter = chain?.toLowerCase();
    const tokenFilter = token?.toUpperCase();

    const opportunities: YieldOpportunity[] = [];

    // 1. Try DefiLlama yields API
    try {
      const llamaRes = await fetch("https://yields.llama.fi/pools", {
        signal: AbortSignal.timeout(10000),
      });

      if (llamaRes.ok) {
        const data = await llamaRes.json();
        const pools = data.data || [];

        // Filter and map top opportunities
        const filtered = pools
          .filter((p: any) => {
            if (p.apy < minApyNum) return false;
            if (chainFilter && p.chain?.toLowerCase() !== chainFilter)
              return false;
            if (tokenFilter && !p.symbol?.toUpperCase().includes(tokenFilter))
              return false;
            if (p.tvlUsd < 100000) return false; // Min $100k TVL
            return true;
          })
          .slice(0, 20)
          .map((p: any) => ({
            protocol: p.project,
            pool: p.symbol,
            token: p.symbol?.split("-")[0] || p.symbol,
            chain: p.chain,
            apy: Math.round(p.apy * 100) / 100,
            tvl: Math.round(p.tvlUsd),
            risk:
              p.ilRisk === "no" && p.apy < 20
                ? "low"
                : p.apy > 50
                  ? "high"
                  : "medium",
            url: p.url,
          }));

        opportunities.push(...filtered);
      }
    } catch (err) {
      logger.debug(`[Otaku] DefiLlama yields fetch failed: ${err}`);
    }

    // 2. Try Morpho markets if available
    const morphoService = runtime.getService("morpho") as {
      getMarkets?: () => Promise<any[]>;
    } | null;

    if (morphoService?.getMarkets) {
      try {
        const markets = await morphoService.getMarkets();
        const morphoYields = markets
          .filter((m: any) => {
            if (m.supplyApy < minApyNum) return false;
            if (tokenFilter && m.loanAsset?.toUpperCase() !== tokenFilter)
              return false;
            return true;
          })
          .slice(0, 10)
          .map((m: any) => ({
            protocol: "Morpho",
            pool: `${m.loanAsset}/${m.collateralAsset}`,
            token: m.loanAsset,
            chain: "base",
            apy: Math.round(m.supplyApy * 100) / 100,
            tvl: Math.round(m.totalSupplyUsd || 0),
            risk: "low" as const,
          }));

        opportunities.push(...morphoYields);
      } catch (err) {
        logger.debug(`[Otaku] Morpho markets fetch failed: ${err}`);
      }
    }

    // Sort by APY descending
    opportunities.sort((a, b) => b.apy - a.apy);

    res.status(200).json({
      success: true,
      data: {
        opportunities: opportunities.slice(0, 25),
        count: opportunities.length,
        filters: {
          token: tokenFilter || "all",
          chain: chainFilter || "all",
          minApy: minApyNum,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn(`[Otaku] Yields route error: ${err}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch yields",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Wrapped handler
export const yieldsHandler: RouteHandler = async (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> => {
  if (!X402_ENABLED || !X402_PAY_TO) {
    return handleYields(req, res, runtime);
  }

  const createMiddleware = await getPaywallMiddleware();
  if (!createMiddleware) {
    return handleYields(req, res, runtime);
  }

  const middleware = createMiddleware({
    network: X402_NETWORK,
    amount: PRICE_YIELDS,
    description: "Otaku DeFi yields - curated opportunities across protocols",
    mimeType: "application/json",
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: 300,
    facilitatorUrl: X402_FACILITATOR_URL,
  });

  let handlerCalled = false;
  const next = async () => {
    handlerCalled = true;
    await handleYields(req, res, runtime);
  };

  await middleware(req as any, res as any, next);
};

export const yieldsRoute = {
  name: "otaku-yields",
  path: "/otaku/yields",
  type: "GET" as const,
  handler: yieldsHandler,
};
