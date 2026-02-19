# OpenClaw: Real Data for Alpha, On-Chain, and News

Right now the **Market** section uses real Hyperliquid price + 24h change and the LLM writes only from that data. The **Alpha**, **On-chain**, and **News** sections return an honest disclaimer because we don't feed any real data for them—doing so would cause the LLM to fabricate KOL/sentiment/whale/headline content.

This doc describes what is needed to **get real data** for those three sections so the disclaimer can be removed and real context can be passed into the LLM.

---

## 1. Alpha (KOL / CT sentiment)

**Goal:** Real input for “what CT and KOLs are saying” and narrative strength so the LLM can summarize it, not invent it.

**What’s needed:**

| Need                      | Description                                           | Possible sources                    |
| ------------------------- | ----------------------------------------------------- | ----------------------------------- |
| Search results            | Recent tweets/posts about the token(s)                | X API (already in repo)             |
| Optional: sentiment score | Aggregate vibe (e.g. 1–10 or bullish/neutral/bearish) | From search + LLM, or dedicated API |
| Optional: KOL list        | Handles to treat as “KOLs” for weighting              | Config or static list               |

**What already exists in VINCE:**

- **X API:** `X_BEARER_TOKEN`; plugin-vince **VINCE_X_RESEARCH** (search, profile, thread, single tweet). See `X-RESEARCH.md`, `src/plugins/plugin-vince/src/actions/xResearch.action.ts`, `src/plugins/plugin-vince/src/services/xResearch.service.ts`.
- **Vibe / sentiment:** `VINCE_X_RESEARCH` can return an ALOHA-style narrative; xSentiment service does staggered vibe check per asset (uses `X_BEARER_TOKEN_SENTIMENT` or primary token). See `src/plugins/plugin-vince/src/services/xSentiment.service.ts`.

**Integration options:**

- **A. Call X research from OpenClaw:** When `agent === "alpha"` and runtime has `VINCE_X_RESEARCH_SERVICE`, call the same search/briefing path that VINCE uses (e.g. search X for `"$SYMBOL"` or `"#SYMBOL"`), get back **text + optional sample tweets**. Pass that **only** as `dataContext` for the alpha section and keep the prompt: “Summarize the following CT/X content; do not add claims that aren’t in the data.”
- **B. Shared helper:** Extract a small helper (e.g. `searchXForToken(symbol): Promise<string>`) used by both plugin-vince and plugin-openclaw so alpha always uses the same X data pipeline.

**Single-token rule:** Any future "call X research from OpenClaw" (e.g. for orchestrator alpha) must use the **same** X path as plugin-x-research (shared helper or runtime service), not a separate X client or token. One `X_BEARER_TOKEN` remains the single source of truth; plugin-openclaw must not introduce a second bearer token.

**Env:** `X_BEARER_TOKEN` (and optionally `X_BEARER_TOKEN_SENTIMENT` for rate-limit separation). Solus uses `vincePluginNoX` (no X) so Solus’s OpenClaw would only have alpha data when you explicitly wire an X-capable runtime or server-side call.

---

## 2. On-chain (whale activity, DEX flows)

**Goal:** Real input for whale moves, large transfers, and DEX/flow data so the LLM describes what the data shows, not generic “smart money” claims.

**What’s needed:**

| Need                    | Description                                   | Possible sources                                                             |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Whale / large transfers | Large moves, exchange in/out, notable wallets | TopTraders (VINCE ref), Sanbase, Whale Alert–style API, or chain indexers    |
| DEX / flow data         | Per-token or per-pool volume, net flows       | DefiLlama, Birdeye, DEX aggregator APIs, or chain RPC + indexer              |
| Optional: OI / funding  | Already on Hyperliquid                        | plugin-vince HL service; could be merged into “market” or “on-chain” context |

**What already exists in VINCE:**

- **VINCE character** mentions: CoinGlass (funding, OI, sentiment), TopTraders (whale wallet signals), Sanbase (on-chain, exchange flows, whale activity), Hyperliquid API (market data, whale wallets). See `src/agents/vince.ts` (Sanbase 1000/mo, Hyperliquid).
- **Hyperliquid:** We already use HL for price/change in OpenClaw; HL may expose OI, funding, or whale-related endpoints that could be added to the same pipeline.

**Integration options:**

- **A. Add an on-chain provider in plugin-openclaw:** e.g. `fetchOnChainContext(runtime, tokens)` that:
  - Calls one or more of: Sanbase (if key present), Birdeye/Helius (if keys present), or HL OI/funding where applicable.
  - Returns a single string (e.g. “Whale: …; DEX: …; Flows: …”) and **no** prose—only structured facts.
- **B. When `agent === "onchain"`:** If `fetchOnChainContext` returns non-empty data, pass it as `dataContext` and use a prompt that says “Summarize only the following on-chain data; do not add whale or flow claims that aren’t in the data.” If it returns empty (no keys or no data), keep the current disclaimer.

