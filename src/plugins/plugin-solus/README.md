# Plugin-Solus

Hypersurface expertise for Solus: mechanics, strike ritual, position assessment, and optimal strike brainstorming. Solus uses this plugin so he is consistently expert at on-chain options without relying only on character prompt and RAG.

## Purpose

- **Providers:** (1) Hypersurface cheat sheet (mechanics) and (2) real-time spot prices (BTC, ETH, SOL, HYPE) from **Hyperliquid when available**, falling back to **plugin-coingecko**, so Solus always has current USD levels for strike and position advice.
- **Actions:** Four Solus-only actions that fire on key intents and return structured, benefit-led responses.
- **Solus edge:** Solus makes money only with a good strike and good weekly bull/bear sentiment; the context provider and action prompts reinforce this (weekly framing, spot prices from context).
- **Three curves:** Solus is the **right curve** (options income + execution); for direction/user data he directs to Vince (left curve) and expects pasted context.

## Dependencies

- **Hyperliquid service (optional):** When a `HYPERLIQUID_SERVICE` is present on the runtime, the spot-prices provider calls `getMarkPriceAndChange("BTC" | "ETH" | "SOL" | "HYPE")` and uses those prices as the primary source.
- **plugin-coingecko** should be loaded when Hyperliquid is not available or for redundancy. It provides `COINGECKO_SERVICE`; the spot-prices provider calls `getSimplePrices(["bitcoin","ethereum","solana","hyperliquid"])` and caches results for 60s.

## Components

### Providers

| Name                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLUS_HYPERSURFACE_CONTEXT`     | Injects Hypersurface mechanics into state (position -5). No API calls; fixed text.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `SOLUS_HYPERSURFACE_SPOT_PRICES` | Real-time USD spot for BTC, ETH, SOL, HYPE from Hyperliquid when available, else CoinGecko. Position -4. Cached 60s.                                                                                                                                                                                                                                                                                                                                                                                    |
| `SOLUS_SIZING_STATE`             | Parses `knowledge/private/solus-options-sizing.md` into Solus wheel/sizing state (BTC/HYPE/SOL etc.). Injects human-readable summary + JSON.                                                                                                                                                                                                                                                                                                                                                            |
| `SOLUS_MARKET_CONTEXT`           | Wraps `VINCE_MARKET_DATA_SERVICE` so Solus sees spot, 24h move, regime, volume, ATR/DVOL for BTC/ETH/SOL/HYPE.                                                                                                                                                                                                                                                                                                                                                                                          |
| `SOLUS_OPTIONS_CONTEXT`          | Deribit: spot, DVOL, ATM IV, best CC/CSP strikes. When spot and IV are present, **assignment probability** (GBM or ML-calibrated when ONNX is loaded) and 95% CI are computed for best CC and CSP. Includes **tail risk** (7d P(spot down 15%) per asset) and when sizing state has **2+ positions**, **portfolio assignment risk** (P(at least one assigned), P(all), P(none)) via Gaussian copula. When `SolusOptionsCacheService` is present, reads from cache if fresh (see SOLUS_OPTIONS_REFRESH). |
| `SOLUS_CALIBRATION_CONTEXT`      | Brier score (last 30d) and last 10 resolved assignment outcomes. Injected into optimal strike, strike ritual, and position assess so Solus sees its own track record (recursive learning).                                                                                                                                                                                                                                                                                                              |

### Actions

| Action                         | Triggers (examples)                                                                                                                                                               | Purpose                                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLUS_STRIKE_RITUAL`          | "strike ritual", "Friday ritual", "walk me through strike"                                                                                                                        | Step-by-step Friday process: get VINCE options view, pick asset, CC vs CSP, strike width, invalidation.                                                                                                                                                                                               |
| `SOLUS_HYPERSURFACE_EXPLAIN`   | "how does Hypersurface work", "explain secured puts", "what's the wheel"                                                                                                          | Explain mechanics in plain language; point to VINCE for live data.                                                                                                                                                                                                                                    |
| `SOLUS_POSITION_ASSESS`        | "assess my position", "we bought $70K secured puts", "review my Hypersurface position"                                                                                            | Interpret position, state invalidation and hold/roll/adjust; ask for details if missing.                                                                                                                                                                                                              |
| `SOLUS_OPTIMAL_STRIKE`         | "optimal strike", "what strike for BTC", "best strike this week", "size or skip", "what's your call", "bull or bear this week", "weekly view", "weekly view for btc/eth/sol/hype" | Strike call (asset, OTM %, size/skip, invalidation) when context has data; else ask for VINCE options output. When `SOLUS_AUTO_RECORD_PREDICTION` is not `false`, the LLM reply ends with a parseable `Record: ASSET STRIKE PROB%` line and the action auto-appends a prediction row for calibration. |
| `SOLUS_ASSIGNMENT_CALIBRATION` | "record assignment prediction", "we got assigned", "we didn't get assigned", "assignment calibration"                                                                             | Record assignment prob (asset, strike, %), resolve at expiry (assigned / not), report Brier over resolved predictions. Store: `.elizadb/solus/solus-assignment-predictions.jsonl`.                                                                                                                    |

