# X API Reference

## Authentication

Bearer token from env var `X_BEARER_TOKEN`.

```
-H "Authorization: Bearer $X_BEARER_TOKEN"
```

## Search Endpoints

### Recent Search (last 7 days)

```
GET https://api.x.com/2/tweets/search/recent
```

Covers last 7 days. Max 100 results per request. Available to all developers on pay-per-use.

### Full-Archive Search (all time, back to March 2006)

```
GET https://api.x.com/2/tweets/search/all
```

Searches the full archive. Max 500 results per request. Available on **pay-per-use** (same credits as recent search); no enterprise required. Same query operators, same response format. Query length 1,024 chars (vs 512 for recent).

**Note:** This skill currently only uses recent search. Full-archive is available on the same pay-per-use plan but not yet implemented here.

### Standard Query Params

```
tweet.fields=created_at,public_metrics,author_id,conversation_id,entities
expansions=author_id
user.fields=username,name,public_metrics
max_results=100
```

Add `sort_order=relevancy` for relevance ranking (default is recency).

Paginate with `next_token` from response `meta.next_token`.

### Search Operators

| Operator | Example | Notes |
|----------|---------|-------|
| keyword | `bun 2.0` | Implicit AND |
| `OR` | `bun OR deno` | Must be uppercase |
| `-` | `-is:retweet` | Negation |
| `()` | `(fast OR perf)` | Grouping |
| `from:` | `from:elonmusk` | Posts by user |
| `to:` | `to:elonmusk` | Replies to user |
| `#` | `#buildinpublic` | Hashtag |
| `$` | `$AAPL` | Cashtag |
| `lang:` | `lang:en` | BCP-47 language code |
| `is:retweet` | `-is:retweet` | Filter retweets |
| `is:reply` | `-is:reply` | Filter replies |
| `is:quote` | `is:quote` | Quote tweets |
| `has:media` | `has:media` | Contains media |
| `has:links` | `has:links` | Contains links |
| `url:` | `url:github.com` | Links to domain |
| `conversation_id:` | `conversation_id:123` | Thread by root tweet ID |
| `place_country:` | `place_country:US` | Country filter |

**Not available as search operators:** `min_likes`, `min_retweets`, `min_replies`. Filter engagement post-hoc from `public_metrics`.

**Limits:** Max query length 512 chars for recent search, 1,024 for full-archive. Max ~10 operators per query.

### Response Structure

```json
{
  "data": [{
    "id": "tweet_id",
    "text": "...",
    "author_id": "user_id",
    "created_at": "2026-...",
    "conversation_id": "root_tweet_id",
    "public_metrics": {
      "retweet_count": 0,
      "reply_count": 0,
      "like_count": 0,
      "quote_count": 0,
      "bookmark_count": 0,
      "impression_count": 0
    },
    "entities": {
      "urls": [{"expanded_url": "https://..."}],
      "mentions": [{"username": "..."}],
      "hashtags": [{"tag": "..."}]
    }
  }],
  "includes": {
    "users": [{"id": "user_id", "username": "handle", "name": "Display Name", "public_metrics": {...}}]
  },
  "meta": {"next_token": "...", "result_count": 100}
}
```

### Constructing Tweet URLs

```
https://x.com/{username}/status/{tweet_id}
```

Both values available from response data + user expansions.

### Linked Content

External URLs from tweets are in `entities.urls[].expanded_url`. Use WebFetch to deep-dive into linked pages (GitHub READMEs, blog posts, docs, etc.).

### Rate Limits

With pay-per-use pricing (Feb 2026+), rate limits are primarily controlled by **spending limits** you set in the [Developer Console](https://console.x.com). The old 450/300 requests-per-15-min caps from the subscription model may no longer apply. If you hit 429, the `x-rate-limit-reset` header indicates when to retry. This skill uses a delay between requests as a safety buffer.

## Single Tweet Lookup

```
GET https://api.x.com/2/tweets/{id}
```

Same fields/expansions params. Use for fetching specific tweets by ID.
