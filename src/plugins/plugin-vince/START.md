# START.md — From Chaos to VINCE: A Vibe Coding Manifesto for ElizaOS Traders

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**Purpose:** Full system reference for **vibe coding** plugin-vince: vocabulary (Actions, Services, Providers, Evaluators), the six domains, signal system, ML layer, and workflow so you can ship with AI. Use [HOW.md](./HOW.md) for step-by-step implementation; use [CLAUDE.md](./CLAUDE.md) as the AI operating manual.

**When to read:** Before extending VINCE, when onboarding, or when AI keeps missing context—so you can describe intent in ElizaOS terms.

> **Quick Links:** [WHAT.md](./WHAT.md) | [WHY.md](./WHY.md) | [HOW.md](./HOW.md) | [CLAUDE.md](./CLAUDE.md) | [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md) | [README.md](./README.md)

**In this doc:** Part I Foundation (why you fail, doc-first) → Part II ElizaOS vocabulary (Actions, Services, Providers, Evaluators, State, Plugin) → Part III Six domains (Options, Perps, TradFi, Memes, Lifestyle, Art) → Part IV Signal system (aggregation, session multipliers, circuit breakers) → Part V ML layer (Thompson Sampling, feature store, ONNX) → Part VI–IX Workflow, patterns, philosophy.

---

Let's get this out of the way now. Vibe coding isn't the problem. You are. You heard you could talk to AI coding agents and ship software. And you thought you were a magician. So you opened an AI up, described your app idea in a sentence, and expected fucking magic to return. But to your surprise, you got broken code, hallucinated UI and colors, pages that don't route or connect, and an app that "kinda" works until it doesn't really at all.

And you blamed AI for the mistakes.

Like an idiot.

Here's the truth: AI doesn't hallucinate because it's broken. It hallucinates because you gave it nothing to hold onto.

No structure, clarity, or foundation.

Vibe coding works.

But only if you understand what you're building and give your AI agent a true comprehensive system to work within. What follows is everything you need to know—the building blocks, the vocabulary, the real workflows—explained simply enough a caveman could do it. But more importantly, it's tailored to what we're building here: **VINCE**, a quantitative trading assistant built on ElizaOS.

If you read this and still can't ship, the problem is effort, not information.

This isn't a thread you skim and forget. This is the entire system, start to finish for vibe coding ElizaOS plugins. Bookmark it now. Save it to your Clawdbot's memory. Come back to it every time you start a new feature.

The people who treat this as a reference manual will build incredible things. The people who skim it will stay stuck and broken.

Now let's fix you.

---

## Part I: The Foundation

### 1: Why You're Failing

You're failing because you skipped the fundamentals.

You don't know what an Action is. You don't know what a Provider means. You don't understand why your service doesn't do anything when called. You don't know why your agent responds to one message but ignores another.

And because you don't know these things, you can't describe them to AI.

AI is a translator. It converts your intent into code. But if your intent is shitty, the code will be shitty. If you can't articulate what you want, AI guesses. And guesses compound into total and pure chaos.

The fix isn't better prompts.
The fix is better understanding.

Once you know what you're building, prompting becomes trivial. The words come naturally because you finally know what to ask for.

### 2: The Documentation-First System

This is where everyone gets it wrong.

You open Cursor, open a chat, start describing your feature, and let AI start coding immediately. No plan, no reference, and no sources of truth.

This is why your project falls apart after the first few files begin.

The real system is **documentation first, code second**. Always do this.

Before you write a single line of code, you should write your project's canonical documentation markdown files—clear, specific, unambiguous descriptions of what you're building.

Why?

Because AI coding tools operate with high capability but low certainty.

They execute tasks without structural guardrails. The absence of locked constraints and authoritative documentation causes AI to hallucinate requirements, make unauthorized architectural decisions, and produce code that solves problems you never articulated.

The failure mode is not lack of coding ability.
The failure mode is lack of discipline and context preservation.

#### The VINCE Documentation Stack

For plugin-vince, we have a tailored documentation structure:

