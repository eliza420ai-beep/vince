# ElizaOS v2.8 Architecture Reference

**For:** Sentinel (CTO Agent)
**Purpose:** Deep technical reference for writing PRDs and enforcing architecture rules
**Last updated:** 2026-02-17

---

## 1. Runtime Model

ElizaOS is a multi-agent TypeScript framework. Each agent is a separate runtime instance with its own:

- Character definition (personality, system prompt, knowledge, plugins)
- Message handler pipeline (receive → providers inject context → LLM generates → evaluators post-process → respond)
- Plugin registry (actions, services, providers, evaluators loaded at boot)
- Knowledge index (RAG over markdown files, queried per-turn)
- Database connection (Supabase via `@elizaos/plugin-sql`)

Agents share a database but run isolated message pipelines. They communicate via `ASK_AGENT` (inter-agent messaging), not shared memory.

### Message Processing Pipeline

```
User message arrives
  → Route to correct agent (Discord app ID, channel mapping)
  → Providers execute: inject context into prompt
    - Each provider returns a string block
    - Blocks concatenated into the system/user prompt
  → LLM call with assembled prompt
  → Response generated
  → Evaluators execute: post-process the response
    - Loop guard checks (A2A)
    - Sentiment scoring
    - Memory extraction
  → Response delivered to channel
```

### Key Runtime Objects

| Object         | Lifetime           | Purpose                                                          |
| -------------- | ------------------ | ---------------------------------------------------------------- |
| `AgentRuntime` | Process lifetime   | Core runtime, holds state, plugin registry, memory manager       |
| `Character`    | Loaded at boot     | Agent definition: prompt, plugins, knowledge, settings           |
| `Plugin`       | Registered at boot | Bundle of actions/services/providers/evaluators                  |
| `Memory`       | Per-conversation   | Messages stored in DB, retrievable via embedding search          |
| `State`        | Per-message        | Assembled context for current turn (providers + recent messages) |

---

## 2. Character Definition

A Character is the agent's identity file. It defines everything the agent is and can do.

```typescript
interface Character {
  name: string; // Display name
  system: string; // System prompt — the agent's personality and rules
  bio: string[]; // Background lines, sampled into context
  style: {
    all: string[]; // Style rules applied to all responses
    chat: string[]; // Chat-specific style rules
    post: string[]; // Post-specific style rules (X, etc.)
  };
  topics: string[]; // Topics the agent knows about
  knowledge: KnowledgeEntry[]; // RAG knowledge sources
  plugins: string[]; // Plugin package names to load
  settings: CharacterSettings; // Model, flags, platform config
  adjectives: string[]; // Personality descriptors
  messageExamples: MessageExample[][]; // Few-shot conversation examples
}
```

### Knowledge Entry Types

```typescript
// Directory — all .md files in this dir get RAG-indexed
{ directory: "sentinel-docs", shared: true }

// Single file — one specific document
{ path: "architecture-rules.md", shared: true }
```

`shared: true` means other agents can access this knowledge via ASK_AGENT or if they also reference the same directory. Default is agent-private.

### Settings That Matter

```typescript
interface CharacterSettings {
  model: string; // LLM model ID
  ragKnowledge: boolean; // Enable RAG search per-turn
  embeddingModel?: string; // Override embedding model
  discord?: {
    shouldRespondOnlyToMentions: boolean; // Don't respond to every message
  };
  interAgent?: {
    allowedTargets: string[]; // Which agents this one can ASK_AGENT
  };
}
```

### The Thin Agent Rule

Agent `.ts` files do exactly two things:

1. Define the Character object
2. Export it

No business logic. No utility functions. No imports from other plugins. If you're writing an `if` statement in an agent file, you're doing it wrong. Logic goes in plugins.

---

## 3. Plugin System

A plugin is a self-contained module that extends an agent's capabilities. It exports a `Plugin` object containing any combination of actions, services, providers, and evaluators.

### Plugin Object

```typescript
interface Plugin {
  name: string;
  description: string;
  actions?: Action[];
  services?: Service[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  init?: (runtime: AgentRuntime) => Promise<void>; // Called once at boot
}
```

### Directory Structure (Enforced)

