/**
 * Analysis Actions Tests
 *
 * Tests for analysis-related actions:
 * - VINCE_ALOHA (aloha.action.ts)
 * - VINCE_GM (gm.action.ts)
 * - VINCE_INTEL (intel.action.ts)
 * - VINCE_GROK_EXPERT (grokExpert.action.ts) - commented out
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";

// Import actions
import { vinceAlohaAction } from "../../actions/aloha.action";
import { vinceGmAction } from "../../actions/gm.action";
import { vinceIntelAction } from "../../actions/intel.action";
// import { vinceGrokExpertAction } from "../../actions/grokExpert.action"; // Grok commented out

// ==========================================
// VINCE_ALOHA Tests
// ==========================================

describe("VINCE_ALOHA Action", () => {
  describe("validate", () => {
    it("should return true for 'aloha' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("aloha");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'bull bear' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("bull bear analysis");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'market analysis' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("market analysis");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'market outlook' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("market outlook");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'should i buy' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("should i buy BTC");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hello world");
      const result = await vinceAlohaAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("aloha");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceAlohaAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_GM Tests
// ==========================================

describe("VINCE_GM Action", () => {
  describe("validate", () => {
    it("should return true for 'gm' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("gm");
      const result = await vinceGmAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'good morning' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("good morning");
      const result = await vinceGmAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'morning briefing' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("morning briefing");
      const result = await vinceGmAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'status' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's the status");
      const result = await vinceGmAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("execute trade");
      const result = await vinceGmAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("good morning");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceGmAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_INTEL Tests
// ==========================================

describe("VINCE_INTEL Action", () => {
  describe("validate", () => {
    it("should return true for 'intel' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me intel");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'whales' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what are whales doing");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'liquidations' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show liquidations");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'top traders' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("top traders positions");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'order flow' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("order flow analysis");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's for dinner");
      const result = await vinceIntelAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show intel");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceIntelAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_GROK_EXPERT Tests (commented out - Grok feature disabled)
// ==========================================
/*
describe("VINCE_GROK_EXPERT Action", () => {
  describe("validate", () => {
    it("should return true for 'grok pulse' keyword", async () => { ... });
    it("should return true for 'grok expert' keyword", async () => { ... });
    ...
  });
  describe("handler", () => { ... });
});
*/

// ==========================================
// Error Handling Tests
// ==========================================

describe("Analysis Actions - Error Handling", () => {
  it("VINCE_ALOHA should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("aloha");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceAlohaAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_GM should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("gm");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceGmAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_INTEL should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("intel");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceIntelAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  // VINCE_GROK_EXPERT test commented out - Grok feature disabled
  // it("VINCE_GROK_EXPERT should call callback even when missing XAI service", async () => { ... });
});
