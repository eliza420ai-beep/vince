# plugin-openclaw

**OpenClaw V2** — Enterprise-grade multi-agent crypto research plugin for VINCE and the canonical ElizaOS bridge to OpenClaw.

## What is OpenClaw?

OpenClaw is a **self-hosted gateway** that connects chat apps (WhatsApp, Telegram, Discord, Slack, iMessage, and more) to AI agents. One Gateway process (default port **18789**) is the control plane for sessions, channels, and tools. Formerly known as ClawdBot and MoltBot. Docs: [docs.openclaw.ai](https://docs.openclaw.ai) · [Getting started](https://docs.openclaw.ai/start/getting-started).

**Our first use case:** Fork and improve the VINCE repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince), 420+ commits). For the story behind the names and the original vision (ClawdBot as local bio-digital hub), see [OpenClaw vision and lore](../../../docs/OPENCLAW_VISION.md).

## What this plugin does

1. **In-process crypto research** — Alpha, market, on-chain, and news research with streaming, cost tracking, caching, and optional use of `openclaw-agents/last-briefing.md`. No Gateway required.
2. **Optional Gateway integration** — When `OPENCLAW_GATEWAY_URL` is set: gateway health/status and (if enabled) run research via the OpenClaw Gateway.
3. **Setup and status** — Ask for "OpenClaw setup" or "gateway status" to get a coherent guide or live Gateway status.

## Quick start (OpenClaw)

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway --port 18789
openclaw dashboard
```

See [Onboarding overview](https://docs.openclaw.ai/start/onboarding-overview) and [CLI wizard](https://docs.openclaw.ai/start/wizard).

## Environment

| Variable | Description |
|----------|-------------|
| `OPENCLAW_GATEWAY_URL` | Gateway base URL (e.g. `http://127.0.0.1:18789`). When set, status/health and optional Gateway-backed research are available. |
| `OPENCLAW_GATEWAY_TOKEN` | Optional. Auth token if your Gateway uses `gateway.auth.token`. |
| `OPENCLAW_USE_LAST_BRIEFING` | `true` or `1` to serve `openclaw-agents/last-briefing.md` when fresh (agent `all`). |
| `OPENCLAW_LAST_BRIEFING_MAX_AGE_MS` | Max age in ms for last-briefing (default `3600000`, 1 hour). |
| `OPENCLAW_RESEARCH_VIA_GATEWAY` | `true` to run research via Gateway when URL is set; otherwise in-process. |
| `OPENCLAW_DEFAULT_TOKENS` | Default token symbols when none specified (e.g. `SOL BTC`). Fallback: `SOL BTC ETH`. |
| `OPENCLAW_DEFAULT_AGENT` | Default research agent when none specified: `alpha`, `market`, `onchain`, `news`, or `all`. Fallback: `all`. |
| `HONCHO_API_KEY` | Optional. When set, Honcho memory context is injected and research summaries can be written to Honcho for persistent user representation. |
| `HONCHO_BASE_URL` | Optional. Honcho API base URL (default `https://api.honcho.dev`). |
| `HONCHO_WORKSPACE_ID` | Optional. Honcho workspace ID (default `vince-openclaw`). |

**Research modes**

- **In-process (default):** Research runs inside ElizaOS (LLM + Hyperliquid, etc.). No Gateway required.
- **Via OpenClaw Gateway:** Set `OPENCLAW_GATEWAY_URL` and `OPENCLAW_RESEARCH_VIA_GATEWAY=true`. Research is run via the OpenClaw CLI/Gateway; on failure or missing config, the plugin falls back to in-process.

Other plugin behavior (rate limits, budget, cache) is documented in the action descriptions and service code. Gateway health checks use a 5s timeout and one retry after 2s if the Gateway is slow to respond.

## Security

- **Bind to loopback** — Use `bind=loopback` (127.0.0.1) so only the same machine can reach the Gateway.
- **Set auth** — Configure `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`; the CLI and this plugin use the token when calling the Gateway.
- **Do not expose** — Do not expose the Gateway to the internet without a proper proxy and auth.

