interface WalletConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  contracts?: {
    [key: string]: string;
  };
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  balance: string;
}

class WalletManager {
  private config: Map<number, WalletConfig> = new Map();
  private state: WalletState = {
    address: null,
    chainId: null,
    connected: false,
    balance: '0'
  };

  constructor() {
    this.initializeNetworks();
  }

  private initializeNetworks() {
    const networks: WalletConfig[] = [
      {
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
        chainId: 1,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://etherscan.io',
        contracts: {
          USDC: '0xA0b86a33E6441D5f5b7f1B8A9f8A3E5B5D5A0B86',
          WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
        }
      },
      {
        name: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        chainId: 42161,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://arbiscan.io',
        contracts: {
          USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
        }
      },
      {
        name: 'Base',
        rpcUrl: 'https://mainnet.base.org',
        chainId: 8453,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://basescan.org',
        contracts: {
          USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        }
      }
    ];

    networks.forEach(network => {
      this.config.set(network.chainId, network);
    });
  }

  async connect(): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      this.state = {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        connected: true,
        balance: await this.getBalance(accounts[0])
      };

      this.setupEventListeners();
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    const network = this.config.get(chainId);
    if (!network) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        return this.addNetwork(network);
      }
      return false;
    }
  }

  private async addNetwork(network: WalletConfig): Promise<boolean> {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${network.chainId.toString(16)}`,
          chainName: network.name,
          rpcUrls: [network.rpcUrl],
          nativeCurrency: network.nativeCurrency,
          blockExplorerUrls: [network.blockExplorer]
        }]
      });
      return true;
    } catch {
      return false;
    }
  }

  private async getBalance(address: string): Promise<string> {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      return (parseInt(balance, 16) / 1e18).toFixed(4);
    } catch {
      return '0';
    }
  }

  private setupEventListeners() {
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.state.address = accounts[0] || null;
      this.state.connected = !!accounts[0];
    });

    window.ethereum.on('chainChanged', (chainId: string) => {
      this.state.chainId = parseInt(chainId, 16);
    });
  }

  getState(): WalletState {
    return { ...this.state };
  }

  getNetworkConfig(chainId?: number): WalletConfig | null {
    const id = chainId || this.state.chainId;
    return id ? this.config.get(id) || null : null;
  }

  disconnect() {
    this.state = {
      address: null,
      chainId: null,
      connected: false,
      balance: '0'
    };
  }
}

export { WalletManager, type WalletConfig, type WalletState };