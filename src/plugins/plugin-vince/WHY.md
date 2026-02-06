# WHY: Framework Decision & Architecture Context

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**Purpose:** Explain _why_ VINCE was built on ElizaOS and how it compares to alternatives (e.g. ClawdBot). For _what_ the plugin does, see [WHAT.md](./WHAT.md). For _how_ to develop it, see [HOW.md](./HOW.md) and [CLAUDE.md](./CLAUDE.md).

**When to re-read:** Before migrating to another framework, adding a new platform (e.g. full computer control), or debating local-first vs server-based deployment.

---

## Summary

| Decision | Rationale |
|----------|-----------|
| **ElizaOS over ClawdBot** | Providers aggregate 15+ signal sources in parallel; evaluators learn from trade outcomes; native Discord/Telegram; character system keeps one persona across options, perps, memes, lifestyle, art. |
| **Trade-offs we accepted** | No computer control (human executes trades); no self-healing code; server-based by default. |
| **What transfers** | Domain logic (weights, thresholds, session filters, circuit breakers), constants, knowledge files—the IP is the thinking, not the TypeScript. |
| **Improvement report** | Training produces an improvement report (holdout metrics, thresholds); the runtime consumes it so the bot tightens filters without code edits. |

---

## The Two Frameworks

### ClawdBot (MoltBot)

ClawdBot is a TypeScript CLI application that functions as a personal AI assistant with full computer control. It runs locally on your machine and can execute arbitrary tasks.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClawdBot Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You (Telegram/Discord/etc.)                                     │
│       │                                                          │
│       ▼                                                          │
│  Channel Adapter (normalize message, extract attachments)        │
│       │                                                          │
│       ▼                                                          │
│  Gateway Server (The Coordinator)                                │
│       ├── Session Router                                         │
│       └── Lane Queue (serialize operations, prevent races)       │
│            │                                                     │
│            ▼                                                     │
│  Agent Runner                                                    │
│       ├── Model Resolver (pick API key, fallback models)         │
│       ├── System Prompt Builder (tools, skills, memory)          │
│       ├── Session History Loader (from .jsonl)                   │
│       └── Context Window Guard (compact if needed)               │
│            │                                                     │
│            ▼                                                     │
│  LLM API ──► Agentic Loop                                        │
│              │                                                   │
│              ├── Tool call? ──► Execute locally ──► Add result   │
│              │                        │                          │
│              │                        ▼                          │
│              │              (repeat until final text or max ~20) │
│              │                                                   │
│              └── Final text ──► Response Path ──► User           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**

| Aspect               | ClawdBot                                                |
| -------------------- | ------------------------------------------------------- |
| **Execution**        | Local-first, runs on your machine                       |
| **Computer Control** | Full shell, browser (Playwright), filesystem access     |
| **Memory**           | JSONL session transcripts + markdown files in `memory/` |
| **Search**           | Hybrid (vector + FTS5 keyword matching)                 |
| **Coordination**     | Lane-based queue (serial by default, parallel explicit) |
| **Safety**           | Allowlist for commands, dangerous constructs blocked    |

### ElizaOS

ElizaOS is a multi-agent framework for building AI agents with persistent personalities across platforms. It runs as a server with platform connectors.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ElizaOS Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User (Discord/Telegram/Twitter/etc.)                            │
│       │                                                          │
│       ▼                                                          │
│  Platform Services (Discord, Telegram, Twitter connectors)       │
│       │                                                          │
│       ▼                                                          │
│  AgentRuntime (orchestration layer)                              │
│       │                                                          │
│       ├── Providers ──► Gather context (time, facts, knowledge)  │
│       │                                                          │
│       ├── Actions ──► Execute response (REPLY, SEND_TOKEN, etc.) │
│       │                                                          │
│       └── Evaluators ──► Analyze & learn (extract facts,         │
│                          track relationships, self-reflect)      │
│            │                                                     │
│            ▼                                                     │
│  Memory System (vector DB with embeddings)                       │
│       │                                                          │
│       ▼                                                          │
│  Database (PGLite/PostgreSQL)                                    │
│       └── Entities, Rooms, Worlds, Relationships                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**

| Aspect               | ElizaOS                                          |
| -------------------- | ------------------------------------------------ |
| **Execution**        | Server-based with platform connectors            |
| **Computer Control** | None (designed for chat/social interactions)     |
| **Memory**           | Vector database with semantic embeddings         |
| **Search**           | Semantic search via embeddings                   |
| **Coordination**     | Event-driven with parallel provider execution    |
| **Learning**         | Evaluators extract facts and build relationships |

---

## Side-by-Side Comparison

