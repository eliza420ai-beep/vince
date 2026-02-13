# plugin-defillama

DeFiLlama integration for ElizaOS: protocol discovery, TVL lookups, yield opportunities, and historical trends. Used by **Otaku** for DeFi data (no API key required; public DefiLlama APIs).

## Actions

| Action | Description |
|--------|-------------|
| **GET_PROTOCOL_TVL** | Current TVL and change metrics by protocol name or symbol (e.g. Aave, Curve, Morpho). |
| **GET_PROTOCOL_SLUG** | Resolve protocol name/symbol to DefiLlama slug(s) and basic info; use before TVL history if slug is unknown. |
| **GET_PROTOCOL_TVL_HISTORY** | Historical TVL for a protocol (optional chain, days, compact mode). |
| **GET_CHAIN_TVL_HISTORY** | Historical TVL for a chain (optional filter e.g. staking). |
| **GET_YIELD_RATES** | APY/yield by protocol, token, and/or chain (optional minApy, stablecoinOnly, limit). |
| **GET_YIELD_HISTORY** | Historical APY for a specific pool (protocol + token, optional chain). |

## When to use (Otaku)

- **Compare protocol TVL** → GET_PROTOCOL_TVL (e.g. "Compare Aave and Morpho TVL").
- **Find protocol slug / candidates** → GET_PROTOCOL_SLUG (e.g. before GET_PROTOCOL_TVL_HISTORY when slug is unknown).
- **Protocol TVL over time** → GET_PROTOCOL_TVL_HISTORY (e.g. "Aave TVL trend", "Curve Ethereum TVL last 90 days").
- **Chain TVL over time** → GET_CHAIN_TVL_HISTORY (e.g. "Ethereum TVL history", "Base staking TVL").
- **Current yields** → GET_YIELD_RATES (e.g. "USDC yields on Base", "top 5 stablecoin yields", "yields above 8%").
- **Yield trend for a pool** → GET_YIELD_HISTORY (e.g. "Aave USDC yield history").

## Optional environment / settings

Cache TTL and limits can be tuned via runtime settings (e.g. character `settings` or env passed into runtime). Keys read by the service:

- `DEFILLAMA_PROTOCOLS_TTL_MS` — protocol list cache TTL (default 300000 ms).
- `DEFILLAMA_YIELDS_TTL_MS` — yields pools cache TTL (default 300000).
- `DEFILLAMA_PROTOCOL_HISTORY_TTL_MS` — protocol TVL history cache TTL (default 300000).
- `DEFILLAMA_CHAIN_TVL_TTL_MS` — chain TVL history cache TTL (default 300000).
- `DEFILLAMA_PROTOCOL_HISTORY_MAX_ENTRIES` — max protocol history cache entries (default 128).
- `DEFILLAMA_CHAIN_TVL_MAX_ENTRIES` — max chain history cache entries (default 128).

See [.env.example](../../../.env.example) for a commented DefiLlama section.

## Context gating

Actions validate via `shouldDefiLlamaPluginBeActive` (matcher) so they only run when the conversation is about TVL, yields, DeFi protocols, or related keywords. The service is TTL-cached; no API key required.
