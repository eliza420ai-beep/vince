interface WalletConfig {
  rpcUrl: string;
  privateKey: string;
  chainId: number;
  gasPrice?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

class WalletManager {
  private config: WalletConfig;
  private networks: Map<number, NetworkConfig>;

  constructor(config: WalletConfig) {
    this.config = config;
    this.networks = new Map();
    this.initializeNetworks();
  }

  private initializeNetworks(): void {
    const defaultNetworks: NetworkConfig[] = [
      {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      },
      {
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockExplorer: 'https://arbiscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      },
      {
        name: 'Base',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        blockExplorer: 'https://basescan.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      },
      {
        name: 'Hyperliquid',
        chainId: 998,
        rpcUrl: 'https://api.hyperliquid-testnet.xyz/evm',
        blockExplorer: 'https://explorer.hyperliquid.xyz',
        nativeCurrency: { name: 'Hyperliquid', symbol: 'HL', decimals: 18 }
      }
    ];

    defaultNetworks.forEach(network => {
      this.networks.set(network.chainId, network);
    });
  }

  getConfig(): WalletConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<WalletConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  switchNetwork(chainId: number): boolean {
    const network = this.networks.get(chainId);
    if (!network) return false;
    
    this.config.chainId = chainId;
    this.config.rpcUrl = network.rpcUrl;
    return true;
  }

  addNetwork(network: NetworkConfig): void {
    this.networks.set(network.chainId, network);
  }

  getNetwork(chainId?: number): NetworkConfig | undefined {
    return this.networks.get(chainId || this.config.chainId);
  }

  getAllNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  isConfigured(): boolean {
    return !!(this.config.privateKey && this.config.rpcUrl && this.config.chainId);
  }

  getTransactionConfig() {
    return {
      gasPrice: this.config.gasPrice,
      gasLimit: this.config.gasLimit,
      maxFeePerGas: this.config.maxFeePerGas,
      maxPriorityFeePerGas: this.config.maxPriorityFeePerGas
    };
  }
}

export function createWallet(config: WalletConfig): WalletManager {
  return new WalletManager(config);
}

export function validateWalletConfig(config: Partial<WalletConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.privateKey) errors.push('Private key is required');
  if (!config.rpcUrl) errors.push('RPC URL is required');
  if (!config.chainId) errors.push('Chain ID is required');
  
  if (config.privateKey && !config.privateKey.startsWith('0x')) {
    errors.push('Private key must start with 0x');
  }
  
  return errors;
}

export { WalletManager, WalletConfig, NetworkConfig };