All actions validate that the runtime character name is `Solus` so the plugin is safe if ever attached to another agent.

## Boundaries

- **Data boundary:** Solus does **not** have funding, IV, or sentiment APIs on his own; he has **spot + mechanics + sizing state** only. He **cannot** get a pulse on where BTC, ETH, SOL, HYPE will land by each Friday on his own. **Where price lands by Friday** = from **pasted context** (VINCE options view, Grok daily) or the **user's view**. Strike calls are structure/strike + invalidation; for direction, user pastes VINCE output.
- **Options/IV data:** Plugin does not call Deribit or Hypersurface. Options data comes from state (provider + RAG) and the LLM; live options/IV stays in VINCE (user says "options" to VINCE or pastes into Solus).
- **Spot prices:** Real-time BTC, ETH, SOL, HYPE come from **Hyperliquid** (perps venue) when `HYPERLIQUID_SERVICE` is configured; otherwise they fall back to **plugin-coingecko** (CoinGecko `/simple/price`). If neither service is available, the spot-prices provider returns nothing and Solus still has mechanics context. Action prompts instruct the model to use spot prices from context (e.g. "[Hypersurface spot USD]") when present and to frame calls in terms of **weekly** outcome (expiry Friday), not intraday.
- **vincePluginNoX:** Solus still loads vincePluginNoX for ASK_AGENT and in-conversation options data. Plugin-solus adds the Hypersurface-specific layer on top. See knowledge/teammate/THREE-CURVES.md for left/mid/right framing.

## How to extend

