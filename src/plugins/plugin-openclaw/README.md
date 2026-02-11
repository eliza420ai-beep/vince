# plugin-openclaw

**OpenClaw V2** — Enterprise-grade multi-agent crypto research plugin for VINCE.

## ✨ 16+ Features

| Category | Features |
|----------|----------|
| 🔬 **Research** | Multi-agent, Streaming, Cost tracking, Budget alerts |
| 📋 **Organization** | Watchlist, Portfolio, History, Export, Scheduler |
| 📊 **Analytics** | Comparison, Trends, Risk analysis, Stats, Leaderboard |
| 🔔 **Alerts** | Price, Sentiment, Whale, Volume alerts |

## 🚀 All Commands

### Research
```
@VINCE research SOL BTC      # All agents
@VINCE alpha SOL             # Sentiment only
@VINCE market ETH            # Market data
@VINCE onchain BONK          # On-chain
@VINCE news crypto           # News
```

### Watchlist
```
@VINCE watch SOL             # Add to watchlist
@VINCE unwatch SOL           # Remove
@VINCE watchlist             # View all
```

### Portfolio
```
@VINCE add 10 SOL at 80      # Add holding
@VINCE remove SOL            # Remove holding
@VINCE portfolio             # View holdings
@VINCE research portfolio    # Research all holdings
```

### Comparison
```
@VINCE compare SOL ETH       # Compare 2 tokens
@VINCE SOL vs BTC vs ETH     # Compare multiple
```

### History
```
@VINCE history               # View recent
@VINCE history 20            # View last 20
@VINCE export history        # Export to markdown
```

### Scheduler
```
@VINCE schedule SOL daily    # Daily research
@VINCE schedule ETH hourly   # Hourly research
@VINCE schedules             # View all
@VINCE unschedule <id>       # Delete
```

### Alerts
```
@VINCE alert SOL price above 100     # Price alert
@VINCE alert ETH sentiment below 5   # Sentiment alert
@VINCE alert BTC whale above 10      # Whale alert
@VINCE alerts                        # View all
@VINCE delete alert <id>             # Delete
```

### Analytics
```
@VINCE trend SOL             # Sentiment trend
@VINCE risk SOL              # Risk analysis
@VINCE stats                 # Usage dashboard
@VINCE leaderboard           # Top tokens
```

## 📊 Response Examples

### Research
```
🐦 **Alpha Research: SOL** ✅

📊 **Sentiment:** Bullish (7.2/10)
📈 **Alpha Score:** 6.5/10

---
✅ Complete • 💰 $0.0012 • 4/5 req/min
```

### Risk Analysis
```
⚠️ **Risk Analysis: SOL**

**Risk Score:** 5/10
[█████░░░░░]

**Factors:**
• Volatility: 6/10
• Liquidity: 3/10
• Concentration: 5/10

**Recommendation:**
⚠️ Moderate risk - Position sizing recommended
```

### Leaderboard
```
🏆 **Token Leaderboard**

🥇 **SOL** - Alpha: 9/10 📈 Strong Up
🥈 **BTC** - Alpha: 8/10 ➡️ Sideways
🥉 **ETH** - Alpha: 7/10 📈 Up
```

### Sentiment Trend
```
📈 **Sentiment Trend: SOL**

**Current:** 7.2/10 📈
**Average:** 6.8/10
**Direction:** Improving (+0.8)

**Chart (last 10):**
`▄▄▆▆█▆▆███` Low ▂▄▆█ High
```

## 🏗️ Architecture

```
VINCE Chat
    │
    ├── RESEARCH ────────► Multi-agent execution
    │       ├── Streaming
    │       ├── Cost tracking
    │       └── Caching
    │
    ├── WATCHLIST ───────► Token tracking
    │
    ├── PORTFOLIO ───────► Holdings management
    │
    ├── COMPARE ─────────► Side-by-side analysis
    │
    ├── HISTORY ─────────► Past research
    │
    ├── SCHEDULER ───────► Auto-research
    │
    ├── ALERTS ──────────► Notifications
    │
    └── ANALYTICS ───────► Trends, Risk, Stats
```

## 📁 Files

```
src/plugins/plugin-openclaw/
├── matcher.ts
├── README.md
└── src/
    ├── index.ts (8 actions)
    ├── actions/
    │   ├── runResearch.action.ts
    │   ├── watchlist.action.ts
    │   ├── compare.action.ts
    │   ├── history.action.ts
    │   ├── scheduler.action.ts
    │   ├── portfolio.action.ts
    │   ├── alerts.action.ts
    │   └── analytics.action.ts
    └── services/
        ├── index.ts
        ├── openclaw.service.ts
        ├── watchlist.service.ts
        ├── scheduler.service.ts
        ├── portfolio.service.ts
        ├── alerts.service.ts
        └── analytics.service.ts
```

## ⚙️ Setup

```bash
npm install -g openclaw
openclaw gateway start
```

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Multi-agent research
- ✅ Real-time streaming
- ✅ Cost tracking & budget alerts
- ✅ Smart caching (1hr TTL)
- ✅ Rate limiting (5 req/min)
- ✅ Watchlist with alerts
- ✅ Portfolio tracking
- ✅ Token comparison
- ✅ Research history & export
- ✅ Scheduled auto-research
- ✅ Price/sentiment/whale alerts
- ✅ Sentiment trends
- ✅ Risk analysis
- ✅ Usage stats dashboard
- ✅ Token leaderboard
