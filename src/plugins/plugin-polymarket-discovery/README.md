# Polymarket Discovery Plugin

Read-only plugin for discovering and analyzing prediction markets on Polymarket.

## Features

### Phase 1: Market Discovery (Read-Only)

- **Browse Active Markets**: View trending and popular prediction markets
- **Search Markets**: Find markets by keyword or category
- **Market Details**: Get comprehensive information about specific markets
- **Real-Time Pricing**: Check current YES/NO odds and spreads
- **Category Listing**: Browse available market categories
- **Price History**: Historical price charts for markets

### Phase 2: Portfolio Tracking

- **User Positions**: Current positions across markets
- **Balance**: Portfolio balance and P&L
- **Trade History**: Recent trades

### Phase 3A: Orderbook

- **Single Orderbook**: Orderbook for one token with depth
- **Batch Orderbooks**: Multiple token orderbooks

### Phase 3B: Market Analytics

- **Open Interest**: Market-wide exposure (TVL)
- **Live Volume**: 24h trading volume
- **Spreads**: Bid-ask spread analysis

### Phase 4: Events API

- **Events**: Browse prediction events (groupings of markets)
- **Event Detail**: Event with associated markets

### Phase 5A: Extended Portfolio

- **Closed Positions**: Historical resolved positions
- **User Activity**: On-chain activity log
- **Top Holders**: Major participants in a market

### VINCE priority markets

**Intent:** These data are a palantir into what the market thinks. They feed (1) the paper bot’s short-term predictions for perps on Hyperliquid, (2) Hypersurface strike selection—with weekly predictions the most important input—and (3) a macro vibe check.

The plugin prioritizes a fixed set of topics for market insights and hedging. The **provider** injects these preferred topics into context (crypto: Bitcoin, MicroStrategy, Ethereum, Solana, pre-market, ETF, monthly, weekly, daily; finance: stocks, indices, commodities, IPO, fed rates, treasuries; other: geopolitics, economy). The **knowledge doc** [knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md](../../knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md) lists them for RAG. Use **GET_VINCE_POLYMARKET_MARKETS** to return only markets from these topics (optional filter by group: crypto, finance, other, or all). Keep the slug list in `src/constants.ts` (`VINCE_POLYMARKET_PREFERRED_TAG_SLUGS` / `VINCE_POLYMARKET_PREFERRED_LABELS`) in sync with that knowledge file. Market links on the leaderboard Polymarket tab use the event slug when returned by the API, otherwise the market conditionId; no manual slug curation. The leaderboard Polymarket tab is read-only and does not connect any wallet or auth; for positions use Oracle in chat with a wallet address.

## Actions

All 20 actions are documented in the plugin [index.ts](src/index.ts) docblock. Summary:

| Action | Description |
|--------|-------------|
| GET_ACTIVE_POLYMARKETS | Trending/active markets with odds (limit optional, default 10, max 50) |
| SEARCH_POLYMARKETS | Search by query and/or category |
| GET_POLYMARKET_DETAIL | Full market info by conditionId |
| GET_POLYMARKET_PRICE | Real-time YES/NO prices by conditionId |
| GET_POLYMARKET_PRICE_HISTORY | Historical price data for a market |
| GET_POLYMARKET_TOKEN_INFO | One-shot: market + pricing + 24h summary + optional user position (conditionId/tokenId, optional walletAddress) |
| GET_POLYMARKET_CATEGORIES | List categories |
| GET_VINCE_POLYMARKET_MARKETS | Markets only from VINCE-priority topics (crypto, finance, geopolitics, economy); optional group filter, limit default 20 |
| GET_POLYMARKET_POSITIONS | User positions (walletAddress required) |
| GET_POLYMARKET_BALANCE | Portfolio balance and P&L (walletAddress required) |
| GET_POLYMARKET_TRADE_HISTORY | Trade history (walletAddress, limit optional) |
| GET_POLYMARKET_ORDERBOOK | Single token orderbook (token_id; side optional) |
| GET_POLYMARKET_ORDERBOOKS | Batch orderbooks (token_ids) |
| GET_POLYMARKET_OPEN_INTEREST | Market-wide open interest |
| GET_POLYMARKET_LIVE_VOLUME | 24h volume |
| GET_POLYMARKET_SPREADS | Bid-ask spreads (limit optional) |
| GET_POLYMARKET_EVENTS | Browse events (filters optional) |
| GET_POLYMARKET_EVENT_DETAIL | Event by id or slug |
| GET_POLYMARKET_CLOSED_POSITIONS | Closed positions (walletAddress required) |
| GET_POLYMARKET_USER_ACTIVITY | User activity log (walletAddress required) |
| GET_POLYMARKET_TOP_HOLDERS | Top holders for a market (conditionId required) |