| Feature                           | ClawdBot                              | ElizaOS                                       |
| --------------------------------- | ------------------------------------- | --------------------------------------------- |
| Computer control (shell, browser) | Full                                  | None                                          |
| Multi-platform messaging          | Telegram, WhatsApp, Discord, iMessage | Discord, Telegram, Twitter, Farcaster         |
| Vector memory/RAG                 | Hybrid search                         | Full RAG with embeddings                      |
| Character/personality system      | Minimal                               | Rich character definitions                    |
| Plugin ecosystem                  | Skills marketplace                    | Extensive plugin registry                     |
| Learning/evaluation               | Static                                | Evaluators extract facts, build relationships |
| Multi-agent orchestration         | Single agent                          | Native multi-agent (Worlds, Rooms)            |
| Blockchain/DeFi                   | Via skills                            | Native plugins (Solana, EVM)                  |
| Local-first                       | Yes                                   | No (server-based)                             |
| Self-healing/maintenance          | Can fix its own code                  | Requires developer intervention               |

---

## Why ElizaOS for plugin-vince

VINCE is a quantitative trading assistant with ~30 services, 20 actions, and a paper trading bot. Here's why ElizaOS was the right choice:

### 1. Multi-Source Signal Aggregation

The `SignalAggregatorService` consults 15+ data sources with weighted voting. ElizaOS's provider system naturally supports this pattern:

```typescript
// Each provider contributes context before the LLM decides
const state = await runtime.composeState(message, [
  "vinceContextProvider", // Aggregated market data
  "trenchKnowledgeProvider", // RAG for meme trading
]);
```

ClawdBot's approach would be: one agentic loop calling tools sequentially. ElizaOS's approach: providers run in parallel, compose unified state, LLM sees everything at once.

### 2. Learning and Evaluation

The `TradeJournalService` tracks which signal sources predict correctly. ElizaOS evaluators can adjust weights over time:

```typescript
// After each trade, evaluators analyze and learn
evaluators: [
  reflectionEvaluator, // Self-assessment
  // Custom: tradePerformanceEvaluator could adjust signal weights
];
```

ClawdBot has no native learning mechanism. The agent writes to markdown files, but there's no structured evaluation loop.

### 3. Platform Integration

VINCE needs to send trading alerts to Discord/Telegram. ElizaOS has native service integrations:

```typescript
// Native multi-platform support
plugins: ["@elizaos/plugin-discord", "@elizaos/plugin-telegram"];
```

ClawdBot would require building channel adapters or using external notification services.

### 4. Persona Consistency

VINCE speaks with one voice across options, perps, memes, lifestyle, and art. The character system ensures consistency:

```typescript
// Character defines personality across all domains
character: {
  name: 'VINCE',
  bio: ['Quantitative trader', 'Art collector', 'Lifestyle optimizer'],
  style: { all: ['Clear', 'Data-driven', 'Lifestyle-aware'] }
}
```

ClawdBot has no native persona system. Personality is embedded in the system prompt, not structured.

### 5. Cross-Domain Correlation

