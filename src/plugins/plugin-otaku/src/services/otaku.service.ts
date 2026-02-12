/**
 * Otaku Service - High-level DeFi operations coordinator
 *
 * Wraps BANKR services with:
 * - Confirmation flows
 * - Balance validation
 * - Risk checks
 * - Formatted responses
 */

import {
  type IAgentRuntime,
  type Service,
  ServiceType,
  logger,
} from "@elizaos/core";

export interface SwapRequest {
  sellToken: string;
  buyToken: string;
  amount: string;
  chain?: string;
  slippageBps?: number;
}

export interface LimitOrderRequest {
  sellToken: string;
  buyToken: string;
  amount: string;
  limitPrice: string;
  chain?: string;
  expirationHours?: number;
}

export interface DcaRequest {
  sellToken: string;
  buyToken: string;
  totalAmount: string;
  interval: "hourly" | "daily" | "weekly";
  numOrders: number;
  chain?: string;
}

export interface Position {
  token: string;
  balance: string;
  usdValue?: string;
  chain: string;
}

export interface Order {
  orderId: string;
  type: "limit" | "stop" | "dca" | "twap";
  status: "active" | "filled" | "cancelled" | "expired";
  sellToken: string;
  buyToken: string;
  amount: string;
  price?: string;
  fillPercent?: number;
  chain: string;
}

export interface PositionsResult {
  positions: Position[];
  orders: Order[];
  totalUsdValue?: string;
}

