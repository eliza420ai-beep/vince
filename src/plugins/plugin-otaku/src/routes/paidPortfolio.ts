/**
 * Paid Portfolio Route - x402 paywalled full portfolio visualization
 *
 * GET /otaku/portfolio
 *
 * Comprehensive portfolio view:
 * - Token balances with USD values
 * - NFT holdings
 * - DeFi positions (Morpho, Aave, etc.)
 * - Active orders (BANKR)
 * - Historical performance
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type {
  CdpService,
  MorphoService,
  BankrOrdersService,
} from "../types/services";

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

// Portfolio response types
interface TokenBalance {
  token: string;
  symbol: string;
  balance: string;
  usdValue: number;
  chain: string;
  logo?: string;
}

interface NftHolding {
  collection: string;
  tokenId: string;
  name?: string;
  image?: string;
  chain: string;
  floorPrice?: number;
}

interface DefiPosition {
  protocol: string;
  type: "supply" | "borrow" | "stake" | "lp";
  asset: string;
  amount: string;
  usdValue: number;
  apy?: number;
  healthFactor?: number;
  chain: string;
}

interface ActiveOrder {
  orderId: string;
  type: string;
  pair: string;
  side: "buy" | "sell";
  amount: string;
  price?: string;
  status: string;
}

interface PortfolioSummary {
  totalUsdValue: number;
  change24h?: number;
  changePercent24h?: number;
  breakdown: {
    tokens: number;
    nfts: number;
    defi: number;
  };
}

interface PortfolioResponse {
  wallet: string;
  summary: PortfolioSummary;
  tokens: TokenBalance[];
  nfts: NftHolding[];
  defi: DefiPosition[];
  orders: ActiveOrder[];
  timestamp: string;
}

// Config
const X402_ENABLED = process.env.X402_ENABLED === "true";
const X402_NETWORK = process.env.X402_NETWORK || "base-sepolia";
const X402_PAY_TO = process.env.X402_PAY_TO || "";
const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Price: $0.25 per full portfolio (250000 = 0.25 USDC)
const PRICE_PORTFOLIO = BigInt(process.env.X402_PRICE_PORTFOLIO || "250000");

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
async function handlePortfolio(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    const portfolio: PortfolioResponse = {
      wallet: "",
      summary: {
        totalUsdValue: 0,
        breakdown: { tokens: 0, nfts: 0, defi: 0 },
      },
      tokens: [],
      nfts: [],
      defi: [],
      orders: [],
      timestamp: new Date().toISOString(),
    };

    const cdpService = runtime.getService("cdp") as CdpService | null;

    if (cdpService?.getWalletAddress) {
      portfolio.wallet = await cdpService.getWalletAddress();
    }

    if (!portfolio.wallet) {
      res.status(503).json({
        success: false,
        error: "Wallet not configured",
      });
      return;
    }

    // Token balances
    if (cdpService?.getBalances) {
      try {
        const balances = await cdpService.getBalances();
        portfolio.tokens = balances.map((b) => ({
          token: b.contract ?? b.address ?? "",
          symbol: b.symbol ?? b.token ?? "",
          balance: b.balance ?? b.amount ?? "",
          usdValue: b.usdValue ?? 0,
          chain: b.chain || "base",
          logo: b.logo ?? "",
        }));
        portfolio.summary.breakdown.tokens = portfolio.tokens.reduce(
          (sum, t) => sum + t.usdValue,
          0,
        );
      } catch (err) {
        logger.debug(`[Otaku] Token balance fetch failed: ${err}`);
      }
    }

    // NFT holdings
    if (cdpService?.getNfts) {
      try {
        const nfts = await cdpService.getNfts();
        portfolio.nfts = nfts.slice(0, 50).map((n) => ({
          collection: n.collection ?? n.contractAddress ?? "",
          tokenId: n.tokenId ?? n.id ?? "",
          name: n.name ?? "",
          image: n.image ?? n.imageUrl ?? "",
          chain: n.chain || "base",
          floorPrice: n.floorPrice ?? 0,
        }));
        portfolio.summary.breakdown.nfts = portfolio.nfts.reduce(
          (sum, n) => sum + (n.floorPrice || 0),
          0,
        );
      } catch (err) {
        logger.debug(`[Otaku] NFT fetch failed: ${err}`);
      }
    }

    const morphoService = runtime.getService("morpho") as MorphoService | null;

    if (morphoService?.getUserPositions) {
      try {
        const positions = await morphoService.getUserPositions(
          portfolio.wallet,
        );
        for (const p of positions || []) {
          portfolio.defi.push({
            protocol: "Morpho",
            type: (p.type || "supply") as "supply" | "borrow" | "stake" | "lp",
            asset: p.asset ?? p.token ?? "",
            amount: p.amount ?? p.balance ?? "",
            usdValue: p.usdValue ?? 0,
            apy: p.apy,
            healthFactor: p.healthFactor,
            chain: p.chain || "base",
          });
        }
      } catch (err) {
        logger.debug(`[Otaku] Morpho positions fetch failed: ${err}`);
      }
    }

    // 3. Try DefiLlama for additional positions
    try {
      const llamaRes = await fetch(
        `https://api.llama.fi/account/${portfolio.wallet}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (llamaRes.ok) {
        const data = await llamaRes.json();
        if (data.positions) {
          for (const p of data.positions.slice(0, 20)) {
            // Avoid duplicates from Morpho
            if (
              !portfolio.defi.some(
                (d) => d.protocol === p.protocol && d.asset === p.token,
              )
            ) {
              portfolio.defi.push({
                protocol: p.protocol,
                type: (p.type || "supply") as
                  | "supply"
                  | "borrow"
                  | "stake"
                  | "lp",
                asset: p.token ?? "",
                amount: p.balance ?? "",
                usdValue: p.balanceUsd ?? 0,
                apy: p.apy,
                chain: p.chain || "base",
              });
            }
          }
        }
      }
    } catch {
      // DefiLlama API may not be available
    }

    portfolio.summary.breakdown.defi = portfolio.defi.reduce(
      (sum, d) => sum + d.usdValue,
      0,
    );

    const bankrOrders = runtime.getService(
      "bankr_orders",
    ) as BankrOrdersService | null;

    if (bankrOrders?.getActiveOrders) {
      try {
        const orders = await bankrOrders.getActiveOrders();
        portfolio.orders = orders.slice(0, 20).map((o) => ({
          orderId: o.orderId,
          type: o.orderType ?? o.type ?? "limit",
          pair: `${o.sellToken}/${o.buyToken}`,
          side: (o.side ?? "sell") as "buy" | "sell",
          amount: o.sellAmount ?? o.amount ?? "",
          price: o.limitPrice ?? o.price ?? "",
          status: o.status,
        }));
      } catch (err) {
        logger.debug(`[Otaku] Orders fetch failed: ${err}`);
      }
    }

    // Calculate totals
    portfolio.summary.totalUsdValue =
      portfolio.summary.breakdown.tokens +
      portfolio.summary.breakdown.nfts +
      portfolio.summary.breakdown.defi;

    // 5. Try to get 24h change (from cached data or simple comparison)
    try {
      // This would require historical data tracking
      // For now, we'll skip 24h change
    } catch {
      // Skip
    }

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    logger.warn(`[Otaku] Portfolio route error: ${err}`);
    res.status(500).json({
      success: false,
      error: "Failed to build portfolio",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Wrapped handler
export const portfolioHandler: RouteHandler = async (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> => {
  if (!X402_ENABLED || !X402_PAY_TO) {
    return handlePortfolio(req, res, runtime);
  }

  const createMiddleware = await getPaywallMiddleware();
  if (!createMiddleware) {
    return handlePortfolio(req, res, runtime);
  }

  const middleware = createMiddleware({
    network: X402_NETWORK,
    amount: PRICE_PORTFOLIO,
    description: "Otaku full portfolio - tokens, NFTs, DeFi positions, orders",
    mimeType: "application/json",
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: 300,
    facilitatorUrl: X402_FACILITATOR_URL,
  });

  let handlerCalled = false;
  const next = async () => {
    handlerCalled = true;
    await handlePortfolio(req, res, runtime);
  };

  await middleware(req as any, res as any, next);
};

export const portfolioRoute = {
  name: "otaku-portfolio",
  path: "/otaku/portfolio",
  type: "GET" as const,
  handler: portfolioHandler,
};
