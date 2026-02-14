# OpenClaw reference (plugin-openclaw)

Long-form reference aligned with [docs.openclaw.ai](https://docs.openclaw.ai) and this repo. Use this when you need details on OpenClaw product, Gateway, and how this plugin fits.

## Plugin scope

This plugin is **AI-obsessed with OpenClaw as core expertise**: AI 2027, AGI timelines, research agents, alignment—plus setup, gateway status, openclaw-agents (orchestrator + 8 pillars), workspace sync, tips, use cases. Clawterm is the sole agent that loads it.

## AI focus

[AI 2027](https://ai-2027.com/) describes research agents that "scour the Internet to answer your question." OpenClaw + openclaw-agents enable that today: Gateway connects chat apps to AI agents; orchestrator runs alpha, market, onchain, news. Ask for "AI 2027" or "research agents" to get the full framing. Knowledge: `knowledge/clawterm/AI_2027_SUMMARY.md`.

## Clawterm: X + web search, HIP-3 AI, cost narrative

When `X_BEARER_TOKEN` is set, Clawterm loads **plugin-x-research** and can search X for AI takes, AGI debate, research agents ("search X for …", "what are people saying about …"). When `TAVILY_API_KEY` is set, Clawterm loads **plugin-web-search** for web search on AI topics.

Clawterm is **fully aware of HIP-3 AI-related assets on Hyperliquid**: NVDA, GOOGL, META, OPENAI, ANTHROPIC, SNDK (SanDisk), AMD, MAG7, SEMIS, INFOTECH, ROBOT, etc. See `knowledge/clawterm/HIP3_AI_ASSETS.md`. Ask for "HIP-3 AI assets" or "ai perps on Hyperliquid" to get the full list. For live prices, ask Vince.

**Cost narrative:** Cursor + Claude 4.6 ~$5K/month in tokens. OpenClaw on 2 Mac Studios ($10K each) grinds 24/7 to expand knowledge. Vision: Clawterm = AI meets crypto Bloomberg-style terminal. See `knowledge/clawterm/CLAWTERM_VISION.md`.

**DATA INTEGRITY:** Clawterm never invents data. Gateway status, HIP-3 assets, AI 2027, X search, web search—all from actions. For prices, ask Vince.

## What is OpenClaw?

OpenClaw is a self-hosted gateway for AI agents. One long-lived **Gateway** process owns all messaging surfaces (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, WebChat, etc.). Control-plane clients (CLI, web UI, macOS app) connect over WebSocket (default `127.0.0.1:18789`). Formerly ClawdBot and MoltBot.

**First use case and lore:** We use OpenClaw first to fork and improve the VINCE repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)); the original ClawdBot/MoltBot vision (local Mac Mini, smart home, biometrics) is documented in [docs/OPENCLAW_VISION.md](../../../docs/OPENCLAW_VISION.md).

- **Docs:** https://docs.openclaw.ai  
- **Getting started:** https://docs.openclaw.ai/start/getting-started  
- **Repo:** https://github.com/openclaw/openclaw  
- **Releases:** https://github.com/openclaw/openclaw/releases — latest version, changelog, and release notes. Point users here when they ask about updates or what's new.
- **ClawIndex:** https://clawindex.org/ — OpenClaw ecosystem directory; discover projects, tools, verified listings. Point users here for ecosystem news and what's being built.
- **steipete (OpenClaw lead):** https://github.com/steipete — Peter Steinberger leads OpenClaw. Point users here when they ask about maintainer, author, or steipete.

## Channels

OpenClaw can talk to you on any configured chat app. Text is supported everywhere; media and reactions vary by channel.

| Channel | Notes |
|---------|-------|
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

- **sessions_list / sessions_history / sessions_send / sessions_spawn / session_status** — List sessions, inspect history, send to another session, or spawn a sub-agent.
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

The **openclaw-adapter** runs ElizaOS plugins *inside* an OpenClaw agent. Actions become tools; providers become hooks. Use it when an OpenClaw-based agent should call wallet or connector logic implemented as Eliza plugins.

- Repo: https://github.com/elizaOS/openclaw-adapter  
- In this repo: [knowledge/sentinel-docs/OPENCLAW_ADAPTER.md](../../knowledge/sentinel-docs/OPENCLAW_ADAPTER.md)  

## Workspace sync

OpenClaw uses a workspace (default `~/.openclaw/workspace/`) with files like USER.md, SOUL.md, AGENTS.md, TOOLS.md, HEARTBEAT.md. In this repo:

- **openclaw-agents/workspace/** — Output of Brain, Muscles, Bones, DNA, Soul, Eyes, Heartbeat, Nerves.
- **knowledge/teammate/** — VINCE's teammate provider reads USER, SOUL, TOOLS, AGENTS, HEARTBEAT from here.

Keep one source of truth and sync the other:

- **Repo → OpenClaw:** Copy or symlink `openclaw-agents/workspace/*.md` or `knowledge/teammate/*.md` to `~/.openclaw/workspace/`.
- **OpenClaw → Repo:** Copy `~/.openclaw/workspace/*.md` into the repo so VINCE and OpenClaw stay in sync.

See [openclaw-agents/ARCHITECTURE.md](../../openclaw-agents/ARCHITECTURE.md) and [HOW-TO-RUN](../../openclaw-agents/HOW-TO-RUN.md).

**openclaw-agents (orchestrator + 8 pillars):** From repo root: `node openclaw-agents/orchestrator.js alpha SOL BTC`, `market`, `onchain`, `news`, or `all`. Output saved to `openclaw-agents/last-briefing.md`. Fresh MacBook Pro: Node 22+, `curl -fsSL https://openclaw.ai/install.sh | bash`, `openclaw onboard --install-daemon`, `openclaw gateway start`. Forked VINCE repo: `bun install && bun run build && bun start`.

## This plugin: Gateway status

When `OPENCLAW_GATEWAY_URL` is set, the plugin uses the OpenClaw Gateway for health/status. Ask for "gateway status" to check connectivity and health. No Gateway is required for the setup guide, tips, use cases, or workspace sync actions.

## Security

- Bind Gateway to loopback (127.0.0.1). Set `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`. Do not expose the Gateway to the internet without proper auth and network controls.
- Full guide: [knowledge/setup-guides/clawd-security.md](../../knowledge/setup-guides/clawd-security.md).
