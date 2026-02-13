# OpenClaw reference (plugin-openclaw)

Long-form reference aligned with [docs.openclaw.ai](https://docs.openclaw.ai) and this repo. Use this when you need details on OpenClaw product, Gateway, and how this plugin fits.

## What is OpenClaw?

OpenClaw is a self-hosted gateway for AI agents. One long-lived **Gateway** process owns all messaging surfaces (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, WebChat, etc.). Control-plane clients (CLI, web UI, macOS app) connect over WebSocket (default `127.0.0.1:18789`). Formerly ClawdBot and MoltBot.

**First use case and lore:** We use OpenClaw first to fork and improve the VINCE repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)); the original ClawdBot/MoltBot vision (local Mac Mini, smart home, biometrics) is documented in [docs/OPENCLAW_VISION.md](../../../docs/OPENCLAW_VISION.md).

- **Docs:** https://docs.openclaw.ai  
- **Getting started:** https://docs.openclaw.ai/start/getting-started  
- **Repo:** https://github.com/openclaw/openclaw  

## Channels

OpenClaw can talk to you on any configured chat app. Text is supported everywhere; media and reactions vary by channel.

| Channel | Notes |
|---------|--------|
| WhatsApp | Baileys, QR pairing |
| Telegram | Bot API (grammY), groups |
| Discord | Bot API + Gateway |
| Slack | Bolt SDK |
| Signal | signal-cli |
| iMessage | BlueBubbles (recommended) or legacy |
| WebChat | Gateway WebChat UI over WebSocket |

More: [Channels](https://docs.openclaw.ai/channels).

## Gateway architecture

- One **Gateway** per host; single multiplexed port for WebSocket control/RPC and HTTP APIs.
- First client frame must be `connect`; then requests (`req`) and events (`event`).
- Auth: `OPENCLAW_GATEWAY_TOKEN` or `gateway.auth.token` in config.
- Agent runs: immediate ack (`status: "accepted"`), then streamed events and final completion.

Details: [Gateway architecture](https://docs.openclaw.ai/concepts/architecture), [Gateway runbook](https://docs.openclaw.ai/gateway).

## Tools (OpenClaw)

OpenClaw exposes first-class agent tools: `exec`, `process`, `web_search`, `web_fetch`, `browser`, `canvas`, `nodes`, `message`, `cron`, `gateway`, and session tools.

- **sessions_list / sessions_history / sessions_send / sessions_spawn / session_status** — List sessions, inspect history, send to another session, or spawn a sub-agent (`sessions_spawn`: `task`, optional `label`, `agentId`, `model`, etc.).
- **agent (CLI)** — `openclaw agent --agent <id> --message "..."` runs one agent turn via the Gateway.

Details: [Tools](https://docs.openclaw.ai/tools).

## Model providers

OpenClaw supports many LLM providers (OpenAI, Anthropic, Venice, OpenRouter, Ollama, etc.). Configure auth via `openclaw onboard` or config; set default model as `provider/model`.

Details: [Model providers](https://docs.openclaw.ai/providers).

## CLI highlights

- **Setup:** `openclaw onboard --install-daemon`  
- **Gateway:** `openclaw gateway --port 18789`, `openclaw gateway status`, `openclaw health`  
- **Agent:** `openclaw agent --message "..."` or `--agent <id> --message "..."`  
- **Channels:** `openclaw channels status`, `openclaw channels login`  
- **Dashboard:** `openclaw dashboard` (Control UI)

Full reference: [CLI](https://docs.openclaw.ai/cli).

## ElizaOS adapter

The **openclaw-adapter** runs ElizaOS plugins *inside* an OpenClaw agent. Actions become tools; providers become hooks. Use it when an OpenClaw-based agent should call wallet or connector logic implemented as Eliza plugins (e.g. plugin-evm, plugin-solana).

- Repo: https://github.com/elizaOS/openclaw-adapter  
- In this repo: [knowledge/sentinel-docs/OPENCLAW_ADAPTER.md](../../knowledge/sentinel-docs/OPENCLAW_ADAPTER.md)  

## Workspace sync

OpenClaw uses a workspace (default `~/.openclaw/workspace/`) with files like USER.md, SOUL.md, AGENTS.md, TOOLS.md, HEARTBEAT.md. In this repo:

- **openclaw-agents/workspace/** — Output of Brain, Muscles, Bones, DNA, Soul, Eyes, Heartbeat, Nerves.
- **knowledge/teammate/** — VINCE’s teammate provider reads USER, SOUL, TOOLS, AGENTS, HEARTBEAT (and optional MEMORY) from here.

Keep one source of truth and sync the other:

- **Repo → OpenClaw:** Copy or symlink `openclaw-agents/workspace/*.md` or `knowledge/teammate/*.md` to `~/.openclaw/workspace/`.
- **OpenClaw → Repo:** Copy `~/.openclaw/workspace/*.md` into the repo so VINCE and OpenClaw stay in sync.

See [openclaw-agents/ARCHITECTURE.md](../../openclaw-agents/ARCHITECTURE.md) and [HOW-TO-RUN](../../openclaw-agents/HOW-TO-RUN.md).

## This plugin: in-process vs Gateway

| Mode | When | Behavior |
|------|------|----------|
| **In-process (default)** | No `OPENCLAW_GATEWAY_URL` or research not via Gateway | Research runs inside ElizaOS: LLM + Hyperliquid (market). Alpha/onchain/news return an honest disclaimer unless you add data sources (see DATA_SOURCES_ROADMAP.md). |
| **Via Gateway** | `OPENCLAW_GATEWAY_URL` set and `OPENCLAW_RESEARCH_VIA_GATEWAY=true` | Plugin can call the Gateway for health/status and optionally run research via `openclaw agent` or Gateway RPC. |

For in-process research you do not need a running OpenClaw Gateway. For Gateway-backed research you need `openclaw gateway` running and (optionally) agents configured (e.g. alpha, market, onchain, news).

## Optional: Honcho

When `HONCHO_API_KEY` is set, this plugin can inject Honcho memory context (recent conversation and peer representation) and optionally write research summaries to Honcho for persistent user representation. See README Environment table (HONCHO_*).

## Security

- Bind Gateway to loopback (127.0.0.1). Set `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`. Do not expose the Gateway to the internet without proper auth and network controls.
- Full guide: [knowledge/setup-guides/clawd-security.md](../../knowledge/setup-guides/clawd-security.md).
