import { ethers } from 'ethers';
import { config } from 'dotenv';

config();

interface WalletConfig {
  privateKey: string;
  rpcUrls: Record<string, string>;
  chainIds: Record<string, number>;
  tokens: Record<string, Record<string, string>>;
}

class WalletManager {
  private wallet: ethers.Wallet;
  private providers: Record<string, ethers.JsonRpcProvider>;
  private config: WalletConfig;

  constructor() {
    this.config = {
      privateKey: process.env.WALLET_PRIVATE_KEY || '',
      rpcUrls: {
        ethereum: process.env.ETH_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
        base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        arbitrum: process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        optimism: process.env.OP_RPC_URL || 'https://mainnet.optimism.io',
        polygon: process.env.MATIC_RPC_URL || 'https://polygon-rpc.com'
      },
      chainIds: {
        ethereum: 1,
        base: 8453,
        arbitrum: 42161,
        optimism: 10,
        polygon: 137
      },
      tokens: {
        ethereum: {
          USDC: '0xA0b86a33E6441c41f2d8b2f9b7a5b8a6F7B8c8a1',
          WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        },
        base: {
          USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          WETH: '0x4200000000000000000000000000000000000006'
        },
        arbitrum: {
          USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
        }
      }
    };

    this.providers = {};
    this.initializeWallet();
    this.initializeProviders();
  }

  private initializeWallet(): void {
    if (!this.config.privateKey) {
      throw new Error('WALLET_PRIVATE_KEY not found in environment');
    }
    this.wallet = new ethers.Wallet(this.config.privateKey);
  }

  private initializeProviders(): void {
    Object.entries(this.config.rpcUrls).forEach(([network, url]) => {
      this.providers[network] = new ethers.JsonRpcProvider(url);
    });
  }

  async getBalance(network: string, tokenAddress?: string): Promise<string> {
    const provider = this.providers[network];
    const connectedWallet = this.wallet.connect(provider);

    if (!tokenAddress) {
      const balance = await connectedWallet.provider.getBalance(connectedWallet.address);
      return ethers.formatEther(balance);
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      provider
    );

    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(connectedWallet.address),
      tokenContract.decimals()
    ]);

    return ethers.formatUnits(balance, decimals);
  }

  async estimateGas(network: string, to: string, value: string = '0', data: string = '0x'): Promise<string> {
    const provider = this.providers[network];
    const connectedWallet = this.wallet.connect(provider);

    const gasEstimate = await connectedWallet.estimateGas({
      to,
      value: ethers.parseEther(value),
      data
    });

    return ethers.formatUnits(gasEstimate, 'gwei');
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  getTokenAddress(network: string, symbol: string): string | undefined {
    return this.config.tokens[network]?.[symbol];
  }

  getSupportedNetworks(): string[] {
    return Object.keys(this.config.rpcUrls);
  }

  async getNetworkInfo(network: string): Promise<{ chainId: number; blockNumber: number; gasPrice: string }> {
    const provider = this.providers[network];
    const [blockNumber, gasPrice] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);

    return {
      chainId: this.config.chainIds[network],
      blockNumber,
      gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')
    };
  }
}

export default WalletManager;