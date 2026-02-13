import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import type {
  QuoteRequest,
  QuoteResponse,
  SubmitRequest,
  ExternalOrder,
  ListOrdersRequest,
  ListOrdersResponse,
  CancelOrderResponse,
  GetOrderResponse,
} from "../types";

const DEFAULT_ORDER_URL = "https://api.bankr.bot/trading/order";
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Bankr Orders API request timed out after ${timeoutMs}ms`);
    }
    throw e;
  }
}

export class BankrOrdersService extends Service {
  static serviceType = "bankr_orders" as const;

  private apiUrl: string;
  private apiKey: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.apiUrl = (runtime.getSetting("BANKR_ORDER_URL") as string) || process.env.BANKR_ORDER_URL || DEFAULT_ORDER_URL;
    this.apiKey = (runtime.getSetting("BANKR_API_KEY") as string)?.trim() || (process.env.BANKR_API_KEY as string)?.trim() || "";
  }

  get capabilityDescription(): string {
    return "Bankr External Orders: quote and manage limit, stop, DCA, and TWAP orders. Quote/list/status/cancel; submit requires EIP-712 signing (e.g. via Bankr Agent or wallet).";
  }

  static async start(runtime: IAgentRuntime): Promise<BankrOrdersService> {
    logger.info("[BANKR ORDERS] Starting Bankr Orders service");
    return new BankrOrdersService(runtime);
  }

  async stop(): Promise<void> {
    logger.info("[BANKR ORDERS] Stopping Bankr Orders service");
  }

  isConfigured(): boolean {
    return !!this.apiKey?.trim();
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.apiUrl.replace(/\/$/, "")}${path}`;
    const res = await fetchWithTimeout(
      url,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
          ...(init.headers as Record<string, string>),
        },
      }
    );
    const data = (await res.json()) as T & { error?: { message?: string }; message?: string };
    if (!res.ok) {
      const err = (data as { error?: { message?: string }; message?: string }).error?.message
        ?? (data as { message?: string }).message
        ?? "Bankr Orders API error";
      throw new Error(String(err));
    }
    return data as T;
  }

  async createQuote(request: QuoteRequest): Promise<QuoteResponse> {
    if (!this.isConfigured()) throw new Error("BANKR_API_KEY is not set");
    return this.request<QuoteResponse>("/quote", { method: "POST", body: JSON.stringify(request) });
  }

  async submitOrder(req: SubmitRequest): Promise<ExternalOrder> {
    if (!this.isConfigured()) throw new Error("BANKR_API_KEY is not set");
    const data = await this.request<{ order?: ExternalOrder } & Record<string, unknown>>("/submit", {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (data.order) return data.order;
    throw new Error("Submit response did not include order");
  }

  async listOrders(req: ListOrdersRequest): Promise<ListOrdersResponse> {
    if (!this.isConfigured()) throw new Error("BANKR_API_KEY is not set");
    return this.request<ListOrdersResponse>("/list", { method: "POST", body: JSON.stringify(req) });
  }

  async getOrder(orderId: string): Promise<ExternalOrder | null> {
    if (!this.isConfigured()) throw new Error("BANKR_API_KEY is not set");
    try {
      const data = await this.request<GetOrderResponse>(`/${orderId}`, { method: "GET" });
      return data.order ?? null;
    } catch (e) {
      if (String(e).includes("not found")) return null;
      throw e;
    }
  }

  async cancelOrder(orderId: string, signature: string): Promise<CancelOrderResponse> {
    if (!this.isConfigured()) throw new Error("BANKR_API_KEY is not set");
    return this.request<CancelOrderResponse>(`/cancel/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    });
  }
}
