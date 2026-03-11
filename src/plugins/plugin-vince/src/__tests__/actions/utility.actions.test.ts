/**
 * Utility Actions Tests
 *
 * Tests for utility-related actions:
 * - VINCE_AIRDROPS (airdrops.action.ts)
 * - VINCE_UPLOAD (upload.action.ts) - knowledge ingestion now in plugin-eliza
 */

import { describe, it, expect } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";

// Import actions
import { vinceAirdropsAction } from "../../actions/airdrops.action";

// ==========================================
// VINCE_AIRDROPS Tests
// ==========================================

describe("VINCE_AIRDROPS Action", () => {
  describe("validate", () => {
    it("should return true for 'airdrops' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me airdrops");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'airdrop' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("airdrop farming");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'farming' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("farming status");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'treadfi' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("treadfi update");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'points' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("check my points");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'drop' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("token drop");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("good morning");
      const result = await vinceAirdropsAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show airdrops");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceAirdropsAction.handler(
          runtime,
          message,
          state,
          {},
          callback,
        );
      } catch (e) {
        // Handler may throw - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// VINCE_UPLOAD tests removed: knowledge ingestion now lives in plugin-eliza (UPLOAD, ADD_MICHELIN).

describe("Utility Actions - Error Handling", () => {
  it("VINCE_AIRDROPS should call callback (uses hardcoded protocols)", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("airdrops farming");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceAirdropsAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });
});

// ==========================================
// Integration Tests
// ==========================================

describe("Utility Actions - Integration", () => {
  it("VINCE_AIRDROPS should call callback with text response", async () => {
    const runtime = createMockRuntime();
    const message = createMockMessage("airdrop farming status");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceAirdropsAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw - that's ok
    }

    expect(callback.calls.length).toBeGreaterThan(0);
    expect(typeof callback.calls[0].text).toBe("string");
  });
});
