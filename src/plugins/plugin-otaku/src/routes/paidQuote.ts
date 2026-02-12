/**
 * Paid Quote Route - x402 paywalled swap quote API
 *
 * GET /otaku/quote?sell=ETH&buy=USDC&amount=1&chain=base
 *
 * Returns swap quote without executing.
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

// Config
const X402_ENABLED = process.env.X402_ENABLED === "true";
const X402_NETWORK = process.env.X402_NETWORK || "base-sepolia";
const X402_PAY_TO = process.env.X402_PAY_TO || "";
const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Price: $0.02 per quote (20000 = 0.02 USDC)
const PRICE_QUOTE = BigInt(process.env.X402_PRICE_QUOTE || "20000");

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
async function handleQuote(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    const { sell, buy, amount, chain } = req.query as Record<string, string>;

    if (!sell || !buy || !amount) {
      res.status(400).json({
        success: false,
        error: "Missing required params: sell, buy, amount",
        example: "/otaku/quote?sell=ETH&buy=USDC&amount=1&chain=base",
      });
      return;
    }

    const chainId = chain || "base";

    // Try to get quote from BANKR or fallback to 0x/1inch
    const bankr = runtime.getService("bankr_agent") as {
      isConfigured?: () => boolean;
      getQuote?: (params: any) => Promise<any>;
    } | null;

    let quote: any = null;

    if (bankr?.isConfigured?.() && bankr?.getQuote) {
      quote = await bankr.getQuote({
        sellToken: sell.toUpperCase(),
        buyToken: buy.toUpperCase(),
        sellAmount: amount,
        chain: chainId,
      });
    }

    // Fallback: estimate based on market data
    if (!quote) {
      // Get price from CoinGecko via VINCE service if available
      const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
        getPrice?: (token: string) => Promise<number | null>;
      } | null;

      let sellPrice = 0;
      let buyPrice = 0;

      if (marketData?.getPrice) {
        sellPrice = (await marketData.getPrice(sell.toUpperCase())) ?? 0;
        buyPrice = (await marketData.getPrice(buy.toUpperCase())) ?? 0;
      }

      if (sellPrice > 0 && buyPrice > 0) {
        const sellValue = parseFloat(amount) * sellPrice;
        const buyAmount = sellValue / buyPrice;

        quote = {
          sellToken: sell.toUpperCase(),
          buyToken: buy.toUpperCase(),
          sellAmount: amount,
          buyAmount: buyAmount.toFixed(6),
          sellValueUsd: sellValue.toFixed(2),
          rate: (sellPrice / buyPrice).toFixed(6),
          source: "market-estimate",
          chain: chainId,
          warning: "Estimate only - actual swap may vary",
        };
      }
    }

    if (!quote) {
      res.status(503).json({
        success: false,
        error: "Unable to get quote - price data unavailable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...quote,
        timestamp: new Date().toISOString(),
        validFor: "30s",
      },
    });
  } catch (err) {
    logger.warn(`[Otaku] Quote route error: ${err}`);
    res.status(500).json({
      success: false,
      error: "Failed to get quote",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Wrapped handler
export const quoteHandler: RouteHandler = async (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> => {
  if (!X402_ENABLED || !X402_PAY_TO) {
    return handleQuote(req, res, runtime);
  }

  const createMiddleware = await getPaywallMiddleware();
  if (!createMiddleware) {
    return handleQuote(req, res, runtime);
  }

  const middleware = createMiddleware({
    network: X402_NETWORK,
    amount: PRICE_QUOTE,
    description: "Otaku swap quote - real-time pricing",
    mimeType: "application/json",
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: 300,
    facilitatorUrl: X402_FACILITATOR_URL,
  });

  let handlerCalled = false;
  const next = async () => {
    handlerCalled = true;
    await handleQuote(req, res, runtime);
  };

  await middleware(req as any, res as any, next);
};

export const quoteRoute = {
  name: "otaku-quote",
  path: "/otaku/quote",
  type: "GET" as const,
  handler: quoteHandler,
};
