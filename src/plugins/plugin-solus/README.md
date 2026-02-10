# Plugin-Solus

Hypersurface expertise for Solus: mechanics, strike ritual, position assessment, and optimal strike brainstorming. Solus uses this plugin so he is consistently expert at on-chain options without relying only on character prompt and RAG.

## Purpose

- **Providers:** (1) Hypersurface cheat sheet (mechanics) and (2) real-time spot prices (BTC, ETH, SOL, HYPE) via **plugin-coingecko**, so Solus always has current USD levels for strike and position advice.
- **Actions:** Four Solus-only actions that fire on key intents and return structured, benefit-led responses.
- **Solus edge:** Solus makes money only with a good strike and good weekly bull/bear sentiment; the context provider and action prompts reinforce this (weekly framing, spot prices from context).
- **Three curves:** Solus is the **right curve** (options income + execution); for direction/user data he directs to Vince (left curve) and expects pasted context.

## Dependencies

- **plugin-coingecko** must be loaded before plugin-solus (e.g. on Solus agent). It provides `COINGECKO_SERVICE`; the spot-prices provider calls `getSimplePrices(["bitcoin","ethereum","solana","hyperliquid"])` and caches results for 60s.

## Components

### Providers

| Name | Purpose |
|------|--------|
| `SOLUS_HYPERSURFACE_CONTEXT` | Injects Hypersurface mechanics into state (position -5). No API calls; fixed text. |
| `SOLUS_HYPERSURFACE_SPOT_PRICES` | Real-time USD spot for BTC, ETH, SOL, HYPE from CoinGecko (via plugin-coingecko). Position -4. Cached 60s. |

### Actions

| Action | Triggers (examples) | Purpose |
|--------|----------------------|--------|
| `SOLUS_STRIKE_RITUAL` | "strike ritual", "Friday ritual", "walk me through strike" | Step-by-step Friday process: get VINCE options view, pick asset, CC vs CSP, strike width, invalidation. |
| `SOLUS_HYPERSURFACE_EXPLAIN` | "how does Hypersurface work", "explain secured puts", "what's the wheel" | Explain mechanics in plain language; point to VINCE for live data. |
| `SOLUS_POSITION_ASSESS` | "assess my position", "we bought $70K secured puts", "review my Hypersurface position" | Interpret position, state invalidation and hold/roll/adjust; ask for details if missing. |
| `SOLUS_OPTIMAL_STRIKE` | "optimal strike", "what strike for BTC", "best strike this week", "size or skip", "what's your call", "bull or bear this week", "weekly view", "weekly view for btc/eth/sol/hype" | Strike call (asset, OTM %, size/skip, invalidation) when context has data; else ask for VINCE options output. Prompts use spot prices from context and frame the call weekly. |

All actions validate that the runtime character name is `Solus` so the plugin is safe if ever attached to another agent.

## Boundaries

- **Data boundary:** Solus does **not** have funding, IV, or sentiment APIs; he has **spot (CoinGecko) and mechanics** only. He **cannot** get a pulse on where BTC, ETH, SOL, HYPE will land by each Friday on his own. **Where price lands by Friday** = from **pasted context** (VINCE options view, Grok daily) or the **user's view**. Strike calls are structure/strike + invalidation; for direction, user pastes VINCE output.
- **Options/IV data:** Plugin does not call Deribit or Hypersurface. Options data comes from state (provider + RAG) and the LLM; live options/IV stays in VINCE (user says "options" to VINCE or pastes into Solus).
- **Spot prices:** Real-time BTC, ETH, SOL, HYPE come from **plugin-coingecko** (CoinGecko `/simple/price`). If the service is missing, the spot-prices provider returns nothing and Solus still has mechanics context. Action prompts instruct the model to use spot prices from context (e.g. "[Hypersurface spot USD]") when present and to frame calls in terms of **weekly** outcome (expiry Friday), not intraday.
- **vincePluginNoX:** Solus still loads vincePluginNoX for ASK_AGENT and in-conversation options data. Plugin-solus adds the Hypersurface-specific layer on top. See knowledge/teammate/THREE-CURVES.md for left/mid/right framing.

## How to extend

- Add a new action in `src/actions/` (validate with message content + `isSolus(runtime)` from `src/utils/solus.ts`), register in `src/index.ts`.
- Extend the provider text in `hypersurfaceContext.provider.ts` if mechanics or workflow change.
- Optional: add a Friday-reminder task in `src/tasks/` and register in `init` (e.g. Thursday 20:00 UTC push to solus/ops channels).

## Tests

Run from repo root:

```bash
bun test src/plugins/plugin-solus/
```

Tests cover validate (trigger phrases and Solus-only) and handler callback for strike ritual.
