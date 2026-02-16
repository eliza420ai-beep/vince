# Solus: Options and Strike Agent (VINCE)

Solus is the **CFO (Chief Financial Officer)** agent: Hypersurface options expert—mechanics, strike ritual, position assessment, and optimal strike brainstorming. He has spot prices (BTC, ETH, SOL, HYPE) and mechanics; direction and live options/IV come from pasted context (e.g. VINCE output) or the user. No execution; Otaku executes. Right curve: options income and execution framing.

**Use this doc** to brief OpenClaw (or any agent) on what Solus can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why Solus Matters

- **Strike and weekly call:** Solus makes money only with a good strike and good weekly bull/bear sentiment. Plugin-solus gives Hypersurface mechanics and spot prices; direction comes from VINCE or user.
- **Four actions:** Strike ritual, explain mechanics, position assess, optimal strike. All validate character name is Solus.
- **Three curves:** Solus is the right curve (options and execution); left curve (perps) is VINCE; mid is HIP-3/stack. He routes live data or briefing to VINCE and expects pasted context for his call.

---

## What Solus Can Do Today

- **SOLUS_STRIKE_RITUAL:** Step-by-step Friday process: get VINCE options view, pick asset, CC vs CSP, strike width, invalidation.
- **SOLUS_HYPERSURFACE_EXPLAIN:** Explain Hypersurface mechanics (secured puts, the wheel) in plain language; point to VINCE for live data.
- **SOLUS_POSITION_ASSESS:** Interpret position, invalidation, hold/roll/adjust; ask for details if missing.
- **SOLUS_OPTIMAL_STRIKE:** Strike call (asset, OTM %, size/skip, invalidation) when context has data; else ask for VINCE options output. Uses spot prices from context; frames weekly (expiry Friday).
- **Providers:** SOLUS_HYPERSURFACE_CONTEXT (mechanics, no API); SOLUS_HYPERSURFACE_SPOT_PRICES (BTC, ETH, SOL, HYPE from CoinGecko, 60s cache via plugin-coingecko).
- **Multi-agent:** ASK_AGENT (vincePluginNoX) for in-conversation options data; handoffs execution to Otaku, live perps/options data to VINCE.

---

## What Solus Cannot Do Yet / Gaps

- **No funding, IV, or sentiment APIs:** Solus has spot (CoinGecko) and mechanics only. "Where price lands by Friday" comes from pasted context (VINCE, Grok daily) or user. PRD: keep boundary; optional "Solus plus VINCE options view" one-shot prompt to reduce paste.
- **No Deribit/Hypersurface API calls:** Plugin does not call Deribit or Hypersurface; options/IV data is from state and LLM. Live options/IV stay in VINCE. PRD: document clearly; optional read-only options endpoint for Solus context.
- **Spot prices dependency:** Real-time BTC, ETH, SOL, HYPE from plugin-coingecko; if service missing, spot provider returns nothing. PRD: graceful degradation when spot missing.
- **Friday reminder:** Optional Thursday 20:00 UTC push to solus/ops channels is not implemented; task is optional in plugin readme. PRD: implement Friday-reminder task if product wants it.
- **No execution:** Solus does not place orders; Otaku does. PRD: keep handoff explicit in prompts and docs.

---

## Key Files for Code Review

| Area | Path |
|------|------|
| Agent definition | [src/agents/solus.ts](src/agents/solus.ts) |
| Plugin entry | [src/plugins/plugin-solus/src/index.ts](src/plugins/plugin-solus/src/index.ts) |
| Actions | [src/plugins/plugin-solus/src/actions/](src/plugins/plugin-solus/src/actions/) |
| Providers | [src/plugins/plugin-solus/src/providers/](src/plugins/plugin-solus/src/providers/) |
| Utils (isSolus) | [src/plugins/plugin-solus/src/utils/solus.ts](src/plugins/plugin-solus/src/utils/solus.ts) |
| Three curves | [knowledge/teammate/THREE-CURVES.md](knowledge/teammate/THREE-CURVES.md) |

---

## For OpenClaw / PRD

Use this doc to draft a next-iteration PRD for Solus: e.g. optional "Solus plus VINCE options view" combined context, Friday-reminder task, or read-only options data for Solus state.

---

## References

- [docs/SOLUS_NORTH_STAR.md](docs/SOLUS_NORTH_STAR.md) — Solus north star and roadmap.
- [src/plugins/plugin-solus/README.md](src/plugins/plugin-solus/README.md) — Boundaries and dependencies.
- [CLAUDE.md](CLAUDE.md) — Three curves; Solus as right curve.
