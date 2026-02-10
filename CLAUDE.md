# ElizaOS Agent Project Development Guide for Claude

> **Optimized for Claude LLM** - Complete reference for building ElizaOS agent projects

## 🎯 This repo: VINCE

This repository is the **VINCE** project: a unified data-intelligence agent (options, perps, memes, lifestyle, art) with a **self-improving paper trading bot** at the core.

| What | Where |
|------|--------|
| **Character & agent** | `src/agents/vince.ts` — knowledge dirs, system prompt, plugins |
| **Kelly (lifestyle concierge)** | `src/agents/kelly.ts` — travel advisor, private sommelier, Michelin guide, health guru, fitness coach, touch-grass motivator; uses **plugin-kelly** (KELLY_DAILY_BRIEFING), **@elizaos/plugin-discovery**, and **@elizaos/plugin-todo** (todo/reminders); the-good-life; knows user's trading context but never gives trading advice |
| **Solus (north star)** | [docs/SOLUS_NORTH_STAR.md](docs/SOLUS_NORTH_STAR.md) — X-native wealth architect; north star and roadmap for crypto intelligence |
| **Sentinel (core dev)** | `src/agents/sentinel.ts` — ops, architecture steward, 24/7 coding north star, ML/ONNX obsessed, ART (elizaOS examples/art), clawdbot for knowledge research, best settings; deep collab with Claude 4.6; plugin-sentinel (actions + weekly/daily tasks) |
| **Paper bot, ML, actions, providers** | `src/plugins/plugin-vince/` |
| **Feature store (ML storage)** | [FEATURE-STORE.md](FEATURE-STORE.md) |
| **Deploy (Eliza Cloud)** | [DEPLOY.md](DEPLOY.md) |
| **Multi-agent (ASK_AGENT, Discord, A2A)** | [MULTI_AGENT.md](MULTI_AGENT.md) |
| **Project overview** | [README.md](README.md) |
| **Plugin purpose / framework / how-to** | [src/plugins/plugin-vince/WHAT.md](src/plugins/plugin-vince/WHAT.md), [WHY.md](src/plugins/plugin-vince/WHY.md), [HOW.md](src/plugins/plugin-vince/HOW.md), [CLAUDE.md](src/plugins/plugin-vince/CLAUDE.md) |

Users can focus on chatting with **Kelly**; she orchestrates Vince (data), Solus (insights), Eliza (knowledge), and Otaku (DeFi execution) via ASK_AGENT so the user gets **one team, one dream** in a single conversation. **Otaku** is the only agent with a wallet that holds funds (DeFi experiments, NFT minting when Sentinel creates gen art, full onchain). **Eliza** should focus heavily on improving and expanding the knowledge base when needed.

Use the sections below for **generic ElizaOS** patterns (character, plugins, env, testing). For VINCE-specific implementation (signal sources, paper bot, ML pipeline), prefer the plugin docs above.

---

## 📋 Project Overview

| Property            | Value                         |
| ------------------- | ----------------------------- |
| **Project Type**    | ElizaOS Agent Project         |
| **Package Manager** | `bun` (REQUIRED)              |
| **Runtime**         | ElizaOS with plugin ecosystem |
| **Configuration**   | Character-based agent setup   |
| **Architecture**    | Plugin composition pattern    |

## 🏗️ Project Architecture

ElizaOS projects are **character-driven agent systems** that compose functionality through plugins:

```
📦 Your Agent Project
├── 🤖 Character Definition (personality, behavior)
├── 🔌 Plugin Ecosystem (functionality)
├── 🌍 Environment Config (APIs, secrets)
└── 🚀 Runtime Orchestration (ElizaOS)
```

## 📁 Project Structure

**This repo (VINCE):** `src/agents/vince.ts` (character), `src/index.ts` (entry), `src/plugins/plugin-vince/` (main plugin), `knowledge/teammate/` (USER.md, SOUL.md, TOOLS.md). No `characters/` folder; character is in code.

