/**
 * Bankr Types Tests
 * 
 * Validates type definitions and interfaces.
 */

import { describe, it, expect } from 'vitest';
import type {
  JobStatus,
  JobStatusResponse,
  Transaction,
  QuoteRequest,
  QuoteResponse,
  ExternalOrder,
  UserInfoResponse,
  SignRequest,
  SignResponse,
  SubmitTransactionRequest,
  SubmitTransactionResponse,
} from '../types';

describe('JobStatus type', () => {
  it('should include all valid statuses', () => {
    const validStatuses: JobStatus[] = [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ];

    // Type check - if this compiles, the types are correct
    expect(validStatuses).toHaveLength(5);
  });
});

describe('JobStatusResponse', () => {
  it('should have required fields', () => {
    const response: JobStatusResponse = {
      success: true,
      jobId: 'job-123',
      status: 'completed',
      prompt: 'test prompt',
      createdAt: '2026-02-12T00:00:00Z',
    };

    expect(response.success).toBe(true);
    expect(response.jobId).toBe('job-123');
    expect(response.status).toBe('completed');
  });

  it('should allow optional fields', () => {
    const response: JobStatusResponse = {
      success: true,
      jobId: 'job-123',
      status: 'completed',
      prompt: 'test',
      createdAt: '2026-02-12T00:00:00Z',
      response: 'Done!',
      transactions: [
        {
          type: 'swap',
          metadata: {
            inputTokenTicker: 'ETH',
            outputTokenTicker: 'USDC',
          },
        },
      ],
      completedAt: '2026-02-12T00:01:00Z',
      processingTime: 60000,
    };

    expect(response.response).toBe('Done!');
    expect(response.transactions).toHaveLength(1);
  });
});

describe('QuoteRequest', () => {
  it('should have all required fields for limit order', () => {
    const request: QuoteRequest = {
      maker: '0x123',
      orderType: 'limit',
      config: { limitPrice: '3500' },
      chainId: 8453,
      sellToken: '0xETH',
      buyToken: '0xUSDC',
      sellAmount: '1000000000000000000',
      slippageBps: 50,
      expirationDate: Date.now() + 86400000,
    };

    expect(request.orderType).toBe('limit');
    expect(request.chainId).toBe(8453);
  });

  it('should allow optional fee fields', () => {
    const request: QuoteRequest = {
      maker: '0x123',
      orderType: 'limit',
      config: {},
      chainId: 8453,
      sellToken: '0x1',
      buyToken: '0x2',
      sellAmount: '100',
      slippageBps: 50,
      expirationDate: Date.now(),
      appFeeBps: 30,
      appFeeRecipient: '0xfee',
      allowPartial: true,
    };

    expect(request.appFeeBps).toBe(30);
    expect(request.allowPartial).toBe(true);
  });
});

describe('QuoteResponse', () => {
  it('should have quoteId and actions', () => {
    const response: QuoteResponse = {
      quoteId: 'quote-123',
      actions: [
        { type: 'approval', to: '0x123', data: '0x456' },
        {
          type: 'orderSignature',
          typedData: {
            domain: { name: 'Bankr', chainId: 8453 },
            types: {},
            primaryType: 'Order',
            message: {},
          },
        },
      ],
    };

    expect(response.quoteId).toBe('quote-123');
    expect(response.actions).toHaveLength(2);
  });
});

describe('ExternalOrder', () => {
  it('should have required fields', () => {
    const order: ExternalOrder = {
      orderId: 'order-123',
      status: 'active',
      maker: '0xmaker',
      orderType: 'limit',
    };

    expect(order.orderId).toBe('order-123');
    expect(order.status).toBe('active');
  });

  it('should allow optional token fields', () => {
    const order: ExternalOrder = {
      orderId: 'order-123',
      status: 'active',
      maker: '0xmaker',
      orderType: 'limit',
      chainId: 8453,
      sellToken: '0xETH',
      buyToken: '0xUSDC',
      sellAmount: '1000000000000000000',
      createdAt: '2026-02-12T00:00:00Z',
    };

    expect(order.chainId).toBe(8453);
    expect(order.sellToken).toBe('0xETH');
  });
});

