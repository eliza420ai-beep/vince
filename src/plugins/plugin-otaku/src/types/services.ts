/**
 * Shared service interfaces for Otaku plugin.
 * Used to type runtime.getService() results and avoid inline casts.
 */

// ---------------------------------------------------------------------------
// CDP (Coinbase Developer Platform) wallet service
// ---------------------------------------------------------------------------

export interface CdpBalance {
  symbol?: string;
  token?: string;
  balance?: string;
  amount?: string;
  usdValue?: number;
  chain?: string;
  contract?: string;
  address?: string;
  logo?: string;
}

export interface CdpNft {
  collection?: string;
  contractAddress?: string;
  tokenId?: string;
  id?: string;
  name?: string;
  image?: string;
  imageUrl?: string;
  chain?: string;
  floorPrice?: number;
}

export interface CdpService {
  getWalletAddress?(): Promise<string>;
  getBalances?(): Promise<CdpBalance[]>;
  getNfts?(): Promise<CdpNft[]>;
  approve?(token: string, spender: string, amount: string): Promise<{ success?: boolean; txHash?: string; hash?: string }>;
  revoke?(token: string, spender: string): Promise<{ success?: boolean; txHash?: string; hash?: string }>;
  writeContract?(params: {
    address: `0x${string}`;
    abi: string[] | readonly unknown[];
    functionName: string;
    args?: unknown[];
    value?: bigint;
  }): Promise<{ success?: boolean; txHash?: string; hash?: string }>;
  sendTransaction?(params: unknown): Promise<{ success?: boolean; txHash?: string; hash?: string }>;
}

// ---------------------------------------------------------------------------
// BANKR agent service
// ---------------------------------------------------------------------------

export interface BankrAgentService {
  isConfigured?(): boolean;
  submitPrompt?(prompt: string): Promise<{ jobId: string }>;
  pollJobUntilComplete?(
    jobId: string,
    opts: { intervalMs: number; maxAttempts: number }
  ): Promise<{
    status: string;
    response?: string;
    error?: string;
    transactions?: Array<{ hash?: string }>;
  }>;
  getAccountInfo?(): Promise<{ wallets?: Array<{ chain: string; address: string }> }>;
}

export interface BankrOrder {
  orderId: string;
  orderType?: string;
  type?: string;
  status: string;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  amount?: string;
  limitPrice?: string;
  price?: string;
  fillPercent?: number;
  chainId?: number;
  side?: "buy" | "sell";
}

export interface BankrOrdersService {
  isConfigured?(): boolean;
  listOrders?(params: { maker: string; status?: string }): Promise<{ orders?: BankrOrder[] }>;
  getActiveOrders?(): Promise<BankrOrder[]>;
}

// ---------------------------------------------------------------------------
// Morpho service
// ---------------------------------------------------------------------------

export interface MorphoService {
  deposit?(params: { vault?: string; assets: string; chain?: string }): Promise<{ success?: boolean; txHash?: string }>;
  withdraw?(params: { vault?: string; assets: string; chain?: string }): Promise<{ success?: boolean; txHash?: string }>;
  getVaultByAsset?(asset: string): Promise<{ address?: string } | null>;
  getVaultApy?(asset: string): Promise<number>;
  getUserPositions?(address: string): Promise<Array<{
    type?: string;
    asset?: string;
    token?: string;
    amount?: string;
    balance?: string;
    usdValue?: number;
    apy?: number;
    healthFactor?: number;
    chain?: string;
  }>>;
}

// ---------------------------------------------------------------------------
// Relay (cross-chain bridge) service
// ---------------------------------------------------------------------------

export interface RelayQuoteResult {
  receiveAmount?: string;
  fee?: string;
  feeUsd?: string;
  estimatedTime?: string;
}

export interface RelayExecuteResult {
  success: boolean;
  txHash?: string;
  estimatedTime?: string;
}

export interface RelayService {
  isConfigured?(): boolean;
  getQuote?(params: {
    token: string;
    amount: string;
    fromChain: string;
    toChain: string;
  }): Promise<RelayQuoteResult | null>;
  executeBridge?(params: {
    token: string;
    amount: string;
    fromChain: string;
    toChain: string;
  }): Promise<RelayExecuteResult>;
}
