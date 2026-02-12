/**
 * BANKR Trading Engine Service
 * 
 * Direct programmatic trading via BANKR's external orders API.
 * No AI overhead - perfect for DCA, TWAP, scheduled rebalancing.
 * 
 * Flow: Quote → Approve (if needed) → Sign EIP-712 → Submit
 */

import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import { createWalletClient, http, parseUnits, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, arbitrum } from "viem/chains";
import type {
  QuoteRequest,
  QuoteResponse,
  SubmitRequest,
  ExternalOrder,
  ListOrdersResponse,
  CancelOrderResponse,
  OrderType,
  LimitOrderParams,
  DCAOrderParams,
  TWAPOrderParams,
  StopOrderParams,
  ApprovalAction,
  OrderSignatureAction,
} from "../types";

const API_BASE_URL = "https://api.bankr.bot/external-orders/v1";

const CHAINS: Record<number, typeof base> = {
  8453: base,
  1: mainnet,
  42161: arbitrum,
};

// Token decimals lookup (extend as needed)
const TOKEN_DECIMALS: Record<string, number> = {
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": 6,  // USDC on Base
  "0x4200000000000000000000000000000000000006": 18, // WETH on Base
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": 6,  // USDC on Mainnet
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 18, // WETH on Mainnet
};

export class BankrTradingEngineService extends Service {
  static serviceType = "bankr_trading_engine" as const;