describe('UserInfoResponse', () => {
  it('should have wallet information', () => {
    const response: UserInfoResponse = {
      success: true,
      wallets: [
        { chain: 'evm', address: '0x123' },
        { chain: 'solana', address: 'ABC123' },
      ],
    };

    expect(response.wallets).toHaveLength(2);
    expect(response.wallets?.[0].chain).toBe('evm');
  });

  it('should include Bankr Club info', () => {
    const response: UserInfoResponse = {
      success: true,
      bankrClub: {
        active: true,
        subscriptionType: 'monthly',
        renewOrCancelOn: Date.now() + 86400000 * 30,
      },
    };

    expect(response.bankrClub?.active).toBe(true);
    expect(response.bankrClub?.subscriptionType).toBe('monthly');
  });

  it('should include leaderboard info', () => {
    const response: UserInfoResponse = {
      success: true,
      leaderboard: {
        score: 1000,
        rank: 42,
      },
    };

    expect(response.leaderboard?.score).toBe(1000);
    expect(response.leaderboard?.rank).toBe(42);
  });
});

describe('SignRequest', () => {
  it('should support personal_sign', () => {
    const request: SignRequest = {
      signatureType: 'personal_sign',
      message: 'Hello Bankr',
    };

    expect(request.signatureType).toBe('personal_sign');
  });

  it('should support eth_signTypedData_v4', () => {
    const request: SignRequest = {
      signatureType: 'eth_signTypedData_v4',
      typedData: {
        domain: { name: 'Test' },
        types: {},
        primaryType: 'Message',
        message: {},
      },
    };

    expect(request.signatureType).toBe('eth_signTypedData_v4');
  });

  it('should support eth_signTransaction', () => {
    const request: SignRequest = {
      signatureType: 'eth_signTransaction',
      transaction: {
        to: '0x123',
        value: '0',
        data: '0x',
      },
    };

    expect(request.signatureType).toBe('eth_signTransaction');
  });
});

describe('SubmitTransactionRequest', () => {
  it('should have transaction field', () => {
    const request: SubmitTransactionRequest = {
      transaction: {
        to: '0x123',
        data: '0x',
        value: '0',
      },
    };

    expect(request.transaction).toBeDefined();
  });

  it('should allow optional fields', () => {
    const request: SubmitTransactionRequest = {
      transaction: '0xrawtx...',
      waitForConfirmation: true,
      description: 'Swap ETH for USDC',
    };

    expect(request.waitForConfirmation).toBe(true);
    expect(request.description).toBe('Swap ETH for USDC');
  });
});

describe('SubmitTransactionResponse', () => {
  it('should have txHash', () => {
    const response: SubmitTransactionResponse = {
      success: true,
      txHash: '0xtxhash123',
    };

    expect(response.txHash).toBe('0xtxhash123');
  });

  it('should include transaction details', () => {
    const response: SubmitTransactionResponse = {
      success: true,
      txHash: '0xtx123',
      status: 'confirmed',
      blockNumber: '12345',
      gasUsed: '21000',
      chainId: 8453,
    };

    expect(response.status).toBe('confirmed');
    expect(response.chainId).toBe(8453);
  });
});

describe('Transaction metadata', () => {
  it('should include swap details', () => {
    const tx: Transaction = {
      type: 'swap',
      metadata: {
        humanReadableMessage: 'Swap 1 ETH for 3500 USDC',
        inputTokenTicker: 'ETH',
        outputTokenTicker: 'USDC',
        inputTokenAmount: '1',
        outputTokenAmount: '3500',
        transaction: {
          chainId: 8453,
          to: '0xrouter',
          data: '0xswapdata',
        },
      },
    };

    expect(tx.metadata?.inputTokenTicker).toBe('ETH');
    expect(tx.metadata?.outputTokenAmount).toBe('3500');
  });
});
