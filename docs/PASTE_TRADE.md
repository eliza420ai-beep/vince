# paste.trade in VINCE

VINCE integrates [paste.trade](https://github.com/eliza420ai-beep/paste-trade) (vendored under `packages/paste-trade`) via **`src/plugins/plugin-paste-trade`**.

## What you get

- **Chat:** `VINCE_PASTE_TRADE` — say `/trade`, paste a URL, or ask what the trade is (when configured).
- **UI:** Sidebar **Paste trade** → `/paste-trade` — URL or thesis text, live event log, optional “Publish to paste.trade” checkbox, link to the hosted source page when published.
- **API:** `POST` / `GET` on the VINCE agent plugin routes (see below).

## Environment

| Variable | Purpose |
|----------|---------|
| `PASTE_TRADE_KEY` | Bearer token for the paste.trade API. **Usually unset at first:** the vendored skill auto-provisions via `POST /api/keys` and appends this to `.env` (same as upstream paste.trade). From repo root run once: `bun run packages/paste-trade/scripts/onboard.ts`. **Restart VINCE** after the key is written so `plugin-paste-trade` loads. Set manually only to reuse a key from another client. |
| `PASTE_TRADE_BASE_URL` or `PASTE_TRADE_URL` | API origin (no trailing slash). Self-hosted or `https://paste.trade`. |
| `PASTE_TRADE_UI_ORIGIN` | Optional; iframe / links default to base URL. |
| `PASTE_TRADE_POLL_MS` | Server poll interval for `GET /api/sources/:id` snapshots (default 5000, min 2000). |
| `PASTE_TRADE_REMOTE_PUBLISH` | Default `true`. Set `false` / `0` / `off` so runs skip remote `createSource` (no public [paste.trade](https://app.paste.trade) source page); extraction, LLM theses, and local `batch-save` still run. Per-run override: POST body `remotePublish`. |
| `PASTE_TRADE_ENABLED` | Set to `false` to disable loading the plugin even if a key is present. |

Optional for full skill parity: **`yt-dlp`** on PATH (YouTube), **`GEMINI_API_KEY`** (dense sources), **`X_BEARER_TOKEN`** (X extraction). See `packages/paste-trade/SKILL.md`.

## HTTP routes (ElizaOS)

Mounted under the **VINCE** `agentId`. The plugin is **always loaded** on VINCE unless `PASTE_TRADE_ENABLED=false`, so these paths exist and return **503** with a clear JSON body when `PASTE_TRADE_KEY` is missing (instead of a generic **404**).

- `POST /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/runs`  
  Body: `{ "url"?: string, "text"?: string, "roomId"?: string, "remotePublish"?: boolean }`  
  Omit `remotePublish` to use `PASTE_TRADE_REMOTE_PUBLISH` (default publish). `remotePublish: false` runs locally only (no `POST /api/sources`).  
  Returns `202` with `{ runId, agentId, status: "accepted" }`.

- `GET /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/run?runId=`  
  Returns the persisted run record (events, status, `sourceUrl`, `localOnly`, last snapshot).

- `GET /api/agents/:agentId/plugins/plugin-vince/vince/paste-trade/handoff?runId=`  
  Returns `{ eligible, reason?, message, expressions[], sourceUrl?, runId }` — text to paste into **Otaku** after you review. Read-only; **no orders**. Parses `lastSnapshot` and snapshot events for `route_evidence.selected_expression` (Hyperliquid / Polymarket vs Robinhood).

Production: if `ELIZA_SERVER_AUTH_TOKEN` is set, send `X-API-KEY` as for other `/api` calls.

## Live UI events

The server emits **`paste_trade:event`** over Socket.IO (same pattern as wallet notifications) with payload:

`{ runId, agentId, sourceId?, event_type, data? }`

The Vite app subscribes on the Paste trade page to refresh the run. Backend also polls your paste.trade **`GET /api/sources/:id`** when available so the UI can show snapshots without browser API keys.

## Pipeline (MVP)

1. `bun run packages/paste-trade/scripts/extract.ts` for URLs.  
2. If publishing: `PasteTradeClient.createSource` → `POST /api/sources`. If local-only: skip; `sourceId` is `local:<runId>`.  
3. LLM extracts a JSON thesis array.  
4. `bun run scripts/batch-save.ts` with stdin (local JSONL + `thesis_found` events on the board).

Subprocess env sets `PASTE_TRADE_SKIP_OPEN` / `VINCE_PASTE_TRADE` so the vendored script does not call `open` on the server.

## Otaku / live execution

- **UI:** Paste trade page → **Otaku handoff** — refreshes from `GET .../handoff`; **Copy message** and paste into Otaku chat.
- **Logic:** `src/plugins/plugin-paste-trade/src/otakuHandoff.ts` collects `selected_expression` from API snapshots (and embedded `snapshot` events). Hyperliquid and Polymarket are marked `eligible: true`; Robinhood-only routes are `eligible: false` with a reason.
- **Never auto-execute:** aligns with `docs/TRADING_RUNTIME_CONTRACT.md` — only Otaku’s executor path after you confirm size and risk.

Routing and `POST /api/trades` remain on **`PasteTradeClient`** for future automated steps; they are not called from the handoff route.

## Related files

- Plugin: `src/plugins/plugin-paste-trade/`
- Vendored skill: `packages/paste-trade/` (`VINCE_VENDOR.md`)
- Frontend: `src/frontend/components/dashboard/paste-trade/page.tsx`, `src/frontend/lib/pasteTradeApi.ts`