```
plugin-name/
├── src/
│   ├── index.ts          # Exports the Plugin object. Nothing else.
│   ├── actions/
│   │   └── do-thing.ts   # One file per action
│   ├── services/
│   │   └── thing-service.ts
│   ├── providers/
│   │   └── thing-provider.ts
│   ├── evaluators/
│   │   └── thing-evaluator.ts
│   └── utils/
│       └── helpers.ts    # Shared within this plugin only
├── __tests__/
│   ├── thing-service.test.ts
│   └── do-thing.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Plugin Registration

Plugins are registered by package name in the Character's `plugins` array:

```typescript
plugins: [
  "@elizaos/plugin-sql", // Core database
  "@elizaos/plugin-bootstrap", // Core bootstrap (memory, goals, etc.)
  "@vince/plugin-vince", // Custom: market intelligence
  "@vince/plugin-sentinel", // Custom: CTO tools
];
```

At boot, ElizaOS resolves each package, calls `init()` if present, and registers all actions/services/providers/evaluators into the agent's runtime.

---

## 4. Actions

An Action is a discrete operation an agent can perform in response to a user message. The LLM decides which action to invoke based on the action's name, description, and validation logic.

```typescript
interface Action {
  name: string; // e.g., "ALOHA", "PERPS", "ASK_AGENT"
  description: string; // LLM reads this to decide when to use the action
  similes: string[]; // Alternative names/triggers
  validate: (runtime: AgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: AgentRuntime,
    message: Memory,
    state: State,
  ) => Promise<void>;
  examples: ActionExample[][]; // Few-shot examples for the LLM
}
```

### Action Design Rules

1. **Actions are thin.** They parse input, call a service, format output. No business logic in the handler.
2. **Validate gates execution.** Return `false` if prerequisites aren't met (missing API key, wrong context, etc.).
3. **Examples teach the LLM.** Write 2-3 realistic examples showing when this action triggers.
4. **One action, one verb.** `ALOHA` fetches market data. `PERPS` gets perp funding rates. Don't combine.

### Action → Service Pattern

```typescript
// actions/aloha.ts — THIN
const alohaAction: Action = {
  name: "ALOHA",
  description: "Get market overview and morning briefing",
  validate: async (runtime) => {
    return !!runtime.getSetting("COINGECKO_API_KEY");
  },
  handler: async (runtime, message, state) => {
    const service = runtime.getService("MarketIntelService");
    const briefing = await service.getMorningBriefing();
    await runtime.sendMessage(briefing, message.roomId);
  },
};

