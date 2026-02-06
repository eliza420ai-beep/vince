# HOW.md — plugin-vince Development Guide

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

This is the **hands-on development guide** for plugin-vince: workflows, adding actions/services, testing, debugging, and common patterns.

**When to use this doc:** Adding or changing an action/service, debugging signal aggregation or the paper bot, writing tests, or looking up where state lives. For a full technical catalog (services, actions, constants), use [CLAUDE.md](./CLAUDE.md). For purpose and scope, use [WHAT.md](./WHAT.md); for framework rationale, [WHY.md](./WHY.md).

> **Quick Links:** [WHAT.md](./WHAT.md) | [WHY.md](./WHY.md) | [CLAUDE.md](./CLAUDE.md) | [README.md](./README.md) | [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [Adding New Actions](#adding-new-actions)
4. [Adding New Services](#adding-new-services)
5. [Working with the Paper Trading Bot](#working-with-the-paper-trading-bot)
6. [ML Enhancement Layer](#ml-enhancement-layer)
7. [Testing Patterns](#testing-patterns)
8. [Debugging Techniques](#debugging-techniques)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Where Things Live (Quick Map)

| I want to…                            | Look here                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Add a user-facing command             | `src/actions/*.action.ts` → register in `src/index.ts`                                      |
| Add a data source or bot component    | `src/services/*.service.ts` → register in `src/index.ts`                                    |
| Change what context the LLM sees      | `src/providers/vinceContext.provider.ts`, `trenchKnowledge.provider.ts`                     |
| Change signal weights or thresholds   | `src/constants/paperTradingDefaults.ts`, `src/config/dynamicConfig.ts`                      |
| See which signal sources contributed  | [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md); logs: `[VinceSignalAggregator]`                   |
| Inspect paper bot / ML state          | `.elizadb/vince-paper-bot/` (see [Data Persistence Paths](#data-persistence-paths) below)   |
| Train ONNX models from features       | `scripts/train_models.py`, [scripts/README.md](scripts/README.md)                           |
| Understand cost/profitability mandate | [TREASURY.md](../../TREASURY.md), [FEATURE-STORE.md](../../FEATURE-STORE.md) (project root) |

---

## Quick Start

### Prerequisites

```bash
# From project root
bun install
bun run build
```

### Run the Agent

```bash
# Start with VINCE character
elizaos start

# Debug mode (verbose logging)
LOG_LEVEL=debug elizaos start
```

### Verify Plugin Loaded

Look for the ASCII dashboard on startup:

```
  ╔═══════════════════════════════════════════════════════════════╗
  ║   ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗                       ║
  ...
  ║   UNIFIED DATA INTELLIGENCE                                   ║
  ╚═══════════════════════════════════════════════════════════════╝
```

And the service source report:

```
  [VINCE] ✅ Using external plugins: Deribit (DVOL, P/C ratio)
  [VINCE] 🔄 Using built-in API fallbacks: OpenSea, XAI
```

---

## Development Workflow

### 1. Understand the Architecture

```
User Message
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Action Validation                                               │
│  vincePerpsAction.validate(runtime, message)                     │
│  → Checks if message contains "perps", "trading", "signal"       │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Provider Context                                                │
│  vinceContextProvider.get(runtime, message, state)               │
│  → Calls: MarketDataService, SignalAggregatorService, etc.       │
│  → Returns: { values: {...}, data: {...}, text: "..." }          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Action Handler                                                  │
│  vincePerpsAction.handler(runtime, message, state, ...)         │
│  → Fetches from services, generates response                     │
│  → Calls callback({ text: "BTC signal: LONG 2x..." })           │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Evaluators (Post-Response)                                      │
│  tradePerformanceEvaluator.handler(...)                         │
│  → Logs signal quality, updates Thompson Sampling weights        │
└─────────────────────────────────────────────────────────────────┘
```

### 2. File Organization

```
src/
├── index.ts              # Plugin definition (register actions/services/providers)
├── actions/              # User-facing commands (20 actions)
│   ├── perps.action.ts   # "perps", "trading", "signal"
│   ├── options.action.ts # "options", "strike", "covered call"
│   └── ...
├── services/             # Data sources and business logic (30 services)
│   ├── signalAggregator.service.ts  # Core signal voting
│   ├── vincePaperTrading.service.ts # Bot orchestration
│   └── fallbacks/        # Built-in API clients when external unavailable
├── providers/            # Context injection (2 providers)
│   ├── vinceContext.provider.ts
│   └── trenchKnowledge.provider.ts
├── evaluators/           # Post-response analysis (1 evaluator)
│   └── tradePerformance.evaluator.ts
├── constants/            # Configuration
│   ├── targetAssets.ts   # BTC, ETH, SOL, HYPE + 34 HIP-3
│   ├── paperTradingDefaults.ts
│   └── memes.constants.ts
├── types/                # TypeScript definitions
├── utils/                # Shared helpers
└── __tests__/            # Test suite
```

### 3. Hot Reload Development

```bash
# Terminal 1: Watch for changes
bun run dev

# Terminal 2: Test specific action
bun run test src/__tests__/actions/trading.actions.test.ts --watch
```

---

## Adding New Actions

### Step 1: Create Action File

```typescript
// src/actions/newFeature.action.ts
import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

export const vinceNewFeatureAction: Action = {
  name: "VINCE_NEW_FEATURE",
  description: "Description shown to the LLM for action selection",

  // Trigger words (case-insensitive matching)
  similes: ["new feature", "my feature", "feature check"],

  // Validation: Should this action handle the message?
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    // Match any of: "new feature", "my feature", etc.
    return /\b(new feature|my feature)\b/.test(text);
  },

  // Handler: Generate the response
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    try {
      // 1. Get required services
      const marketData = runtime.getService("vince-market-data");
      const signalAggregator = runtime.getService("vince-signal-aggregator");

      // 2. Fetch data
      const context = (await marketData?.getEnrichedContext?.("BTC")) || {};

      // 3. Generate response
      const response = [
        "**New Feature Analysis**",
        "",
        `BTC Price: $${context.price?.toLocaleString() || "N/A"}`,
        `RSI: ${context.rsi14 || "N/A"}`,
        "",
        "Your custom analysis here...",
      ].join("\n");

      // 4. Send response
      if (callback) {
        await callback({ text: response });
      }

      return { success: true };
    } catch (error) {
      logger.error("[vinceNewFeatureAction] Error:", error);
      if (callback) {
        await callback({
          text: "Sorry, I couldn't complete that analysis right now.",
        });
      }
      return { success: false };
    }
  },

  // Examples for LLM training
  examples: [
    [
      { name: "user", content: { text: "check new feature" } },
      {
        name: "VINCE",
        content: { text: "**New Feature Analysis**\n\nBTC Price: $95,420..." },
      },
    ],
  ],
};
```

### Step 2: Register in index.ts

```typescript
// src/index.ts
import { vinceNewFeatureAction } from "./actions/newFeature.action";

export const vincePlugin: Plugin = {
  // ...
  actions: [
    // ... existing actions
    vinceNewFeatureAction,
  ],
};

// Also export for external use
export { vinceNewFeatureAction } from "./actions/newFeature.action";
```

### Step 3: Add Tests

```typescript
// src/__tests__/actions/newFeature.actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { vinceNewFeatureAction } from "../../actions/newFeature.action";
import { createMockRuntime, createMockMessage } from "../test-utils";

describe("vinceNewFeatureAction", () => {
  let runtime: any;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  describe("validate", () => {
    it("should validate 'new feature' trigger", async () => {
      const message = createMockMessage("check new feature");
      const result = await vinceNewFeatureAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("should reject unrelated messages", async () => {
      const message = createMockMessage("what is the weather");
      const result = await vinceNewFeatureAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("should generate response", async () => {
      const message = createMockMessage("new feature");
      const callback = vi.fn();

      const result = await vinceNewFeatureAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        callback,
      );

      expect(result.success).toBe(true);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("New Feature Analysis"),
        }),
      );
    });
  });
});
```

---

## Adding New Services

### Step 1: Create Service File

```typescript
// src/services/newData.service.ts
import { Service, IAgentRuntime, logger } from "@elizaos/core";

interface NewDataResult {
  metric: number;
  timestamp: number;
}

export class VinceNewDataService extends Service {
  static serviceType = "vince-new-data";

  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  // Required: Static factory method
  static async start(runtime: IAgentRuntime): Promise<VinceNewDataService> {
    const service = new VinceNewDataService(runtime);
    logger.info("[VinceNewDataService] Started");
    return service;
  }

  // Required: Cleanup on shutdown
  async stop(): Promise<void> {
    this.cache.clear();
    logger.info("[VinceNewDataService] Stopped");
  }

  // Public API method
  async getData(symbol: string): Promise<NewDataResult | null> {
    // Check cache first
    const cached = this.getFromCache(symbol);
    if (cached) return cached;

    try {
      const data = await this.fetchFromAPI(symbol);
      this.setCache(symbol, data);
      return data;
    } catch (error) {
      logger.error(`[VinceNewDataService] Failed to fetch ${symbol}:`, error);
      return null;
    }
  }

  // Private implementation
  private async fetchFromAPI(symbol: string): Promise<NewDataResult> {
    const response = await fetch(`https://api.example.com/data/${symbol}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      metric: data.metric,
      timestamp: Date.now(),
    };
  }

  private getFromCache(key: string): NewDataResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: NewDataResult): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

### Step 2: Register in index.ts

```typescript
// src/index.ts
import { VinceNewDataService } from "./services/newData.service";

export const vincePlugin: Plugin = {
  // ...
  services: [
    // ... existing services
    VinceNewDataService,
  ],
};

export { VinceNewDataService } from "./services/newData.service";
```

### Step 3: Use in Actions

```typescript
// In your action handler
const newDataService = runtime.getService(
  "vince-new-data",
) as VinceNewDataService;
if (newDataService) {
  const data = await newDataService.getData("BTC");
  // Use data...
}
```

---

## Working with the Paper Trading Bot

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Paper Trading Bot Stack                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VincePaperTradingService (Orchestrator)                        │
│       │                                                          │
│       ├── VinceSignalAggregatorService (Signal voting)          │
│       │       └── 15+ data sources with weighted votes          │
│       │                                                          │
│       ├── VincePositionManagerService (Position tracking)       │
│       │       └── Open positions, unrealized P&L                │
│       │                                                          │
│       ├── VinceRiskManagerService (Circuit breakers)            │
│       │       └── Daily loss limits, drawdown protection        │
│       │                                                          │
│       ├── VinceTradeJournalService (History)                    │
│       │       └── Signal performance, win rate                  │
│       │                                                          │
│       └── VinceGoalTrackerService (KPIs)                        │
│               └── $420/day target, streak tracking              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Commands

| Action           | Trigger                        | Example                |
| ---------------- | ------------------------------ | ---------------------- |
| Check status     | "bot status", "portfolio"      | "what's my bot status" |
| Execute trade    | "trade", "go long", "go short" | "go long BTC 2x"       |
| Pause/resume     | "pause bot", "resume bot"      | "pause the bot"        |
| Explain decision | "why", "explain"               | "why that trade"       |

### Signal Flow

```typescript
// 1. Signal Aggregation (from signalAggregator.service.ts)
const signal = await signalAggregator.getAggregatedSignal("BTC");
// Returns: { direction: "LONG", strength: 72, confidence: 68, sources: [...] }

// 2. Risk Check (from riskManager.service.ts)
const canTrade = await riskManager.canOpenPosition(signal);
// Checks: daily loss limit, drawdown, correlation exposure

// 3. Position Sizing (from paperTrading.service.ts)
const size = calculateKellySize(signal.confidence, winRate, avgWin, avgLoss);
// Returns: 0.015 (1.5% of portfolio)

// 4. Execute (from paperTrading.service.ts)
const trade = await paperTrading.executeTrade({
  symbol: "BTC",
  direction: signal.direction,
  size,
  leverage: 2,
  entryPrice: currentPrice,
  stopLoss: calculateATRStop(currentPrice, atr),
  takeProfit: calculateRiskRewardTP(currentPrice, stopLoss, 1.5),
});
```

### Inspecting Bot State

```bash
# Portfolio state
cat .elizadb/vince-paper-bot/portfolio.json | jq '.'

# Open positions
cat .elizadb/vince-paper-bot/positions.json | jq '.positions'

# Trade history (last 5)
cat .elizadb/vince-paper-bot/journal.json | jq '.trades[-5:]'

# Goal progress
cat .elizadb/vince-paper-bot/goal-tracker.json | jq '.'

# Risk state (circuit breakers)
cat .elizadb/vince-paper-bot/risk-state.json | jq '.'
```

---

## ML Enhancement Layer

### Three Learning Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Online Learning (Immediate)                            │
│  ├── Thompson Sampling (signal source weights)                   │
│  ├── Signal Similarity (k-NN on embeddings)                      │
│  └── Parameter Tuning (Bayesian optimization)                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Feature Collection (Training Data)                     │
│  └── VinceFeatureStoreService: 40+ features per trade           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Offline Training (ONNX Inference)                      │
│  ├── Signal Quality Model (binary classification)               │
│  ├── Position Sizing Model (regression)                          │
│  └── TP/SL Optimization (quantile regression)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Thompson Sampling (Weight Bandit)

```typescript
// From weightBandit.service.ts

// Each source has win/loss counts (Beta distribution)
const sources = {
  funding: { wins: 45, losses: 32 }, // ~58% win rate
  liquidation: { wins: 38, losses: 41 }, // ~48% win rate
  topTraders: { wins: 52, losses: 28 }, // ~65% win rate
  // ...
};

// Sample weights (exploration/exploitation balance)
const sampledWeights = sampleFromBeta(sources);
// Returns: { funding: 0.61, liquidation: 0.44, topTraders: 0.71 }

// After trade result, update counts
await weightBandit.recordOutcome("funding", isWin);
```

### Feature Store

```typescript
// From vinceFeatureStore.service.ts

// Captured features (40+)
const features = {
  // Market
  price: 95420,
  change_1h: 0.5,
  change_4h: -0.2,
  volume_24h: 42000000000,
  atr_14: 1200,
  rsi_14: 55,

  // Session
  session: "EU_US_OVERLAP",
  is_weekend: false,
  hour_utc: 14,

  // Signal
  signal_strength: 72,
  signal_confidence: 68,
  confirming_sources: 4,

  // Outcome (added after trade closes)
  pnl: 150.5,
  r_multiple: 1.2,
  duration_hours: 4.5,
  exit_reason: "TAKE_PROFIT",
};

// Write to JSONL
await featureStore.recordFeatures(features);
```

### ONNX Model Training

```bash
# Generate training data
cat .elizadb/vince-paper-bot/features/*.jsonl > training_data.jsonl

# Train models (requires Python 3)
python3 scripts/train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models

# Models output to:
# - models/signal_quality.onnx
# - models/position_sizing.onnx
# - models/tp_optimizer.onnx
```

### Graceful Degradation

Every ML component has a fallback:

| Component         | ML Available      | Fallback                            |
| ----------------- | ----------------- | ----------------------------------- |
| Weight Bandit     | Beta sampling     | Static weights from `dynamicConfig` |
| Signal Similarity | k-NN lookup       | Return neutral recommendation       |
| ML Inference      | ONNX prediction   | Rule-based filtering                |
| Parameter Tuner   | Bayesian proposal | Fixed thresholds                    |

```typescript
// Example fallback pattern
const mlScore = await mlInference.predictQuality(features);
if (mlScore !== null) {
  // Use ML prediction
  if (mlScore < 0.5) return { skip: true, reason: "ML filter" };
} else {
  // Fallback to rules
  if (signal.strength < 70) return { skip: true, reason: "Rule filter" };
}
```

---

## Testing Patterns

### Run Tests

```bash
# All tests
bun run test

# Watch mode
bun run test --watch

# Specific file
bun run test src/__tests__/actions/trading.actions.test.ts

# E2E tests (real API calls)
bun run test:e2e

# With coverage
bun run test --coverage
```

### Mock Runtime Factory

```typescript
// From src/__tests__/test-utils.ts

export function createMockRuntime(overrides?: Partial<IAgentRuntime>) {
  const mockServices = new Map();

  // Add default mock services
  mockServices.set("vince-market-data", {
    getEnrichedContext: vi.fn().mockResolvedValue({
      price: 95000,
      rsi14: 55,
      funding8h: 0.01,
    }),
  });

  mockServices.set("vince-signal-aggregator", {
    getAggregatedSignal: vi.fn().mockResolvedValue({
      direction: "LONG",
      strength: 72,
      confidence: 68,
    }),
  });

  return {
    agentId: "test-agent-id",
    character: { name: "VINCE" },
    getService: (name: string) => mockServices.get(name),
    getSetting: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}

export function createMockMessage(text: string, overrides?: Partial<Memory>) {
  return {
    id: "test-message-id",
    content: { text },
    roomId: "test-room-id",
    entityId: "test-entity-id",
    ...overrides,
  };
}
```

### Testing Services

```typescript
// src/__tests__/services/signalAggregator.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { VinceSignalAggregatorService } from "../../services/signalAggregator.service";
import { createMockRuntime } from "../test-utils";

describe("VinceSignalAggregatorService", () => {
  let service: VinceSignalAggregatorService;
  let runtime: any;

  beforeEach(async () => {
    runtime = createMockRuntime();
    service = await VinceSignalAggregatorService.start(runtime);
  });

  it("should aggregate signals from multiple sources", async () => {
    const signal = await service.getAggregatedSignal("BTC");

    expect(signal).toMatchObject({
      direction: expect.stringMatching(/^(LONG|SHORT|NEUTRAL)$/),
      strength: expect.any(Number),
      confidence: expect.any(Number),
      sources: expect.any(Array),
    });
  });

  it("should apply session multipliers", async () => {
    // Mock off-hours
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T23:00:00Z")); // Off-hours

    const signal = await service.getAggregatedSignal("BTC");

    // Off-hours should reduce confidence
    expect(signal.sessionMultiplier).toBeLessThan(1.0);

    vi.useRealTimers();
  });
});
```

### E2E Testing (Real APIs)

```typescript
// src/__tests__/realData.e2e.test.ts
import { describe, it, expect } from "vitest";
import { VinceBinanceService } from "../../services/binance.service";

describe.skip("Real API Tests", () => {
  // Skip by default, run manually: bun run test:e2e

  it("should fetch real Binance data", async () => {
    const runtime = createMockRuntime();
    const service = await VinceBinanceService.start(runtime);

    const data = await service.getTopTraders("BTCUSDT");

    expect(data).toMatchObject({
      longShortRatio: expect.any(Number),
      topTraderLongRatio: expect.any(Number),
    });

    await service.stop();
  }, 30000); // 30s timeout for API calls
});
```

---

## Debugging Techniques

### Enable Debug Logging

```bash
# Full debug output
LOG_LEVEL=debug elizaos start

# Or in code
logger.debug("[MyService] Detailed info:", { data });
logger.info("[MyService] Normal info");
logger.warn("[MyService] Warning:", error.message);
logger.error("[MyService] Error:", error);
```

### Inspect Service Sources

On startup, check which services are external vs fallback:

```
[VINCE] ✅ Using external plugins: Deribit (DVOL, P/C ratio)
[VINCE] 🔄 Using built-in API fallbacks: OpenSea, XAI
```

### Monitor Signal Aggregation

See **[SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md)** for which sources exist, how to enable them, and how to confirm in logs which sources contributed (e.g. `[VINCE] 📡 Signal sources available: N/8`, `[VinceSignalAggregator] ASSET: N source(s) → M factors`).

```bash
LOG_LEVEL=debug elizaos start 2>&1 | grep SignalAggregator

# Output:
# [SignalAggregator] BTC signal: strength=72, confidence=68
# [SignalAggregator] Sources: funding(0.8), liquidation(1.2), whale(0.9)
# [SignalAggregator] Session: EU_US_OVERLAP (1.1x)
```

### Inspect ML State

```bash
# Thompson Sampling weights
cat .elizadb/vince-paper-bot/weight-bandit-state.json | jq '.sources'

# Feature store record count
wc -l .elizadb/vince-paper-bot/features/*.jsonl

# Bayesian optimizer state
cat .elizadb/vince-paper-bot/bayesian-tuner-state.json | jq '.bestObservation'

# Improvement journal
cat .elizadb/vince-paper-bot/improvement-journal.md
```

### Test Individual Services

```typescript
// Quick test script (create in project root)
// test-service.ts
import { VinceBinanceService } from "./src/plugins/plugin-vince/src/services/binance.service";

const mockRuntime = {
  getSetting: () => null,
  getService: () => null,
};

async function test() {
  const service = await VinceBinanceService.start(mockRuntime as any);
  const data = await service.getTopTraders("BTCUSDT");
  console.log("Binance data:", JSON.stringify(data, null, 2));
  await service.stop();
}

test();
```

```bash
bun run test-service.ts
```

---

## Common Patterns

### 1. Fallback Service Pattern

```typescript
// Check for external plugin, fallback to built-in
const deribitService = runtime.getService("deribit");
if (deribitService && typeof deribitService.getIVSurface === "function") {
  // Use external plugin
  return await deribitService.getIVSurface("BTC");
} else {
  // Use built-in fallback
  const fallback = await import("./fallbacks/deribit.fallback");
  return await fallback.getIVSurface("BTC");
}
```

### 2. Circuit Breaker Pattern

```typescript
const CIRCUIT_BREAKER = {
  maxFailures: 3,
  resetTimeMs: 60000,
  backoffMs: [1000, 2000, 4000],
};

class APIClient {
  private failures = 0;
  private lastFailure = 0;

  async fetch(url: string): Promise<any> {
    // Check if circuit is open
    if (this.failures >= CIRCUIT_BREAKER.maxFailures) {
      if (Date.now() - this.lastFailure < CIRCUIT_BREAKER.resetTimeMs) {
        throw new Error("Circuit breaker open");
      }
      this.failures = 0; // Reset
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      this.failures = 0;
      return await response.json();
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      // Exponential backoff
      const backoff = CIRCUIT_BREAKER.backoffMs[Math.min(this.failures - 1, 2)];
      await new Promise((r) => setTimeout(r, backoff));

      throw error;
    }
  }
}
```

### 3. Cache with TTL Pattern

```typescript
class CachedService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  async getData(key: string): Promise<any> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await this.fetchFresh(key);
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 4. Session Filter Pattern

```typescript
// From utils/sessionFilters.ts

type Session = "ASIA" | "EUROPE" | "EU_US_OVERLAP" | "US" | "OFF_HOURS";

function getCurrentSession(): Session {
  const hour = new Date().getUTCHours();

  if (hour >= 0 && hour < 7) return "ASIA";
  if (hour >= 7 && hour < 13) return "EUROPE";
  if (hour >= 13 && hour < 16) return "EU_US_OVERLAP";
  if (hour >= 16 && hour < 22) return "US";
  return "OFF_HOURS";
}

const SESSION_MULTIPLIERS: Record<
  Session,
  { confidence: number; size: number }
> = {
  ASIA: { confidence: 0.9, size: 0.8 },
  EUROPE: { confidence: 1.0, size: 1.0 },
  EU_US_OVERLAP: { confidence: 1.1, size: 1.1 },
  US: { confidence: 1.0, size: 1.0 },
  OFF_HOURS: { confidence: 0.8, size: 0.7 },
};

function getSessionMultiplier(): { confidence: number; size: number } {
  const session = getCurrentSession();
  const multiplier = SESSION_MULTIPLIERS[session];

  // Weekend adjustment
  const isWeekend = [0, 6].includes(new Date().getUTCDay());
  if (isWeekend) {
    return {
      confidence: multiplier.confidence * 0.8,
      size: multiplier.size * 0.8,
    };
  }

  return multiplier;
}
```

### 5. Weighted Signal Voting Pattern

```typescript
interface SignalSource {
  name: string;
  weight: number;
  getSignal: () => Promise<{
    direction: "LONG" | "SHORT" | "NEUTRAL";
    strength: number;
  }>;
}

async function aggregateSignals(
  sources: SignalSource[],
): Promise<AggregatedSignal> {
  const votes = await Promise.all(
    sources.map(async (source) => {
      try {
        const signal = await source.getSignal();
        return { ...signal, weight: source.weight, source: source.name };
      } catch {
        return null;
      }
    }),
  );

  const validVotes = votes.filter(Boolean);

  // Weighted vote counting
  let longScore = 0;
  let shortScore = 0;
  let totalWeight = 0;

  for (const vote of validVotes) {
    totalWeight += vote.weight;
    if (vote.direction === "LONG") {
      longScore += vote.weight * (vote.strength / 100);
    } else if (vote.direction === "SHORT") {
      shortScore += vote.weight * (vote.strength / 100);
    }
  }

  const netScore = (longScore - shortScore) / totalWeight;
  const direction =
    netScore > 0.1 ? "LONG" : netScore < -0.1 ? "SHORT" : "NEUTRAL";
  const strength = Math.abs(netScore) * 100;
  const confidence = (validVotes.length / sources.length) * 100;

  return { direction, strength, confidence, sources: validVotes };
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Service not found" Error

```typescript
// Problem
const service = runtime.getService("vince-market-data");
// Returns null

// Solution: Check service registration order in index.ts
// Dependencies must be registered before dependents
services: [
  VinceMarketDataService, // ← This must come first
  VinceSignalAggregatorService, // ← This depends on market data
];
```

#### 2. API Rate Limiting

```bash
# Error: 429 Too Many Requests

# Solution: Check cache TTL settings
# From the service file:
private readonly cacheTTL = 5 * 60 * 1000; // Increase to 10 min

# Or implement exponential backoff (see Circuit Breaker pattern)
```

#### 3. TypeScript Errors After Changes

```bash
# Clean rebuild
bun run clean
bun install
bun run build
```

#### 4. Tests Failing with Real APIs

```typescript
// Problem: Tests hit rate limits or network issues

// Solution: Use mocks
import { vi } from "vitest";

vi.mock("node-fetch", () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ price: 95000 }),
  }),
}));
```

#### 5. Paper Bot Not Trading

```bash
# Check circuit breaker state
cat .elizadb/vince-paper-bot/risk-state.json | jq '.'

# If tripped, manually reset:
# Edit risk-state.json or delete it to reset

# Check if paused
cat .elizadb/vince-paper-bot/portfolio.json | jq '.paused'
```

#### 6. ML Components Not Learning

```bash
# Check feature store has data
wc -l .elizadb/vince-paper-bot/features/*.jsonl

# If empty, ensure trades are being recorded
LOG_LEVEL=debug elizaos start 2>&1 | grep FeatureStore

# Check Thompson Sampling has updates
cat .elizadb/vince-paper-bot/weight-bandit-state.json | jq '.sources | to_entries | map({key: .key, wins: .value.wins, losses: .value.losses})'
```

---

## Quick Reference

### Service Types

| Service Type              | Purpose                           |
| ------------------------- | --------------------------------- |
| `vince-market-data`       | Aggregated price, RSI, volatility |
| `vince-signal-aggregator` | Weighted signal voting            |
| `vince-paper-trading`     | Bot orchestration                 |
| `vince-position-manager`  | Position tracking                 |
| `vince-risk-manager`      | Circuit breakers                  |
| `vince-trade-journal`     | Trade history                     |
| `vince-goal-tracker`      | KPI tracking                      |
| `vince-feature-store`     | ML training data                  |
| `vince-weight-bandit`     | Thompson Sampling                 |

### Action Triggers

| Action             | Primary Triggers                    |
| ------------------ | ----------------------------------- |
| `VINCE_GM`         | "gm", "good morning", "briefing"    |
| `VINCE_PERPS`      | "perps", "trading", "signal"        |
| `VINCE_OPTIONS`    | "options", "strike", "covered call" |
| `VINCE_HIP3`       | "hip3", "stocks", "gold", "nvda"    |
| `VINCE_MEMES`      | "memes", "trenches", "ai token"     |
| `VINCE_BOT_STATUS` | "bot status", "portfolio"           |
| `VINCE_BOT_TRADE`  | "trade", "go long", "go short"      |

### Data Persistence Paths

```
.elizadb/vince-paper-bot/
├── portfolio.json           # Balance, equity, paused state
├── positions.json           # Open positions
├── journal.json             # Trade history
├── risk-state.json          # Circuit breaker state
├── goal-tracker.json        # Daily/monthly KPIs
├── weight-bandit-state.json # Thompson Sampling
├── tuned-config.json        # Bayesian-optimized params
├── improvement-journal.md   # Structured suggestions
└── features/                # ML training data
    └── features_*.jsonl
```

---

## Related Docs

- [WHAT.md](./WHAT.md) — Purpose, scope, philosophy.
- [WHY.md](./WHY.md) — Why ElizaOS; framework trade-offs and migration.
- [CLAUDE.md](./CLAUDE.md) — Full plugin reference (services, actions, constants, testing).
- [README.md](./README.md) — User-facing overview and installation.
- [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md) — Signal sources and debugging.
- [TREASURY.md](../../TREASURY.md), [FEATURE-STORE.md](../../FEATURE-STORE.md) — Cost coverage and feature store (project root).

_Last updated: February 2026_
