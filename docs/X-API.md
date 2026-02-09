# X (Twitter) API — VINCE usage and scaling

VINCE uses the **X API v2** (read-only) for search, profile, thread, single tweet, and list feed. By default **one bearer token** (`X_BEARER_TOKEN`) is shared by in-chat research and background sentiment; when you add **`X_BEARER_TOKEN_SENTIMENT`** (or `X_BEARER_TOKEN_BACKGROUND`), sentiment and list feed use that token and in-chat keeps the primary token so vibe-check 429s no longer block "What are people saying about BTC?".

## Tiers and limits

- **Basic** (and similar pay-as-you-go): ~450 requests per 15-minute window for standard endpoints (search recent, tweet lookup, user lookup, list tweets). Fine for light use: in-chat search only, or sentiment with long stagger (e.g. one asset per hour = 4 requests per 4h for 4 assets).
- **Pro**: Higher limits; recommended if you run **sentiment + in-chat + list feed** and want fresher data or more assets. Check [developer.x.com](https://developer.x.com/) for current limits and pricing.

For an “all-in” X setup (sentiment, list feed, CT Vibe, leaderboard), **Pro** or a second app/token is recommended so you don’t hit 429s during peak usage.

## Quota usage (single token)

- **Search:** 1 request per unique query (15-min cache). Sentiment refresh: one asset per stagger interval (default 1h) → e.g. 4 assets = 4 searches per 4h.
- **List posts:** 1 request per list (15-min cache). List sentiment uses this.
- **In-chat:** Each “search X for …”, “what did @user post?”, thread, single tweet = 1 request (or cache hit).

So with 4 assets and 1h stagger you do ~4 search requests per full cycle; list posts add 1 request per list refresh. Keep **X_SENTIMENT_STAGGER_INTERVAL_MS** and list usage in mind when estimating quota.

## Optional: second token (stops in-chat from being blocked)

If you add a **second** X app and bearer token, you can dedicate one token to **in-chat research** and one to **background sentiment + list**. That doubles effective quota and avoids in-chat and vibe check competing for the same 15-min window.

To support this in code later:

- Add env **`X_BEARER_TOKEN_SENTIMENT`** (or `X_BEARER_TOKEN_BACKGROUND`). When set, **VinceXSentimentService** (and list refresh) would use this token for their X calls instead of `X_BEARER_TOKEN`. In-chat research would keep using `X_BEARER_TOKEN`.
- Implementation: pass a token override into the service that performs the HTTP/XDK call (e.g. xResearch accepts an optional `tokenOverride` for “background” calls, or sentiment holds the second token and calls a shared fetcher with that token). **Implemented:** Set `X_BEARER_TOKEN_SENTIMENT` in `.env`; sentiment and list feed use it, in-chat keeps `X_BEARER_TOKEN`. Cooldowns are separate so vibe-check 429s no longer block chat.

## TypeScript XDK

VINCE uses the **official TypeScript XDK** ([@xdevplatform/xdk](https://www.npmjs.com/package/@xdevplatform/xdk)) when installed; it falls back to raw `fetch` otherwise. The XDK provides:

- **Authentication:** We use **App-Only (Bearer token)** — `new Client({ bearerToken })`. OAuth 1.0a/2.0 User Context are supported by the XDK but not used here.
- **Endpoints we use:** `posts.searchRecent`, `posts.getByIds`, `users.getByUsernames`, and list APIs (`lists.getListById`, `lists.getListPosts`, etc.) for list feed and sentiment.
- **Pagination:** We use XDK-style pagination in two ways:
  - **Async iteration:** `VinceXResearchService.searchPaginated(query, opts)` yields one page at a time (`AsyncGenerator<XResearchPageResult>`). Use for “load more” or when you need to cap total requests. `getListPostsPaginated(listId, opts)` does the same for list feed.
  - **Collect up to N tweets:** `searchAll(query, { maxTweets, maxPages })` uses `searchPaginated` under the hood to collect up to `maxTweets` across pages (respecting `maxPages` and rate limits).
- **Streaming:** When the XDK exposes `stream.filteredStream`, `VinceXResearchService.streamFilteredStream(opts)` returns an `AsyncIterable` of tweet-like events. Requires X API access that includes the filtered stream product. If the XDK does not expose it, the method throws with a clear message.

Official XDK docs and index:

- **Documentation index (discover all pages):** [https://docs.x.com/llms.txt](https://docs.x.com/llms.txt)
- **XDK docs:** [TypeScript XDK](https://docs.x.com/xdks/typescript/install) — Installation, [Authentication](https://docs.x.com/xdks/typescript/authentication), [Pagination](https://docs.x.com/xdks/typescript/pagination), [Streaming](https://docs.x.com/xdks/typescript/streaming), [API Reference](https://docs.x.com/xdks/typescript/reference/Client)
- **Code samples:** [xdevplatform/samples (javascript)](https://github.com/xdevplatform/samples/tree/main/javascript)

## References

- [X API v2 docs](https://developer.x.com/en/docs/twitter-api)
- [Official X TypeScript XDK / samples](https://github.com/xdevplatform/samples/tree/main/javascript): `posts` (search_recent, get_posts_by_ids), `lists` (get_list_by_id, get_list_posts, get_list_members), `users` (get_users_by_usernames, timeline get_posts / get_posts_paginated).
- Plugin: **VinceXResearchService**, **VinceXSentimentService**; see **SIGNAL_SOURCES.md** in plugin-vince for sentiment and list feed details.
