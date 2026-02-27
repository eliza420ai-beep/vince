/**
 * Tests for standup data fetchers (e.g. fetchSolusData).
 *
 * Daily monitoring (hold/close/adjust, Current open positions) is covered by:
 * - plugin-solus weeklyOptionsContext.test.ts: parseWeeklyOptionsContext extracts Open positions.
 * - plugin-solus hypersurfaceKnowledge.test.ts: provider appends [Portfolio context] when env set.
 * - docs/standup/WEEKLY-OPTIONS-CONTEXT.md: file format and STANDUP_DELIVERABLES_DIR.
 */

import { describe, it, expect } from "bun:test";
import type { IAgentRuntime } from "@elizaos/core";
import { fetchSolusData } from "../standupDataFetcher";

function createMockSolusRuntime(): IAgentRuntime {
  return {
    agentId: "solus-id",
    character: { name: "Solus" },
    getService: () => null,
  } as unknown as IAgentRuntime;
}

describe("standupDataFetcher", () => {
  describe("fetchSolusData", () => {
    it("includes Solus day context, live spot guidance, and Your job block", async () => {
      const runtime = createMockSolusRuntime();
      const result = await fetchSolusData(runtime);
      expect(result).toContain("**Today:**");
      expect(result).toContain("Hypersurface weekly options settle Friday");
      expect(result).toContain("Your job");
    });
  });
});
