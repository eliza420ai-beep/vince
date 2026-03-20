# API security and production (VINCE + `@elizaos/server`)

This document maps how the **ElizaOS HTTP API and Socket.IO** surface behaves, what protects **LLM and paid API spend**, and how to run **Railway staging** checks. Implementation lives in **`@elizaos/server`** (installed dependency); VINCE starts it via [`scripts/start-with-custom-ui.js`](../scripts/start-with-custom-ui.js) or `elizaos start`.

**Related:** [DEPLOY.md](DEPLOY.md), [CONFIGURATION.md](CONFIGURATION.md), [PRD: Three-layer stack](standup/prds/PRD_THREE_LAYER_STACK_PRODUCTION_AND_REPO_INTEGRATION.md), [docs/TREASURY.md](TREASURY.md) (cost / Sentinel).

---

## 1. Endpoint classes

| Class | Examples | API key (`ELIZA_SERVER_AUTH_TOKEN`) | JWT / entity |
|-------|-----------|-------------------------------------|--------------|
| **Public app health** | `GET /healthz`, `GET /health` | No | No |
| **Everything under `/api/*`** | `GET /api/agents`, `POST /api/agents/:id/message`, `GET /api/server/health`, plugin routes under `/api/agents/.../plugins/...` | **Yes**, if token is set | See below |
| **Static UI** | `GET /` (built frontend) | No | No |
| **Socket.IO** | Same origin as API (e.g. `/socket.io`) | **Yes**, if token is set | `entityId` or JWT (see §4) |

**Railway / load balancers:** Prefer **`GET /healthz`** or **`GET /health`** for probes. Do **not** use **`/api/server/health`** as the only health check when **`ELIZA_SERVER_AUTH_TOKEN`** is set, or probes will get **401**.

---

## 2. Layer A — `X-API-KEY` (server auth token)

When **`ELIZA_SERVER_AUTH_TOKEN`** is set:

- Every **`/api`** request must send header **`X-API-KEY`** matching that value (or **`OPTIONS`** is skipped).
- Socket.IO clients must send the same value in **`handshake.auth.apiKey`** or header **`x-api-key`**.

When unset, middleware logs that API key auth is disabled and **all `/api` traffic is unauthenticated** at this layer (high risk on the public internet).

---

## 3. Layer B — Entity identity (`ENABLE_DATA_ISOLATION` + JWT)

After the API key check, **`createEntityAuthMiddleware()`** runs on `/api`:

| `ENABLE_DATA_ISOLATION` | Behavior |
|---------------------------|----------|
| **`true`** | **`jwtAuthMiddleware`**: most routes need **`Authorization: Bearer <JWT>`**. Public exceptions include `/auth/register`, `/auth/login`, `/auth/refresh`, `/system/version`, `/system/config`. |
| **unset / `false`** | **`entityIdHeaderMiddleware`**: optional **`X-Entity-Id`** (UUID). Requests proceed without JWT. |

**Gap to know:** If **`ENABLE_DATA_ISOLATION=true`** but **no** JWT verifier env is configured (`JWT_SECRET`, `JWT_JWKS_URI`, or Privy / Ed25519 keys), the server may **warn and call `next()`** without rejecting requests on some paths. For production, set a **real JWT verifier** and verify behavior on your deployed version.

**Data isolation:** If you enable isolation, **`ELIZA_SERVER_ID`** may be required (see server logs / `@elizaos/server` docs).

---

## 4. Socket.IO handshake (summary)

Order in `setupAuthenticationMiddleware`:

1. If **`ELIZA_SERVER_AUTH_TOKEN`**: validate API key (same as HTTP).
2. If **`ENABLE_DATA_ISOLATION=true`**: require **`handshake.auth.token`** (JWT) and a configured verifier.
3. Else: require **`handshake.auth.entityId`** as a **valid UUID** (client-chosen). This is **not** a login allowlist; it only ties the socket to an entity id for channel checks.

Combine **API key + data isolation + valid JWT** for untrusted networks.

---

## 5. Rate limits (defaults in `@elizaos/server`)

- **`/healthz`, `/health`:** 100 requests/minute per IP; **skipped** for common private IP patterns (localhost / RFC1918-style checks in server code).
- **API router (`/api/...` behind `createApiRouter`):** broad limit **1000 requests / 15 minutes** per IP (`createApiRateLimit`).
- **Auth routes:** stricter limit (10 / 15 min failed attempts pattern).
- **Upload / filesystem routes:** separate limits where those routers apply.

