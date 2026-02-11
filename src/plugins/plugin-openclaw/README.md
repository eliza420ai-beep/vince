# plugin-openclaw

OpenClaw integration plugin for VINCE — spawns isolated sub-agents for crypto research.

## Features

| Agent | Description |
|-------|-------------|
| **alpha** | X/Twitter sentiment, KOL tracking, narratives |
| **market** | Prices, volume, funding rates, open interest |
| **onchain** | Whale flows, smart money, DEX liquidity |
| **news** | News aggregation and sentiment |
| **all** | Run all agents in parallel |

## Usage

In chat with VINCE:

```
@VINCE research SOL BTC ETH
@VINCE alpha SOL
@VINCE market ETH
@VINCE onchain BONK
@VINCE news crypto
```

## Setup

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
orchestrator.js (exec)
    │
    ▼
OpenClaw Gateway API
    │
    ▼
Sub-agents (isolated sessions)
```

## Files

```
src/plugins/plugin-openclaw/
├── matcher.ts                    # Context detection
└── src/
    ├── index.ts                  # Plugin export
    └── actions/
        └── runResearch.action.ts # Research action
```

## Troubleshooting

**"Agent unavailable"**
- Run: `openclaw gateway start`
- Verify: `openclaw health`

**"Gateway API failed"**
- Check gateway is running on port 18789
- Verify network connectivity

## Direct CLI Usage

```bash
node openclaw-agents/orchestrator.js all SOL BTC
node openclaw-agents/orchestrator.js alpha ETH
node openclaw-agents/orchestrator.js market SOL --timeframe 7d
```
