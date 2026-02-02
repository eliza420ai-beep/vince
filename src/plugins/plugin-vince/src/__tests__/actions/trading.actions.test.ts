/**
 * Trading Actions Tests
 *
 * Tests for trading-related actions:
 * - VINCE_BOT_TRADE (bot.action.ts)
 * - VINCE_BOT_PAUSE (vinceBotPause.action.ts)
 * - VINCE_BOT_STATUS (vinceBotStatus.action.ts)
 * - VINCE_PERPS (perps.action.ts)
 * - VINCE_OPTIONS (options.action.ts)
 * - VINCE_WHY_TRADE (vinceWhyTrade.action.ts)
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";

// Import actions
import { vinceBotAction } from "../../actions/bot.action";
import { vinceBotPauseAction } from "../../actions/vinceBotPause.action";
import { vinceBotStatusAction } from "../../actions/vinceBotStatus.action";
import { vincePerpsAction } from "../../actions/perps.action";
import { vinceOptionsAction } from "../../actions/options.action";
import { vinceWhyTradeAction } from "../../actions/vinceWhyTrade.action";

// ==========================================
// VINCE_BOT_TRADE Tests
// ==========================================

describe("VINCE_BOT_TRADE Action", () => {
  describe("validate", () => {
    it("should return true for 'run bot' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("run bot now");
      const result = await vinceBotAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'go long' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("go long on BTC");
      const result = await vinceBotAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'go short' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("go short ETH");
      const result = await vinceBotAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's the weather");
      const result = await vinceBotAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("run bot trigger");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceBotAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw if service method is missing - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_BOT_PAUSE Tests
// ==========================================

describe("VINCE_BOT_PAUSE Action", () => {
  describe("validate", () => {
    it("should return true for 'pause bot' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("pause bot");
      const result = await vinceBotPauseAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'resume bot' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("resume bot");
      const result = await vinceBotPauseAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'stop bot' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("stop bot");
      const result = await vinceBotPauseAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("check status");
      const result = await vinceBotPauseAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("pause bot");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceBotPauseAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
    });
  });
});

// ==========================================
// VINCE_BOT_STATUS Tests
// ==========================================

describe("VINCE_BOT_STATUS Action", () => {
  describe("validate", () => {
    it("should return true for 'bot status' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("bot status");
      const result = await vinceBotStatusAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'paper trading' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("paper trading");
      const result = await vinceBotStatusAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hello world");
      const result = await vinceBotStatusAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show bot");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceBotStatusAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_PERPS Tests
// ==========================================

describe("VINCE_PERPS Action", () => {
  describe("validate", () => {
    it("should return true for 'perps' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me perps");
      const result = await vincePerpsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'perpetuals' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("perpetuals analysis");
      const result = await vincePerpsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'trading signals' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("trading signals");
      const result = await vincePerpsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("good morning");
      const result = await vincePerpsAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show perps");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vincePerpsAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_OPTIONS Tests
// ==========================================

describe("VINCE_OPTIONS Action", () => {
  describe("validate", () => {
    it("should return true for 'options' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me options");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'covered call' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("covered call strategy");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'secured put' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("secured put on ETH");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'deribit' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("deribit analysis");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'friday' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("friday strikes");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's for lunch");
      const result = await vinceOptionsAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show options");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceOptionsAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_WHY_TRADE Tests
// ==========================================

describe("VINCE_WHY_TRADE Action", () => {
  describe("validate", () => {
    it("should return true for 'why trade' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("why trade");
      const result = await vinceWhyTradeAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'explain trade' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("explain trade");
      const result = await vinceWhyTradeAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'trade reasoning' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("trade reasoning");
      const result = await vinceWhyTradeAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hello there");
      const result = await vinceWhyTradeAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("explain trade");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceWhyTradeAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// Error Handling Tests
// ==========================================

describe("Trading Actions - Error Handling", () => {
  it("VINCE_BOT_TRADE should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("run bot now");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceBotAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_PERPS should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("perps");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vincePerpsAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_OPTIONS should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("options");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceOptionsAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });
});
