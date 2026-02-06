# Lessons and Improvements (Startup & E2E)

Summary of what we learned from VINCE startup and E2E test runs, what was fixed, and what remains.

**Quick reference:** Pulse URL is `/api/agents/:agentId/plugins/vince/pulse` (use VINCE’s agent ID). Dashboard prints are gated with `isVinceAgent(runtime)` in all plugin-vince services. Nansen implements `isConfigured()`.

---

## What we learned

### 1. **Pulse API 404**
- **Cause:** Plugin routes are mounted at `/api/agents/:agentId/plugins` + `route.path`. The server stripped the path with a regex that didn’t handle an optional `/api` prefix, so the handler never saw the right path.
- **Takeaway:** When adding plugin routes, confirm server path-stripping in `@elizaos/server` (or apply the patch) so `req.path` matches the route.

### 2. **Duplicate dashboard blocks at startup**
- **Observation:** The same terminal dashboards (CoinGlass, CoinGecko, Santiment, TopTraders, MandoMinutes, DexScreener, NFT Floor, etc.) appeared twice in one run.
- **Cause:** Plugin-vince is loaded by more than one agent (e.g. Eliza + VINCE). Each agent gets its own runtime and service instances, so each service `start()` runs per agent. Without a gate, every agent’s instance prints.
- **Takeaway:** Gate “only for VINCE” terminal output with `isVinceAgent(runtime)`. Optionally skip heavy startup work for Eliza with `isElizaAgent(runtime)` (see NewsSentiment, CoinGecko).

### 3. **Nansen service crash**
- **Error:** `nansenService.isConfigured is not a function`.
- **Cause:** `VinceNansenService` did not implement `isConfigured()`, while callers (e.g. bull/bear analyzer, E2E) expected it (like Sanbase).
- **Takeaway:** Any service that may be checked with `isConfigured()` should implement it (e.g. `return !!this.apiKey`).

### 4. **Sanbase “no data returned”**
- **Observation:** `[VinceSanbaseService] API configured but no data returned - check API key or rate limits`.
- **Cause:** Free tier limits or empty response despite valid key.
- **Takeaway:** Expected on free tier; message is intentional. No code change required.

### 5. **Docker and patch script**
- Compose needs an explicit `build` context for `elizaos` so `docker compose build elizaos` works.
- `file:./packages/api-client` requires that package to be copied before `bun install` in the Dockerfile.
- Plugin route fix lives in `node_modules/@elizaos/server`; we run `scripts/patch-elizaos-server-plugin-routes.cjs` after install so the image gets the fix.

### 6. **E2E and real data**
- E2E tests that hit real APIs (CoinGlass, Deribit, CoinGecko, DexScreener) and generate real BTC/ETH analyses are valuable but slower.
- Keep real-data E2E for periodic/CI; use unit tests and mocks for fast feedback.

---

## What we fixed

| Item | Change |
|------|--------|
| **Nansen `isConfigured`** | Added `isConfigured(): boolean` to `VinceNansenService` (returns `!!this.apiKey`). |
| **Dashboard dedupe (all services)** | Every service that prints a startup dashboard now gates with `isVinceAgent(runtime)` or `isVinceAgent(this.runtime)` at the call site. |
| **Pulse URL and server path** | Documented pulse as `/api/agents/:agentId/plugins/vince/pulse`; server path-stripping fixed via patch script. |
| **Quickstart** | Testing section: backend (agents + pulse), frontend, Docker, automated tests; pulse curl uses VINCE agent ID and robust jq. |

### Services with dashboard gate (complete)

All of these only print their startup dashboard when `isVinceAgent(runtime)`:

- **CoinGlass** – `initialize()` → `printCoinGlassDashboard()`
- **CoinGecko** – `start()` → `printDashboard()`
- **Deribit** – `start()` → `getOptionsContext()` then `printDashboardWithData()`
- **Sanbase** – `start()` → `printDashboard()`
- **TopTraders** – `start()` → `printDashboard()`
- **NewsSentiment** – `shouldPrint = isVinceAgent(runtime)` before any dashboard
- **DexScreener** – `initialize()` → `printDexScreenerDashboard()`
- **NFT Floor** – `start()` → deferred `printDashboardWithData()`
- **Meteora** – `start()` → `printDashboard()`
- **MarketRegime** – `start()` → `printDashboard()`
- **Binance** – `initialize()` → `printBinanceDashboard()`
- **BinanceLiquidation** – WebSocket `onopen` → `printDashboard()`
- **HIP3** – `start()` → `runStartupVerification()` → `printHIP3Dashboard()`

Plugin init banner (VINCE logo + MARKET PULSE + focus areas) is already gated with `isVinceAgent(runtime)` in `plugin-vince` `init`.

---

## What to improve next

1. **TypeScript**  
   Resolve remaining plugin-vince type errors so `bun run type-check` is clean (null checks, interfaces, parameter types). Frontend: `slider.tsx` and `src/frontend/scripts/**` are excluded or shimmed so root type-check passes.

2. **Pulse in Docker**  
   Rebuild the image after the server patch so the pulse route works in Docker. **Documented in [DEPLOY.md](../DEPLOY.md)** § “Docker: Pulse route and plugin routes”: run `docker compose build elizaos` after pulling or changing the patch.

3. **Optional: single dashboard bundle**  
   One aggregated “VINCE startup” line is now printed ~3.5s after the main banner (see `getStartupSummaryLine` in `utils/dashboard.ts`). A full single-dashboard refactor (one box replacing all per-service boxes) remains optional; current per-service gates are sufficient to avoid duplicates.

---

## References

- Plugin route patch: `scripts/patch-elizaos-server-plugin-routes.cjs`
- VINCE agent ID for pulse: `jq -r '.data.agents[] | select(.name=="VINCE") | .id'`
- Dashboard helpers: `src/plugins/plugin-vince/src/utils/dashboard.ts` (`isVinceAgent`, `isElizaAgent`)
- Quickstart and testing: `tasks/FRONTEND-ALPHA-QUICKSTART.md`
