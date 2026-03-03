# Solus: Options and Strike Agent (VINCE)

Solus is the **CFO (Chief Financial Officer)** agent: Hypersurface options expert—mechanics, strike ritual, position assessment, and optimal strike brainstorming—and **stock specialist** for offchain equities (not tradeable on Hyperliquid). He has spot prices (BTC, ETH, SOL, HYPE) and mechanics; direction and live options/IV come from pasted context (e.g. VINCE output) or the user. For offchain stocks (Quantum, AI Infra, Nuclear, AI Energy, Defense, Robotics, Battery, Space, Copper, Rare Earths, Semiconductors), Solus uses knowledge and **Finnhub** (preferred) or **Alpha Vantage** (fallback) when the corresponding API key is set. In Cursor/IDE you can also use the [Alpha Vantage MCP](https://mcp.alphavantage.co/) for ad-hoc stock research. No execution; Otaku executes. Right curve: options income and execution framing.

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
- **SOLUS_OPTIMAL_STRIKE:** Strike call (asset, OTM %, size/skip, invalidation) when context has data; else ask for VINCE options output. Uses spot prices from context; frames weekly (expiry Friday). When `SOLUS_AUTO_RECORD_PREDICTION` is not `false`, the action auto-records one prediction per strike call (parseable `Record: ASSET STRIKE PROB%` in the reply) so calibration stays populated without manual “record assignment prediction”.
- **SOLUS_ASSIGNMENT_CALIBRATION:** Record assignment predictions (“record assignment prediction: BTC 106000 24%”), resolve at expiry (“we got assigned” / “we didn’t get assigned”), and report Brier (“assignment calibration”). Store: `.elizadb/solus/solus-assignment-predictions.jsonl`.
- **Providers:** SOLUS_HYPERSURFACE_CONTEXT (mechanics, no API); SOLUS_HYPERSURFACE_SPOT_PRICES (BTC, ETH, SOL, HYPE from CoinGecko, 60s cache via plugin-coingecko); **SOLUS_MARKET_CONTEXT** (spot, 24h, regime, funding, L/S, Fear & Greed; when Vince’s Polymarket sentiment service is available, appends a line “Polymarket: BTC 72% | macro 55% | …” so strike calls can consider prediction-market odds); **SOLUS_OPTIONS_CONTEXT** (Deribit: spot, DVOL, ATM IV, best CC/CSP strikes; assignment probability from GBM or ML when ONNX is loaded; **tail risk** 7d P(spot down 15%) per asset; when sizing has 2+ positions, **portfolio assignment risk** via Gaussian copula — P(at least one assigned), P(all), P(none); optional cache via SOLUS_OPTIONS_REFRESH task); **SOLUS_CALIBRATION_CONTEXT** (Brier score last 30d + last 10 resolved outcomes; when present, reads `.elizadb/solus/solus-calibration-notes.txt` from the daily SOLUS_UPDATE_CALIBRATION_NOTES task and appends “Learning: …” so Solus sees bias by asset/IV; injected into optimal strike, strike ritual, and position assess — recursive learning); **SOLUS_STOCK_PULSE** (Finnhub preferred, Alpha Vantage fallback — quotes and recent news when the message mentions a sector or ticker; set `FINNHUB_API_KEY` or `ALPHA_VANTAGE_API_KEY`. [Alpha Vantage MCP](https://mcp.alphavantage.co/) for Cursor/IDE.).
- **Stock specialist:** Offchain watchlist (see `knowledge/stocks/solus-offchain-watchlist.md`) and Finnhub keep Solus up to date on sectors/tickers; research and context only, not tradeable on Hyperliquid.
- **Multi-agent:** ASK_AGENT (vincePluginNoX) for in-conversation options data; handoffs execution to Otaku, live perps/options data to VINCE.

---

## What Solus Cannot Do Yet / Gaps

- **No funding, IV, or sentiment APIs:** Solus has spot (CoinGecko) and mechanics only. "Where price lands by Friday" comes from pasted context (VINCE, Grok daily) or user. PRD: keep boundary; optional "Solus plus VINCE options view" one-shot prompt to reduce paste.
- **Offchain stocks:** No execution; Finnhub is for quotes and news only. Watchlist is fixed in plugin-solus constants; not user-editable in chat.
- **No Deribit/Hypersurface API calls:** Plugin does not call Deribit or Hypersurface; options/IV data is from state and LLM. Live options/IV stay in VINCE. PRD: document clearly; optional read-only options endpoint for Solus context.
- **Spot prices dependency:** Real-time BTC, ETH, SOL, HYPE from plugin-coingecko; if service missing, spot provider returns nothing. PRD: graceful degradation when spot missing.
- **Friday resolve reminder:** Implemented. When `SOLUS_RESOLVE_REMINDER_ENABLED` is not `false`, a weekly task runs Friday 10:00+ UTC and pushes to solus/ops channels a list of open assignment predictions and how to resolve (“we got assigned” / “we didn’t get assigned”). Reduces friction so Brier stays populated. PRD: optional Thursday 20:00 UTC “pre-expiry” reminder remains optional.
- **No execution:** Solus does not place orders; Otaku does. PRD: keep handoff explicit in prompts and docs.

---

## Scope boundaries (current)

Solus options/quant work stays within these boundaries so future changes do not accidentally expand scope:

- **Hypersurface / Deribit API:** No changes to Hypersurface or Deribit APIs. Solus only consumes the existing `getOptionsContext(currency)` contract. No new endpoints or request/response shapes.
- **Plugin-vince / Deribit service:** No changes to plugin-vince or the Deribit service. Solus does not implement its own Deribit/Hypersurface client; it consumes **VINCE_DERIBIT_SERVICE** and existing `getOptionsContext` only.
- **Tail / copula:** Tail risk and portfolio (copula) logic are TypeScript-only in plugin-solus; we do not add a full Python pipeline or subprocess calling `skills/quant`. The Python quant skill remains reference/design.
- **Particle filter (quant 5.py):** Live P(assign) during the week via a particle filter is deferred to a later iteration; not in current scope.

---

## Key Files for Code Review

| Area               | Path                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent definition   | [src/agents/solus.ts](src/agents/solus.ts)                                                                                                                                                                                    |
| Plugin entry       | [src/plugins/plugin-solus/src/index.ts](src/plugins/plugin-solus/src/index.ts)                                                                                                                                                |
| Actions            | [src/plugins/plugin-solus/src/actions/](src/plugins/plugin-solus/src/actions/)                                                                                                                                                |
| Providers          | [src/plugins/plugin-solus/src/providers/](src/plugins/plugin-solus/src/providers/) (incl. solusStockPulse)                                                                                                                    |
| Finnhub service    | [src/plugins/plugin-solus/src/services/finnhub.service.ts](src/plugins/plugin-solus/src/services/finnhub.service.ts)                                                                                                          |
| Alpha Vantage svc  | [src/plugins/plugin-solus/src/services/alphaVantage.service.ts](src/plugins/plugin-solus/src/services/alphaVantage.service.ts)                                                                                                |
| Offchain watchlist | [src/plugins/plugin-solus/src/constants/solusStockWatchlist.ts](src/plugins/plugin-solus/src/constants/solusStockWatchlist.ts) · [knowledge/stocks/solus-offchain-watchlist.md](knowledge/stocks/solus-offchain-watchlist.md) |
| Utils (isSolus, assignment prob) | [src/plugins/plugin-solus/src/utils/solus.ts](src/plugins/plugin-solus/src/utils/solus.ts) · [src/plugins/plugin-solus/src/utils/assignmentProbability.ts](src/plugins/plugin-solus/src/utils/assignmentProbability.ts) |
| Three curves       | [knowledge/teammate/THREE-CURVES.md](knowledge/teammate/THREE-CURVES.md)                                                                                                                                                      |

---

## For OpenClaw / PRD

Use this doc to draft a next-iteration PRD for Solus: e.g. optional "Solus plus VINCE options view" combined context, Friday-reminder task, or read-only options data for Solus state.

**Quant skill and Solus:** Assignment probability (P(spot > strike at expiry)) is the same object as the quant skill’s binary contract (1.py). **Implemented:** (1) When SOLUS_OPTIONS_CONTEXT has Deribit data (spot, ATM IV, best CC/CSP strikes), assignment prob and 95% CI are computed from GBM (closed-form N(d2), risk-neutral) and injected into context. Time to expiry uses next Friday 08:00 UTC. (2) **Brier calibration** (quant 2.py): Solus-only store at `.elizadb/solus/solus-assignment-predictions.jsonl`. **SOLUS_ASSIGNMENT_CALIBRATION** action: record a prediction (“record assignment prediction: BTC 106000 24%”), resolve at expiry (“we got assigned” / “we didn’t get assigned”), and report (“assignment calibration”) for mean Brier over resolved rows. (3) **Recursive learning:** **SOLUS_CALIBRATION_CONTEXT** injects Brier (last 30d) and last 10 resolved outcomes into every optimal-strike, strike-ritual, and position-assess prompt so the model sees its own track record and can temper confidence or note bias; no fine-tuning, improvement is in-context. (4) **Friday resolve reminder:** Weekly task (Friday 10:00+ UTC) lists open predictions and nudges to resolve; gate with `SOLUS_RESOLVE_REMINDER_ENABLED=false` to disable. (5) **Auto-record (Phase 2):** `SOLUS_AUTO_RECORD_PREDICTION` (default true) lets optimal-strike auto-append a prediction row from the LLM’s `Record: ASSET STRIKE PROB%` line. (6) **Calibration notes:** Daily task `SOLUS_UPDATE_CALIBRATION_NOTES` writes Brier-by-asset/IV to `solus-calibration-notes.txt`; SOLUS_CALIBRATION_CONTEXT injects it. Gate with `SOLUS_CALIBRATION_NOTES_ENABLED=false` to disable. **Tail risk and portfolio risk (implemented):** (1) **Tail risk:** SOLUS_OPTIONS_CONTEXT appends P(spot down 15% in 7d) per asset (closed-form GBM; importance-sampling variant in `tailRisk.ts` for very rare events). (2) **Portfolio assignment risk:** When sizing state has 2+ CC/CSP positions, options context appends joint P(at least one assigned), P(all), P(none) via Gaussian copula (`portfolioCopula.ts`). **Future:** particle filter (5.py) for live-updating P(assign). **Improvement proof:** [src/plugins/plugin-solus/IMPROVEMENT_PROOF.md](src/plugins/plugin-solus/IMPROVEMENT_PROOF.md); optional `scripts/validate_solus_calibration.py` to audit Brier from the store. See [skills/quant/README.md](../skills/quant/README.md) § “Improving Solus”.

**Solus ML / ONNX:** Same pattern as Vince: feature store (resolved rows in `solus-assignment-predictions.jsonl`) → Python training script → ONNX → inference service. When `assignment_calibrator.onnx` is present in `.elizadb/solus/models/` (or `SOLUS_ML_MODELS_DIR`), **SOLUS_OPTIONS_CONTEXT** uses ML-calibrated P(assign) for best CC/CSP strikes; otherwise GBM-only. Feature store and derived features: [src/plugins/plugin-solus/FEATURE-STORE.md](src/plugins/plugin-solus/FEATURE-STORE.md). Training: `python src/plugins/plugin-solus/scripts/train_solus_calibration.py` (min 50 resolved rows). **TRAIN_SOLUS_CALIBRATION_WHEN_READY:** recurring task (every 12h, max once per 24h) runs training when 50+ resolved predictions exist, then reloads the ML service; set `SOLUS_TRAIN_CALIBRATION_ENABLED=false` to disable. **Options refresh:** SOLUS_OPTIONS_REFRESH task (every 10 min) warms the options-context cache so the first message gets instant Deribit context; set `SOLUS_OPTIONS_REFRESH_ENABLED=false` to disable. General ONNX flow: [docs/ONNX.md](docs/ONNX.md).

---

## References

- [docs/SOLUS_NORTH_STAR.md](docs/SOLUS_NORTH_STAR.md) — Solus north star and roadmap.
- [src/plugins/plugin-solus/README.md](src/plugins/plugin-solus/README.md) — Boundaries and dependencies.
- [docs/standup/WEEKLY-OPTIONS-CONTEXT.md](docs/standup/WEEKLY-OPTIONS-CONTEXT.md) — Portfolio and open positions (local file `local/solus-current-positions.md` or standup file; local is gitignored).
- [CLAUDE.md](CLAUDE.md) — Three curves; Solus as right curve.
