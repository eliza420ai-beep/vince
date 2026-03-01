import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import type {
  IAgentRuntime,
  Memory,
  UUID,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { solusOptimalStrikeAction } from "../actions/solusOptimalStrike.action";
import { solusSizingStateProvider } from "../providers/solusSizingState.provider";
import { solusMarketContextProvider } from "../providers/solusMarketContext.provider";
import { hypersurfaceSpotPricesProvider } from "../providers/hypersurfaceSpotPrices.provider";
import type { Provider } from "@elizaos/core";
import { loadRecords } from "../utils/assignmentPredictionsStore";

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

type RuntimeOverrides = {
  characterName?: string;
  getService?: (name: string) => unknown;
  getCache?: (key: string) => Promise<unknown>;
  setCache?: (key: string, value: unknown) => Promise<boolean>;
  sizingProvider?: Provider;
  marketContextProvider?: Provider;
  spotPricesProvider?: Provider;
};

function createRuntime(overrides: RuntimeOverrides = {}): IAgentRuntime & {
  composeState: ReturnType<typeof vi.fn>;
  useModel: ReturnType<typeof vi.fn>;
} {
  const getService =
    overrides.getService ??
    ((_name: string) => {
      return null;
    });
  const getCache =
    overrides.getCache ??
    (async () => {
      return undefined;
    });
  const setCache =
    overrides.setCache ??
    (async () => {
      return true;
    });

  const sizingProvider: Provider =
    overrides.sizingProvider ?? solusSizingStateProvider;
  const marketProvider: Provider =
    overrides.marketContextProvider ?? solusMarketContextProvider;
  const spotProvider: Provider =
    overrides.spotPricesProvider ?? hypersurfaceSpotPricesProvider;

  const useModel = vi.fn(async (_model: unknown, args: unknown) => {
    const prompt =
      typeof (args as { prompt?: string }).prompt === "string"
        ? (args as { prompt: string }).prompt
        : "";
    const asset =
      ["BTC", "ETH", "SOL", "HYPE"].find((t) => prompt.includes(t)) ??
      "UNKNOWN";
    return `Mock strike call for ${asset}`;
  });

  const runtime: Partial<IAgentRuntime> = {
    agentId: uuidv4() as UUID,
    character: { name: overrides.characterName ?? "Solus" },
    getService,
    getCache,
    setCache,
    useModel,
  };

  const composeState = vi.fn(
    async (
      message: Memory,
      providerNames?: string[],
      _includeText?: boolean,
      _existingState?: State,
    ): Promise<State> => {
      const state: State & {
        values?: Record<string, unknown>;
      } = {
        text: "",
        values: {},
      };

      const providersMap: Record<string, Provider> = {
        SOLUS_SIZING_STATE: sizingProvider,
        SOLUS_MARKET_CONTEXT: marketProvider,
        SOLUS_HYPERSURFACE_SPOT_PRICES: spotProvider,
      };

      if (Array.isArray(providerNames)) {
        for (const name of providerNames) {
          const provider = providersMap[name];
          if (!provider) continue;
          const res = await provider.get(
            runtime as IAgentRuntime,
            message,
            state,
          );
          if (typeof res.text === "string" && res.text.length > 0) {
            state.text = state.text ? `${state.text}\n${res.text}` : res.text;
          }
          if (res.values) {
            state.values = {
              ...(state.values ?? {}),
              ...res.values,
            };
          }
        }
      }

      return state;
    },
  );

  (runtime as IAgentRuntime).composeState =
    composeState as unknown as IAgentRuntime["composeState"];

  return runtime as IAgentRuntime & {
    composeState: ReturnType<typeof vi.fn>;
    useModel: ReturnType<typeof vi.fn>;
  };
}

describe("SOLUS_OPTIMAL_STRIKE integration", () => {
  describe("validate", () => {
    it("recognizes optimal-strike questions for BTC/SOL/HYPE when Solus is active", async () => {
      const runtime = createRuntime();

      const questions = [
        "what would be a good strike for BTC for next week?",
        "what would be a good strike for SOL for next week?",
        "what would be a good strike for HYPE for next week?",
        "optimal strike please",
      ];

      for (const q of questions) {
        const message = createMessage(q);
        const ok = await solusOptimalStrikeAction.validate(runtime, message);
        expect(ok).toBe(true);
      }
    });

    it("rejects optimal-strike questions when character is not Solus", async () => {
      const runtime = createRuntime({ characterName: "Kelly" });
      const message = createMessage(
        "what would be a good strike for BTC for next week?",
      );
      const ok = await solusOptimalStrikeAction.validate(runtime, message);
      expect(ok).toBe(false);
    });
  });

  describe("handler happy path with full context", () => {
    function buildRuntimeWithServices(): IAgentRuntime & {
      composeState: ReturnType<typeof vi.fn>;
      useModel: ReturnType<typeof vi.fn>;
    } {
      const vinceMarketDataService = {
        getEnrichedContext: vi.fn(async (asset: string) => ({
          asset,
          currentPrice:
            asset === "BTC" ? 70_000 : asset === "ETH" ? 3_500 : 200,
          priceChange24h: 2.5,
          fundingRate: 0,
          longShortRatio: 1,
          fearGreedValue: null,
          fearGreedLabel: null,
          marketRegime: "balanced",
          timestamp: Date.now(),
          dailyOpenPrice: 0,
          volume24h: 10_000_000,
          volumeRatio: 1.1,
        })),
        getATRPercent: vi.fn(async () => 4.2),
        getDVOL: vi.fn(async () => 60),
      };

      const hyperliquidService = {
        getMarkPriceAndChange: vi.fn(
          async (
            symbol: string,
          ): Promise<{
            price: number;
          } | null> => {
            const map: Record<string, number> = {
              BTC: 69_000,
              ETH: 3_400,
              SOL: 220,
              HYPE: 30,
            };
            const price = map[symbol];
            return typeof price === "number" ? { price } : null;
          },
        ),
      };

      const runtime = createRuntime({
        getService: (name: string) => {
          if (name === "VINCE_MARKET_DATA_SERVICE")
            return vinceMarketDataService;
          if (name === "HYPERLIQUID_SERVICE") return hyperliquidService;
          return null;
        },
        getCache: async () => undefined,
        setCache: async () => true,
      });

      return runtime;
    }

    it.each([
      ["BTC", "what would be a good strike for BTC for next week?"],
      ["SOL", "what would be a good strike for SOL for next week?"],
      ["HYPE", "what would be a good strike for HYPE for next week?"],
    ])(
      "composes sizing, market, and spot context and emits Strike Call for %s",
      async (_assetLabel, question) => {
        const runtime = buildRuntimeWithServices();
        const message = createMessage(question);
        const callback = vi.fn<HandlerCallback>();

        const valid = await solusOptimalStrikeAction.validate(runtime, message);
        expect(valid).toBe(true);

        const result = await solusOptimalStrikeAction.handler(
          runtime,
          message,
          {} as State,
          {},
          callback,
        );

        const composeStateMock = runtime.composeState as unknown as vi.Mock;
        expect(composeStateMock).toHaveBeenCalledTimes(1);
        const [composeMsg, providerNames] = composeStateMock.mock.calls[0];
        expect((composeMsg as Memory).content?.text).toBe(question);
        expect(providerNames).toEqual([
          "SOLUS_HYPERSURFACE_CONTEXT",
          "SOLUS_SIZING_STATE",
          "SOLUS_MARKET_CONTEXT",
          "SOLUS_HYPERSURFACE_SPOT_PRICES",
          "SOLUS_OPTIONS_CONTEXT",
          "SOLUS_CALIBRATION_CONTEXT",
          "VINCE_STRIKE_SUGGESTION",
        ]);

        const composedState = await composeStateMock.mock.results[0].value;

        if (composedState.values?.solusSizingState) {
          const entries = composedState.values.solusSizingState.entries;
          expect(Object.keys(entries).length).toBeGreaterThanOrEqual(1);
          expect(entries.BTC).toBeDefined();
          expect(composedState.text).toContain("[Solus sizing state]");
        }

        expect(
          composedState.values?.solusMarketContext?.assets?.BTC,
        ).toBeDefined();
        expect(composedState.values?.hypersurfaceSpotPrices).toBeDefined();

        expect(composedState.text).toContain("[Solus market context]");
        expect(composedState.text).toContain("[Hypersurface spot USD]");

        expect(callback).toHaveBeenCalledTimes(1);
        const payload = callback.mock.calls[0][0];
        expect(payload.text).toContain("**Strike Call**");
        expect(payload.text).toContain("Mock strike call");
        expect(payload.actions).toEqual(["SOLUS_OPTIMAL_STRIKE"]);

        if (result) {
          expect(result.success).toBe(true);
        }
      },
    );
  });

  describe("degraded context", () => {
    it("handles missing sizing state but still uses market and spot context", async () => {
      const emptySizingProvider: Provider = {
        name: "SOLUS_SIZING_STATE",
        description: "Empty sizing provider for degraded test",
        position: -5,
        get: async () => {
          return {};
        },
      };

      const vinceMarketDataService = {
        getEnrichedContext: vi.fn(async () => ({
          asset: "BTC",
          currentPrice: 70_000,
          priceChange24h: 1,
          fundingRate: 0,
          longShortRatio: 1,
          fearGreedValue: null,
          fearGreedLabel: null,
          marketRegime: "balanced",
          timestamp: Date.now(),
          dailyOpenPrice: 0,
          volume24h: 10_000_000,
          volumeRatio: 1.1,
        })),
        getATRPercent: vi.fn(async () => 4.2),
        getDVOL: vi.fn(async () => 60),
      };

      const hyperliquidService = {
        getMarkPriceAndChange: vi.fn(async () => ({ price: 69_000 })),
      };

      const runtime = createRuntime({
        sizingProvider: emptySizingProvider,
        getService: (name: string) => {
          if (name === "VINCE_MARKET_DATA_SERVICE")
            return vinceMarketDataService;
          if (name === "HYPERLIQUID_SERVICE") return hyperliquidService;
          return null;
        },
        getCache: async () => undefined,
        setCache: async () => true,
      });

      const message = createMessage(
        "what would be a good strike for BTC for next week?",
      );
      const callback = vi.fn<HandlerCallback>();

      const result = await solusOptimalStrikeAction.handler(
        runtime,
        message,
        {} as State,
        {},
        callback,
      );

      const composeStateMock = runtime.composeState as unknown as vi.Mock;
      const composedState = await composeStateMock.mock.results[0].value;

      expect(composedState.values?.solusSizingState).toBeUndefined();
      expect(
        composedState.values?.solusMarketContext?.assets?.BTC,
      ).toBeDefined();
      expect(composedState.values?.hypersurfaceSpotPrices).toBeDefined();

      const useModelMock = runtime.useModel as unknown as vi.Mock;
      const promptArg = useModelMock.mock.calls[0][1]?.prompt as string;
      expect(promptArg).toContain("[Solus market context]");
      expect(promptArg).toContain("[Hypersurface spot USD]");

      expect(callback).toHaveBeenCalledTimes(1);
      if (result) {
        expect(result.success).toBe(true);
      }
    });

    it("handles missing market and spot context but still runs on sizing state", async () => {
      const runtime = createRuntime({
        marketContextProvider: {
          name: "SOLUS_MARKET_CONTEXT",
          description: "Empty market context provider for degraded test",
          position: -4,
          get: async () => {
            return {};
          },
        },
        spotPricesProvider: {
          name: "SOLUS_HYPERSURFACE_SPOT_PRICES",
          description: "Empty spot prices provider for degraded test",
          position: -4,
          get: async () => {
            return {};
          },
        },
      });

      const message = createMessage(
        "what would be a good strike for SOL for next week?",
      );
      const callback = vi.fn<HandlerCallback>();

      const result = await solusOptimalStrikeAction.handler(
        runtime,
        message,
        {} as State,
        {},
        callback,
      );

      const composeStateMock = runtime.composeState as unknown as vi.Mock;
      const composedState = await composeStateMock.mock.results[0].value;

      if (composedState.values?.solusSizingState) {
        expect(
          Object.keys(composedState.values.solusSizingState.entries).length,
        ).toBeGreaterThanOrEqual(1);
      }
      expect(composedState.values?.solusMarketContext).toBeUndefined();
      expect(composedState.values?.hypersurfaceSpotPrices).toBeUndefined();

      const useModelMock = runtime.useModel as unknown as vi.Mock;
      expect(useModelMock).toHaveBeenCalledTimes(1);
      const promptArg = useModelMock.mock.calls[0][1]?.prompt as string;
      expect(promptArg).toContain("Solus sizing state");
      expect(promptArg).toContain("invalidation");
      expect(promptArg).toContain("VINCE");
      expect(callback).toHaveBeenCalledTimes(1);
      if (result) {
        expect(result.success).toBe(true);
      }
    });
  });

  describe("auto-record (Phase 2)", () => {
    let tmpDir: string;
    const savedPath = process.env.SOLUS_AUTO_RECORD_PREDICTION;
    const savedStorePath = process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;

    beforeEach(() => {
      tmpDir = path.join(os.tmpdir(), `solus-auto-record-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });
      process.env.SOLUS_AUTO_RECORD_PREDICTION = "true";
      process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = path.join(
        tmpDir,
        "predictions.jsonl",
      );
    });

    afterEach(() => {
      if (savedPath !== undefined)
        process.env.SOLUS_AUTO_RECORD_PREDICTION = savedPath;
      else delete process.env.SOLUS_AUTO_RECORD_PREDICTION;
      if (savedStorePath !== undefined)
        process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = savedStorePath;
      else delete process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;
      try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
      } catch {
        /* ignore */
      }
    });

    it("appends prediction and strips Record line when useModel returns Record line", async () => {
      const runtime = createRuntime({
        getService: () => null,
        getCache: async () => undefined,
        setCache: async () => true,
      });
      (runtime.useModel as vi.Mock).mockResolvedValue(
        "BTC strike around $106k, ~24% assignment prob. Record: BTC 106000 24%",
      );

      const message = createMessage("optimal strike for BTC");
      const callback = vi.fn<HandlerCallback>();

      await solusOptimalStrikeAction.handler(
        runtime,
        message,
        {} as State,
        {},
        callback,
      );

      const records = loadRecords();
      expect(records.length).toBe(1);
      expect(records[0].asset).toBe("BTC");
      expect(records[0].strike).toBe(106000);
      expect(records[0].predictedAssignProb).toBe(0.24);

      const payload = callback.mock.calls[0][0];
      expect(payload.text).not.toContain("Record:");
      expect(payload.text).toContain("**Strike Call**");
      expect(payload.text).toContain("BTC strike");
    });
  });

  describe("error path", () => {
    it("returns fallback message and success=false when useModel throws", async () => {
      const failingRuntime = createRuntime();
      const failingUseModel = vi.fn(async () => {
        throw new Error("model boom");
      });
      failingRuntime.useModel =
        failingUseModel as unknown as IAgentRuntime["useModel"];

      const message = createMessage(
        "what would be a good strike for BTC for next week?",
      );
      const callback = vi.fn<HandlerCallback>();

      const result = await solusOptimalStrikeAction.handler(
        failingRuntime,
        message,
        {} as State,
        {},
        callback,
      );

      expect(callback).toHaveBeenCalledTimes(1);
      const payload = callback.mock.calls[0][0];
      expect(payload.text).toContain(
        "We don't have a pulse on where price lands by Friday",
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});
