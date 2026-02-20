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

## 3. Schema: structured signal (Analyst → Risk)

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

## 4. Schema: sized order (Risk → Executor)

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

## 5. Schema: trade log (Executor write; Performance read)

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

## 6. Where each artifact lives

| Artifact                         | Primary storage                                                                           | Optional / backup                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Signals**                      | `plugin_polymarket_desk.signals` (DB)                                                     | knowledge/polymarket-desk/signals_latest.md (audit) |
| **Sized orders**                 | `plugin_polymarket_desk.sized_orders` (DB)                                                | —                                                   |
| **Trade log**                    | `plugin_polymarket_desk.trade_log` (DB)                                                   | `.elizadb/polymarket-desk/trades_*.jsonl`           |
| **Risk limits / bankroll**       | knowledge/polymarket-desk/risk_limits.md or DB table `plugin_polymarket_desk.risk_config` | —                                                   |
| **Calibration / strategy notes** | knowledge/polymarket-desk/ (Performance agent writes)                                     | —                                                   |

DB tables live in the same database as ElizaOS (PGLite when no `POSTGRES_URL`, else Postgres). A new plugin `plugin-polymarket-desk` (or similar) registers the schema so migrations create `plugin_polymarket_desk.signals`, `plugin_polymarket_desk.sized_orders`, `plugin_polymarket_desk.trade_log`, and optionally `plugin_polymarket_desk.risk_config`.

---

## 7. Approval mechanism (push vs pull)

- **Pull (recommended for Phase 1):** Executor (Otaku) runs a recurring task (e.g. every 1–2 min) that queries `sized_orders` for `status = 'pending'`, picks one, calls Polymarket CLOB to place order, then updates the row to `status = 'filled'`/`'sent'` and appends to `trade_log`. Simple and decoupled; no ASK_AGENT required for execution.
- **Push (optional later):** Risk agent, after writing a sized order, invokes ASK_AGENT to Otaku with a structured message containing the order id; Otaku then fetches the order and executes. Lowers latency but couples Risk to Otaku’s availability.

This doc assumes **pull** for initial implementation.

---

## 8. Discord audit trail (per-role channels)

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

**Otaku execution (paper or live)** requires these env vars on the Otaku agent; if any are missing, the execute action marks the order as rejected and returns:

- `POLYMARKET_PRIVATE_KEY` or `EVM_PRIVATE_KEY`
- `POLYMARKET_CLOB_API_KEY`, `POLYMARKET_CLOB_SECRET`, `POLYMARKET_CLOB_PASSPHRASE`
- `POLYMARKET_FUNDER_ADDRESS`

See `.env.example` (Polymarket / Otaku sections) for all desk and execution variables.

### Tuning parameters

- **Edge (Analyst):** `edge_threshold_bps` in POLYMARKET_EDGE_CHECK (default 200). Higher = fewer, higher-conviction signals.
- **Risk sizing:** `POLYMARKET_DESK_BANKROLL_USD`, `POLYMARKET_DESK_KELLY_FRACTION` (e.g. 0.25), `POLYMARKET_DESK_MAX_POSITION_PCT`, `POLYMARKET_DESK_MIN_SIZE_USD`, `POLYMARKET_DESK_MAX_SIZE_USD` (see Risk action and .env.example).
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
