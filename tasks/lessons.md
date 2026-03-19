# Lessons — Self-Improvement Log

Capture patterns and corrections here. Review at session start.

---

## Patterns

- **Solus example.map fix:** The live crash was in `@elizaos/plugin-bootstrap/dist/index.js` (`return example.map((msg) => {`), not only in @elizaos/core. Cursor (auto mode) ground on core-only patches for half a day; with GPT 5.3 the real bundle was found and patched in under 21 seconds. When a runtime error points at a generic pattern (e.g. "example.map"), search all loaded bundles (core, plugin-bootstrap, etc.), not just the obvious one.
- **Paper perps swing fast:** Was +$88; one status check later SOL long -$215, shorts mixed (HYPE +$98, BTC/ETH giving back). Illustrates how hard perps are—we make most of our money on Hypersurface covered calls/secured puts (weekly upfront premium), not perps.
- **When X happened:** Do Y. Don't do Z.
- (Add entries after user corrections or discovered mistakes)

<!-- POST_MORTEM_LESSONS_START -->

### Post-mortem lessons (auto-generated)

_Summarized from docs/standup/post-mortems/*.md. Edit source post-mortems, then re-run `bun run scripts/ingest-postmortems.ts`._

- **crypto**:
  - **unknown_insufficient_evidence (2 losses)**: avg quality=70.0, avg adverse move=0.00%, avg hold=0.0m. Treat this combo as a guardrail review target.
  - **sizing_too_aggressive (18 losses)**: avg quality=91.5, avg adverse move=0.83%, avg hold=74.2m. Treat this combo as a guardrail review target.
  - **regime_conflict (16 losses)**: avg quality=87.2, avg adverse move=2.55%, avg hold=589.1m. Treat this combo as a guardrail review target.
  - **stop_too_tight_for_vol (2 losses)**: avg quality=91.0, avg adverse move=0.41%, avg hold=781.5m. Treat this combo as a guardrail review target.

- **equity**:
  - **unknown_insufficient_evidence (12 losses)**: avg quality=70.0, avg adverse move=0.00%, avg hold=0.0m. Treat this combo as a guardrail review target.
  - **sizing_too_aggressive (12 losses)**: avg quality=86.7, avg adverse move=1.52%, avg hold=177.9m. Treat this combo as a guardrail review target.
  - **agent_lane_mismatch (7 losses)**: avg quality=86.4, avg adverse move=1.77%, avg hold=220.4m. Treat this combo as a guardrail review target.
  - **regime_conflict (82 losses)**: avg quality=86.0, avg adverse move=1.21%, avg hold=428.3m. Treat this combo as a guardrail review target.
  - **thesis_invalid (2 losses)**: avg quality=88.0, avg adverse move=0.92%, avg hold=587.5m. Treat this combo as a guardrail review target.

- **commodity**:
  - **unknown_insufficient_evidence (2 losses)**: avg quality=75.5, avg adverse move=0.60%, avg hold=432.0m. Treat this combo as a guardrail review target.
  - **sizing_too_aggressive (4 losses)**: avg quality=87.5, avg adverse move=1.70%, avg hold=374.8m. Treat this combo as a guardrail review target.
  - **regime_conflict (13 losses)**: avg quality=83.8, avg adverse move=1.17%, avg hold=414.5m. Treat this combo as a guardrail review target.

- **other**:
  - **regime_conflict (25 losses)**: avg quality=82.8, avg adverse move=0.89%, avg hold=590.5m. Treat this combo as a guardrail review target.

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

- **Plan node default:** Enter plan mode for any non-trivial task (3+ steps or architectural decisions). If something goes sideways, stop and re-plan.
- **Subagent strategy:** Use subagents for research, exploration, and parallel analysis. Keep one focused task per subagent.
- **Self-improvement loop:** After any correction from the user, update `tasks/lessons.md` with the pattern (what went wrong, what fixed it, and the rule to prevent repeat).
- **Verification before done:** Never mark completion without proof. Diff behavior when relevant; run tests and check logs; ask: “Would a staff engineer approve this?”
- **Demand elegance (balanced):** For non-trivial changes, pause and ask if there is a more elegant way. If it feels hacky, implement the elegant solution.
- **Autonomous bug fixing:** When given a bug report, fix it directly (with evidence) instead of asking for hand-holding.
- **Task management:** Plan first in `tasks/todo.md` with checkable items; verify the plan before implementation; track progress; explain changes; document results; capture lessons after.
- **Core principles:** Simplicity first; no laziness—find the root cause; minimal impact—avoid introducing bugs.