**Generic ElizaOS layout:**

```
your-agent-project/
├── 📂 src/
│   ├── 📄 character.ts          # Agent personality & config (or src/agents/name.ts)
│   ├── 📄 index.ts              # Main entry point
│   └── 📄 plugin.ts             # Custom plugin (optional)
├── 📂 characters/               # Character JSON files (optional)
├── 📂 knowledge/                # RAG / teammate context
├── 📄 .env                      # Environment variables
├── 📄 .env.example
├── 📄 package.json
└── 📄 tsconfig.json
```

## 🤖 Character Configuration

### Brand voice (all agents)

Apply to **every agent** in this repo:

- **Benefit-led (Apple-style):** Lead with what the user gets—the outcome, the experience, the move. Not "the system has X" but "you get X." One clear benefit per answer.
- **Confident and craft-focused (Porsche OG):** Confident without bragging. Substance over hype. Let the craft speak—no empty superlatives unless backed by a concrete detail.
- **Zero AI-slop jargon:** Never use: leverage, utilize (use "use"), streamline, robust, cutting-edge, game-changer, synergy, paradigm, holistic, seamless, best-in-class, delve, landscape, certainly, great question, I'd be happy to, let me help, explore, dive into, unpack, nuanced, actionable, circle back, touch base, at the end of the day. Concrete, human language only.

Reference in agent system prompts (e.g. "BRAND VOICE" or "VOICE PRINCIPLES") and in `style.all` so the model sees it every time.

### Core Character Definition

```typescript
// src/character.ts
import { Character } from '@elizaos/core';

export const character: Character = {
  // Basic Identity
  name: 'AssistantAgent',
  username: 'assistant',

  // Personality & Behavior
  bio: 'A helpful AI assistant created to provide assistance and engage in meaningful conversations.',

  system: `You are a helpful, harmless, and honest AI assistant.
Core principles:
- Always strive to provide accurate and useful information
- Be respectful and considerate in all interactions  
- Admit when you don't know something
- Ask clarifying questions when requests are ambiguous`,

  // Conversation Examples (Training Data)
  messageExamples: [
    [
      { name: 'user', content: { text: 'Hello! How are you today?' } },
      {
        name: 'AssistantAgent',
        content: {
          text: "Hello! I'm doing well, thank you for asking. I'm here and ready to help you with whatever you need. How can I assist you today?",
        },
      },
    ],
    [
      { name: 'user', content: { text: 'Can you help me understand a complex topic?' } },
      {
        name: 'AssistantAgent',
        content: {
          text: "Absolutely! I'd be happy to help you understand any topic. Could you tell me which specific topic you'd like to explore? I'll break it down in a clear, easy-to-understand way.",
        },
      },
    ],
  ],

  // Communication Style
  style: {
    all: [
      'Be helpful and friendly',
      'Use clear and concise language',
      'Show genuine interest in helping',
      'Maintain a professional yet approachable tone',
    ],
    chat: [
      'Respond naturally and conversationally',
      'Use appropriate emojis sparingly for warmth',
      'Ask follow-up questions to better understand needs',
    ],
    post: [
      'Be informative and engaging',
      'Structure information clearly',
      'Include actionable insights when possible',
    ],
  },

  // Plugin Configuration
  plugins: [
    // REQUIRED: Core functionality
    '@elizaos/plugin-bootstrap', // Essential actions & handlers
    '@elizaos/plugin-sql', // Memory & database management

    // REQUIRED: Model provider (choose one or more)
    '@elizaos/plugin-openai', // GPT-4, GPT-3.5, etc.
    // "@elizaos/plugin-anthropic", // Claude models
    // "@elizaos/plugin-groq",      // Fast inference

    // OPTIONAL: Communication channels
    // "@elizaos/plugin-discord",   // Discord integration
    // "@elizaos/plugin-twitter",   // Twitter/X integration
    // "@elizaos/plugin-telegram",  // Telegram bot

    // OPTIONAL: Specialized capabilities
    // "@elizaos/plugin-solana",    // Solana blockchain
    // "@elizaos/plugin-evm",       // Ethereum/EVM chains
  ],

  // Agent Settings
  settings: {
    voice: 'en-US-Neural2-F',
    model: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    secrets: {},
    intiface: false,
    chains: [],
  },
};

export default character;
```

