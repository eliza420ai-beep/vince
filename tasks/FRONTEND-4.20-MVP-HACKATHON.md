# VINCE 4.20 MVP — Gated Frontend & Otaku-Style Adoption

**Goal:** Ship a gated, modern frontend for the 4.20 MVP and run a hackathon to fully adopt the [Otaku](https://github.com/elizaOS/otaku) frontend stack (layout, chat, dashboard, auth).

---

## 1. Current State

- **Frontend:** Minimal — single `index.tsx` with React Query, dark Tailwind, placeholder "Example" route. No auth, no chat UI, no dashboard.
- **Build:** Backend via `build.ts` (Bun); frontend via Vite (`vite build`, root `src/frontend`, out `dist/frontend`). Frontend build is **not** wired into the main `bun run build` flow.
- **Server:** `elizaos start` (from @elizaos/cli) — serves built frontend from `dist/frontend` when present.
- **Auth:** None. Supabase is used for feature store and ML storage only.

---

## 2. Target (Otaku-Style)

Reference: [elizaOS/otaku](https://github.com/elizaOS/otaku)

| Area | Otaku stack | VINCE 4.20 target |
|------|-------------|--------------------|
| **Auth** | CDP (Coinbase Developer Platform) wallet | Gated MVP: Supabase Auth or invite code; optional CDP later |
| **Layout** | Sidebar + main content, dashboard widgets | Same: sidebar, chat area, optional dashboard |
| **UI** | React 18, Tailwind 4, Radix UI, Framer Motion, Recharts | Add Radix UI, Framer Motion; keep Tailwind 4 |
| **State** | React Query, Zustand, Socket.IO | Keep React Query; add Socket.IO client for real-time |
| **Chat** | Dedicated chat components, message history, actions | Chat UI with history and action tools |
| **API** | Type-safe client (`elizaClient`), WebSocket manager | Type-safe API client + WebSocket for messages |

---

## 3. MVP Scope (4.20)

### Must-have

1. **Gated access**
   - User must sign in (or enter invite code) before seeing the app.
   - Options for MVP: **Supabase Auth** (email magic link or OAuth) **or** simple **invite-code gate** (no user DB). CDP can be a hackathon stretch goal.

2. **App shell (Otaku-style)**
   - Sidebar: nav (Chat, Dashboard, Settings), agent selector if multi-agent, user/wallet area.
   - Main content: chat view by default; dashboard as second view.
   - Dark theme, design tokens (already in `index.css`), consistent with Otaku feel.

3. **Chat UI**
   - Message list, input, send; optional "thinking" / action indicators.
   - Integrate with existing `ELIZA_CONFIG` and API (e.g. `/api/agents/{id}/message` or session-based messaging).

4. **Build & serve**
   - **`bun start`** (default): Starts backend (API on :3000) and Vite dev server (UI on :5173). **Open http://localhost:5173** for the full Otaku-style UI (sidebar, chat, Quick Start, wallet). This matches [Otaku](https://github.com/elizaOS/otaku)’s “run Vite dev in a second terminal” flow in one command and avoids blank/unstyled screens.
   - **`bun run start:static`**: Serves backend + built frontend from a single port (http://localhost:3000). Use for production-like or single-port testing.
   - **`bun run start:eliza-dashboard`**: Runs `elizaos start` — built-in ElizaOS dashboard only (the "VINCE – Push, not pull" / Invite code screen). Use only if you want the default ElizaOS UI, not the Otaku-style VINCE UI.
   - Build frontend manually: `bun run build:frontend` (or `bun run build:all`).
   - **Why do I see "Invite code" / gated access?** You are on the wrong URL or started with `start:eliza-dashboard` (or `elizaos start`). For the Otaku-style UI run **`bun start`** and open **http://localhost:5173**.

### Nice-to-have for 4.20

- Dashboard placeholder (widgets for ALOHA summary, paper bot status, etc.).
- Real-time updates via WebSocket (Socket.IO or Eliza server events) for new messages.

---

## 4. Hackathon: Full Otaku Adoption

**Objective:** By end of hackathon, the VINCE frontend should look and behave like Otaku’s: same layout, chat, dashboard, and (optionally) CDP gating.

### Tracks

| Track | Deliverables |
|-------|--------------|
| **Auth** | Supabase Auth integration (or invite code) → session/JWT; optional CDP wallet gate for “crypto-native” access. |
| **Layout & UI** | Radix UI components (sidebar, dialogs, dropdowns), Framer Motion for transitions, responsive sidebar + main. |
| **Chat** | Full chat UI: history, composer, attachments, action chips, real-time via WebSocket. |
| **Dashboard** | Dashboard page with widgets: ALOHA summary, paper bot stats, market vibe, links to Discord/Slack. |
| **API & real-time** | Type-safe API client module, Socket.IO (or equivalent) manager for live messages and typing. |

### Suggested order

1. **Week 1 – Foundation:** Gated route (auth or invite), app shell (sidebar + main), theme consistency.
2. **Week 2 – Chat:** Chat components, API client, message send/list; optional WebSocket.
3. **Week 3 – Dashboard & polish:** Dashboard widgets, real-time, CDP (optional), accessibility and responsiveness.

### Repo reference

- Clone or reference [elizaOS/otaku](https://github.com/elizaOS/otaku) for:
  - `src/frontend/App.tsx` (layout, routes, CDP wrapper).
  - `src/frontend/components/` (chat, dashboard, auth, ui).
  - `src/frontend/lib/` (elizaClient, socketManager, auth helpers).
  - Tailwind and Radix usage.

---

## 5. Tech Additions

| Package | Purpose |
|---------|--------|
| `@radix-ui/react-*` | Sidebar, dialog, dropdown, tabs (match Otaku). |
| `framer-motion` | Animations and transitions. |
| `socket.io-client` | Real-time messaging (if server supports it). |
| `@supabase/supabase-js` | Already present; use for Auth in gated MVP. |
| Optional: `@coinbase/cdp-react` / CDP SDK | If hackathon adds CDP gating. |

---

## 6. Success Criteria

- **4.20 MVP:** Unauthenticated users cannot use the app; authenticated (or invite-code) users see Otaku-style shell and working chat.
- **Post-hackathon:** Feature parity with Otaku’s frontend set: gated, chat, dashboard, real-time, and (optionally) CDP.

---

## 7. File / Script Checklist

- [x] `tasks/FRONTEND-4.20-MVP-HACKATHON.md` (this doc).
- [x] Auth: `src/frontend/lib/auth.ts` (invite-code), `src/frontend/contexts/AuthContext.tsx`, `components/auth/Gate.tsx`.
- [x] Shell: `src/frontend/App.tsx` (sidebar + main + right widget column), `src/frontend/components/layout/Sidebar.tsx`.
- [x] Chat: `src/frontend/components/chat/ChatPanel.tsx`.
- [x] Dashboard: `src/frontend/components/dashboard/Dashboard.tsx`, `Widget.tsx` (Otaku-style clock/location).
- [x] API: `src/frontend/lib/api.ts`; `lib/socketManager.ts` (Otaku-style, optional JWT).
- [x] Build: `package.json` — `build` runs `build:frontend` then backend; `build:frontend` = `vite build`.
- [x] **Otaku mirror:** UI components (`components/ui/`: button, card, input, badge, tv-noise), Widget, socketManager; 3-column layout with right-side Widget. Reference: clone `elizaOS/otaku` to `otaku-ref/` (gitignored).

---

*Last updated: Feb 2026. Align with [README](README.md), [DEPLOY](DEPLOY.md), and [CLAUDE](CLAUDE.md).*
