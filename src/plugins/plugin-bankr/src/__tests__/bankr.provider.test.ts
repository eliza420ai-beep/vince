/**
 * Bankr Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bankrProvider, getBankrData } from '../providers/bankr.provider';
import type { IAgentRuntime, Memory } from '@elizaos/core';

// Mock services
const mockAgentService = {
  isConfigured: vi.fn(),
  getAccountInfo: vi.fn(),
};

const mockOrdersService = {
  isConfigured: vi.fn(),
  listOrders: vi.fn(),
};

const createMockRuntime = (): IAgentRuntime => ({
  getService: (type: string) => {
    if (type === 'bankr_agent') return mockAgentService;
    if (type === 'bankr_orders') return mockOrdersService;
    return null;
  },
} as unknown as IAgentRuntime);

const createMockMemory = (): Memory => ({
  content: { text: 'test' },
  userId: 'user',
  agentId: 'agent',
  roomId: 'room',
} as Memory);

describe('bankrProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(bankrProvider.name).toBe('BANKR_PROVIDER');
  });

  it('should return not configured when service not available', async () => {
    mockAgentService.isConfigured.mockReturnValue(false);
    
    const runtime = createMockRuntime();
    const result = await bankrProvider.get(runtime, createMockMemory());
    
    expect(result).toContain('Not configured');
  });

  it('should return account info when configured', async () => {
    mockAgentService.isConfigured.mockReturnValue(true);
    mockAgentService.getAccountInfo.mockResolvedValue({
      success: true,
      wallets: [
        { chain: 'evm', address: '0x123' },
        { chain: 'solana', address: 'ABC123' },
      ],
      bankrClub: { active: true, subscriptionType: 'monthly' },
      leaderboard: { score: 1000, rank: 42 },
    });
    mockOrdersService.isConfigured.mockReturnValue(true);
    mockOrdersService.listOrders.mockResolvedValue({ orders: [] });

    const runtime = createMockRuntime();
    const result = await bankrProvider.get(runtime, createMockMemory());

    expect(result).toContain('BANKR Status');
    expect(result).toContain('Wallets: 2');
    expect(result).toContain('Bankr Club: Active');
    expect(result).toContain('Rank #42');
  });

  it('should show open orders', async () => {
    mockAgentService.isConfigured.mockReturnValue(true);
    mockAgentService.getAccountInfo.mockResolvedValue({
      success: true,
      wallets: [{ chain: 'evm', address: '0x123' }],
    });
    mockOrdersService.isConfigured.mockReturnValue(true);
    mockOrdersService.listOrders.mockResolvedValue({
      orders: [
        { orderId: '1', orderType: 'limit', sellToken: 'ETH', buyToken: 'USDC', status: 'active' },
        { orderId: '2', orderType: 'dca', sellToken: 'USDC', buyToken: 'BNKR', status: 'active' },
      ],
    });

    const runtime = createMockRuntime();
    const result = await bankrProvider.get(runtime, createMockMemory());

    expect(result).toContain('Open Orders (2)');
    expect(result).toContain('limit: ETH → USDC');
    expect(result).toContain('dca: USDC → BNKR');
  });

  it('should handle errors gracefully', async () => {
    mockAgentService.isConfigured.mockReturnValue(true);
    mockAgentService.getAccountInfo.mockRejectedValue(new Error('API error'));

    const runtime = createMockRuntime();
    const result = await bankrProvider.get(runtime, createMockMemory());

    expect(result).toContain('Error');
  });
});

describe('getBankrData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return not configured when service not available', async () => {
    mockAgentService.isConfigured.mockReturnValue(false);

    const runtime = createMockRuntime();
    const result = await getBankrData(runtime);

    expect(result.isConfigured).toBe(false);
  });

  it('should return structured data when configured', async () => {
    mockAgentService.isConfigured.mockReturnValue(true);
    mockAgentService.getAccountInfo.mockResolvedValue({
      success: true,
      wallets: [
        { chain: 'evm', address: '0x123' },
      ],
      bankrClub: { active: true, subscriptionType: 'yearly' },
    });
    mockOrdersService.isConfigured.mockReturnValue(true);
    mockOrdersService.listOrders.mockResolvedValue({
      orders: [
        { orderId: '1', orderType: 'limit', status: 'active' },
      ],
    });

    const runtime = createMockRuntime();
    const result = await getBankrData(runtime);

    expect(result.isConfigured).toBe(true);
    expect(result.wallets).toHaveLength(1);
    expect(result.bankrClub?.active).toBe(true);
    expect(result.orderCount).toBe(1);
    expect(result.lastUpdated).toBeDefined();
  });

  it('should skip Solana wallets for orders', async () => {
    mockAgentService.isConfigured.mockReturnValue(true);
    mockAgentService.getAccountInfo.mockResolvedValue({
      success: true,
      wallets: [
        { chain: 'solana', address: 'SOL123' },
      ],
    });
    mockOrdersService.isConfigured.mockReturnValue(true);

    const runtime = createMockRuntime();
    const result = await getBankrData(runtime);

    // Should not call listOrders for Solana wallets
    expect(mockOrdersService.listOrders).not.toHaveBeenCalled();
    expect(result.openOrders).toHaveLength(0);
  });
});
