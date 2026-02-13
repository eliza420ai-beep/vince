# VINCE Paper Bot Feature Store (ML)

**Purpose:** Where paper-bot trade features (40+ per decision) are stored and how to use them for ML training. For deploy and env setup, see [DEPLOY.md](DEPLOY.md). For the rest of the repo, see [README.md](../README.md).

**When to read:** Setting up Supabase/PGLite for features, running the training script, or syncing existing JSONL to Supabase.

---

## Storage at a glance

Feature records from vince-paper-bot trades are used for ML training (e.g. 90+ for ONNX, 500+ for larger runs). They can be stored in up to three places:

| Storage | When used | Purpose |
|--------|------------|---------|
| **Local JSONL** | Always | `.elizadb/vince-paper-bot/features/features_*.jsonl` – backup, offline, export |
| **PGLite / Postgres** | When using ElizaOS DB | Table `plugin_vince.paper_bot_features` – same DB as agent (PGLite or Postgres) |
| **Supabase** | Optional (when keys set) | Table `vince_paper_bot_features` – query 500+ in one place for ML |

## Current deployment state

- **Prod (Eliza Cloud):** Repo is deployed to production with Eliza Cloud and everything works. The app is still using **PGLite** (no `POSTGRES_URL`), so runtime data and feature-store DB writes use the local PGLite instance in the container.
- **Supabase Postgres:** Not yet in use. When you set `POSTGRES_URL` to your Supabase direct connection (port 5432), ElizaOS will use that for all framework tables (agents, cache, memories, entities, rooms, etc.). Plugin-vince’s runtime migrations will then create **`plugin_vince.paper_bot_features`** in that **same** database, so your jsonl training data lives alongside ElizaOS tables in one Postgres instance.

## ElizaOS tables vs feature store (where to put jsonl training data)

ElizaOS auto-creates tables in the main schema (e.g. `public`): `agents`, `cache`, `memories`, `entities`, `rooms`, `participants`, `relationships`, `tasks`, `worlds`, `embeddings`, `logs`, etc. Those are for **runtime** (conversations, agent memory, embeddings). They are not designed for bulk ML feature rows.

We **do not** store feature-store jsonl rows inside those tables. Instead:

- **Feature store** = one row per trading decision / closed trade, with a **payload** (JSONB) holding the full feature record for ML.
- **Where it lives:** (1) Always: local `.elizadb/vince-paper-bot/features/*.jsonl`. (2) When the app has a DB: table **`plugin_vince.paper_bot_features`** in the **same** DB as ElizaOS (PGLite or Postgres). The plugin registers a Drizzle schema so runtime migrations create the `plugin_vince` schema and this table. (3) Optional: Supabase table **`vince_paper_bot_features`** (in `public`) when `SUPABASE_SERVICE_ROLE_KEY` is set, for querying 500+ rows for ML scripts.

So the “combo” with ElizaOS tables is: **same database, different schema/table**. When you move to Supabase Postgres, set `POSTGRES_URL`; then both framework tables and `plugin_vince.paper_bot_features` live in that one Postgres. We have not found a clean way to store the same jsonl rows inside core ElizaOS tables (e.g. `memories`) without bending their schema; the plugin table is the right place.

## Current behavior

- **Local**: Every flush (e.g. every 1 min) appends records to `features_YYYY-MM-DD_<ts>.jsonl` under `.elizadb/vince-paper-bot/features/`.
- **PGLite/Postgres**: If the runtime has a DB connection (PGLite when no `POSTGRES_URL`, or Postgres when set), the same records are **also** upserted into `plugin_vince.paper_bot_features`. The table is created automatically at startup via plugin-vince’s Drizzle schema (runtime migrations).
- **Supabase**: **Only if** `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) is set, the same records are **also** upserted into Supabase so you can run your ML script against 500+ rows in one query.

Without Supabase keys, **Supabase does not record these trades** – local JSONL and (when available) PGLite/Postgres do.

## Enable Supabase dual-write (recommended for ML; persists across redeploys)

Features are written to Supabase in addition to local JSONL (and PGLite/Postgres). That data **persists across Eliza Cloud redeploys** and can be used for training and future reads.

### 1. Create the table in Supabase (one-time)

In **Supabase Dashboard → SQL Editor**, run the bootstrap script:

- **Option A:** Open `scripts/supabase-feature-store-bootstrap.sql` in this repo, copy its contents, paste into a new query, and click **Run**.
- **Option B:** Or run the SQL from the script directly; it creates `public.vince_paper_bot_features` and indexes.

### 2. Set env (local and deploy)

In **`.env`** (and for Cloud, the deploy script will pass these when set):

| Variable | Required | Where to get it |
|---------|----------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase Dashboard → **Settings → API** → `service_role` (secret). |
| `SUPABASE_URL` | Optional | `https://YOUR_PROJECT_REF.supabase.co`. If you use Supabase Postgres (`POSTGRES_URL=...@db.XXX.supabase.co:5432/...`), the app derives this; set only if you use a different URL. |

