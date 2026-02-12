/**
 * Otaku Actions Tests
 */

import { describe, it, expect, vi } from "vitest";
import { otakuPlugin } from "../index";
import type { Memory, IAgentRuntime } from "@elizaos/core";

// Mock service
const mockOtakuService = {
  isBankrAvailable: vi.fn(() => true),
  executeSwap: vi.fn(),
  createLimitOrder: vi.fn(),
  createDca: vi.fn(),
  getPositions: vi.fn(),
  formatSwapConfirmation: vi.fn(() => "Swap confirmation"),
  formatLimitOrderConfirmation: vi.fn(() => "Limit order confirmation"),
  formatDcaConfirmation: vi.fn(() => "DCA confirmation"),
};

// Mock runtime
const createMockRuntime = (configured = true): IAgentRuntime =>
  ({
    getService: (type: string) => {
      if (type === "otaku") {
        mockOtakuService.isBankrAvailable.mockReturnValue(configured);
        return mockOtakuService;
      }
      return null;
    },
    getSetting: () => (configured ? "test-key" : undefined),
  }) as unknown as IAgentRuntime;

const createMemory = (text: string): Memory =>
  ({
    content: { text },
    userId: "test-user",
    agentId: "test-agent",
    roomId: "test-room",
  }) as Memory;

describe("Otaku Plugin", () => {
  it("should export plugin with correct name", () => {
    expect(otakuPlugin.name).toBe("otaku");
  });

  it("should have 5 actions", () => {
    expect(otakuPlugin.actions).toHaveLength(5);
  });

  it("should have 1 service", () => {
    expect(otakuPlugin.services).toHaveLength(1);
  });

  describe("Action names", () => {
    const expectedActions = [
      "OTAKU_SWAP",
      "OTAKU_LIMIT_ORDER",
      "OTAKU_DCA",
      "OTAKU_POSITIONS",
      "OTAKU_BRIDGE",
    ];

    for (const actionName of expectedActions) {
      it(`should have ${actionName} action`, () => {
        const action = otakuPlugin.actions.find((a) => a.name === actionName);
        expect(action).toBeDefined();
        expect(action?.description).toBeDefined();
      });
    }
  });
});

describe("OTAKU_SWAP", () => {
  const action = otakuPlugin.actions.find((a) => a.name === "OTAKU_SWAP")!;

  describe("validate", () => {
    it("should validate swap with token pair", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("swap 1 ETH to USDC");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate swap with 'for' keyword", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("swap 0.5 BTC for ETH");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should not validate when BANKR unavailable", async () => {
      const runtime = createMockRuntime(false);
      const memory = createMemory("swap 1 ETH to USDC");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });

    it("should not validate without swap keyword", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("convert 1 ETH to USDC");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });

    it("should not validate without token pair", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("swap my tokens");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  it("should have examples", () => {
    expect(action.examples).toBeDefined();
    expect(action.examples!.length).toBeGreaterThan(0);
  });

  it("should have similes", () => {
    expect(action.similes).toContain("SWAP_TOKENS");
    expect(action.similes).toContain("TOKEN_SWAP");
  });
});

describe("OTAKU_LIMIT_ORDER", () => {
  const action = otakuPlugin.actions.find(
    (a) => a.name === "OTAKU_LIMIT_ORDER"
  )!;

  describe("validate", () => {
    it("should validate limit order intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("set a limit order to buy ETH at $3000");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate buy at price", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("buy ETH if it drops to 2800");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate sell at price", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("sell 1 ETH if it hits 4000");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should not validate without price target", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("buy some ETH");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  it("should have similes", () => {
    expect(action.similes).toContain("LIMIT_ORDER");
    expect(action.similes).toContain("BUY_LIMIT");
  });
});

describe("OTAKU_DCA", () => {
  const action = otakuPlugin.actions.find((a) => a.name === "OTAKU_DCA")!;

  describe("validate", () => {
    it("should validate DCA intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("DCA $500 into ETH over 30 days");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate dollar cost average phrase", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("dollar cost average into BTC weekly");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate recurring buy", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("set up recurring buy of ETH");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should not validate without DCA intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("buy ETH regularly");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  it("should have similes", () => {
    expect(action.similes).toContain("DCA");
    expect(action.similes).toContain("DOLLAR_COST_AVERAGE");
  });
});

describe("OTAKU_POSITIONS", () => {
  const action = otakuPlugin.actions.find(
    (a) => a.name === "OTAKU_POSITIONS"
  )!;

  describe("validate", () => {
    it("should validate positions intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("show my positions");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate portfolio intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("what's in my portfolio?");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate orders intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("show my active orders");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should validate balances intent", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("check my balances");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(true);
    });

    it("should not validate unrelated message", async () => {
      const runtime = createMockRuntime(true);
      const memory = createMemory("what's the weather?");

      const result = await action.validate!(runtime, memory);
      expect(result).toBe(false);
    });
  });

  it("should have similes", () => {
    expect(action.similes).toContain("SHOW_POSITIONS");
    expect(action.similes).toContain("MY_PORTFOLIO");
  });
});

describe("Plugin integration", () => {
  it("all actions should have handlers", () => {
    for (const action of otakuPlugin.actions) {
      expect(action.handler).toBeDefined();
      expect(typeof action.handler).toBe("function");
    }
  });

  it("all actions should have validate functions", () => {
    for (const action of otakuPlugin.actions) {
      expect(action.validate).toBeDefined();
      expect(typeof action.validate).toBe("function");
    }
  });

  it("all actions should have descriptions", () => {
    for (const action of otakuPlugin.actions) {
      expect(action.description).toBeDefined();
      expect(action.description.length).toBeGreaterThan(10);
    }
  });
});