Tune via upstream proxy (Cloudflare, Railway) if you need stricter global caps.

---

## 6. What actually burns LLM / paid tokens

Anything that **starts an agent run** or **calls external APIs** from the server:

- **`POST /api/agents/:agentId/message`** (and streaming variants), messaging jobs, and similar **agent message** paths.
- **Plugin routes** registered under **`/api/agents/:agentId/plugins/...`** that invoke runtime services (VINCE dashboards, uploads, Otaku paid routes, etc.).

**Defense in depth:**

1. **`ELIZA_SERVER_AUTH_TOKEN`** on all `/api` + Socket.IO.
2. **`ENABLE_DATA_ISOLATION=true`** + **`JWT_SECRET`** (or JWKS / Privy) so only registered users hit agent APIs.
3. **Edge:** Cloudflare Access, IP allowlist, or mTLS in front of the origin.
4. **Operational:** [TREASURY.md](TREASURY.md), Sentinel cost actions, provider dashboards, spend alerts (manual or automated).

There is **no** built-in email allowlist in `@elizaos/server`; enforce at **IdP** (login issuer) or **edge**.

---

## 7. Observability

| Concern | Env / action |
|--------|----------------|
| Log verbosity | `LOG_LEVEL` (`info`, `warn`, `debug`, …) |
| Error tracking | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_LOGGING` (see `.env.example`) |
| Version stamp | `APP_VERSION` (optional; shown in health JSON) |

---

## 8. Railway staging checklist (operator)

Do these in **Railway → Variables** for a staging service:

1. **`POSTGRES_URL`** — persistent DB (recommended for staging if you care about rooms/agents across redeploys).
2. **`JWT_SECRET`** — long random string if using JWT auth.
3. **`ELIZA_SERVER_AUTH_TOKEN`** — long random string; **same value** must be configured in any CLI or frontend that calls `/api` (custom header support).
4. **`OPENAI_API_KEY`** / **`ANTHROPIC_API_KEY`** (and any other model keys you need).
5. **`DEXTER_ARTIFACT_ROOT`** (optional) — if syncing Dexter portfolios; see [DEXTER_ARTIFACT_SYNC_RUNBOOK.md](DEXTER_ARTIFACT_SYNC_RUNBOOK.md).
6. **`CORS_ORIGIN`** or **`API_CORS_ORIGIN`** — restrict browser origins if the UI is on a fixed domain.
7. **Health check URL:** `https://<your-service>/healthz` (or `/health`).

**Smoke tests after deploy:**

- `curl -sS https://<host>/healthz` → `200`, JSON `status: ok`.
- With token: `curl -sS -H "X-API-KEY: $ELIZA_SERVER_AUTH_TOKEN" https://<host>/api/server/status` → `200`.
- Without token (token enabled): `curl -sS -o /dev/null -w "%{http_code}" https://<host>/api/agents` → `401`.

**Persistence check:** create a room or send a message, redeploy, confirm data still present when using **Postgres**; with **PGLite-only** on ephemeral disk, expect a **fresh DB** after redeploy.

Automated script (local or CI against a running base URL): [`scripts/verify-api-gating.sh`](../scripts/verify-api-gating.sh).

**Opt-in automated test:** set `VINCE_API_GATING_TEST=1` and `VINCE_API_GATING_BASE_URL` (see `src/__tests__/apiGating.e2e.test.ts`).

---

## 9. VPS / Cloudflare (recap)

See [DEPLOY.md § VPS security](DEPLOY.md): HTTPS only from Cloudflare IPs, SSH only from Tailscale, unattended upgrades.

### Edge allowlist (Cloudflare Access)

If you want an explicit “only these humans can reach /api” allowlist at the edge, put the app behind **Cloudflare Access** (or the equivalent in your edge provider).

- Create a Cloudflare Access application for your VINCE origin.
- Create a policy that allows only your desired identities (employees, service accounts, or specific groups).
- Require Access for all paths that can trigger LLM spend (in practice, protect the entire origin or at least `/api/*` and the Socket.IO endpoints).
- Keep `ELIZA_SERVER_AUTH_TOKEN` enabled as a second layer. Edge allowlisting reduces exposure, but the API token is still your internal “no anonymous spend” gate.

---

## 10. Revision note

Behavior above reflects **`@elizaos/server`** as shipped in this repo’s lockfile. After upgrades, re-diff `dist/index.js` for middleware order, public routes, and rate-limit constants.
