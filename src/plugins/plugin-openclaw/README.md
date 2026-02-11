# plugin-openclaw

OpenClaw integration plugin for VINCE — framework for spawning isolated sub-agents for crypto research.

## ⚠️ Status: Framework Ready - Full SDK Pending

This plugin provides the foundation for OpenClaw integration. Full agent spawning requires the OpenClaw SDK to be exposed in the npm package.

## Features (Planned)

| Agent | Description | Status |
|-------|-------------|--------|
| **alpha** | X/Twitter sentiment, KOL tracking | 🚧 Framework |
| **market** | Prices, volume, funding rates, OI | 🚧 Framework |
| **onchain** | Whale flows, smart money, DEX | 🚧 Framework |
| **news** | News aggregation and sentiment | 🚧 Framework |
| **all** | Parallel execution | 🚧 Framework |

## Usage (When Fully Enabled)

```
@VINCE research SOL BTC ETH
@VINCE alpha SOL
@VINCE market ETH
@VINCE onchain BONK
@VINCE news crypto
```

## Setup Required

```bash
# Install OpenClaw
npm install -g openclaw

# Start gateway
openclaw gateway start

# Set API keys
export X_BEARER_TOKEN="your_x_token"
```

## Architecture

```
VINCE Chat
    │
    ▼
RUN_OPENCLAW_RESEARCH action
    │
    ▼
orchestrator.js (framework)
    │
    ▼
OpenClaw Gateway API ← Requires SDK exposure
```

## Files

```
src/plugins/plugin-openclaw/
├── matcher.ts                    # Context detection
├── README.md                     # This file
└── src/
    ├── index.ts                 # Plugin export
    └── actions/
        └── runResearch.action.ts # Research action
```

## Current Limitations

The `sessions_spawn()` and `sessions_history()` functions are not exported in the OpenClaw npm package. These are internal tools.

**Workaround options:**

1. **Use this framework** - Provides action structure, keyword matching, and graceful fallbacks

2. **Direct OpenClaw access** - Spawn agents directly via OpenClaw CLI or tools

3. **SDK exposure** - Request OpenClaw to export agent functions in npm package

## Testing

```bash
# Check orchestrator framework
node openclaw-agents/orchestrator.js

# Start gateway
openclaw gateway start

# Check health
openclaw health
```

## For Developers

To enable full functionality, the OpenClaw SDK needs to expose:

```typescript
import { sessions_spawn, sessions_history } from 'openclaw';

// Spawn agent
const result = await sessions_spawn({
  task: "Research SOL",
  label: "vince-alpha",
  model: "minimax-portal/MiniMax-M2.1",
});

// Get results
const history = await sessions_history({
  sessionKey: result.sessionKey,
});
```

Track progress: https://github.com/openclaw/openclaw
