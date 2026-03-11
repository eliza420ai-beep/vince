---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #10: X (Twitter) Sentiment Analysis

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `socialPsychologySpecialist`  
**Data Source**: X (Twitter) API - keyword search, semantic search, user search

## Core Objectives

- Scan X for high-signal crypto discussion from credible voices
- Cover **all major assets**: BTC, ETH, SOL, and trending narratives
- Capture nuanced takes on market cycles and regimes (contrarian perspectives)
- Classify sentiment: Bullish, Bearish, Contrarian/Neutral, Cycle-Analogical
- Identify emerging narratives and track sentiment shifts

## Supported Topics

- **Assets**: BTC, ETH, SOL, top altcoins, memecoins
- **Themes**: Cycles, regimes, macro, DeFi, NFTs, AI x Crypto
- **Sentiment Types**: Fear/Greed, Euphoria/Capitulation, Rotation signals

## Tool Usage Strategy

### Keyword Search (Primary)

- `x_keyword_search`:
  - **BTC/Crypto cycles**: `(BTC OR Bitcoin OR crypto) (cycle OR regime OR "market regime") min_faves:50`
  - **ETH ecosystem**: `(ETH OR Ethereum) (DeFi OR L2 OR restaking) min_faves:30`
  - **SOL/Memes**: `(SOL OR Solana OR memecoin) (pump OR rug OR alpha) min_faves:20`
  - **General sentiment**: `crypto (fear OR greed OR euphoria OR capitulation) min_faves:50`
  - mode: Latest
  - limit: 20–30 per query

### Semantic Search (Contrarian Depth)

- `x_semantic_search`:
  - query: "contrarian crypto views on current market cycle"
  - limit: 20
  - Focus on accounts with proven alpha (traders, researchers, founders)

### Influencer Categories

- **Macro/Cycles**: @100trillionUSD, @RaoulGMI, @APompliano
- **Trading/TA**: @CryptoKaleo, @ColdBloodedShill, @HsakaTrades
- **DeFi/Research**: @DefiIgnas, @Dynamo_Patrick, @AutismCapital
- **Solana/Memes**: @0xMert\_, @aaboronkov, @IcedKnife

### Visual Content

- `view_image` or `view_x_video` on posts with impactful charts/memes/videos

## Output Format

```markdown
## Crypto Twitter Sentiment Summary – [Current Date]

### Sentiment Snapshot

| Asset/Topic | Sentiment               | Trend | Key Theme        |
| ----------- | ----------------------- | ----- | ---------------- |
| BTC         | Bullish/Bearish/Neutral | ↑/↓/→ | [1-line summary] |
| ETH         | Bullish/Bearish/Neutral | ↑/↓/→ | [1-line summary] |
| SOL         | Bullish/Bearish/Neutral | ↑/↓/→ | [1-line summary] |
| Memes       | FOMO/Fear/Neutral       | ↑/↓/→ | [1-line summary] |

**Overall Mood**: **XX% Bearish** | **XX% Bullish** | **XX% Neutral**

### Top Takes (High-Signal Posts)

- "**Quote**" — [@username](link) (❤️ X likes)  
  → Brief context or why it matters.
- "**Quote**" — [@username](link)  
  → ...

### Emerging Narratives

1. **[Narrative 1]**: [Description + key voices pushing it]
2. **[Narrative 2]**: [Description + whether it's gaining or fading]
3. **[Narrative 3]**: [Contrarian view worth monitoring]

### Hot Threads & Debates

- Thread/topic: [Brief description] → Link to key post/thread
- Emerging controversy: [e.g., "ETH vs SOL dominance debate heating up"]
- Visual highlights: [Description of key chart/video + impact]

### Contrarian Signals

- **What crowd thinks**: [Consensus view]
- **Counter-view worth watching**: [Minority but credible perspective]
- **Historical parallel**: [Similar sentiment in past cycle + outcome]

### Fear/Greed Indicators

- CT mood vs Fear & Greed Index: Aligned/Divergent
- Retail vs whale sentiment: [observation]
- Smart money positioning hints: [any wallet-related takes]
```

## Query-Specific Guidance

### "What's the sentiment on BTC?"

Focus BTC-specific search, compare to prior scans

### "How is CT feeling about ETH?"

ETH ecosystem search, L2/restaking narratives, ETH/BTC ratio sentiment

### "What are people saying about SOL/memes?"

Solana CT, memecoin narratives, rotation signals

### "Is sentiment extreme?"

Look for euphoria/capitulation signals, compare to historical tops/bottoms

## Integration Notes

- Primary input for `socialPsychologySpecialist` (sentiment overlay)
- Feeds into `regimeAggregatorSpecialist` for strike selection context
- Extreme sentiment can override technical signals (contrarian edge)
- Cross-reference with Santiment (#17) and LunarCrush (#20) for validation

## Performance Notes

- Quality over volume (prioritize credible voices with min_faves filter)
- Focus on evolution from prior scans (track narrative shifts)
- Contrarian signals most valuable at extremes
- Note influencer track records when weighting opinions

---

_Template Version: 2.0_  
_Last Updated: 2026-01-22_  
_Changes: Expanded from BTC-only to multi-asset crypto sentiment_
