/**
 * Bankr Agent Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BankrAgentService } from '../services/bankr-agent.service';
import type { IAgentRuntime } from '@elizaos/core';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock runtime
const createMockRuntime = (settings: Record<string, string> = {}): IAgentRuntime => ({
  getSetting: (key: string) => settings[key],
  // Add other required runtime methods as needed
} as unknown as IAgentRuntime);

describe('BankrAgentService', () => {
  let service: BankrAgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BANKR_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.BANKR_API_KEY;
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
      expect(service.isConfigured()).toBe(true);
    });

    it('should return true when env API key is set', () => {
      process.env.BANKR_API_KEY = 'env-test-key';
      const runtime = createMockRuntime({});
      service = new BankrAgentService(runtime);
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when no API key', () => {
      delete process.env.BANKR_API_KEY;
      const runtime = createMockRuntime({});
      service = new BankrAgentService(runtime);
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('submitPrompt', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should submit a prompt and return jobId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: 'job-123' }),
      });

      const result = await service.submitPrompt('swap 1 ETH for USDC');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bankr.bot/agent/prompt',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
          body: JSON.stringify({ prompt: 'swap 1 ETH for USDC' }),
        })
      );
      expect(result.jobId).toBe('job-123');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid API key' }),
      });

      await expect(service.submitPrompt('test')).rejects.toThrow('Invalid API key');
    });

    it('should throw when no jobId returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(service.submitPrompt('test')).rejects.toThrow('did not return a jobId');
    });

    it('should throw when not configured', async () => {
      delete process.env.BANKR_API_KEY;
      const runtime = createMockRuntime({});
      service = new BankrAgentService(runtime);

      await expect(service.submitPrompt('test')).rejects.toThrow('BANKR_API_KEY is not set');
    });
  });

  describe('getJobStatus', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should get job status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'job-123',
          status: 'completed',
          prompt: 'swap 1 ETH',
          response: 'Swap completed!',
        }),
      });

      const result = await service.getJobStatus('job-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bankr.bot/agent/job/job-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );
      expect(result.status).toBe('completed');
      expect(result.response).toBe('Swap completed!');
    });

    it('should handle pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'job-123',
          status: 'pending',
          prompt: 'swap 1 ETH',
        }),
      });

      const result = await service.getJobStatus('job-123');
      expect(result.status).toBe('pending');
    });

    it('should handle failed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'job-123',
          status: 'failed',
          error: 'Insufficient balance',
        }),
      });

      const result = await service.getJobStatus('job-123');
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Insufficient balance');
    });
  });

  describe('getAccountInfo', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should get account info with wallets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          wallets: [
            { chain: 'evm', address: '0x123...' },
            { chain: 'solana', address: 'ABC123...' },
          ],
          bankrClub: { active: true, subscriptionType: 'monthly' },
        }),
      });

      const result = await service.getAccountInfo();

      expect(result.wallets).toHaveLength(2);
      expect(result.wallets?.[0].chain).toBe('evm');
      expect(result.bankrClub?.active).toBe(true);
    });
  });

  describe('sign', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should sign personal_sign message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          signature: '0xabc123...',
        }),
      });

      const result = await service.sign({
        signatureType: 'personal_sign',
        message: 'Hello Bankr',
      });

      expect(result.signature).toBe('0xabc123...');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bankr.bot/agent/sign',
        expect.objectContaining({
          body: JSON.stringify({
            signatureType: 'personal_sign',
            message: 'Hello Bankr',
          }),
        })
      );
    });

    it('should sign typed data', async () => {
      const typedData = {
        domain: { name: 'Test', chainId: 1 },
        types: { Message: [{ name: 'content', type: 'string' }] },
        primaryType: 'Message',
        message: { content: 'test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          signature: '0xdef456...',
        }),
      });

      const result = await service.sign({
        signatureType: 'eth_signTypedData_v4',
        typedData,
      });

      expect(result.signature).toBe('0xdef456...');
    });

    it('should throw for personal_sign without message', async () => {
      await expect(
        service.sign({ signatureType: 'personal_sign' })
      ).rejects.toThrow('personal_sign requires message');
    });
  });

  describe('submitTransaction', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should submit transaction and return hash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          txHash: '0xtxhash123...',
          status: 'confirmed',
        }),
      });

      const result = await service.submitTransaction({
        transaction: { to: '0x123', data: '0x', value: '0' },
      });

      expect(result.txHash).toBe('0xtxhash123...');
      expect(result.success).toBe(true);
    });
  });

  describe('cancelJob', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should cancel a job', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(service.cancelJob('job-123')).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bankr.bot/agent/job/job-123/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw on cancel failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Job not found' }),
      });

      await expect(service.cancelJob('invalid-job')).rejects.toThrow('Job not found');
    });
  });

  describe('pollJobUntilComplete', () => {
    beforeEach(() => {
      const runtime = createMockRuntime({ BANKR_API_KEY: 'test-key' });
      service = new BankrAgentService(runtime);
    });

    it('should poll until completed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'pending', prompt: 'test' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'processing', prompt: 'test' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'completed', prompt: 'test', response: 'Done!' }),
        });

      const result = await service.pollJobUntilComplete('job-123', {
        intervalMs: 10,
        maxAttempts: 5,
      });

      expect(result.status).toBe('completed');
      expect(result.response).toBe('Done!');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should return failed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', status: 'failed', error: 'Something broke' }),
      });

      const result = await service.pollJobUntilComplete('job-123', {
        intervalMs: 10,
        maxAttempts: 5,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Something broke');
    });

    it('should call onStatus callback', async () => {
      const onStatus = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'pending', prompt: 'test' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123', status: 'completed', prompt: 'test' }),
        });

      await service.pollJobUntilComplete('job-123', {
        intervalMs: 10,
        maxAttempts: 5,
        onStatus,
      });

      expect(onStatus).toHaveBeenCalledWith('pending', 'Thinking...');
    });
  });
});