  private walletClient: WalletClient | null = null;
  private chainId: number;
  private appFeeBps: number;
  private appFeeRecipient: string | undefined;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.chainId = parseInt(
      (runtime.getSetting("BANKR_CHAIN_ID") as string) || "8453"
    );
    this.appFeeBps = parseInt(
      (runtime.getSetting("BANKR_APP_FEE_BPS") as string) || "0"
    );
    this.appFeeRecipient = runtime.getSetting("BANKR_APP_FEE_RECIPIENT") as string;
  }

  get capabilityDescription(): string {
    return "BANKR Trading Engine: Direct EIP-712 signed orders (limit, stop, DCA, TWAP) without AI overhead.";
  }

  static async start(runtime: IAgentRuntime): Promise<BankrTradingEngineService> {
    logger.info("[BANKR Trading Engine] Starting service");
    const service = new BankrTradingEngineService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[BANKR Trading Engine] Stopping service");
    this.walletClient = null;
  }

  isConfigured(): boolean {
    const key = this.runtime.getSetting("BANKR_PRIVATE_KEY") as string | undefined;
    return !!key?.trim();
  }

  private getWalletClient(): WalletClient {
    if (this.walletClient) return this.walletClient;

    const key = this.runtime.getSetting("BANKR_PRIVATE_KEY") as string | undefined;
    if (!key?.trim()) {
      throw new Error("BANKR_PRIVATE_KEY is not set");
    }

    const privateKey = key.trim() as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const chain = CHAINS[this.chainId] || base;

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    return this.walletClient;
  }

  private get makerAddress(): string {
    const wallet = this.getWalletClient();
    return wallet.account!.address;
  }

  // ============================================================================
  // API Helpers
  // ============================================================================

  private async apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    logger.debug(`[BANKR Trading Engine] ${options.method || "GET"} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || "API request failed";
      logger.error(`[BANKR Trading Engine] API error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return data;
  }

  private async createQuote(request: QuoteRequest): Promise<QuoteResponse> {
    return this.apiRequest<QuoteResponse>("/quote", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  private async submitOrder(request: SubmitRequest): Promise<ExternalOrder> {
    return this.apiRequest<ExternalOrder>("/submit", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ============================================================================
  // Order Execution Flow
  // ============================================================================

  private async executeOrderFlow(quoteRequest: QuoteRequest): Promise<ExternalOrder> {
    const wallet = this.getWalletClient();
    const account = wallet.account!;

    // 1. Get quote
    logger.info(`[BANKR Trading Engine] Creating quote for ${quoteRequest.orderType}`);
    const quote = await this.createQuote(quoteRequest);

    // 2. Handle approval if needed
    const approvalAction = quote.actions.find(
      (a): a is ApprovalAction => a.type === "approval"
    );

    if (approvalAction) {
      logger.info("[BANKR Trading Engine] Executing approval transaction");
      const txHash = await wallet.sendTransaction({
        to: approvalAction.to,
        data: approvalAction.data,
        value: approvalAction.value ? BigInt(approvalAction.value) : 0n,
      });
      logger.info(`[BANKR Trading Engine] Approval tx: ${txHash}`);
      // Note: In production, wait for confirmation
    }

    // 3. Sign EIP-712 order
    const signatureAction = quote.actions.find(
      (a): a is OrderSignatureAction => a.type === "orderSignature"
    );

    if (!signatureAction) {
      throw new Error("No order signature action in quote response");
    }

    logger.info("[BANKR Trading Engine] Signing EIP-712 order");
    const { typedData } = signatureAction;

    const signature = await wallet.signTypedData({
      account,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });

    // 4. Submit order
    logger.info("[BANKR Trading Engine] Submitting signed order");
    const order = await this.submitOrder({
      quoteId: quote.quoteId,
      orderSignature: signature,
    });

    logger.info(`[BANKR Trading Engine] Order created: ${order.orderId}`);
    return order;
  }

  // ============================================================================
  // Public Methods - High-Level Order Creation
  // ============================================================================

  /**
   * Create a limit order (buy low / sell high)
   */
  async createLimitOrder(params: LimitOrderParams): Promise<ExternalOrder> {
    const decimals = TOKEN_DECIMALS[params.sellToken] ?? 18;
    const sellAmountRaw = parseUnits(params.amount, decimals).toString();
    const expirationDate = Math.floor(Date.now() / 1000) +
      (params.expirationHours ?? 24) * 3600;

    const request: QuoteRequest = {
      maker: this.makerAddress,
      orderType: params.orderType,
      config: { triggerPrice: params.triggerPrice },
      chainId: this.chainId,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountRaw,
      slippageBps: params.slippageBps ?? 100,
      expirationDate,
      ...(this.appFeeBps > 0 && { appFeeBps: this.appFeeBps }),
      ...(this.appFeeRecipient && { appFeeRecipient: this.appFeeRecipient }),
    };

    return this.executeOrderFlow(request);
  }

  /**
   * Create a DCA (Dollar Cost Average) order
   * Splits total amount into multiple buys at regular intervals
   */
  async createDCAOrder(params: DCAOrderParams): Promise<ExternalOrder> {
    const decimals = TOKEN_DECIMALS[params.sellToken] ?? 18;
    const sellAmountRaw = parseUnits(params.totalAmount, decimals).toString();
    const intervalSeconds = params.intervalMinutes * 60;
    const expirationDate = Math.floor(Date.now() / 1000) +
      (params.expirationHours ?? params.intervalMinutes * params.executionCount / 60 + 24) * 3600;

    if (intervalSeconds < 300) {
      throw new Error("Minimum interval is 5 minutes (300 seconds)");
    }

    const request: QuoteRequest = {
      maker: this.makerAddress,
      orderType: "dca",
      config: {
        interval: intervalSeconds,
        maxExecutions: params.executionCount,
      },
      chainId: this.chainId,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountRaw,
      slippageBps: params.slippageBps ?? 100,
      expirationDate,
      ...(this.appFeeBps > 0 && { appFeeBps: this.appFeeBps }),
      ...(this.appFeeRecipient && { appFeeRecipient: this.appFeeRecipient }),
    };

    return this.executeOrderFlow(request);
  }

  /**
   * Create a TWAP (Time-Weighted Average Price) order
   * Executes in equal slices over a time period
   */
  async createTWAPOrder(params: TWAPOrderParams): Promise<ExternalOrder> {
    const decimals = TOKEN_DECIMALS[params.sellToken] ?? 18;
    const sellAmountRaw = parseUnits(params.totalAmount, decimals).toString();
    const intervalSeconds = Math.floor((params.durationMinutes * 60) / params.sliceCount);
    const expirationDate = Math.floor(Date.now() / 1000) +
      (params.expirationHours ?? params.durationMinutes / 60 + 24) * 3600;

    if (intervalSeconds < 300) {
      throw new Error("Calculated interval too short. Increase duration or reduce slice count.");
    }

    const request: QuoteRequest = {
      maker: this.makerAddress,
      orderType: "twap",
      config: {
        interval: intervalSeconds,
        maxExecutions: params.sliceCount,
      },
      chainId: this.chainId,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountRaw,
      slippageBps: params.slippageBps ?? 100,
      expirationDate,
      ...(this.appFeeBps > 0 && { appFeeBps: this.appFeeBps }),
      ...(this.appFeeRecipient && { appFeeRecipient: this.appFeeRecipient }),
    };

    return this.executeOrderFlow(request);
  }

  /**
   * Create a stop order (stop-loss / stop-buy)
   */
  async createStopOrder(params: StopOrderParams): Promise<ExternalOrder> {
    const decimals = TOKEN_DECIMALS[params.sellToken] ?? 18;
    const sellAmountRaw = parseUnits(params.amount, decimals).toString();
    const expirationDate = Math.floor(Date.now() / 1000) +
      (params.expirationHours ?? 168) * 3600; // 7 days default for stops

    const request: QuoteRequest = {
      maker: this.makerAddress,
      orderType: params.orderType,
      config: {
        triggerPrice: params.triggerPrice,
        trailing: params.trailing,
      },
      chainId: this.chainId,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountRaw,
      slippageBps: params.slippageBps ?? 200, // Higher slippage for stops
      expirationDate,
      ...(this.appFeeBps > 0 && { appFeeBps: this.appFeeBps }),
      ...(this.appFeeRecipient && { appFeeRecipient: this.appFeeRecipient }),
    };

    return this.executeOrderFlow(request);
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  /**
   * List orders for the connected wallet
   */
  async listOrders(options?: {
    type?: OrderType;
    status?: "open" | "completed" | "cancelled";
  }): Promise<ExternalOrder[]> {
    const response = await this.apiRequest<ListOrdersResponse>("/list", {
      method: "POST",
      body: JSON.stringify({
        maker: this.makerAddress,
        ...options,
      }),
    });
    return response.orders;
  }

  /**
   * Cancel an order (requires signature)
   */
  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const wallet = this.getWalletClient();
    const account = wallet.account!;

    // Sign cancellation message
    const message = `Cancel order ${orderId}`;
    const signature = await wallet.signMessage({
      account,
      message,
    });

    return this.apiRequest<CancelOrderResponse>(`/cancel/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<ExternalOrder | null> {
    try {
      const response = await this.apiRequest<{ order: ExternalOrder }>(
        `/${orderId}`
      );
      return response.order;
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return null;
      }
      throw error;
    }
  }
}

export default BankrTradingEngineService;