### Character Variants Pattern

```typescript
// characters/variants.ts
import { Character } from '@elizaos/core';
import { baseCharacter } from '../src/character';

// Production character
export const productionCharacter: Character = {
  ...baseCharacter,
  name: 'ProductionAgent',
  settings: {
    ...baseCharacter.settings,
    model: 'gpt-4', // More capable model for production
  },
};

// Development character
export const devCharacter: Character = {
  ...baseCharacter,
  name: 'DevAgent',
  settings: {
    ...baseCharacter.settings,
    model: 'gpt-4o-mini', // Faster/cheaper for development
  },
  plugins: [
    ...baseCharacter.plugins,
    // Add development-only plugins
  ],
};

// Specialized character
export const cryptoCharacter: Character = {
  ...baseCharacter,
  name: 'CryptoAgent',
  bio: 'A cryptocurrency and blockchain expert assistant',
  plugins: [...baseCharacter.plugins, '@elizaos/plugin-solana', '@elizaos/plugin-evm'],
};
```

## 🔌 Plugin Ecosystem

### Required Plugins

| Plugin                      | Purpose                        | Status       |
| --------------------------- | ------------------------------ | ------------ |
| `@elizaos/plugin-bootstrap` | Core actions, message handling | **REQUIRED** |
| `@elizaos/plugin-sql`       | Memory, database management    | **REQUIRED** |

### Model Provider Plugins (Choose One or More)

| Plugin                      | Models                   | Use Case                       |
| --------------------------- | ------------------------ | ------------------------------ |
| `@elizaos/plugin-openai`    | GPT-4, GPT-3.5, GPT-4o   | General purpose, reliable      |
| `@elizaos/plugin-anthropic` | Claude 3.5 Sonnet, Haiku | Reasoning, analysis            |
| `@elizaos/plugin-groq`      | Llama, Mixtral           | Fast inference, cost-effective |
| `@elizaos/plugin-llama`     | Local Llama models       | Privacy, offline operation     |

### Communication Plugins (Optional)

```bash
# Social platforms
bun add @elizaos/plugin-discord      # Discord bot integration
bun add @elizaos/plugin-twitter      # Twitter/X posting & monitoring
bun add @elizaos/plugin-telegram     # Telegram bot functionality

# Web interfaces
bun add @elizaos/plugin-web          # Web UI for agent interaction
bun add @elizaos/plugin-rest         # REST API endpoints
```

### Specialized Plugins (Optional)

```bash
# Blockchain & Crypto
bun add @elizaos/plugin-solana       # Solana transactions & data
bun add @elizaos/plugin-evm          # Ethereum & EVM chains

# Data & Tools
bun add @elizaos/plugin-web-search   # Web search capabilities
bun add @elizaos/plugin-image        # Image generation & analysis
```

## 🌍 Environment Configuration

### Environment Variables Template