Example in `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://abcdefgh.supabase.co
```

### 3. Restart (local) or redeploy (Cloud)

- **Local:** Restart the app (`bun start`). On startup you should see:  
  `[VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)`
- **Eliza Cloud:** Run `bun run deploy:cloud` (or `./scripts/deploy-cloud.sh`). The script reads `.env` and passes `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` when set, so the deployed app will dual-write to Supabase.

### 4. Verify

After some paper trades, open **Supabase Dashboard → Table Editor → `vince_paper_bot_features`**. You should see rows with `id`, `created_at`, and `payload` (full feature record). The payload may include an optional `grokPulse` object (`fearGreed`, `topTradersLongPct`) from the daily Grok auto-pulse when available. Use this table for ML training (e.g. 500+ rows) or future reads.

### 5. ML models on Cloud (training without redeploy)

To have **training run on Eliza Cloud** and persist models so you don’t need to redeploy (e.g. $15/redeploy):

1. **Create a Storage bucket** in Supabase (one-time): [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Storage** → **New bucket** → Name: **`vince-ml-models`** → leave **Public bucket** off → **Create bucket**. Full steps: [DEPLOY.md#one-time-create-the-vince-ml-models-bucket](DEPLOY.md#one-time-create-the-vince-ml-models-bucket).
2. Deploy with `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` set. The container has Python + training deps; when there are 90+ complete trades, the **TRAIN_ONNX_WHEN_READY** task runs, uploads `.onnx` and `training_metadata.json` to this bucket, and reloads the ML service.
3. On the next deploy, the app downloads the latest models from `vince-ml-models` so ML stays up to date without baking models into the image. See [DEPLOY.md](DEPLOY.md) § “ML training on Eliza Cloud”.

## Aggressive paper trading ($210 take profit, 10x leverage)

To close at ~$210 profit and use higher leverage (e.g. like Hyperliquid 10x):

- **Env:** In `.env` set `VINCE_PAPER_AGGRESSIVE=true`, then restart.
- **Or in code:** In `src/agents/vince.ts`, set `vince_paper_aggressive: true` in the character `settings` object.

When enabled, the position manager uses `TAKE_PROFIT_USD_AGGRESSIVE` (210) and the risk manager uses `AGGRESSIVE_RISK_LIMITS` (max leverage 10).

## Paper bot: focus on one asset (e.g. BTC only)

To run the paper bot only on BTC (most sources and factors), then add ETH/SOL/HYPE later:

- **Env:** In `.env` set `VINCE_PAPER_ASSETS=BTC`, then restart.
- **Or in code:** In `src/agents/vince.ts`, set `vince_paper_assets: "BTC"` in the character `settings` object.

Use a comma-separated list to add more later, e.g. `VINCE_PAPER_ASSETS=BTC,ETH`.

## Avoided decisions (no-trade evaluations)

When the paper bot **evaluates a signal but does not trade** (e.g. “SIGNAL EVALUATED - NO TRADE” because of similarity AVOID, ML quality below threshold, or strength/confidence below bar), we still write a **feature record** with the same market/session/signal/regime/news snapshot, but with **`avoided: { reason, timestamp }`** instead of `execution` and `outcome`. That way we keep learning even on days when no trades are taken (e.g. extreme vol, 5B+ liquidations).

- **Field:** Each record can have optional **`avoided`**: `{ reason: string; timestamp: number }`. No `execution`, no `outcome`, no `labels`.
- **Rate limit:** At most **one avoided record per asset per 2 minutes** so the store doesn’t flood.
- **Persistence:** Same as executed trades: local JSONL, PGLite/Postgres (when DB is used), and Supabase (when keys set).
- **Current training:** `train_models.py` and the “90+ complete trades” task use only records that have **`outcome` and `labels`** (closed trades). Avoided records are **ignored** by current ONNX training.
- **Using avoided records in future scripts:**
  - **Filter in SQL/JSONL:** `payload->'avoided' IS NOT NULL` (Supabase) or filter in Python: `r.get('avoided')` to get “evaluated but no trade” rows.
  - **Possible uses:** (1) Train an “should we trade?” / avoid classifier. (2) Counterfactual analysis: e.g. “if we had traded this avoided signal, what would have happened?” using later price action. (3) Analytics: distribution of avoid reasons by regime, asset, or session.

## Fee-aware PnL (net of costs)

**Realized PnL in the feature store is net of trading fees.** When a position closes, we subtract round-trip fees (open + close, taker) from gross PnL before writing to the position, portfolio, journal, and feature store. So `outcome.realizedPnl` and `outcome.realizedPnlPct` are **after fees**; the improvement report and training labels (profitable, winAmount, lossAmount, rMultiple) are therefore fee-aware. Optional `outcome.feesUsd` is stored so you can see the fee per trade (e.g. for analytics). Fee rate: `FEES.ROUND_TRIP_BPS` (5 bps = 0.05% of notional, Hyperliquid-like) in `paperTradingDefaults.ts`.

## Collecting more training data

Ways to get to 90+ closed trades (and more avoided snapshots) faster:

| Action | What it does | Trade-off |
|--------|----------------|-----------|
| **Run in aggressive mode** | `VINCE_PAPER_AGGRESSIVE=true`: base thresholds 40/35, 40x leverage, $280 TP, 2.5:1 R:R, no cooldown after loss. More trades per day → more outcomes for training. | Higher risk per trade; use when you explicitly want more data. |
| **Focus one asset first** | `VINCE_PAPER_ASSETS=BTC`: all evaluation cycles on BTC (most signal sources). Gets you to 90+ closed trades on one asset faster. | Add ETH/SOL/HYPE later for diversity. |
| **Record avoided more often** | Today: one avoided record per asset per 2 min. You can lower the interval (e.g. 1 min) in code (`AVOIDED_RECORD_INTERVAL_MS` in `vincePaperTrading.service.ts`) to capture more “no trade” snapshots on quiet/extreme days. | More JSONL rows; same feature shape. |
| **Bootstrap with synthetic data** | Run `generate_synthetic_features.py --count 150` then `train_models.py` so the pipeline and ONNX load path are validated. Optionally mix synthetic + real (e.g. 50 real + 50 synthetic) to reach 90 until real data accumulates. | Models trained only on synthetic learn the generator, not the market; use for dev/testing, not production. |
| **Optional: data-collection mode (future)** | A setting that temporarily lowers thresholds (e.g. min strength 55, min confidence 50) and/or bypasses ML report suggestions so more marginal signals become trades. Run for a fixed period (e.g. one week), then turn off and train. | More losing trades; all count as training data. Not implemented yet; would require a dedicated flag and possibly a cap (e.g. max N trades per day). |
| **Shorter max position age (advanced)** | Positions are closed at 48h max (`MAX_POSITION_AGE_MS` in position manager). Reducing to e.g. 24h would force more closes per week and more outcome records. | More “max_age” exits; changes P&L profile. |
| **Monitor progress** | Feature store exposes `getCompleteRecordCount()`; the training task logs “Skipping: N complete trades (need 90+)”. Check logs or add a periodic log: “Feature store: N closed, M avoided (last 24h)” to see how fast you’re collecting. | — |

**Recommended for “I want more data soon”:** Use `VINCE_PAPER_AGGRESSIVE=true` and `VINCE_PAPER_ASSETS=BTC` (or `BTC,ETH`) until you have 90+ closed trades, then add assets and optionally turn aggressive off. Avoided records already accumulate in the background (rate-limited); no extra config needed. See also [Avoided decisions](#avoided-decisions-no-trade-evaluations) and [When training runs](#when-training-runs-90-trades) below; `.env.example` documents `VINCE_PAPER_AGGRESSIVE` and `VINCE_PAPER_ASSETS`.

## When training runs (90+ trades)

- **Automatic**: The plugin registers a recurring task `TRAIN_ONNX_WHEN_READY`. When the feature store has **90+ complete trades** (records with `outcome` and `labels`), the task runs the Python training script (at most once per 24h). Models are written to `.elizadb/vince-paper-bot/models/`; the ML Inference Service loads them on next use.
- **Manual**: From repo root:
  ```bash
  python3 src/plugins/plugin-vince/scripts/train_models.py \
    --data .elizadb/vince-paper-bot/features \
    --output .elizadb/vince-paper-bot/models \
    --min-samples 90
  ```
- **Requires**: Python 3, `pip install -r src/plugins/plugin-vince/scripts/requirements.txt` (xgboost, skl2onnx, onnx, etc.).

## ML script (500+ records)

Query Supabase for training data:

```sql
select payload
from public.vince_paper_bot_features
order by created_at
limit 1000;
```

Or use the Supabase client / REST API and filter by `payload->>'asset'`, `payload->'outcome' IS NOT NULL` for **closed trades** (training), or `payload->'avoided' IS NOT NULL` for **no-trade evaluations** (see “Avoided decisions” above).

## Sync existing local JSONL to Supabase

If you already have many `.jsonl` files locally and want them in Supabase:

```bash
bun run scripts/sync-jsonl-to-supabase.ts --dry-run   # preview
bun run scripts/sync-jsonl-to-supabase.ts             # upsert to vince_paper_bot_features
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Run `supabase-feature-store-bootstrap.sql` first.

---

## Feature name mapping (store → training → inference)

When you add or change a feature, update **all three** places so training and inference stay in sync:

| Layer | Where | Rule |
|-------|--------|------|
| **Feature store** | `vinceFeatureStore.service.ts` — `FeatureRecord.market`, `.session`, `.signal`, `.regime`, `.news`, `.execution`, `.outcome`, `.labels`, `.avoided` | Nested keys (e.g. `market.priceChange24h`) are written to JSONL as-is. `.outcome.realizedPnl` is **net of fees**; `.outcome.feesUsd` optional. `.avoided` = no-trade evaluations (V4.30). |
| **Flattened column (training)** | `train_models.py` — `load_features()` flattens each record | `record.section.key` → **`section_key`** (e.g. `market.priceChange24h` → `market_priceChange24h`). Lists/objects: `signal.sources` → derived `signal_source_count`, `signal_avg_sentiment`; `news.macroRiskEnvironment` → `news_macro_risk_on` / `news_macro_risk_off` (0/1); `regime.volatilityRegime` → `regime_volatility_high` (1 if high); `regime.marketRegime` → `regime_bullish`, `regime_bearish`. |
| **Inference input** | `mlInference.service.ts` — `SignalQualityInput`, `getSignalQualityFeatureValue()` | Flattened column name (e.g. `market_priceChange24h`) is mapped to an input field (e.g. `priceChange24h`) and normalized. Order is defined by **`training_metadata.signal_quality_feature_names`** after each train; inference builds the vector from that list. |

**Flatten rules (train_models.py):**

- `market.*` → `market_*` (e.g. `market_atrPct`, `market_longShortRatio`)
- `session.*` → `session_*` (e.g. `session_utcHour`, `session_isOpenWindow`)
- `signal.*` (except `sources`, `factors`) → `signal_*`; plus `signal_source_count`, `signal_avg_sentiment` from `sources`
- `regime.*` → `regime_*`; training also derives `regime_volatility_high`, `regime_bullish`, `regime_bearish` from `regime_volatilityRegime` / `regime_marketRegime`
- `news.*` (scalar values) → `news_*`; `news.macroRiskEnvironment` → `news_macro_risk_on`, `news_macro_risk_off`
- `execution.*` → `exec_*`; `outcome.*` → `outcome_*`; `labels.*` → `label_*`

**Signal-quality model (canonical order after train):**

Base (always): `market_priceChange24h`, `market_volumeRatio`, `market_fundingPercentile`, `market_longShortRatio`, `signal_strength`, `signal_confidence`, `signal_source_count`, `signal_hasCascadeSignal`, `signal_hasFundingExtreme`, `signal_hasWhaleSignal`, `session_isWeekend`, `session_isOpenWindow`, `session_utcHour`. Optional (when present in data): `market_dvol`, `market_rsi14`, `market_oiChange24h`, `market_fundingDelta`, `market_bookImbalance`, `market_bidAskSpread`, `market_priceVsSma20`, `signal_hasOICap`, `signal_avg_sentiment`, `news_avg_sentiment`, `news_nasdaqChange`, `news_etfFlowBtc`, `news_etfFlowEth`, `news_macro_risk_on`, `news_macro_risk_off`. Regime: `regime_volatility_high`, `regime_bullish`, `regime_bearish`. Multi-asset: `asset_BTC`, `asset_ETH`, etc. (dummies).

**Adding a new feature:**

1. **Store:** Add the field to the right interface in `vinceFeatureStore.service.ts` (e.g. `MarketFeatures`, `NewsFeatures`) and populate it in the corresponding `collect*Features()` method.
2. **Training:** In `train_models.py`, add the flattened column to the model’s feature list (e.g. `prepare_signal_quality_features` or `OPTIONAL_FEATURE_COLUMNS`). If it’s derived (like regime dummies), add the derivation in the prepare function.
3. **Inference:** In `mlInference.service.ts`, add the field to `SignalQualityInput` (or the relevant input type), and in `getSignalQualityFeatureValue()` add a `case "flattened_column_name": return ...` so the vector built from `signal_quality_feature_names` gets the correct value.

After retraining, `training_metadata.signal_quality_feature_names` defines the exact order; inference uses that list and does not need a code change for dimension.

---

## Related docs

- [README.md](../README.md) — Project overview and getting started
- [DEPLOY.md](DEPLOY.md) — Deploy env (PGLite, Postgres, Supabase keys)
- [src/plugins/plugin-vince/HOW.md](../src/plugins/plugin-vince/HOW.md) — Paper bot dev and ML layer
- [src/plugins/plugin-vince/scripts/README.md](../src/plugins/plugin-vince/scripts/README.md) — Training script usage
- [src/plugins/plugin-vince/ALGO_ML_IMPROVEMENTS.md](../src/plugins/plugin-vince/ALGO_ML_IMPROVEMENTS.md) — ML usage and improvement checklist
