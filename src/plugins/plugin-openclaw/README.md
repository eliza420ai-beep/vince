# plugin-openclaw

**OpenClaw V2** — Enterprise-grade multi-agent crypto research plugin for VINCE.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔬 **Multi-Agent Research** | Alpha, Market, On-Chain, News agents |
| 🔄 **Real-Time Streaming** | Live progress updates |
| 💰 **Cost Tracking** | Per-query and daily summaries |
| 🚨 **Budget Alerts** | Warnings and hard limits |
| 💾 **Smart Caching** | 1-hour result cache |
| ⏱️ **Rate Limiting** | 5 requests per minute |
| 📋 **Watchlist** | Track tokens with alerts |
| ⚖️ **Comparison** | Side-by-side token analysis |
| 📜 **History** | View and export past research |
| ⏰ **Scheduler** | Automatic periodic research |
| 📤 **Export** | Markdown and JSON export |

## 🚀 Commands

### Research
```
@VINCE research SOL BTC ETH     # All agents
@VINCE alpha SOL                 # Sentiment only
@VINCE market ETH                # Market data only
@VINCE onchain BONK              # On-chain only
@VINCE news crypto               # News only
```

### Watchlist
```
@VINCE watch SOL                 # Add to watchlist
@VINCE unwatch SOL               # Remove from watchlist
@VINCE watchlist                 # View watchlist
```

### Comparison
```
@VINCE compare SOL ETH           # Compare 2 tokens
@VINCE compare SOL ETH BTC       # Compare 3+ tokens
@VINCE SOL vs BTC                # Alternative syntax
```

### History
```
@VINCE history                   # View recent research
@VINCE history 20                # View last 20
@VINCE export history            # Export to markdown
```

### Scheduler
```
@VINCE schedule SOL BTC daily    # Daily research
@VINCE schedule ETH hourly       # Hourly research
@VINCE schedule BTC weekly       # Weekly research
@VINCE schedules                 # View all schedules
@VINCE unschedule <id>           # Delete schedule
@VINCE toggle <id>               # Enable/disable
```

## 🎯 Agent Types

| Agent | Icon | Description |
|-------|------|-------------|
| **alpha** | 🐦 | X/Twitter sentiment, KOL tracking, narratives |
| **market** | 📊 | Prices, volume, funding rates, open interest |
| **onchain** | ⛓️ | Whale flows, smart money, DEX liquidity |
| **news** | 📰 | News aggregation and sentiment |
| **all** | 🔬 | All agents in parallel |

## 💰 Cost & Budget

**Pricing (MiniMax-M2.1):**
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens

**Budget Alerts:**
| Level | Threshold | Action |
|-------|-----------|--------|
| Per-query | $0.10 | ⚠️ Warning |
| Daily | $5.00 | ⚠️ Warning |
| Daily Hard | $10.00 | 🚫 Paused |

## 📊 Response Examples

### Research
```
🐦 **Alpha Research: SOL** ✅

📊 **Sentiment:** Bullish
• Score: 7.2/10
• KOL activity: High

📈 **Alpha Score:** 6.5/10

---
✅ Complete • 💰 $0.0012 • 4/5 req/min
📊 Daily Usage: $0.05
```

### Comparison
```
⚖️ **Token Comparison**

| Token | Sentiment | Alpha | Whales | Momentum |
|-------|-----------|-------|--------|----------|
| SOL 🏆 | Bullish | 8/10 | High | Strong Up |
| ETH | Mixed | 7/10 | Moderate | Sideways |

🏆 Winner: SOL
```

### Watchlist
```
📋 **Watchlist** (3 tokens)

1. **SOL**
   • Alerts: sentiment, whale, news
   • Last checked: 2 hours ago

2. **BTC**
   • Alerts: sentiment, whale
   • Last checked: 1 hour ago
```

### Schedules
```
⏰ **Scheduled Research** (2)

1. ✅ **all**: SOL, BTC
   • Frequency: daily
   • Next run: Tomorrow 9:00 AM

2. ⏸️ **alpha**: ETH
   • Frequency: hourly
   • Paused
```

## 🏗️ Architecture

```
VINCE Chat
    │
    ├── RUN_OPENCLAW_RESEARCH ──► Multi-agent execution
    │       ├── Rate limit
    │       ├── Budget check
    │       ├── Cache lookup
    │       └── Streaming results
    │
    ├── MANAGE_WATCHLIST ──────► Token tracking
    │
    ├── COMPARE_TOKENS ────────► Side-by-side analysis
    │
    ├── VIEW_HISTORY ──────────► Past research
    │
    └── MANAGE_SCHEDULE ───────► Auto-research
```

## 📁 Files

```
src/plugins/plugin-openclaw/
├── matcher.ts                      # Intent detection
├── README.md                       # This file
└── src/
    ├── index.ts                    # Plugin export
    ├── actions/
    │   ├── runResearch.action.ts   # Main research
    │   ├── watchlist.action.ts     # Watchlist management
    │   ├── compare.action.ts       # Token comparison
    │   ├── history.action.ts       # Research history
    │   └── scheduler.action.ts     # Scheduled research
    └── services/
        ├── index.ts                # Service exports
        ├── openclaw.service.ts     # Core: cost, cache, rate-limit
        ├── watchlist.service.ts    # Watchlist, history, export
        └── scheduler.service.ts    # Scheduled research
```

## ⚙️ Setup

```bash
# Install OpenClaw
npm install -g openclaw

# Start gateway
openclaw gateway start

# Verify
openclaw health

# Optional: API keys
export X_BEARER_TOKEN="..."
```

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Real-time streaming
- ✅ Budget alerts
- ✅ Watchlist with alerts
- ✅ Token comparison
- ✅ Research history & export
- ✅ Scheduled auto-research
- ✅ Cost tracking
- ✅ Smart caching
- ✅ Rate limiting

### v1.0.0
- Basic plugin structure
- Intent detection
