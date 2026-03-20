# Production Stack Single Source of Truth (Roy)

This is the one document Roy should use to review and run production for our three-layer stack:

1. **VINCE (this repo)**: monitors the situation, runs the paper bot, applies gates, and produces `regime_bundle_v1.json` for Dexter operators.
2. **Dexter (companion repo)**: holds the thesis (`SOUL.md`), maintains the sleeve portfolios (`portfolio_*.json`), and produces the canonical outputs VINCE reads.
3. **AI Hedge Fund (AIHF)**: runs the 18-analyst second-opinion committee and produces a Phase D snapshot used by VINCE as an adversarial conviction gate.

We do **not** plan to deploy without Roy’s review. Treat the checklist below as the minimum sign-off path.

---

## What we mean by “production grade”

Production for this stack is not “the server runs”. It means:

- The app has **API gating** (no anonymous LLM spend paths).
- The app has **health probes** so deployment platforms can manage restarts safely.
- VINCE consumes **Dexter artifacts** from a known contract location (`DEXTER_ARTIFACT_ROOT`) and the UI shows those values (portfolio + watchlist).
- VINCE consumes **AIHF second-opinion Phase D** either via **HTTP** (fresh) or via **artifact file** (staged), and it applies the AIHF conviction gate in the paper-trade loop.
- We have a **verification loop** (scripts + deterministic log lines) so Roy can prove the integration is wired correctly.

---

## What we already prepared

### 1. Deployment + runtime wiring (VINCE)

Docs to use:

- `docs/DEPLOY.md` (Railway + Eliza Cloud + env guidance)
- `docs/API_SECURITY_AND_PRODUCTION.md` (API auth + edge/allowlist + Socket.IO/rate limits)
- `scripts/verify-api-gating.sh` (health + gated `/api/agents` checks)

Railway-specific docs:

- `docs/DEPLOY.md` includes `GET /healthz` probe instructions.
- `docs/DEPLOY.md` includes **spend alert** wiring via deterministic logs.

### 2. Dexter artifact contract (what VINCE reads)

Docs to use:

- `docs/DEXTER-PORTFOLIO-SYNC.md`

Contract VINCE expects under `DEXTER_ARTIFACT_ROOT`:

- `portfolio_hyperliquid.json`
- `portfolio_tastytrade.json`
- `portfolio_watchlist.json`
- (optional) scorecard: `.dexter/scorecard.json` or `scorecard.json`
- (optional) dexter caches when imported: `.dexter/cache/` (or legacy cache dirs)

VINCE does not write these files. Dexter (or your CI sync step) writes them. VINCE reads them at runtime and injects a “Dexter universe” block into response context.

### 3. VINCE regime handoff contract (what VINCE writes for Dexter operators)

Docs to use:

- `docs/REGIME_BUNDLE_V1_INGEST_CONTRACT.md` (the payload contract)
- `scripts/verify-regime-bundle-v1.ts` (local verification of the generated payload)

In production, ensure:

- VINCE emits `regime_bundle_v1.json` into Dexter’s artifact root.
- The output path is configured via `REGIME_BUNDLE_OUT_PATH` or the default under `DEXTER_ARTIFACT_ROOT`.

### 4. AIHF second-opinion read path (Phase D)

We implemented VINCE’s Phase D integration using the existing `aihfSecondOpinionProvider`.

AIHF read path options (docs + env):

- `docs/AIHF.md` describes the AIHF role and integration surfaces.
- Provider behavior is controlled by:
  - `AIHF_ARTIFACT_ROOT` / `AIHF_LAST_SECOND_OPINION_FILE` (prefer local file)
  - `VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED=true` (enable HTTP fallback)
  - `AIHF_BASE_URL` + `AIHF_LAST_SECOND_OPINION_ENDPOINT` (default `/api/v1/second-opinion/last`)

### 5. AIHF conviction gate enforcement (code)

We added an AIHF conviction gate inside VINCE’s paper-trade loop:

- Gate is applied after `tradeSignal` is constructed and before coverage bias / policy checks.
- Gate is scoped to **equity-class assets only**.
- It uses Phase D bucket membership to:
  - **cap confidence to 50** on strong contradictions
  - **boost strength slightly** on agreement
  - append a short `AIHF` factor to the trade reasons/signals

Relevant code:

- Helper: `src/plugins/plugin-vince/src/utils/aihfSecondOpinionGate.ts`
- Enforcement: `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts`
- Unit tests: `src/plugins/plugin-vince/src/__tests__/aihfSecondOpinionGate.test.ts`

### 6. Production verification assets

Deterministic checks we prepared:

- API gating verification: `scripts/verify-api-gating.sh`
- Regime bundle local verification: `scripts/verify-regime-bundle-v1.ts`
- Spend alert wiring via deterministic log lines:
  - set `VINCE_SPEND_ALERT_MONTHLY_USD`
  - match `SPEND_ALERT_BREACH` in Railway log-based alerts

---

## Roy checklist: what you still need to review / do

### A. Confirm environment + secrets (must be correct)

1. Set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (embeddings + VINCE model).
2. Set `ELIZA_SERVER_AUTH_TOKEN` in production so `/api/*` cannot be called without a token.
3. Decide Dexter artifact mode:
   - set `DEXTER_ARTIFACT_ROOT` to an absolute path where `portfolio_*.json` exist
4. Decide AIHF mode:
   - **HTTP (recommended)**: set `VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED=true`, `AIHF_BASE_URL`, confirm endpoint works
   - **Artifact file**: set `AIHF_ARTIFACT_ROOT` (and ensure `last_second_opinion_summary.json` is present and updated)