**Env:** Depends on chosen source(s), e.g. `SANBASE_API_KEY`, `BIRDEYE_API_KEY`, `HELIUS_API_KEY`, or similar (see `.env.example` for existing keys).

---

## 3. News (headlines, fear/greed, developments)

**Goal:** Real headlines and optional fear/greed so the LLM summarizes news and sentiment, not invented “macro concerns” or “technical unwinding.”

**What’s needed:**

| Need                             | Description                              | Possible sources                                         |
| -------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Headlines                        | Recent news for the token(s) or “crypto” | CryptoPanic, NewsAPI, Tavily, or RSS                     |
| Optional: fear/greed             | Single index (e.g. 0–100)                | Alternative.me, or reuse from Grok daily / internal-docs |
| Optional: sentiment per headline | Positive/negative/neutral                | From API or small LLM pass on headline only              |

**What already exists in VINCE:**

- **Tavily:** Solus (and possibly others) use `TAVILY_API_KEY` and `@elizaos/plugin-web-search` for web search; could be used to fetch “crypto news [token]” or “BTC news today” and pass URLs + snippets as context.
- **openclaw-agents:** `openclaw-agents/news.md` mentions aggregating from CryptoPanic, CoinDesk, CoinTelegraph.
- **Internal docs:** Grok daily (e.g. `knowledge/internal-docs/grok-auto-*.md`) sometimes includes fear/greed; could be read as a fallback or supplement.
- **insights.service.ts:** `getNewsDigest()` in plugin-openclaw is currently **mock** (hardcoded list). Replace with a real fetch.

**Integration options:**

- **A. CryptoPanic (or similar) in plugin-openclaw:** Add `fetchNewsContext(runtime, tokens)` that calls CryptoPanic (or NewsAPI/Tavily) with token/symbol, returns a string of headlines + optional sentiment. When `agent === "news"`, if non-empty, pass as `dataContext` and prompt: “Summarize the following headlines; do not add news that isn’t listed.”
- **B. Tavily:** Reuse existing web-search plugin or a dedicated “news search” call for “crypto news [SYMBOL] last 24h”, then format results as `dataContext` for the news section.
- **C. Fear/greed:** Optional: fetch from a public API (e.g. Alternative.me) or from internal-docs and prepend one line to the news context (e.g. “Fear & Greed: 35/100”).

**Env:** e.g. `CRYPTOPANIC_API_KEY`, or reuse `TAVILY_API_KEY`; optional `ALTERNATIVE_ME_FEAR_GREED` or read from file.

---

## 4. Code changes to remove the disclaimer

Once real data exists for a section:

1. **Extend the data pipeline in `openclaw.service.ts`:**
   - Add `fetchAlphaContext(runtime, tokens)` → returns `string` (X search/briefing text).
   - Add `fetchOnChainContext(runtime, tokens)` → returns `string` (whale/DEX/flows).
   - Add `fetchNewsContext(runtime, tokens)` → returns `string` (headlines + optional fear/greed).

2. **In `executeAgentWithStreaming`:**
   - For `agent === "alpha"`: call `fetchAlphaContext`. If result is non-empty, pass it to `generateResearchProse` with a prompt that says “Summarize the following CT/X sentiment and narrative; do not add claims not in the data.” If empty, keep `noDataDisclaimer(agent, tokens)`.
   - For `agent === "onchain"`: same pattern with `fetchOnChainContext` and “Summarize the following on-chain data; do not add whale or flow claims not in the data.”
   - For `agent === "news"`: same pattern with `fetchNewsContext` and “Summarize the following news; do not add headlines or events not in the data.”

3. **Restore section-specific prompts in `generateResearchProse` (or a variant):** You can pass `agent` again and use a small `sectionMap` that describes **only** what’s in the data (e.g. “CT/X search results”, “on-chain whale and DEX data”, “news headlines”). Keep strict “do not invent” instructions so the model never adds KOL/whale/news content that isn’t in the provided context.

4. **Remove from `SECTIONS_WITHOUT_DATA`** only the agents for which you now have a real fetch (e.g. when `fetchAlphaContext` is implemented and used, remove `"alpha"` from the constant so the disclaimer is no longer returned for that section).

---

## 5. Summary table

| Section      | Real data needed                               | Existing in repo                    | Next step                                                                                           |
| ------------ | ---------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Alpha**    | X search/briefing for token(s)                 | VINCE_X_RESEARCH, X API             | Call X research from OpenClaw or shared helper; pass result as alpha context.                       |
| **On-chain** | Whale/DEX/flows (and optionally HL OI/funding) | VINCE refs: Sanbase, TopTraders, HL | Add `fetchOnChainContext` (Sanbase/Birdeye/Helius/HL); pass as onchain context.                     |
| **News**     | Headlines (+ optional fear/greed)              | Tavily, openclaw-agents refs        | Add `fetchNewsContext` (CryptoPanic or Tavily); replace mock `getNewsDigest`; pass as news context. |

After each pipeline returns real context, wire it into `executeAgentWithStreaming` and remove that section from the “no data” path so the LLM gets **only** grounded input and the disclaimer is no longer shown for that section.
