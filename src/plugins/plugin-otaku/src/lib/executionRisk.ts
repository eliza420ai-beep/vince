/**
 * Post-execution risk cooldowns: consecutive BANKR failures → temporary block,
 * optional hard stop until operator reset. Inspired by graduated risk response
 * patterns (e.g. Nunchi APEX risk guardian); implemented without HL coupling.
 */

import type { IAgentRuntime } from "@elizaos/core";

export const OTAKU_EXECUTION_RISK_CACHE_KEY = "otaku:execution_risk_v1";

export type ExecutionRiskState = {
  consecutiveFailures: number;
  cooldownUntil: number;
  hardStopped: boolean;
};

const DEFAULT_STATE: ExecutionRiskState = {
  consecutiveFailures: 0,
  cooldownUntil: 0,
  hardStopped: false,
};

function parseBool(v: unknown, defaultVal: boolean): boolean {
  if (v === undefined || v === null || v === "") return defaultVal;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return defaultVal;
}

function parseIntSetting(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function getExecutionRiskSettings(runtime: IAgentRuntime): {
  enabled: boolean;
  failThreshold: number;
  cooldownMs: number;
  hardStopAfter: number;
} {
  return {
    enabled: parseBool(runtime.getSetting("OTAKU_RISK_COOLDOWN_ENABLED"), true),
    failThreshold: Math.max(
      1,
      parseIntSetting(runtime.getSetting("OTAKU_RISK_FAIL_THRESHOLD"), 2),
    ),
    cooldownMs: Math.max(
      60_000,
      parseIntSetting(
        runtime.getSetting("OTAKU_RISK_COOLDOWN_MS"),
        30 * 60 * 1000,
      ),
    ),
    hardStopAfter: parseIntSetting(
      runtime.getSetting("OTAKU_RISK_HARD_STOP_AFTER"),
      0,
    ),
  };
}

async function loadState(runtime: IAgentRuntime): Promise<ExecutionRiskState> {
  const raw = await runtime.getCache<ExecutionRiskState>(
    OTAKU_EXECUTION_RISK_CACHE_KEY,
  );
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  return {
    consecutiveFailures: Math.max(
      0,
      Number((raw as ExecutionRiskState).consecutiveFailures) || 0,
    ),
    cooldownUntil: Math.max(
      0,
      Number((raw as ExecutionRiskState).cooldownUntil) || 0,
    ),
    hardStopped: Boolean((raw as ExecutionRiskState).hardStopped),
  };
}

async function saveState(
  runtime: IAgentRuntime,
  state: ExecutionRiskState,
): Promise<void> {
  await runtime.setCache(OTAKU_EXECUTION_RISK_CACHE_KEY, state);
}

export type ExecutionGateResult = { ok: true } | { ok: false; reason: string };

export async function assertExecutionAllowed(
  runtime: IAgentRuntime,
): Promise<ExecutionGateResult> {
  const { enabled } = getExecutionRiskSettings(runtime);
  if (!enabled) return { ok: true };

  const state = await loadState(runtime);
  const now = Date.now();

  if (state.hardStopped) {
    return {
      ok: false,
      reason:
        "Execution hard-stopped after repeated failures. Say **otaku reset execution risk** (exact phrase) to clear, or fix BANKR and env, then reset.",
    };
  }

  if (state.cooldownUntil > now) {
    const mins = Math.max(1, Math.ceil((state.cooldownUntil - now) / 60_000));
    return {
      ok: false,
      reason: `Execution cooldown active (~${mins} min). Recent failures tripped a pause. Check logs or run **reconcile portfolio** when ready.`,
    };
  }

  return { ok: true };
}

export async function recordExecutionSuccess(
  runtime: IAgentRuntime,
): Promise<void> {
  const { enabled } = getExecutionRiskSettings(runtime);
  if (!enabled) return;
  await saveState(runtime, { ...DEFAULT_STATE });
}

export async function recordExecutionFailure(
  runtime: IAgentRuntime,
): Promise<void> {
  const { enabled, failThreshold, cooldownMs, hardStopAfter } =
    getExecutionRiskSettings(runtime);
  if (!enabled) return;

  const state = await loadState(runtime);
  let consecutiveFailures = state.consecutiveFailures + 1;

  if (hardStopAfter > 0 && consecutiveFailures >= hardStopAfter) {
    await saveState(runtime, {
      consecutiveFailures: 0,
      cooldownUntil: 0,
      hardStopped: true,
    });
    return;
  }

  if (consecutiveFailures >= failThreshold) {
    await saveState(runtime, {
      consecutiveFailures: 0,
      cooldownUntil: Date.now() + cooldownMs,
      hardStopped: state.hardStopped,
    });
    return;
  }

  await saveState(runtime, {
    consecutiveFailures,
    cooldownUntil: 0,
    hardStopped: state.hardStopped,
  });
}

export async function clearExecutionRiskState(
  runtime: IAgentRuntime,
): Promise<void> {
  await saveState(runtime, { ...DEFAULT_STATE });
}

export async function formatExecutionRiskStatus(
  runtime: IAgentRuntime,
): Promise<string> {
  const { enabled, failThreshold, cooldownMs, hardStopAfter } =
    getExecutionRiskSettings(runtime);
  const state = await loadState(runtime);
  const now = Date.now();
  const lines = [
    "**Otaku execution risk**",
    `- Cooldown feature: ${enabled ? "on" : "off"} (OTAKU_RISK_COOLDOWN_ENABLED)`,
    `- Fail threshold: ${failThreshold} (OTAKU_RISK_FAIL_THRESHOLD)`,
    `- Cooldown length: ${Math.round(cooldownMs / 60_000)} min (OTAKU_RISK_COOLDOWN_MS)`,
    `- Hard stop after: ${hardStopAfter > 0 ? hardStopAfter : "off"} (OTAKU_RISK_HARD_STOP_AFTER)`,
    `- State: consecutiveFailures=${state.consecutiveFailures}, hardStopped=${state.hardStopped}, cooldown=${state.cooldownUntil > now ? `~${Math.ceil((state.cooldownUntil - now) / 60_000)} min left` : "none"}`,
  ];
  return lines.join("\n");
}
