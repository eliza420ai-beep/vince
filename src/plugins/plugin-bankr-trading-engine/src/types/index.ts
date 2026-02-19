/**
 * BANKR Trading Engine API Types
 *
 * Direct programmatic trading without AI overhead.
 * Use for DCA, TWAP, scheduled orders, and high-frequency operations.
 *
 * API: https://api.bankr.bot/external-orders/v1
 */

// ============================================================================
// Order Configuration Types
// ============================================================================

export type OrderType =
  | "limit-buy"
  | "limit-sell"
  | "stop-buy"
  | "stop-sell"
  | "dca"
  | "twap";

export interface LimitOrderConfig {
  triggerPrice: string; // Decimal value as string
}

export interface StopOrderConfig {
  triggerPrice: string;
  trailing?: boolean;
}

export interface TimeIntervalOrderConfig {
  interval: number; // Seconds (min 300 = 5 minutes)
  maxExecutions: number; // Number of executions
}

export type OrderConfig =
  | LimitOrderConfig
  | StopOrderConfig
  | TimeIntervalOrderConfig;

// ============================================================================
// Quote Request/Response
// ============================================================================

export interface QuoteRequest {
  maker: string; // Wallet address placing the order
  orderType: OrderType;
  config: OrderConfig;
  chainId: number; // 8453 = Base, 1 = Ethereum
  sellToken: string; // Token address to sell
  buyToken: string; // Token address to buy
  sellAmount: string; // Raw units bigint string
  slippageBps: number; // e.g., 100 = 1%
  expirationDate: number; // Unix timestamp
  appFeeBps?: number; // Partner fee (e.g., 50 = 0.5%)
  appFeeRecipient?: string;
  allowPartial?: boolean;
}

export interface Amount {
  raw: string;
  formatted: string;
  usdValue?: number | null;
}

export interface TokenMetadata {
  address: string;
  symbol?: string;
  name?: string;
  image?: string;
  decimals: number;
  amount?: Amount | null;
}

export interface BuyTokenMetadata extends TokenMetadata {
  marketBuyAmount: Amount;
}

// EIP-712 Typed Data
export interface TypedDataDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

export interface OrderTypedData {
  domain: TypedDataDomain;
  types: {
    Order: Array<{ name: string; type: string }>;
  };
  primaryType: "Order";
  message: Record<string, unknown>;
}

export interface ApprovalAction {
  type: "approval";
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
}

export interface OrderSignatureAction {
  type: "orderSignature";
  typedData: OrderTypedData;
}

export type QuoteAction = ApprovalAction | OrderSignatureAction;

export interface QuoteResponse {
  quoteId: string;
  actions: QuoteAction[];
  metadata: {
    sellToken: TokenMetadata;
    buyToken: BuyTokenMetadata;
  };
}

// ============================================================================
// Order Submission
// ============================================================================

export interface SubmitRequest {
  quoteId: string;
  orderSignature: `0x${string}`;
}

export type OrderStatus =
  | "open"
  | "ready"
  | "pending"
  | "completed"
  | "cancelled"
  | "paused"
  | "expired"
  | "error";

export interface OrderFee {
  recipientType: "Bankr" | "App";
  feeBps: number;
  feeRecipient?: string;
}

export interface ExecutionHistoryEntry {
  executedAt: number;
  status: "success" | "failed" | "partial";
  output?: {
    txHash?: string;
    sellAmount?: Amount;
    buyAmount?: Amount;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface ProtocolData {
  protocol: string;
  protocolAddress: string;
  data: {
    order: Record<string, unknown>;
    orderSignature: string;
  };
}

export interface ExternalOrder {
  orderId: string;
  orderType: OrderType;
  chainArch: "EVM";
  chainId: number;
  sellToken: TokenMetadata;
  buyToken: TokenMetadata;
  slippageBps: number;
  createdAt: number;
  expiresAt: number;
  status: OrderStatus;
  fees?: OrderFee[];
  appFeeBps?: number;
  appFeeRecipient?: string;
  allowPartial?: boolean;
  config: OrderConfig;
  protocolData?: ProtocolData;
  totalSoldAmount?: Amount;
  totalReceivedAmount?: Amount;
  executionHistory?: ExecutionHistoryEntry[];
}

// ============================================================================
// List/Cancel Operations
// ============================================================================

export interface ListOrdersRequest {
  maker: string;
  type?: OrderType;
  status?: OrderStatus;
  cursor?: string;
}

export interface ListOrdersResponse {
  orders: ExternalOrder[];
  next?: string;
}

export interface CancelOrderResponse {
  status: string;
  success: boolean;
  error?: {
    type: string;
    message: string;
  };
}

// ============================================================================
// API Error
// ============================================================================

export interface ApiError {
  error: {
    type: string;
    message: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// High-Level Order Params (User-Friendly)
// ============================================================================

export interface LimitOrderParams {
  orderType: "limit-buy" | "limit-sell";
  sellToken: string;
  buyToken: string;
  amount: string; // Human-readable (e.g., "1000")
  triggerPrice: string; // Price at which order triggers
  expirationHours?: number;
  slippageBps?: number;
}

export interface DCAOrderParams {
  sellToken: string;
  buyToken: string;
  totalAmount: string; // Total to invest
  executionCount: number; // Number of buys
  intervalMinutes: number; // Time between buys (min 5)
  expirationHours?: number;
  slippageBps?: number;
}

export interface TWAPOrderParams {
  sellToken: string;
  buyToken: string;
  totalAmount: string;
  durationMinutes: number; // Total time to execute
  sliceCount: number; // Number of slices
  expirationHours?: number;
  slippageBps?: number;
}

export interface StopOrderParams {
  orderType: "stop-buy" | "stop-sell";
  sellToken: string;
  buyToken: string;
  amount: string;
  triggerPrice: string;
  trailing?: boolean;
  expirationHours?: number;
  slippageBps?: number;
}
