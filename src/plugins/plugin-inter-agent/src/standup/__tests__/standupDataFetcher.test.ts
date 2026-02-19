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
    it("includes Last week's strategy, Options context, and Your job", async () => {
      const runtime = createMockSolusRuntime();
      const result = await fetchSolusData(runtime);
      expect(result).toContain("Last week's strategy");
      expect(result).toContain("Options context");
      expect(result).toContain("Your job");
    });
  });
});
