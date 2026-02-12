import { describe, it, expect } from "bun:test";
import {
  isValidEthereumAddress,
  truncateAddress,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatPriceChange,
  validatePolymarketService,
  getPolymarketService,
  extractActionParams,
} from "../utils/actionHelpers";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockPolymarketService,
} from "./test-utils";

describe("isValidEthereumAddress", () => {
  it("returns true for valid address", () => {
    expect(isValidEthereumAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")).toBe(true);
    expect(isValidEthereumAddress("0x0000000000000000000000000000000000000001")).toBe(true);
  });

  it("returns false for invalid address", () => {
    expect(isValidEthereumAddress("")).toBe(false);
    expect(isValidEthereumAddress("0x123")).toBe(false);
    expect(isValidEthereumAddress("not-an-address")).toBe(false);
  });
});

describe("truncateAddress", () => {
  it("truncates long address", () => {
    const addr = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    expect(truncateAddress(addr)).toBe("0x742d35...f44e");
  });

  it("returns short address unchanged", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });
});

describe("formatCurrency", () => {
  it("formats number as USD", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency("1000")).toBe("$1,000.00");
  });

  it("returns $0.00 for NaN", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
    expect(formatCurrency("invalid")).toBe("$0.00");
  });
});

describe("formatNumber", () => {
  it("formats with separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber("1234.5", 1)).toBe("1,234.5");
  });

  it("returns 0 for NaN", () => {
    expect(formatNumber("x")).toBe("0");
  });
});

describe("formatPercentage", () => {
  it("formats decimal as percentage", () => {
    expect(formatPercentage(0.5)).toBe("50.00%");
    expect(formatPercentage(0.5, 0)).toBe("50%");
  });

  it("formats already percentage when isDecimal false", () => {
    expect(formatPercentage(50, 2, false)).toBe("50.00%");
  });
});

describe("formatPriceChange", () => {
  it("computes change and percentage", () => {
    const r = formatPriceChange(100, 110);
    expect(r.value).toBe(10);
    expect(r.percentage).toBe(10);
    expect(r.formatted).toContain("+10");
  });

  it("handles firstPrice 0", () => {
    const r = formatPriceChange(0, 10);
    expect(r.percentage).toBe(0);
  });
});

describe("validatePolymarketService", () => {
  it("returns true when context and service present", () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "polymarket odds" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("show polymarket markets");
    const runtime = createMockRuntime({ polymarketService: createMockPolymarketService([]) });
    expect(validatePolymarketService(runtime, "TEST", state, message)).toBe(true);
  });

  it("returns false when service is null", () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "polymarket" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("polymarket");
    const runtime = createMockRuntime({ polymarketService: null });
    expect(validatePolymarketService(runtime, "TEST", state, message)).toBe(false);
  });

  it("returns false when not in context", () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "weather today" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("tell me a joke");
    const runtime = createMockRuntime({ polymarketService: createMockPolymarketService([]) });
    expect(validatePolymarketService(runtime, "TEST", state, message)).toBe(false);
  });
});

describe("getPolymarketService", () => {
  it("returns service when registered", () => {
    const mock = createMockPolymarketService([]);
    const runtime = createMockRuntime({ polymarketService: mock });
    expect(getPolymarketService(runtime)).toBe(mock);
  });

  it("returns null when not registered", () => {
    const runtime = createMockRuntime({ polymarketService: null });
    expect(getPolymarketService(runtime)).toBeNull();
  });
});

describe("extractActionParams", () => {
  it("returns actionParams from composed state", async () => {
    const params = { group: "crypto", limit: 10 };
    const runtime = createMockRuntime({
      composeState: async () =>
        createMockState({ data: { actionParams: params } }),
    });
    const message = createMockMessage("test");
    const result = await extractActionParams<{ group: string; limit: number }>(runtime, message);
    expect(result).toEqual(params);
  });

  it("returns empty object when no actionParams", async () => {
    const runtime = createMockRuntime({
      composeState: async () => createMockState({ data: {} }),
    });
    const message = createMockMessage("test");
    const result = await extractActionParams(runtime, message);
    expect(result).toEqual({});
  });
});
