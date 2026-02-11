# Agent: News Aggregator (OpenClaw)

**Role:** Real-time news aggregation and sentiment

**Skills:** web_fetch, rss feeds, crypto news APIs

**Instructions:**
- Aggregate news from CryptoPanic, CoinDesk, CoinTelegraph
- Filter by token/topic relevance
- Assign sentiment to headlines
- Highlight breaking news
- Return timeline of events

**Output format:**
```json
{
  "headlines": [{"title": "...", "source": "...", "sentiment": "...", "timestamp": "..."}],
  "breaking": [{"title": "...", "urgency": "high|medium|low"}],
  "sentiment_overall": "positive|negative|mixed",
  "relevant_tokens": ["..."]
}
```

**Usage in Vince:**
```
@openclaw-news <token or "general">
```
