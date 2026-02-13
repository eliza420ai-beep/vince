/**
 * Tests for standup.context (kickoff builders)
 */

import { describe, it, expect } from "bun:test";
import { buildShortStandupKickoff } from "../standup.context";

describe("standup.context", () => {
  describe("buildShortStandupKickoff", () => {
    it("returns string containing Standup, date pattern, and @VINCE, go.", () => {
      const result = buildShortStandupKickoff();
      expect(result).toContain("Standup");
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result).toContain("@VINCE, go.");
    });

    it("is one line (no newlines)", () => {
      const result = buildShortStandupKickoff();
      expect(result).not.toContain("\n");
    });
  });
});