Friday strike selection considers lifestyle (it's a ritual day), NFT floors (liquidity), and market regime together:

```typescript
// State composition enables cross-references
const state = await runtime.composeState(message);
// state.values contains: marketRegime, lifestyleContext, nftFloors, options
```

ElizaOS's `composeState` naturally enables cross-domain synthesis. ClawdBot would require explicit tool calls to gather each domain.

---

## What ClawdBot Would Do Better

Honest trade-offs:

### 1. Full Computer Control

ClawdBot can execute trades directly on Hypersurface. VINCE currently suggests strikes; it doesn't execute:

```bash
# ClawdBot could do this:
clawd: "I'll place the covered call on Hypersurface now..."
[exec] playwright opens hypersurface.exchange, fills order form, clicks submit
```

ElizaOS has no computer control. VINCE can suggest, but the human must execute.

### 2. Self-Healing Capabilities

ClawdBot can monitor its own health, fix bugs, and expand the knowledge base:

```bash
# ClawdBot self-improvement:
clawd: "I noticed the Deribit API changed. Updating the fallback service..."
[edit] services/fallbacks/deribit.fallback.ts
[exec] npm test
[commit] "fix: Update Deribit API endpoint"
```

ElizaOS requires developer intervention for code changes.

### 3. Local-First Privacy

ClawdBot runs entirely on your machine. VINCE on ElizaOS runs as a server (though it can be local):

- ClawdBot: API keys never leave your machine
- ElizaOS: Typically deployed to a server, though local deployment is possible

### 4. Simpler Memory Model

ClawdBot uses markdown files. Easy to inspect, version, and debug:

```
memory/
├── trades.md       # Human-readable trade history
├── preferences.md  # User preferences
└── context.md      # Current market context
```

ElizaOS uses a vector database. More powerful for semantic search, but less transparent for debugging.

---

## The IP Transcends the Framework

> "The IP was never the code—it was the concepts, insights, knowledge, expertise, and logic."
>
> — INSTRUCTIONS-CLAWDBOT-BRIEF.md

What matters isn't the framework. It's the domain logic that VINCE encodes:

### Domain Logic (Transfers to Any Framework)

| Component              | Value                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Signal Weights**     | Liquidation cascades 2.0x, funding extremes 1.5x, whale positions 1.3x          |
| **Funding Thresholds** | `> +0.02%` crowded longs = WIDER calls; `< -0.02%` shorts paying = TIGHTER CSPs |
| **Session Filters**    | Asia 0.9x confidence, EU/US Overlap 1.1x, Off-Hours 0.8x                        |
| **Circuit Breakers**   | $200 daily loss = done; 15% drawdown = pause                                    |
| **Goal Tracking**      | $420/day target, $10K/month stretch, Kelly Criterion sizing                     |

### Curated Datasets (Framework-Agnostic)

| Dataset                | Count                           | Location                            |
| ---------------------- | ------------------------------- | ----------------------------------- |
| Meme Constants         | 50+ tokens                      | `constants/memes.constants.ts`      |
| Target Assets          | BTC, ETH, SOL, HYPE + 34 HIP-3  | `constants/targetAssets.ts`         |
| Paper Trading Defaults | Goals, thresholds, Kelly params | `constants/paperTradingDefaults.ts` |
| Knowledge Files        | 700+                            | `knowledge/`                        |

### Architectural Patterns (Reusable Anywhere)

```typescript
// Pattern: Fallback Services
const deribitService = runtime.getService("deribit");
if (!deribitService) {
  // Use built-in API client
}

// Pattern: Circuit Breaker
const CIRCUIT_BREAKER = {
  maxFailures: 3,
  resetTimeMs: 60000,
  backoffMs: [1000, 2000, 4000],
};

// Pattern: Session-Based Risk Adjustment
const sessionMultiplier = getSessionMultiplier(); // 0.8x to 1.1x
const adjustedSize = baseSize * sessionMultiplier;
```

---

## Migration Path (If Needed)

If ClawdBot becomes the preferred framework, here's the migration priority:

### High Priority Skills (Unique Domain IP)

| Skill                     | Effort       | Value                                            |
| ------------------------- | ------------ | ------------------------------------------------ |
| Hyperliquid Options Pulse | ~10-15 hours | Funding → strike guidance mapping                |
| NFT Floor Analysis        | ~10-20 hours | OpenSea v2, tier classification, whale detection |
| Deribit Options Data      | ~5-10 hours  | IV surfaces, Greeks, DVOL                        |

### Medium Priority (Check ClawdHub First)

| Skill                    | Notes                      |
| ------------------------ | -------------------------- |
| DexScreener meme scanner | Community may have similar |
| CoinGecko price fetcher  | Likely exists              |
| News sentiment           | Generic pattern            |

### Direct Transfer (No Rebuild)

| Asset                  | Notes                              |
| ---------------------- | ---------------------------------- |
| `knowledge/` folder    | Drop into ClawdBot's memory system |
| Thresholds & constants | Embed in skill configuration       |
| README.md              | Reference material for skill specs |

---

## Conclusion

VINCE was built on ElizaOS because:

1. **Provider system** naturally aggregates 15+ data sources
2. **Evaluators** enable learning from trade performance
3. **Platform services** provide native Discord/Telegram integration
4. **Character system** ensures persona consistency across domains
5. **State composition** enables cross-domain correlation

ClawdBot would be better for:

1. **Autonomous execution** (placing trades, not just suggesting)
2. **Self-healing** (fixing its own bugs)
3. **Local-first privacy**
4. **Simpler debugging** (markdown files vs vector DB)

The domain logic—signal weights, funding thresholds, session filters, circuit breakers—transfers regardless of framework. The IP isn't the TypeScript; it's the thinking.

---

## Related Docs

- [WHAT.md](./WHAT.md) — What the plugin does and covers.
- [HOW.md](./HOW.md) — Development workflow, adding actions/services, debugging.
- [CLAUDE.md](./CLAUDE.md) — Full technical reference for the plugin.
- [TREASURY.md](../../TREASURY.md) — Cost coverage and profitability context (project root).

_Reference: [INSTRUCTIONS-CLAWDBOT-BRIEF.md](../../docs/INSTRUCTIONS-CLAWDBOT-BRIEF.md) for full migration context (if present)._
