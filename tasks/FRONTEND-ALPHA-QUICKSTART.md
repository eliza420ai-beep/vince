# Frontend: Alpha in UI via Quick Start Reuse

**Goal:** Show the same incredible data the terminal already prints (Binance/CoinGecko, Deribit options, NFT floor, DEXScreener memes, HIP-3 TradFi, paper trade, MandoMinutes) **in the UI** without big layout changes — by **reusing the Quick Start section**.

## How to see the new UI (not the old “Invite code” dashboard)

- **Use `bun start`** (or `bun run start:custom-ui`). Do **not** use `elizaos start` if you want the Otaku-style UI.
- **Open http://localhost:3000** or the Vite URL printed in the terminal (e.g. http://localhost:5173). Both serve the same Otaku UI when you use `bun start`.
- If you still see the old UI at port 3000, you are likely running the default ElizaOS server (`elizaos start`). Use `bun start` so the server serves `dist/frontend` (custom UI).

## ALOHA / replies never appear (stuck on "Analyzing your request")

- The agent reply is delivered over the **message bus**. Two things must be true:
  1. **Local messaging:** In `.env` set **`ELIZAOS_USE_LOCAL_MESSAGING=true`** and leave **`ELIZAOS_API_KEY`** unset. Restart with **`bun start`**.
  2. **Same message server:** The UI must use the server’s **default** message server ID (so the message bus has that server in its list). The app calls **`GET /api/messaging/message-server/current`**; if that returns an ID, it uses it. If it returns null (route often not implemented), the app now uses **`DEFAULT_MESSAGE_SERVER_ID`** instead of creating a user server — so the bus no longer logs "Agent not subscribed to server, ignoring message". Check the browser console for "Using default message server (replies will reach UI)" or "Using server default message server (replies will reach UI)".
  3. **Message-bus fallback (if still no reply):** The bus needs `channelId` and `messageServerId` to send the reply. If the runtime's room/world don't return them, it logs "Cannot map room/world to central IDs". This repo patches `node_modules/@elizaos/server/dist/index.js` to use `originalMessage.channel_id` and `originalMessage.message_server_id` as fallback in `sendAgentResponseToBus`, `notifyActionStart`, and `notifyActionUpdate`. After a fresh `bun install`, re-apply those three edits.
  4. **Terminal log check:** After sending a message (e.g. "hi"), search the server terminal for: **"Agent generated response, sending to bus"** (agent finished) and **"Sending response to central server"** (reply posted). If you see **"Agent not subscribed to server, ignoring message"**, the UI was using a user-created server ID; ensure the app uses the default message server (see step 2). If you see neither "Agent generated response" nor "Sending response" even after 30s, check for **"Error processing message via handleMessage"**. If you see both but still no reply in the UI, the socket room or client listener is the issue.
- After ~15 seconds with no reply, the chat UI shows an inline hint. See **DEPLOY.md** § "Bot status / agent replies not reaching the UI (local)" and **.env.example** § MESSAGING.

## Reuse Quick Start — no crazy UI modifications

- **Where:** `src/frontend/components/chat/chat-interface.tsx` — the empty-state area when there are no messages (lines ~864–923). It already shows a **card grid**: icon + title + short description (CDP Wallet, Price & Market Data, Web & News, DeFi Analytics, Cross-Chain Bridge, Transaction Checker).
- **Approach:** Use the **same card pattern** (same grid, same styling) to show terminal alpha. No new sections or routes — only new or repurposed cards in that same area.

**Options:**

1. **Alpha row above Quick Start** — Add a row of "Alpha at a glance" cards above the existing six plugin cards. Same component (icon, title, 1–2 line TLDR). Titles: e.g. PERPS, OPTIONS, NFT FLOOR, MEMES, TRADFI, PAPER, NEWS.
2. **Merge into one grid** — Add Alpha cards into the same grid (e.g. second row or interleaved). Same card style; Alpha cards show TLDR text; click can expand or insert a prompt ("aloha", "options", "bot status").

## Map terminal dashboards to cards

| Terminal output              | Card title (example) | TLDR content (example)                          |
|-----------------------------|----------------------|-------------------------------------------------|
| Binance + CoinGecko         | PERPS / PRICES       | 59% long, shorts paying \| BTC $65.8k -6.8%     |
| Deribit Options             | OPTIONS              | SKEW +1454% – hedge with puts \| Best CC 0D @ 70k |
| NFT Floor                   | NFT FLOOR            | Beeple 8 ETH, thin floor \| 11 collections      |
| DEXScreener Meme Scanner    | MEMES                | 20 hot tokens, avg +121% \| PETAH, BigTrout     |
| HIP-3 TradFi                | TRADFI               | AI/Tech +6% \| Rotation into strength           |
| Paper trade opened          | PAPER                | SHORT BTC @ 65.7k \| 5/11 sources, 62% strength |
| MandoMinutes                | NEWS                 | 36 headlines \| BTC 69k, ETFs, Silver -22%      |

Each card: same visual style as Quick Start (icon, uppercase title, 1–2 line description). Optional: click expands or inserts a prompt to get full detail in chat.

## Data source (minimal backend)

- **Prefer:** Reuse **last agent reply** or **last action result** in the chat. When the user has already asked "aloha", "bot status", "options", etc., keep a compact summary per dashboard type and show it in the Alpha cards. No new backend.
- **If needed:** Lightweight API (e.g. `/api/agents/:id/alpha` or `/api/vince/tldr`) that the plugin populates from the same logic that logs to the terminal; frontend fetches on load and optionally on a timer.

## Constraints

- **Same section:** Quick Start area only (no new sidebar, no new page).
- **Same card component:** Reuse existing card layout so Alpha cards look like CDP / Price / DeFi cards.
- **TLDR only:** One line (or two) per card by default; no raw terminal dump. Expand on click if needed.

---

See also: plan "VINCE reply fix and TLDR frontend" (Phase 1 = fix agent reply; Phase 2 = this Quick Start reuse).
