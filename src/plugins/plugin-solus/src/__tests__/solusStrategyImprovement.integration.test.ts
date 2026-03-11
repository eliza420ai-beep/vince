/**
 * Solus strategy improvement — extensive integration test.
 *
 * Proves Solus gives meaningfully better weekly strategy suggestions when given:
 * (1) Real options positions (fixture matching solus-options-sizing.md),
 * (2) SOLUS_OPTIONS_CONTEXT with assignment probability and 95% CI,
 * (3) Hypersurface early-close framing (Thursday / 24h).
 *
 * Asserts prompt richness and response shape only.
 *
 * Out of scope (keep this test focused):
 * - No real LLM call in CI — mock useModel only; no live API.
 * - No changes to Deribit or CoinGecko beyond existing mocks — this test injects
 *   SOLUS_OPTIONS_CONTEXT and SOLUS_HYPERSURFACE_SPOT_PRICES via mocks.
 * - Brier / assignment calibration is tested in assignmentPredictionsStore.test.ts
 *   and assignmentProbability.test.ts; this file focuses on strategy suggestion
 *   quality (prompt richness and response shape).
 */

import { describe, it, expect, vi } from "vitest";
import type {
  IAgentRuntime,
  Memory,
  UUID,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import * as path from "node:path";
import * as fs from "node:fs";
import { solusOptimalStrikeAction } from "../actions/solusOptimalStrike.action";
import { hypersurfaceContextProvider } from "../providers/hypersurfaceContext.provider";
import { solusSizingStateProvider } from "../providers/solusSizingState.provider";
import { solusMarketContextProvider } from "../providers/solusMarketContext.provider";
import { hypersurfaceSpotPricesProvider } from "../providers/hypersurfaceSpotPrices.provider";
import type { Provider, ProviderResult } from "@elizaos/core";
import type { SolusSizingState } from "../providers/solusSizingState.provider";

const FIXTURE_PATH = path.join(
  __dirname,
  "fixtures",
  "solus-options-sizing-sample.md",
);

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

/** Build sizing state and text from fixture file (same structure as real sizing). */
function buildSizingFromFixture(): {
  text: string;
  state: SolusSizingState;
} {
  let markdown: string;
  try {
    markdown = fs.readFileSync(FIXTURE_PATH, "utf-8");
  } catch {
    markdown = `
### BTC — Covered Calls (active)
- asset: BTC
- venue: Hypersurface
- position_type: covered_calls
- strike_usd: 69500
- expiry_utc: 2026-03-06T08:00:00Z
- weekly_premium_target_usd: 2000
- current_plan: >
  Hold to expiry or manage if spot approaches strike. Roll or adjust if needed.
  Thursday evening review for early exercise.

### HYPE — Secured Puts + Covered Calls (active)
- asset: HYPE
- venue: Hypersurface
- position_type: covered_calls
- strike_usd: 30
- expiry_utc: 2026-03-06T08:00:00Z
- weekly_premium_target_usd: 2000

### SOL — Spot Stack (covered-calls candidate)
- asset: SOL
- venue: spot
- position_type: spot_stack
- weekly_premium_target_usd: 2000
- question_for_solus: Sell covered calls or swap into HYPE/BTC for premium.
`.trim();
  }

  const entries: SolusSizingState["entries"] = {};
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  if (lines[i]?.trim() === "---") {
    i += 1;
    while (i < lines.length && lines[i].trim() !== "---") i += 1;
    if (i < lines.length) i += 1;
  }
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      const heading = line.replace(/^###\s+/, "").trim();
      const asset = (heading.split("—")[0]?.trim() ?? heading).toUpperCase();
      const raw: Record<string, string> = {};
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("### ")) {
        const m = lines[j].match(/^\-\s*([^:]+):\s*(.*)$/);
        if (m) {
          const k = m[1]
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
          raw[k] = (m[2] ?? "").trim();
        }
        j += 1;
      }
      const strikeUsd = raw.strike_usd
        ? parseInt(raw.strike_usd, 10)
        : undefined;
      const weeklyPremiumTargetUsd = raw.weekly_premium_target_usd
        ? parseInt(raw.weekly_premium_target_usd, 10)
        : undefined;
      entries[asset] = {
        asset,
        venue: raw.venue,
        positionType: raw.position_type?.replace(/-/g, "_"),
        strikeUsd: Number.isFinite(strikeUsd) ? strikeUsd : undefined,
        expiryUtc: raw.expiry_utc,
        weeklyPremiumTargetUsd: Number.isFinite(weeklyPremiumTargetUsd)
          ? weeklyPremiumTargetUsd
          : undefined,
        currentPlan: raw.current_plan,
        questionForSolus: raw.question_for_solus,
        notes: raw.notes,
        raw,
        missing: [],
      };
      i = j;
      continue;
    }
    i += 1;
  }

  const summaryLines: string[] = ["[Solus sizing state]"];
  for (const entry of Object.values(entries)) {
    let header = `- ${entry.asset} · ${entry.positionType ?? ""} · @ ${entry.venue ?? ""}`;
    const details: string[] = [];
    if (entry.strikeUsd) details.push(`strike ~$${entry.strikeUsd.toFixed(0)}`);
    if (entry.expiryUtc) details.push(`expiry ${entry.expiryUtc}`);
    if (entry.weeklyPremiumTargetUsd)
      details.push(
        `weekly premium target ~$${entry.weeklyPremiumTargetUsd.toFixed(0)}`,
      );
    if (details.length > 0) header += ` — ${details.join(", ")}`;
    summaryLines.push(header);
    if (entry.questionForSolus?.trim())
      summaryLines.push(
        `  → Question for Solus: ${entry.questionForSolus.trim()}`,
      );
  }
  const text = summaryLines.join("\n");
  return { text, state: { entries, rawMarkdown: markdown } };
}