// services/market-intel-service.ts — ALL THE LOGIC
class MarketIntelService implements Service {
  // Data fetching, caching, aggregation, formatting
}
```

---

## 5. Services

A Service is a long-running or stateful component. It initializes at boot and persists for the agent's lifetime.

```typescript
interface Service {
  name: string;
  description?: string;
  initialize: (runtime: AgentRuntime) => Promise<void>;
  cleanup?: () => Promise<void>;
}
```

### When to Use a Service

- Background monitoring (paper bot watching for signals)
- State that persists across messages (cached API responses, connection pools)
- Complex logic with multiple steps (ML inference pipeline)
- Anything that needs initialization (WebSocket connections, SDK clients)

### Service Design Rules

1. **Services own state.** If it has a cache, a connection, or accumulated data, it's a service.
2. **Services are injectable.** Access via `runtime.getService("ServiceName")`.
3. **Cleanup matters.** Implement `cleanup()` for graceful shutdown. Close connections, flush caches.
4. **Services don't send messages directly.** They return data. Actions or providers handle message formatting.

### Service Patterns in Vince

| Service             | Plugin            | Purpose                                          |
| ------------------- | ----------------- | ------------------------------------------------ |
| PaperBotService     | plugin-vince      | Signal monitoring, trade execution, ML inference |
| SignalAggregator    | plugin-vince      | Collect and weight 20+ signal sources            |
| FeatureStore        | plugin-vince      | 50+ features per decision, persisted to Supabase |
| PRDGeneratorService | plugin-sentinel   | Generate and format PRDs from specs              |
| ProjectRadarService | plugin-sentinel   | Track project status across repos                |
| XResearchService    | plugin-x-research | Twitter/X data collection and analysis           |

---

## 6. Providers

A Provider injects context into the agent's prompt before each LLM call. This is how agents "know" things at runtime that aren't in their static system prompt.

```typescript
interface Provider {
  name: string;
  description?: string;
  get: (
    runtime: AgentRuntime,
    message: Memory,
    state: State,
  ) => Promise<string>;
}
```

### How Providers Work

Every turn, ElizaOS calls all registered providers. Each returns a string. These strings are concatenated and injected into the prompt alongside the system prompt and conversation history.

```
System prompt (from Character)
+ Provider outputs (dynamic context)
+ Recent conversation history
+ Current user message
→ LLM
```

### Provider Design Rules

1. **Providers are read-only.** They return strings. They don't modify state or send messages.
2. **Providers must be fast.** They run every turn. If you need expensive data, cache it in a service and read from cache.
3. **Keep output concise.** Every token from a provider competes with conversation history for context window space.
4. **Gate on relevance.** Check the message content before returning data. Don't inject trading data when the user asks about weather.

### Provider Example

```typescript
const portfolioProvider: Provider = {
  name: "portfolio-context",
  get: async (runtime, message, state) => {
    // Only inject when relevant
    if (!isFinanceRelated(message.content)) return "";

    const service = runtime.getService("PortfolioService");
    const positions = await service.getOpenPositions();
    if (!positions.length) return "";

    return `Current open positions:\n${positions
      .map(
        (p) =>
          `- ${p.symbol}: ${p.side} ${p.size} @ ${p.entry} (PnL: ${p.pnl}%)`,
      )
      .join("\n")}`;
  },
};
```

---

## 7. Evaluators

An Evaluator runs after the agent responds. It processes the completed turn for side effects: memory extraction, scoring, safety checks.

```typescript
interface Evaluator {
  name: string;
  description?: string;
  validate: (runtime: AgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: AgentRuntime,
    message: Memory,
    state: State,
  ) => Promise<void>;
  examples?: EvaluatorExample[];
}
```

### Evaluator Use Cases

| Evaluator         | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| Loop guard        | Detect A2A infinite loops, kill after N turns       |
| Fact extraction   | Pull structured data from conversations into memory |
| Sentiment scoring | Score user sentiment for analytics                  |
| Goal tracking     | Check if a goal was completed this turn             |

### Evaluator Design Rules

1. **Evaluators are fire-and-forget.** They don't modify the response. It's already sent.
2. **Validate before running.** Don't process every message. Check if this evaluator is relevant.
3. **Keep them light.** They run after every response. Heavy processing belongs in a service called by the evaluator.

---

## 8. Knowledge & RAG

### How RAG Works in ElizaOS

1. At boot, markdown files referenced in `Character.knowledge` are chunked and embedded.
2. Chunks are stored in Supabase with vector embeddings.
3. Each turn, the user's message is embedded and used to search for relevant chunks.
4. Top-K matching chunks are injected into the prompt (via an internal provider).

### Knowledge Configuration

```typescript
knowledge: [
  // Index entire directories
  { directory: "sentinel-docs", shared: true },
  { directory: "architecture", shared: true },

  // Index specific files
  { path: "trading/signals-playbook.md", shared: false },
];
```

### Knowledge Design Rules

1. **Structure for retrieval.** Use clear headers. Each section should be self-contained — RAG returns chunks, not full documents.
2. **Front-load key info.** Put the most important content in the first paragraph under each header.
3. **Use consistent terminology.** RAG matches on semantic similarity. If you call it "signal aggregation" in one doc and "data collection" in another, retrieval suffers.
4. **Keep files focused.** One topic per file. A 5000-line mega-doc retrieves worse than 50 focused files.
5. **Shared knowledge = shared responsibility.** If `shared: true`, other agents see it. Don't put agent-specific opinions in shared docs.

### Current Knowledge Map

| Agent    | Knowledge Dirs                           | Files (approx) |
| -------- | ---------------------------------------- | -------------- |
| Vince    | market-data, signals, trading, paper-bot | ~200           |
| Sentinel | sentinel-docs, architecture, prd-archive | ~100           |
| Kelly    | lifestyle, travel, dining, health        | ~150           |
| Eliza    | research, general                        | ~100           |
| Otaku    | defi, morpho, yield                      | ~80            |

Total: 800+ markdown files across 30+ directories.

---

## 9. Multi-Agent Communication

### ASK_AGENT

The primary inter-agent communication mechanism. One agent sends a message to another and waits for a response.

```typescript
// Inside an action handler
const response = await runtime.handleMessage({
  content: "What's the current risk exposure on ETH positions?",
  targetAgent: "Vince",
  roomId: message.roomId,
});
```

**Constraints:**

- Synchronous: caller blocks up to ~90 seconds
- Policy-gated: `settings.interAgent.allowedTargets` must include the target
- Loop guard: evaluator tracks A2A depth, kills chains after N hops (default: 3)

### ASK_AGENT Policy Example

```typescript
// Sentinel can ask Vince and Kelly, but not itself
settings: {
  interAgent: {
    allowedTargets: ["Vince", "Kelly", "Otaku"];
  }
}
```

### Discord Identity (Option C)

Each agent has its own Discord Application ID and bot token. They appear as separate users in Discord.

```bash
VINCE_DISCORD_APPLICATION_ID=...
VINCE_DISCORD_API_TOKEN=...
KELLY_DISCORD_APPLICATION_ID=...
KELLY_DISCORD_API_TOKEN=...
SENTINEL_DISCORD_APPLICATION_ID=...
SENTINEL_DISCORD_API_TOKEN=...
```

This means:

- Each agent has its own avatar and name
- Users can @ mention specific agents
- `shouldRespondOnlyToMentions: true` prevents agents from responding to every message

### Standups

Autonomous 2×/day meetings coordinated by Kelly:

1. Kelly triggers standup in a dedicated channel
2. Each agent reports: what they did, what's blocked, what's next
3. Agents can ASK_AGENT each other during standup for clarification
4. Kelly summarizes and posts to #daily-standup
5. Action items extracted and tracked

---

## 10. Paper Bot & ML Pipeline

### Signal Aggregation

The paper bot collects signals from 20+ sources, each with a configurable weight:

```typescript
interface Signal {
  source: string; // e.g., "funding_rate", "whale_alert", "news_sentiment"
  value: number; // Normalized -1 to 1
  weight: number; // 0 to 1, configurable per source
  confidence: number; // Source's self-reported confidence
  timestamp: number;
}
```

Weighted aggregation produces a composite score. Thresholds determine action:

- Score > 0.7: Strong signal, consider position
- Score 0.4-0.7: Moderate, flag for review
- Score < 0.4: Noise, ignore

### Feature Store

50+ features per decision, persisted to Supabase for ML training:

- **Market features:** price, volume, volatility, regime, session
- **Signal features:** individual source scores, composite score, signal diversity
- **Context features:** time of day, day of week, recent PnL, drawdown
- **Outcome features:** actual PnL, max adverse excursion, hold time (filled post-trade)

### ML Pipeline

```
Python train_models.py
  → Load features from Supabase
  → Walk-forward cross-validation
  → Optuna hyperparameter tuning
  → Train 4 models:
    1. signal_quality (classify: trade / no-trade)
    2. position_sizing (regress: % of capital)
    3. tp_optimizer (regress: take-profit level)
    4. sl_optimizer (regress: stop-loss level)
  → SHAP explainability reports
  → Export to ONNX format
  → Upload to Supabase storage
  → Runtime loads ONNX, runs inference per-signal
