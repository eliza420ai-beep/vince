# Otaku → Hyperliquid sidecar (HTTP contract v1)

**Status:** Wiring in-repo; sidecar implementation is separate. Aligns with [PRD_LIVE_HYPERLIQUID_PERPS.md](PRD_LIVE_HYPERLIQUID_PERPS.md) (dedicated executor, keys not in Eliza process).

## Why

- Otaku stays the **orchestration** surface (risk cooldowns, confirmations, future Vince-live handoff).
- **Signing and HL API** live in a small sidecar (or EVClaw-style worker) with `HYPERLIQUID_ADDRESS` + delegated agent key.
- This repo only needs a **stable JSON contract** and env toggles.

## Env

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `OTAKU_HL_SIDECAR_URL` | For HL path | Base URL, no trailing slash required (e.g. `http://127.0.0.1:8787`) |
| `OTAKU_HL_SIDECAR_BEARER` | No | `Authorization: Bearer …` on all sidecar requests |
| `OTAKU_HL_SIDECAR_TIMEOUT_MS` | No | POST/GET timeout (default 20000, max 120000) |

Runtime character settings may override the same keys via `getSetting`.

## Health

Sidecar should expose **`GET /healthz` or `GET /health`** returning **2xx** when ready. Otaku’s `probeHlSidecarHealth()` tries both paths (short timeout).

## Reconcile (positions / orders snapshot)

**`GET {OTAKU_HL_SIDECAR_URL}/v1/reconcile`** or **`GET .../reconcile`**

- Otaku tries `/v1/reconcile` first, then `/reconcile`.
- **200** with body:
  - **`text/plain`** or **`text/markdown`**: body is appended to **`getReconciliationReport()`** under **Reconciliation (HL sidecar)**.
  - **`application/json`**: if `summary`, `text`, or `report` is a string, that value is used; otherwise a trimmed JSON string is shown.

When the URL is set but no endpoint returns 200, the report still includes a short HL sidecar line (so operators know to implement reconcile on the worker).

## Place order

**`POST {OTAKU_HL_SIDECAR_URL}/v1/perps/orders`**

`Content-Type: application/json`

### Request body

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `schemaVersion` | `1` | Yes | Bump when breaking |
| `correlationId` | string | Yes | Otaku-generated trace id |
| `coin` | string | Yes | HL coin, e.g. `BTC`, `ETH` |
| `isBuy` | boolean | Yes | Long vs short |
| `size` | string | Yes | Size in coin units (string for precision) |
| `orderType` | `"market"` \| `"limit"` | Yes | |
| `limitPx` | string | If limit | Limit price |
| `reduceOnly` | boolean | No | |
| `clientOrderId` | string | No | Idempotency / venue cloid |

### Success response (2xx)

Sidecar may return JSON with at least one of:

- `orderId` (string), or
- `oid` (string or number)

Optional: `clientOrderId` (string).

### Error response

Non-2xx with optional `{ "error": "..." }` or `{ "message": "..." }`.

## OtakuService usage

- **Market-style perps:** `executeSwap({ executionVenue: "hyperliquid_perps", hlPerps: { coin, isBuy, size, orderType: "market" }, sellToken, buyToken, amount })` — `hlPerps` is required; token fields are ignored for execution but can stay for UX copy.
- **Limit perps:** `createLimitOrder({ executionVenue: "hyperliquid_perps", buyToken, amount, limitPrice, … })` — if `hlPerps` is omitted, Otaku builds a **long** default: `coin = buyToken`, `isBuy = true`, `size = amount`, `orderType = "limit"`, `limitPx = limitPrice`. **Shorts must pass explicit `hlPerps`** (`isBuy: false`, correct `coin` / `size`).

Risk cooldowns and post-trade reconcile run the same as BANKR paths; `getReconciliationReport()` remains BANKR-oriented until a sidecar reconcile endpoint is added.

## API surface

- `GET /otaku/health` — includes `services.hlSidecar.configured`.
- `GET /otaku/config` — includes `hlSidecar: { configured, contractVersion, orderPath, docs }`.

## Code

- Client: `src/plugins/plugin-otaku/src/lib/hlSidecar.ts`
- Branching: `src/plugins/plugin-otaku/src/services/otaku.service.ts` (`executeSwap`, `createLimitOrder`)
