/**
 * Utility Actions Tests
 *
 * Tests for utility-related actions:
 * - VINCE_LIFESTYLE (lifestyle.action.ts)
 * - VINCE_AIRDROPS (airdrops.action.ts)
 * - VINCE_UPLOAD (upload.action.ts)
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";

// Import actions
import { vinceLifestyleAction } from "../../actions/lifestyle.action";
import { vinceAirdropsAction } from "../../actions/airdrops.action";
import { vinceUploadAction } from "../../actions/upload.action";

// ==========================================
// VINCE_LIFESTYLE Tests
// ==========================================

describe("VINCE_LIFESTYLE Action", () => {
  describe("validate", () => {
    it("should return true for 'lifestyle' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("lifestyle suggestions");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'daily plan' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("daily plan");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'hotel' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hotel suggestions");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'dining' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("dining recommendations");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'health' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("health suggestions");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'swim' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("swim today");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'gym' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("gym session");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'what should i do' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what should i do today");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me perps");
      const result = await vinceLifestyleAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("daily plan");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceLifestyleAction.handler(
          runtime,
          message,
          state,
          {},
          callback,
        );
      } catch (e) {
        // Handler may throw if service method is missing - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

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

// ==========================================
// VINCE_UPLOAD Tests
// ==========================================

describe("VINCE_UPLOAD Action", () => {
  describe("validate", () => {
    // Note: Upload action requires MIN_TEXT_LENGTH (20 chars) to validate

    it("should return true for 'upload' keyword with sufficient content", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "upload this content: important data about market analysis",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'ingest' keyword with sufficient content", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "ingest this document: detailed trading strategy notes",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'remember this' keyword with content", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "remember this: The key insight about market cycles is that...",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'add to knowledge' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "add to knowledge base: This is critical information about",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'store this' keyword with content", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "store this important info: Market fundamentals and analysis",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for short messages", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("upload");
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(false);
    });

    it("should return true for YouTube URL (with upload intent or standalone)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for upload: <article URL>", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "upload: https://example.com/some-article-about-trading",
      );
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me perps analysis today");
      const result = await vinceUploadAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "upload this: important data that needs to be saved for later reference",
      );
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceUploadAction.handler(runtime, message, state, {}, callback);
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

describe("Utility Actions - Error Handling", () => {
  it("VINCE_LIFESTYLE should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("lifestyle suggestions");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceLifestyleAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

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

  it("VINCE_UPLOAD should call callback even when missing storage", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage(
      "upload: test data for knowledge base storage",
    );
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceUploadAction.handler(runtime, message, state, {}, callback);
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
  it("VINCE_LIFESTYLE should call callback with text response", async () => {
    const runtime = createMockRuntime();
    const message = createMockMessage("what should i do today");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceLifestyleAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw - that's ok
    }

    expect(callback.calls.length).toBeGreaterThan(0);
    expect(typeof callback.calls[0].text).toBe("string");
  });

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
