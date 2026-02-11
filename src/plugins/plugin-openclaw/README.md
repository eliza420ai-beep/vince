# plugin-openclaw

OpenClaw integration plugin for VINCE — multi-agent crypto research with cost tracking, caching, and rate limiting.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Research** | Alpha, Market, On-Chain, News agents |
| **Cost Tracking** | Per-query and daily cost summaries |
| **Smart Caching** | 1-hour cache for repeated queries |
| **Rate Limiting** | 5 requests per minute per user |
| **Rich Output** | Icons, cost badges, daily stats |

## 🏗️ Architecture

```
VINCE Chat → RUN_OPENCLAW_RESEARCH → OpenClaw Agents
                                    ↓
                              Cost Tracking
                                    ↓
                              Cache Layer
                                    ↓
                              Rich Response
```

## 📊 Cost Tracking

```
Per query: 💰 $0.0002 (1K in / 0.5K out)
Daily:     📊 $0.05 total today
```

**MiniMax-M2.1 pricing:**
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens

## 💾 Caching

- Results cached for **1 hour**
- Cache key based on: `agent:tokens`
- Automatic cache invalidation
- Manual clear: `openclaw cache clear`

## ⏱️ Rate Limiting

- **5 requests** per minute per user
- Automatic retry suggestions
- Fair usage for all users

## 🚀 Usage

```
@VINCE research SOL BTC
@VINCE alpha SOL
@VINCE market ETH
@VINCE onchain BONK
@VINCE news crypto
@VINCE all SOL BTC ETH
```

## 🎯 Agent Types

| Agent | Icon | Description |
|-------|------|-------------|
| **alpha** | 🐦 | X/Twitter sentiment, KOL tracking, narratives |
| **market** | 📊 | Prices, volume, funding rates, open interest |
| **onchain** | ⛓️ | Whale flows, smart money, DEX liquidity |
| **news** | 📰 | News aggregation and sentiment |
| **all** | 🔬 | All agents in parallel |

## 📈 Response Format

```
🐦 **Alpha Research: SOL**

• Sentiment: Mixed
• Key narratives: [...]
• KOL activity: [...]

⏳ *Processing...* • 💰 $0.0002 • 4/5 req/min

---

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
    │   └── runResearch.action.ts # Research action with cost/caching
    └── services/
        ├── index.ts             # Service exports
        └── openclaw.service.ts  # Cost tracking, caching, rate limiting
```

## 🧪 Testing

```bash
# 1. Start gateway
openclaw gateway start

# 2. Check health
openclaw health

# 3. Test in VINCE
@VINCE research SOL BTC
```

## 🔧 CLI Commands

```bash
# Clear cache
node openclaw-agents/orchestrator.js clear-cache

# Check stats
node openclaw-agents/orchestrator.js stats

# Run agents
node openclaw-agents/orchestrator.js all SOL BTC
```

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Cost tracking per query
- ✅ 1-hour caching
- ✅ Rate limiting (5 req/min)
- ✅ Rich output with icons
- ✅ Daily cost summary
- ✅ Better examples

### v1.0.0
- Basic plugin structure
- Intent detection
- Research action skeleton

## 🚧 Roadmap

- [ ] Actual agent execution (via SDK)
- [ ] Real-time streaming results
- [ ] Historical cost charts
- [ ] Budget alerts
- [ ] Multi-language support
