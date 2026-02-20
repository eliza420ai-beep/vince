# Polymarket Trading Desk — Design and Data Flow

Design doc for the Polymarket trading desk: agent roles, tool ownership, and schemas for signals, sized orders, and trade logs. Implements Phase 1 of the [Polymarket Trading Desk PRD](.cursor/plans/polymarket_trading_desk_prd_c37e02c1.plan.md).

---

## 1. Agent matrix (who has which tools, who has wallet)

| Role               | Agent                              | Wallet | Primary plugin(s)                                                | Actions / capabilities                                                                                                                                                |
| ------------------ | ---------------------------------- | ------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analyst / Edge** | Oracle                             | No     | plugin-polymarket-discovery, plugin-synth (new)                  | GET\_\* Polymarket (markets, price, orderbook); poll Synth forecasts; compare → structured signal when edge above threshold                                           |
| **Risk**           | Polymarket Risk (new agent)        | No     | plugin-polymarket-discovery (read), plugin-polymarket-desk (new) | Read positions/PnL (GET_POLYMARKET_POSITIONS, GET_POLYMARKET_BALANCE, trade history); read risk limits & bankroll; Kelly sizing; write sized orders to approval queue |
| **Executor**       | Otaku                              | Yes    | plugin-otaku, plugin-polymarket-execution (new)                  | POLYMARKET_PLACE_ORDER, POLYMARKET_CONFIRM_FILL; read approved orders; write trade log on fill                                                                        |
| **Performance**    | Polymarket Performance (new agent) | No     | plugin-polymarket-desk                                           | Read trade log & positions; TCA (arrival vs fill), fill rates, realized vs theoretical edge; write calibration/strategy notes to knowledge                            |
| **Orchestrator**   | Kelly (optional)                   | No     | plugin-inter-agent                                               | ASK_AGENT to trigger Analyst/Risk/Performance; morning brief, EOD P&L, weekly review; schedule coordination                                                           |

**Wallet rule:** Only Otaku (Executor) holds credentials that can send orders to Polymarket CLOB. All other agents are read-only for execution or write only to shared state (signals, approvals, logs).

---

## 2. Data flow summary

```
Synth API → Analyst (Oracle) → [signal] → Risk agent → [sized order] → Executor (Otaku) → CLOB → [fill] → trade log
Edge engine (Oracle) ──────────┘                              ↑
                                                                              ↑
Performance agent ← trade log + positions (read) ←────────────────────────────┘
```

- **Signals:** Emitted when edge exceeds threshold. Two sources: (1) **Edge engine** (`plugin-polymarket-edge` on Oracle): multi-strategy runner (overreaction, model fair value, Synth forecast) that writes to `plugin_polymarket_desk.signals`; (2) **Desk’s own hourly check** (e.g. POLYMARKET_EDGE_CHECK) when configured. Both feed the same Risk → Executor pipeline.
- **Sized orders:** Produced by Risk after checking bankroll, exposure, and limits; written to approval queue. Executor is the only consumer.
- **Trade log:** Written by Executor on each fill (market, side, size, arrival price, fill price, timestamp). Read by Performance for TCA and reports.

---

## 3. Trading strategies (edge engine)

The edge engine (`plugin-polymarket-edge` on Oracle) runs multiple strategies. Each strategy compares some “fair value” or signal to the CLOB price and emits a signal when edge exceeds its threshold. Signal metadata from these strategies is stored in `plugin_polymarket_desk.signals.metadata_json` and shown in the leaderboard UI as “Why this position.”

### 3.1 model_fair_value

- **What it does:** Compares Black–Scholes implied probability (spot vs strike, volatility) to the CLOB YES price. Only considers BTC binary markets with a numeric strike (`strikeUsd > 0`). Emits a signal when edge is above threshold and the model forecast is in a “meaningful” range (default 5–95%) to avoid flooding from deep ITM/OTM.
- **Implementation:** [src/plugins/plugin-polymarket-edge/src/strategies/modelFairValue.ts](src/plugins/plugin-polymarket-edge/src/strategies/modelFairValue.ts). Uses [impliedProbability.ts](src/plugins/plugin-polymarket-edge/src/services/impliedProbability.ts) and spot from Binance WS.
- **Config (env):** `EDGE_MODEL_MIN_EDGE_PCT` (default 15), `EDGE_MODEL_TICK_INTERVAL_MS` (5s), `EDGE_MODEL_MIN_FORECAST_PROB` / `EDGE_MODEL_MAX_FORECAST_PROB` (5–95%), `EDGE_MODEL_COOLDOWN_MS` (10 min per market). See [plugin-polymarket-edge/src/constants.ts](src/plugins/plugin-polymarket-edge/src/constants.ts).
- **Signal metadata (Why):** spot, strikeUsd, expiryMs, volatility.

