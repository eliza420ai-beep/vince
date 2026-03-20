/**
 * Otaku Service - High-level DeFi operations coordinator
 *
 * Wraps BANKR services with:
 * - Confirmation flows
 * - Balance validation
 * - Risk checks
 * - Formatted responses
 */

import { type IAgentRuntime, Service, logger } from "@elizaos/core";
import type { BankrAgentService, BankrOrdersService } from "../types/services";
import {
  assertExecutionAllowed,
  recordExecutionFailure,
  recordExecutionSuccess,
} from "../lib/executionRisk";
import {
  type SwapOrderRouting,
  type LimitOrderRouting,
  swapPromptRoutingClause,
  limitOrderPromptRoutingClause,
} from "../lib/orderRouting";
import {
  type HlSidecarPerpsIntent,
  fetchHlSidecarReconcile,
  isHlSidecarConfigured,
  probeHlSidecarHealth,
  submitHlSidecarPerpsOrder,
} from "../lib/hlSidecar";

/** EVM (BANKR) vs HL perps sidecar — see docs/OTAKU_HL_SIDECAR.md */
export type OtakuExecutionVenue = "evm" | "hyperliquid_perps";

export type { HlSidecarPerpsIntent };

export interface SwapRequest {
  sellToken: string;
  buyToken: string;
  amount: string;
  chain?: string;
  slippageBps?: number;
  /** Maker/post-only vs aggressive — forwarded as BANKR prompt hints */
  routing?: SwapOrderRouting;
  /** Default `evm`. When `hyperliquid_perps`, requires `hlPerps` and `OTAKU_HL_SIDECAR_URL`. */
  executionVenue?: OtakuExecutionVenue;
  /** Required for `hyperliquid_perps` market-style perps orders. */
  hlPerps?: HlSidecarPerpsIntent;
}

export interface LimitOrderRequest {
  sellToken: string;
  buyToken: string;
  amount: string;
  limitPrice: string;
  chain?: string;
  expirationHours?: number;
  routing?: LimitOrderRouting;
  executionVenue?: OtakuExecutionVenue;
  /** Required for `hyperliquid_perps` limit perps (use `orderType: "limit"`, `limitPx`). */
  hlPerps?: HlSidecarPerpsIntent;
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

export class OtakuService extends Service {
  static serviceType = "otaku" as const;
  readonly serviceType = OtakuService.serviceType;

