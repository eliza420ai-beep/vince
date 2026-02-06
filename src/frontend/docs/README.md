# VINCE Frontend Docs

The VINCE frontend is an **Otaku-style** chat UI (Vite + React) for the VINCE agent. It provides:

- **Chat** — Send messages to the agent, see replies, quick prompts, connection status.
- **Market Pulse** — A card at the top of the chat with an LLM-generated 2–3 sentence market insight, built from dashboard data (Binance, CoinGlass, Deribit, HIP-3, News, DexScreener, NFT floors, paper trades, etc.). Sections include meme mood + hot/ape, NFT TLDR, and open paper positions. Data refetches every 2 minutes when the tab is visible.
- **Quick actions** — Chips (ALOHA, News, Memes, Perps, Options) below the pulse send the trigger message so you get the full TLDR narrative in chat (e.g. daily snapshot, news briefing) without typing.
- **Channels / agents** — Select agent and channel; guest mode and error handling as documented in the repo README.

---

## Progress and status

**Canonical tracker:** **[`../progress.txt`](../progress.txt)**

That file is the single source of truth for frontend status. It contains:

| Section | Contents |
|--------|----------|
| **OVERVIEW** | Stack (React, Vite, Tailwind v4, api-client), run/build commands, Otaku reference (OTAKU.md) |
| **COMPLETED** | Integration, branding, guest mode, chat UI, dependencies, Market Pulse, docs |
| **KNOWN ISSUES / LIMITATIONS** | API endpoint not found, guest support, CDP, which agent, MESSAGE-BUS / no reply, Pulse 503 |
| **IN PROGRESS / BACKLOG** | E2E chat verification, optional Radix/Otaku features |
| **KEY FILES** | App.tsx, chat-interface, market-pulse-card, lib (elizaClient, pulseApi, socketManager), vite.config, stubs, docs |
| **SESSION NOTES** | Dated log of changes (error handling, bot reply, Otaku reference, local messaging, Market Pulse, quick actions) |

Update **progress.txt** when you ship a feature, fix a bug, or hit a new limitation. Link to this README and to repo docs (README, DEPLOY.md, .env.example) where relevant.

## Quick start

From repo root (see main [README.md](../../../README.md) and [tasks/FRONTEND-ALPHA-QUICKSTART.md](../../../tasks/FRONTEND-ALPHA-QUICKSTART.md)):

```bash
# Backend must be running (e.g. bun start)
cd src/frontend && bun install && bun run dev
```

Open the URL shown (e.g. http://localhost:5173). Use the same origin as the API so the proxy works.

## Reference docs

These docs are adapted from [elizaOS/otaku](https://github.com/elizaOS/otaku) for the VINCE frontend.

| Doc                                                      | Purpose                    |
| -------------------------------------------------------- | -------------------------- |
| [architecture.md](./architecture.md)                     | App architecture, API, CDP |
| [development.md](./development.md)                       | Local dev, env, build      |
| [troubleshooting.md](./troubleshooting.md)               | Common issues and fixes    |
| [character-config.md](./character-config.md)             | Character/agent config     |
| [plugin-actions.md](./plugin-actions.md)                 | Plugin actions and chat    |
| [plugin-context-matcher.md](./plugin-context-matcher.md) | Context matching           |
| [x402-payments.md](./x402-payments.md)                   | x402 payment flow          |
| [evm-wallets/](./evm-wallets/)                           | CDP wallet guides          |
| [research/](./research/)                                 | Research notes             |

Adapt further as needed for VINCE (invite gate, paper trading, feature store).