```bash
# .env
# ================================
# MODEL PROVIDERS (Required - choose one or more)
# ================================

# OpenAI (recommended for general use)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic (for Claude models)
ANTHROPIC_API_KEY=your-anthropic-key-here

# Groq (for fast inference)
GROQ_API_KEY=gsk_your-groq-key-here

# ================================
# COMMUNICATION CHANNELS (Optional)
# ================================

# Discord Bot
DISCORD_APPLICATION_ID=your-app-id
DISCORD_API_TOKEN=your-bot-token

# Twitter/X
TWITTER_USERNAME=your-username
TWITTER_PASSWORD=your-password
TWITTER_EMAIL=your-email

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-token

# ================================
# BLOCKCHAIN (Optional)
# ================================

# Solana
SOLANA_PUBLIC_KEY=your-solana-public-key
SOLANA_PRIVATE_KEY=your-solana-private-key

# Ethereum
EVM_PUBLIC_KEY=your-ethereum-public-key
EVM_PRIVATE_KEY=your-ethereum-private-key

# ================================
# SYSTEM CONFIGURATION
# ================================

# Logging level
LOG_LEVEL=info  # debug, info, warn, error

# Database
DATABASE_URL=sqlite://./data/db.sqlite

# Server settings
SERVER_PORT=3000
```

### Environment Best Practices

```bash
# .env.example (commit this)
OPENAI_API_KEY=sk-your-key-here
DISCORD_API_TOKEN=your-token-here
LOG_LEVEL=info

# .env.local (gitignore this - for local overrides)
LOG_LEVEL=debug
DATABASE_URL=sqlite://./data/dev.sqlite
```

## 🚀 Development Workflow

### Quick Start Commands

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start development server
elizaos start --dev

# 4. Or start with specific character
elizaos start --character characters/development.json
```

### Development Scripts

```json
// package.json
{
  "scripts": {
    "start": "elizaos start",
    "dev": "elizaos start --dev",
    "test": "elizaos test",
    "build": "bun build src/index.ts --outdir dist",
    "clean": "rm -rf dist data/logs/*"
  }
}
```

### Testing Your Agent

#### **Method 1: Interactive Development**

```bash
# Quick development mode (recommended for testing)
elizaos dev
# This automatically loads a test character and enables hot reloading

# Start with hot reloading
elizaos start --dev

# Start with specific character
elizaos start --character characters/development.json --dev

# Start with debug logging
LOG_LEVEL=debug elizaos start --dev
```

#### **Method 2: Automated Testing**

```bash
# Run all tests
elizaos test

# Test specific components
elizaos test --filter "action-name"

# Test with specific character
elizaos test --character characters/test.json
```

#### **Method 3: Production Testing**

```bash
# Build and test production build
bun run build
NODE_ENV=production elizaos start --character characters/production.json
```

## 🎛️ Custom Plugin Development

For project-specific functionality beyond available plugins:

### When to Create Custom Plugins

- ✅ **Unique business logic** not available in existing plugins
- ✅ **Proprietary API integrations** specific to your use case
- ✅ **Custom data sources** or specialized workflows
- ❌ **NOT** for simple configuration changes (use character config)
- ❌ **NOT** for combining existing plugins (use character composition)

### Custom Plugin Structure

```typescript
// src/plugin.ts
import { Plugin, Action, ActionResult, Service } from '@elizaos/core';

// Custom service for your specific needs
class CustomService extends Service {
  static serviceType = 'custom';

  async initialize(runtime: IAgentRuntime): Promise<void> {
    // Initialize your custom integrations
  }

  async processCustomRequest(message: any): Promise<any> {
    // Process the custom request
    // Add your custom logic here
    return {
      success: true,
      message: 'Custom request processed successfully',
      data: message.content,
    };
  }
}