### 3.2 overreaction (Poly Strat)

- **What it does:** Detects a sharp move in the favorite and a cheap underdog. Signals **BUY underdog** when price velocity is above threshold, underdog price is below max (e.g. 0.15), and favorite is clearly above 0.7. Uses rolling price velocity from CLOB WS.
- **Implementation:** [src/plugins/plugin-polymarket-edge/src/strategies/overreaction.ts](src/plugins/plugin-polymarket-edge/src/strategies/overreaction.ts). Uses [priceVelocity.ts](src/plugins/plugin-polymarket-edge/src/services/priceVelocity.ts).
- **Config (env):** `EDGE_OVERREACTION_VELOCITY_PCT` (default 5), `EDGE_OVERREACTION_WINDOW_MS` (5 min), `EDGE_OVERREACTION_MAX_UNDERDOG_PRICE` (0.15), `EDGE_OVERREACTION_COOLDOWN_MS` (15 min).
- **Signal metadata (Why):** favoritePrice, underdogPrice, velocityPct.

### 3.3 synth

- **What it does:** Compares Synth API forecast probability (e.g. BTC) to CLOB mid price. Signals when edge in bps is at or above threshold (default 200 bps). **No-op if `SYNTH_API_KEY` is not set** — synth will never emit in that case.
- **Implementation:** [src/plugins/plugin-polymarket-edge/src/strategies/synthForecast.ts](src/plugins/plugin-polymarket-edge/src/strategies/synthForecast.ts). Uses [synthClient.ts](src/plugins/plugin-polymarket-edge/src/services/synthClient.ts).
- **Config (env):** `EDGE_SYNTH_POLL_INTERVAL_MS`, `EDGE_SYNTH_EDGE_BPS` (200). Requires `SYNTH_API_KEY` (and Pro for Polymarket predictions; see §11).
- **Signal metadata (Why):** asset (e.g. BTC), synthSource.

### 3.4 maker_rebate

- **What it does:** Paper-traded maker signals for **5-minute BTC up/down** markets. Only considers markets whose question matches 5-min BTC direction (e.g. “Will BTC go up in the next 5 minutes”) and **only when expiry is within 0–10 seconds**. Signals maker-side entry at 90–95¢ with zero-fee / rebate rationale.
- **Implementation:** [src/plugins/plugin-polymarket-edge/src/strategies/makerRebate.ts](src/plugins/plugin-polymarket-edge/src/strategies/makerRebate.ts). Uses same Binance WS + CLOB WS as other strategies.
- **Config (env):** `EDGE_MAKER_REBATE_TICK_MS` (2s), `EDGE_MAKER_REBATE_ENTRY_WINDOW_SEC` (10), `EDGE_MAKER_REBATE_MIN_CONFIDENCE`, `EDGE_MAKER_REBATE_MIN_ENTRY_PRICE`, `EDGE_MAKER_REBATE_COOLDOWN_MS`.
- **Signal metadata (Why):** makerEntryPrice, takerFeeAvoidedBps, estimatedFillProb, windowSecsRemaining, btcMomentumPct, isMakerOrder.

### 3.5 Why only overreaction might fire (fresh restart)

After a fresh server restart you may see only **overreaction** in paper positions. Reasons:

| Strategy             | When it can signal                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **overreaction**     | Works on **any** binary in the watched list. Needs: underdog ≤ 0.15, favorite ≥ 0.7, price velocity spike (default 5% in 5 min), edge ≥ 200 bps. So most discovered contracts can qualify once velocity builds. |
| **model_fair_value** | Only contracts with **strikeUsd > 0** (BTC threshold questions like “Will BTC hit $100k?”). If discovery returns mostly non-threshold binaries (`strikeUsd = 0`), it never fires.                               |
| **synth**            | **No signals if `SYNTH_API_KEY` is not set.** Set the key to enable.                                                                                                                                            |
| **maker_rebate**     | Only **5-min BTC up/down** markets and only when **expiry is in the next 0–10 seconds**. So it needs those markets in the discovered set and a tick in that tiny window (288 such markets per day).             |

**What to do:** Ask Oracle for “edge status” (or open Leaderboard → Polymarket tab → Edge status). The response now includes **Why only some strategies may fire** (e.g. `model_fair_value: needs BTC threshold markets (strikeUsd>0): 0 of 12 watched`, `synth: SYNTH_API_KEY not set`, `maker_rebate: needs 5-min BTC markets with expiry in 0–10s: 0 right now`). To get more variety: set `SYNTH_API_KEY` for synth; ensure discovery tags include markets that have BTC threshold questions for model_fair_value; for maker_rebate, ensure 5-min BTC markets are in the discovery tag set and that the engine is running when those windows occur.