| File                  | Purpose                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| **WHAT.md**           | Philosophy and purpose—why VINCE exists, who it's for, the six domains it covers    |
| **WHY.md**            | Framework decisions—why ElizaOS over ClawdBot, trade-offs, migration paths          |
| **HOW.md**            | Hands-on development—adding actions, services, debugging, testing                   |
| **CLAUDE.md**         | AI operating manual—rules, constraints, patterns AI must follow                     |
| **START.md**          | This file—the complete system for understanding and extending VINCE                 |
| **SIGNAL_SOURCES.md** | Which signal sources feed the aggregator, how to enable them, how to verify in logs |
| **IMPROVEMENT_WEIGHTS_AND_TUNING.md** | ML improvement report, holdout metrics, optional training flags (recency decay, asset balance, hyperparameter tuning) |
| **ML_IMPROVEMENT_PROOF.md** | Validating that ML training actually improves paper-bot metrics |
| **README.md** | Plugin overview, install, usage; links to WHAT/WHY/HOW |

These docs cross-reference each other. WHAT defines the vision, WHY explains the architecture, HOW teaches implementation, CLAUDE.md keeps AI aligned, and SIGNAL_SOURCES.md tells you how to get more factors per trade.

#### The Session Files (Your Persistence Layer)

**CLAUDE.md** — This is the file AI reads first, automatically, every session. It contains the rules, constraints, patterns, and context that every AI session must follow. Your service naming conventions, your action patterns, your testing requirements. Think of it as the AI's operating manual for plugin-vince specifically.

**progress.txt** — This is the file everyone misses. This file tracks what's been done, what's in progress, and what's next. Every time you finish a feature, you update this file. Every time you start a new session, AI reads this file first for contextual memory of your progress. Without it, every new session starts from zero context.

Update it religiously. After every completed feature, document what was built, what works, what's broken, what's next.

---

## Part II: ElizaOS Vocabulary

You need to speak the same language as the framework. Here's what everything means.

### 3: Actions

**An Action is what your agent can do.**

When a user says "gm" and VINCE responds with a morning briefing, that's the `vinceGmAction` executing. When a user asks about perps and VINCE returns trading signals, that's `vincePerpsAction`.

Actions have three parts:

1. **validate** — Should this action handle this message? Returns true/false.
2. **handler** — The actual logic that generates the response.
3. **examples** — Training data for the LLM to learn when to use this action.

```typescript
export const vinceGmAction: Action = {
  name: "VINCE_GM",
  similes: ["gm", "good morning", "briefing", "wake up"],
  description: "Morning briefing with market overview",

  validate: async (runtime, message) => {
    const text = message.content.text?.toLowerCase() || "";
    return /\b(gm|good morning|briefing)\b/.test(text);
  },

  handler: async (runtime, message, state, options, callback) => {
    // Fetch data from services
    // Generate response
    // Call callback with response text
  },

  examples: [
    [
      { name: "user", content: { text: "gm" } },
      {
        name: "VINCE",
        content: { text: "GM trader! Here's your morning briefing..." },
      },
    ],
  ],
};
```

When you talk to AI about actions:
"Build an action that triggers on 'meme check' and returns the top 5 AI memes from DexScreener."

Now AI knows exactly what to build.

### 4: Services

**A Service is a data source or capability the agent can use.**

Services maintain state, fetch data, and provide business logic. VINCE has 30+ services:

- `VinceMarketDataService` — aggregated price, RSI, volatility
- `VinceSignalAggregatorService` — weighted voting across 15+ sources
- `VincePaperTradingService` — bot orchestration
- `VinceDeribitService` — options IV surfaces and Greeks

Services are accessed via `runtime.getService("service-name")`.

```typescript
export class VinceNewService extends Service {
  static serviceType = "vince-new-service";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceNewService> {
    const service = new VinceNewService(runtime);
    return service;
  }

  async stop(): Promise<void> {
    // Cleanup
  }

  async getData(symbol: string): Promise<any> {
    // Implementation
  }
}
```

When you talk to AI about services:
"Create a service that fetches liquidation data from Binance with 5-minute caching and exponential backoff on errors."

### 5: Providers

**A Provider supplies context before the agent decides what to do.**

Providers run during `composeState()` and inject real-time information into the agent's context. VINCE has two key providers:

- `vinceContextProvider` — aggregated market data, session info, regime
- `trenchKnowledgeProvider` — RAG for meme trading knowledge