```

**Retraining trigger:** Win rate drops below 45% over trailing 50 trades.

---

## 11. Database Layer

All agents share Supabase (PostgreSQL + pgvector).

### Key Tables

| Table              | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `memories`         | All messages, embeddings, agent-room mappings |
| `knowledge_chunks` | RAG chunks with embeddings                    |
| `goals`            | Agent goals and progress                      |
| `features`         | ML feature store                              |
| `trades`           | Paper bot trade log                           |
| `signals`          | Raw signal history                            |
| `models`           | ONNX model metadata                           |

### Database Access Rules

1. **Use `@elizaos/plugin-sql`** for all DB operations. No raw Supabase client calls from plugin code.
2. **Never write to another agent's memories.** Agent isolation is enforced at the runtime level.
3. **Feature store writes go through FeatureStore service.** Don't INSERT directly.

---

## 12. Deployment & Operations

### Development

```bash
elizaos dev                    # Start all agents locally
elizaos dev --character vince  # Start single agent
```

### Production

```bash
bun run deploy:cloud           # Deploy to cloud infra
bun run sync:supabase          # Sync schema/migrations
```

### Environment Variables

Organized by category:

```bash
# Core
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...

# Per-agent Discord
VINCE_DISCORD_APPLICATION_ID=...
VINCE_DISCORD_API_TOKEN=...

# Feature flags
VINCE_PAPER_AGGRESSIVE=true          # Aggressive signal thresholds
ECHO_WTT_HIP3_ONLY=false            # Filter signal sources
GROK_SUB_AGENTS_ENABLED=true        # Enable Grok sub-agent calls

