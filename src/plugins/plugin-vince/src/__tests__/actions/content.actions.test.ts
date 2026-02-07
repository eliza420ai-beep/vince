/**
 * Content Actions Tests
 *
 * Tests for content-related actions:
 * - VINCE_NEWS (news.action.ts)
 * - VINCE_MEMES (memes.action.ts)
 * - VINCE_NFT_FLOOR (nftFloor.action.ts)
 * - VINCE_HIP3 (hip3.action.ts)
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";

// Import actions
import { vinceNewsAction } from "../../actions/news.action";
import { vinceMemesAction } from "../../actions/memes.action";
import { vinceNftFloorAction } from "../../actions/nftFloor.action";
import { vinceHIP3Action } from "../../actions/hip3.action";

// ==========================================
// VINCE_NEWS Tests
// ==========================================

describe("VINCE_NEWS Action", () => {
  describe("validate", () => {
    it("should return true for 'news' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me news");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'headlines' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("crypto headlines");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'mando' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("mando updates");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'what's happening' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's happening in crypto");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'market update' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("market update");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("execute trade");
      const result = await vinceNewsAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show news");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceNewsAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw if service method is missing - that's expected
      }

      // Should have called callback at least once (success or error)
      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_MEMES Tests
// ==========================================

describe("VINCE_MEMES Action", () => {
  describe("validate", () => {
    it("should return true for 'meme' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show me memes");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'trenches' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("in the trenches");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'hot token' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hot token right now");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'ai token' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("ai token plays");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'smart money' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("smart money moves");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'pump' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's pumping");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      // Use a message that does not match any VINCE_MEMES trigger (e.g. not "good morning", "gm", "meme", etc.)
      const message = createMockMessage("execute trade");
      const result = await vinceMemesAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show memes");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceMemesAction.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw if service method is missing - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// VINCE_NFT_FLOOR Tests
// ==========================================

describe("VINCE_NFT_FLOOR Action", () => {
  describe("validate", () => {
    it("should return true for 'nft' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("nft opportunities");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'floor' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("check floor prices");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'punk' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("punk prices");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'cryptopunk' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("cryptopunk analysis");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'art' with 'price' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("art price check");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("execute trade");
      const result = await vinceNftFloorAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show nft floors");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceNftFloorAction.handler(
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
// VINCE_HIP3 Tests
// ==========================================

describe("VINCE_HIP3 Action", () => {
  describe("validate", () => {
    it("should return true for 'hip3' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hip3 update");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'hip-3' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hip-3 analysis");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'stocks' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("stocks today");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'gold price' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("gold price");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'nvda' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("nvda analysis");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'nvidia' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("nvidia stock");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'mag7' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("mag7 performance");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return true for 'commodities' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("commodities update");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should return false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hello world");
      const result = await vinceHIP3Action.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should call callback (with result or error)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("show hip3");
      const state = createMockState();
      const callback = createMockCallback();

      try {
        await vinceHIP3Action.handler(runtime, message, state, {}, callback);
      } catch (e) {
        // Handler may throw if service method is missing - that's expected
      }

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]).toHaveProperty("text");
    });
  });
});

// ==========================================
// Error Handling Tests
// ==========================================

describe("Content Actions - Error Handling", () => {
  it("VINCE_NEWS should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("news");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceNewsAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    // Should have called callback with error message
    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_MEMES should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("memes");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceMemesAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_NFT_FLOOR should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("nft");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceNftFloorAction.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });

  it("VINCE_HIP3 should call callback even when missing services", async () => {
    const runtime = createMockRuntime({ services: {} });
    const message = createMockMessage("hip3");
    const state = createMockState();
    const callback = createMockCallback();

    try {
      await vinceHIP3Action.handler(runtime, message, state, {}, callback);
    } catch (e) {
      // May throw, but callback should still be called
    }

    expect(callback.calls.length).toBeGreaterThan(0);
  });
});
