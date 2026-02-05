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
   - Single command builds backend + frontend and serves the gated UI (e.g. `bun run build` → includes `vite build`; `elizaos start` serves `dist/frontend`).

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

- [ ] `tasks/FRONTEND-4.20-MVP-HACKATHON.md` (this doc).
- [ ] Auth: `src/frontend/lib/auth.ts` (Supabase or invite), `src/frontend/contexts/AuthContext.tsx`, gated route in App.
- [ ] Shell: `src/frontend/App.tsx` (sidebar + main), `src/frontend/components/layout/Sidebar.tsx`, `MainContent.tsx`.
- [ ] Chat: `src/frontend/components/chat/*` (ChatPanel, MessageList, Composer).
- [ ] Dashboard: `src/frontend/components/dashboard/*` (placeholder widgets).
- [ ] API: `src/frontend/lib/api.ts` or `elizaClient.ts` for agents/messages.
- [ ] Build: `package.json` — `build` runs `vite build` then backend build (or vice versa); `build:frontend` script.

---

*Last updated: Feb 2026. Align with [README](README.md), [DEPLOY](DEPLOY.md), and [CLAUDE](CLAUDE.md).*
