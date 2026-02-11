# plugin-openclaw

**OpenClaw V2** — Enterprise-grade multi-agent crypto research plugin for VINCE.

## ✨ 22+ Features

| Category | Features |
|----------|----------|
| 🔬 **Research** | Multi-agent, Streaming, Cost tracking, Budget alerts |
| 📋 **Organization** | Watchlist, Portfolio, History, Export, Scheduler |
| 📊 **Analytics** | Comparison, Trends, Risk, Stats, Leaderboard |
| 🔔 **Alerts** | Price, Sentiment, Whale, Volume |
| 🧠 **Insights** | AI insights, Market overview, Screener, Whales, News, Fear & Greed |

## 🚀 All Commands

### Research
```
@VINCE research SOL BTC      # All agents
@VINCE alpha SOL             # Sentiment
@VINCE market ETH            # Market data
@VINCE onchain BONK          # On-chain
@VINCE news crypto           # News
```

### Organization
```
@VINCE watch SOL             # Watchlist
@VINCE portfolio             # Holdings
@VINCE add 10 SOL at 80      # Add holding
@VINCE history               # Past research
@VINCE schedule SOL daily    # Auto-research
```

### Analytics
```
@VINCE compare SOL ETH       # Comparison
@VINCE trend SOL             # Sentiment trend
@VINCE risk SOL              # Risk analysis
@VINCE stats                 # Usage stats
@VINCE leaderboard           # Top tokens
```

### Alerts
```
@VINCE alert SOL price above 100
@VINCE alert ETH sentiment below 5
@VINCE alerts
```

### Insights
```
@VINCE insights SOL          # AI trading insights
@VINCE market                # Market overview
@VINCE screen minAlpha:7     # Token screener
@VINCE whales                # Whale tracker
@VINCE whales SOL            # Whales for token
@VINCE news                  # News digest
@VINCE feargreed             # Fear & Greed index
```

## 📊 Sample Outputs

### AI Insights
```
🧠 **AI Insights: SOL**

🟢 **Signal:** BULLISH
📊 **Confidence:** 75%
⏱️ **Timeframe:** 1-7 days
✅ **Risk:** low

**Reasoning:**
• Strong accumulation pattern detected
• KOL sentiment turning positive
• Whale wallets increasing positions

**Targets:**
• Entry: $100
• Stop Loss: $90
• Take Profit: $120
```

### Market Overview
```
🌍 **Market Overview**

💰 **Market Cap:** $2.1T
📊 **24h Volume:** $85B
₿ **BTC Dominance:** 54%

😨 **Fear & Greed:** 35/100 - Fear
[███░░░░░░░]

📈 **Top Gainers:**
• BONK +32%
• WIF +18%

📉 **Top Losers:**
• SHIB -12%
• DOGE -8%

🔥 **Trending:** SOL, BTC, ETH, BONK
```

### Token Screener
```
🔍 **Token Screener**

**Filters:** Alpha ≥ 7 • Risk ≤ 5
**Results:** 4 tokens

1. **SOL** - Alpha: 9/10, Risk: 4/10 📈
   Vol: $450M • Match: 100%

2. **JUP** - Alpha: 8/10, Risk: 5/10 📈
   Vol: $120M • Match: 100%
```

### Whale Tracker
```
🐋 **Whale Tracker**

🟢 **SOL** BUY
   500000 tokens ($4.5M) • 15m ago

🔴 **BTC** SELL
   150 tokens ($9.8M) • 28m ago

🔄 **ETH** TRANSFER
   10000 tokens ($3.2M) • 45m ago
```

### Fear & Greed
```
😱 **Fear & Greed Index**

😨 **Current:** 35/100 - **Fear**
[███░░░░░░░]
   Fear ◄────────► Greed

**Changes:**
📉 24h: -5
📈 7d: +8

**7-Day Chart:**
`▄▂▂▄▆▄▄` (Fear ▂▄▆█ Greed)
```

## 🏗️ Architecture

```
VINCE Chat
    │
    ├── RESEARCH ────────► Multi-agent
    ├── WATCHLIST ───────► Token tracking
    ├── PORTFOLIO ───────► Holdings
    ├── COMPARE ─────────► Analysis
    ├── HISTORY ─────────► Past research
    ├── SCHEDULER ───────► Auto-research
    ├── ALERTS ──────────► Notifications
    ├── ANALYTICS ───────► Trends/Risk/Stats
    └── INSIGHTS ────────► AI/Market/Screener/Whales/News
```

## 📁 Files

```
src/plugins/plugin-openclaw/
├── matcher.ts
├── README.md
└── src/
    ├── index.ts (9 actions)
    ├── actions/ (9)
    │   ├── runResearch.action.ts
    │   ├── watchlist.action.ts
    │   ├── compare.action.ts
    │   ├── history.action.ts
    │   ├── scheduler.action.ts
    │   ├── portfolio.action.ts
    │   ├── alerts.action.ts
    │   ├── analytics.action.ts
    │   └── insights.action.ts
    └── services/ (7)
        ├── openclaw.service.ts
        ├── watchlist.service.ts
        ├── scheduler.service.ts
        ├── portfolio.service.ts
        ├── alerts.service.ts
        ├── analytics.service.ts
        └── insights.service.ts
```

## ⚙️ Setup

```bash
npm install -g openclaw
openclaw gateway start
```

## 📝 Stats

- **22+ features**
- **9 actions**
- **7 services**
- **30+ commands**
- **5000+ lines of code**