- Add a new action in `src/actions/` (validate with message content + `isSolus(runtime)` from `src/utils/solus.ts`), register in `src/index.ts`.
- Extend the provider text in `hypersurfaceContext.provider.ts` if mechanics or workflow change.
- **Friday resolve reminder:** `src/tasks/solusAssignmentResolveReminder.tasks.ts` runs hourly; on Friday 10:00+ UTC it lists open assignment predictions and pushes to solus/ops channels so the user can resolve (“we got assigned” / “we didn’t get assigned”). Set `SOLUS_RESOLVE_REMINDER_ENABLED=false` to disable. Optional: add a Thursday 20:00 UTC pre-expiry reminder if product wants it.
- **Auto-record (Phase 2):** When `SOLUS_AUTO_RECORD_PREDICTION` is not `false`, SOLUS_OPTIMAL_STRIKE parses the LLM’s trailing `Record: ASSET STRIKE PROB%` line and appends a prediction to the store so you don’t have to say “record assignment prediction” manually. Set `SOLUS_AUTO_RECORD_PREDICTION=false` to disable.
- **Calibration notes task:** `src/tasks/solusCalibrationNotes.tasks.ts` runs daily and writes Brier-by-asset/IV notes to `.elizadb/solus/solus-calibration-notes.txt`; SOLUS_CALIBRATION_CONTEXT injects that text so Solus sees learned bias. Set `SOLUS_CALIBRATION_NOTES_ENABLED=false` to disable.
- **Options refresh and cache:** `SolusOptionsCacheService` caches the last SOLUS_OPTIONS_CONTEXT result. **SOLUS_OPTIONS_REFRESH** task runs every 10 min and warms the cache so the first user message gets instant options context. Set `SOLUS_OPTIONS_REFRESH_ENABLED=false` to disable; optional `SOLUS_OPTIONS_CACHE_TTL_MS` (default 10 min).
- **Improvement proof:** [IMPROVEMENT_PROOF.md](IMPROVEMENT_PROOF.md) documents the recursive calibration loop, what we measure (Brier, resolved count, ML vs GBM), and how to prove improvement (assignment calibration action, optional `scripts/validate_solus_calibration.py`).
- **Tail risk and portfolio risk:** SOLUS_OPTIONS_CONTEXT appends **tail risk** (P(spot down 15% in 7d, closed-form GBM) per asset and when 2+ positions exist in sizing state, **portfolio assignment risk** (Gaussian copula: P(at least one assigned), P(all), P(none)). See `src/utils/tailRisk.ts` and `src/utils/portfolioCopula.ts`.

## Solus ML / ONNX

- **Feature store:** Resolved assignment predictions in `.elizadb/solus/solus-assignment-predictions.jsonl` are the Solus ML feature store. Schema and derived features (T_years, moneyness, iv_bucket) are documented in [FEATURE-STORE.md](FEATURE-STORE.md).
- **Training:** Run `python scripts/train_solus_calibration.py` from the plugin directory (or `--data` / `--output` paths). Requires 50+ resolved rows by default (`--min-samples 50`). Outputs `assignment_calibrator.onnx` and `solus_training_metadata.json` to `.elizadb/solus/models/` (or `SOLUS_ML_MODELS_DIR`).
- **TRAIN_SOLUS_CALIBRATION_WHEN_READY:** Recurring task (every 12h) runs the training script when there are **50+ resolved** predictions and at least 24h have passed since the last run. On success, calls `SolusMlInferenceService.reloadModels()` so the new ONNX is used without restart. Set `SOLUS_TRAIN_CALIBRATION_ENABLED=false` to disable. Requires Python 3 and `pip install -r scripts/requirements.txt` (e.g. in container or host).
- **Inference:** `SolusMlInferenceService` loads the ONNX model when present and exposes `predictAssignmentProbability(input)`. When `assignment_calibrator.onnx` is present, **SOLUS_OPTIONS_CONTEXT** uses ML-calibrated P(assign) for best CC/CSP strikes; otherwise GBM-only (no breaking change).
- **Config:** `SOLUS_ML_MODELS_DIR` (default: `.elizadb/solus/models`). Optional: see [docs/ONNX.md](../../docs/ONNX.md) for the general train → ONNX → runtime pattern.

## Scope boundaries

- **Hypersurface / Deribit API:** We do not change Hypersurface or Deribit APIs. Solus only consumes the existing `getOptionsContext(currency)` contract (no new endpoints or request/response shapes). Any new options data must come from that interface.
- **Plugin-vince / Deribit service:** We do not change plugin-vince or the Deribit service. Solus continues to use **VINCE_DERIBIT_SERVICE** as the single source for options context. New behavior (e.g. tail risk, portfolio risk) is implemented in plugin-solus on top of the context returned by `getOptionsContext`, not by changing how that context is produced.
- **Tail / copula:** We do not add a full Python pipeline for tail risk or copula (no subprocess, no calling `skills/quant` from the app). We use TypeScript-only ports ([tailRisk.ts](src/utils/tailRisk.ts), [portfolioCopula.ts](src/utils/portfolioCopula.ts)); `skills/quant/` remains reference/design.
- **Particle filter (quant 5.py):** Live-updating P(assign) during the week via a particle filter is out of scope for the current iteration; deferred to a later iteration.

## Tests

Run from repo root:

```bash
bun test src/plugins/plugin-solus/
```

Tests cover validate (trigger phrases and Solus-only) and handler callback for strike ritual. The strategy-improvement integration test (`solusStrategyImprovement.integration.test.ts`) asserts prompt richness and response shape with mocks only (no real LLM, Deribit, or CoinGecko in CI), including calibration context in the prompt; Brier/calibration is covered in assignment tests and `solusCalibrationContext.test.ts`.