function createMockSizingProvider(): Provider {
  const { text, state } = buildSizingFromFixture();
  return {
    name: "SOLUS_SIZING_STATE",
    description: "Mock sizing from fixture",
    position: -5,
    get: async (): Promise<ProviderResult> => ({
      text,
      values: { solusSizingState: state },
    }),
  };
}

const MOCK_OPTIONS_CONTEXT_TEXT = `[Solus options context — Deribit]
BTC: spot $70,000 | DVOL 60 | ATM IV 55% | skew —
  Best CC: 25Δ @ $72,000 (~2.1%/wk) — assignment prob ~28% (95% CI 25–31%)
  Best CSP: 25Δ @ $68,000 (~2.0%/wk) — assignment prob ~24% (95% CI 21–27%)
ETH: spot $3,500 | DVOL 58 | ATM IV 52% | skew —
  Best CC: 25Δ @ $3,650 (~2.2%/wk) — assignment prob ~26% (95% CI 23–29%)
  Best CSP: 25Δ @ $3,350 (~2.1%/wk) — assignment prob ~25% (95% CI 22–28%)`;

function createMockOptionsContextProvider(): Provider {
  return {
    name: "SOLUS_OPTIONS_CONTEXT",
    description: "Mock Deribit options with assignment prob",
    position: -4,
    get: async (): Promise<ProviderResult> => ({
      text: MOCK_OPTIONS_CONTEXT_TEXT,
      values: {},
    }),
  };
}

function createMockMarketContextProvider(): Provider {
  return {
    name: "SOLUS_MARKET_CONTEXT",
    description: "Mock market context",
    position: -4,
    get: async (): Promise<ProviderResult> => ({
      text: "[Solus market context]\nBTC $70,000 24h +1.2% regime balanced. HYPE $30. SOL $220.",
      values: {
        solusMarketContext: {
          assets: {
            BTC: {
              asset: "BTC",
              price: 70_000,
              change24h: 1.2,
              marketRegime: "balanced",
            },
            HYPE: {
              asset: "HYPE",
              price: 30,
              change24h: 0,
              marketRegime: "balanced",
            },
            SOL: {
              asset: "SOL",
              price: 220,
              change24h: -2,
              marketRegime: "balanced",
            },
          },
          fearGreed: null,
        },
      },
    }),
  };
}

function createMockSpotPricesProvider(): Provider {
  return {
    name: "SOLUS_HYPERSURFACE_SPOT_PRICES",
    description: "Mock spot prices",
    position: -4,
    get: async (): Promise<ProviderResult> => ({
      text: "[Hypersurface spot USD] BTC $70,000, ETH $3,500, SOL $220, HYPE $30",
      values: {
        hypersurfaceSpotPrices: {
          bitcoin: 70_000,
          ethereum: 3_500,
          solana: 220,
          hyperliquid: 30,
        },
      },
    }),
  };
}

