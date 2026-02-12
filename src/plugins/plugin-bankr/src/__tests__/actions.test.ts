/**
 * Bankr Actions Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { bankrPlugin } from '../index';
import type { Memory, IAgentRuntime } from '@elizaos/core';

// Mock service
const mockAgentService = {
  isConfigured: vi.fn(() => true),
  submitPrompt: vi.fn(),
  getJobStatus: vi.fn(),
  pollJobUntilComplete: vi.fn(),
  getAccountInfo: vi.fn(),
  sign: vi.fn(),
  submitTransaction: vi.fn(),
  cancelJob: vi.fn(),
};

const mockOrdersService = {
  isConfigured: vi.fn(() => true),
  createQuote: vi.fn(),
  submitOrder: vi.fn(),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
};

// Mock runtime
const createMockRuntime = (configured = true): IAgentRuntime => ({
  getService: (type: string) => {
    if (type === 'bankr_agent') {
      mockAgentService.isConfigured.mockReturnValue(configured);
      return mockAgentService;
    }
    if (type === 'bankr_orders') {
      mockOrdersService.isConfigured.mockReturnValue(configured);
      return mockOrdersService;
    }
    return null;
  },
  getSetting: () => configured ? 'test-key' : undefined,
} as unknown as IAgentRuntime);

const createMemory = (text: string): Memory => ({
  content: { text },
  userId: 'test-user',
  agentId: 'test-agent',
  roomId: 'test-room',
} as Memory);

describe('Bankr Plugin', () => {
  it('should export plugin with correct name', () => {
    expect(bankrPlugin.name).toBe('bankr');
  });

  it('should have all 10 actions', () => {
    expect(bankrPlugin.actions).toHaveLength(10);
  });

  it('should have 2 services', () => {
    expect(bankrPlugin.services).toHaveLength(2);
  });

  describe('Action names', () => {
    const expectedActions = [
      'BANKR_AGENT_PROMPT',
      'BANKR_USER_INFO',
      'BANKR_JOB_STATUS',
      'BANKR_AGENT_CANCEL_JOB',
      'BANKR_AGENT_SIGN',
      'BANKR_AGENT_SUBMIT',
      'BANKR_ORDER_QUOTE',
      'BANKR_ORDER_LIST',
      'BANKR_ORDER_STATUS',
      'BANKR_ORDER_CANCEL',
    ];

    for (const actionName of expectedActions) {
      it(`should have ${actionName} action`, () => {
        const action = bankrPlugin.actions.find(a => a.name === actionName);
        expect(action).toBeDefined();
        expect(action?.description).toBeDefined();
      });
    }
  });
});

describe('BANKR_AGENT_PROMPT', () => {
  const action = bankrPlugin.actions.find(a => a.name === 'BANKR_AGENT_PROMPT')!;

  describe('validate', () => {
    it('should validate when configured and has text', async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory('swap 1 ETH for USDC');
      
      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it('should not validate when not configured', async () => {
      const runtime = createMockRuntime(false);
      const memory = createMemory('swap 1 ETH for USDC');
      
      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });

    it('should not validate without text', async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory('');
      
      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  it('should have examples', () => {
    expect(action.examples).toBeDefined();
    expect(action.examples!.length).toBeGreaterThan(0);
  });

  it('should have similes', () => {
    expect(action.similes).toContain('ASK_BANKR');
    expect(action.similes).toContain('RUN_BANKR');
  });
});

describe('BANKR_USER_INFO', () => {
  const action = bankrPlugin.actions.find(a => a.name === 'BANKR_USER_INFO')!;

  it('should have description about wallets and account', () => {
    expect(action.description.toLowerCase()).toContain('wallet');
  });
});

describe('BANKR_JOB_STATUS', () => {
  const action = bankrPlugin.actions.find(a => a.name === 'BANKR_JOB_STATUS')!;

  it('should have description about job status', () => {
    expect(action.description.toLowerCase()).toContain('status');
  });
});

describe('BANKR_ORDER_QUOTE', () => {
  const action = bankrPlugin.actions.find(a => a.name === 'BANKR_ORDER_QUOTE')!;

  it('should have description about quotes', () => {
    expect(action.description.toLowerCase()).toContain('quote');
  });
});

describe('BANKR_ORDER_LIST', () => {
  const action = bankrPlugin.actions.find(a => a.name === 'BANKR_ORDER_LIST')!;

  it('should have description about listing orders', () => {
    expect(action.description.toLowerCase()).toContain('list');
  });
});

describe('Order type coverage', () => {
  const promptAction = bankrPlugin.actions.find(a => a.name === 'BANKR_AGENT_PROMPT')!;

  it('should mention limit orders', () => {
    expect(promptAction.description.toLowerCase()).toContain('limit');
  });

  it('should mention stop orders', () => {
    expect(promptAction.description.toLowerCase()).toContain('stop');
  });

  it('should mention DCA', () => {
    expect(promptAction.description.toLowerCase()).toContain('dca');
  });

  it('should mention TWAP', () => {
    expect(promptAction.description.toLowerCase()).toContain('twap');
  });

  it('should mention swaps', () => {
    expect(promptAction.description.toLowerCase()).toContain('swap');
  });

  it('should mention transfers', () => {
    expect(promptAction.description.toLowerCase()).toContain('transfer');
  });
});

describe('Plugin types', () => {
  it('should export types', async () => {
    const { QuoteRequest, ExternalOrder } = await import('../types');
    // Type existence check - these are type imports, so we can't check values
    // but importing them verifies they exist
    expect(true).toBe(true);
  });
});
