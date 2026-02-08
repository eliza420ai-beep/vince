import {
  arbitrum,
  base,
  mainnet,
  baseSepolia,
} from "viem/chains";

/**
 * CDP Plugin Type Definitions
 */

/**
 * Networks supported by CDP corresponding to DEFAULT_RPC_URLS
 */
export type CdpNetwork =
  | "ethereum"
  | "base"
  | "arbitrum"
  | "base-sepolia";

export const DEFAULT_RPC_URLS: Record<number, string> = {
  [mainnet.id]: "https://ethereum.publicnode.com",
  [base.id]: "https://mainnet.base.org",
  [arbitrum.id]: "https://arb1.arbitrum.io/rpc",
  [baseSepolia.id]: "https://sepolia.base.org",
};

