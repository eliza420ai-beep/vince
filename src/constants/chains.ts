/**
 * Backend chain configuration for CDP, plugins, and managers.
 * Used by cdp-transaction-manager, plugin-cdp, plugin-morpho, etc.
 *
 * @see https://github.com/elizaOS/otaku/blob/master/src/constants/chains.ts
 */

import { base, mainnet, baseSepolia, sepolia, arbitrum } from "viem/chains";
import type { Chain } from "viem/chains";

export type SupportedNetwork =
  | "base"
  | "ethereum"
  | "arbitrum"
  | "base-sepolia"
  | "ethereum-sepolia";

export interface ChainConfig {
  name: string;
  chain: Chain;
  rpcUrl: (alchemyKey: string) => string;
  explorerUrl: string;
  nativeToken: {
    symbol: string;
    name: string;
    coingeckoId: string;
    decimals: number;
  };
  coingeckoPlatform: string;
  swap: {
    cdpSupported: boolean;
  };
}

export const CHAIN_CONFIGS: Record<SupportedNetwork, ChainConfig> = {
  base: {
    name: "Base",
    chain: base,
    rpcUrl: (alchemyKey: string) =>
      `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    explorerUrl: "https://basescan.org",
    nativeToken: {
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 18,
    },
    coingeckoPlatform: "base",
    swap: { cdpSupported: true },
  },
  ethereum: {
    name: "Ethereum",
    chain: mainnet,
    rpcUrl: (alchemyKey: string) =>
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    explorerUrl: "https://etherscan.io",
    nativeToken: {
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 18,
    },
    coingeckoPlatform: "ethereum",
    swap: { cdpSupported: true },
  },
  arbitrum: {
    name: "Arbitrum",
    chain: arbitrum,
    rpcUrl: (alchemyKey: string) =>
      `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    explorerUrl: "https://arbiscan.io",
    nativeToken: {
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 18,
    },
    coingeckoPlatform: "arbitrum-one",
    swap: { cdpSupported: false },
  },
  "base-sepolia": {
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: (alchemyKey: string) =>
      `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    explorerUrl: "https://sepolia.basescan.org",
    nativeToken: {
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 18,
    },
    coingeckoPlatform: "base",
    swap: { cdpSupported: false },
  },
  "ethereum-sepolia": {
    name: "Ethereum Sepolia",
    chain: sepolia,
    rpcUrl: (alchemyKey: string) =>
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    explorerUrl: "https://sepolia.etherscan.io",
    nativeToken: {
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 18,
    },
    coingeckoPlatform: "ethereum",
    swap: { cdpSupported: false },
  },
};

export const MAINNET_NETWORKS: SupportedNetwork[] = [
  "base",
  "ethereum",
  "arbitrum",
];

export const TESTNET_NETWORKS: SupportedNetwork[] = [
  "base-sepolia",
  "ethereum-sepolia",
];

export const ALL_NETWORKS: SupportedNetwork[] = Object.keys(
  CHAIN_CONFIGS,
) as SupportedNetwork[];

export function getChainConfig(network: string): ChainConfig | null {
  return CHAIN_CONFIGS[network as SupportedNetwork] || null;
}

export function getViemChain(network: string): Chain | null {
  const config = getChainConfig(network);
  return config?.chain || null;
}

export function getRpcUrl(network: string, alchemyKey: string): string | null {
  const config = getChainConfig(network);
  return config ? config.rpcUrl(alchemyKey) : null;
}

export function getExplorerUrl(network: string): string | null {
  const config = getChainConfig(network);
  return config?.explorerUrl || null;
}

export function getTxExplorerUrl(
  network: string,
  txHash: string,
): string | null {
  const explorerUrl = getExplorerUrl(network);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : null;
}

export function getAddressExplorerUrl(
  network: string,
  address: string,
): string | null {
  const explorerUrl = getExplorerUrl(network);
  return explorerUrl ? `${explorerUrl}/address/${address}` : null;
}

export function getNativeTokenInfo(network: string) {
  const config = getChainConfig(network);
  return config?.nativeToken || null;
}

export function getCoingeckoPlatform(network: string): string | null {
  const config = getChainConfig(network);
  return config?.coingeckoPlatform || null;
}

export function isSupportedNetwork(
  network: string,
): network is SupportedNetwork {
  return network in CHAIN_CONFIGS;
}

export function isMainnet(network: string): boolean {
  return MAINNET_NETWORKS.includes(network as SupportedNetwork);
}

export function isTestnet(network: string): boolean {
  return TESTNET_NETWORKS.includes(network as SupportedNetwork);
}

export function isCdpSwapSupported(network: string): boolean {
  const config = getChainConfig(network);
  return config?.swap.cdpSupported || false;
}

export function getCdpSwapSupportedNetworks(): SupportedNetwork[] {
  return ALL_NETWORKS.filter((network) => isCdpSwapSupported(network));
}

export const NATIVE_TOKEN_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export function normalizeTokenAddress(token: string): string {
  if (/^0x[a-fA-F0-9]{40}$/.test(token)) {
    return token;
  }
  return NATIVE_TOKEN_ADDRESS;
}

export const UNISWAP_V3_ROUTER: Record<SupportedNetwork, string> = {
  ethereum: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  arbitrum: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  base: "0x2626664c2603336E57B271c5C0b26F421741e481",
  "base-sepolia": "",
  "ethereum-sepolia": "",
};

export const UNISWAP_V3_QUOTER: Record<SupportedNetwork, string> = {
  ethereum: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  arbitrum: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  base: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  "base-sepolia": "",
  "ethereum-sepolia": "",
};

export const WRAPPED_NATIVE_TOKEN: Record<SupportedNetwork, string> = {
  ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  arbitrum: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  base: "0x4200000000000000000000000000000000000006",
  "base-sepolia": "",
  "ethereum-sepolia": "",
};

export const UNISWAP_POOL_FEES = {
  LOW: 500,
  MEDIUM: 3000,
  HIGH: 10000,
};