```typescript
export const vinceContextProvider: Provider = {
  name: "VINCE_CONTEXT",
  description: "Provides market context for trading decisions",

  get: async (runtime, message, state) => {
    const marketData = runtime.getService("vince-market-data");
    const context = await marketData?.getEnrichedContext("BTC");

    return {
      text: `BTC: $${context.price}, RSI: ${context.rsi14}`,
      values: { btcPrice: context.price, btcRsi: context.rsi14 },
      data: { fullContext: context },
    };
  },
};
```

The difference:

- **Actions** execute responses
- **Providers** supply context before actions execute
- **Services** provide data that both can use

### 6: Evaluators

**An Evaluator analyzes conversations after responses to extract insights.**

Evaluators run post-response to learn from interactions. VINCE's `tradePerformanceEvaluator` tracks which signal sources predict correctly and adjusts Thompson Sampling weights.

```typescript
export const tradePerformanceEvaluator: Evaluator = {
  name: "TRADE_PERFORMANCE",
  description: "Analyzes trade outcomes and adjusts signal weights",

  validate: async (runtime, message) => {
    // Should we evaluate this conversation?
    return message.content.text?.includes("trade") || false;
  },

  handler: async (runtime, message, state) => {
    // Extract trade outcomes
    // Update Thompson Sampling weights
    // Store learnings
  },
};
```

The Action-Provider-Evaluator cycle:

1. **Providers** gather context
2. **Actions** execute responses
3. **Evaluators** analyze and learn
4. Learnings inform future **Providers**

### 7: State

**State is data that changes.**

When the paper bot opens a position, state changed. When the market regime shifts from trending to ranging, state changed. When circuit breakers trip, state changed.

VINCE tracks state in multiple places:

- `.elizadb/vince-paper-bot/portfolio.json` — balance, equity, paused
- `.elizadb/vince-paper-bot/positions.json` — open positions
- `.elizadb/vince-paper-bot/risk-state.json` — circuit breaker status

When you talk to AI about state:
"When the daily loss exceeds $200, set the circuit breaker state to TRIPPED and pause all trading."

### 8: The Plugin Structure

Everything comes together in the plugin definition:

```typescript
export const vincePlugin: Plugin = {
  name: "plugin-vince",
  description: "Quantitative trading assistant with six domains",

  // Register components
  services: [
    VinceMarketDataService,
    VinceSignalAggregatorService,
    VincePaperTradingService,
    // ... 30+ services
  ],

  actions: [
    vinceGmAction,
    vincePerpsAction,
    vinceOptionsAction,
    // ... 20+ actions
  ],

  providers: [vinceContextProvider, trenchKnowledgeProvider],

  evaluators: [tradePerformanceEvaluator],

  init: async (config, runtime) => {
    logger.info("[VINCE] Plugin initialized");
  },
};
```

---

## Part III: The VINCE Domains

VINCE operates across six domains. Understanding them is essential for extending the plugin.

### 9: Options

Covered calls on BTC via HYPERSURFACE. Key concepts:

- IV skew (put-heavy vs call-heavy)
- Strike selection based on funding regime
- Weekly expiries (Fridays are key)

Services: `VinceDeribitService`, `VinceHip3Service`
Actions: `vinceOptionsAction`

### 10: Perps

Signals for longs/shorts with paper execution. Key concepts:

- Funding rate extremes (`> +0.02%` crowded longs, `< -0.02%` crowded shorts)
- Liquidation cascades
- Top trader positioning

Services: `VinceBinanceService`, `VinceCoinGlassService`, `VinceSignalAggregatorService`
Actions: `vincePerpsAction`, `vinceBotTradeAction`

### 11: TradFi

Gold, NVDA, SPX via Hyperliquid HIP-3. Key concepts:

- 34 tradeable assets beyond crypto
- Correlation plays (gold as hedge, NVDA as AI proxy)
- Session-aware trading (EU/US overlap best)

Services: `VinceHip3Service`
Actions: `vinceHip3Action`

### 12: Memes

AI tokens in the $1M-$20M sweet spot. Key concepts:

- Liquidity thresholds ($100K+ for safety)
- Volume/marketcap ratios
- Narrative momentum

