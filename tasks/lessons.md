# Lessons — Self-Improvement Log

Capture patterns and corrections here. Review at session start.

---

## Patterns

- **Paper perps swing fast:** Was +$88; one status check later SOL long -$215, shorts mixed (HYPE +$98, BTC/ETH giving back). Illustrates how hard perps are—we make most of our money on Hypersurface covered calls/secured puts (weekly upfront premium), not perps.
- **When X happened:** Do Y. Don't do Z.
- (Add entries after user corrections or discovered mistakes)

<!-- POST_MORTEM_LESSONS_START -->

### Post-mortem lessons (auto-generated)

_Summarized from docs/standup/post-mortems/*.md. Edit source post-mortems, then re-run `bun run scripts/ingest-postmortems.ts`._

- **crypto**:
  - **sizing_too_aggressive (4 losses)**: avg quality=90.8, avg adverse move=0.62%, avg hold=55.0m. Treat this combo as a guardrail review target.
  - **regime_conflict (3 losses)**: avg quality=88.3, avg adverse move=3.34%, avg hold=199.0m. Treat this combo as a guardrail review target.

- **equity**:
  - **sizing_too_aggressive (10 losses)**: avg quality=86.6, avg adverse move=1.65%, avg hold=140.5m. Treat this combo as a guardrail review target.
  - **agent_lane_mismatch (3 losses)**: avg quality=87.7, avg adverse move=2.03%, avg hold=348.0m. Treat this combo as a guardrail review target.
  - **regime_conflict (2 losses)**: avg quality=81.0, avg adverse move=2.17%, avg hold=121.5m. Treat this combo as a guardrail review target.

- **commodity**:
  - **sizing_too_aggressive (4 losses)**: avg quality=87.5, avg adverse move=1.70%, avg hold=374.8m. Treat this combo as a guardrail review target.

- **other**:
  - **regime_conflict (2 losses)**: avg quality=82.0, avg adverse move=1.75%, avg hold=422.0m. Treat this combo as a guardrail review target.

<!-- POST_MORTEM_LESSONS_END -->

---

## Learnings from runtime (startup / paper loop)

_From terminal and logs (e.g. 2026-03-01):_

1. **WTT “No WTT pick for today”**  
   Bot reads `docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json`. If only the `.md` exists (e.g. from Echo daily task), the JSON is missing and WTT evaluation is skipped. **Improvement:** Ensure the WTT daily task (or a post-step) writes the extracted JSON sidecar; or document that someone must run the LLM extraction that produces that file. See `docs/standup/whats-the-trade/INTEGRATION-WITH-PAPER-BOT.md`.

2. **Policy “max-single-trade-usd” blocking BTC, XYZ100, US500**  
   Paper bucket caps a single trade at `maxSingleTradeUsd` (default 10k). For high-notional assets (BTC, index products like XYZ100, US500), requested size (e.g. aggressive margin × leverage) often exceeds 10k, so the policy engine blocks. **Improvement:** Either cap requested size to bucket max before policy (so we don’t spam “blocked”), or make the limit configurable per asset / document it in the dashboard so “blocked” is expected for those symbols.

3. **Many “HIP-3 trade passing validation” but few opens**  
   Signals pass validation then get blocked by policy (e.g. max-single-trade-usd), duplicate position check, or other gates. **Improvement:** Log a one-line funnel (e.g. “passed → policy_block | opened | duplicate”) or add a counter so we can see pass vs block vs open rates per asset or per run. **Implemented:** Funnel log now includes other_reasons with breakdown by key (no_primary_signal, sentiment_gate_long, swarm_min_confidence, etc.) for tuning visibility.

4. **CoinGlass timeout → Binance fallback**  
   CoinGlass API test can timeout; we already fall back to Binance free APIs. **Improvement:** Optional retry with backoff, or document that without a key / with timeout, free APIs are expected. **Implemented:** Connection test now retries with backoff before falling back to Binance.

5. **Duplicate position rejected (OPENAI long)**  
   Dedupe works: “DUPLICATE POSITION REJECTED: OPENAI long (existing position same direction)” is correct behavior.

---

## Post-mortem follow-through

- **Corrective actions** (immediate, policy, experiment) are auto-generated in [tasks/todo.md](todo.md) from `bun run postmortems:ingest`. Review and implement code/config items (e.g. leverage cap by asset class, PTQG/max-loss gates); experiments (A/B tests) are tracked in the same list for backlog.
- **Weekly guardrail review:** Sentinel weekly task includes a Guardrail review block from `root_cause_stats.json`; run ingest, then review todo.md and `knowledge/sentinel-docs/POST_MORTEM_LESSONS.md` and apply caps or policy tweaks manually.

---

## Rules to Prevent Repeat Mistakes

- (Write rules for yourself based on lessons learned)