**Examples:**
- "What are the trending polymarket predictions?" → GET_ACTIVE_POLYMARKETS
- "Search polymarket for bitcoin predictions" → SEARCH_POLYMARKETS
- "What categories are available on polymarket?" → GET_POLYMARKET_CATEGORIES
- "What Polymarket markets matter for us?" / "Show our focus markets" → GET_VINCE_POLYMARKET_MARKETS
- "What are my polymarket positions for 0x…?" → GET_POLYMARKET_POSITIONS

## Architecture

### Provider
**POLYMARKET_DISCOVERY** (`providers/polymarketDiscovery.provider.ts`) — When Polymarket is in context, injects read-only capability, **VINCE preferred topics** (preferredTagSlugs, preferredTopicsSummary), and optional recent-activity context (e.g. "last viewed: search 'bitcoin', market detail 0x...") so the agent can choose the right action.

### Service Layer
**PolymarketService** (`services/polymarket.service.ts`)
- Handles API communication with Gamma API (market data) and CLOB API (pricing)
- **Gamma public-search**: server-side keyword search via `/public-search`; **tags**: `/tags` and events-by-tag for category browse
- **Activity log**: in-memory per-room log (`recordActivity` / `getCachedActivityContext`) for provider context
- In-memory caching with configurable TTL
- Retry logic with exponential backoff
- AbortController for request timeouts
- No authentication required (read-only)

### Data Sources
- **Gamma API**: Market metadata, categories, events, search
- **CLOB API**: Real-time orderbook, pricing, spreads
- **Data API**: User positions, balance, trades, activity, holders

### Data sources and real-time accuracy
- **CLOB** is the source of truth for live trading prices. **GET_POLYMARKET_PRICE** and **GET_POLYMARKET_ORDERBOOK** (and the service’s `getMarketPrices()`) use the CLOB orderbook (best ask) and are appropriate when you need current odds.
- **Gamma** provides indexed market/event data. List and search surfaces (e.g. **SEARCH_POLYMARKETS** results, **GET /polymarket/priority-markets**) use Gamma-derived prices (`outcomePrices` / `tokens[].price`) or placeholders when CLOB is not fetched—so they are not guaranteed CLOB-level real-time. For current odds on a specific market, use **GET_POLYMARKET_PRICE** with the market’s `condition_id`.
- **getMarketDetail(conditionId)** resolves by fetching Gamma’s first 500 active markets and finding the match client-side. Markets outside that set (e.g. low volume or newer) will not be found; **getMarketPrices(conditionId)** then cannot run for them. This is a known limitation.

### Caching Strategy
- Market data: 60-second TTL (configurable)
- Price data: 15-second TTL (configurable)
- In-memory Map-based cache for fast lookups

### Error Handling
- Automatic retry with exponential backoff (1s, 2s, 4s)
- Request timeout protection (10s default)
- Graceful fallbacks for missing price data
- Detailed error logging with action name prefix

## Configuration

Optional environment variables:

```env
# API Endpoints (defaults provided)
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com
POLYMARKET_DATA_API_URL=https://data-api.polymarket.com

# Cache TTLs (in milliseconds)
POLYMARKET_MARKET_CACHE_TTL=60000  # 1 minute
POLYMARKET_PRICE_CACHE_TTL=15000   # 15 seconds

# Request Settings
POLYMARKET_MAX_RETRIES=3
POLYMARKET_REQUEST_TIMEOUT=10000   # 10 seconds
```

## Installation

This plugin is included in the Otaku monorepo. To use it:

1. Import in your character configuration:
```typescript
import { polymarketDiscoveryPlugin } from "./plugins/plugin-polymarket-discovery";

// Add to plugins array
plugins: [polymarketDiscoveryPlugin]
```