Services: `VinceDexScreenerService`, `VinceMeteoraService`
Actions: `vinceMemeAction`, `vinceMemeDeepDiveAction`

### 13: Lifestyle

Day-of-week awareness. Because who trades well on an empty stomach?

- Fridays: ritual days, lighter trading
- Thursdays: pool day
- Weekends: reduced confidence multiplier (0.8x)

Services: `VinceLifestyleService`
Actions: `vinceLifestyleAction`

### 14: Art

NFT floors for thin-buy opportunities. Key concepts:

- Floor gaps (thin liquidity = opportunity)
- Whale tracking
- Tier classification (blue-chip vs mid-tier)

Services: `VinceNftFloorService`
Actions: `vinceNftFloorAction`

---

## Part IV: The Signal System

This is the heart of VINCE. To see **which sources exist, how to enable them, and how to confirm in logs** which contributed, see [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md).

### 15: Signal Aggregation

VINCE consults 15+ data sources and votes:

| Source               | Weight | What It Measures      |
| -------------------- | ------ | --------------------- |
| Funding Rate         | 1.5x   | Crowded positioning   |
| Liquidation Cascades | 2.0x   | Forced selling/buying |
| Top Traders          | 1.3x   | Smart money direction |
| RSI Divergence       | 1.2x   | Momentum exhaustion   |
| Volume Profile       | 1.1x   | Participation levels  |
| News Sentiment       | 1.0x   | Narrative shifts      |

The aggregator produces:

- `direction`: LONG, SHORT, or NEUTRAL
- `strength`: 0-100 (how strong the signal)
- `confidence`: 0-100 (how many sources agree)
- `sources`: which sources voted which way

### 16: Session Multipliers

Not all hours are equal:

| Session                   | Confidence Multiplier | Size Multiplier |
| ------------------------- | --------------------- | --------------- |
| Asia (0-7 UTC)            | 0.9x                  | 0.8x            |
| Europe (7-13 UTC)         | 1.0x                  | 1.0x            |
| EU/US Overlap (13-16 UTC) | 1.1x                  | 1.1x            |
| US (16-22 UTC)            | 1.0x                  | 1.0x            |
| Off-Hours (22-24 UTC)     | 0.8x                  | 0.7x            |
| Weekends                  | Additional 0.8x       | Additional 0.8x |

### 17: Circuit Breakers

Protection against runaway losses:

- **Daily loss limit**: $200 → pause trading
- **Drawdown protection**: 15% from peak → pause trading
- **Position limits**: max 3 concurrent positions
- **Correlation limits**: max 70% correlated exposure

---

## Part V: The ML Enhancement Layer

VINCE learns from its trades through three layers.

### 18: Thompson Sampling (Online Learning)

Each signal source has win/loss counts modeled as a Beta distribution:

- After a winning trade, increment `wins` for contributing sources
- After a losing trade, increment `losses`
- Sample from Beta(wins, losses) to get exploration-balanced weights

This happens automatically via `VinceWeightBanditService`.

### 19: Feature Store (Training Data)

Every trade captures 40+ features:

- Market state (price, RSI, volatility, funding)
- Session context (hour, day of week, regime)
- Signal metadata (strength, confidence, sources)
- Outcome (P&L, R-multiple, exit reason)

Features are stored in `.elizadb/vince-paper-bot/features/*.jsonl` for offline training.

### 20: ONNX Inference (Offline Models)

After 90+ trades, train offline models:

- **Signal Quality Model** — binary classifier for trade quality
- **Position Sizing Model** — regression for optimal size
- **TP/SL Optimizer** — quantile regression for exit levels

Models export to ONNX for fast inference without Python dependencies.

### 21: Graceful Degradation

Every ML component has a fallback:

| Component         | ML Available    | Fallback               |
| ----------------- | --------------- | ---------------------- |
| Weight Bandit     | Beta sampling   | Static weights         |
| Signal Similarity | k-NN lookup     | Neutral recommendation |
| ML Inference      | ONNX prediction | Rule-based filtering   |

If ML fails, rules take over. No drama.

---

## Part VI: Development Workflow

### 22: The Interrogation System

Before building any feature, make AI tear your idea apart.

This is the prompt that changes everything:
"Before writing any code, endlessly interrogate my idea in Planning mode only. Assume nothing. Ask questions until there are no assumptions left."

