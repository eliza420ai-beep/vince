/**
 * Paid History Route - x402 paywalled transaction history API
 *
 * GET /otaku/history?limit=20&chain=base
 *
 * Returns recent transactions from the wallet.
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

interface Transaction {
  hash: string;
  type: "send" | "receive" | "swap" | "approve" | "contract";
  from: string;
  to: string;
  value?: string;
  token?: string;
  timestamp: string;
  status: "confirmed" | "pending" | "failed";
  chain: string;
}

// Config
const X402_ENABLED = process.env.X402_ENABLED === "true";
const X402_NETWORK = process.env.X402_NETWORK || "base-sepolia";
const X402_PAY_TO = process.env.X402_PAY_TO || "";
const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Price: $0.05 per history query (50000 = 0.05 USDC)
const PRICE_HISTORY = BigInt(process.env.X402_PRICE_HISTORY || "50000");

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
async function handleHistory(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    const { limit, chain } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit || "20", 10), 100);
    const chainFilter = chain?.toLowerCase() || "base";

    const transactions: Transaction[] = [];

    // Get wallet address from CDP
    const cdpService = runtime.getService("cdp") as {
      getWalletAddress?: () => Promise<string>;
    } | null;

    let walletAddress: string | undefined;
    if (cdpService?.getWalletAddress) {
      walletAddress = await cdpService.getWalletAddress();
    }

    if (!walletAddress) {
      res.status(503).json({
        success: false,
        error: "Wallet not configured",
      });
      return;
    }

    // Try to get transactions from Etherscan/Basescan
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const baseUrl =
      chainFilter === "base"
        ? "https://api.basescan.org/api"
        : chainFilter === "ethereum"
        ? "https://api.etherscan.io/api"
        : chainFilter === "arbitrum"
        ? "https://api.arbiscan.io/api"
        : chainFilter === "polygon"
        ? "https://api.polygonscan.com/api"
        : null;

    if (baseUrl) {
      try {
        const params = new URLSearchParams({
          module: "account",
          action: "txlist",
          address: walletAddress,
          startblock: "0",
          endblock: "99999999",
          page: "1",
          offset: String(limitNum),
          sort: "desc",
          ...(apiKey && { apikey: apiKey }),
        });

        const fetchRes = await fetch(`${baseUrl}?${params}`, {
          signal: AbortSignal.timeout(10000),
        });

        if (fetchRes.ok) {
          const data = await fetchRes.json();
          if (data.result && Array.isArray(data.result)) {
            for (const tx of data.result) {
              const isReceive =
                tx.to?.toLowerCase() === walletAddress.toLowerCase();
              transactions.push({
                hash: tx.hash,
                type: isReceive ? "receive" : tx.input === "0x" ? "send" : "contract",
                from: tx.from,
                to: tx.to,
                value: tx.value ? `${(parseInt(tx.value) / 1e18).toFixed(6)} ETH` : undefined,
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                status: tx.txreceipt_status === "1" ? "confirmed" : "failed",
                chain: chainFilter,
              });
            }
          }
        }
      } catch (err) {
        logger.debug(`[Otaku] Transaction fetch failed: ${err}`);
      }
    }

    // Also check x402 payment history if available
    const x402Service = runtime.getService("x402_payment") as {
      getRecentTransactions?: (limit: number) => Promise<any[]>;
    } | null;

    if (x402Service?.getRecentTransactions) {
      try {
        const x402Txs = await x402Service.getRecentTransactions(limitNum);
        // Add x402 transactions to the list
        for (const tx of x402Txs) {
          transactions.push({
            hash: tx.txHash || tx.id,
            type: tx.direction === "incoming" ? "receive" : "send",
            from: tx.direction === "incoming" ? tx.counterparty : walletAddress,
            to: tx.direction === "incoming" ? walletAddress : tx.counterparty,
            value: `${(Number(tx.amount) / 1e6).toFixed(2)} USDC`,
            token: "USDC",
            timestamp: tx.createdAt,
            status: tx.status === "confirmed" ? "confirmed" : "pending",
            chain: "base",
          });
        }
      } catch (err) {
        logger.debug(`[Otaku] x402 history fetch failed: ${err}`);
      }
    }

    // Sort by timestamp descending
    transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.status(200).json({
      success: true,
      data: {
        wallet: walletAddress,
        transactions: transactions.slice(0, limitNum),
        count: transactions.length,
        chain: chainFilter,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn(`[Otaku] History route error: ${err}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch history",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Wrapped handler
export const historyHandler: RouteHandler = async (
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
): Promise<void> => {
  if (!X402_ENABLED || !X402_PAY_TO) {
    return handleHistory(req, res, runtime);
  }

  const createMiddleware = await getPaywallMiddleware();
  if (!createMiddleware) {
    return handleHistory(req, res, runtime);
  }

  const middleware = createMiddleware({
    network: X402_NETWORK,
    amount: PRICE_HISTORY,
    description: "Otaku transaction history - recent wallet activity",
    mimeType: "application/json",
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: 300,
    facilitatorUrl: X402_FACILITATOR_URL,
  });

  let handlerCalled = false;
  const next = async () => {
    handlerCalled = true;
    await handleHistory(req, res, runtime);
  };

  await middleware(req as any, res as any, next);
};

export const historyRoute = {
  name: "otaku-history",
  path: "/otaku/history",
  type: "GET" as const,
  handler: historyHandler,
};