---

## 4. Schema: structured signal (Analyst → Risk)

Produced by the Analyst (Oracle) when edge is above threshold. Stored so Risk can poll or be notified.

| Field                | Type              | Description                                                             |
| -------------------- | ----------------- | ----------------------------------------------------------------------- |
| `id`                 | UUID              | Unique signal id                                                        |
| `created_at`         | number (ms)       | When the signal was created                                             |
| `source`             | string            | e.g. `"synth"`, `"oracle_edge"`                                         |
| `market_id`          | string            | Polymarket condition_id or token_id (outcome)                           |
| `side`               | `"YES"` \| `"NO"` | Outcome to buy                                                          |
| `suggested_size_usd` | number            | Suggested notional (optional; Risk may override with Kelly)             |
| `confidence`         | number            | 0–1 or edge score                                                       |
| `forecast_prob`      | number            | External forecast probability (e.g. Synth)                              |
| `market_price`       | number            | Polymarket price at signal time (0–1)                                   |
| `edge_bps`           | number            | Edge in basis points (e.g. (forecast_prob - market_price) \* 10000)     |
| `status`             | string            | `"pending"` → `"approved"` \| `"rejected"` \| `"expired"` (set by Risk) |

**Storage:** DB table `plugin_polymarket_desk.signals` (PGLite/Postgres) so Risk and Performance can query. Optional: also write a short summary to a knowledge file for audit (e.g. `knowledge/polymarket-desk/signals_latest.md` updated on each signal).

---

## 5. Schema: sized order (Risk → Executor)

Produced by Risk after approving a signal and applying sizing. Only Executor reads and consumes these.

| Field          | Type              | Description                                                           |
| -------------- | ----------------- | --------------------------------------------------------------------- |
| `id`           | UUID              | Unique order id                                                       |
| `created_at`   | number (ms)       | When the order was created                                            |
| `signal_id`    | UUID              | Reference to the signal that generated this order                     |
| `market_id`    | string            | condition_id or token_id for the outcome                              |
| `side`         | `"YES"` \| `"NO"` | Outcome to buy                                                        |
| `size_usd`     | number            | Notional in USD (after Kelly or config sizing)                        |
| `max_price`    | number            | Max price 0–1 (optional; limit)                                       |
| `slippage_bps` | number            | Allowed slippage in bps (optional)                                    |
| `status`       | string            | `"pending"` → `"sent"` \| `"filled"` \| `"rejected"` \| `"cancelled"` |
| `filled_at`    | number \| null    | When Executor recorded fill (ms)                                      |
| `fill_price`   | number \| null    | Actual fill price 0–1                                                 |

**Storage:** DB table `plugin_polymarket_desk.sized_orders`. Executor polls for `status = 'pending'` or is triggered (e.g. ASK_AGENT with order id). Only Otaku (Executor) plugin has actions that update `status` and write to trade log.

---

## 6. Schema: trade log (Executor write; Performance read)

One row per filled order. Written by Executor; read by Performance for TCA and reports.

| Field            | Type              | Description                                                   |
| ---------------- | ----------------- | ------------------------------------------------------------- |
| `id`             | UUID              | Unique trade id                                               |
| `created_at`     | number (ms)       | When the fill was recorded                                    |
| `sized_order_id` | UUID              | Reference to the sized order                                  |
| `signal_id`      | UUID              | Reference to the original signal                              |
| `market_id`      | string            | condition_id / token_id                                       |
| `side`           | `"YES"` \| `"NO"` | Outcome bought                                                |
| `size_usd`       | number            | Notional                                                      |
| `arrival_price`  | number            | Price at signal time (0–1)                                    |
| `fill_price`     | number            | Actual fill price (0–1)                                       |
| `slippage_bps`   | number            | (fill_price - arrival_price) \* 10000 (or similar)            |
| `clob_order_id`  | string            | CLOB order id (if returned by API)                            |
| `wallet`         | string            | Wallet that placed (e.g. proxy address; optional for privacy) |

**Storage:** DB table `plugin_polymarket_desk.trade_log`. Same DB as ElizaOS (PGLite or Postgres). Optional: periodic export to JSONL under `.elizadb/polymarket-desk/trades_*.jsonl` for backup and ML (e.g. realized edge over time). Performance agent reads this table (and optionally signals/sized_orders) to compute TCA, fill rates, and realized vs theoretical edge.

---

## 7. Where each artifact lives

