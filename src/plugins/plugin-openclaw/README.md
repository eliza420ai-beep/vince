# plugin-openclaw

OpenClaw integration plugin for VINCE — multi-agent crypto research with **real-time streaming**, **budget alerts**, **cost tracking**, and **smart caching**.

## ✨ V2 Features

| Feature | Description |
|---------|-------------|
| **🔄 Real-Time Streaming** | Live progress updates during research |
| **💰 Cost Tracking** | Per-query and daily cost summaries |
| **🚨 Budget Alerts** | Warnings at $5/day, hard limit at $10/day |
| **💾 Smart Caching** | 1-hour cache for repeated queries |
| **⏱️ Rate Limiting** | 5 requests per minute per user |
| **🎨 Rich Output** | Icons, progress bars, formatted results |

## 🏗️ Architecture

```
VINCE Chat
    │
    ▼
RUN_OPENCLAW_RESEARCH
    │
    ├── Rate Limit Check ──► ⏰ "Try again in Xs"
    │
    ├── Budget Check ──────► 🚨 "Daily limit reached"
    │
    ├── Cache Check ───────► ♻️ Return cached result
    │
    └── Execute Agents
         │
         ├── 🔄 Stream: "Starting..."
         ├── 🔄 Stream: "Gathering data..." (20%)
         ├── 🔄 Stream: "Analyzing..." (60%)
         └── ✅ Complete with results
```

## 🚀 Usage

```
@VINCE research SOL BTC
@VINCE alpha SOL
@VINCE market ETH
@VINCE onchain BONK
@VINCE news crypto
@VINCE all SOL BTC ETH
```

## 🎯 Agents

| Agent | Icon | Description | Output |
|-------|------|-------------|--------|
| **alpha** | 🐦 | X/Twitter sentiment, KOL tracking | Sentiment score, narratives, signals |
| **market** | 📊 | Prices, volume, funding, OI | Price action, derivatives data |
| **onchain** | ⛓️ | Whale flows, smart money, DEX | Whale activity, address analytics |
| **news** | 📰 | News aggregation, sentiment | Headlines, sentiment score |
| **all** | 🔬 | All agents in parallel | Combined briefing |

## 💰 Cost Tracking

**Pricing (MiniMax-M2.1):**
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens

**Display:**
```
💰 $0.0012 (2.5K in / 0.8K out)
📊 Daily Usage: $0.05 total today
```

## 🚨 Budget Alerts

| Level | Threshold | Action |
|-------|-----------|--------|
| **Per-query warning** | $0.10 | ⚠️ "This query is expensive" |
| **Daily warning** | $5.00 | ⚠️ "Approaching daily limit" |
| **Daily hard limit** | $10.00 | 🚫 Research paused |

## 🔄 Real-Time Streaming

```
⏳ Starting research...
🔄 20% - Connecting to data sources...
🔄 40% - Gathering market data...
🔄 60% - Analyzing sentiment...
🔄 80% - Compiling results...
✅ Complete!
```

## 💾 Caching

- **TTL:** 1 hour
- **Key:** MD5 of `agent:tokens`
- **Storage:** Memory + disk (`.openclaw-cache/`)
- **Indicator:** ♻️ *Cached result*

## ⏱️ Rate Limiting

- **Limit:** 5 requests per minute per user
- **Response:** ⏰ "Try again in Xs"
- **Remaining:** Shown in every response

## 📊 Response Format

```
🐦 **Alpha Research: SOL** ✅

📊 **Sentiment:** Mixed to Bullish
• Twitter/X sentiment score: 7.2/10
• KOL activity: High (12 mentions in 24h)
• Narrative strength: Moderate

🎯 **Key Signals:**
• @frankdegods: Bullish on ecosystem growth
• @pentosh1: Watching for breakout

📈 **Alpha Score:** 6.5/10

---
✅ *Complete* • 💰 $0.0012 • 4/5 req/min

📊 **Daily Usage:** $0.05 total today
```

## ⚙️ Setup

```bash
# Install OpenClaw
npm install -g openclaw

# Start gateway (required)
openclaw gateway start

# Verify
openclaw health

# Optional: Set API keys
export X_BEARER_TOKEN="..."
```

## 📁 Files

```
src/plugins/plugin-openclaw/
├── matcher.ts                    # Intent detection
├── README.md                    # This file
└── src/
    ├── index.ts                 # Plugin export
    ├── actions/
    │   └── runResearch.action.ts # V2 action with streaming
    └── services/
        ├── index.ts             # Service exports
        └── openclaw.service.ts  # Cost, cache, rate-limit, streaming
```

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Real-time streaming progress
- ✅ Budget alerts ($5 warning, $10 limit)
- ✅ Actual agent execution (simulated)
- ✅ Cost tracking per query
- ✅ 1-hour caching
- ✅ Rate limiting (5 req/min)
- ✅ Rich output with icons

### v1.0.0
- Basic plugin structure
- Intent detection
- Research action skeleton

## 🚧 Roadmap

- [ ] Connect to actual OpenClaw SDK when available
- [ ] Historical cost charts
- [ ] Watchlist with auto-refresh
- [ ] Multi-language support
- [ ] Custom budget limits