# API keys per service
COINGECKO_API_KEY=...
DEFILLAMA_API_KEY=...
ETHERSCAN_API_KEY=...
```

### Monitoring

- Logs via `plugin-log-filter` (suppress noisy output, surface errors)
- Trade PnL tracked in Supabase `trades` table
- Win rate, Sharpe, max drawdown computed on trailing windows
- Standup reports surface agent health 2×/day

---

## 13. Plugin Inventory

### Core Plugins (Every Agent)

| Plugin                      | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `@elizaos/plugin-bootstrap` | Memory management, goal tracking, core handlers |
| `@elizaos/plugin-sql`       | Database operations via Supabase                |
| `@vince/plugin-inter-agent` | ASK_AGENT, loop guard, standup coordination     |
| `@vince/plugin-log-filter`  | Log noise reduction                             |

### Domain Plugins

| Plugin              | Owner Agent | Domain                                                  |
| ------------------- | ----------- | ------------------------------------------------------- |
| `plugin-vince`      | Vince       | Market intelligence, signals, paper bot, ML             |
| `plugin-sentinel`   | Sentinel    | PRD generation, project radar, architecture enforcement |
| `plugin-kelly`      | Kelly       | Lifestyle, travel, dining, wine, health, fitness        |
| `plugin-eliza`      | Eliza       | Knowledge management, research, brainstorming           |
| `plugin-otaku`      | Otaku       | DeFi execution, Morpho, yield, CDP, wallets             |
| `plugin-openclaw`   | Shared      | OpenClaw integration, gateway, setup guides             |
| `plugin-x-research` | Vince       | Twitter/X research, pulse, vibe analysis                |

### Infrastructure Plugins

| Plugin                        | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `plugin-bankr`                | Token launch (Base + Solana)       |
| `plugin-bankr-sdk`            | Bankr SDK wrapper                  |
| `plugin-bankr-trading-engine` | Bankr trading engine               |
| `plugin-biconomy`             | Smart wallet (MEE, gasless tx)     |
| `plugin-cdp`                  | Coinbase Developer Platform wallet |
| `plugin-coingecko`            | Price data API                     |
| `plugin-defillama`            | DeFi protocol TVL/yield data       |
| `plugin-etherscan`            | Ethereum block explorer API        |
| `plugin-gamification`         | Engagement mechanics               |
| `plugin-morpho`               | Morpho lending/borrowing protocol  |
| `plugin-naval`                | Naval Ravikant philosophy quotes   |

---

## 14. PRD Template (Sentinel Standard)

Every PRD follows this structure. No exceptions.

```markdown
# PRD: [Feature Name]

**ID:** PRD-YYYYMMDD-XXXX
**Priority:** P0/P1/P2/P3 | **Effort:** S/M/L/XL
**Target:** plugin-name or system area

## 🎯 North Star Alignment

How this advances "Push, not pull. 24/7 market research."

## 📋 Goal & Scope

What we're building and why. Be specific. Name the files, the services, the data flow.

## ✅ Success Criteria

- [ ] Measurable criterion 1
- [ ] Measurable criterion 2
      (Must be testable. "Works well" is not a criterion.)

## 🔧 Technical Specification

Target files, architecture decisions, data flow diagrams.
Name the services, actions, providers involved.
Specify interfaces if adding new types.

## 🚫 Out of Scope

What we're NOT building. Prevent scope creep.

## 📐 Architecture Rules

Which rules from Section 15 apply. Call them out explicitly.

## 🧪 Testing

Required test coverage. Which services need unit tests.
Integration test requirements if applicable.

## 📅 Timeline

