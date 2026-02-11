# plugin-openclaw

OpenClaw integration plugin for VINCE — delegates crypto research to OpenClaw's sub-agent system.

## Architecture

```
VINCE Chat → RUN_OPENCLAW_RESEARCH action → OpenClaw sub-agents
```

**How it works:**
1. User asks VINCE for research (e.g., "@VINCE research SOL alpha")
2. Plugin action detects intent and formats the request
3. Request is delegated to OpenClaw agents (isolated, parallel, cost-controlled)
4. Results returned in structured briefing format

## Agents

| Agent | Description |
|-------|-------------|
| **alpha** | X/Twitter sentiment, KOL tracking, narratives |
| **market** | Prices, volume, funding rates, open interest |
| **onchain** | Whale flows, smart money, DEX liquidity |
| **news** | News aggregation and sentiment |
| **all** | All agents in parallel |

## Usage

```
@VINCE research SOL BTC
@VINCE alpha SOL
@VINCE market ETH
@VINCE onchain BONK
@VINCE news crypto
@VINCE all SOL BTC ETH
```

## Setup

```bash
# Install OpenClaw
npm install -g openclaw

# Start gateway (required)
openclaw gateway start

# Set API keys (optional)
export X_BEARER_TOKEN="..."
```

## Files

```
src/plugins/plugin-openclaw/
├── matcher.ts                    # Intent detection
├── README.md                    # This file
└── src/
    ├── index.ts                 # Plugin export
    └── actions/
        └── runResearch.action.ts # Research action
```

## Requirements

- **OpenClaw gateway running** - `openclaw gateway start`
- Gateway must be accessible (default: `ws://127.0.0.1:18789`)

## Troubleshooting

**Gateway not running:**
```bash
openclaw gateway start
openclaw health  # Verify
```

**No response from agents:**
- Check gateway is running
- Verify network connectivity to gateway port
- Check agent specifications in `openclaw-agents/`

## How to Test

```bash
# 1. Start gateway
openclaw gateway start

# 2. Run orchestrator directly
node openclaw-agents/orchestrator.js all SOL BTC

# 3. Or ask VINCE in chat
@VINCE research SOL
```