| Artifact                         | Primary storage                                                                           | Optional / backup                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Signals**                      | `plugin_polymarket_desk.signals` (DB)                                                     | knowledge/polymarket-desk/signals_latest.md (audit) |
| **Sized orders**                 | `plugin_polymarket_desk.sized_orders` (DB)                                                | —                                                   |
| **Trade log**                    | `plugin_polymarket_desk.trade_log` (DB)                                                   | `.elizadb/polymarket-desk/trades_*.jsonl`           |
| **Risk limits / bankroll**       | knowledge/polymarket-desk/risk_limits.md or DB table `plugin_polymarket_desk.risk_config` | —                                                   |
| **Calibration / strategy notes** | knowledge/polymarket-desk/ (Performance agent writes)                                     | —                                                   |

DB tables live in the same database as ElizaOS (PGLite when no `POSTGRES_URL`, else Postgres). A new plugin `plugin-polymarket-desk` (or similar) registers the schema so migrations create `plugin_polymarket_desk.signals`, `plugin_polymarket_desk.sized_orders`, `plugin_polymarket_desk.trade_log`, and optionally `plugin_polymarket_desk.risk_config`.

---

## 8. Approval mechanism (push vs pull)

- **Pull (recommended for Phase 1):** Executor (Otaku) runs a recurring task (e.g. every 1–2 min) that queries `sized_orders` for `status = 'pending'`, picks one, calls Polymarket CLOB to place order, then updates the row to `status = 'filled'`/`'sent'` and appends to `trade_log`. Simple and decoupled; no ASK_AGENT required for execution.
- **Push (optional later):** Risk agent, after writing a sized order, invokes ASK_AGENT to Otaku with a structured message containing the order id; Otaku then fetches the order and executes. Lowers latency but couples Risk to Otaku’s availability.

This doc assumes **pull** for initial implementation.

---

## 9. Discord audit trail (per-role channels)

Each role can post to its own channel for a timestamped audit trail. Configure one Discord app per agent (or use a single app and route by channel).

| Channel (suggested)      | Agent                  | Env vars (optional)         |
| ------------------------ | ---------------------- | --------------------------- |
| `#polymarket-signals`    | Oracle (Analyst)       | `ORACLE_DISCORD_*`          |
| `#polymarket-risk`       | Polymarket Risk        | `POLYMARKET_RISK_DISCORD_*` |
| `#polymarket-executions` | Otaku (Executor)       | `OTAKU_DISCORD_*`           |
| `#polymarket-strategy`   | Polymarket Performance | `POLYMARKET_PERF_DISCORD_*` |

Create these channels in your Discord server and invite the corresponding bot to each. The pipeline runs inside ElizaOS; Discord is audit trail only.

---

## 10. Schedule and calibration

### Recurring tasks

| Task                      | Agent                  | Interval | Env                                                             |
| ------------------------- | ---------------------- | -------- | --------------------------------------------------------------- |
| POLYMARKET_ANALYST_HOURLY | Oracle                 | 1 hour   | POLYMARKET_DESK_DEFAULT_CONDITION_ID (required for analyst run) |
| POLYMARKET_RISK_15M       | Polymarket Risk        | 15 min   | —                                                               |
| POLYMARKET_PERF_4H        | Polymarket Performance | 4 hours  | —                                                               |
| POLYMARKET_EXECUTE_POLL   | Otaku                  | 2 min    | —                                                               |

Set `POLYMARKET_DESK_SCHEDULE_ENABLED=false` to disable all desk recurring tasks.

When the schedule is enabled, **Risk 15m** approves one pending signal per run (invokes `POLYMARKET_RISK_APPROVE`) and writes one row to `sized_orders`. **Otaku 2m** executes one pending sized order per run (invokes `POLYMARKET_EXECUTE_PENDING_ORDER` directly, no LLM) and writes to `trade_log`. Both run via Bootstrap TaskService (tasks are tagged `queue` + `repeat`).

**Otaku execution (paper or live)** requires these env vars on the Otaku agent; if any are missing, the execute action does **not** update the order (see Paper-only mode below):

- `POLYMARKET_PRIVATE_KEY` or `EVM_PRIVATE_KEY`
- `POLYMARKET_CLOB_API_KEY`, `POLYMARKET_CLOB_SECRET`, `POLYMARKET_CLOB_PASSPHRASE`
- `POLYMARKET_FUNDER_ADDRESS`

See `.env.example` (Polymarket / Otaku sections) for all desk and execution variables.

### Paper-only mode