  get capabilityDescription(): string {
    return "Otaku: high-level DeFi operations (swaps, limit/DCA orders, positions, bridge, balance, stop-loss, Morpho, approvals, NFT mint) with confirmation flows and BANKR/CDP; optional Hyperliquid perps via HTTP sidecar.";
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<OtakuService> {
    const svc = new OtakuService(runtime);
    await svc.initialize();
    return svc;
  }

  async initialize(): Promise<void> {
    logger.info("[OTAKU] Service initialized");
  }

  async stop(): Promise<void> {
    logger.info("[OTAKU] Service stopping");
  }

  /**
   * Check if BANKR is available
   */
  isBankrAvailable(): boolean {
    const bankrSvc = this.runtime.getService(
      "bankr_agent",
    ) as BankrAgentService | null;
    return bankrSvc?.isConfigured?.() ?? false;
  }

  /** True when `OTAKU_HL_SIDECAR_URL` is set (runtime or env). */
  isHlSidecarConfigured(): boolean {
    return isHlSidecarConfigured(this.runtime);
  }

  /** Optional ops check: GET /healthz or /health on the sidecar. */
  async probeHlSidecarHealth(): Promise<{ ok: boolean; error?: string }> {
    return probeHlSidecarHealth(this.runtime);
  }

  /**
   * Get BANKR agent service
   */
  private getBankrAgent(): BankrAgentService | null {
    return this.runtime.getService("bankr_agent") as BankrAgentService | null;
  }

  /**
   * Get BANKR orders service
   */
  private getBankrOrders(): BankrOrdersService | null {
    return this.runtime.getService("bankr_orders") as BankrOrdersService | null;
  }

  private async gateBankrExecution(): Promise<{
    success: false;
    error: string;
  } | null> {
    const gate = await assertExecutionAllowed(this.runtime);
    if (gate.ok) return null;
    return { success: false, error: gate.reason };
  }

  /**
   * Post-trade snapshot: BANKR portfolio/orders + optional HL sidecar GET /v1/reconcile.
   */
  async getReconciliationReport(): Promise<string> {
    const blocks: string[] = [];

    try {
      const data = await this.getPositions();
      const posN = data.positions.length;
      const ordN = data.orders.length;
      const usd =
        data.totalUsdValue != null
          ? ` Total USD (if parsed): ${data.totalUsdValue}.`
          : "";
      blocks.push(
        [
          "**Reconciliation (Otaku / BANKR)**",
          `- Position lines parsed from portfolio text: **${posN}**`,
          `- Active orders (BANKR list): **${ordN}**`,
          `${usd}`,
          "If these counts disagree with the exchange UI, check BANKR sync or run another reconcile after the venue settles.",
        ].join("\n"),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      blocks.push(`**Reconciliation (Otaku / BANKR)**\nFetch failed: ${msg}`);
    }

    if (isHlSidecarConfigured(this.runtime)) {
      const hl = await fetchHlSidecarReconcile(this.runtime);
      if (hl.ok && hl.text?.trim()) {
        blocks.push(
          ["**Reconciliation (HL sidecar)**", hl.text.trim()].join("\n"),
        );
      } else if (hl.ok) {
        blocks.push(
          "**Reconciliation (HL sidecar)**\n(empty response — implement GET /v1/reconcile on the sidecar)",
        );
      } else {
        blocks.push(
          `**Reconciliation (HL sidecar)**\n${hl.error ?? "unavailable"} (optional: expose GET /v1/reconcile or GET /reconcile)`,
        );
      }
    }

    return blocks.join("\n\n---\n\n");
  }

  /**
   * Execute a swap via BANKR
   */
  async executeSwap(request: SwapRequest): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    response?: string;
    reconciliationSummary?: string;
  }> {
    const blocked = await this.gateBankrExecution();
    if (blocked) return blocked;

    const venue = request.executionVenue ?? "evm";
    if (venue === "hyperliquid_perps") {
      if (!request.hlPerps) {
        return {
          success: false,
          error:
            "hyperliquid_perps requires hlPerps: { coin, isBuy, size, orderType: 'market' | 'limit', limitPx? }",
        };
      }
      if (!isHlSidecarConfigured(this.runtime)) {
        return {
          success: false,
          error:
            "Hyperliquid sidecar not configured (set OTAKU_HL_SIDECAR_URL). See docs/OTAKU_HL_SIDECAR.md",
        };
      }
      const sidecar = await submitHlSidecarPerpsOrder(
        this.runtime,
        request.hlPerps,
      );
      if (!sidecar.ok) {
        await recordExecutionFailure(this.runtime);
        return {
          success: false,
          error: sidecar.error ?? "HL sidecar order failed",
          response:
            typeof sidecar.raw === "object"
              ? JSON.stringify(sidecar.raw)
              : undefined,
        };
      }
      await recordExecutionSuccess(this.runtime);
      let reconciliationSummary: string | undefined;
      if (
        String(
          this.runtime.getSetting("OTAKU_RECONCILE_AFTER_TRADE") ?? "true",
        ).toLowerCase() !== "false"
      ) {
        reconciliationSummary = await this.getReconciliationReport();
        logger.info(
          `[OTAKU] Post-HL-sidecar reconciliation:\n${reconciliationSummary}`,
        );
      }
      return {
        success: true,
        txHash: sidecar.orderId,
        response: sidecar.orderId
          ? `HL perps order accepted (id: ${sidecar.orderId})`
          : "HL perps order accepted",
        reconciliationSummary,
      };
    }

    const bankr = this.getBankrAgent();
    if (
      !bankr?.isConfigured?.() ||
      !bankr.submitPrompt ||
      !bankr.pollJobUntilComplete
    ) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const routingHint = swapPromptRoutingClause(request.routing);
    const prompt = `swap ${request.amount} ${request.sellToken} to ${request.buyToken} on ${chain}.${routingHint}`;

    try {
      logger.info(`[OTAKU] Executing swap: ${prompt}`);
      const { jobId } = await bankr.submitPrompt(prompt);
      const result = await bankr.pollJobUntilComplete(jobId, {
        intervalMs: 2000,
        maxAttempts: 30,
      });

      if (result.status === "completed") {
        const txHash = result.transactions?.[0]?.hash;
        await recordExecutionSuccess(this.runtime);
        let reconciliationSummary: string | undefined;
        if (
          String(
            this.runtime.getSetting("OTAKU_RECONCILE_AFTER_TRADE") ?? "true",
          ).toLowerCase() !== "false"
        ) {
          reconciliationSummary = await this.getReconciliationReport();
          logger.info(
            `[OTAKU] Post-swap reconciliation:\n${reconciliationSummary}`,
          );
        }
        return {
          success: true,
          txHash,
          response: result.response,
          reconciliationSummary,
        };
      }

      await recordExecutionFailure(this.runtime);
      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] Swap failed: ${msg}`);
      await recordExecutionFailure(this.runtime);
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
    reconciliationSummary?: string;
  }> {
    const blocked = await this.gateBankrExecution();
    if (blocked) return blocked;

    const venue = request.executionVenue ?? "evm";
    if (venue === "hyperliquid_perps") {
      const inferred: HlSidecarPerpsIntent = {
        coin: request.buyToken,
        isBuy: true,
        size: request.amount,
        orderType: "limit",
        limitPx: request.limitPrice,
      };
      const hl: HlSidecarPerpsIntent = request.hlPerps
        ? {
            ...request.hlPerps,
            limitPx:
              request.hlPerps.limitPx?.trim() ||
              request.limitPrice?.trim() ||
              "",
            orderType: request.hlPerps.orderType ?? "limit",
          }
        : inferred;
      if (!hl.coin?.trim() || !hl.size?.trim()) {
        return {
          success: false,
          error:
            "hyperliquid_perps limit order needs coin and size (pass hlPerps or buyToken/amount/limitPrice)",
        };
      }
      if (hl.orderType !== "limit") {
        return {
          success: false,
          error:
            "createLimitOrder hyperliquid_perps path only supports limit orders; use executeSwap(..., hlPerps orderType market) for market",
        };
      }
      if (!hl.limitPx?.trim()) {
        return {
          success: false,
          error:
            "hyperliquid_perps limit order requires limitPx (or limitPrice on the request)",
        };
      }
      if (!isHlSidecarConfigured(this.runtime)) {
        return {
          success: false,
          error:
            "Hyperliquid sidecar not configured (set OTAKU_HL_SIDECAR_URL). See docs/OTAKU_HL_SIDECAR.md",
        };
      }
      const sidecar = await submitHlSidecarPerpsOrder(this.runtime, hl);
      if (!sidecar.ok) {
        await recordExecutionFailure(this.runtime);
        return {
          success: false,
          error: sidecar.error ?? "HL sidecar limit failed",
          response:
            typeof sidecar.raw === "object"
              ? JSON.stringify(sidecar.raw)
              : undefined,
        };
      }
      await recordExecutionSuccess(this.runtime);
      let reconciliationSummary: string | undefined;
      if (
        String(
          this.runtime.getSetting("OTAKU_RECONCILE_AFTER_TRADE") ?? "true",
        ).toLowerCase() !== "false"
      ) {
        reconciliationSummary = await this.getReconciliationReport();
        logger.info(
          `[OTAKU] Post-HL-sidecar limit reconciliation:\n${reconciliationSummary}`,
        );
      }
      return {
        success: true,
        orderId: sidecar.orderId,
        response: sidecar.orderId
          ? `HL perps limit placed (id: ${sidecar.orderId})`
          : "HL perps limit placed",
        reconciliationSummary,
      };
    }

    const bankr = this.getBankrAgent();
    if (
      !bankr?.isConfigured?.() ||
      !bankr.submitPrompt ||
      !bankr.pollJobUntilComplete
    ) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const expiry = request.expirationHours ?? 24;
    const routingHint = limitOrderPromptRoutingClause(request.routing);
    const prompt = `limit order: sell ${request.amount} ${request.sellToken} for ${request.buyToken} at ${request.limitPrice} on ${chain}, expires in ${expiry} hours.${routingHint}`;

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
        await recordExecutionSuccess(this.runtime);
        let reconciliationSummary: string | undefined;
        if (
          String(
            this.runtime.getSetting("OTAKU_RECONCILE_AFTER_TRADE") ?? "true",
          ).toLowerCase() !== "false"
        ) {
          reconciliationSummary = await this.getReconciliationReport();
          logger.info(
            `[OTAKU] Post-limit reconciliation:\n${reconciliationSummary}`,
          );
        }
        return {
          success: true,
          orderId: orderMatch?.[1],
          response: result.response,
          reconciliationSummary,
        };
      }

      await recordExecutionFailure(this.runtime);
      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] Limit order failed: ${msg}`);
      await recordExecutionFailure(this.runtime);
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
    reconciliationSummary?: string;
  }> {
    const blocked = await this.gateBankrExecution();
    if (blocked) return blocked;

    const bankr = this.getBankrAgent();
    if (
      !bankr?.isConfigured?.() ||
      !bankr.submitPrompt ||
      !bankr.pollJobUntilComplete
    ) {
      return { success: false, error: "BANKR not configured" };
    }

    const chain = request.chain ?? "base";
    const intervalMap = {
      hourly: "1h",
      daily: "1d",
      weekly: "7d",
    };
    const interval = intervalMap[request.interval] ?? "1d";

    const prompt = `DCA ${request.totalAmount} ${request.sellToken} into ${request.buyToken} over ${request.numOrders} orders every ${interval} on ${chain}.${swapPromptRoutingClause(undefined)}`;

    try {
      logger.info(`[OTAKU] Creating DCA: ${prompt}`);
      const { jobId } = await bankr.submitPrompt(prompt);
      const result = await bankr.pollJobUntilComplete(jobId, {
        intervalMs: 2000,
        maxAttempts: 30,
      });

      if (result.status === "completed") {
        const orderMatch = result.response?.match(/order[:\s]+([a-f0-9-]+)/i);
        await recordExecutionSuccess(this.runtime);
        let reconciliationSummary: string | undefined;
        if (
          String(
            this.runtime.getSetting("OTAKU_RECONCILE_AFTER_TRADE") ?? "true",
          ).toLowerCase() !== "false"
        ) {
          reconciliationSummary = await this.getReconciliationReport();
          logger.info(
            `[OTAKU] Post-DCA reconciliation:\n${reconciliationSummary}`,
          );
        }
        return {
          success: true,
          orderId: orderMatch?.[1],
          response: result.response,
          reconciliationSummary,
        };
      }

      await recordExecutionFailure(this.runtime);
      return {
        success: false,
        error: result.error ?? `Job ended with status: ${result.status}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU] DCA creation failed: ${msg}`);
      await recordExecutionFailure(this.runtime);
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
    if (
      !bankr.getAccountInfo ||
      !bankr.submitPrompt ||
      !bankr.pollJobUntilComplete
    ) {
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
            accountInfo.wallets,
          );
        }
      }

