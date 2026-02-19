import { Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

export interface WalletKeys {
  mnemonic: string;
  solana: {
    publicKey: string;
    secretKey: Uint8Array;
    keypair: Keypair;
  };
  ethereum: {
    address: string;
    privateKey: string;
    wallet: ethers.Wallet;
  };
}

export class WalletGenerator {
  static generateMnemonic(): string {
    return bip39.generateMnemonic(256);
  }

  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  static fromMnemonic(mnemonic: string): WalletKeys {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
    // Solana derivation (m/44'/501'/0'/0')
    const solanaPath = "m/44'/501'/0'/0'";
    const solanaDerived = derivePath(solanaPath, seed.toString('hex'));
    const solanaKeypair = Keypair.fromSeed(solanaDerived.key);

    // Ethereum derivation (m/44'/60'/0'/0/0)
    const ethereumPath = "m/44'/60'/0'/0/0";
    const ethereumWallet = ethers.Wallet.fromMnemonic(mnemonic, ethereumPath);

    return {
      mnemonic,
      solana: {
        publicKey: solanaKeypair.publicKey.toString(),
        secretKey: solanaKeypair.secretKey,
        keypair: solanaKeypair,
      },
      ethereum: {
        address: ethereumWallet.address,
        privateKey: ethereumWallet.privateKey,
        wallet: ethereumWallet,
      },
    };
  }

  static generate(): WalletKeys {
    const mnemonic = this.generateMnemonic();
    return this.fromMnemonic(mnemonic);
  }

  static fromPrivateKey(privateKey: string, chain: 'solana' | 'ethereum'): Partial<WalletKeys> {
    if (chain === 'solana') {
      const secretKey = new Uint8Array(JSON.parse(privateKey));
      const keypair = Keypair.fromSecretKey(secretKey);
      
      return {
        solana: {
          publicKey: keypair.publicKey.toString(),
          secretKey: keypair.secretKey,
          keypair,
        },
      };
    } else {
      const wallet = new ethers.Wallet(privateKey);
      
      return {
        ethereum: {
          address: wallet.address,
          privateKey: wallet.privateKey,
          wallet,
        },
      };
    }
  }

  static exportPrivateKey(keys: WalletKeys, chain: 'solana' | 'ethereum'): string {
    if (chain === 'solana') {
      return JSON.stringify(Array.from(keys.solana.secretKey));
    } else {
      return keys.ethereum.privateKey;
    }
  }

  static createAnchorWallet(solanaKeys: WalletKeys['solana']): Wallet {
    return {
      publicKey: solanaKeys.keypair.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(solanaKeys.keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map((tx) => {
          tx.partialSign(solanaKeys.keypair);
          return tx;
        });
      },
    };
  }
}

// Usage examples:
// const keys = WalletGenerator.generate();
// const keysFromMnemonic = WalletGenerator.fromMnemonic('your mnemonic here');
// const anchorWallet = WalletGenerator.createAnchorWallet(keys.solana);
// const exportedKey = WalletGenerator.exportPrivateKey(keys, 'solana');