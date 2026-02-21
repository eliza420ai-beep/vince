# OpenClaw Integration for VINCE

This module adds **OpenClaw sub-agents** to VINCE for specialized, isolated research tasks, and hosts the **Brain**, **Muscles**, **Bones**, **DNA**, **Soul**, **Eyes**, **Heartbeat**, and **Nerves** flows (operator mapping, AI system architect, codebase intelligence, behavioral architect, personality architect, activation architect, evolution architect, context efficiency architect → workspace files and skills/, memory/, SOUL, IDENTITY, HEARTBEAT, BOOT, CONTEXT_MANAGEMENT).

- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for the 8-pillar map (Brain, Muscles, Bones, DNA, Soul, Eyes, Heartbeat, Nerves) and workspace file set.
- **Brain (init):** See [brain/README.md](brain/README.md) for running the Jarvis-style onboarding (in-repo script or external) and syncing workspace files.
- **Muscles (system architect):** See [muscles/README.md](muscles/README.md) for mapping AI models and tools and generating routing/cost architecture (run after Brain).
- **Bones (codebase intelligence):** See [bones/README.md](bones/README.md) for mapping every repo and producing skills/ plus TOOLS, AGENTS, MEMORY, HEARTBEAT (run after Brain, ideally after Muscles).
- **DNA (behavioral architect):** See [dna/README.md](dna/README.md) for defining how the AI thinks, decides, and learns (run after Brain/Muscles/Bones).
- **Soul (personality architect):** See [soul/README.md](soul/README.md) for defining how the AI feels to interact with (run after Brain/Muscles/Bones/DNA).
- **Eyes (activation architect):** See [eyes/README.md](eyes/README.md) for defining what the AI watches for and acts on without being asked (run after Brain/Muscles/Bones/DNA/Soul).
- **Heartbeat (evolution architect):** See [heartbeat/README.md](heartbeat/README.md) for defining how the AI grows and evolves over time (run after Brain/Muscles/Bones/DNA/Soul/Eyes).
- **Nerves (context efficiency architect):** See [nerves/README.md](nerves/README.md) for auditing token usage and defining context guardrails (run after Brain/…/Heartbeat).

## Why OpenClaw?

| Layer | VINCE (ElizaOS) | OpenClaw Sub-Agents |
|-------|-----------------|---------------------|
| **Strength** | Character-driven, multi-agent chat, daily standups | Isolated sessions, parallel execution, clean task boundaries |
| **Best For** | Conversational interaction, team dynamics, push briefings | Deep-dive research, parallel data gathering, cost control |
| **Memory** | Persistent character memory | Session-scoped (clean slate each time) |

**Hybrid approach:** VINCE handles conversation + orchestration. OpenClaw agents do specialized research in parallel.

**Our first deployment:** Improving the forked VINCE repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)); see [OpenClaw vision and lore](../docs/OPENCLAW_VISION.md) for the backstory and Jan 2024 vision.

### Eliza plugins inside OpenClaw

The **openclaw-adapter** runs Eliza plugins (e.g. plugin-evm, plugin-solana) inside an OpenClaw agent as tools, hooks, and services—the inverse of this repo’s flow (Eliza spawning OpenClaw). Use it when an OpenClaw-based agent should call wallet or connector logic implemented as Eliza plugins. See [openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) and [knowledge/sentinel-docs/OPENCLAW_ADAPTER.md](../knowledge/sentinel-docs/OPENCLAW_ADAPTER.md) for config and limitations.

### Workspace context

