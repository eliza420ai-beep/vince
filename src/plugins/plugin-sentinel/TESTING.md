# Plugin-Sentinel Testing

## Automated tests

- **`src/__tests__/prdGenerator.smoke.test.ts`** — Smoke test for the PRD generator service.
- **`src/__tests__/sentinelCostStatus.action.test.ts`** — Action test for SENTINEL_COST_STATUS.

## Manual / integration coverage

Most Sentinel actions are integration-style: they call Project Radar, Impact Scorer, PRD generator, or other services and depend on repo layout, knowledge files, and env (e.g. TREASURY, Usage). These are validated manually by running the agent and triggering actions (e.g. "cost status", "what should we ship", "prd for cursor"). Adding more automated tests for high-traffic actions (e.g. SENTINEL_SUGGEST, SENTINEL_PRD) is optional and would help guard regressions.