AI hallucinates when your clarity ends. Extend your clarity, and you force AI to find the gaps before building on broken foundations.

### 23: Adding a New Action

1. Create the action file in `src/actions/`
2. Define validate, handler, and examples
3. Register in `src/index.ts`
4. Add tests in `src/__tests__/actions/`
5. Update progress.txt

```bash
# Example session
"I want to add an action for checking whale wallets."

# AI should ask:
# - What defines a whale? ($1M+? $10M+?)
# - Which chains? (Ethereum? Solana? Both?)
# - What data sources? (Nansen? On-chain?)
# - What should the response format look like?
# - What triggers the action? ("whales", "big wallets"?)
```

### 24: Adding a New Service

1. Create the service file in `src/services/`
2. Implement `static serviceType`, `start()`, `stop()`, and public methods
3. Add caching (5-minute TTL default)
4. Implement circuit breaker pattern
5. Register in `src/index.ts`
6. Add tests

### 25: The Testing Loop

```bash
# Run all tests
bun run test

# Watch mode
bun run test --watch

# Specific file
bun run test src/__tests__/actions/trading.actions.test.ts

# E2E with real APIs
bun run test:e2e
```

Tests are not optional. VINCE has coverage for:

- Action validation (does it trigger correctly?)
- Action handlers (does it produce expected output?)
- Service methods (does it fetch and cache correctly?)
- Integration (do components work together?)

### 26: Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug elizaos start

# Monitor signal aggregation
LOG_LEVEL=debug elizaos start 2>&1 | grep SignalAggregator

# Inspect bot state
cat .elizadb/vince-paper-bot/portfolio.json | jq '.'
cat .elizadb/vince-paper-bot/positions.json | jq '.positions'
cat .elizadb/vince-paper-bot/risk-state.json | jq '.'
```

---

## Part VII: The Complete System

### 27: Before Building

1. Run the interrogation prompt. Let AI brutally question your idea.
2. Answer every question AI asks.
3. Update the relevant documentation (WHAT, WHY, HOW, or CLAUDE.md).
4. Update progress.txt with your plan.
5. Gather UI screenshots or API response examples if relevant.
6. Initialize git branch for the feature.

### 28: While Building

1. AI reads CLAUDE.md and progress.txt first, every session.
2. Use Plan mode to architect before coding.
3. Use Agent mode to implement features.
4. Work in small pieces—one action or one service at a time.
5. Give specific, vocabulary-rich prompts referencing the docs.
6. Commit to git after each working feature.
7. Update progress.txt after each feature.
8. After every correction, update CLAUDE.md so AI doesn't repeat mistakes.
9. Run tests frequently.

### 29: Before Shipping

- Does the action trigger correctly?
- Does the service handle errors gracefully?
- Are circuit breakers in place?
- Is caching implemented?
- Do tests pass?
- Is the feature documented?

### 30: After Shipping

- Update docs to reflect what was built.
- Update progress.txt.
- Monitor for production issues.
- Track signal performance if applicable.

---

## Part VIII: VINCE-Specific Patterns

### 31: The Fallback Service Pattern

Always check for external plugins first, fall back to built-in:

```typescript
const deribitService = runtime.getService("deribit");
if (deribitService && typeof deribitService.getIVSurface === "function") {
  return await deribitService.getIVSurface("BTC");
} else {
  const fallback = await import("./fallbacks/deribit.fallback");
  return await fallback.getIVSurface("BTC");
}
```

### 32: The Circuit Breaker Pattern

```typescript
const CIRCUIT_BREAKER = {
  maxFailures: 3,
  resetTimeMs: 60000,
  backoffMs: [1000, 2000, 4000],
};
```

Track failures, open circuit, reset after timeout.

### 33: The Cache Pattern

```typescript
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
```

### 34: The Session Filter Pattern

```typescript
type Session = "ASIA" | "EUROPE" | "EU_US_OVERLAP" | "US" | "OFF_HOURS";

