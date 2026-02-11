# plugin-openclaw

**OpenClaw V2** — Enterprise-grade multi-agent crypto research plugin for VINCE.

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