Full guide: [Clawdbot Security Guide](../../knowledge/setup-guides/clawd-security.md) (same applies to OpenClaw). Runbook: [Gateway](https://docs.openclaw.ai/gateway).

## References

- **Official:** [Channels](https://docs.openclaw.ai/channels) · [Architecture](https://docs.openclaw.ai/concepts/architecture) · [Tools](https://docs.openclaw.ai/tools) · [Providers](https://docs.openclaw.ai/providers) · [Gateway](https://docs.openclaw.ai/gateway) · [CLI](https://docs.openclaw.ai/cli)
- **ElizaOS:** [openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) (run Eliza plugins inside OpenClaw)
- **This repo:** [openclaw-agents/](../../openclaw-agents/README.md) (orchestrator, workspace sync, HOW-TO-RUN)

See also [OPENCLAW.md](OPENCLAW.md) in this directory for a longer reference.

---

## ✨ 28+ Features

| Category | Features |
|----------|----------|
| 🔬 **Research** | Multi-agent, Streaming, Cost, Budget |
| 📋 **Organization** | Watchlist, Portfolio, History, Export, Scheduler |
| 📊 **Analytics** | Comparison, Trends, Risk, Stats, Leaderboard |
| 🔔 **Alerts** | Price, Sentiment, Whale, Volume |
| 🧠 **Insights** | AI insights, Market, Screener, Whales, News, Fear & Greed |
| 🏦 **Advanced** | DeFi, NFT, Gas, Social, Exchange Flows, Token Unlocks |

## 🚀 All Commands (40+)

### Research
```
@VINCE research SOL BTC
@VINCE alpha / market / onchain / news
```

### Organization
```
@VINCE watch / unwatch / watchlist
@VINCE portfolio / add / remove
@VINCE history / export
@VINCE schedule daily / hourly / weekly
```

### Analytics
```
@VINCE compare SOL ETH
@VINCE trend SOL
@VINCE risk SOL
@VINCE stats
@VINCE leaderboard
```

### Alerts
```
@VINCE alert SOL price above 100
@VINCE alert ETH sentiment below 5
@VINCE alerts
```

### Insights
```
@VINCE insights SOL      # AI trading signals
@VINCE market            # Market overview
@VINCE screen            # Token screener
@VINCE whales            # Whale tracker
@VINCE news              # News digest
@VINCE feargreed         # Fear & Greed
```

### Advanced
```
@VINCE defi              # DeFi overview
@VINCE nft               # NFT collections
@VINCE gas               # Gas prices
@VINCE social SOL        # Social metrics
@VINCE flows             # Exchange flows
@VINCE unlocks           # Token unlocks
```

## 📊 Sample Outputs

### DeFi Analytics
```
🏦 **DeFi Analytics**

💰 **Total TVL:** $95.2B 📈 +2.5%

**Top Protocols:**
1. **Lido** (Ethereum) - $28.5B
   APY: 3.8% • Liquid Staking

2. **AAVE** (Multi) - $12.1B
   APY: 4.2% • Lending

**🔥 Top Yields:**
• Pendle stETH: 35.2% APY
• Raydium SOL-USDC: 28.5% APY
```

### NFT Research
```
🖼️ **NFT Research**

**Top Collections:**
1. **CryptoPunks** (ETH)
   Floor: 45.5 ETH 📈 +2.1%
   Vol: $1.2M • Holders: 3,542

2. **Mad Lads** (SOL)
   Floor: 85 SOL 📈 +8.5%
   Vol: $1.8M • Holders: 8,542
```

### Gas Tracker
```
⛽ **Gas Tracker**

**Ethereum**
   🐢 Slow: 15 • 🚗 Std: 22 • 🚀 Fast: 35 gwei
   💰 Avg tx: ~$2.50

**Solana**
   🐢 Slow: 0.000005 SOL
   💰 Avg tx: ~$0.001
```

### Social Metrics
```
📱 **Social Metrics: SOL**

**🐦 Twitter/X:**
• Followers: 2,500,000 (+3,500 24h)
• Engagement: 7/10
• Mentions: 8,500 (24h)

**📱 Telegram:** 150,000 members
**💬 Discord:** 120,000 members

🟢 **Sentiment:** 72/100
```

### Exchange Flows
```
🏛️ **Exchange Flows** (24h)

🟢 **BTC** @ Binance
   📥 In: 1,200 BTC | 📤 Out: 2,800 BTC
   📤 Net: +1,600 BTC ($104M)

🔴 **ETH** @ Coinbase
   📥 In: 15,000 ETH | 📤 Out: 8,000 ETH
   📥 Net: -7,000 ETH ($24.5M)
```

### Token Unlocks
```
🔓 **Token Unlocks**

🔴 **ARB** - 2024-02-14 (3d)
   📦 92.6M tokens (2.8% supply)
   💰 ~$85M • Type: investor

🟡 **APT** - 2024-02-16 (5d)
   📦 11.3M tokens (3.1% supply)
   💰 ~$95M • Type: cliff
```

## 📁 Files

```
src/plugins/plugin-openclaw/
├── src/
│   ├── index.ts (10 actions)
│   ├── actions/ (10)
│   │   ├── runResearch.action.ts
│   │   ├── watchlist.action.ts
│   │   ├── compare.action.ts
│   │   ├── history.action.ts
│   │   ├── scheduler.action.ts
│   │   ├── portfolio.action.ts
│   │   ├── alerts.action.ts
│   │   ├── analytics.action.ts
│   │   ├── insights.action.ts
│   │   └── advanced.action.ts
│   └── services/ (8)
│       ├── openclaw.service.ts
│       ├── watchlist.service.ts
│       ├── scheduler.service.ts
│       ├── portfolio.service.ts
│       ├── alerts.service.ts
│       ├── analytics.service.ts
│       ├── insights.service.ts
│       └── advanced.service.ts
```

## 📝 Stats

- **28+ features**
- **10 actions**
- **8 services**
- **40+ commands**
- **7000+ lines**