      // Get active orders
      if (orders?.isConfigured?.()) {
        const accountInfo = await bankr.getAccountInfo!();
        const evmWallet = accountInfo.wallets?.find((w) => w.chain === "evm");
        if (evmWallet?.address) {
          const orderResult = await orders.listOrders!({
            maker: evmWallet.address,
            status: "active",
          });
          if (orderResult.orders) {
            result.orders = orderResult.orders.map((o) => ({
              orderId: o.orderId,
              type: (o.orderType ?? o.type ?? "limit") as
                | "stop"
                | "limit"
                | "dca"
                | "twap",
              status: o.status as "active" | "filled" | "cancelled" | "expired",
              sellToken: o.sellToken,
              buyToken: o.buyToken,
              amount: o.sellAmount ?? o.amount ?? "",
              price: o.limitPrice ?? o.price ?? "",
              fillPercent: o.fillPercent ?? 0,
              chain: `chain-${o.chainId ?? ""}`,
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
    const tokenPattern =
      /(\d+\.?\d*)\s+([A-Z]+)\s*\(?~?\$?([\d,]+\.?\d*)?\)?/gi;
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
    if (request.executionVenue === "hyperliquid_perps" && request.hlPerps) {
      const h = request.hlPerps;
      const side = h.isBuy ? "Long" : "Short";
      return [
        `**Hyperliquid perps (sidecar):**`,
        `- ${side} **${h.coin}** size **${h.size}** (${h.orderType})`,
        `- Venue: hyperliquid (keys in sidecar, not Eliza)`,
        ``,
        `⚠️ Perps are leveraged and can liquidate. Confirm you intend this size and direction.`,
        ``,
        `Type "confirm" to proceed.`,
      ].join("\n");
    }
    if (
      request.chain === "hyperliquid" ||
      request.executionVenue === "hyperliquid_perps"
    ) {
      return [
        `**Hyperliquid intent detected** but perps size/direction could not be inferred.`,
        `- Parsed: ${request.amount} ${request.sellToken} → ${request.buyToken}`,
        ``,
        `Try a clear stable pair, e.g. **0.01 BTC** vs **USDC** on hyperliquid, or say **long** / **short**.`,
        ``,
        `Type "confirm" only after fixing the instruction (or set Vince signal with hlPerps).`,
      ].join("\n");
    }

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
    if (request.executionVenue === "hyperliquid_perps" && request.hlPerps) {
      const h = request.hlPerps;
      const side = h.isBuy ? "Long" : "Short";
      const expiry = request.expirationHours ?? 24;
      return [
        `**Hyperliquid perps limit (sidecar):**`,
        `- ${side} **${h.coin}** size **${h.size}** @ **${h.limitPx ?? request.limitPrice}**`,
        `- Expires (info only for HL): ${expiry} hours`,
        ``,
        `Type "confirm" to place the limit on the sidecar.`,
      ].join("\n");
    }
    if (
      request.chain === "hyperliquid" ||
      request.executionVenue === "hyperliquid_perps"
    ) {
      return [
        `**Hyperliquid limit detected** but perps fields could not be inferred.`,
        `- Parsed: ${request.amount} ${request.sellToken} / ${request.buyToken} @ ${request.limitPrice}`,
        ``,
        `Use a stable collateral leg (e.g. buy **ETH** with **USDC** on hyperliquid) or pass explicit **long** / **short**.`,
        ``,
        `Type "confirm" only after fixing the instruction.`,
      ].join("\n");
    }

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
    const perOrder = parseFloat(request.totalAmount) / request.numOrders;
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