When Otaku does not have Polymarket CLOB credentials set, the execute action does **not** mark pending sized orders as rejected. Orders stay `status = 'pending'` so they remain visible under “Open paper positions” on the Polymarket tab (leaderboard) with live P&L and rationale (“Why this position”). Once credentials are configured, the same pending orders can be executed; the 2‑minute poll will then consume them and write to the trade log.

### Tuning parameters

- **Edge (Analyst):** `edge_threshold_bps` in POLYMARKET_EDGE_CHECK (default 200). Higher = fewer, higher-conviction signals.
- **Risk sizing:** `POLYMARKET_DESK_BANKROLL_USD`, `POLYMARKET_DESK_KELLY_FRACTION` (e.g. 0.25), `POLYMARKET_DESK_MAX_POSITION_PCT`, `POLYMARKET_DESK_MIN_SIZE_USD`, `POLYMARKET_DESK_MAX_SIZE_USD` (see Risk action and .env.example).
- **Selectivity (backlog cap):** `POLYMARKET_DESK_MAX_PENDING_SIZED_ORDERS` (default 10). Risk will not create a new sized order when the number of pending sized orders is already at or above this limit, so the desk stays selective and the UI/Executor aren’t overloaded. Raise the cap if Otaku is filling orders quickly; leave at 10–20 if execution is slow or paper-only.
- **Execution:** CLOB credentials and `POLYMARKET_FUNDER_ADDRESS` only on Otaku; no execution keys on other agents.

EOD (e.g. 10pm) and weekly (e.g. Sunday) reports can be added as additional tasks or triggered via Orchestrator (Kelly) / ASK_AGENT.

---

## 11. Synth API and Pro plan ($199/mo)

### What we did

The **Analyst (Oracle)** compares an external forecast to Polymarket’s price to decide when we have edge. We use **Synth** (synthdata.co) for that forecast. Our edge is **forecast vs price**, not latency — Polymarket removed the 0.5s order delay on 15m BTC events (Feb 2025), which killed speed-based bots; we do not rely on that. See [Polymarket deep reference](../knowledge/macro-economy/polymarket-deep-reference.md) Part 10 for platform-regime notes.

- **`plugin-polymarket-desk`** → `services/synthClient.ts`: `getSynthForecast(asset)` calls Synth’s prediction-percentiles API (e.g. BTC, ETH, SOL).
- **POLYMARKET_EDGE_CHECK** (Oracle): Fetches Synth forecast + Polymarket YES/NO price for a `condition_id`, computes edge in bps; when edge ≥ threshold, writes a row to `plugin_polymarket_desk.signals` for Risk to approve and size.
- **Schedule:** POLYMARKET_ANALYST_HOURLY runs every hour (when `POLYMARKET_DESK_DEFAULT_CONDITION_ID` is set), so we need reliable API access.

Without Synth we fall back to a deterministic mock (no real forecast). To run the desk on live data we need Synth API.

### Why Free isn’t enough

On **Free**, Synth only gives:

- Volatility Dashboard (no API).

So we get **no** `getSynthForecast` calls—only the in-code mock. The desk would never see real Synth vs Polymarket edge.

### Why we need the $199/mo Pro plan

**Pro** is the first tier that includes:

1. **Polymarket Predictions** — The product we’re wiring into: forecast probabilities we compare to Polymarket prices for edge.
2. **API: 5,000 calls/month** — The Analyst runs hourly (and on-demand edge checks). Each edge check = 1 Synth API call per market/asset. 5k calls supports many markets and ad‑hoc checks without hitting limits.

Standard ($49/mo) only has “API access to 100 calls one time,” which is not enough for a recurring desk.

### Summary (if you’re a VC, send help)

| Item                    | Purpose                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Synth Pro @ $199/mo** | Polymarket Predictions + 5,000 API calls/month so the Analyst can run `getSynthForecast` and POLYMARKET_EDGE_CHECK on real data. |
| **Env**                 | `SYNTH_API_KEY`, optional `SYNTH_API_URL` (see .env.example).                                                                    |
| **Fallback**            | If key is missing or API fails, we use a deterministic mock so the pipeline still runs; no live edge from Synth.                 |

---

## 12. References

- [ORACLE.md](ORACLE.md) — Oracle as Analyst (Polymarket discovery).
- [OTAKU.md](OTAKU.md) — Otaku as Executor (only wallet).
- [knowledge/macro-economy/polymarket-deep-reference.md](../knowledge/macro-economy/polymarket-deep-reference.md) — Full Polymarket reference; Part 10 = platform changes and bot strategy (e.g. Feb 2025 delay removal).
- [FEATURE-STORE.md](FEATURE-STORE.md) — How paper bot stores feature records (DB + JSONL pattern).
- [MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT and handoffs.