function getCurrentSession(): Session {
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 7) return "ASIA";
  if (hour >= 7 && hour < 13) return "EUROPE";
  if (hour >= 13 && hour < 16) return "EU_US_OVERLAP";
  if (hour >= 16 && hour < 22) return "US";
  return "OFF_HOURS";
}
```

### 35: The Weighted Voting Pattern

```typescript
const votes = await Promise.all(
  sources.map(async (source) => {
    const signal = await source.getSignal();
    return { ...signal, weight: source.weight, source: source.name };
  }),
);

let longScore = 0,
  shortScore = 0,
  totalWeight = 0;
for (const vote of votes) {
  totalWeight += vote.weight;
  if (vote.direction === "LONG")
    longScore += vote.weight * (vote.strength / 100);
  else if (vote.direction === "SHORT")
    shortScore += vote.weight * (vote.strength / 100);
}

const netScore = (longScore - shortScore) / totalWeight;
const direction =
  netScore > 0.1 ? "LONG" : netScore < -0.1 ? "SHORT" : "NEUTRAL";
```

---

## Part IX: The Philosophy

### 36: Trade Well, Live Well

VINCE isn't about cramming more tech into trading. It's about reclaiming sanity in a market that never sleeps.

Crypto's a beast—it lures you with moonshots but chews through your time, health, and perspective. I was tired of the silos. Why track perps in one tab and memes in another when they influence each other?

**Balance matters.** Trading's seductive, but it's not life. VINCE weaves in lifestyle because Fridays aren't just expiry days—they're ritual days. Thursdays? Lighter vibes. It's day-of-week aware, saying "Hey, market's choppy, session's Asia—scale down and go live a bit."

Art's in there too, because NFTs aren't just flips; they're cultural bets, reminders that value's more than charts.

### 37: The IP Transcends the Framework

> "The IP was never the code—it was the concepts, insights, knowledge, expertise, and logic."

What matters isn't ElizaOS. It's the domain logic that VINCE encodes:

- Signal weights (liquidation cascades 2.0x, funding extremes 1.5x)
- Funding thresholds (`> +0.02%` = WIDER calls)
- Session filters (Asia 0.9x, EU/US Overlap 1.1x)
- Circuit breakers ($200 daily loss = done)
- Goal tracking ($420/day, $10K/month)

This transfers to any framework. The TypeScript is just the container.

### 38: Free-First Was Non-Negotiable

Premium APIs like CoinGlass or Nansen are nice, but why gatekeep edge behind paywalls?

VINCE leans on free sources (Binance, Deribit, DexScreener) with paid as optional boosts. It's hobbyist-friendly—$0 to start, upgrade if you scale.

Trading's already unequal; tools shouldn't widen the gap.

---

## The Complete System

You now have everything.

**Before building:**

1. Run the interrogation prompt
2. Answer every question
3. Update documentation
4. Create progress.txt entry
5. Initialize git branch

**While building:**

1. AI reads CLAUDE.md and progress.txt first
2. Use Plan mode, then Agent mode
3. Work in small pieces
4. Reference the domain vocabulary
5. Commit after each working feature
6. Update progress.txt
7. Run tests

**Before shipping:**

1. Tests pass
2. Error handling complete
3. Caching implemented
4. Documentation updated

**After shipping:**

1. Update docs
2. Monitor production
3. Track signal performance
4. Iterate based on real usage

---

Vibe coding isn't witchcraft black magic. It's meticulous planning, systems, documentation, vocabulary, and iteration. You interrogate your idea. You write your markdown docs. You set up CLAUDE.md and progress.txt for persistence.

You use the right tool for each phase: Claude for planning, Cursor for building, tests for verification.

You describe the work in specific ElizaOS terms—actions, services, providers, evaluators.

You track your progress between sessions.

You commit your code.

And you ship.

The AI now does all the typing.
And you do all the thinking.

Now you have absolutely no excuses.

Go fucking build something today.

---

---

## Related docs

- [WHAT.md](./WHAT.md) — Purpose and philosophy
- [WHY.md](./WHY.md) — Framework decisions and migration
- [HOW.md](./HOW.md) — Hands-on implementation, adding actions/services, debugging
- [CLAUDE.md](./CLAUDE.md) — AI operating manual for plugin-vince
- [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md) — Signal sources and how to verify them in logs
- [README.md](./README.md) — Plugin overview and usage
- [../../FEATURE-STORE.md](../../FEATURE-STORE.md) — Paper bot feature storage and ML (project root)
