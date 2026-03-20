import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import {
  OTAKU_EXECUTION_RISK_CACHE_KEY,
  assertExecutionAllowed,
  clearExecutionRiskState,
  recordExecutionFailure,
  recordExecutionSuccess,
} from "../lib/executionRisk";

function createRuntime(overrides?: {
  getSetting?: (k: string) => string | boolean | undefined;
  cache?: Map<string, unknown>;
}): IAgentRuntime {
  const cache = overrides?.cache ?? new Map<string, unknown>();
  return {
    getSetting: (k: string) => overrides?.getSetting?.(k),
    getCache: vi.fn(async (key: string) => cache.get(key)),
    setCache: vi.fn(async (key: string, value: unknown) => {
      cache.set(key, value);
      return true;
    }),
  } as unknown as IAgentRuntime;
}

describe("executionRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows execution when cooldown disabled", async () => {
    const rt = createRuntime({
      getSetting: (k) =>
        k === "OTAKU_RISK_COOLDOWN_ENABLED" ? "false" : undefined,
    });
    const g = await assertExecutionAllowed(rt);
    expect(g.ok).toBe(true);
  });

  it("enters cooldown after threshold failures", async () => {
    const map = new Map<string, unknown>();
    const rt = createRuntime({
      getSetting: (k) => {
        if (k === "OTAKU_RISK_FAIL_THRESHOLD") return "2";
        if (k === "OTAKU_RISK_COOLDOWN_MS") return "60000";
        return undefined;
      },
      cache: map,
    });

    expect((await assertExecutionAllowed(rt)).ok).toBe(true);
    await recordExecutionFailure(rt);
    expect((await assertExecutionAllowed(rt)).ok).toBe(true);
    await recordExecutionFailure(rt);
    const g = await assertExecutionAllowed(rt);
    expect(g.ok).toBe(false);
    expect(map.has(OTAKU_EXECUTION_RISK_CACHE_KEY)).toBe(true);
  });

  it("clears on success", async () => {
    const map = new Map<string, unknown>();
    const rt = createRuntime({
      getSetting: (k) => {
        if (k === "OTAKU_RISK_FAIL_THRESHOLD") return "1";
        if (k === "OTAKU_RISK_COOLDOWN_MS") return "60000";
        return undefined;
      },
      cache: map,
    });
    await recordExecutionFailure(rt);
    expect((await assertExecutionAllowed(rt)).ok).toBe(false);
    await recordExecutionSuccess(rt);
    expect((await assertExecutionAllowed(rt)).ok).toBe(true);
  });

  it("clearExecutionRiskState resets cache", async () => {
    const map = new Map<string, unknown>();
    map.set(OTAKU_EXECUTION_RISK_CACHE_KEY, {
      consecutiveFailures: 9,
      cooldownUntil: Date.now() + 999999,
      hardStopped: true,
    });
    const rt = createRuntime({ cache: map });
    await clearExecutionRiskState(rt);
    const next = map.get(OTAKU_EXECUTION_RISK_CACHE_KEY) as {
      hardStopped: boolean;
    };
    expect(next.hardStopped).toBe(false);
  });
});
