/**
 * Bankr Agent API types (from bankr-api-examples).
 * @see https://github.com/BankrBot/bankr-api-examples
 */
export interface PromptResponse {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface Transaction {
  type: string;
  metadata?: {
    transaction?: {
      chainId: number;
      to: string;
      data: string;
      gas?: string;
      value?: string;
    };
    humanReadableMessage?: string;
    inputTokenTicker?: string;
    outputTokenTicker?: string;
    inputTokenAmount?: string;
    outputTokenAmount?: string;
    [key: string]: unknown;
  };
}

export interface RichData {
  type: string;
  base64?: string;
  url?: string;
  [key: string]: unknown;
}

export interface StatusUpdate {
  message: string;
  timestamp: string;
}

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
  prompt: string;
  response?: string;
  transactions?: Transaction[];
  richData?: RichData[];
  statusUpdates?: StatusUpdate[];
  error?: string;
  createdAt: string;
  completedAt?: string;
  processingTime?: number;
  startedAt?: string;
  cancelledAt?: string;
  /** Whether the job can be cancelled (pending/processing). */
  cancellable?: boolean;
  threadId?: string;
}

/**
 * Bankr External Orders API types (from trading-engine-api-example).
 * @see https://github.com/BankrBot/trading-engine-api-example
 */
export interface QuoteRequest {
  maker: string;
  orderType: string;
  config: Record<string, unknown>;
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  slippageBps: number;
  expirationDate: number;
  appFeeBps?: number;
  appFeeRecipient?: string;
  allowPartial?: boolean;
}

export interface ApprovalAction {
  type: "approval";
  to: string;
  data: string;
  value?: string;
}

export interface OrderSignatureAction {
  type: "orderSignature";
  typedData: {
    domain: { name?: string; version?: string; chainId?: number; verifyingContract?: string };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
}

export type QuoteAction = ApprovalAction | OrderSignatureAction;

export interface QuoteResponse {
  quoteId: string;
  actions: QuoteAction[];
  metadata?: {
    sellToken?: { symbol?: string; decimals?: number };
    buyToken?: { symbol?: string; decimals?: number };
  };
}

export interface SubmitRequest {
  quoteId: string;
  orderSignature: string;
}

export interface ExternalOrder {
  orderId: string;
  status: string;
  maker: string;
  orderType: string;
  chainId?: number;
  sellToken?: string;
  buyToken?: string;
  sellAmount?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ListOrdersRequest {
  maker: string;
  chainId?: number;
  status?: string;
}

export interface ListOrdersResponse {
  orders?: ExternalOrder[];
  [key: string]: unknown;
}

export interface CancelOrderResponse {
  success?: boolean;
  [key: string]: unknown;
}

export interface GetOrderResponse {
  order?: ExternalOrder;
  [key: string]: unknown;
}

/** GET /agent/me — User Info (docs.bankr.bot/agent-api/user-info) */
export interface UserInfoWallet {
  chain: "evm" | "solana";
  address: string;
}

export interface UserInfoSocialAccount {
  platform: string;
  username?: string;
}

export interface UserInfoBankrClub {
  active: boolean;
  subscriptionType?: "monthly" | "yearly";
  renewOrCancelOn?: number;
}

export interface UserInfoLeaderboard {
  score: number;
  rank?: number;
}

export interface UserInfoResponse {
  success: boolean;
  wallets?: UserInfoWallet[];
  socialAccounts?: UserInfoSocialAccount[];
  refCode?: string;
  bankrClub?: UserInfoBankrClub;
  leaderboard?: UserInfoLeaderboard;
}

/** POST /agent/sign — synchronous signing (no job polling). API expects message | typedData | transaction per type. */
export type SignSignatureType = "personal_sign" | "eth_signTypedData_v4" | "eth_signTransaction";

export interface SignRequest {
  signatureType: SignSignatureType;
  /** Unified payload: string for personal_sign, EIP-712 object for eth_signTypedData_v4, tx object for eth_signTransaction. Service maps to API key (message | typedData | transaction). */
  payload?: Record<string, unknown> | string;
  /** Explicit fields for API: if set, used instead of payload. */
  message?: string;
  typedData?: Record<string, unknown>;
  transaction?: Record<string, unknown>;
}

export interface SignResponse {
  success: boolean;
  signature?: string;
  error?: string;
  message?: string;
}

/** POST /agent/submit — submit raw/signed transaction */
export interface SubmitTransactionRequest {
  /** Raw/signed transaction (hex or transaction object per Bankr API). */
  transaction: Record<string, unknown> | string;
  /** If true, wait for confirmation before returning. Default true per Bankr docs. */
  waitForConfirmation?: boolean;
  /** Human-readable description for logging (optional). */
  description?: string;
}

export interface SubmitTransactionResponse {
  success: boolean;
  /** Transaction hash (API returns transactionHash). */
  txHash?: string;
  transactionHash?: string;
  status?: string;
  blockNumber?: string;
  gasUsed?: string;
  signer?: string;
  chainId?: number;
  error?: string;
  message?: string;
}
