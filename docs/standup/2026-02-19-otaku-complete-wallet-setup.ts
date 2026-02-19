import { ethers } from 'ethers';
import { Wallet, HDNodeWallet } from 'ethers';

interface WalletConfig {
  network: 'mainnet' | 'sepolia' | 'polygon' | 'arbitrum' | 'base';
  rpcUrl?: string;
}

interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
  balance: string;
  network: string;
}

class OtakuWallet {
  private wallet: Wallet | HDNodeWallet;
  private provider: ethers.Provider;
  private network: string;

  constructor(config: WalletConfig) {
    this.network = config.network;
    this.provider = this.getProvider(config);
  }

  private getProvider(config: WalletConfig): ethers.Provider {
    const rpcUrls = {
      mainnet: config.rpcUrl || 'https://eth.llamarpc.com',
      sepolia: config.rpcUrl || 'https://rpc.sepolia.org',
      polygon: config.rpcUrl || 'https://polygon.llamarpc.com',
      arbitrum: config.rpcUrl || 'https://arb1.arbitrum.io/rpc',
      base: config.rpcUrl || 'https://mainnet.base.org'
    };
    
    return new ethers.JsonRpcProvider(rpcUrls[config.network]);
  }

  async createWallet(): Promise<WalletInfo> {
    this.wallet = ethers.Wallet.createRandom(this.provider);
    return this.getWalletInfo();
  }

  async importFromMnemonic(mnemonic: string): Promise<WalletInfo> {
    this.wallet = ethers.Wallet.fromPhrase(mnemonic, this.provider);
    return this.getWalletInfo();
  }

  async importFromPrivateKey(privateKey: string): Promise<WalletInfo> {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    return this.getWalletInfo();
  }

  private async getWalletInfo(): Promise<WalletInfo> {
    const balance = await this.provider.getBalance(this.wallet.address);
    
    return {
      address: this.wallet.address,
      privateKey: this.wallet.privateKey,
      mnemonic: this.wallet.mnemonic?.phrase,
      balance: ethers.formatEther(balance),
      network: this.network
    };
  }

  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async sendTransaction(to: string, amount: string): Promise<string> {
    const tx = await this.wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount)
    });
    
    return tx.hash;
  }

  async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  getAddress(): string {
    return this.wallet?.address || '';
  }

  exportPrivateKey(): string {
    return this.wallet?.privateKey || '';
  }

  exportMnemonic(): string | undefined {
    return this.wallet?.mnemonic?.phrase;
  }
}

export { OtakuWallet, WalletConfig, WalletInfo };

// Usage examples:
// const wallet = new OtakuWallet({ network: 'mainnet' });
// const info = await wallet.createWallet();
// const balance = await wallet.getBalance();
// const txHash = await wallet.sendTransaction('0x...', '0.1');