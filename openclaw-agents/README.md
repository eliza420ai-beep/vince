# OpenClaw Integration for VINCE

This module adds **OpenClaw sub-agents** to VINCE for specialized, isolated research tasks.

## Why OpenClaw?

| Layer | VINCE (ElizaOS) | OpenClaw Sub-Agents |
|-------|-----------------|---------------------|
| **Strength** | Character-driven, multi-agent chat, daily standups | Isolated sessions, parallel execution, clean task boundaries |
| **Best For** | Conversational interaction, team dynamics, push briefings | Deep-dive research, parallel data gathering, cost control |
| **Memory** | Persistent character memory | Session-scoped (clean slate each time) |

**Hybrid approach:** VINCE handles conversation + orchestration. OpenClaw agents do specialized research in parallel.

## Agents

| Agent | Role | Command |
|-------|------|---------|
| **alpha-research** | X/Twitter sentiment, KOL tracking, narratives | `node orchestrator.js alpha SOL BTC` |
| **market-data** | Prices, volume, funding, OI | `node orchestrator.js market ETH` |
| **onchain** | Whale flows, smart money, DEX liquidity | `node orchestrator.js onchain BONK` |
| **news** | News aggregation, sentiment | `node orchestrator.js news` |

## Quick Start

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

## Requirements

- **OpenClaw gateway running:** `openclaw gateway start`
- **X API token** (for alpha-research): `export X_BEARER_TOKEN="..."`
- **Model:** MiniMax-M2.1 (default) or configurable

## Files

```
openclaw-agents/
├── alpha-research.md   # Agent spec
├── market-data.md      # Agent spec
├── onchain.md          # Agent spec
├── news.md             # Agent spec
├── orchestrator.js     # Spawns and merges
└── README.md           # This file
```

## Future Enhancements

- [ ] VINCE plugin integration (import orchestrator)
- [ ] Real-time streaming results
- [ ] Cost tracking per agent
- [ ] Caching layer (avoid repeat API calls)
- [ ] Fallback to VINCE native tools if OpenClaw fails