2. No API keys required - all endpoints are public read-only

3. Build and run:
```bash
bun run build
bun run start
```

## Implementation Details

### Constants
API URLs and limits are centralized in `src/constants.ts`: `DEFAULT_GAMMA_API_URL`, `GAMMA_PUBLIC_SEARCH_PATH`, `GAMMA_TAGS_PATH`, `GAMMA_EVENTS_PATH`, `GAMMA_MARKETS_PATH`, `DEFAULT_CLOB_API_URL`, `DEFAULT_PAGE_LIMIT`, `MAX_PAGE_LIMIT`, `ACTIVITY_HISTORY_MAX_ITEMS`. **VINCE priority:** `VINCE_POLYMARKET_PREFERRED_TAG_SLUGS`, `VINCE_POLYMARKET_PREFERRED_LABELS` (and `VincePolymarketGroup`); keep in sync with `knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md`.

### Parameter extraction (LLM + regex)
When `ACTION_STATE` does not supply action params, the plugin uses `extractPolymarketParams` (`utils/llmExtract.ts`): it first checks regex on the message (condition IDs, wallet addresses, "search for X" patterns), then optionally calls the LLM to extract JSON (query, category, conditionId, tokenId, walletAddress, limit). Used by SEARCH_POLYMARKETS, GET_POLYMARKET_DETAIL, GET_POLYMARKET_PRICE, GET_POLYMARKET_POSITIONS, GET_POLYMARKET_TOKEN_INFO for natural-language param resolution.

### Type Definitions
- Complete TypeScript interfaces for all API responses
- Proper type safety with ActionResult pattern
- Input parameter capture for all actions

### Logging
All actions log with `[ACTION_NAME]` prefix for easy debugging (e.g. `[GET_ACTIVE_POLYMARKETS]`, `[SEARCH_POLYMARKETS]`, `[GET_POLYMARKET_POSITIONS]`).

### Performance
- Parallel API calls where possible (market + prices)
- Efficient caching reduces API calls
- Timeout protection prevents hanging requests
- Minimal dependencies (only @elizaos/core)

## Future Enhancements

This plugin is read-only (no trading). Future work could add:
- Trading capabilities (buy/sell) via CLOB with wallet signing
- Real-time price alerts
- Market recommendations

## Development

Build the plugin:
```bash
cd src/plugins/plugin-polymarket-discovery
bun run build
```

Type check:
```bash
bun run typecheck
```

Run live API checks (optional; hits real Gamma/CLOB):
```bash
POLYMARKET_LIVE_TEST=1 bun run scripts/polymarket-verify-live.ts
```

## Code Structure

```
plugin-polymarket-discovery/
├── matcher.ts                # Context gating (polymarketKeywordPatterns)
├── src/
│   ├── actions/              # 20 action implementations
│   │   ├── getActiveMarkets.action.ts
│   │   ├── searchMarkets.action.ts
│   │   ├── getVincePolymarketMarkets.action.ts
│   │   ├── getMarketDetail.action.ts
│   │   ├── getMarketPrice.action.ts
│   │   ├── getMarketPriceHistory.action.ts
│   │   ├── getMarketCategories.action.ts
│   │   ├── getUserPositions.action.ts
│   │   ├── getUserBalance.action.ts
│   │   ├── getUserTradeHistory.action.ts
│   │   ├── getOrderbook.action.ts
│   │   ├── getOrderbooks.action.ts
│   │   ├── getOpenInterest.action.ts
│   │   ├── getLiveVolume.action.ts
│   │   ├── getSpreads.action.ts
│   │   ├── getEvents.action.ts
│   │   ├── getEventDetail.action.ts
│   │   ├── getClosedPositions.action.ts
│   │   ├── getUserActivity.action.ts
│   │   └── getTopHolders.action.ts
│   ├── services/
│   │   └── polymarket.service.ts
│   ├── utils/
│   │   └── actionHelpers.ts
│   ├── types.ts              # TypeScript type definitions
│   └── index.ts              # Plugin export
└── README.md
```

## Dependencies

- `@elizaos/core`: ElizaOS framework (peer dependency)
- No external API libraries required - uses native fetch

## License

MIT