// Custom action for specific commands
const customAction: Action = {
  name: 'CUSTOM_ACTION',
  description: 'Handles custom functionality specific to this project',

  validate: async (runtime, message) => {
    return message.content.text.includes('custom');
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    try {
      const service = runtime.getService<CustomService>('custom');
      // Your custom logic here
      const result = await service.processCustomRequest(message);

      // Callback sends message to user in chat
      await callback({
        text: 'Custom functionality executed successfully',
        action: 'CUSTOM_ACTION',
      });

      // Return ActionResult for action chaining
      return {
        success: true,
        text: 'Custom action completed',
        values: {
          customResult: result,
          processedAt: Date.now(),
        },
        data: {
          actionName: 'CUSTOM_ACTION',
          result,
        },
      };
    } catch (error) {
      await callback({
        text: 'Failed to execute custom action',
        error: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export const customPlugin: Plugin = {
  name: 'custom-project-plugin',
  description: 'Project-specific functionality',
  services: [CustomService],
  actions: [customAction],
};
```

### Integrating Custom Plugin

```typescript
// src/character.ts
import { customPlugin } from './plugin';

export const character: Character = {
  // ... other config
  plugins: [
    // Core plugins
    '@elizaos/plugin-bootstrap',
    '@elizaos/plugin-sql',
    '@elizaos/plugin-openai',

    // Your custom plugin
    customPlugin,

    // Other plugins...
  ],
};
```

## 📊 Agent Memory & Persistence

### Memory Configuration

```typescript
// Agent automatically persists:
// - Conversation history
// - Learned patterns
// - User preferences
// - Context relationships

// Access agent memories:
const memories = await runtime.getMemories({
  roomId: currentRoomId,
  count: 10,
  unique: true,
});

// Add custom memory:
await runtime.addMemory({
  content: { text: 'Important user preference noted' },
  type: 'preference',
  roomId: currentRoomId,
});
```

### Database Configuration

```bash
# SQLite (default - good for development)
DATABASE_URL=sqlite://./data/agent.db

# PostgreSQL (recommended for production)
DATABASE_URL=postgresql://username:password@localhost:5432/agent_db

# Custom database adapter (advanced)
DATABASE_ADAPTER=custom
```

## 🚀 Deployment Guide

### Local Production Deployment

```bash
# Build for production
bun run build

# Start in production mode
NODE_ENV=production elizaos start --character characters/production.json

# With process manager (recommended)
pm2 start "elizaos start --character characters/production.json" --name "my-agent"
```

## 🔧 Advanced Configuration

### Multi-Character Management

```typescript
// src/characters.ts
export const characters = {
  assistant: assistantCharacter,
  crypto: cryptoCharacter,
  social: socialCharacter,
  researcher: researcherCharacter
};

// Start specific character
elizaos start --character characters/crypto.json
```

### Plugin Configuration Override

```typescript
// Advanced plugin configuration
export const character: Character = {
  // ... base config
  plugins: [
    {
      // Plugin with custom config
      name: '@elizaos/plugin-openai',
      config: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
  ],
};
```

### Performance Optimization

```typescript
// High-performance character config
export const character: Character = {
  // ... base config
  settings: {
    // Optimize for speed
    model: 'gpt-4o-mini', // Faster model
    embeddingModel: 'text-embedding-3-small', // Smaller embeddings

    // Memory management
    maxMemories: 1000, // Limit memory size
    memoryDecay: 0.95, // Gradual forgetting

    // Response optimization
    streamingEnabled: true, // Stream responses
    batchSize: 5, // Batch API calls
  },
};
```

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

| Issue                 | Symptoms                        | Solution                                 |
| --------------------- | ------------------------------- | ---------------------------------------- |
| **Agent won't start** | "Plugin not found" errors       | Check plugin installation: `bun install` |
| **No responses**      | Agent loads but doesn't respond | Verify API keys in `.env` file           |
| **Memory errors**     | Database connection failed      | Check `DATABASE_URL` configuration       |
| **Slow responses**    | Long delays in replies          | Switch to faster model (gpt-4o-mini)     |
| **Rate limits**       | API quota exceeded              | Implement rate limiting or upgrade plan  |

### Debug Commands

```bash
# Maximum verbosity
LOG_LEVEL=debug elizaos start

# Test specific functionality
elizaos test --filter "openai" --verbose

# Check plugin loading
elizaos start --dry-run --verbose

# Database troubleshooting
elizaos db:status
elizaos db:migrate
```

### Health Monitoring

```typescript
// Built-in health checks
GET /health           # Basic health status
GET /health/detailed  # Detailed system info
GET /api/status      # Agent status and metrics
```

## 📋 Production Checklist

Before deploying your agent to production:

### Security

- [ ] API keys stored in environment variables
- [ ] Database credentials secured
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Error messages don't leak sensitive data

### Performance

- [ ] Appropriate model selected for use case
- [ ] Memory limits configured
- [ ] Database optimized (PostgreSQL for production)
- [ ] Caching enabled where appropriate
- [ ] Health monitoring set up

### Reliability

- [ ] Error handling covers edge cases
- [ ] Graceful degradation for API failures
- [ ] Database backups configured
- [ ] Process monitoring (PM2, Docker health checks)
- [ ] Logging configured appropriately

### Testing

- [ ] Core functionality tested
- [ ] Integration tests pass
- [ ] Load testing completed
- [ ] Monitoring and alerting configured

## 🎯 Next Steps

### 1. **Start Simple**

Begin with basic configuration and core plugins, then gradually add complexity.

### 2. **Iterate Based on Usage**

Monitor your agent's performance and user interactions to guide improvements.

### 3. **Contribute Back**

Share useful patterns and plugins with the ElizaOS community.

### 4. **Scale Thoughtfully**

Plan for growth with proper infrastructure and monitoring.

---

**🎉 Ready to build your ElizaOS agent!** Start with `elizaos start --dev` and let your agent evolve with your needs.

---

## X Research skill (Cursor / Claude)

**skills/x-research/** is a Cursor/Claude skill for read-only X (Twitter) research: agentic search, thread following, watchlist, sourced briefings. Use when you need “what are people saying on X about …” or “search X for …” from the IDE. Requires **X_BEARER_TOKEN** (env or project `.env`) and Bun. See [skills/x-research/README.md](skills/x-research/README.md) for setup and CLI usage.

**In-chat (VINCE / Solus):** When `X_BEARER_TOKEN` is set, **VINCE_X_RESEARCH** supports search, a user’s recent tweets (“what did @user post?”), a thread (“get thread for tweet 123” or paste x.com/…/status/ID), and a single tweet. For **watchlist** (add/remove/check accounts) and **saving research to a file** (`--save --markdown`), use the **CLI**: `cd skills/x-research && bun run x-search.ts watchlist check` and `bun run x-search.ts search "…" --save --markdown`.

---

## Kelly: plugin-discovery

Kelly uses **@elizaos/plugin-discovery** for conversational “What can you do?” capability discovery and **@elizaos/plugin-todo** (vendored in `packages/plugin-todo`) for todo/list and reminders; rolodex is optional (in-app reminders only without it). Discovery lives in `packages/plugin-discovery`; `DISCOVERY_REQUIRE_PAYMENT=false` keeps summary and manifest free—set `DISCOVERY_REQUIRE_PAYMENT=true` and add plugin-commerce for paid. Todo lives in `packages/plugin-todo`; without plugin-rolodex only in-app reminders work.

---

## Sentinel: Core Dev

**Sentinel** is the core dev agent: ops/runbook, architecture steward, **cost steward** (TREASURY + cost breakdown), and proactive partner for **Claude 4.6** (task briefs, instructions for Claude Code / Cursor). North star: **coding 24/7**, **self-improving**, **ML/ONNX obsessed**, **ART** (elizaOS examples/art), **clawdbot for knowledge research**, **best settings**. **90% core dev, 10%** locked in on gen art (Meridian, QQL, Ringers, Fidenza; huge fan of **XCOPY**). With VCs/angels he **pitches**—no slides, demos that blow them away, elevator pitch + TLDR of the big vision. **Motivation:** earn a CryptoPunk as PFP (paper edge → revenue → one day a Punk). Brand voice: benefit-led, Porsche OG craft, no AI-slop; high-end branding only, no sales/GTM.

- **Character:** `src/agents/sentinel.ts`. Knowledge: `internal-docs`, `sentinel-docs` (repo .md + PROGRESS-CONSOLIDATED + **TREASURY.md** with cost breakdown, synced by `scripts/sync-sentinel-docs.sh`), `teammate` (shared). Responsible for improving all .md and consolidating progress.txt (plugin-vince, plugin-kelly, frontend).
- **Plugin:** `src/plugins/plugin-sentinel/`. Actions: **SENTINEL_SUGGEST** (general suggestions + task brief for Claude 4.6), **SENTINEL_CLAWDBOT_GUIDE**, **SENTINEL_SETTINGS_SUGGEST**, **SENTINEL_ONNX_STATUS**, **SENTINEL_ART_GEMS**, **SENTINEL_DOC_IMPROVE**, **SENTINEL_COST_STATUS** (burn rate, breakeven, cost summary from TREASURY + Usage tab), **SENTINEL_ART_PITCH** (gen art / XCOPY-style ideas, Meridian, QQL, Ringers, Fidenza).
- **Tasks:** **SENTINEL_WEEKLY_SUGGESTIONS** (7d; push to channels named sentinel/ops). **SENTINEL_DAILY_DIGEST** (optional; `SENTINEL_DAILY_ENABLED=true`): daily digest (ONNX status, clawdbot reminder, ART gem, Claude 4.6 task-brief suggestion) + optional ONNX nudge; push to sentinel/ops channels.
- **Env:** `SENTINEL_WEEKLY_ENABLED` (default true; set false to disable weekly). `SENTINEL_DAILY_ENABLED` (default false; set true for daily digest). `SENTINEL_DAILY_HOUR_UTC` (optional; default 8). `SENTINEL_DISCORD_*` for dedicated Discord app.
- **Claude 4.6 collaboration:** Ask Sentinel for "task brief for Claude 4.6" or "instructions for Claude Code" to get a pasteable block (task + architecture rules + "keep the architecture as good as it gets" + 24/7 coding mindset). Use in Cursor or the Claude Code controller.
- **PRDs for Cursor:** Sentinel delivers **Product Requirements Documents** for Cursor: full specs (goal, acceptance criteria, architecture rules) the team can paste or save and use when implementing. Standup can assign type **prd** → output in `standup-deliverables/prds/`.
- **Milaidy / OpenClaw instructions:** Sentinel produces **integration and setup instructions** for [Milaidy](https://github.com/milady-ai/milaidy) and [OpenClaw](https://github.com/openclaw/openclaw): how to run them, how VINCE connects (e.g. standup → Milaidy Gateway at `MILAIDY_GATEWAY_URL`; openclaw-adapter for Eliza↔OpenClaw). Standup can assign type **integration_instructions** → output in `standup-deliverables/integration-instructions/`. See `knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md`.
- **Cost questions:** Ask "what's our burn?", "breakeven?", "cost status" → **SENTINEL_COST_STATUS** summarizes from TREASURY (Usage tab, LLM choice, Cursor, data API tiers, 100K target, burn rate). See [TREASURY.md](TREASURY.md) § Cost breakdown (Sentinel).

---

## Related docs (VINCE)

- [README.md](README.md) — Project overview, getting started, configuration
- [docs/SOLUS_NORTH_STAR.md](docs/SOLUS_NORTH_STAR.md) — Solus north star and roadmap (X-native crypto intelligence)
- [FEATURE-STORE.md](FEATURE-STORE.md) — Paper bot feature storage and ML training
- [DEPLOY.md](DEPLOY.md) — Deploy to Eliza Cloud
- [TREASURY.md](TREASURY.md) — Cost coverage and profitability mandate
- [src/plugins/plugin-vince/](src/plugins/plugin-vince/) — WHAT, WHY, HOW, CLAUDE, README
- [docs/WORTH_IT_PROOF.md](docs/WORTH_IT_PROOF.md) — Proof that 24/7 research, knowledge extension, and ONNX are worth it
