import { describe, it, expect } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import { evaluateMonthlySpendAlert } from "../tasks/spendAlerts.tasks";

function mockRuntime(params: {
  nowMs: number;
  totalTokens: number;
  vincesCostPer1kSetting?: string | number | null;
}): IAgentRuntime {
  const { nowMs, totalTokens, vincesCostPer1kSetting } = params;

  return {
    agentId: "test-agent" as any,
    // Minimal surface used by buildUsageResponse/evaluateMonthlySpendAlert.
    getLogs: async () => {
      return [
        {
          body: {
            status: "completed",
            endTime: nowMs,
            usage: { total_tokens: totalTokens },
          },
        },
      ];
    },
    getSetting: () => vincesCostPer1kSetting ?? null,
    getCache: async () => undefined,
    setCache: async () => true,
    getTasksByName: async () => [],
    registerTaskWorker: () => undefined,
    createTask: async () => "task-id" as any,
  } as unknown as IAgentRuntime;
}

describe("spendAlerts", () => {
  it("triggers when estimated monthly spend crosses threshold", async () => {
    const nowMs = Date.UTC(2026, 2, 15, 12, 0, 0, 0); // 2026-03-15 UTC
    const totalTokens = 200_000; // 200k / 1k = 200 * $0.006 = $1.20 (default estimate)
    const runtime = mockRuntime({ nowMs, totalTokens });

    const evaluation = await evaluateMonthlySpendAlert(runtime, 1, nowMs);
    expect(evaluation.monthKeyUtc).toBe("2026-03");
    expect(evaluation.triggered).toBe(true);
    expect(evaluation.estimatedCostUsd).toBeCloseTo(1.2, 6);
  });

  it("does not trigger when estimated spend is below threshold", async () => {
    const nowMs = Date.UTC(2026, 2, 15, 12, 0, 0, 0);
    const totalTokens = 1_000; // 1k / 1k = 1 * $0.006 = $0.006
    const runtime = mockRuntime({ nowMs, totalTokens });

    const evaluation = await evaluateMonthlySpendAlert(runtime, 1, nowMs);
    expect(evaluation.triggered).toBe(false);
    expect(evaluation.estimatedCostUsd).toBeCloseTo(0.006, 6);
  });
});