In this repo you also use **vault/** (knowledge vault, todos, meetings), **skills/** (e.g. x-research), and **tasks/** (lessons, quickstarts). See [OPENCLAW.md](../OPENCLAW.md) at repo root for orientation.

## Agents

| Agent | Role | Command |
|-------|------|---------|
| **alpha-research** | X/Twitter sentiment, KOL tracking, narratives | `node orchestrator.js alpha SOL BTC` |
| **market-data** | Prices, volume, funding, OI | `node orchestrator.js market ETH` |
| **onchain** | Whale flows, smart money, DEX liquidity | `node orchestrator.js onchain BONK` |
| **news** | News aggregation, sentiment | `node orchestrator.js news` |

## Quick Start

See **[HOW-TO-RUN.md](HOW-TO-RUN.md)** for a short checklist (orchestrator + 8-pillar flows).

**Fast onboarding:** `bun run openclaw-agents/run-fast.ts` — one conversation to produce USER, SOUL, AGENTS, etc. (~15 min). See [fast/README.md](fast/README.md).

```bash
# Install OpenClaw (if not already)
npm install -g openclaw

# Set up OpenClaw gateway (required for agents)
openclaw gateway start

# Run a single agent
node openclaw-agents/orchestrator.js alpha SOL BTC ETH

# Run all agents in parallel
node openclaw-agents/orchestrator.js all SOL BTC ETH BONK
```

## Integration with VINCE

### Option 1: Standalone CLI
```bash
cd vince
node openclaw-agents/orchestrator.js all SOL BTC
# Output saved to openclaw-agents/last-briefing.md
```

### Option 2: Import in Plugin
```javascript
import { spawnAgent, getAgentResult } from './openclaw-agents/orchestrator.js';

// In a VINCE action
const alphaResult = await getAgentResult(
  await spawnAgent('alpha-research', 'SOL momentum')
);
return { text: alphaResult };
```

### Option 3: Discord Command
Add to VINCE's Discord plugin:
```
!vince openclaw alpha SOL
!vince openclaw market ETH
!vince openclaw all
```

## Architecture

```
VINCE (ElizaOS)
    │
    ├──► sessions_spawn() ──► Alpha Research Agent
    │                              │
    ├──► sessions_spawn() ──► Market Data Agent ◄─── CoinGecko, DexScreener
    │                              │
    ├──► sessions_spawn() ──► On-Chain Agent ◄──── Whale tracking, DEX APIs
    │                              │
    └──► sessions_spawn() ──► News Agent ◄───────── CryptoPanic, RSS
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │   Briefings merge   │
                          │   → VINCE display   │
                          └─────────────────────┘
```

## Sync (workspace files)

Brain output and operator profile files can live in `openclaw-agents/workspace/` or `knowledge/teammate/`. Keep them in sync so VINCE (teammate provider) and OpenClaw CLI use the same profile.

- **To OpenClaw CLI:** Copy or symlink `openclaw-agents/workspace/*.md` or `knowledge/teammate/*.md` to `~/.openclaw/workspace/`.
- **From OpenClaw:** If you ran OpenClaw’s own onboarding, copy `~/.openclaw/workspace/*.md` into this repo (`workspace/` or `knowledge/teammate/`).

Details: [ARCHITECTURE.md](ARCHITECTURE.md#sync).

## Requirements

- **OpenClaw gateway running:** `openclaw gateway start`
- **X API token** (for alpha-research): `export X_BEARER_TOKEN="..."`
- **Model:** MiniMax-M2.1 (default) or configurable

## Files

```
openclaw-agents/
├── ARCHITECTURE.md     # 8 pillars + workspace set + sync
├── HOW-TO-RUN.md       # Checklist: orchestrator + 8-pillar flows
├── README.md           # This file
├── brain/
│   ├── BRAIN_PROMPT.md # Full Brain (Jarvis init) prompt
│   ├── README.md       # How to run Brain (script + external)
│   └── run-brain.ts    # Conversation runner → workspace files
├── muscles/
│   ├── MUSCLES_PROMPT.md # Full Muscles (system architect) prompt
│   ├── README.md         # How to run Muscles (after Brain)
│   └── run-muscles.ts    # Conversation runner → TOOLS, AGENTS, MEMORY, HEARTBEAT
├── bones/
│   ├── BONES_PROMPT.md   # Full Bones (codebase intelligence) prompt
│   ├── README.md         # How to run Bones (after Brain/Muscles)
│   └── run-bones.ts      # Conversation runner → skills/ + TOOLS, AGENTS, MEMORY, HEARTBEAT
├── dna/
│   ├── DNA_PROMPT.md     # Full DNA (behavioral architect) prompt
│   ├── README.md         # How to run DNA (after Brain/Muscles/Bones)
│   └── run-dna.ts        # Conversation runner → AGENTS, MEMORY, workspace/memory/
├── soul/
│   ├── SOUL_PROMPT.md    # Full Soul (personality architect) prompt
│   ├── README.md         # How to run Soul (after Brain/Muscles/Bones/DNA)
│   └── run-soul.ts       # Conversation runner → SOUL.md, IDENTITY.md
├── eyes/
│   ├── EYES_PROMPT.md    # Full Eyes (activation architect) prompt
│   ├── README.md         # How to run Eyes (after Brain/.../Soul)
│   └── run-eyes.ts       # Conversation runner → HEARTBEAT.md, BOOT.md, AGENTS.md
├── heartbeat/
│   ├── HEARTBEAT_PROMPT.md # Full Heartbeat (evolution architect) prompt
│   ├── README.md           # How to run Heartbeat (after Brain/.../Eyes)
│   └── run-heartbeat.ts    # Conversation runner → HEARTBEAT, AGENTS, MEMORY, workspace/memory/
├── nerves/
│   ├── NERVES_PROMPT.md    # Full Nerves (context efficiency architect) prompt
│   ├── README.md           # How to run Nerves (after Brain/.../Heartbeat)
│   └── run-nerves.ts       # Conversation runner + workspace audit → CONTEXT_MANAGEMENT, AGENTS, HEARTBEAT
├── workspace/          # Brain + Muscles + Bones + DNA + Soul + Eyes + Heartbeat + Nerves (USER, SOUL, AGENTS, TOOLS, HEARTBEAT, BOOT, CONTEXT_MANAGEMENT, skills/, memory/, etc.)
├── alpha-research.md   # Agent spec
├── market-data.md      # Agent spec
├── onchain.md          # Agent spec
├── news.md             # Agent spec
├── orchestrator.js     # Spawns and merges
└── last-briefing.md    # Merged briefing from orchestrator
```

## Future Enhancements

- [ ] Real-time streaming results from orchestrator
- [ ] Cost tracking per agent in orchestrator CLI
- [ ] Fallback to VINCE native tools if OpenClaw fails
