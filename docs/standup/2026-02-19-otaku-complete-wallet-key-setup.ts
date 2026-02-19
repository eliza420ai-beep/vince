import { ethers } from 'ethers';
import { mnemonicToSeedSync } from 'bip39';
import { HDNode } from '@ethersproject/hdnode';
import * as crypto from 'crypto';

interface WalletConfig {
  mnemonic?: string;
  privateKey?: string;
  derivationPath?: string;
}

interface WalletKeys {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic?: string;
  derivationPath?: string;
}

class WalletKeyManager {
  private static readonly DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";
  
  static generateMnemonic(): string {
    const entropy = crypto.randomBytes(16);
    return ethers.utils.entropyToMnemonic(entropy);
  }

  static fromMnemonic(config: WalletConfig): WalletKeys {
    const mnemonic = config.mnemonic || this.generateMnemonic();
    const derivationPath = config.derivationPath || this.DEFAULT_DERIVATION_PATH;
    
    const seed = mnemonicToSeedSync(mnemonic);
    const hdNode = HDNode.fromSeed(seed);
    const wallet = hdNode.derivePath(derivationPath);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      mnemonic,
      derivationPath
    };
  }

  static fromPrivateKey(privateKey: string): WalletKeys {
    const wallet = new ethers.Wallet(privateKey);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey
    };
  }

  static generateRandomWallet(): WalletKeys {
    const wallet = ethers.Wallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      mnemonic: wallet.mnemonic?.phrase,
      derivationPath: wallet.mnemonic?.path
    };
  }

  static validatePrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  static validateMnemonic(mnemonic: string): boolean {
    return ethers.utils.isValidMnemonic(mnemonic);
  }

  static deriveMultipleAccounts(mnemonic: string, count: number = 5): WalletKeys[] {
    const wallets: WalletKeys[] = [];
    const seed = mnemonicToSeedSync(mnemonic);
    const hdNode = HDNode.fromSeed(seed);
    
    for (let i = 0; i < count; i++) {
      const derivationPath = `m/44'/60'/0'/0/${i}`;
      const wallet = hdNode.derivePath(derivationPath);
      
      wallets.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        mnemonic,
        derivationPath
      });
    }
    
    return wallets;
  }

  static encryptPrivateKey(privateKey: string, password: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', password);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptPrivateKey(encryptedKey: string, password: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', password);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static setupWallet(config?: WalletConfig): WalletKeys {
    if (config?.privateKey) {
      if (!this.validatePrivateKey(config.privateKey)) {
        throw new Error('Invalid private key');
      }
      return this.fromPrivateKey(config.privateKey);
    }
    
    if (config?.mnemonic) {
      if (!this.validateMnemonic(config.mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }
      return this.fromMnemonic(config);
    }
    
    return this.generateRandomWallet();
  }
}

export { WalletKeyManager, WalletConfig, WalletKeys };