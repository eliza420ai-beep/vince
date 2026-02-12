/**
 * Bankr SDK Actions Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { bankrSdkPlugin } from "../index";
import type { Memory, IAgentRuntime } from "@elizaos/core";

// Mock SDK service
const mockSdkService = {
  isConfigured: vi.fn(() => true),
  promptAndWait: vi.fn(),
};

// Mock runtime
const createMockRuntime = (configured = true): IAgentRuntime =>
  ({
    getService: (type: string) => {
      if (type === "bankr_sdk") {
        mockSdkService.isConfigured.mockReturnValue(configured);
        return mockSdkService;
      }
      return null;
    },
    getSetting: () => (configured ? "0xtest-key" : undefined),
  }) as unknown as IAgentRuntime;

const createMemory = (text: string): Memory =>
  ({
    content: { text },
    userId: "test-user",
    agentId: "test-agent",
    roomId: "test-room",
  }) as Memory;

describe("Bankr SDK Plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export plugin with correct name", () => {
    expect(bankrSdkPlugin.name).toBe("bankr-sdk");
  });

  it("should have 1 action", () => {
    expect(bankrSdkPlugin.actions).toHaveLength(1);
  });

  it("should have 1 service", () => {
    expect(bankrSdkPlugin.services).toHaveLength(1);
  });

  it("should have BANKR_SDK_PROMPT action", () => {
    const action = bankrSdkPlugin.actions.find((a) => a.name === "BANKR_SDK_PROMPT");
    expect(action).toBeDefined();
    expect(action?.description).toContain("SDK");
    expect(action?.description).toContain("x402");
  });
});

describe("BANKR_SDK_PROMPT", () => {
  const action = bankrSdkPlugin.actions.find((a) => a.name === "BANKR_SDK_PROMPT")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validate", () => {
    it("should validate when configured and has text", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("what is the price of ETH?");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should not validate when not configured", async () => {
      const runtime = createMockRuntime(false);
      const memory = createMemory("what is the price of ETH?");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });

    it("should not validate without text", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should execute prompt and return response", async () => {
      mockSdkService.promptAndWait.mockResolvedValueOnce({
        response: "ETH is currently $3,245",
        status: "completed",
        transactions: [],
      });

      const runtime = createMockRuntime(true);
      const memory = createMemory("what is the price of ETH?");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(true);
      expect(mockSdkService.promptAndWait).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "what is the price of ETH?" })
      );
      // Last callback should have the response
      const lastCall = calls[calls.length - 1];
      expect(lastCall.text).toContain("ETH is currently $3,245");
    });

    it("should handle transactions in response", async () => {
      mockSdkService.promptAndWait.mockResolvedValueOnce({
        response: "Swap ready",
        status: "completed",
        transactions: [
          { type: "swap", metadata: { chainId: 8453 } },
        ],
      });

      const runtime = createMockRuntime(true);
      const memory = createMemory("swap 1 ETH to USDC");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(true);
      expect(result.data?.transactionCount).toBe(1);
      // Should mention you need to submit transactions yourself
      const lastCall = calls[calls.length - 1];
      expect(lastCall.text).toContain("submit");
    });

    it("should handle failed jobs", async () => {
      mockSdkService.promptAndWait.mockResolvedValueOnce({
        status: "failed",
        error: "Insufficient USDC for x402 payment",
      });

      const runtime = createMockRuntime(true);
      const memory = createMemory("swap 1 ETH");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(false);
      expect(result.text).toContain("Insufficient USDC");
    });

    it("should handle cancelled jobs", async () => {
      mockSdkService.promptAndWait.mockResolvedValueOnce({
        status: "cancelled",
      });

      const runtime = createMockRuntime(true);
      const memory = createMemory("cancel my order");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("cancelled");
    });

    it("should handle service errors", async () => {
      mockSdkService.promptAndWait.mockRejectedValueOnce(
        new Error("Payment required - insufficient USDC")
      );

      const runtime = createMockRuntime(true);
      const memory = createMemory("swap ETH");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(false);
      expect(result.text).toContain("USDC");
    });

    it("should return error when no prompt provided", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(false);
      expect(result.text).toContain("No prompt");
    });

    it("should return error when service not available", async () => {
      const runtime = {
        getService: () => null,
        getSetting: () => undefined,
      } as unknown as IAgentRuntime;
      const memory = createMemory("test prompt");
      const calls: any[] = [];
      const callback = async (content: any) => {
        calls.push(content);
      };

      const result = await action.handler!(runtime, memory, undefined, undefined, callback);

      expect(result.success).toBe(false);
      expect(result.text).toContain("not available");
    });
  });

  it("should have similes", () => {
    expect(action.similes).toContain("BANKR_SDK");
    expect(action.similes).toContain("BANKR_SDK_EXECUTE");
  });

  it("should have examples", () => {
    expect(action.examples).toBeDefined();
    expect(action.examples!.length).toBeGreaterThan(0);
  });
});