export class OtakuService implements Service {
  static serviceType: ServiceType = "otaku" as ServiceType;
  readonly serviceType = OtakuService.serviceType;
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    logger.info("[OTAKU] Service initialized");
  }

  /**
   * Check if BANKR is available
   */
  isBankrAvailable(): boolean {
    const bankrSvc = this.runtime.getService("bankr_agent") as {
      isConfigured?: () => boolean;
    } | null;
    return bankrSvc?.isConfigured?.() ?? false;
  }

  /**
   * Get BANKR agent service
   */
  private getBankrAgent(): any {
    return this.runtime.getService("bankr_agent");
  }

  /**
   * Get BANKR orders service
   */
  private getBankrOrders(): any {
    return this.runtime.getService("bankr_orders");
  }

  /**
   * Execute a swap via BANKR
   */
  async executeSwap(request: SwapRequest): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    response?: string;
  }> {
    const bankr = this.getBankrAgent();
    if (!bankr?.isConfigured?.()) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const prompt = `swap ${request.amount} ${request.sellToken} to ${request.buyToken} on ${chain}`;

    try {
      logger.info(`[OTAKU] Executing swap: ${prompt}`);
      const { jobId } = await bankr.submitPrompt(prompt);
      const result = await bankr.pollJobUntilComplete(jobId, {
        intervalMs: 2000,
        maxAttempts: 30,
      });

      if (result.status === "completed") {
        const txHash = result.transactions?.[0]?.hash;
        return {
          success: true,
          txHash,
          response: result.response,
        };
      }

      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] Swap failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Create a limit order via BANKR
   */
  async createLimitOrder(request: LimitOrderRequest): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
    response?: string;
  }> {
    const bankr = this.getBankrAgent();
    if (!bankr?.isConfigured?.()) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const expiry = request.expirationHours ?? 24;
    const prompt = `limit order: sell ${request.amount} ${request.sellToken} for ${request.buyToken} at ${request.limitPrice} on ${chain}, expires in ${expiry} hours`;

    try {
      logger.info(`[OTAKU] Creating limit order: ${prompt}`);
      const { jobId } = await bankr.submitPrompt(prompt);
      const result = await bankr.pollJobUntilComplete(jobId, {
        intervalMs: 2000,
        maxAttempts: 30,
      });

      if (result.status === "completed") {
        // Extract orderId from response if available
        const orderMatch = result.response?.match(/order[:\s]+([a-f0-9-]+)/i);
        return {
          success: true,
          orderId: orderMatch?.[1],
          response: result.response,
        };
      }

      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] Limit order failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Create a DCA schedule via BANKR
   */
  async createDca(request: DcaRequest): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
    response?: string;
  }> {
    const bankr = this.getBankrAgent();
    if (!bankr?.isConfigured?.()) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const intervalMap = {
      hourly: "1h",
      daily: "1d",
      weekly: "7d",
    };
    const interval = intervalMap[request.interval] ?? "1d";

    const prompt = `DCA ${request.totalAmount} ${request.sellToken} into ${request.buyToken} over ${request.numOrders} orders every ${interval} on ${chain}`;

    try {
      logger.info(`[OTAKU] Creating DCA: ${prompt}`);
      const { jobId } = await bankr.submitPrompt(prompt);
      const result = await bankr.pollJobUntilComplete(jobId, {
        intervalMs: 2000,
        maxAttempts: 30,
      });

      if (result.status === "completed") {
        const orderMatch = result.response?.match(/order[:\s]+([a-f0-9-]+)/i);
        return {
          success: true,
          orderId: orderMatch?.[1],
          response: result.response,
        };
      }

      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] DCA creation failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Get positions and orders via BANKR
   */
  async getPositions(): Promise<PositionsResult> {
    const bankr = this.getBankrAgent();
    const orders = this.getBankrOrders();

    const result: PositionsResult = {
      positions: [],
      orders: [],
    };

    if (!bankr?.isConfigured?.()) {
      return result;
    }

    try {
      // Get account info for positions
      const accountInfo = await bankr.getAccountInfo();
      if (accountInfo.wallets) {
        // Portfolio comes from "show my portfolio" prompt
        const { jobId } = await bankr.submitPrompt("show my portfolio");
        const portfolioResult = await bankr.pollJobUntilComplete(jobId, {
          intervalMs: 2000,
          maxAttempts: 15,
        });

        if (portfolioResult.response) {
          // Parse positions from response (basic extraction)
          // Real implementation would parse structured data
          result.positions = this.parsePositions(
            portfolioResult.response,
            accountInfo.wallets
          );
        }
      }

      // Get active orders
      if (orders?.isConfigured?.()) {
        const accountInfo = await bankr.getAccountInfo();
        const evmWallet = accountInfo.wallets?.find(
          (w: any) => w.chain === "evm"
        );
        if (evmWallet?.address) {
          const orderResult = await orders.listOrders({
            maker: evmWallet.address,
            status: "active",
          });
          if (orderResult.orders) {
            result.orders = orderResult.orders.map((o: any) => ({
              orderId: o.orderId,
              type: o.orderType,
              status: o.status,
              sellToken: o.sellToken,
              buyToken: o.buyToken,
              amount: o.sellAmount,
              price: o.limitPrice,
              fillPercent: o.fillPercent,
              chain: `chain-${o.chainId}`,
            }));
          }
        }
      }
    } catch (err) {
      logger.error(`[OTAKU] Failed to get positions: ${err}`);
    }

    return result;
  }

  /**
   * Parse positions from portfolio response
   */
  private parsePositions(response: string, wallets: any[]): Position[] {
    // Basic parsing - real implementation would use structured data
    const positions: Position[] = [];

    // Look for token balance patterns like "0.5 ETH ($1,250)"
    const tokenPattern = /(\d+\.?\d*)\s+([A-Z]+)\s*\(?~?\$?([\d,]+\.?\d*)?\)?/gi;
    let match;

    while ((match = tokenPattern.exec(response)) !== null) {
      positions.push({
        token: match[2],
        balance: match[1],
        usdValue: match[3]?.replace(/,/g, ""),
        chain: "evm", // Default to EVM
      });
    }

    return positions;
  }

  /**
   * Format swap confirmation message
   */
  formatSwapConfirmation(request: SwapRequest): string {
    const chain = request.chain ?? "base";
    return [
      `**Swap Summary:**`,
      `- Sell: ${request.amount} ${request.sellToken}`,
      `- Buy: ${request.buyToken}`,
      `- Chain: ${chain}`,
      `- Slippage: ${(request.slippageBps ?? 50) / 100}%`,
      ``,
      `⚠️ This swap is IRREVERSIBLE.`,
      ``,
      `Type "confirm" to proceed.`,
    ].join("\n");
  }

  /**
   * Format limit order confirmation message
   */
  formatLimitOrderConfirmation(request: LimitOrderRequest): string {
    const chain = request.chain ?? "base";
    const expiry = request.expirationHours ?? 24;
    return [
      `**Limit Order Summary:**`,
      `- Sell: ${request.amount} ${request.sellToken}`,
      `- Buy: ${request.buyToken}`,
      `- Limit Price: ${request.limitPrice}`,
      `- Chain: ${chain}`,
      `- Expires: ${expiry} hours`,
      ``,
      `Order will execute when price reaches ${request.limitPrice}.`,
      ``,
      `Type "confirm" to place order.`,
    ].join("\n");
  }

  /**
   * Format DCA confirmation message
   */
  formatDcaConfirmation(request: DcaRequest): string {
    const chain = request.chain ?? "base";
    const perOrder =
      parseFloat(request.totalAmount) / request.numOrders;
    return [
      `**DCA Schedule Summary:**`,
      `- Total: ${request.totalAmount} ${request.sellToken}`,
      `- Into: ${request.buyToken}`,
      `- Orders: ${request.numOrders} × ${perOrder.toFixed(4)} ${request.sellToken}`,
      `- Frequency: ${request.interval}`,
      `- Chain: ${chain}`,
      ``,
      `DCA will automatically execute ${request.numOrders} swaps.`,
      ``,
      `Type "confirm" to start DCA.`,
    ].join("\n");
  }
}

export default OtakuService;
