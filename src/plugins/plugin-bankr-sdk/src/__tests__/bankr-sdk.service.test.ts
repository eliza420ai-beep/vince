/**
 * Bankr SDK Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";

// Mock the @bankr/sdk module
vi.mock("@bankr/sdk", () => ({
  BankrClient: vi.fn().mockImplementation(() => ({
    promptAndWait: vi.fn(),
  })),
}));

import { BankrSdkService } from "../services/bankr-sdk.service";
import { BankrClient } from "@bankr/sdk";

// Mock runtime factory
const createMockRuntime = (settings: Record<string, string> = {}): IAgentRuntime =>
  ({
    getSetting: (key: string) => settings[key],
  }) as unknown as IAgentRuntime;

describe("BankrSdkService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("should return true when BANKR_PRIVATE_KEY is set", () => {
      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0x123456" });
      const service = new BankrSdkService(runtime);
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when BANKR_PRIVATE_KEY is not set", () => {
      const runtime = createMockRuntime({});
      const service = new BankrSdkService(runtime);
      expect(service.isConfigured()).toBe(false);
    });

    it("should return false when BANKR_PRIVATE_KEY is empty", () => {
      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "   " });
      const service = new BankrSdkService(runtime);
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("capabilityDescription", () => {
    it("should return a description of SDK capabilities", () => {
      const runtime = createMockRuntime({});
      const service = new BankrSdkService(runtime);
      expect(service.capabilityDescription).toContain("Bankr SDK");
      expect(service.capabilityDescription).toContain("x402");
    });
  });

  describe("promptAndWait", () => {
    it("should call BankrClient with correct parameters", async () => {
      const mockPromptAndWait = vi.fn().mockResolvedValue({
        response: "ETH is $3,000",
        status: "completed",
        transactions: [],
      });

      (BankrClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        promptAndWait: mockPromptAndWait,
      }));

      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0xtest123" });
      const service = new BankrSdkService(runtime);

      const result = await service.promptAndWait({
        prompt: "what is the price of ETH?",
      });

      expect(result.response).toBe("ETH is $3,000");
      expect(result.status).toBe("completed");
      expect(mockPromptAndWait).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "what is the price of ETH?",
        })
      );
    });

    it("should handle failed jobs", async () => {
      const mockPromptAndWait = vi.fn().mockResolvedValue({
        status: "failed",
        error: "Insufficient balance",
      });

      (BankrClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        promptAndWait: mockPromptAndWait,
      }));

      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0xtest123" });
      const service = new BankrSdkService(runtime);

      const result = await service.promptAndWait({ prompt: "swap all ETH" });

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Insufficient balance");
    });

    it("should include transactions in response", async () => {
      const mockTransactions = [
        { type: "swap", metadata: { chainId: 8453 } },
      ];

      const mockPromptAndWait = vi.fn().mockResolvedValue({
        response: "Swap ready",
        status: "completed",
        transactions: mockTransactions,
      });

      (BankrClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        promptAndWait: mockPromptAndWait,
      }));

      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0xtest123" });
      const service = new BankrSdkService(runtime);

      const result = await service.promptAndWait({ prompt: "swap 1 ETH to USDC" });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions![0].type).toBe("swap");
    });

    it("should throw when not configured", async () => {
      const runtime = createMockRuntime({});
      const service = new BankrSdkService(runtime);

      await expect(service.promptAndWait({ prompt: "test" })).rejects.toThrow(
        "BANKR_PRIVATE_KEY is not set"
      );
    });

    it("should pass optional wallet address", async () => {
      const mockPromptAndWait = vi.fn().mockResolvedValue({
        response: "OK",
        status: "completed",
      });

      (BankrClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        promptAndWait: mockPromptAndWait,
      }));

      const runtime = createMockRuntime({
        BANKR_PRIVATE_KEY: "0xtest123",
        BANKR_SDK_WALLET_ADDRESS: "0xwallet456",
      });
      const service = new BankrSdkService(runtime);

      await service.promptAndWait({ prompt: "show portfolio" });

      expect(mockPromptAndWait).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: "0xwallet456",
        })
      );
    });
  });

  describe("start and stop", () => {
    it("should create service via constructor", () => {
      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0xtest" });
      const service = new BankrSdkService(runtime);
      expect(service).toBeInstanceOf(BankrSdkService);
      expect(service.isConfigured()).toBe(true);
    });

    it("should stop service gracefully", async () => {
      const runtime = createMockRuntime({ BANKR_PRIVATE_KEY: "0xtest" });
      const service = new BankrSdkService(runtime);
      // Stop should complete without throwing
      await service.stop();
      // Still configured after stop
      expect(service.isConfigured()).toBe(true);
    });
  });
});