Estimated effort and dependencies.
```

### PRD Quality Bar

- **Specific:** Names files, functions, interfaces. Not "improve the system."
- **Bounded:** Clear out-of-scope section. Every PRD should say no to something.
- **Testable:** Success criteria a CI pipeline could verify.
- **Architecture-aware:** References the rules below. Shows understanding of plugin boundaries.

---

## 15. Architecture Rules (Complete Set)

These are the rules Sentinel enforces on every PR, PRD, and architecture decision.

### Rule 1: Plugin Boundaries

Logic lives in plugins. Agent files are thin — Character definition and plugin wiring only. If you see business logic in an agent `.ts` file, reject it.

**Test:** Can you describe what the agent file does in one sentence? "It defines AgentName's character and loads these plugins." If not, it's too thick.

### Rule 2: No Duplicate Lanes

Each agent owns a domain. Trading logic belongs in `plugin-vince`. Lifestyle logic belongs in `plugin-kelly`. DeFi execution belongs in `plugin-otaku`. If you find trading logic in Kelly's plugin, that's a bug.

**Test:** For any piece of logic, can you name exactly one plugin it belongs to? If two plugins could own it, the boundaries are wrong.

### Rule 3: Services Over Actions

Actions are thin wrappers. They parse input, call a service, format output. Complex logic, state management, caching — all in services. An action handler should be 20 lines, not 200.

**Test:** Is the action handler > 30 lines? It probably needs a service.

### Rule 4: Type Safety

No `any` unless wrapping an untyped external library. Use proper interfaces for all data structures. Generic `Record<string, unknown>` is acceptable for genuinely dynamic data; `any` is not.

**Test:** `grep -r ": any" src/` should return near-zero results.

### Rule 5: Testability

New services ship with unit tests in `__tests__/`. Tests cover the happy path and at least one error case. Mock external dependencies.

**Test:** New service PR without tests = rejected.

### Rule 6: Graceful Degradation

If a signal source fails, the system continues with remaining sources. If an API call times out, return cached data or skip gracefully. Never crash the agent because one external dependency is down.

**Test:** Kill any single external dependency. Does the agent still respond?

### Rule 7: Cache-First

Expensive API calls (CoinGecko, DeFiLlama, Etherscan) cache results with TTL. Default TTL: 5 minutes for price data, 1 hour for protocol data, 24 hours for static data.

**Test:** Call the same endpoint twice in 10 seconds. Second call should hit cache.

### Rule 8: No AI Slop

Clear variable names. No over-abstraction. Comments explain WHY, not WHAT. No `AbstractFactoryManagerService`. No 5-level class hierarchies. Flat is better than nested.

**Test:** Can a new developer read this code and understand it in 5 minutes?

### Rule 9: Provider Efficiency

Providers run every turn. They must be fast (< 100ms). Read from service caches, don't make API calls. Gate on message relevance — don't inject trading context when the user asks about restaurants.

**Test:** Measure provider execution time. Flag anything > 100ms.

### Rule 10: Knowledge Hygiene

One topic per knowledge file. Clear headers for RAG chunking. Consistent terminology. Front-load key information. Don't dump raw API responses into knowledge files.

**Test:** Does each knowledge file have a clear, descriptive filename and structured headers?

---

## 16. Common Anti-Patterns

| Anti-Pattern               | What It Looks Like                           | Fix                                  |
| -------------------------- | -------------------------------------------- | ------------------------------------ |
| Fat agent file             | 500-line agent.ts with helper functions      | Extract to plugin service            |
| God service                | One service doing everything                 | Split by responsibility              |
| Provider making API calls  | Provider fetches from external API each turn | Cache in service, read from cache    |
| Action with business logic | 200-line action handler                      | Extract to service                   |
| Cross-plugin imports       | plugin-kelly importing from plugin-vince     | Use ASK_AGENT or shared util package |
| Untyped responses          | `const data: any = await fetch(...)`         | Define response interface            |
| Silent failures            | `catch (e) {}`                               | Log error, return fallback           |
| Knowledge dump             | 10,000-line markdown file                    | Split into focused files             |

---

## 17. Frontend Architecture

- **Framework:** Next.js
- **Data:** Supabase (direct client connection)
- **Components:** Leaderboard, portfolio view, trade history, agent status
- **State:** Currently minimal, needs proper state management for beta
- **Auth:** Supabase Auth

Frontend is not agent-managed. It reads from the same Supabase tables the agents write to.

---

## Sentinel Architecture Enforcement

Checklist for every code review and PRD:

- [ ] **Plugin boundaries respected.** No business logic in agent files.
- [ ] **No duplicate lanes.** Logic is in the correct plugin for its domain.
- [ ] **Services over actions.** Action handlers are thin (< 30 lines). Complex logic is in services.
- [ ] **Type safety.** No `any` types without justification comment.
- [ ] **Tests included.** New services have unit tests in `__tests__/`.
- [ ] **Graceful degradation.** External dependency failures don't crash the agent.
- [ ] **Cache-first.** Expensive API calls use TTL-based caching.
- [ ] **No AI slop.** Clear names, flat structure, WHY-comments only.
- [ ] **Provider efficiency.** Providers < 100ms, gated on relevance.
- [ ] **Knowledge hygiene.** One topic per file, structured headers, consistent terms.
- [ ] **PRD completeness.** Has all required sections. Success criteria are testable. Out-of-scope is defined.
- [ ] **North star alignment.** Feature advances "Push, not pull. 24/7 market research."
- [ ] **No cross-plugin imports.** Plugins don't import from each other. Use ASK_AGENT or shared utils.
- [ ] **Error handling.** No empty catch blocks. Errors logged with context.
- [ ] **Environment variables documented.** New env vars added to deployment docs.