### B. Confirm integration wiring by running verification scripts

Run these against the same environment Roy will sign off:

1. `scripts/verify-api-gating.sh http://<your-base-url>`
2. `bun run scripts/verify-regime-bundle-v1.ts <path-to-regime_bundle_v1.json>` (use the artifact file you expect VINCE to write)

Optional but recommended:

- If you can run the VINCE server with production env vars in a staging environment, run a “read proof”:
  - check that UI pages that show Charts/portfolio/watchlist actually reflect the `DEXTER_ARTIFACT_ROOT` JSONs (no empty arrays)
  - check VINCE logs for spend alert behavior when `VINCE_SPEND_ALERT_MONTHLY_USD` is crossed

### C. Edge/allowlist review (defense in depth)

1. Confirm `docs/API_SECURITY_AND_PRODUCTION.md` guidance is applied at the edge (Cloudflare Access or equivalent).
2. Confirm the edge policy protects all paths that can trigger spend (at least `/api/*` and Socket.IO endpoints).

### D. Confirm UI “Monitor the Situation” meets the intended operator workflow

Roy should confirm, end-to-end, that the operator can:

- See the **Hyperliquid sleeve** values from `portfolio_hyperliquid.json`
- See the **Tastytrade sleeve** values from `portfolio_tastytrade.json`
- See the **Watchlist** from `portfolio_watchlist.json`
- Trust that the displayed values are “fresh enough” for decision-making (staleness proof).

The code is ready; this is an operator-experience validation step.

### E. AIHF gate behavior review (sanity)

Roy should validate one representative trade decision loop (paper mode is fine):

1. Pick an equity asset that is present in AIHF’s `agree_buckets` or `disagree_buckets`.
2. Confirm VINCE applies the intended transformation:
   - contradictions cap confidence
   - agreement boosts strength
   - `AIHF` factor appears in the trade reasons/signals

---

## Files that define the contracts (single-hop navigation)

- `docs/DEPLOY.md`
- `docs/API_SECURITY_AND_PRODUCTION.md`
- `docs/DEXTER-PORTFOLIO-SYNC.md`
- `docs/REGIME_BUNDLE_V1_INGEST_CONTRACT.md`
- `docs/AIHF.md`
- `scripts/verify-api-gating.sh`
- `scripts/verify-regime-bundle-v1.ts`

---

## Final sign-off line

If the scripts pass and the UI is reading the expected artifact files and the AIHF gate shows up in trade loop reasons, we consider this integration production-ready for the operator workflow.

---

## Development continuation (Discord Claude Channels)

We want to continue development on a new git branch using Claude Channels, because it removes the need for the old OpenClaw workflow for day-to-day coding and research management.

Goal: Roy (and whoever is driving the next iteration) can control Claude Code from Discord on a phone, without needing desktop tooling.

Adoption steps:

1. Create a dedicated branch for the integration work (example names: `prod-stitching/aihf-gate`, `prod-stitching/discord-devflow`).
2. Set up Claude Channels in the way your Claude account expects for Discord pairing.
3. Pair the Discord channel to the repo codebase (so Claude Code can read/write the branch safely).
4. Use Discord messages to trigger: “run tests”, “run type-check”, “inspect logs”, “update docs”, and “propose a patch”.

Operating rule for safety:

- Claude is allowed to modify files only on the branch, and any merge to `main` requires the same sign-off checklist described above.

---

## Repo next steps (what we should do with `paste-trade` and `agent-cli`)

These repos look like they can lift the project at the “data-to-action pipeline” layer, but we should not blindly merge them into VINCE. The safer pattern is: keep them as focused subsystems and integrate via well-defined interfaces.

1. `https://github.com/eliza420ai-beep/paste-trade`
   - What it contributes: a “source -> trade idea -> tracked P&L” loop that turns raw authored content into structured trade cards.
   - Recommended next move: treat it as a content-to-trade-card generator that can feed our watchlist or provide candidate ideas for the VINCE discovery funnel.
   - Integration style to prefer: expose output as files or an HTTP endpoint that VINCE can ingest, then score with our existing VINCE guardrails.

2. `https://github.com/eliza420ai-beep/agent-cli`
   - What it contributes: an autonomous Hyperliquid trading agent toolkit (strategies + execution scaffolding).
   - Recommended next move: use it as an execution reference or tool backend only if it can be made to respect our production gating and safety rules.
   - Integration style to prefer: keep VINCE policy/risk authority as the source of truth; if we connect agent-cli, it should be called as a tool, not allowed to override our gates.

Open questions we should decide explicitly:

- Do we want these repos to produce “VINCE-style paper trade signals”, or “direct execution candidates”?
- Which interface is the contract: MCP tools, HTTP endpoints, or artifact files?
- Who signs off on the interface contract: Roy (production) or dev owner (iteration speed)?

---

## Why we feel strongly about `x-bookmarks-pipeline` and `radon`

These two repos are “architecture lessons” for us, not just features.

1. `https://github.com/joemccann/x-bookmarks-pipeline`
   - Strong reason: it is an end-to-end pipeline that fetches social artifacts, classifies them, extracts structure, plans strategies, and generates executable outputs with caching so reruns are safe.
   - What we can reuse: the strict orchestration style and the “verification at each stage” mindset, especially for turning X research into bounded, reviewable trade artifacts.

2. `https://github.com/joemccann/radon`
   - Strong reason: it has a disciplined multi-gate validation framework and an operator-friendly terminal concept that matches what we want from VINCE’s “Monitor the Situation” workflow.
   - What we can reuse: the idea that the operator sees deterministic artifacts with a traceable decision path, not just a chat answer.