const MOCK_CALIBRATION_TEXT =
  "[Solus calibration]\nAssignment calibration (last 30d): Brier = 0.0520 (n = 12). Lower is better. Recent: BTC $106,000 24% → assigned; ETH $3,500 18% → not assigned";

function createMockCalibrationProvider(): Provider {
  return {
    name: "SOLUS_CALIBRATION_CONTEXT",
    description: "Mock calibration for strategy test",
    position: -3,
    get: async (): Promise<ProviderResult> => ({
      text: MOCK_CALIBRATION_TEXT,
      values: { brierMean: 0.052, brierCount: 12 },
    }),
  };
}

describe("Solus strategy quality with real sizing + options context (assignment prob, early close)", () => {
  it("composes full context and prompt includes sizing, assignment prob, early close, and strategy framing", async () => {
    const mockSizing = createMockSizingProvider();
    const mockOptions = createMockOptionsContextProvider();
    const mockMarket = createMockMarketContextProvider();
    const mockSpot = createMockSpotPricesProvider();

    const mockCalibration = createMockCalibrationProvider();
    const providersMap: Record<string, Provider> = {
      SOLUS_HYPERSURFACE_CONTEXT: hypersurfaceContextProvider,
      SOLUS_SIZING_STATE: mockSizing,
      SOLUS_MARKET_CONTEXT: mockMarket,
      SOLUS_HYPERSURFACE_SPOT_PRICES: mockSpot,
      SOLUS_OPTIONS_CONTEXT: mockOptions,
      SOLUS_CALIBRATION_CONTEXT: mockCalibration,
      VINCE_STRIKE_SUGGESTION: {
        name: "VINCE_STRIKE_SUGGESTION",
        description: "Mock",
        position: 0,
        get: async () => ({}),
      },
    };

    let capturedPrompt = "";
    const useModel = vi.fn(async (_model: unknown, args: unknown) => {
      const prompt =
        typeof (args as { prompt?: string }).prompt === "string"
          ? (args as { prompt: string }).prompt
          : "";
      capturedPrompt = prompt;
      return "BTC: hold current CC at 69500; watch Thursday for early exercise; invalidation below 67k. HYPE: keep CC/CSP at 30; size. SOL: consider CC when vol supports; skip or watch.";
    });

    const runtime: IAgentRuntime = {
      agentId: uuidv4() as UUID,
      character: { name: "Solus" },
      getService: () => null,
      getCache: async () => undefined,
      setCache: async () => true,
      useModel: useModel as IAgentRuntime["useModel"],
      composeState: async (
        _message: Memory,
        providerNames?: string[],
        _includeText?: boolean,
        _existingState?: State,
      ): Promise<State> => {
        const state: State & { values?: Record<string, unknown> } = {
          text: "",
          values: {},
        };
        if (Array.isArray(providerNames)) {
          for (const name of providerNames) {
            const provider = providersMap[name];
            if (!provider) continue;
            const res = await provider.get(runtime, createMessage(""), state);
            if (typeof res.text === "string" && res.text.length > 0)
              state.text = state.text ? `${state.text}\n${res.text}` : res.text;
            if (res.values)
              state.values = { ...(state.values ?? {}), ...res.values };
          }
        }
        return state;
      },
    } as unknown as IAgentRuntime;

    const message = createMessage(
      "What’s the optimal strike and strategy for this week given our positions?",
    );
    const callback = vi.fn<HandlerCallback>();

    const result = await solusOptimalStrikeAction.handler!(
      runtime,
      message,
      {} as State,
      undefined,
      callback,
    );

    expect(useModel).toHaveBeenCalledTimes(1);
    const prompt = capturedPrompt;

    // 1. Sizing state: BTC, HYPE, SOL; strikes 69500 and 30; premium goal; current_plan wording
    expect(prompt).toContain("BTC");
    expect(prompt).toContain("HYPE");
    expect(prompt).toContain("SOL");
    expect(prompt).toMatch(/69500|69,500/);
    expect(prompt).toMatch(/\b30\b/);
    expect(prompt).toMatch(/2000|3000|premium/);
    expect(prompt).toMatch(/roll|adjust|premium|Thursday|early/);

    // 2. Assignment probability from options context
    expect(prompt).toMatch(/assignment prob|assignment probability/i);
    expect(prompt).toContain("95% CI");

    // 3. Early close / Hypersurface (from SOLUS_HYPERSURFACE_CONTEXT)
    expect(
      /early|Thursday|24h|exercise/.test(prompt),
      "Prompt should contain early-exercise framing (early, Thursday, 24h, or exercise)",
    ).toBe(true);

    // 4. Calibration in prompt (recursive learning)
    expect(prompt).toMatch(/Solus calibration|calibration/);
    expect(prompt).toMatch(/Brier|Recent/);

    // 5. Strategy framing in prompt template
    expect(prompt).toContain("invalidation");
    expect(
      /size|skip|watch/.test(prompt),
      "Prompt should ask for size/skip/watch",
    ).toBe(true);
    expect(
      /OTM|strike/.test(prompt),
      "Prompt should mention OTM or strike",
    ).toBe(true);

    // Response
    expect(callback).toHaveBeenCalledTimes(1);
    const payload = callback.mock.calls[0][0];
    expect(payload?.text).toContain("**Strike Call**");
    expect(payload?.text).toContain("69500");
    expect(payload?.text).toMatch(
      /invalidation|size|skip|watch|Thursday|early/,
    );

    expect(result).toBeDefined();
    if (result && "success" in result) {
      expect(result.success).toBe(true);
    }
  });

  it("optional: with real sizing file when present, prompt still has assignment prob and early close", async () => {
    const realPath = path.join(
      process.cwd(),
      "knowledge",
      "private",
      "solus-options-sizing.md",
    );
    if (!fs.existsSync(realPath)) {
      return; // Skip when real file missing (e.g. CI)
    }

    const mockOptions = createMockOptionsContextProvider();
    const mockMarket = createMockMarketContextProvider();
    const mockSpot = createMockSpotPricesProvider();

    const providersMap: Record<string, Provider> = {
      SOLUS_HYPERSURFACE_CONTEXT: hypersurfaceContextProvider,
      SOLUS_SIZING_STATE: solusSizingStateProvider,
      SOLUS_MARKET_CONTEXT: mockMarket,
      SOLUS_HYPERSURFACE_SPOT_PRICES: mockSpot,
      SOLUS_OPTIONS_CONTEXT: mockOptions,
      VINCE_STRIKE_SUGGESTION: {
        name: "VINCE_STRIKE_SUGGESTION",
        description: "Mock",
        position: 0,
        get: async () => ({}),
      },
    };

    let capturedPrompt = "";
    const useModel = vi.fn(async (_model: unknown, args: unknown) => {
      const prompt =
        typeof (args as { prompt?: string }).prompt === "string"
          ? (args as { prompt: string }).prompt
          : "";
      capturedPrompt = prompt;
      return "Strike call from real sizing + options context.";
    });

    const runtime: IAgentRuntime = {
      agentId: uuidv4() as UUID,
      character: { name: "Solus" },
      getService: () => null,
      getCache: async () => undefined,
      setCache: async () => true,
      useModel: useModel as IAgentRuntime["useModel"],
      composeState: async (
        _message: Memory,
        providerNames?: string[],
        _includeText?: boolean,
        _existingState?: State,
      ): Promise<State> => {
        const state: State & { values?: Record<string, unknown> } = {
          text: "",
          values: {},
        };
        if (Array.isArray(providerNames)) {
          for (const name of providerNames) {
            const provider = providersMap[name];
            if (!provider) continue;
            const res = await provider.get(runtime, createMessage(""), state);
            if (typeof res.text === "string" && res.text.length > 0)
              state.text = state.text ? `${state.text}\n${res.text}` : res.text;
            if (res.values)
              state.values = { ...(state.values ?? {}), ...res.values };
          }
        }
        return state;
      },
    } as unknown as IAgentRuntime;

    const message = createMessage("optimal strike for this week?");
    const callback = vi.fn<HandlerCallback>();

    await solusOptimalStrikeAction.handler!(
      runtime,
      message,
      {} as State,
      undefined,
      callback,
    );

    const prompt = capturedPrompt;
    expect(prompt).toMatch(/assignment prob|95% CI/i);
    expect(/early|Thursday|24h|exercise/.test(prompt)).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
